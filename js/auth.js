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
     - Coin balance reconciliation between local gameState.coins
       and profiles.coins
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

    /* Account header */
    dom.userChip = document.getElementById("authUserChip");
    dom.guestActions = document.getElementById("authGuestActions");
    dom.loginBtn = document.getElementById("authLoginBtn");
    dom.signupBtn = document.getElementById("authSignupBtn");
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

    if (dom.loginForm) {
      dom.loginForm.hidden = !isLogin;
    }

    if (dom.signupForm) {
      dom.signupForm.hidden = isLogin;
    }

    showError("");
  }

  /* ---------------------------------------------------------
     PROFILE — plain table read/update
  --------------------------------------------------------- */

  async function loadProfile(userId) {
    const { data, error } = await window.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error(
        "[EarnRush Auth] Failed to load profile:",
        error.message
      );

      return null;
    }

    return data;
  }

  async function ensureProfileName(userId, name) {
    if (!name) return;

    const { error } = await window.supabase
      .from("profiles")
      .update({ name })
      .eq("id", userId)
      .is("name", null);

    if (error) {
      console.warn(
        "[EarnRush Auth] Could not backfill profile name:",
        error.message
      );
    }
  }

  /* ---------------------------------------------------------
     GUEST PROGRESS CLAIMING
  --------------------------------------------------------- */

  const GUEST_ID_KEY = "earnRushGuestId";

  function getOrCreateGuestId() {
    let id = localStorage.getItem(GUEST_ID_KEY);

    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "10000000-1000-4000-8000-100000000000".replace(
            /[018]/g,
            c =>
              (
                c ^
                (crypto.getRandomValues(new Uint8Array(1))[0] &
                  15 >>
                    (c / 4))
              ).toString(16)
          );

      localStorage.setItem(GUEST_ID_KEY, id);
    }

    return id;
  }

  async function claimGuestProgress() {
    try {
      const guestId = getOrCreateGuestId();

      const guestCoins = Math.max(
        0,
        Math.floor(
          Number(window.EarnRushGame?.getState()?.coins) || 0
        )
      );

      const { data, error } = await window.supabase.rpc(
        "claim_guest_session",
        {
          p_guest_id: guestId,
          p_guest_coins: guestCoins
        }
      );

      if (error) {
        console.warn(
          "[EarnRush Auth] claim_guest_session failed:",
          error.message
        );

        return false;
      }

      return !!data;
    } catch (e) {
      console.warn(
        "[EarnRush Auth] claim_guest_session error:",
        e
      );

      return false;
    }
  }

  /* ---------------------------------------------------------
     AUTH ACTIONS
  --------------------------------------------------------- */

  async function handleSignup(e) {
    e.preventDefault();
    showError("");

    const name =
      document.getElementById("authSignupName")?.value.trim();

    const email =
      document.getElementById("authSignupEmail")?.value.trim();

    const password =
      document.getElementById("authSignupPassword")?.value;

    if (!name || !email || !password) {
      showError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    const { data, error } =
      await window.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

    if (error) {
      showError(error.message);
      return;
    }

    if (data.user) {
      currentUser = data.user;

      currentProfile =
        await loadProfile(data.user.id);

      await ensureProfileName(
        data.user.id,
        name
      );

      await claimGuestProgress();

      onAuthResolved();
    } else {
      showError(
        "Check your email to confirm your account, then log in."
      );

      setMode("login");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    showError("");

    const email =
      document.getElementById("authLoginEmail")?.value.trim();

    const password =
      document.getElementById("authLoginPassword")?.value;

    if (!email || !password) {
      showError("Please fill in all fields.");
      return;
    }

    const { data, error } =
      await window.supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      showError(error.message);
      return;
    }

    currentUser = data.user;

    currentProfile =
      await loadProfile(data.user.id);

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

      document
        .getElementById("withdrawBtn")
        ?.click();
    }
  }

  /* ---------------------------------------------------------
     ACCOUNT HEADER STATE
  --------------------------------------------------------- */

  function renderUserChip() {
    const loggedIn = !!currentUser;

    /*
      Logged OUT:
      LOGIN + CREATE ACCOUNT visible
      Username chip hidden

      Logged IN:
      LOGIN + CREATE ACCOUNT hidden
      Username chip visible
    */

    if (dom.guestActions) {
      dom.guestActions.hidden = loggedIn;
    }

    if (dom.userChip) {
      dom.userChip.hidden = !loggedIn;

      if (loggedIn) {
        dom.userChip.textContent =
          currentProfile?.name ||
          currentUser?.email ||
          "Account";
      }
    }
  }

  /* ---------------------------------------------------------
     EVENTS
  --------------------------------------------------------- */

  function setupEvents() {
    dom.closeBtn?.addEventListener(
      "click",
      closeModal
    );

    dom.overlay?.addEventListener(
      "click",
      e => {
        if (e.target === dom.overlay) {
          closeModal();
        }
      }
    );

    dom.panel?.addEventListener(
      "click",
      e => e.stopPropagation()
    );

    document.addEventListener(
      "keydown",
      e => {
        if (
          e.key === "Escape" &&
          dom.overlay &&
          !dom.overlay.hidden
        ) {
          closeModal();
        }
      }
    );

    /* Existing Login / Signup tabs */

    dom.tabLogin?.addEventListener(
      "click",
      () => setMode("login")
    );

    dom.tabSignup?.addEventListener(
      "click",
      () => setMode("signup")
    );

    /* NEW: Header Login button */

    dom.loginBtn?.addEventListener(
      "click",
      () => openModal("login")
    );

    /* NEW: Header Create Account button */

    dom.signupBtn?.addEventListener(
      "click",
      () => openModal("signup")
    );

    /* Forms */

    dom.loginForm?.addEventListener(
      "submit",
      handleLogin
    );

    dom.signupForm?.addEventListener(
      "submit",
      handleSignup
    );

    /* Username chip → Logout */

    dom.userChip?.addEventListener(
      "click",
      () => {
        if (
          confirm(
            "Log out of your EarnRush account?"
          )
        ) {
          handleLogout();
        }
      }
    );
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

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */

  async function init() {
    cacheDom();

    setupEvents();

    if (
      !window.supabase ||
      typeof window.supabase.auth?.getSession !==
        "function"
    ) {
      console.error(
        "[EarnRush Auth] Supabase client not available — check script load order."
      );

      return;
    }

    /*
      Restore existing Supabase session after refresh.
    */

    const { data } =
      await window.supabase.auth.getSession();

    if (data?.session?.user) {
      currentUser = data.session.user;

      currentProfile =
        await loadProfile(
          currentUser.id
        );

      renderUserChip();

      window.EarnRushWithdrawal?.loadWithdrawalHistory();

      window.EarnRushWithdrawal?.refreshCoinBalance();
    } else {
      /*
        No active session:
        make sure the logged-out account UI
        is rendered immediately.
      */

      currentUser = null;
      currentProfile = null;

      renderUserChip();
    }

    /*
      Listen for future auth changes.
    */

    window.supabase.auth.onAuthStateChange(
      async (_event, session) => {
        currentUser =
          session?.user || null;

        currentProfile = currentUser
          ? await loadProfile(currentUser.id)
          : null;

        renderUserChip();
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
