/* =========================================================
   EARNRUSH MINI GAME - ARCADE TOKEN ENGINE (PERFORMANCE PASS)
   -----------------------------------------------------------
   - Coins -> Arcade Tokens is ONE-WAY ONLY.
   - Arcade Tokens are a closed-loop game currency: they cannot
     be converted back to Coins and never touch the withdrawal
     system. They exist purely for entertainment inside the
     mini-game.
   - "Active players" / "live bets" are simulated demo activity
     for atmosphere only and are labeled as such in the UI.
   ========================================================= */

(() => {
  "use strict";

  // Guard against the script being included more than once (which
  // previously caused duplicate listeners/timers and could corrupt
  // the saved token balance).
  if (window.__earnRushMiniGameLoaded) return;
  window.__earnRushMiniGameLoaded = true;

  const CONFIG = {
    MIN_BET: 100,
    MAX_BET: 10000,
    // 1,000 Coins = 100 Arcade Tokens  ->  10 Coins per Token
    COINS_PER_TOKEN: 10,
    MIN_CONVERT_COINS: 1000,
    START_MULTIPLIER: 1.00,
    DISPLAY_MAX_MULTIPLIER: 100,
    ROUND_WAIT: 3000,
    HISTORY_LIMIT: 12,
    LIVE_PLAYER_INTERVAL: 4000,
  };

  const STORAGE_KEY = "earnrush_minigame_tokens_v2";

  const RTP_STATISTICS = [
    { target: 1.20, probability: 80.8 },
    { target: 1.50, probability: 64.7 },
    { target: 2.00, probability: 48.5 },
    { target: 3.00, probability: 32.3 },
    { target: 5.00, probability: 19.4 },
    { target: 10.00, probability: 9.7 },
    { target: 20.00, probability: 4.85 },
    { target: 50.00, probability: 1.94 },
    { target: 100.00, probability: 0.97 }
  ];

  const DEMO_NAMES = ["Ali_Khan", "Zeeshan99", "FastRunner", "Ahmed_Dev", "User_771", "PixelPilot"];

  /* ---------------------------------------------------------
     STATE
  --------------------------------------------------------- */

  const state = {
    open: false,
    round: "waiting",
    roundNumber: 0,
    multiplier: 1.00,
    crashPoint: 1.00,
    gameTokens: loadSavedTokens(),

    bets: {
      1: { amount: 100, active: false, cashedOut: false },
      2: { amount: 100, active: false, cashedOut: false }
    },

    history: [],
    livePlayers: 136,
    animationFrame: null,
    roundTimer: null,
    playerTimer: null,

    // cached stage geometry for the current flight, measured once
    // per round instead of every animation frame
    stageRect: null,

    // last-painted values so we skip redundant DOM writes
    lastMultiplierText: "",
    lastPlaneX: null,
    lastPlaneY: null,
  };

  /* ---------------------------------------------------------
     PERSISTENCE (Arcade Tokens only — never touches Coins)
  --------------------------------------------------------- */

  function loadSavedTokens() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // A saved value of "0" is a perfectly valid, intentional
      // balance and must NOT fall back to the default. Only an
      // absent key (first-ever visit) uses the starter amount.
      if (saved !== null && saved !== "" && !isNaN(saved)) {
        return Math.max(0, Math.floor(Number(saved)));
      }
    } catch (e) {
      // localStorage unavailable (private mode, etc.) — fall through
    }
    return 300; // starter balance for brand-new players only
  }

  function saveTokensToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, String(state.gameTokens));
    } catch (e) {
      // storage unavailable — balance will just live in-memory for this session
    }
  }

  /* ---------------------------------------------------------
     DOM CACHE
  --------------------------------------------------------- */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = id => document.getElementById(id);

  // Populated once in init() so hot paths (the animation loop) never
  // touch the DOM to look elements up.
  const dom = {};

  function cacheDom() {
    dom.overlay = byId("miniGameOverlay");
    dom.roundTag = byId("mgRoundNumber");
    dom.multiplier = byId("mgMultiplier");
    dom.status = byId("mgStatus");
    dom.plane = byId("mgPlane");
    dom.stage = dom.plane ? dom.plane.closest(".mg-screen") : null;
    dom.history = byId("mgHistory");
    dom.tokenBalance = byId("mgTokenBalance");
    dom.coinBalance = byId("mgCoinBalance") || byId("miniGameCoins");
    dom.livePlayers = byId("mgLivePlayers");
    dom.liveBetsList = byId("mgLiveBetsList");
    dom.statistics = byId("mgStatistics");
    dom.historyList = byId("mgHistoryList");

    dom.betInputs = { 1: byId("mgBetInput1"), 2: byId("mgBetInput2") };
    dom.startBtns = { 1: byId("mgStart1"), 2: byId("mgStart2") };

    dom.convertInput = byId("mgCoinConvertInput");
    dom.convertBtn = byId("mgConvertBtn");
    dom.convertPreview = byId("mgConvertPreview");
    dom.convertMsg = byId("mgConvertMsg");
  }

  /* ---------------------------------------------------------
     BALANCE HELPERS
  --------------------------------------------------------- */

  function getTokens() {
    return Math.max(0, Math.floor(Number(state.gameTokens) || 0));
  }

  function setTokens(val) {
    state.gameTokens = Math.max(0, Math.floor(Number(val) || 0));
    saveTokensToStorage();
    updateWalletUI();
  }

  // Reads the REAL, existing Coins balance. This is the single
  // source of truth for Coins — the mini-game never keeps its own
  // parallel Coins variable.
  function getEarnRushCoins() {
    try {
      if (window.EarnRushGame && typeof window.EarnRushGame.getCoins === "function") {
        return Number(window.EarnRushGame.getCoins()) || 0;
      }
      if (window.gameState && Number.isFinite(Number(window.gameState.coins))) {
        return Number(window.gameState.coins);
      }
      const stored = localStorage.getItem("earnrush_coins");
      if (stored !== null) return Number(stored) || 0;
    } catch (e) {}
    return 0;
  }

  // Deducts Coins through the existing game API when available so
  // there is one reliable source of truth. This is ONLY ever called
  // with a positive amount from the converter (Coins -> Tokens is
  // one-way, so Coins are only ever spent here, never added back).
  function spendEarnRushCoins(amount) {
    try {
      if (window.EarnRushGame && typeof window.EarnRushGame.addCoins === "function") {
        window.EarnRushGame.addCoins(-amount);
        return true;
      }
      const current = getEarnRushCoins();
      localStorage.setItem("earnrush_coins", String(Math.max(0, current - amount)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function fmt(n) {
    return Math.floor(n).toLocaleString();
  }

  function updateWalletUI() {
    if (dom.tokenBalance) dom.tokenBalance.textContent = fmt(getTokens());
    if (dom.coinBalance) dom.coinBalance.textContent = fmt(getEarnRushCoins());
  }

  /* ---------------------------------------------------------
     CONVERTER — Coins -> Arcade Tokens (ONE WAY ONLY)
     There is intentionally no Tokens -> Coins path anywhere in
     this file. Arcade Tokens cannot be withdrawn or converted
     back once earned/converted.
  --------------------------------------------------------- */

  function updateConvertPreview() {
    if (!dom.convertInput || !dom.convertPreview) return;
    const amount = Math.floor(Number(dom.convertInput.value) || 0);
    if (amount <= 0) {
      dom.convertPreview.textContent = "= 0 Arcade Tokens";
      return;
    }
    const tokens = Math.floor(amount / CONFIG.COINS_PER_TOKEN);
    dom.convertPreview.textContent = `= ${fmt(tokens)} Arcade Tokens`;
  }

  function showConvertMessage(text, isError) {
    if (!dom.convertMsg) return;
    dom.convertMsg.textContent = text;
    dom.convertMsg.classList.toggle("is-error", !!isError);
    dom.convertMsg.classList.toggle("is-success", !isError);
  }

  function handleConvert() {
    if (!dom.convertInput) return;
    const raw = dom.convertInput.value;
    const amount = Math.floor(Number(raw));

    if (!raw || !Number.isFinite(amount) || amount <= 0) {
      showConvertMessage("Enter a valid Coins amount.", true);
      return;
    }
    if (amount < CONFIG.MIN_CONVERT_COINS) {
      showConvertMessage(`Minimum conversion is ${fmt(CONFIG.MIN_CONVERT_COINS)} Coins.`, true);
      return;
    }

    const available = getEarnRushCoins();
    if (amount > available) {
      showConvertMessage("Not enough Coins for this conversion.", true);
      return;
    }

    const tokensEarned = Math.floor(amount / CONFIG.COINS_PER_TOKEN);
    if (!spendEarnRushCoins(amount)) {
      showConvertMessage("Conversion failed. Please try again.", true);
      return;
    }

    setTokens(getTokens() + tokensEarned);
    updateWalletUI();
    updateConvertPreview();
    dom.convertInput.value = "";
    showConvertMessage(`Converted ${fmt(amount)} Coins → ${fmt(tokensEarned)} Arcade Tokens.`, false);
  }

  function setupConversion() {
    if (dom.convertInput) {
      dom.convertInput.addEventListener("input", updateConvertPreview);
    }
    if (dom.convertBtn) {
      dom.convertBtn.addEventListener("click", handleConvert);
    }
  }

  /* ---------------------------------------------------------
     OPEN / CLOSE
  --------------------------------------------------------- */

  function openGame() {
    state.open = true;
    dom.overlay?.classList.add("active");
    document.body.classList.add("mg-open");
    updateWalletUI();
    updateConvertPreview();
    renderLiveBets();
    renderHistory();
    renderStatistics();
    startLivePlayerTimer();
  }

  function closeGame() {
    state.open = false;
    dom.overlay?.classList.remove("active");
    document.body.classList.remove("mg-open");
    stopLivePlayerTimer();
  }

  /* ---------------------------------------------------------
     BET CONTROLS
  --------------------------------------------------------- */

  function setupBetControls() {
    [1, 2].forEach(panelId => {
      const input = dom.betInputs[panelId];
      if (!input) return;

      input.addEventListener("input", () => {
        let val = parseInt(input.value, 10) || CONFIG.MIN_BET;
        val = Math.max(CONFIG.MIN_BET, Math.min(CONFIG.MAX_BET, val));
        state.bets[panelId].amount = val;
        updatePanelUI(panelId);
      });

      const container = $(`[data-panel-id="${panelId}"]`);
      if (!container) return;

      // Event delegation: one listener per panel instead of one per
      // button, and it can't be attached twice by accident.
      container.addEventListener("click", (e) => {
        const stepBtn = e.target.closest(".mg-step-btn");
        if (stepBtn) {
          let current = state.bets[panelId].amount;
          current += stepBtn.dataset.action === "plus" ? 100 : -100;
          current = Math.max(CONFIG.MIN_BET, Math.min(CONFIG.MAX_BET, current));
          state.bets[panelId].amount = current;
          input.value = current;
          updatePanelUI(panelId);
          return;
        }

        const tokenBtn = e.target.closest("[data-mg-token]");
        if (tokenBtn) {
          const amt = Number(tokenBtn.dataset.mgToken);
          state.bets[panelId].amount = Math.max(CONFIG.MIN_BET, Math.min(CONFIG.MAX_BET, amt));
          input.value = state.bets[panelId].amount;
          updatePanelUI(panelId);
        }
      });
    });
  }

  function updatePanelUI(panelId) {
    const btn = dom.startBtns[panelId];
    const amt = state.bets[panelId].amount;
    if (btn && state.round === "waiting") {
      btn.textContent = `BET (${amt})`;
    }
  }

  function startRoundForPanel(panelId) {
    const betAmt = state.bets[panelId].amount;

    if (state.round === "waiting") {
      if (getTokens() < betAmt) {
        showTokenWarning();
        return;
      }
      setTokens(getTokens() - betAmt);
      state.bets[panelId].active = true;
      state.bets[panelId].cashedOut = false;

      if (state.round !== "running") {
        beginFlight();
      } else {
        updatePanelUI(panelId);
      }
    } else if (state.round === "running" && state.bets[panelId].active && !state.bets[panelId].cashedOut) {
      cashOutPanel(panelId);
    }
  }

  function showTokenWarning() {
    if (dom.status) dom.status.textContent = "Not enough Arcade Tokens — convert more Coins to play.";
  }

  /* ---------------------------------------------------------
     FLIGHT / ANIMATION LOOP (performance-critical path)
  --------------------------------------------------------- */

  function beginFlight() {
    state.round = "running";
    state.roundNumber++;
    state.multiplier = CONFIG.START_MULTIPLIER;
    state.crashPoint = parseFloat((0.97 / (1 - Math.random())).toFixed(2));
    if (Math.random() < 0.03) state.crashPoint = 1.00;

    if (dom.roundTag) dom.roundTag.textContent = `ROUND ${state.roundNumber}`;
    if (dom.status) dom.status.textContent = "Plane taking off...";
    dom.multiplier?.classList.remove("crashed");

    // Measure stage geometry once per round — never inside the loop.
    state.stageRect = dom.stage ? dom.stage.getBoundingClientRect() : null;
    state.lastMultiplierText = "";
    state.lastPlaneX = null;
    state.lastPlaneY = null;

    [1, 2].forEach(id => {
      if (state.bets[id].active) {
        const btn = dom.startBtns[id];
        if (btn) {
          btn.textContent = "CASH OUT";
          btn.classList.add("cashout");
        }
      }
    });

    runAnimation();
  }

  function runAnimation() {
    cancelAnimationFrame(state.animationFrame);
    const startTime = performance.now();

    function frame(now) {
      if (state.round !== "running") return;
      const elapsed = (now - startTime) / 1000;
      state.multiplier = 1.00 + (Math.pow(elapsed, 1.3) * 0.15);

      const crashedThisFrame = state.multiplier >= state.crashPoint;
      if (crashedThisFrame) state.multiplier = state.crashPoint;

      // Only touch the DOM while the overlay is actually visible.
      if (state.open) updateScreenUI();

      if (crashedThisFrame) {
        finishRound();
        return;
      }

      state.animationFrame = requestAnimationFrame(frame);
    }
    state.animationFrame = requestAnimationFrame(frame);
  }

  function updateScreenUI() {
    const val = Math.min(CONFIG.DISPLAY_MAX_MULTIPLIER, state.multiplier);
    const text = `${val.toFixed(2)}x`;

    // Skip the write entirely if nothing actually changed on screen.
    if (dom.multiplier && text !== state.lastMultiplierText) {
      dom.multiplier.textContent = text;
      state.lastMultiplierText = text;
    }

    if (dom.plane) {
      const pos = Math.min(75, (state.multiplier / 10) * 75);
      const rect = state.stageRect;
      // Compute a transform offset from cached geometry (no layout
      // read here) instead of writing to left/bottom every frame,
      // which forces a reflow on every animation tick.
      const w = rect ? rect.width : 300;
      const h = rect ? rect.height : 220;
      const x = Math.round((pos / 75) * (w * 0.6));
      const y = Math.round((pos / 75) * (h * 0.5));

      if (x !== state.lastPlaneX || y !== state.lastPlaneY) {
        dom.plane.style.transform = `translate3d(${x}px, ${-y}px, 0)`;
        state.lastPlaneX = x;
        state.lastPlaneY = y;
      }
    }
  }

  function cashOutPanel(panelId) {
    if (!state.bets[panelId].active || state.bets[panelId].cashedOut) return;
    state.bets[panelId].cashedOut = true;

    const winnings = Math.floor(state.bets[panelId].amount * state.multiplier);
    setTokens(getTokens() + winnings);

    const btn = dom.startBtns[panelId];
    if (btn) {
      btn.textContent = `Won ${winnings}!`;
      btn.classList.remove("cashout");
      btn.disabled = true;
    }
  }

  function finishRound() {
    state.round = "finished";
    cancelAnimationFrame(state.animationFrame);

    const finalVal = Number(state.multiplier.toFixed(2));
    addHistory(finalVal);

    dom.multiplier?.classList.add("crashed");
    if (dom.status) dom.status.textContent = `Flew away at ${finalVal}x`;

    [1, 2].forEach(id => {
      if (state.bets[id].active && !state.bets[id].cashedOut) {
        const btn = dom.startBtns[id];
        if (btn) {
          btn.textContent = "LOST";
          btn.classList.remove("cashout");
          btn.disabled = true;
        }
      }
    });

    clearTimeout(state.roundTimer);
    state.roundTimer = setTimeout(resetRound, CONFIG.ROUND_WAIT);
  }

  function resetRound() {
    state.round = "waiting";
    state.multiplier = 1.00;
    if (dom.status) dom.status.textContent = "Ready for next round";
    if (dom.multiplier) {
      dom.multiplier.textContent = "1.00x";
      dom.multiplier.classList.remove("crashed");
    }
    if (dom.plane) {
      dom.plane.style.transform = "translate3d(0, 0, 0)";
    }
    state.lastPlaneX = null;
    state.lastPlaneY = null;

    [1, 2].forEach(id => {
      state.bets[id].active = false;
      state.bets[id].cashedOut = false;
      const btn = dom.startBtns[id];
      if (btn) {
        btn.textContent = `BET (${state.bets[id].amount})`;
        btn.classList.remove("cashout");
        btn.disabled = false;
      }
    });
  }

  /* ---------------------------------------------------------
     HISTORY / STATISTICS (rendered on demand, not every frame)
  --------------------------------------------------------- */

  function addHistory(val) {
    state.history.unshift(val);
    state.history = state.history.slice(0, CONFIG.HISTORY_LIMIT);
    renderHistory();
  }

  function renderHistory() {
    if (!dom.history) return;
    if (state.history.length === 0) {
      dom.history.innerHTML = `<div class="mg-history-item" style="width:100%; text-align:center; color:#888;">No rounds yet</div>`;
      return;
    }
    dom.history.innerHTML = state.history.map(v => `<div class="mg-history-item">${v.toFixed(2)}x</div>`).join("");
  }

  function renderStatistics() {
    if (!dom.statistics) return;
    dom.statistics.innerHTML = `
      <div style="padding:10px; color:#fff;">
        <div class="mg-statistics-title">In-game odds (arcade mechanic — for entertainment only, not real-money odds)</div>
        ${RTP_STATISTICS.map(s => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
            <span>Target: <b>${s.target.toFixed(2)}x</b></span>
            <span>Chance: <b>${s.probability}%</b></span>
          </div>
        `).join("")}
      </div>
    `;
  }

  // Simulated activity feed, clearly labeled as demo data — no real
  // user data is read, generated, or displayed here.
  function renderLiveBets() {
    if (!dom.liveBetsList) return;
    dom.liveBetsList.innerHTML = DEMO_NAMES.map(name => `
      <div class="mg-live-bet-item" style="display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div class="user" style="color:#fff;"><span class="dot" style="display:inline-block; width:6px; height:6px; background:#00ff88; border-radius:50%; margin-right:6px;"></span>${name} <span class="mg-demo-tag">DEMO</span></div>
        <span style="color:#00ff88;">${Math.floor(Math.random() * 900 + 100)} Tokens</span>
      </div>
    `).join("");
  }

  /* ---------------------------------------------------------
     TABS
  --------------------------------------------------------- */

  function setupTabs() {
    $$("[data-mg-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-mg-tab]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.mgTab;

        $$("[data-mg-panel]").forEach(p => {
          if (p.dataset.mgPanel === tab) {
            p.style.display = "block";
            if (tab === "history") renderHistory();
            if (tab === "statistics" || tab === "stats") renderStatistics();
          } else {
            p.style.display = "none";
          }
        });
      });
    });
  }

  /* ---------------------------------------------------------
     SIMULATED LIVE PLAYER COUNT (clearly demo data, timer only
     runs while the game is actually open on screen)
  --------------------------------------------------------- */

  function startLivePlayerTimer() {
    stopLivePlayerTimer();
    state.playerTimer = setInterval(() => {
      if (!state.open) return;
      state.livePlayers += Math.floor(Math.random() * 7) - 3;
      state.livePlayers = Math.max(80, Math.min(200, state.livePlayers));
      if (dom.livePlayers) dom.livePlayers.textContent = state.livePlayers;
    }, CONFIG.LIVE_PLAYER_INTERVAL);
  }

  function stopLivePlayerTimer() {
    if (state.playerTimer) {
      clearInterval(state.playerTimer);
      state.playerTimer = null;
    }
  }

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */

  function init() {
    cacheDom();
    setupBetControls();
    setupConversion();
    setupTabs();

    byId("mgClose")?.addEventListener("click", closeGame);
    $$("[data-open-mini-game]").forEach(el => el.addEventListener("click", openGame));
    byId("miniGameCard")?.addEventListener("click", openGame);

    dom.startBtns[1]?.addEventListener("click", () => startRoundForPanel(1));
    dom.startBtns[2]?.addEventListener("click", () => startRoundForPanel(2));

    updateWalletUI();

    // Release the animation frame / timers if the user navigates away,
    // to avoid leaking a running rAF loop or interval.
    window.addEventListener("beforeunload", () => {
      cancelAnimationFrame(state.animationFrame);
      clearTimeout(state.roundTimer);
      stopLivePlayerTimer();
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();