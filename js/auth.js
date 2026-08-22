/* =========================================================
   EARNRUSH — AUTH
   -----------------------------------------------------------
   Authentication, session persistence and account UI.
   Guest progress is preserved when creating an account.
   Supabase email/password auth only.
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushAuthLoaded) return;
  window.__earnRushAuthLoaded = true;

  let currentUser = null;
  let currentProfile = null;

  const GUEST_ID_KEY = "earnRushGuestId";

  function getUI() {
    return window.EarnRushUI?.auth || null;
  }

  /* ---------------------------------------------------------
     PROFILE
  --------------------------------------------------------- */

  async function loadProfile(userId) {
    if (!userId || !window.supabase) return null;

    const { data, error } = await window.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

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
    if (!userId || !name) return;

    const { error } = await window.supabase
      .from("profiles")
      .update({ name })
      .eq("id", userId)
      .is("name", null);

    if (error) {
      console.warn(
        "[EarnRush Auth] Could not save profile name:",
        error.message
      );
    }
  }

  /* ---------------------------------------------------------
     GUEST PROGRESS
  --------------------------------------------------------- */

  function getOrCreateGuestId() {
    let id = localStorage.getItem(GUEST_ID_KEY);

    if (!id) {
      if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
      ) {
        id = window.crypto.randomUUID();
      } else {
        id =
          "guest-" +
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2);
      }

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
          Number(
            window.EarnRushGame?.getState()?.coins
          ) || 0
        )
      );

      if (guestCoins <= 0) {
        return true;
      }

      /*
       * Primary method:
       * Use the existing server-side guest claim function.
       */
      const { data, error } =
        await window.supabase.rpc(
          "claim_guest_session",
          {
            p_guest_id: guestId,
            p_guest_coins: guestCoins
          }
        );

      if (!error && data) {
        return true;
      }

      /*
       * If the guest RPC is unavailable/fails, do NOT silently
       * replace the user's existing account balance with zero.
       *
       * Try to preserve the guest balance directly only when
       * the authenticated profile is available.
       */
      if (error) {
        console.warn(
          "[EarnRush Auth] claim_guest_session failed:",
          error.message
        );
      }

      const user = currentUser;

      if (!user) {
        return false;
      }

      const profile = await loadProfile(user.id);

      if (!profile) {
        return false;
      }

      const existingCoins = Math.max(
        0,
        Math.floor(
          Number(profile.coins) || 0
        )
      );

      /*
       * Important:
       * Never overwrite an existing account balance with 0.
       *
       * Guest coins are added only when they are greater than
       * the current profile balance.
       */
      if (guestCoins <= existingCoins) {
        return true;
      }

      const { error: updateError } =
        await window.supabase
          .from("profiles")
          .update({
            coins: guestCoins,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);

      if (updateError) {
        console.warn(
          "[EarnRush Auth] Could not preserve guest coins:",
          updateError.message
        );

        return false;
      }

      return true;

    } catch (error) {
      console.warn(
        "[EarnRush Auth] Guest progress claim error:",
        error
      );

      return false;
    }
  }

  /* ---------------------------------------------------------
     ACCOUNT STATE
  --------------------------------------------------------- */

  async function setAuthenticatedUser(user) {
    if (!user) {
      currentUser = null;
      currentProfile = null;
      renderUserChip();
      return;
    }

    currentUser = user;

    currentProfile =
      await loadProfile(user.id);

    renderUserChip();

    window.EarnRushWithdrawal?.loadWithdrawalHistory();
    window.EarnRushWithdrawal?.refreshCoinBalance();
  }

  function clearAuthenticatedUser() {
    currentUser = null;
    currentProfile = null;
    renderUserChip();
  }

  /* ---------------------------------------------------------
     SIGNUP
  --------------------------------------------------------- */

  async function handleSignup(e) {
    e.preventDefault();

    const ui = getUI();

    ui?.showError("");

    const name =
      document
        .getElementById("authSignupName")
        ?.value.trim();

    const email =
      document
        .getElementById("authSignupEmail")
        ?.value.trim();

    const password =
      document
        .getElementById("authSignupPassword")
        ?.value;

    if (!name || !email || !password) {
      ui?.showError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      ui?.showError(
        "Password must be at least 6 characters."
      );
      return;
    }

    /*
     * Capture guest coins BEFORE signup/session changes.
     */
    const guestCoinsBeforeSignup = Math.max(
      0,
      Math.floor(
        Number(
          window.EarnRushGame?.getState()?.coins
        ) || 0
      )
    );

    const { data, error } =
      await window.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });

    if (error) {
      ui?.showError(error.message);
      return;
    }

    if (!data?.user) {
      ui?.showError(
        "Account could not be created. Please try again."
      );
      return;
    }

    /*
     * If email confirmation is enabled, there is no active
     * session yet, so the account cannot receive the guest
     * balance until the user actually becomes authenticated.
     */
    if (!data.session) {
      ui?.showError(
        "Account created successfully. Please confirm your email before logging in."
      );

      ui?.setMode("login");

      const loginEmail =
        document.getElementById("authLoginEmail");

      if (loginEmail) {
        loginEmail.value = email;
      }

      return;
    }

    /*
     * Direct-login signup flow.
     */
    currentUser = data.user;

    await ensureProfileName(
      data.user.id,
      name
    );

    currentProfile =
      await loadProfile(data.user.id);

    /*
     * Claim the guest balance while the newly-created
     * authenticated session is active.
     */
    if (guestCoinsBeforeSignup > 0) {
      await claimGuestProgress();
    }

    /*
     * Refresh the real profile after the claim so the UI
     * and withdrawal system use the authoritative balance.
     */
    currentProfile =
      await loadProfile(data.user.id);

    onAuthResolved();
  }

  /* ---------------------------------------------------------
     LOGIN
  --------------------------------------------------------- */

  async function handleLogin(e) {
    e.preventDefault();

    const ui = getUI();

    ui?.showError("");

    const email =
      document
        .getElementById("authLoginEmail")
        ?.value.trim();

    const password =
      document
        .getElementById("authLoginPassword")
        ?.value;

    if (!email || !password) {
      ui?.showError("Please fill in all fields.");
      return;
    }

    const { data, error } =
      await window.supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      ui?.showError(error.message);
      return;
    }

    if (!data?.session || !data?.user) {
      ui?.showError(
        "Login could not be completed. Please try again."
      );
      return;
    }

    currentUser = data.user;

    currentProfile =
      await loadProfile(data.user.id);

    onAuthResolved();
  }

  /* ---------------------------------------------------------
     LOGOUT
  --------------------------------------------------------- */

  async function handleLogout() {
    const { error } =
      await window.supabase.auth.signOut();

    if (error) {
      console.error(
        "[EarnRush Auth] Logout failed:",
        error.message
      );

      getUI()?.showError(
        "Could not log out. Please try again."
      );

      return;
    }

    clearAuthenticatedUser();
  }

  /* ---------------------------------------------------------
     AUTH RESOLVED
  --------------------------------------------------------- */

  function onAuthResolved() {
    getUI()?.close();

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
     ACCOUNT HEADER
  --------------------------------------------------------- */

  function renderUserChip() {
    getUI()?.renderUserChip(
      currentUser,
      currentProfile
    );
  }

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */

  async function init() {
    const ui = getUI();

    if (!ui) {
      console.error(
        "[EarnRush Auth] EarnRushUI.auth is not available. Make sure ui.js loads before auth.js."
      );
      return;
    }

    ui.cacheDom();

    ui.setupEvents({
      onLogin: handleLogin,
      onSignup: handleSignup,

      onLogout: () => {
        if (
          confirm(
            "Log out of your EarnRush account?"
          )
        ) {
          handleLogout();
        }
      }
    });

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
     * Restore existing session after refresh.
     */

    const { data, error } =
      await window.supabase.auth.getSession();

    if (error) {
      console.error(
        "[EarnRush Auth] Session restore failed:",
        error.message
      );

      clearAuthenticatedUser();

    } else if (data?.session?.user) {

      await setAuthenticatedUser(
        data.session.user
      );

    } else {

      clearAuthenticatedUser();
    }

    /*
     * Listen for future authentication changes.
     */

    window.supabase.auth.onAuthStateChange(
      (event, session) => {

        setTimeout(async () => {

          if (session?.user) {

            await setAuthenticatedUser(
              session.user
            );

          } else {

            clearAuthenticatedUser();

          }

        }, 0);
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
      getUI()?.open("login");
    },

    open(mode) {
      getUI()?.open(mode);
    },

    close() {
      getUI()?.close();
    },

    logout: handleLogout
  };

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