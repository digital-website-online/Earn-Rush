/* =========================================================
   EARNRUSH — AUTH
   -----------------------------------------------------------
   Uses ONLY the standard, documented Supabase Auth client API
   (supabase.auth.signUp / signInWithPassword / getSession /
   onAuthStateChange) plus plain table reads/updates on
   `profiles`, which are covered by the RLS policies you already
   have ("Users can view own profile" / "Users can update own
   profile"). Nothing here guesses a custom function signature.

   NOT implemented yet (see the stub functions below and the final
   status report) because they depend on function signatures that
   must not be guessed:
     - claimGuestProgress()  -> needs the real claim_guest_session(...)
                                 signature
     - Coin balance reconciliation between local gameState.coins
       and profiles.coins    -> needs a product decision + the
                                 claim_guest_session contract
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushAuthLoaded) return;
  window.__earnRushAuthLoaded = true;

  let currentUser = null;
  let currentProfile = null;

  const dom = {};

  function cacheDom() {
    dom.overlay = document.getElementById("authOverlay");
    dom.panel = document.getElementById("authPanel");
    dom.closeBtn = document.getElementById("authCloseBtn");
    dom.tabLogin = document.getElementById("authTabLogin");
    dom.tabSignup = document.getElementById("authTabSignup");
    dom.loginForm = document.getElementById("authLoginForm");
    dom.signupForm = document.getElementById("authSignupForm");
    dom.errorEl = document.getElementById("authError");
    dom.userChip = document.getElementById("authUserChip");
  }

  function showError(msg) {
    if (!dom.errorEl) return;
    dom.errorEl.textContent = msg;
    dom.errorEl.hidden = !msg;
  }

  function openModal(mode) {
    if (!dom.overlay) return;
    showError("");
    setMode(mode || "login");
    dom.overlay.hidden = false;
  }

  function closeModal() {
    if (!dom.overlay) return;
    dom.overlay.hidden = true;
  }

  function setMode(mode) {
    const isLogin = mode === "login";
    dom.tabLogin?.classList.toggle("active", isLogin);
    dom.tabSignup?.classList.toggle("active", !isLogin);
    if (dom.loginForm) dom.loginForm.hidden = !isLogin;
    if (dom.signupForm) dom.signupForm.hidden = isLogin;
    showError("");
  }

  /* ---------------------------------------------------------
     PROFILE — plain table read/update, covered by existing RLS
  --------------------------------------------------------- */

  async function loadProfile(userId) {
    const { data, error } = await window.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[EarnRush Auth] Failed to load profile:", error.message);
      return null;
    }
    return data;
  }

  // If handle_new_user didn't already populate `name` (its exact
  // implementation isn't visible to us), this fills it in via a
  // plain update — covered by the existing "Users can update own
  // profile" RLS policy, not a guessed RPC.
  async function ensureProfileName(userId, name) {
    if (!name) return;
    const { error } = await window.supabase
      .from("profiles")
      .update({ name })
      .eq("id", userId)
      .is("name", null);
    if (error) {
      console.warn("[EarnRush Auth] Could not backfill profile name:", error.message);
    }
  }

  /* ---------------------------------------------------------
     GUEST PROGRESS CLAIMING
     -----------------------------------------------------------
     Real implementation using the exact, verified signature:
       claim_guest_session(p_guest_id uuid, p_guest_coins bigint) -> boolean

     IMPORTANT — confirmed by reading the actual function body:
     this function ONLY records the guest_id -> auth.uid() link
     (upserting into guest_sessions with the guest's coin count at
     claim time) for the backend's own reconciliation. It does NOT
     itself credit profiles.coins. So this deliberately does not
     add guestCoins to the new profile — doing that here would be
     inventing behavior the database function doesn't perform, which
     is exactly what was ruled out. If EarnRush's intent is for
     guest coins to actually become spendable/withdrawable balance,
     that requires either a product decision + a new/updated
     database function, or an admin-side process reading
     guest_sessions — outside what the frontend can safely decide.
  --------------------------------------------------------- */

  const GUEST_ID_KEY = "earnRushGuestId";

  function getOrCreateGuestId() {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> (c / 4))).toString(16)
          );
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  }

  async function claimGuestProgress() {
    try {
      const guestId = getOrCreateGuestId();
      const guestCoins = Math.max(0, Math.floor(
        Number(window.EarnRushGame?.getState()?.coins) || 0
      ));

      const { data, error } = await window.supabase.rpc("claim_guest_session", {
        p_guest_id: guestId,
        p_guest_coins: guestCoins
      });

      if (error) {
        console.warn("[EarnRush Auth] claim_guest_session failed:", error.message);
        return false;
      }
      return !!data;
    } catch (e) {
      console.warn("[EarnRush Auth] claim_guest_session error:", e);
      return false;
    }
  }

  /* ---------------------------------------------------------
     AUTH ACTIONS
  --------------------------------------------------------- */

  async function handleSignup(e) {
    e.preventDefault();
    showError("");

    const name = document.getElementById("authSignupName")?.value.trim();
    const email = document.getElementById("authSignupEmail")?.value.trim();
    const password = document.getElementById("authSignupPassword")?.value;

    if (!name || !email || !password) {
      showError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    if (error) {
      showError(error.message);
      return;
    }

    if (data.user) {
      currentUser = data.user;
      currentProfile = await loadProfile(data.user.id);
      await ensureProfileName(data.user.id, name);
      await claimGuestProgress();
      onAuthResolved();
    } else {
      // Email confirmation required by this Supabase project's auth
      // settings — signUp succeeded but there's no session yet.
      showError("Check your email to confirm your account, then log in.");
      setMode("login");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    showError("");

    const email = document.getElementById("authLoginEmail")?.value.trim();
    const password = document.getElementById("authLoginPassword")?.value;

    if (!email || !password) {
      showError("Please fill in all fields.");
      return;
    }

    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showError(error.message);
      return;
    }

    currentUser = data.user;
    currentProfile = await loadProfile(data.user.id);
    onAuthResolved();
  }

  async function handleLogout() {
    await window.supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    renderUserChip();
  }

  function onAuthResolved() {
    closeModal();
    renderUserChip();
    window.EarnRushWithdrawal?.loadWithdrawalHistory();
    window.EarnRushWithdrawal?.refreshCoinBalance();
    if (window.pendingWithdrawAfterAuth) {
      window.pendingWithdrawAfterAuth = false;
      document.getElementById("withdrawBtn")?.click();
    }
  }

  function renderUserChip() {
    if (!dom.userChip) return;
    if (currentUser) {
      dom.userChip.hidden = false;
      dom.userChip.textContent = currentProfile?.name || currentUser.email || "Account";
    } else {
      dom.userChip.hidden = true;
    }
  }

  /* ---------------------------------------------------------
     EVENTS
  --------------------------------------------------------- */

  function setupEvents() {
    dom.closeBtn?.addEventListener("click", closeModal);
    dom.overlay?.addEventListener("click", (e) => {
      if (e.target === dom.overlay) closeModal();
    });
    dom.panel?.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dom.overlay && !dom.overlay.hidden) closeModal();
    });

    dom.tabLogin?.addEventListener("click", () => setMode("login"));
    dom.tabSignup?.addEventListener("click", () => setMode("signup"));

    dom.loginForm?.addEventListener("submit", handleLogin);
    dom.signupForm?.addEventListener("submit", handleSignup);

    dom.userChip?.addEventListener("click", () => {
      if (confirm("Log out of your EarnRush account?")) handleLogout();
    });
  }

  /* ---------------------------------------------------------
     PUBLIC API
  --------------------------------------------------------- */

  window.EarnRushAuth = {
    getUser() {
      return currentUser;
    },
    getProfile() {
      return currentProfile;
    },
    requireAuth() {
      window.pendingWithdrawAfterAuth = true;
      openModal("login");
    },
    open: openModal,
    close: closeModal,
    logout: handleLogout
  };

  async function init() {
    cacheDom();
    setupEvents();

    if (!window.supabase || typeof window.supabase.auth?.getSession !== "function") {
      console.error("[EarnRush Auth] Supabase client not available — check script load order.");
      return;
    }

    const { data } = await window.supabase.auth.getSession();
    if (data?.session?.user) {
      currentUser = data.session.user;
      currentProfile = await loadProfile(currentUser.id);
      renderUserChip();
      // Session restored on page load (returning logged-in user) —
      // refresh history/balance now, since withdrawal.js's own
      // DOMContentLoaded call may have run before this resolved.
      window.EarnRushWithdrawal?.loadWithdrawalHistory();
      window.EarnRushWithdrawal?.refreshCoinBalance();
    }

    window.supabase.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      currentProfile = currentUser ? await loadProfile(currentUser.id) : null;
      renderUserChip();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
