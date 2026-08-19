/* =========================================================
   EARNRUSH MINI GAME
   Complete Frontend Game Foundation
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const CONFIG = {
    COINS_PER_TOKEN: 10,          // 1000 Coins = 100 Tokens
    MIN_CONVERT_COINS: 1000,

    START_MULTIPLIER: 1.00,
    DISPLAY_MAX_MULTIPLIER: 100,

    ROUND_WAIT: 2500,
    ROUND_DURATION: 10000,

    HISTORY_LIMIT: 12,

    SIMULATED_PLAYERS_MIN: 86,
    SIMULATED_PLAYERS_MAX: 148,

    DEFAULT_TOKEN_AMOUNT: 10
  };

  /* =======================================================
     READ-ONLY STATISTICS
     These values are informational only.
     They do NOT control game outcomes.
     ======================================================= */

  const RTP_STATISTICS = [
    {
      target: 1.20,
      probability: 80.8,
      payoutExample: 12.00,
      evPerUnit: -0.03
    },
    {
      target: 1.50,
      probability: 64.7,
      payoutExample: 15.00,
      evPerUnit: -0.03
    },
    {
      target: 2.00,
      probability: 48.5,
      payoutExample: 20.00,
      evPerUnit: -0.03
    },
    {
      target: 3.00,
      probability: 32.3,
      payoutExample: 30.00,
      evPerUnit: -0.03
    },
    {
      target: 5.00,
      probability: 19.4,
      payoutExample: 50.00,
      evPerUnit: -0.03
    },
    {
      target: 10.00,
      probability: 9.7,
      payoutExample: 100.00,
      evPerUnit: -0.03
    },
    {
      target: 20.00,
      probability: 4.85,
      payoutExample: 200.00,
      evPerUnit: -0.03
    },
    {
      target: 50.00,
      probability: 1.94,
      payoutExample: 500.00,
      evPerUnit: -0.03
    },
    {
      target: 100.00,
      probability: 0.97,
      payoutExample: 1000.00,
      evPerUnit: -0.03
    }
  ];

  /* =======================================================
     GAME STATE
     ======================================================= */

  const state = {
    initialized: false,

    open: false,

    round: "waiting",
    roundNumber: 0,

    multiplier: CONFIG.START_MULTIPLIER,

    roundStartedAt: null,
    roundEndedAt: null,

    gameTokens: 0,
    selectedAmount: CONFIG.DEFAULT_TOKEN_AMOUNT,

    history: [],

    livePlayers: 0,
    joinedPlayers: 0,

    currentTab: "current",

    sound: true,
    animation: true,

    planeProgress: 0,

    roundStartTime: null,

    timer: null,
    playerTimer: null,
    animationFrame: null
  };

  /* =======================================================
     DOM HELPERS
     ======================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const element = byId(id);

    if (element) {
      element.textContent = value;
    }
  }

  /* =======================================================
     STORAGE
     ======================================================= */

  const STORAGE_KEY =
    "earnrush_mini_game_state_v2";

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
      console.warn(
        "Mini-game state could not be saved."
      );
    }
  }

  function loadState() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const saved = JSON.parse(raw);

      if (
        Number.isFinite(
          Number(saved.gameTokens)
        )
      ) {
        state.gameTokens =
          Math.max(
            0,
            Math.floor(
              Number(saved.gameTokens)
            )
          );
      }

      if (Array.isArray(saved.history)) {
        state.history =
          saved.history
            .filter(
              value =>
                Number.isFinite(Number(value))
            )
            .map(Number)
            .slice(
              0,
              CONFIG.HISTORY_LIMIT
            );
      }

      if (
        typeof saved.sound === "boolean"
      ) {
        state.sound = saved.sound;
      }

      if (
        typeof saved.animation === "boolean"
      ) {
        state.animation = saved.animation;
      }
    } catch (error) {
      console.warn(
        "Mini-game state could not be loaded."
      );
    }
  }

  /* =======================================================
     EARNRUSH COIN BRIDGE
     ======================================================= */

  function getEarnRushCoins() {
    try {
      if (
        window.EarnRushGame &&
        typeof window.EarnRushGame.getCoins ===
          "function"
      ) {
        return (
          Number(
            window.EarnRushGame.getCoins()
          ) || 0
        );
      }

      if (
        window.gameState &&
        Number.isFinite(
          Number(window.gameState.coins)
        )
      ) {
        return Number(
          window.gameState.coins
        );
      }

      const stored =
        localStorage.getItem(
          "earnrush_coins"
        );

      if (stored !== null) {
        return Number(stored) || 0;
      }
    } catch (error) {
      console.warn(
        "Could not read EarnRush balance."
      );
    }

    return 0;
  }

  function addEarnRushCoins(amount) {
    amount = Number(amount);

    if (
      !Number.isFinite(amount) ||
      amount === 0
    ) {
      return false;
    }

    try {
      if (
        window.EarnRushGame &&
        typeof window.EarnRushGame.addCoins ===
          "function"
      ) {
        window.EarnRushGame.addCoins(amount);
        return true;
      }

      if (
        window.gameState &&
        Number.isFinite(
          Number(window.gameState.coins)
        )
      ) {
        window.gameState.coins =
          Math.max(
            0,
            Number(
              window.gameState.coins
            ) + amount
          );

        if (
          typeof window.saveGame ===
          "function"
        ) {
          window.saveGame();
        }

        return true;
      }

      /*
       * Fallback storage.
       * Existing EarnRush storage remains
       * untouched when a real bridge exists.
       */

      const current =
        getEarnRushCoins();

      localStorage.setItem(
        "earnrush_coins",
        String(
          Math.max(
            0,
            current + amount
          )
        )
      );

      return true;
    } catch (error) {
      console.warn(
        "Could not update EarnRush balance."
      );

      return false;
    }
  }

  /* =======================================================
     TOKEN WALLET
     ======================================================= */

  function getTokens() {
    return Math.max(
      0,
      Math.floor(
        Number(state.gameTokens) || 0
      )
    );
  }

  function setTokens(amount) {
    state.gameTokens =
      Math.max(
        0,
        Math.floor(
          Number(amount) || 0
        )
      );

    updateWalletUI();
    saveState();
  }

  function addTokens(amount) {
    amount =
      Math.floor(
        Number(amount) || 0
      );

    if (amount <= 0) return;

    setTokens(
      state.gameTokens + amount
    );
  }

  function removeTokens(amount) {
    amount =
      Math.floor(
        Number(amount) || 0
      );

    if (
      amount <= 0 ||
      amount > state.gameTokens
    ) {
      return false;
    }

    setTokens(
      state.gameTokens - amount
    );

    return true;
  }

  /* =======================================================
     WALLET UI
     ======================================================= */

  function updateWalletUI() {
    const tokenElements = [
      byId("mgTokenBalance"),
      byId("mgTokens"),
      byId("miniGameTokens")
    ].filter(Boolean);

    tokenElements.forEach(
      element => {
        element.textContent =
          getTokens().toLocaleString();
      }
    );

    const coinElements = [
      byId("mgCoinBalance"),
      byId("miniGameCoins")
    ].filter(Boolean);

    const coins =
      getEarnRushCoins();

    coinElements.forEach(
      element => {
        element.textContent =
          coins.toLocaleString();
      }
    );

    setText(
      "mgConversionRate",
      "1,000 Coins = 100 Tokens"
    );
  }

  /* =======================================================
     COINS → TOKENS
     ======================================================= */

  function coinsToTokens(coins) {
    coins =
      Math.floor(
        Number(coins) || 0
      );

    if (
      coins <
      CONFIG.MIN_CONVERT_COINS
    ) {
      notify(
        "Minimum conversion is 1,000 Coins."
      );

      return false;
    }

    if (coins % CONFIG.MIN_CONVERT_COINS !== 0) {
      notify(
        "Use a multiple of 1,000 Coins."
      );

      return false;
    }

    const available =
      getEarnRushCoins();

    if (available < coins) {
      notify(
        "Not enough EarnRush Coins."
      );

      return false;
    }

    const tokens =
      Math.floor(
        coins /
          CONFIG.COINS_PER_TOKEN
      );

    if (tokens <= 0) {
      return false;
    }

    if (
      !addEarnRushCoins(-coins)
    ) {
      notify(
        "Coin balance could not be updated."
      );

      return false;
    }

    addTokens(tokens);

    notify(
      `${coins.toLocaleString()} Coins → ${tokens.toLocaleString()} Tokens`
    );

    updateWalletUI();

    return true;
  }

  /* =======================================================
     TOKENS → COINS
     ======================================================= */

  function tokensToCoins(tokens) {
    tokens =
      Math.floor(
        Number(tokens) || 0
      );

    if (tokens <= 0) {
      notify(
        "Enter a valid Token amount."
      );

      return false;
    }

    if (tokens > getTokens()) {
      notify(
        "Not enough Game Tokens."
      );

      return false;
    }

    const coins =
      tokens *
      CONFIG.COINS_PER_TOKEN;

    if (
      !removeTokens(tokens)
    ) {
      return false;
    }

    if (
      !addEarnRushCoins(coins)
    ) {
      addTokens(tokens);

      notify(
        "Coin balance could not be updated."
      );

      return false;
    }

    notify(
      `${tokens.toLocaleString()} Tokens → ${coins.toLocaleString()} Coins`
    );

    updateWalletUI();

    return true;
  }

  /* =======================================================
     CONVERSION UI
     ======================================================= */

  function setupConversion() {
    const coinInput =
      byId("mgCoinConvert");

    const coinButton =
      byId("mgConvertCoins");

    if (coinButton) {
      coinButton.addEventListener(
        "click",
        () => {
          const amount =
            Number(
              coinInput?.value ||
              CONFIG.MIN_CONVERT_COINS
            );

          coinsToTokens(amount);
        }
      );
    }

    const tokenInput =
      byId("mgTokenConvert");

    const tokenButton =
      byId("mgConvertTokens");

    if (tokenButton) {
      tokenButton.addEventListener(
        "click",
        () => {
          const amount =
            Number(
              tokenInput?.value || 0
            );

          tokensToCoins(amount);
        }
      );
    }
  }

  /* =======================================================
     GAME OPEN / CLOSE
     ======================================================= */

  function openGame() {
    const overlay =
      byId("miniGameOverlay") ||
      $(".mg-overlay");

    if (!overlay) {
      console.warn(
        "Mini-game overlay not found."
      );

      return;
    }

    state.open = true;

    overlay.classList.add(
      "active"
    );

    document.body.classList.add(
      "mg-open"
    );

    updateWalletUI();
    updatePlayers();
    renderHistory();
    renderStatistics();
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

    overlay.classList.remove(
      "active"
    );

    document.body.classList.remove(
      "mg-open"
    );
  }

  function setupOpenButtons() {
    $$(
      "[data-open-mini-game]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        openGame
      );
    });

    const card =
      byId("miniGameCard") ||
      $(".mg-card");

    if (card) {
      card.addEventListener(
        "click",
        openGame
      );
    }

    const close =
      byId("mgClose") ||
      $(".mg-back");

    if (close) {
      close.addEventListener(
        "click",
        closeGame
      );
    }
  }

  /* =======================================================
     PLAYER SYSTEM
     ======================================================= */

  function randomInt(min, max) {
    return Math.floor(
      Math.random() *
        (max - min + 1)
    ) + min;
  }

  function updatePlayers() {
    if (!state.livePlayers) {
      state.livePlayers =
        randomInt(
          CONFIG.SIMULATED_PLAYERS_MIN,
          CONFIG.SIMULATED_PLAYERS_MAX
        );
    } else {
      state.livePlayers =
        Math.max(
          CONFIG.SIMULATED_PLAYERS_MIN,
          Math.min(
            CONFIG.SIMULATED_PLAYERS_MAX,
            state.livePlayers +
              randomInt(-3, 4)
          )
        );
    }

    state.joinedPlayers =
      Math.max(
        1,
        state.livePlayers -
          randomInt(3, 12)
      );

    setText(
      "mgLivePlayers",
      state.livePlayers.toLocaleString()
    );

    setText(
      "mgJoinedPlayers",
      state.joinedPlayers.toLocaleString()
    );
  }

  function startPlayerCounter() {
    clearInterval(
      state.playerTimer
    );

    updatePlayers();

    state.playerTimer =
      setInterval(
        () => {
          if (state.open) {
            updatePlayers();
          }
        },
        4000
      );
  }

  /* =======================================================
     ROUND HISTORY
     ======================================================= */

  function multiplierClass(value) {
    if (value < 2) {
      return "low";
    }

    if (value <= 10) {
      return "medium";
    }

    return "high";
  }

  function addHistory(value) {
    value = Number(value);

    if (
      !Number.isFinite(value)
    ) {
      return;
    }

    state.history.unshift(
      Number(
        value.toFixed(2)
      )
    );

    state.history =
      state.history.slice(
        0,
        CONFIG.HISTORY_LIMIT
      );

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
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "mg-history-item";

      empty.textContent =
        "No rounds yet";

      container.appendChild(
        empty
      );

      return;
    }

    state.history.forEach(
      value => {
        const item =
          document.createElement(
            "div"
          );

        item.className =
          `mg-history-item ${multiplierClass(value)}`;

        item.textContent =
          `${value.toFixed(2)}x`;

        container.appendChild(
          item
        );
      }
    );
  }

  /* =======================================================
     READ-ONLY RTP STATISTICS UI
     ======================================================= */

  function renderStatistics() {
    const container =
      byId("mgStatistics") ||
      $(".mg-statistics");

    if (!container) return;

    container.innerHTML = "";

    const title =
      document.createElement(
        "div"
      );

    title.className =
      "mg-statistics-title";

    title.textContent =
      "Multiplier Statistics";

    container.appendChild(title);

    RTP_STATISTICS.forEach(
      item => {
        const row =
          document.createElement(
            "div"
          );

        row.className =
          "mg-statistics-row";

        row.innerHTML = `
          <span>${item.target.toFixed(2)}x</span>
          <strong>${item.probability}%</strong>
          <small>Example: ${item.payoutExample.toFixed(2)}</small>
        `;

        container.appendChild(
          row
        );
      }
    );
  }

  /* =======================================================
     MULTIPLIER
     ======================================================= */

  function updateMultiplier() {
    const value =
      Math.min(
        CONFIG.DISPLAY_MAX_MULTIPLIER,
        state.multiplier
      );

    setText(
      "mgMultiplier",
      `${value.toFixed(2)}x`
    );

    setText(
      "mgCurrentMultiplier",
      `${value.toFixed(2)}x`
    );
  }

  function setRoundStatus(text) {
    setText(
      "mgStatus",
      text
    );
  }

  /* =======================================================
     PLANE
     ======================================================= */

  function updatePlane() {
    const plane =
      byId("mgPlane") ||
      $(".mg-plane");

    if (!plane) return;

    const progress =
      Math.max(
        0,
        Math.min(
          1,
          state.planeProgress
        )
      );

    const left =
      10 + progress * 73;

    const bottom =
      17 + progress * 46;

    plane.style.left =
      `${left}%`;

    plane.style.bottom =
      `${bottom}%`;

    plane.style.transform =
      `rotate(${
        -5 -
        progress * 8
      }deg)`;
  }

  /* =======================================================
     ROUND ENGINE
     ======================================================= */

  function startRound() {
    if (
      state.round ===
      "running"
    ) {
      return;
    }

    clearTimeout(
      state.timer
    );

    state.round =
      "running";

    state.roundNumber++;

    state.roundStartedAt =
      Date.now();

    state.roundEndedAt =
      null;

    state.roundStartTime =
      performance.now();

    state.multiplier =
      CONFIG.START_MULTIPLIER;

    state.planeProgress =
      0;

    setText(
      "mgRoundNumber",
      `ROUND ${state.roundNumber}`
    );

    setRoundStatus(
      "Plane is taking off..."
    );

    const multiplier =
      byId("mgMultiplier") ||
      $(".mg-multiplier");

    if (multiplier) {
      multiplier.classList.remove(
        "crashed"
      );

      multiplier.classList.add(
        "running"
      );
    }

    updatePlayers();

    playSound("start");

    runFlightAnimation();
  }

  function runFlightAnimation() {
    cancelAnimationFrame(
      state.animationFrame
    );

    const started =
      performance.now();

    function frame(now) {
      if (
        state.round !==
        "running"
      ) {
        return;
      }

      const elapsed =
        now - started;

      const progress =
        Math.min(
          1,
          elapsed /
            CONFIG.ROUND_DURATION
        );

      state.planeProgress =
        progress;

      /*
       * Visual progression only.
       * It is intentionally not connected
       * to token wagering or loss logic.
       */

      state.multiplier =
        1 +
        progress * 4;

      updateMultiplier();
      updatePlane();

      setText(
        "mgFlightProgress",
        `${Math.floor(
          progress * 100
        )}%`
      );

      if (
        progress >= 1
      ) {
      finishRound();
        return;
      }

      state.animationFrame =
        requestAnimationFrame(
          frame
        );
    }

    if (state.animation) {
      state.animationFrame =
        requestAnimationFrame(
          frame
        );
    } else {
      state.multiplier =
        5;

      updateMultiplier();

      finishRound();
    }
  }

  function finishRound() {
    if (
      state.round !==
      "running"
    ) {
      return;
    }

    state.round =
      "finished";

    state.roundEndedAt =
      Date.now();

    cancelAnimationFrame(
      state.animationFrame
    );

    const result =
      Number(
        state.multiplier.toFixed(2)
      );

    addHistory(result);

    setText(
      "mgLastResult",
      `${result.toFixed(2)}x`
    );

    setRoundStatus(
      `Round ended at ${result.toFixed(2)}x`
    );

    const multiplier =
      byId("mgMultiplier") ||
      $(".mg-multiplier");

    if (multiplier) {
      multiplier.classList.remove(
        "running"
      );

      multiplier.classList.add(
        "crashed"
      );
    }

    playSound("finish");

    state.timer =
      setTimeout(
        () => {
          if (state.open) {
            startRound();
          }
        },
        CONFIG.ROUND_WAIT
      );
  }

  function stopRound() {
    clearTimeout(
      state.timer
    );

    cancelAnimationFrame(
      state.animationFrame
    );

    state.round =
      "waiting";

    state.roundStartedAt =
      null;

    state.roundEndedAt =
      null;

    state.multiplier =
      CONFIG.START_MULTIPLIER;

    state.planeProgress =
      0;

    setRoundStatus(
      "Ready"
    );

    updateMultiplier();
    updatePlane();
  }

  function resetRoundUI() {
    stopRound();

    setText(
      "mgRoundNumber",
      "READY"
    );

    setText(
      "mgFlightProgress",
      "0%"
    );

    setRoundStatus(
      "Press Start to begin"
    );
  }

  /* =======================================================
     START BUTTON
     ======================================================= */

  function setupStartButton() {
    const button =
      byId("mgStart") ||
      $(".mg-start");

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        if (
          state.round ===
          "running"
        ) {
          return;
        }

        startRound();
      }
    );
  }

  /* =======================================================
     TOKEN AMOUNT CONTROLS
     ======================================================= */

  function updateSelectedAmount() {
    setText(
      "mgSelectedAmount",
      state.selectedAmount.toLocaleString()
    );

    $$(
      "[data-mg-token]"
    ).forEach(
      button => {
        const amount =
          Number(
            button.dataset.mgToken
          );

        button.classList.toggle(
          "active",
          amount ===
            state.selectedAmount
        );
      }
    );
  }

  function setupTokenControls() {
    $$(
      "[data-mg-token]"
    ).forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const amount =
              Number(
                button.dataset.mgToken
              );

            if (
              Number.isFinite(
                amount
              )
            ) {
              state.selectedAmount =
                amount;

              updateSelectedAmount();
            }
          }
        );
      }
    );

    const amountInput =
      byId("mgTokenAmount");

    if (amountInput) {
      amountInput.addEventListener(
        "input",
        () => {
          const value =
            Number(
              amountInput.value
            );

          if (
            Number.isFinite(
              value
            ) &&
            value > 0
          ) {
            state.selectedAmount =
              Math.floor(value);

            updateSelectedAmount();
          }
        }
      );
    }

    updateSelectedAmount();
  }

  /* =======================================================
     TABS
     ======================================================= */

  function setupTabs() {
    $$(
      "[data-mg-tab]"
    ).forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const tab =
              button.dataset.mgTab;

            state.currentTab =
              tab;

            $$(
              "[data-mg-tab]"
            ).forEach(
              item => {
                item.classList.toggle(
                  "active",
                  item === button
                );
              }
            );

            $$(
              "[data-mg-panel]"
            ).forEach(
              panel => {
                panel.style.display =
                  panel.dataset
                    .mgPanel ===
                  tab
                    ? ""
                    : "none";
              }
            );

            if (
              tab ===
              "history"
            ) {
              renderHistory();
            }

            if (
              tab ===
              "statistics"
            ) {
              renderStatistics();
            }
          }
        );
      }
    );
  }

  /* =======================================================
     SETTINGS
     ======================================================= */
function setupSettings() {
    const soundButton =
      byId(
        "mgSoundToggle"
      );

    if (soundButton) {
      soundButton.addEventListener(
        "click",
        () => {
          state.sound =
            !state.sound;

          soundButton.textContent =
            state.sound
              ? "🔊 Sound On"
              : "🔇 Sound Off";

          saveState();
        }
      );
    }

    const animationButton =
      byId(
        "mgAnimationToggle"
      );

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
      byId(
        "mgRules"
      );

    if (rulesButton) {
      rulesButton.addEventListener(
        "click",
        () => {
          openPopup(
            "Game Rules",
            "The game uses Game Tokens separately from EarnRush Coins. The conversion rate is 1,000 Coins = 100 Tokens. Statistics shown in the information panel are informational."
          );
        }
      );
    }

    const fairnessButton =
      byId(
        "mgFairness"
      );

    if (fairnessButton) {
      fairnessButton.addEventListener(
        "click",
        () => {
          openPopup(
            "Fairness & Statistics",
            "Multiplier statistics are displayed for information and do not determine token balances or hidden outcomes."
          );
        }
      );
    }
  }

  /* =======================================================
     POPUP
     ======================================================= */

  function openPopup(
    title,
    text
  ) {
    const popup =
      byId(
        "mgPopup"
      ) ||
      $(".mg-popup");

    if (!popup) return;

    const heading =
      popup.querySelector(
        "h3"
      );

    const paragraph =
      popup.querySelector(
        "p"
      );

    if (heading) {
      heading.textContent =
        title;
    }

    if (paragraph) {
      paragraph.textContent =
        text;
    }

    popup.classList.add(
      "active"
    );
  }

  function closePopup() {
    const popup =
      byId(
        "mgPopup"
      ) ||
      $(".mg-popup");

    if (popup) {
      popup.classList.remove(
        "active"
      );
    }
  }

  function setupPopup() {
    const close =
      byId(
        "mgPopupClose"
      ) ||
      $(".mg-popup-close");

    if (close) {
      close.addEventListener(
        "click",
        closePopup
      );
    }
  }

  /* =======================================================
     SOUND EVENTS
     ======================================================= */

  function playSound(type) {
    if (!state.sound) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent(
        "earnrush:mini-game-sound",
        {
          detail: {
            type
          }
        }
      )
    );
  }

  /* =======================================================
     TOAST
     ======================================================= */

  function notify(message) {
    let toast =
      byId("mgToast");

    if (!toast) {
      toast =
        document.createElement(
          "div"
        );

      toast.id =
        "mgToast";

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
        max-width:90%;
        text-align:center;
      `;

      document.body.appendChild(
        toast
      );
    }

    toast.textContent =
      message;

    toast.style.opacity =
      "1";

    clearTimeout(
      toast._timer
    );

    toast._timer =
      setTimeout(
        () => {
          toast.style.opacity =
            "0";
        },
        2200
      );
  }

  /* =======================================================
     KEYBOARD
     ======================================================= */

  function setupKeyboard() {
    document.addEventListener(
      "keydown",
      event => {
        if (!state.open) {
          return;
        }

        if (
          event.key ===
          "Escape"
        ) {
          closeGame();
        }

        if (
          event.key ===
            "Enter" &&
          state.round !==
            "running"
        ) {
          startRound();
        }
      }
    );
  }

  /* =======================================================
     RESPONSIVE VISIBILITY
     ======================================================= */

  function setupResponsive() {
    window.addEventListener(
      "resize",
      () => {
        updatePlane();
      },
      { passive: true }
    );
  }

  /* =======================================================
     BACKEND/API READY HOOKS
     ======================================================= */

  const backend = {
    async getGameState() {
      /*
       * Future:
       * GET /api/mini-game/state
       */
      return {
        roundNumber:
          state.roundNumber,

        multiplier:
          state.multiplier,

        livePlayers:
          state.livePlayers,

        joinedPlayers:
          state.joinedPlayers,

        history:
          [...state.history]
      };
    },

    async getPlayers() {
      /*
       * Future:
       * GET /api/mini-game/players
       */

      return {
        live:
          state.livePlayers,

        joined:
          state.joinedPlayers
      };
    },

    async getHistory() {
      /*
       * Future:
       * GET /api/mini-game/history
       */

      return [
        ...state.history
      ];
    },

    async getStatistics() {
      /*
       * Read-only statistics.
       */

      return [
        ...RTP_STATISTICS
      ];
    }
  };

  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.EarnRushMiniGame = {

    open:
      openGame,

    close:
      closeGame,

    startRound:
      startRound,

    stopRound:
      stopRound,

    getTokens:
      getTokens,

    setTokens:
      setTokens,

    addTokens:
      addTokens,

    removeTokens:
      removeTokens,

    coinsToTokens:
      coinsToTokens,

    tokensToCoins:
      tokensToCoins,

    getCoins:
      getEarnRushCoins,

    getState:
      () => ({
        ...state,

        history:
          [...state.history]
      }),

    getStatistics:
      () => [
        ...RTP_STATISTICS
      ],

    backend
  };

  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function init() {
    if (
      state.initialized
    ) {
      return;
    }

    state.initialized =
      true;

    loadState();

    setupOpenButtons();
    setupConversion();
    setupStartButton();
    setupTokenControls();
    setupTabs();
    setupSettings();
    setupPopup();
    setupKeyboard();
    setupResponsive();

    startPlayerCounter();

    updateWalletUI();
    updateSelectedAmount();
    renderHistory();
    renderStatistics();
    updateMultiplier();
    updatePlane();

    console.log(
      "EarnRush Mini Game initialized successfully."
    );
  }

  /* =======================================================
     START
     ======================================================= */

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