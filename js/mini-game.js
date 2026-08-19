/* =========================================================
   EARNRUSH MINI GAME
   Core UI / State / Token / Round Foundation
   ========================================================= */

(() => {
  "use strict";

  /* =========================
     CONFIG
     ========================= */

  const CONFIG = {
    COINS_PER_TOKEN: 10,       // 1000 Coins = 100 Tokens
    MIN_CONVERT_COINS: 1000,
    MIN_GAME_TOKENS: 1,

    START_MULTIPLIER: 1.00,
    MAX_DISPLAY_MULTIPLIER: 100.00,

    ROUND_WAIT: 2500,
    ROUND_DURATION: 10000,
    RESULT_DELAY: 1800,

    HISTORY_LIMIT: 12,

    SIMULATED_PLAYERS_MIN: 86,
    SIMULATED_PLAYERS_MAX: 148,

    ANIMATION_SPEED: 1
  };

  /* =========================
     STATE
     ========================= */

  const state = {
    open: false,
    round: "waiting",
    multiplier: CONFIG.START_MULTIPLIER,

    gameTokens: 0,
    selectedAmount: 10,

    roundNumber: 0,
    roundStartedAt: 0,

    history: [],

    livePlayers: 0,
    joinedPlayers: 0,

    currentTab: "current",

    sound: true,
    animation: true,

    planeProgress: 0,

    timer: null,
    playerTimer: null,

    initialized: false
  };

  /* =========================
     DOM HELPERS
     ========================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function show(el) {
    if (el) el.style.display = "";
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  /* =========================
     LOCAL STORAGE
     ========================= */

  const STORAGE_KEY = "earnrush_mini_game";

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          gameTokens: state.gameTokens,
          history: state.history,
          sound: state.sound,
          animation: state.animation
        })
      );
    } catch (error) {
      console.warn("Mini-game state could not be saved.");
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);

      if (Number.isFinite(saved.gameTokens)) {
        state.gameTokens = Math.max(0, saved.gameTokens);
      }

      if (Array.isArray(saved.history)) {
        state.history = saved.history
          .filter(Number.isFinite)
          .slice(0, CONFIG.HISTORY_LIMIT);
      }

      if (typeof saved.sound === "boolean") {
        state.sound = saved.sound;
      }

      if (typeof saved.animation === "boolean") {
        state.animation = saved.animation;
      }
    } catch (error) {
      console.warn("Mini-game state could not be loaded.");
    }
  }

  /* =========================
     EARNRUSH COIN BRIDGE
     ========================= */

  function getEarnRushCoins() {
    try {
      if (
        window.EarnRushGame &&
        typeof window.EarnRushGame.getCoins === "function"
      ) {
        return Number(window.EarnRushGame.getCoins()) || 0;
      }

      if (
        window.gameState &&
        Number.isFinite(Number(window.gameState.coins))
      ) {
        return Number(window.gameState.coins);
      }

      const stored = localStorage.getItem("earnrush_coins");

      if (stored !== null) {
        return Number(stored) || 0;
      }
    } catch (error) {
      console.warn("Could not read EarnRush balance.");
    }

    return 0;
  }

  function addEarnRushCoins(amount) {
    amount = Number(amount);

    if (!Number.isFinite(amount) || amount === 0) {
      return false;
    }

    try {
      if (
        window.EarnRushGame &&
        typeof window.EarnRushGame.addCoins === "function"
      ) {
        window.EarnRushGame.addCoins(amount);
        return true;
      }

      if (
        window.gameState &&
        Number.isFinite(Number(window.gameState.coins))
      ) {
        window.gameState.coins =
          Math.max(0, Number(window.gameState.coins) + amount);

        if (typeof window.saveGame === "function") {
          window.saveGame();
        }

        return true;
      }
    } catch (error) {
      console.warn("Could not update EarnRush balance.");
    }

    return false;
  }

  /* =========================
     TOKEN WALLET
     ========================= */

  function getTokens() {
    return Math.max(0, Math.floor(state.gameTokens));
  }

  function setTokens(amount) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    state.gameTokens = amount;

    updateWalletUI();
    saveState();
  }

  function addTokens(amount) {
    amount = Math.floor(Number(amount) || 0);

    if (amount <= 0) return;

    setTokens(state.gameTokens + amount);
  }

  function removeTokens(amount) {
    amount = Math.floor(Number(amount) || 0);

    if (amount <= 0 || amount > state.gameTokens) {
      return false;
    }

    setTokens(state.gameTokens - amount);
    return true;
  }

  function updateWalletUI() {
    const tokenElements = [
      byId("mgTokenBalance"),
      byId("mgTokens"),
      byId("miniGameTokens")
    ].filter(Boolean);

    tokenElements.forEach(el => {
      el.textContent = getTokens().toLocaleString();
    });

    const coinElements = [
      byId("mgCoinBalance"),
      byId("miniGameCoins")
    ].filter(Boolean);

    const coins = getEarnRushCoins();

    coinElements.forEach(el => {
      el.textContent = coins.toLocaleString();
    });
  }

  /* =========================
     COINS → TOKENS
     ========================= */

  function coinsToTokens(coins) {
    coins = Math.floor(Number(coins) || 0);

    if (coins < CONFIG.MIN_CONVERT_COINS) {
      notify("Minimum conversion is 1,000 Coins.");
      return false;
    }

    const available = getEarnRushCoins();

    if (available < coins) {
      notify("Not enough EarnRush Coins.");
      return false;
    }

    const tokens = Math.floor(coins / CONFIG.COINS_PER_TOKEN);

    if (tokens <= 0) return false;

    const updated = addEarnRushCoins(-coins);

    if (!updated) {
      notify("Coin balance could not be updated.");
      return false;
    }

    addTokens(tokens);

    notify(
      `${coins.toLocaleString()} Coins → ${tokens.toLocaleString()} Tokens`
    );

    updateWalletUI();
    return true;
  }

  /* =========================
     TOKENS → COINS
     ========================= */

  function tokensToCoins(tokens) {
    tokens = Math.floor(Number(tokens) || 0);

    if (tokens < CONFIG.MIN_GAME_TOKENS) {
      notify("Enter a valid Token amount.");
      return false;
    }

    if (tokens > getTokens()) {
      notify("Not enough Game Tokens.");
      return false;
    }

    const coins = tokens * CONFIG.COINS_PER_TOKEN;

    if (!removeTokens(tokens)) {
      return false;
    }

    if (!addEarnRushCoins(coins)) {
      addTokens(tokens);
      notify("Coin balance could not be updated.");
      return false;
    }

    notify(
      `${tokens.toLocaleString()} Tokens → ${coins.toLocaleString()} Coins`
    );

    updateWalletUI();
    return true;
  }

  /* =========================
     CONVERSION CONTROLS
     ========================= */

  function setupConversion() {
    const coinInput = byId("mgCoinConvert");

    const coinButton = byId("mgConvertCoins");

    if (coinButton) {
      coinButton.addEventListener("click", () => {
        const amount = Number(
          coinInput?.value || CONFIG.MIN_CONVERT_COINS
        );

        coinsToTokens(amount);
      });
    }

    const tokenInput = byId("mgTokenConvert");

    const tokenButton = byId("mgConvertTokens");

    if (tokenButton) {
      tokenButton.addEventListener("click", () => {
        const amount = Number(
          tokenInput?.value || 0
        );

        tokensToCoins(amount);
      });
    }
  }

  /* =========================
     GAME OPEN / CLOSE
     ========================= */

  function openGame() {
    const overlay =
      byId("miniGameOverlay") ||
      $(".mg-overlay");

    if (!overlay) {
      console.warn("Mini-game overlay not found.");
      return;
    }

    state.open = true;

    overlay.classList.add("active");

    document.body.classList.add("mg-open");

    updateWalletUI();
    updatePlayers();
    renderHistory();
    updateMultiplier();

    resetRoundUI();
  }

  function closeGame() {
    const overlay =
      byId("miniGameOverlay") ||
      $(".mg-overlay");

    if (!overlay) return;

    state.open = false;

    stopRound();

    overlay.classList.remove("active");

    document.body.classList.remove("mg-open");
  }

  function setupOpenButtons() {
    $$("[data-open-mini-game]").forEach(button => {
      button.addEventListener("click", openGame);
    });

    const card =
      byId("miniGameCard") ||
      $(".mg-card");

    if (card) {
      card.addEventListener("click", openGame);
    }

    const close =
      byId("mgClose") ||
      $(".mg-back");

    if (close) {
      close.addEventListener("click", closeGame);
    }
  }

  /* =========================
     PLAYER SYSTEM
     ========================= */

  function randomInt(min, max) {
    return Math.floor(
      Math.random() * (max - min + 1)
    ) + min;
  }

  function updatePlayers() {
    const drift = randomInt(-3, 4);

    state.livePlayers = Math.max(
      CONFIG.SIMULATED_PLAYERS_MIN,
      Math.min(
        CONFIG.SIMULATED_PLAYERS_MAX,
        state.livePlayers + drift
      )
    );

    if (!state.livePlayers) {
      state.livePlayers = randomInt(
        CONFIG.SIMULATED_PLAYERS_MIN,
        CONFIG.SIMULATED_PLAYERS_MAX
      );
    }

    const joined = Math.max(
      1,
      state.livePlayers - randomInt(3, 12)
    );

    state.joinedPlayers = joined;

    setText(
      "mgLivePlayers",
      state.livePlayers.toLocaleString()
    );

    setText(
      "mgJoinedPlayers",
      joined.toLocaleString()
    );
  }

  function startPlayerCounter() {
    clearInterval(state.playerTimer);

    updatePlayers();

    state.playerTimer = setInterval(() => {
      if (state.open) {
        updatePlayers();
      }
    }, 4000);
  }

  /* =========================
     ROUND HISTORY
     ========================= */

  function multiplierClass(value) {
    if (value < 2) return "low";
    if (value <= 10) return "medium";
    return "high";
  }

  function addHistory(value) {
    value = Number(value);

    if (!Number.isFinite(value)) return;

    state.history.unshift(
      Number(value.toFixed(2))
    );

    state.history =
      state.history.slice(0, CONFIG.HISTORY_LIMIT);

    saveState();
    renderHistory();
  }

  function renderHistory() {
    const container =
      byId("mgHistory") ||
      $(".mg-history");

    if (!container) return;

    container.innerHTML = "";

    if (!state.history.length) {
      const empty = document.createElement("div");

      empty.className = "mg-history-item";

      empty.textContent = "No rounds yet";

      container.appendChild(empty);

      return;
    }

    state.history.forEach(value => {
      const item = document.createElement("div");

      item.className =
        `mg-history-item ${multiplierClass(value)}`;

      item.textContent = `${value.toFixed(2)}x`;

      container.appendChild(item);
    });
  }

  /* =========================
     MULTIPLIER UI
     ========================= */

  function updateMultiplier() {
    const value =
      Math.min(
        CONFIG.MAX_DISPLAY_MULTIPLIER,
        state.multiplier
      ).toFixed(2);

    setText("mgMultiplier", `${value}x`);
  }

  function setRoundStatus(text) {
    setText("mgStatus", text);
  }

  /* =========================
     PLANE ANIMATION
     ========================= */

  function updatePlane() {
    const plane =
      byId("mgPlane") ||
      $(".mg-plane");

    if (!plane) return;

    const progress =
      Math.min(1, state.planeProgress);

    const left =
      12 + progress * 70;

    const bottom =
      20 + progress * 42;

    plane.style.left = `${left}%`;
    plane.style.bottom = `${bottom}%`;
  }

  /* =========================
     ROUND ENGINE
     ========================= */

  function startRound() {
    if (state.round === "running") return;

    clearTimeout(state.timer);

    state.round = "running";
    state.roundNumber++;
    state.roundStartedAt = performance.now();
    state.multiplier = CONFIG.START_MULTIPLIER;
    state.planeProgress = 0;

    setRoundStatus("Plane is taking off...");

    const multiplier =
      byId("mgMultiplier") ||
      $(".mg-multiplier");

    if (multiplier) {
      multiplier.classList.remove("crashed");
    }

    setText(
      "mgRoundNumber",
      `ROUND ${state.roundNumber}`
    );

    runFlightAnimation();
  }

  function runFlightAnimation() {
    const started = performance.now();

    cancelAnimationFrame(state.animationFrame);

    function frame(now) {
      if (state.round !== "running") return;

      const elapsed =
        now - started;

      const progress =
        Math.min(
          1,
          elapsed / CONFIG.ROUND_DURATION
        );

      state.planeProgress = progress;

      /*
       * Transparent display progression.
       * This is visual/game-state foundation only.
       * No hidden wager or rigged crash outcome.
       */
      state.multiplier =
        1 +
        progress * 4;

      updateMultiplier();
      updatePlane();

      if (progress >= 1) {
        finishRound();
        return;
      }

      state.animationFrame =
        requestAnimationFrame(frame);
    }

    if (state.animation) {
      state.animationFrame =
        requestAnimationFrame(frame);
    } else {
      state.multiplier = 5;
      updateMultiplier();
      finishRound();
    }
  }

  function finishRound() {
    if (state.round !== "running") return;

    state.round = "finished";

    cancelAnimationFrame(
      state.animationFrame
    );

    const result =
      Number(state.multiplier.toFixed(2));

    addHistory(result);

    const multiplier =
      byId("mgMultiplier") ||
      $(".mg-multiplier");

    if (multiplier) {
      multiplier.classList.add("crashed");
    }

    setRoundStatus(
      `Round ended at ${result.toFixed(2)}x`
    );

    playSound("crash");

    state.timer = setTimeout(
      startRound,
      CONFIG.ROUND_WAIT
    );
  }

  function stopRound() {
    clearTimeout(state.timer);

    cancelAnimationFrame(
      state.animationFrame
    );

    state.round = "waiting";

    setRoundStatus("Ready");

    state.multiplier =
      CONFIG.START_MULTIPLIER;

    state.planeProgress = 0;

    updateMultiplier();
    updatePlane();
  }

  function resetRoundUI() {
    stopRound();

    setText(
      "mgRoundNumber",
      "READY"
    );

    setRoundStatus(
      "Press Start to begin"
    );
  }

  /* =========================
     START BUTTON
     ========================= */

  function setupStartButton() {
    const button =
      byId("mgStart") ||
      $(".mg-start");

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        if (state.round === "running") return;

        startRound();
      }
    );
  }

  /* =========================
     TABS
     ========================= */

  function setupTabs() {
    $$("[data-mg-tab]").forEach(button => {
      button.addEventListener("click", () => {
        const tab =
          button.dataset.mgTab;

        state.currentTab = tab;

        $$("[data-mg-tab]").forEach(item => {
          item.classList.toggle(
            "active",
            item === button
          );
        });

        $$("[data-mg-panel]").forEach(panel => {
          panel.style.display =
            panel.dataset.mgPanel === tab
              ? ""
              : "none";
        });
      });
    });
  }

  /* =========================
     SETTINGS
     ========================= */

  function setupSettings() {
    const soundButton =
      byId("mgSoundToggle");

    if (soundButton) {
      soundButton.addEventListener(
        "click",
        () => {
          state.sound = !state.sound;

          soundButton.textContent =
            state.sound
              ? "🔊 Sound On"
              : "🔇 Sound Off";

          saveState();
        }
      );
    }

    const animationButton =
      byId("mgAnimationToggle");

    if (animationButton) {
      animationButton.addEventListener(
        "click",
        () => {
          state.animation =
            !state.animation;

          animationButton.textContent =
            state.animation
              ? "✨ Animation On"
              : "⏹ Animation Off";

          saveState();
        }
      );
    }

    const rulesButton =
      byId("mgRules");

    if (rulesButton) {
      rulesButton.addEventListener(
        "click",
        () => {
          openPopup(
            "Game Rules",
            "Rounds, token conversion and reward rules are displayed here."
          );
        }
      );
    }

    const fairnessButton =
      byId("mgFairness");

    if (fairnessButton) {
      fairnessButton.addEventListener(
        "click",
        () => {
          openPopup(
            "Fairness",
            "Game results and system rules should be transparent and verifiable."
          );
        }
      );
    }
  }

  /* =========================
     POPUP
     ========================= */

  function openPopup(title, text) {
    const popup =
      byId("mgPopup") ||
      $(".mg-popup");

    if (!popup) return;

    const heading =
      popup.querySelector("h3");

    const paragraph =
      popup.querySelector("p");

    if (heading) {
      heading.textContent = title;
    }

    if (paragraph) {
      paragraph.textContent = text;
    }

    popup.classList.add("active");
  }

  function closePopup() {
    const popup =
      byId("mgPopup") ||
      $(".mg-popup");

    if (popup) {
      popup.classList.remove("active");
    }
  }

  function setupPopup() {
    const close =
      byId("mgPopupClose") ||
      $(".mg-popup-close");

    if (close) {
      close.addEventListener(
        "click",
        closePopup
      );
    }
  }

  /* =========================
     SOUND
     ========================= */

  function playSound(type) {
    if (!state.sound) return;

    /*
     * Audio files can be connected later.
     * No external audio dependency here.
     */
    document.dispatchEvent(
      new CustomEvent(
        "earnrush:mini-game-sound",
        {
          detail: { type }
        }
      )
    );
  }

  /* =========================
     TOAST
     ========================= */

  function notify(message) {
    let toast =
      byId("mgToast");

    if (!toast) {
      toast =
        document.createElement("div");

      toast.id = "mgToast";

      toast.style.cssText = `
        position:fixed;
        left:50%;
        bottom:24px;
        transform:translateX(-50%);
        z-index:10001;
        padding:10px 15px;
        border-radius:12px;
        background:#101c29;
        color:#fff;
        border:1px solid rgba(255,255,255,.1);
        font:700 11px Arial,sans-serif;
        opacity:0;
        pointer-events:none;
        transition:.25s;
      `;

      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";

    clearTimeout(toast._timer);

    toast._timer =
      setTimeout(() => {
        toast.style.opacity = "0";
      }, 2200);
  }

  /* =========================
     KEYBOARD
     ========================= */

  function setupKeyboard() {
    document.addEventListener(
      "keydown",
      event => {
        if (!state.open) return;

        if (event.key === "Escape") {
          closeGame();
        }

        if (
          event.key === "Enter" &&
          state.round !== "running"
        ) {
          startRound();
    }
      }
    );
  }

  /* =========================
     PUBLIC API
     ========================= */

  window.EarnRushMiniGame = {
    open: openGame,
    close: closeGame,

    getTokens,
    setTokens,
    addTokens,
    removeTokens,

    coinsToTokens,
    tokensToCoins,

    getState: () => ({
      ...state,
      history: [...state.history]
    }),

    startRound,
    stopRound
  };

  /* =========================
     INITIALIZATION
     ========================= */

  function init() {
    if (state.initialized) return;

    state.initialized = true;

    loadState();

    setupOpenButtons();
    setupConversion();
    setupStartButton();
    setupTabs();
    setupSettings();
    setupPopup();
    setupKeyboard();

    startPlayerCounter();

    updateWalletUI();
    renderHistory();
    updateMultiplier();
    updatePlane();

    console.log(
      "EarnRush Mini Game initialized."
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();