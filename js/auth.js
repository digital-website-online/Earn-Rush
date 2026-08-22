title="EarnRush — Corrected Auth"
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
     SYNC SERVER BALANCE → GAME
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
     GUEST ID
  --------------------------------------------------------- */

  function getOrCreateGuestId() {
    let id =
      localStorage.getItem(GUEST_ID_KEY);

    if (!id) {
      id =
        window.crypto &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "guest-" +
            Date.now() +
            "-" +
            Math.random()
              .toString(36)
              .slice(2);

      localStorage.setItem(
        GUEST_ID_KEY,
        id
      );
    }

    return id;
  }


  /* ---------------------------------------------------------
     GUEST PROGRESS CLAIMING
  --------------------------------------------------------- */

  async function claimGuestProgress() {
    try {
      const guestId =
        getOrCreateGuestId();

      const guestCoins =
        Math.max(
          0,
          Math.floor(
            Number(
              window.EarnRushGame
                ?.getState()
                ?.coins
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
      ui?.showError(
        "Please fill in all fields."
      );
      return;
    }

    if (password.length < 6) {
      ui?.showError(
        "Password must be at least 6 characters."
      );
      return;
    }


    /*
     * Remember guest balance BEFORE signup.
     * This is the progress that should follow
     * the user into the new account.
     */

    const guestCoinsBeforeSignup =
      Math.max(
        0,
        Math.floor(
          Number(
            window.EarnRushGame
              ?.getState()
              ?.coins
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
      ui?.showError(
        error.message
      );
      return;
    }


    if (data.user) {

      currentUser =
        data.user;


      currentProfile =
        await loadProfile(
          data.user.id
        );


      await ensureProfileName(
        data.user.id,
        name
      );


      /*
       * Claim guest progress.
       *
       * The guest balance is sent to the server.
       * The database function is authoritative.
       */

      const claimed =
        await window.supabase.rpc(
          "claim_guest_session",
          {
            p_guest_id:
              getOrCreateGuestId(),

            p_guest_coins:
              guestCoinsBeforeSignup
          }
        );


      if (claimed.error) {

        console.warn(
          "[EarnRush Auth] Guest progress claim failed:",
          claimed.error.message
        );

      }


      /*
       * IMPORTANT:
       * Reload profile AFTER guest claim.
       * This gets the real server balance.
       */

      currentProfile =
        await loadProfile(
          data.user.id
        );


      /*
       * Only now sync the authoritative
       * database balance to the game.
       */

      syncProfileCoinsToGame(
        currentProfile
      );


      onAuthResolved();

    } else {

      /*
       * If Supabase requires confirmation,
       * don't pretend the account is logged in.
       */

      ui?.showError(
        "Account created. Please log in to continue."
      );

      ui?.setMode("login");
    }
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
      ui?.showError(
        "Please fill in all fields."
      );
      return;
    }


    const { data, error } =
      await window.supabase.auth.signInWithPassword({
        email,
        password
      });


    if (error) {
      ui?.showError(
        error.message
      );
      return;
    }


    currentUser =
      data.user;


    currentProfile =
      await loadProfile(
        data.user.id
      );


    /*
     * Normal login:
     * Use the user's real database balance.
     *
     * Do NOT overwrite the account with
     * the old guest/local balance.
     */

    syncProfileCoinsToGame(
      currentProfile
    );


    onAuthResolved();
  }


  /* ---------------------------------------------------------
     LOGOUT
  --------------------------------------------------------- */

  async function handleLogout() {

    await window.supabase.auth.signOut();

    currentUser = null;
    currentProfile = null;

    renderUserChip();
  }


  /* ---------------------------------------------------------
     AUTH RESOLVED
  --------------------------------------------------------- */

  function onAuthResolved() {

    getUI()?.close();

    renderUserChip();

    window.EarnRushWithdrawal
      ?.loadWithdrawalHistory();

    window.EarnRushWithdrawal
      ?.refreshCoinBalance();


    if (
      window.pendingWithdrawAfterAuth
    ) {

      window.pendingWithdrawAfterAuth =
        false;

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

      onLogin:
        handleLogin,

      onSignup:
        handleSignup,

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
      typeof window.supabase.auth
        ?.getSession !==
        "function"
    ) {

      console.error(
        "[EarnRush Auth] Supabase client not available — check script load order."
      );

      return;
    }


    /* -------------------------------------------------------
       RESTORE SESSION
    ------------------------------------------------------- */

    const { data } =
      await window.supabase.auth.getSession();


    if (
      data?.session?.user
    ) {

      currentUser =
        data.session.user;


      currentProfile =
        await loadProfile(
          currentUser.id
        );


      /*
       * Existing logged-in account:
       * use database balance.
       */

      syncProfileCoinsToGame(
        currentProfile
      );


      renderUserChip();


      window.EarnRushWithdrawal
        ?.loadWithdrawalHistory();

      window.EarnRushWithdrawal
        ?.refreshCoinBalance();

    } else {

      currentUser = null;
      currentProfile = null;

      renderUserChip();
    }


    /* -------------------------------------------------------
       AUTH STATE CHANGES
    ------------------------------------------------------- */

    window.supabase.auth.onAuthStateChange(
      async (_event, session) => {

        currentUser =
          session?.user || null;


        currentProfile =
          currentUser
            ? await loadProfile(
                currentUser.id
              )
            : null;


        /*
         * Only authenticated users get their
         * server balance synced.
         */

        if (currentUser) {

          syncProfileCoinsToGame(
            currentProfile
          );
        }


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

      window.pendingWithdrawAfterAuth =
        true;

      getUI()?.open("login");
    },


    open(mode) {
      getUI()?.open(mode);
    },


    close() {
      getUI()?.close();
    },


    logout:
      handleLogout
  };


  /* ---------------------------------------------------------
     START
  --------------------------------------------------------- */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();
  }

})();