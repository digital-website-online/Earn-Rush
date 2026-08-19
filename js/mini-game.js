/* =========================================================
   EARNRUSH MINI GAME - DUAL BETS & 100 - 10000 LIMIT ENGINE
   ========================================================= */

(() => {
  "use strict";

  const CONFIG = {
    MIN_BET: 100,
    MAX_BET: 10000,
    START_MULTIPLIER: 1.00,
    DISPLAY_MAX_MULTIPLIER: 100,
    ROUND_WAIT: 3000,
    HISTORY_LIMIT: 12,
  };

  const state = {
    open: false,
    round: "waiting", // waiting, running, finished
    roundNumber: 0,
    multiplier: 1.00,
    crashPoint: 1.00,
    gameTokens: 300,

    // Dual Panel State
    bets: {
      1: { amount: 100, active: false, cashedOut: false, win: 0 },
      2: { amount: 100, active: false, cashedOut: false, win: 0 }
    },

    history: [],
    livePlayers: 124,
    animationFrame: null,
    timer: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = id => document.getElementById(id);

  function getTokens() {
    return Math.max(0, Math.floor(Number(state.gameTokens) || 0));
  }

  function setTokens(val) {
    state.gameTokens = Math.max(0, Math.floor(Number(val) || 0));
    updateWalletUI();
  }

  function updateWalletUI() {
    const el = byId("mgTokenBalance");
    if (el) el.textContent = getTokens().toLocaleString();
  }

  function openGame() {
    state.open = true;
    byId("miniGameOverlay")?.classList.add("active");
    document.body.classList.add("mg-open");
    updateWalletUI();
    renderLiveBets();
  }

  function closeGame() {
    state.open = false;
    byId("miniGameOverlay")?.classList.remove("active");
    document.body.classList.remove("mg-open");
  }

  // Handle Bet Controls (+ / - and Range 100 to 10000)
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

      // Plus / Minus buttons
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

        // Quick Token Buttons
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

  // Start Round Logic for Dual Bets
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
    byId("mgMultiplier").classList.remove("crashed");

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
    byId("mgMultiplier").textContent = `${val.toFixed(2)}x`;
    
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

    byId("mgMultiplier").classList.add("crashed");
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
    byId("mgMultiplier").textContent = "1.00x";
    byId("mgMultiplier").classList.remove("crashed");

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
    container.innerHTML = state.history.map(v => `<div class="mg-history-item">${v.toFixed(2)}x</div>`).join("");
  }

  function renderLiveBets() {
    const list = byId("mgLiveBetsList");
    if (!list) return;
    const sampleNames = ["Ali_Khan", "Zeeshan99", "CryptoKing", "FastRunner", "Ahmed_Dev", "User_771"];
    list.innerHTML = sampleNames.map(name => `
      <div class="mg-live-bet-item">
        <div class="user"><span class="dot"></span>${name}</div>
        <span>${Math.floor(Math.random() * 900 + 100)} Tokens</span>
      </div>
    `).join("");
  }

  function init() {
    setupBetControls();
    byId("mgClose")?.addEventListener("click", closeGame);
    $$("[data-open-mini-game]").forEach(el => el.addEventListener("click", openGame));
    byId("miniGameCard")?.addEventListener("click", openGame);

    byId("mgStart1")?.addEventListener("click", () => startRoundForPanel(1));
    byId("mgStart2")?.addEventListener("click", () => startRoundForPanel2 ? startRoundForPanel(2) : startRoundForPanel(2));

    // Tab switcher
    $$("[data-mg-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-mg-tab]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.mgTab;
        $$("[data-mg-panel]").forEach(p => {
          p.style.display = p.dataset.mgPanel === tab ? "block" : "none";
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
