/* =========================================================
   EARNRUSH MINI GAME - PERMANENT BALANCE & DUAL BETS ENGINE
   ========================================================= */

(() => {
  "use strict";

  const CONFIG = {
    MIN_BET: 100,
    MAX_BET: 10000,
    COINS_PER_TOKEN: 10,
    MIN_CONVERT_COINS: 1000,
    START_MULTIPLIER: 1.00,
    DISPLAY_MAX_MULTIPLIER: 100,
    ROUND_WAIT: 3000,
    HISTORY_LIMIT: 12,
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
    timer: null,
    playerTimer: null
  };

  function loadSavedTokens() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null && !isNaN(saved)) {
        return Math.max(0, Math.floor(Number(saved)));
      }
    } catch (e) {}
    return 300; // Default agar pehle kuch na ho
  }

  function saveTokensToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, String(state.gameTokens));
    } catch (e) {}
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = id => document.getElementById(id);

  function getTokens() {
    return Math.max(0, Math.floor(Number(state.gameTokens) || 0));
  }

  function setTokens(val) {
    state.gameTokens = Math.max(0, Math.floor(Number(val) || 0));
    saveTokensToStorage();
    updateWalletUI();
  }

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
    return 2500;
  }

  function addEarnRushCoins(amount) {
    try {
      if (window.EarnRushGame && typeof window.EarnRushGame.addCoins === "function") {
        window.EarnRushGame.addCoins(amount);
        return true;
      }
      const current = getEarnRushCoins();
      localStorage.setItem("earnrush_coins", String(Math.max(0, current + amount)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function updateWalletUI() {
    const el = byId("mgTokenBalance");
    if (el) el.textContent = getTokens().toLocaleString();

    const coinEl = byId("mgCoinBalance") || byId("miniGameCoins");
    if (coinEl) coinEl.textContent = getEarnRushCoins().toLocaleString();
  }

  // Converter Logic
  function setupConversion() {
    const coinButton = byId("mgConvertCoins");
    if (coinButton) {
      coinButton.addEventListener("click", () => {
        const amount = Number(byId("mgCoinConvert")?.value || CONFIG.MIN_CONVERT_COINS);
        if (amount < CONFIG.MIN_CONVERT_COINS) {
          alert("Minimum conversion is 1,000 Coins.");
          return;
        }
        const available = getEarnRushCoins();
        if (available < amount) {
          alert("Not enough EarnRush Coins.");
          return;
        }
        if (addEarnRushCoins(-amount)) {
          const earnedTokens = Math.floor((amount / CONFIG.MIN_CONVERT_COINS) * 100);
          setTokens(getTokens() + earnedTokens);
          alert(`Successfully converted ${amount} Coins to ${earnedTokens} Tokens!`);
        }
      });
    }

    const tokenButton = byId("mgConvertTokens");
    if (tokenButton) {
      tokenButton.addEventListener("click", () => {
        const tokens = Number(byId("mgTokenConvert")?.value || 0);
        if (tokens <= 0 || tokens > getTokens()) {
          alert("Enter a valid Token amount.");
          return;
        }
        const coins = (tokens / 100) * CONFIG.MIN_CONVERT_COINS;
        setTokens(getTokens() - tokens);
        addEarnRushCoins(coins);
        alert(`Successfully converted ${tokens} Tokens to ${coins} Coins!`);
      });
    }
  }

  function openGame() {
    state.open = true;
    byId("miniGameOverlay")?.classList.add("active");
    document.body.classList.add("mg-open");
    updateWalletUI();
    renderLiveBets();
    renderHistory();
    renderStatistics();
  }

  function closeGame() {
    state.open = false;
    byId("miniGameOverlay")?.classList.remove("active");
    document.body.classList.remove("mg-open");
  }

  function setupBetControls() {
    [1, 2].forEach(panelId => {
      const input = byId(`mgGetInput${panelId}`) || byId(`mgBetInput${panelId}`);
      if (!input) return;

      input.addEventListener("input", () => {
        let val = parseInt(input.value) || CONFIG.MIN_BET;
        val = Math.max(CONFIG.MIN_BET, Math.min(CONFIG.MAX_BET, val));
        state.bets[panelId].amount = val;
        updatePanelUI(panelId);
      });

      const container = $(`[data-panel-id="${panelId}"]`);
      if (container) {
        container.querySelectorAll(".mg-step-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            let current = state.bets[panelId].amount;
            if (btn.dataset.action === "plus") current += 100;
            else current -= 100;
            current = Math.max(CONFIG.MIN_BET, Math.min(CONFIG.MAX_BET, current));
            state.bets[panelId].amount = current;
            input.value = current;
            updatePanelUI(panelId);
          });
        });

        container.querySelectorAll("[data-mg-token]").forEach(btn => {
          btn.addEventListener("click", () => {
            const amt = Number(btn.dataset.mgToken);
            state.bets[panelId].amount = Math.max(CONFIG.MIN_BET, Math.min(CONFIG.MAX_BET, amt));
            input.value = state.bets[panelId].amount;
            updatePanelUI(panelId);
          });
        });
      }
    });
  }

  function updatePanelUI(panelId) {
    const btn = byId(`mgStart${panelId}`);
    const amt = state.bets[panelId].amount;
    if (btn && state.round === "waiting") {
      btn.textContent = `BET (${amt})`;
    }
  }

  function startRoundForPanel(panelId) {
    const betAmt = state.bets[panelId].amount;

    if (getTokens() < betAmt) {
      alert("Not enough tokens! Min bet is 100 tokens.");
      return;
    }

    if (state.round === "waiting") {
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

  function beginFlight() {
    state.round = "running";
    state.roundNumber++;
    state.multiplier = CONFIG.START_MULTIPLIER;
    state.crashPoint = parseFloat((0.97 / (1 - Math.random())).toFixed(2));
    if (Math.random() < 0.03) state.crashPoint = 1.00;

    byId("mgRoundNumber").textContent = `ROUND ${state.roundNumber}`;
    byId("mgStatus").textContent = "Plane taking off...";
    byId("mgMultiplier")?.classList.remove("crashed");

    [1, 2].forEach(id => {
      if (state.bets[id].active) {
        const btn = byId(`mgStart${id}`);
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

      if (state.multiplier >= state.crashPoint) {
        state.multiplier = state.crashPoint;
        updateScreenUI();
        finishRound(true);
        return;
      }

      updateScreenUI();
      state.animationFrame = requestAnimationFrame(frame);
    }
    state.animationFrame = requestAnimationFrame(frame);
  }

  function updateScreenUI() {
    const val = Math.min(CONFIG.DISPLAY_MAX_MULTIPLIER, state.multiplier);
    const mEl = byId("mgMultiplier");
    if (mEl) mEl.textContent = `${val.toFixed(2)}x`;
    
    const plane = byId("mgPlane");
    if (plane) {
      let pos = Math.min(75, (state.multiplier / 10) * 75);
      plane.style.left = `${15 + pos}%`;
      plane.style.bottom = `${20 + pos * 0.7}%`;
    }
  }

  function cashOutPanel(panelId) {
    if (!state.bets[panelId].active || state.bets[panelId].cashedOut) return;
    state.bets[panelId].cashedOut = true;
    
    const winnings = Math.floor(state.bets[panelId].amount * state.multiplier);
    setTokens(getTokens() + winnings);

    const btn = byId(`mgStart${panelId}`);
    if (btn) {
      btn.textContent = `Won ${winnings}!`;
      btn.classList.remove("cashout");
      btn.disabled = true;
    }
  }

  function finishRound(crashed) {
    state.round = "finished";
    cancelAnimationFrame(state.animationFrame);

    const finalVal = Number(state.multiplier.toFixed(2));
    addHistory(finalVal);

    byId("mgMultiplier")?.classList.add("crashed");
    byId("mgStatus").textContent = crashed ? `Flew away at ${finalVal}x` : "Round Ended";

    [1, 2].forEach(id => {
      if (state.bets[id].active && !state.bets[id].cashedOut) {
        const btn = byId(`mgStart${id}`);
        if (btn) {
          btn.textContent = "LOST";
          btn.classList.remove("cashout");
          btn.disabled = true;
        }
      }
    });

    state.timer = setTimeout(() => {
      resetRound();
    }, CONFIG.ROUND_WAIT);
  }

  function resetRound() {
    state.round = "waiting";
    state.multiplier = 1.00;
    byId("mgStatus").textContent = "Ready for next round";
    if (byId("mgMultiplier")) {
      byId("mgMultiplier").textContent = "1.00x";
      byId("mgMultiplier").classList.remove("crashed");
    }

    [1, 2].forEach(id => {
      state.bets[id].active = false;
      state.bets[id].cashedOut = false;
      const btn = byId(`mgStart${id}`);
      if (btn) {
        btn.textContent = `BET (${state.bets[id].amount})`;
        btn.classList.remove("cashout");
        btn.disabled = false;
      }
    });
  }

  function addHistory(val) {
    state.history.unshift(val);
    state.history = state.history.slice(0, CONFIG.HISTORY_LIMIT);
    renderHistory();
  }

  function renderHistory() {
    const container = byId("mgHistory");
    if (!container) return;
    if (state.history.length === 0) {
      container.innerHTML = `<div class="mg-history-item" style="width:100%; text-align:center; color:#888;">No rounds yet</div>`;
      return;
    }
    container.innerHTML = state.history.map(v => `<div class="mg-history-item">${v.toFixed(2)}x</div>`).join("");
  }

  function renderStatistics() {
    const container = byId("mgStatistics");
    if (!container) return;
    container.innerHTML = `
      <div style="padding:10px; color:#fff;">
        <div style="font-weight:bold; margin-bottom:8px;">Multiplier Statistics (97% RTP)</div>
        ${RTP_STATISTICS.map(s => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
            <span>Target: <b>${s.target.toFixed(2)}x</b></span>
            <span>Prob: <b>${s.probability}%</b></span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderLiveBets() {
    const list = byId("mgLiveBetsList");
    if (!list) return;
    const sampleNames = ["Ali_Khan", "Zeeshan99", "CryptoKing", "FastRunner", "Ahmed_Dev", "User_771"];
    list.innerHTML = sampleNames.map(name => `
      <div class="mg-live-bet-item" style="display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div class="user" style="color:#fff;"><span class="dot" style="display:inline-block; width:6px; height:6px; background:#00ff88; border-radius:50%; margin-right:6px;"></span>${name}</div>
        <span style="color:#00ff88;">${Math.floor(Math.random() * 900 + 100)} Tokens</span>
      </div>
    `).join("");
  }

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

  function init() {
    setupBetControls();
    setupConversion();
    setupTabs();
    
    byId("mgClose")?.addEventListener("click", closeGame);
    $$("[data-open-mini-game]").forEach(el => el.addEventListener("click", openGame));
    byId("miniGameCard")?.addEventListener("click", openGame);

    byId("mgStart1")?.addEventListener("click", () => startRoundForPanel(1));
    byId("mgStart2")?.addEventListener("click", () => startRoundForPanel(2));

    clearInterval(state.playerTimer);
    state.playerTimer = setInterval(() => {
      if (state.open) {
        state.livePlayers += Math.floor(Math.random() * 7) - 3;
        state.livePlayers = Math.max(80, Math.min(200, state.livePlayers));
        const pEl = byId("mgLivePlayers");
        if (pEl) pEl.textContent = state.livePlayers;
      }
    }, 4000);

    updateWalletUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
