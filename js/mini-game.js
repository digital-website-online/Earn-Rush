/* =========================================================
   EARNRUSH MINI GAME - ARCADE TOKEN ENGINE
   =========================================================
   Rules:
   - New user starts with 300 Arcade Tokens.
   - Minimum bet: 16 Tokens.
   - Maximum bet: 16,000 Tokens.
   - Coins -> Arcade Tokens is one-way only.
   - Arcade Tokens never enter the withdrawal system.
   - Demo activity is simulated and clearly labeled.
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushMiniGameLoaded) return;
  window.__earnRushMiniGameLoaded = true;

  const CONFIG = {
    MIN_BET: 16,
    MAX_BET: 16000,

    COINS_PER_TOKEN: 0.1,
    MIN_CONVERT_COINS: 10,

    START_MULTIPLIER: 1.15,
    DISPLAY_MAX_MULTIPLIER: 1000,

    WAITING_SECONDS: 4,
    CRASH_HOLD_MS: 2200,
    HISTORY_LIMIT: 14,
    LIVE_PLAYER_INTERVAL: 4000,

    NEW_USER_TOKENS: 300
  };

  const STORAGE_KEY = "earnrush_minigame_tokens_v2";

  const COIN_FALLBACK_KEYS = [
    "earnrush_coins",
    "earnrushCoins",
    "coins"
  ];

  const RTP_STATISTICS = [
    { target: 1.70, probability: 80.8 },
    { target: 2.50, probability: 64.7 },
    { target: 3.00, probability: 48.5 },
    { target: 4.00, probability: 32.3 },
    { target: 5.00, probability: 19.4 },
    { target: 6.00, probability: 9.7 },
    { target: 7.00, probability: 4.85 },
    { target: 8.00, probability: 1.94 },
    { target: 100.00, probability: 0.97 }
  ];

  const DEMO_NAMES = [
    "Ali_Khan",
    "Zeeshan99",
    "FastRunner",
    "Ahmed_Dev",
    "User_771",
    "PixelPilot"
  ];

  /* =========================================================
     STATE
     ========================================================= */

  const state = {
    open: false,
    cycleActive: false,

    round: "waiting",
    roundNumber: 0,

    multiplier: 1,
    crashPoint: 1,
    secondsLeft: CONFIG.WAITING_SECONDS,

    savedScrollY: 0,

    gameTokens: loadSavedTokens(),

    bets: {
      1: {
        amount: CONFIG.MIN_BET,
        active: false,
        cashedOut: false,
        pending: false
      },
      2: {
        amount: CONFIG.MIN_BET,
        active: false,
        cashedOut: false,
        pending: false
      }
    },

    history: [],

    livePlayers: 136,
    demoTotal: 0,

    animationFrame: null,
    waitTimer: null,
    countdownTimer: null,
    crashTimer: null,
    playerTimer: null,

    stageRect: null,

    lastMultiplierText: "",
    lastPlaneX: null,
    lastPlaneY: null
  };

  /* =========================================================
     STORAGE
     ========================================================= */

  function loadSavedTokens() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      /*
       * Important:
       * 0 is valid.
       * Only a completely missing key gets 300 tokens.
       */
      if (
        saved !== null &&
        saved !== "" &&
        !Number.isNaN(Number(saved))
      ) {
        return Math.max(
          0,
          Math.floor(Number(saved))
        );
      }
    } catch (e) {}

    return CONFIG.NEW_USER_TOKENS;
  }

  function saveTokensToStorage() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        String(state.gameTokens)
      );
    } catch (e) {}
  }

  /* =========================================================
     DOM
     ========================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const byId = id =>
    document.getElementById(id);

  const dom = {};

  function cacheDom() {
    dom.overlay = byId("miniGameOverlay");

    dom.roundTag = byId("mgRoundNumber");
    dom.multiplier = byId("mgMultiplier");
    dom.status = byId("mgStatus");

    dom.plane = byId("mgPlane");
    dom.trail = byId("mgTrail");

    dom.stage = dom.plane
      ? dom.plane.closest(".mg-screen")
      : null;

    dom.history = byId("mgHistory");

    dom.tokenBalance = byId("mgTokenBalance");
    dom.coinBalance =
      byId("mgCoinBalance") ||
      byId("miniGameCoins");

    dom.livePlayers = byId("mgLivePlayers");

    dom.liveBetsList =
      byId("mgLiveBetsList");

    dom.statistics =
      byId("mgStatistics");

    dom.historyList =
      byId("mgHistoryList");

    dom.demoBetsCount =
      byId("mgDemoBetsCount");

    dom.demoTotal =
      byId("mgDemoTotal");

    dom.betInputs = {
      1: byId("mgBetInput1"),
      2: byId("mgBetInput2")
    };

    dom.startBtns = {
      1: byId("mgStart1"),
      2: byId("mgStart2")
    };

    dom.convertInput =
  byId("mgCoinConvertInput");

    dom.convertBtn =
  byId("mgConvertBtn");

    dom.convertPreview =
  byId("mgConvertPreview");

    dom.tokenConvertInput =
  byId("mgTokenConvertInput");

    dom.tokenConvertBtn =
  byId("mgTokenConvertBtn");

    dom.tokenConvertPreview =
  byId("mgTokenConvertPreview");

    dom.convertMsg =
  byId("mgConvertMsg");

    dom.insightsToggle =
  byId("mgInsightsToggle");

    dom.insightsDrawer =
  byId("mgInsightsDrawer");

    dom.insightsArrow =
  byId("mgInsightsArrow");

 }

  /* =========================================================
     FORMAT
     ========================================================= */

  function fmt(n) {
    return Math.floor(Number(n) || 0)
      .toLocaleString();
  }

  function clampBet(value) {
    let amount = Math.floor(
      Number(value) || CONFIG.MIN_BET
    );

    amount = Math.max(
      CONFIG.MIN_BET,
      Math.min(CONFIG.MAX_BET, amount)
    );

    return amount;
  }

  function setStartBtnLabel(btn, top, bottom) {
    if (!btn) return;

    btn.innerHTML =
      bottom !== undefined
        ? `${top}<br><span>${bottom}</span>`
        : top;
  }

  /* =========================================================
     TOKEN WALLET
     ========================================================= */

  function getTokens() {
    return Math.max(
      0,
      Math.floor(Number(state.gameTokens) || 0)
    );
  }

  function setTokens(value) {
    state.gameTokens = Math.max(
      0,
      Math.floor(Number(value) || 0)
    );

    saveTokensToStorage();
    updateWalletUI();
  }

  function updateWalletUI() {
    if (dom.tokenBalance) {
      dom.tokenBalance.textContent =
        fmt(getTokens());
    }

    if (dom.coinBalance) {
      dom.coinBalance.textContent =
        fmt(getEarnRushCoins());
    }
  }

  /* =========================================================
     REAL COINS
     ========================================================= */

  function getEarnRushCoins() {
    try {
      if (
        window.EarnRushGame &&
        typeof window.EarnRushGame.getCoins === "function"
      ) {
        return Number(
          window.EarnRushGame.getCoins()
        ) || 0;
      }
    } catch (e) {}

    try {
      const balance = byId("balance");

      if (balance) {
        const value = Number(
          String(balance.textContent)
            .replace(/[^\d.-]/g, "")
        );

        if (Number.isFinite(value)) {
          return value;
        }
      }

      for (const key of COIN_FALLBACK_KEYS) {
        const stored =
          localStorage.getItem(key);

        if (
          stored !== null &&
          !Number.isNaN(Number(stored))
        ) {
          return Number(stored) || 0;
        }
      }
    } catch (e) {}

    return 0;
  }

  function spendEarnRushCoins(amount) {
    amount = Math.floor(Number(amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    try {
      if (
        window.EarnRushGame &&
        typeof window.EarnRushGame.getState === "function"
      ) {
        const gameState =
          window.EarnRushGame.getState();

        if (
          gameState &&
          Number.isFinite(Number(gameState.coins))
        ) {
          if (
            Number(gameState.coins) < amount
          ) {
            return false;
          }

          gameState.coins =
            Number(gameState.coins) - amount;

          if (
            typeof window.EarnRushGame.updateUI ===
            "function"
          ) {
            window.EarnRushGame.updateUI();
          }

          if (
            typeof window.EarnRushGame.save ===
            "function"
          ) {
            window.EarnRushGame.save();
          }

          updateWalletUI();

          return true;
        }
      }
    } catch (e) {}

    /* Fallback */

    const before = getEarnRushCoins();

    if (before < amount) {
      return false;
    }

    const newBalance =
      Math.max(0, before - amount);

    try {
      const mainBalance =
        byId("balance");

      if (mainBalance) {
        mainBalance.textContent =
          fmt(newBalance);
      }

      if (dom.coinBalance) {
        dom.coinBalance.textContent =
          fmt(newBalance);
      }

      let targetKey = null;

      for (const key of COIN_FALLBACK_KEYS) {
        if (localStorage.getItem(key) !== null) {
          targetKey = key;
          break;
        }
      }

      localStorage.setItem(
        targetKey || COIN_FALLBACK_KEYS[0],
        String(newBalance)
      );

      return true;
    } catch (e) {
      return false;
    }
  }

  /* =========================================================
   COINS -> ARCADE TOKENS
   ========================================================= */

function updateConvertPreview() {

  /* Coins → Tokens */

  if (
    dom.convertInput &&
    dom.convertPreview
  ) {
    const amount =
      Math.floor(
        Number(dom.convertInput.value) || 0
      );

    if (amount <= 0) {
      dom.convertPreview.textContent =
        "= 0 Arcade Tokens";
    } else {
      const tokens =
        Math.floor(
          amount /
          CONFIG.COINS_PER_TOKEN
        );

      dom.convertPreview.textContent =
        `= ${fmt(tokens)} Arcade Tokens`;
    }
  }


  /* Tokens → Coins */

  if (
    dom.tokenConvertInput &&
    dom.tokenConvertPreview
  ) {
    const tokens =
      Math.floor(
        Number(
          dom.tokenConvertInput.value
        ) || 0
      );

    if (tokens <= 0) {
      dom.tokenConvertPreview.textContent =
        "= 0 Coins";
    } else {
      const coins =
        Math.floor(
          tokens * CONFIG.COINS_PER_TOKEN
        );

      dom.tokenConvertPreview.textContent =
        `= ${fmt(coins)} Coins`;
    }
  }
}

function handleTokenConvert() {

  if (!dom.tokenConvertInput) return;

  const raw =
    dom.tokenConvertInput.value;

  const amount =
    Math.floor(Number(raw));

  if (
    !raw ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    showConvertMessage(
      "Enter a valid Arcade Token amount.",
      true
    );
    return;
  }


  if (amount < 10) {
    showConvertMessage(
      "Minimum conversion is 10 Arcade Tokens.",
      true
    );
    return;
  }


  /* 10 Tokens = 1 Coin */

  const coins =
    Math.floor(
      amount *
      CONFIG.COINS_PER_TOKEN
    );


  if (coins <= 0) {
    showConvertMessage(
      "Conversion amount is too small.",
      true
    );
    return;
  }


  if (getTokens() < amount) {
    showConvertMessage(
      "Not enough Arcade Tokens.",
      true
    );
    return;
  }


  /* Remove Arcade Tokens */

  setTokens(
    getTokens() - amount
  );


  /*
   * Add Coins back through the existing
   * EarnRush coin state when available.
   */

  let added = false;

  try {

    if (
      window.EarnRushGame &&
      typeof window.EarnRushGame.getState ===
        "function"
    ) {

      const gameState =
        window.EarnRushGame.getState();

      if (
        gameState &&
        Number.isFinite(
          Number(gameState.coins)
        )
      ) {

        gameState.coins =
          Number(gameState.coins) + coins;

        if (
          typeof window.EarnRushGame.updateUI ===
          "function"
        ) {
          window.EarnRushGame.updateUI();
        }

        if (
          typeof window.EarnRushGame.save ===
          "function"
        ) {
          window.EarnRushGame.save();
        }

        added = true;
      }
    }

  } catch (e) {}


  /*
   * Fallback for existing EarnRush storage.
   */

  if (!added) {

    try {

      const before =
        getEarnRushCoins();

      const newBalance =
        before + coins;

      const mainBalance =
        byId("balance");

      if (mainBalance) {
        mainBalance.textContent =
          fmt(newBalance);
      }

      if (dom.coinBalance) {
        dom.coinBalance.textContent =
          fmt(newBalance);
      }

      let targetKey = null;

      for (
        const key of COIN_FALLBACK_KEYS
      ) {

        if (
          localStorage.getItem(key) !==
          null
        ) {
          targetKey = key;
          break;
        }
      }

      localStorage.setItem(
        targetKey ||
        COIN_FALLBACK_KEYS[0],
        String(newBalance)
      );

      added = true;

    } catch (e) {
      added = false;
    }
  }


  if (!added) {

    /* Roll back tokens if coin update failed */

    setTokens(
      getTokens() + amount
    );

    showConvertMessage(
      "Conversion failed. Please try again.",
      true
    );

    return;
  }


  updateWalletUI();

  dom.tokenConvertInput.value = "";

  updateConvertPreview();

  showConvertMessage(
    `Converted ${fmt(amount)} Arcade Tokens → ${fmt(coins)} Coin${coins === 1 ? "" : "s"}.`,
    false
  );
}


  /* =========================================================
     OPEN / CLOSE
     ========================================================= */

  function openGame() {
    state.open = true;

    dom.overlay?.classList.add("active");

    state.savedScrollY =
      window.scrollY ||
      window.pageYOffset ||
      0;

    document.documentElement
      .style
      .setProperty(
        "--mg-scroll-y",
        `${state.savedScrollY}px`
      );

    document.documentElement
      .classList.add("mini-game-active");

    document.body
      .classList.add("mini-game-active");

    document.body
      .classList.add("mg-open");

    updateWalletUI();
    updateConvertPreview();

    renderLiveBets();
    renderHistory();
    renderStatistics();

    startLivePlayerTimer();

    if (!state.cycleActive) {
      state.cycleActive = true;
      scheduleWaiting();
    }
  }

  function closeGame() {
    state.open = false;

    dom.overlay?.classList.remove("active");

    document.documentElement
      .classList.remove("mini-game-active");

    document.body
      .classList.remove("mini-game-active");

    document.documentElement
      .style
      .removeProperty("--mg-scroll-y");

    const restoreY =
      state.savedScrollY || 0;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(
          0,
          restoreY
        );
      });
    });

    document.body
      .classList.remove("mg-open");

    stopLivePlayerTimer();
    stopCycle();
  }

  function stopCycle() {
    state.cycleActive = false;

    cancelAnimationFrame(
      state.animationFrame
    );

    clearTimeout(
      state.waitTimer
    );

    clearInterval(
      state.countdownTimer
    );

    clearTimeout(
      state.crashTimer
    );
  }

  /* =========================================================
     BET CONTROLS
     ========================================================= */

  function setupBetControls() {
    [1, 2].forEach(panelId => {
      const input =
        dom.betInputs[panelId];

      if (!input) return;

      /* Force correct HTML limits */
      input.min =
        String(CONFIG.MIN_BET);

      input.max =
        String(CONFIG.MAX_BET);

      input.value =
        clampBet(input.value);

      state.bets[panelId].amount =
        clampBet(input.value);

      input.addEventListener(
        "input",
        () => {
          const amount =
            clampBet(input.value);

          state.bets[panelId].amount =
            amount;

          input.value = amount;

          updatePanelUI(panelId);
        }
      );

      const container =
        $(`[data-panel-id="${panelId}"]`);

      if (!container) return;

      container.addEventListener(
        "click",
        e => {
          const stepBtn =
            e.target.closest(
              ".mg-step-btn"
            );

          if (stepBtn) {
            let current =
              state.bets[panelId].amount;

            /*
             * Step size:
             * Small amounts move by 16.
             * This makes the 16 minimum easy to reach.
             */
            const step =
              current < 100
                ? 16
                : 100;

            if (
              stepBtn.dataset.action ===
              "plus"
            ) {
              current += step;
            } else {
              current -= step;
            }

            current =
              clampBet(current);

            state.bets[panelId].amount =
              current;

            input.value = current;

            updatePanelUI(panelId);

            return;
          }

          const tokenBtn =
            e.target.closest(
              "[data-mg-token]"
            );

          if (tokenBtn) {
            const amount =
              clampBet(
                Number(
                  tokenBtn.dataset.mgToken
                )
              );

            state.bets[panelId].amount =
              amount;

            input.value = amount;

            updatePanelUI(panelId);
          }
        }
      );
    });
  }

  function updatePanelUI(panelId) {
    const btn =
      dom.startBtns[panelId];

    const bet =
      state.bets[panelId];

    if (!btn) return;

    if (
      state.round === "waiting" &&
      bet.pending
    ) {
      setStartBtnLabel(
        btn,
        "Bet Placed",
        "✓"
      );

      btn.disabled = true;

      return;
    }

    if (state.round === "waiting") {
      setStartBtnLabel(
        btn,
        "BET",
        fmt(bet.amount)
      );

      btn.disabled = false;

      btn.classList.remove(
        "cashout"
      );
    }
  }

  function startRoundForPanel(panelId) {
    const bet =
      state.bets[panelId];

    if (state.round === "waiting") {
      if (bet.pending) return;

      if (
        getTokens() <
        bet.amount
      ) {
        showTokenWarning();
        return;
      }

      setTokens(
        getTokens() -
        bet.amount
      );

      bet.pending = true;
      bet.active = false;
      bet.cashedOut = false;

      updatePanelUI(panelId);

      return;
    }

    if (
      state.round === "running" &&
      bet.active &&
      !bet.cashedOut
    ) {
      cashOutPanel(panelId);
    }
  }

  function showTokenWarning() {
    if (!dom.status) return;

    const previous =
      dom.status.textContent;

    dom.status.textContent =
      "Not enough Arcade Tokens — convert more Coins to play.";

    setTimeout(() => {
      if (
        dom.status &&
        state.round === "waiting"
      ) {
        dom.status.textContent =
          previous;
      }
    }, 1800);
  }

  /* =========================================================
     ROUND CYCLE
     ========================================================= */

  function scheduleWaiting() {
    state.round = "waiting";

    state.secondsLeft =
      CONFIG.WAITING_SECONDS;

    if (dom.multiplier) {
      dom.multiplier.textContent =
        "1.00x";

      dom.multiplier.classList.remove(
        "crashed"
      );
    }

    resetPlaneToStart();

    dom.plane?.classList.add(
      "idle"
    );

    [1, 2].forEach(id => {
      const bet =
        state.bets[id];

      bet.active = false;
      bet.cashedOut = false;

      const btn =
        dom.startBtns[id];

      if (btn) {
        btn.classList.remove(
          "cashout"
        );

        btn.disabled =
          bet.pending;

        setStartBtnLabel(
          btn,
          bet.pending
            ? "Bet Placed"
            : "BET",
          bet.pending
            ? "✓"
            : fmt(bet.amount)
        );
      }
    });

    updateCountdownText();

    clearInterval(
      state.countdownTimer
    );

    state.countdownTimer =
      setInterval(() => {
        state.secondsLeft--;

        if (
          state.secondsLeft <= 0
        ) {
          clearInterval(
            state.countdownTimer
          );

          beginFlight();
        } else {
          updateCountdownText();
        }
      }, 1000);
  }

  function updateCountdownText() {
    if (dom.status) {
      dom.status.textContent =
        `Next flight in ${state.secondsLeft}s`;
    }

    if (dom.roundTag) {
      dom.roundTag.textContent =
        `ROUND ${state.roundNumber + 1}`;
    }
  }

  function resetPlaneToStart() {
    if (dom.plane) {
      dom.plane.style.transform =
        "translate3d(0, 0, 0)";
    }

    if (dom.trail) {
      dom.trail.style.width =
        "0px";

      dom.trail.style.transform =
        "rotate(0deg)";
    }

    state.lastPlaneX = null;
    state.lastPlaneY = null;
  }

  function beginFlight() {
    state.round = "running";

    state.roundNumber++;

    state.multiplier =
      CONFIG.START_MULTIPLIER;

    state.crashPoint =
      parseFloat(
        (
          0.97 /
          (1 - Math.random())
        ).toFixed(2)
      );

    if (Math.random() < 0.03) {
      state.crashPoint = 1;
    }

    dom.plane?.classList.remove(
      "idle"
    );

    if (dom.roundTag) {
      dom.roundTag.textContent =
        `ROUND ${state.roundNumber}`;
    }

    if (dom.status) {
      dom.status.textContent =
        "Plane taking off...";
    }

    dom.multiplier?.classList.remove(
      "crashed"
    );

    state.stageRect =
      dom.stage
        ? dom.stage.getBoundingClientRect()
        : null;

    state.lastMultiplierText = "";
    state.lastPlaneX = null;
    state.lastPlaneY = null;

    [1, 2].forEach(id => {
      const bet =
        state.bets[id];

      if (bet.pending) {
        bet.pending = false;
        bet.active = true;
        bet.cashedOut = false;

        const btn =
          dom.startBtns[id];

        if (btn) {
          setStartBtnLabel(
            btn,
            "CASH OUT",
            `${state.multiplier.toFixed(2)}x`
          );

          btn.classList.add(
            "cashout"
          );

          btn.disabled = false;
        }
      }
    });

    runAnimation();
  }

  function runAnimation() {
    cancelAnimationFrame(
      state.animationFrame
    );

    const startTime =
      performance.now();

    function frame(now) {
      if (
        state.round !==
        "running"
      ) {
        return;
      }

      const elapsed =
        (now - startTime) / 1000;

      state.multiplier =
        1 +
        (
          Math.pow(
            elapsed,
            1.3
          ) * 0.15
        );

      const crashed =
        state.multiplier >=
        state.crashPoint;

      if (crashed) {
        state.multiplier =
          state.crashPoint;
      }

      if (state.open) {
        updateScreenUI();
      }

      if (crashed) {
        finishRound();
        return;
      }

      state.animationFrame =
        requestAnimationFrame(
          frame
        );
    }

    state.animationFrame =
      requestAnimationFrame(
        frame
      );
  }

  function updateScreenUI() {
    const value =
      Math.min(
        CONFIG.DISPLAY_MAX_MULTIPLIER,
        state.multiplier
      );

    const text =
      `${value.toFixed(2)}x`;

    if (
      dom.multiplier &&
      text !==
      state.lastMultiplierText
    ) {
      dom.multiplier.textContent =
        text;

      state.lastMultiplierText =
        text;

      [1, 2].forEach(id => {
        const bet =
          state.bets[id];

        const btn =
          dom.startBtns[id];

        if (
          btn &&
          bet.active &&
          !bet.cashedOut
        ) {
          const span =
            btn.querySelector(
              "span"
            );

          if (span) {
            span.textContent =
              text;
          }
        }
      });
    }

    if (dom.plane) {
      const pos =
        Math.min(
          75,
          (state.multiplier / 10) *
            75
        );

      const rect =
        state.stageRect;

      const width =
        rect
          ? rect.width
          : 300;

      const height =
        rect
          ? rect.height
          : 220;

      const x =
        Math.round(
          (pos / 75) *
          (width * 0.6)
        );

      const y =
        Math.round(
          (pos / 75) *
          (height * 0.5)
        );

      if (
        x !== state.lastPlaneX ||
        y !== state.lastPlaneY
      ) {
        dom.plane.style.transform =
          `translate3d(${x}px, ${-y}px, 0)`;

        state.lastPlaneX = x;
        state.lastPlaneY = y;

        if (dom.trail) {
          const length =
            Math.round(
              Math.sqrt(
                x * x +
                y * y
              )
            );

          const angle =
            -(
              Math.atan2(
                y,
                x
              ) *
              (180 / Math.PI)
            );

          dom.trail.style.width =
            `${length}px`;

          dom.trail.style.transform =
            `rotate(${angle}deg)`;
        }
      }
    }
  }

  /* =========================================================
     CASH OUT
     ========================================================= */

  function cashOutPanel(panelId) {
    const bet =
      state.bets[panelId];

    if (
      !bet.active ||
      bet.cashedOut
    ) {
      return;
    }

    bet.cashedOut = true;

    const winnings =
      Math.floor(
        bet.amount *
        state.multiplier
      );

    setTokens(
      getTokens() +
      winnings
    );

    const btn =
      dom.startBtns[panelId];

    if (btn) {
      setStartBtnLabel(
        btn,
        "WON",
        fmt(winnings)
      );

      btn.classList.remove(
        "cashout"
      );

      btn.disabled = true;
    }
  }

  /* =========================================================
     ROUND FINISH
     ========================================================= */

  function finishRound() {
    state.round = "crashed";

    cancelAnimationFrame(
      state.animationFrame
    );

    const finalValue =
      Number(
        state.multiplier.toFixed(2)
      );

    addHistory(finalValue);

    dom.multiplier?.classList.add(
      "crashed"
    );

    if (dom.status) {
      dom.status.textContent =
        `Flew away at ${finalValue}x`;
    }

    [1, 2].forEach(id => {
      const bet =
        state.bets[id];

      if (
        bet.active &&
        !bet.cashedOut
      ) {
        const btn =
          dom.startBtns[id];

        if (btn) {
          setStartBtnLabel(
            btn,
            "LOST",
            `${finalValue.toFixed(2)}x`
          );

          btn.classList.remove(
            "cashout"
          );

          btn.disabled = true;
        }
      }
    });

    clearTimeout(
      state.crashTimer
    );

    state.crashTimer =
      setTimeout(() => {
        if (state.cycleActive) {
          scheduleWaiting();
        }
      }, CONFIG.CRASH_HOLD_MS);
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  function historyClass(value) {
    if (value < 2) return "low";
    if (value < 10) return "medium";
    return "high";
  }

  function addHistory(value) {
    state.history.unshift(value);

    state.history =
      state.history.slice(
        0,
        CONFIG.HISTORY_LIMIT
      );

    renderHistory();
  }

  function renderHistory() {
    if (!dom.history) return;

    if (state.history.length === 0) {
      dom.history.innerHTML =
        `<div class="mg-history-item"
          style="width:100%;text-align:center;color:#888;">
          No rounds yet
        </div>`;

      return;
    }

    dom.history.innerHTML =
      state.history
        .map(value =>
          `<div class="mg-history-item ${historyClass(value)}">
            ${value.toFixed(2)}x
          </div>`
        )
        .join("");
  }

  /* =========================================================
     STATISTICS
     ========================================================= */

  function renderStatistics() {
    if (!dom.statistics) return;

    dom.statistics.innerHTML = `
      <div class="mg-statistics-title">
        In-game odds (arcade mechanic — for entertainment only,
        not real-money odds)
      </div>

      ${RTP_STATISTICS.map(item => `
        <div class="mg-statistics-row">
          <span>
            Target:
            <strong>${item.target.toFixed(2)}x</strong>
          </span>

          <small>
            Chance: ${item.probability}%
          </small>
        </div>
      `).join("")}
    `;
  }

  /* =========================================================
     DEMO ACTIVITY
     ========================================================= */

  function renderLiveBets() {
    if (!dom.liveBetsList) return;

    let total = 0;

    const rows =
      DEMO_NAMES
        .map(name => {
          const amount =
            Math.floor(
              Math.random() *
                900 +
                100
            );

          total += amount;

          return `
            <div class="mg-live-bet-item">
              <div class="user">
                <span class="dot"></span>
                ${name}
                <span class="mg-demo-tag">
                  DEMO
                </span>
              </div>

              <span class="mg-live-bet-amount">
                ${fmt(amount)} Tokens
              </span>
            </div>
          `;
        })
        .join("");

    dom.liveBetsList.innerHTML =
      rows;

    state.demoTotal =
      total;

    if (dom.demoBetsCount) {
      dom.demoBetsCount.textContent =
        DEMO_NAMES.length;
    }

    if (dom.demoTotal) {
      dom.demoTotal.textContent =
        fmt(total);
    }
  }

  /* =========================================================
     TABS
     ========================================================= */

  function setupTabs() {
    $$("[data-mg-tab]")
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            $$("[data-mg-tab]")
              .forEach(btn =>
                btn.classList.remove(
                  "active"
                )
              );

            button.classList.add(
              "active"
            );

            const tab =
              button.dataset.mgTab;

            $$("[data-mg-panel]")
              .forEach(panel => {
                if (
                  panel.dataset.mgPanel ===
                  tab
                ) {
                  panel.style.display =
                    "block";

                  if (
                    tab ===
                    "history"
                  ) {
                    renderHistory();
                  }

                  if (
                    tab ===
                      "statistics" ||
                    tab ===
                      "stats"
                  ) {
                    renderStatistics();
                  }
                } else {
                  panel.style.display =
                    "none";
                }
              });
          }
        );
      });
  }

  /* =========================================================
     DEMO PLAYER TIMER
     ========================================================= */

  function startLivePlayerTimer() {
    stopLivePlayerTimer();

    state.playerTimer =
      setInterval(() => {
        if (!state.open) return;

        state.livePlayers +=
          Math.floor(
            Math.random() * 7
          ) - 3;

        state.livePlayers =
          Math.max(
            80,
            Math.min(
              200,
              state.livePlayers
            )
          );

        if (dom.livePlayers) {
          dom.livePlayers.textContent =
            state.livePlayers;
        }
      }, CONFIG.LIVE_PLAYER_INTERVAL);
  }

  function stopLivePlayerTimer() {
    if (state.playerTimer) {
      clearInterval(
        state.playerTimer
      );

      state.playerTimer = null;
    }
  }

  /* =========================================================
     INIT
     ========================================================= */

  function init() {
    cacheDom();

    setupBetControls();
    setupConversion();
    setupTabs();

    byId("mgClose")
      ?.addEventListener(
        "click",
        closeGame
      );

    $$("[data-open-mini-game]")
      .forEach(el =>
        el.addEventListener(
          "click",
          openGame
        )
      );

    byId("miniGameCard")
      ?.addEventListener(
        "click",
        openGame
      );

    dom.startBtns[1]
      ?.addEventListener(
        "click",
        () =>
          startRoundForPanel(1)
      );

    dom.startBtns[2]
      ?.addEventListener(
        "click",
        () =>
          startRoundForPanel(2)
      );

    /*
     * Force correct values in existing HTML.
     * This protects against old min=100/max=10000 markup.
     */
    [1, 2].forEach(id => {
      const input =
        dom.betInputs[id];

      if (!input) return;

      input.min =
        String(CONFIG.MIN_BET);

      input.max =
        String(CONFIG.MAX_BET);

      input.value =
        clampBet(input.value);

      state.bets[id].amount =
        clampBet(input.value);
    });

    updateWalletUI();
    updateConvertPreview();

    window.addEventListener(
      "beforeunload",
      () => {
        stopCycle();
        stopLivePlayerTimer();
      },
      { once: true }
    );
  }

  if (
    document.readyState ===
    "loading"
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