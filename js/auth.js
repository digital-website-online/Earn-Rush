/* =========================================================
   EARNRUSH — AUTH
   -----------------------------------------------------------
   Uses ONLY the standard, documented Supabase Auth client API
   plus plain table reads/updates on `profiles`.
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
     SYNC DATABASE COINS → GAME
  --------------------------------------------------------- */

  function syncProfileCoinsToGame(profile) {
    if (!profile) return;

    if (profile.coins == null) return;

    if (
      window.EarnRushGame &&
      typeof window.EarnRushGame.setCoinsFromServer === "function"
    ) {
      window.EarnRushGame.setCoinsFromServer(
        profile.coins
      );
    }
  }


  /* ---------------------------------------------------------
     GUEST PROGRESS CLAIMING
  --------------------------------------------------------- */

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
          Number(
            window.EarnRushGame?.getState()?.coins
          ) || 0
        )
      );

      const { data, error } =
        await window.supabase.rpc(
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

    const { data, error } =
      await window.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

    if (error) {
      ui?.showError(error.message);
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

      /*
       * Reload profile after guest claim so the latest
       * server-side coin balance becomes authoritative.
       */
      currentProfile =
        await loadProfile(data.user.id);

      syncProfileCoinsToGame(currentProfile);

      onAuthResolved();
    } else {
      ui?.showError(
        "Check your email to confirm your account, then log in."
      );

      ui?.setMode("login");
    }
  }


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

    currentUser = data.user;

    currentProfile =
      await loadProfile(data.user.id);

    syncProfileCoinsToGame(currentProfile);

    onAuthResolved();
  }


  async function handleLogout() {
    await window.supabase.auth.signOut();

    currentUser = null;
    currentProfile = null;

    renderUserChip();
  }


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
     ACCOUNT HEADER STATE
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

      syncProfileCoinsToGame(currentProfile);

      renderUserChip();

      window.EarnRushWithdrawal?.loadWithdrawalHistory();

      window.EarnRushWithdrawal?.refreshCoinBalance();
    } else {
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
          ? await loadProfile(
              currentUser.id
            )
          : null;

        syncProfileCoinsToGame(currentProfile);

        renderUserChip();
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