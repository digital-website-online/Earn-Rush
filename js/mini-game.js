/* =========================================================
   EARNRUSH MINI GAME - ARCADE TOKEN ENGINE
   -----------------------------------------------------------
   - Coins -> Arcade Tokens is ONE-WAY ONLY.
   - Arcade Tokens are a closed-loop game currency: they cannot
     be converted back to Coins and never touch the withdrawal
     system. They exist purely for entertainment inside the
     mini-game.
   - "Demo Activity" is simulated for atmosphere only and is
     labeled as such in the UI.
   - Rounds cycle automatically (waiting -> flying -> crashed ->
     waiting) whenever the game is open, whether or not the
     player has placed a bet — the plane is part of the game's
     ambient visual atmosphere, not just betting feedback.
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
    WAITING_SECONDS: 4,
    CRASH_HOLD_MS: 2200,
    HISTORY_LIMIT: 14,
    LIVE_PLAYER_INTERVAL: 4000,
  };

  const STORAGE_KEY = "earnrush_minigame_tokens_v2";
  // Known-common keys/paths where a site's main Coins balance might
  // live, tried in order until one actually reflects a change. Kept
  // narrow and explicit rather than writing to arbitrary keys.
  const COIN_FALLBACK_KEYS = ["earnrush_coins", "earnrushCoins", "coins"];

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
    cycleActive: false,
    round: "waiting", // waiting -> running -> crashed -> waiting ...
    roundNumber: 0,
    multiplier: 1.00,
    crashPoint: 1.00,
    secondsLeft: CONFIG.WAITING_SECONDS,
    savedScrollY: 0,
    gameTokens: loadSavedTokens(),

    bets: {
      1: { amount: 100, active: false, cashedOut: false, pending: false },
      2: { amount: 100, active: false, cashedOut: false, pending: false }
    },

    history: [],
    livePlayers: 136,
    demoTotal: 0,

    animationFrame: null,
    waitTimer: null,
    countdownTimer: null,
    crashTimer: null,
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

  const dom = {};

  function cacheDom() {
    dom.overlay = byId("miniGameOverlay");
    dom.roundTag = byId("mgRoundNumber");
    dom.multiplier = byId("mgMultiplier");
    dom.status = byId("mgStatus");
    dom.plane = byId("mgPlane");
    dom.trail = byId("mgTrail");
    dom.stage = dom.plane ? dom.plane.closest(".mg-screen") : null;
    dom.history = byId("mgHistory");
    dom.tokenBalance = byId("mgTokenBalance");
    dom.coinBalance = byId("mgCoinBalance") || byId("miniGameCoins");
    dom.livePlayers = byId("mgLivePlayers");
    dom.liveBetsList = byId("mgLiveBetsList");
    dom.statistics = byId("mgStatistics");
    dom.historyList = byId("mgHistoryList");
    dom.demoBetsCount = byId("mgDemoBetsCount");
    dom.demoTotal = byId("mgDemoTotal");

    dom.betInputs = { 1: byId("mgBetInput1"), 2: byId("mgBetInput2") };
    dom.startBtns = { 1: byId("mgStart1"), 2: byId("mgStart2") };

    dom.convertInput = byId("mgCoinConvertInput");
    dom.convertBtn = byId("mgConvertBtn");
    dom.convertPreview = byId("mgConvertPreview");
    dom.convertMsg = byId("mgConvertMsg");
  }

  /* ---------------------------------------------------------
     BALANCE HELPERS — ARCADE TOKENS
  --------------------------------------------------------- */

  function getTokens() {
    return Math.max(0, Math.floor(Number(state.gameTokens) || 0));
  }

  function setTokens(val) {
    state.gameTokens = Math.max(0, Math.floor(Number(val) || 0));
    saveTokensToStorage();
    updateWalletUI();
  }

  /* ---------------------------------------------------------
     BALANCE HELPERS — COINS (real, existing site balance)
     -----------------------------------------------------------
     Confirmed against the actual js/game.js source:
       - window.EarnRushGame.getCoins() returns the real gameState.coins
       - window.EarnRushGame.getState() returns the LIVE gameState
         object by reference (not a copy), so mutating .coins on it
         mutates the game's actual internal state
       - window.EarnRushGame.addCoins(amount) EARNS coins only — it
         silently no-ops for amount <= 0 (`if (amount <= 0) return;`
         in game.js), which is exactly why calling addCoins(-amount)
         to "spend" coins was doing nothing. There is no deduct/
         setCoins method exposed, so spending goes through
         getState() instead.
       - window.EarnRushGame.updateUI() repaints #balance and friends
       - window.EarnRushGame.save() persists gameState to localStorage
         under the "earnRushSave" key immediately (game.js also saves
         on visibilitychange/pagehide/beforeunload, but saving right
         away means a fast refresh right after converting can't lose it)
  --------------------------------------------------------- */

  function getEarnRushCoins() {
    try {
      if (window.EarnRushGame && typeof window.EarnRushGame.getCoins === "function") {
        return Number(window.EarnRushGame.getCoins()) || 0;
      }
    } catch (e) {}
    // Fallback only for pages where game.js hasn't loaded/isn't present.
    try {
      const el = byId("balance");
      if (el) {
        const n = Number(String(el.textContent).replace(/[^\d.-]/g, ""));
        if (Number.isFinite(n)) return n;
      }
      for (const key of COIN_FALLBACK_KEYS) {
        const stored = localStorage.getItem(key);
        if (stored !== null && !isNaN(stored)) return Number(stored) || 0;
      }
    } catch (e) {}
    return 0;
  }

  // Deducts Coins by mutating the game's real, live state object
  // (via getState(), which returns gameState by reference — not a
  // clone) and then uses the game's own updateUI()/save() so this
  // stays perfectly in sync with everything else on the page.
  function spendEarnRushCoins(amount) {
    try {
      if (window.EarnRushGame && typeof window.EarnRushGame.getState === "function") {
        const gs = window.EarnRushGame.getState();
        if (gs && Number.isFinite(Number(gs.coins))) {
          if (Number(gs.coins) < amount) return false;
          gs.coins = Number(gs.coins) - amount;

          if (typeof window.EarnRushGame.updateUI === "function") {
            window.EarnRushGame.updateUI();
          } else {
            const el = byId("balance");
            if (el) el.textContent = fmt(gs.coins);
          }
          if (typeof window.EarnRushGame.save === "function") {
            window.EarnRushGame.save();
          }

          if (dom.coinBalance) dom.coinBalance.textContent = fmt(gs.coins);
          return true;
        }
      }
    } catch (e) {}

    // Fallback only for pages where game.js hasn't loaded/isn't present.
    const before = getEarnRushCoins();
    if (before < amount) return false;
    const newBalance = Math.max(0, before - amount);
    try {
      const mainBalanceEl = byId("balance");
      if (mainBalanceEl) mainBalanceEl.textContent = fmt(newBalance);
      if (dom.coinBalance) dom.coinBalance.textContent = fmt(newBalance);
      let wroteTo = null;
      for (const key of COIN_FALLBACK_KEYS) {
        if (localStorage.getItem(key) !== null) { wroteTo = key; break; }
      }
      localStorage.setItem(wroteTo || COIN_FALLBACK_KEYS[0], String(newBalance));
      return true;
    } catch (e) {
      return false;
    }
  }

  function fmt(n) {
    return Math.floor(n).toLocaleString();
  }

  // Renders the start/cash-out button as a two-line label ("BET" /
  // amount, "CASH OUT" / multiplier, etc.) matching the reference layout.
  function setStartBtnLabel(btn, top, bottom) {
    if (!btn) return;
    btn.innerHTML = bottom !== undefined
      ? `${top}<br><span>${bottom}</span>`
      : top;
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

  // NOTE: A real requestFullscreen() call for Android was tried here
  // in a previous pass and has been removed. Fullscreen API
  // transitions are a documented source of a black compositor frame
  // on Android Chrome while the browser swaps to fullscreen
  // compositing — i.e. it risked reintroducing the exact black-flash
  // bug this project is trying to eliminate, and there's no way to
  // verify it's safe without a real device. The fixed full-viewport
  // .mg-overlay already looks and behaves fullscreen on every
  // platform without touching the Fullscreen API at all, so nothing
  // is lost by not using it.

  function openGame() {
    state.open = true;
    dom.overlay?.classList.add("active");

    // Save the exact scroll position and pin the body there via CSS
    // (position:fixed at that offset) — the reliable cross-browser
    // way to stop background scroll/touch, since iOS Safari doesn't
    // consistently honor overflow:hidden on body by itself.
    state.savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.style.setProperty("--mg-scroll-y", `${state.savedScrollY}px`);
    document.documentElement.classList.add("mini-game-active");
    document.body.classList.add("mini-game-active");

    document.body.classList.add("mg-open");
    updateWalletUI();
    updateConvertPreview();
    renderLiveBets();
    renderHistory();
    renderStatistics();
    startLivePlayerTimer();

    // The flight loop is the game's ambient visual — it runs
    // continuously while the game is open, independent of betting.
    if (!state.cycleActive) {
      state.cycleActive = true;
      scheduleWaiting();
    }
  }

  function closeGame() {
    state.open = false;
    dom.overlay?.classList.remove("active");

    document.documentElement.classList.remove("mini-game-active");
    document.body.classList.remove("mini-game-active");
    document.documentElement.style.removeProperty("--mg-scroll-y");
    // Restore the exact scroll position now that body is unpinned.
    // Two rAFs so this runs after the class-removal reflow settles,
    // instead of racing it (which is what causes a visible "jump").
    const restoreY = state.savedScrollY || 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, restoreY);
      });
    });

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    document.body.classList.remove("mg-open");
    stopLivePlayerTimer();
    stopCycle();
  }

  function stopCycle() {
    state.cycleActive = false;
    cancelAnimationFrame(state.animationFrame);
    clearTimeout(state.waitTimer);
    clearInterval(state.countdownTimer);
    clearTimeout(state.crashTimer);
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
    const bet = state.bets[panelId];
    if (!btn) return;

    if (state.round === "waiting" && bet.pending) {
      setStartBtnLabel(btn, "Bet Placed", "✓");
      btn.disabled = true;
    } else if (state.round === "waiting") {
      setStartBtnLabel(btn, "BET", bet.amount);
      btn.disabled = false;
      btn.classList.remove("cashout");
    }
  }

  function startRoundForPanel(panelId) {
    const bet = state.bets[panelId];

    if (state.round === "waiting") {
      if (bet.pending) return; // already queued for the next flight
      if (getTokens() < bet.amount) {
        showTokenWarning();
        return;
      }
      setTokens(getTokens() - bet.amount);
      bet.pending = true;
      bet.active = false;
      bet.cashedOut = false;
      updatePanelUI(panelId);
    } else if (state.round === "running" && bet.active && !bet.cashedOut) {
      cashOutPanel(panelId);
    }
  }

  function showTokenWarning() {
    if (dom.status) {
      const prev = dom.status.textContent;
      dom.status.textContent = "Not enough Arcade Tokens — convert more Coins to play.";
      setTimeout(() => {
        if (dom.status && state.round === "waiting") dom.status.textContent = prev;
      }, 1800);
    }
  }

  /* ---------------------------------------------------------
     AUTONOMOUS ROUND CYCLE — waiting -> running -> crashed -> ...
     Runs continuously while the game is open. The plane animates
     as part of this cycle regardless of whether anyone has bet.
  --------------------------------------------------------- */

  function scheduleWaiting() {
    state.round = "waiting";
    state.secondsLeft = CONFIG.WAITING_SECONDS;

    if (dom.multiplier) {
      dom.multiplier.textContent = "1.00x";
      dom.multiplier.classList.remove("crashed");
    }
    resetPlaneToStart();
    dom.plane?.classList.add("idle"); // ambient CSS sway while waiting

    [1, 2].forEach(id => {
      const bet = state.bets[id];
      bet.active = false;
      bet.cashedOut = false;
      // `pending` carries over — a bet placed during this waiting
      // window stays queued until the flight actually begins.
      const btn = dom.startBtns[id];
      if (btn) {
        btn.classList.remove("cashout");
        btn.disabled = bet.pending;
        setStartBtnLabel(btn, bet.pending ? "Bet Placed" : "BET", bet.pending ? "✓" : bet.amount);
      }
    });

    updateCountdownText();
    clearInterval(state.countdownTimer);
    state.countdownTimer = setInterval(() => {
      state.secondsLeft -= 1;
      if (state.secondsLeft <= 0) {
        clearInterval(state.countdownTimer);
        beginFlight();
      } else {
        updateCountdownText();
      }
    }, 1000);
  }

  function updateCountdownText() {
    if (dom.status) dom.status.textContent = `Next flight in ${state.secondsLeft}s`;
    if (dom.roundTag) dom.roundTag.textContent = `ROUND ${state.roundNumber + 1}`;
  }

  function resetPlaneToStart() {
    if (dom.plane) dom.plane.style.transform = "translate3d(0, 0, 0)";
    if (dom.trail) dom.trail.style.width = "0px";
    state.lastPlaneX = null;
    state.lastPlaneY = null;
  }

  function beginFlight() {
    state.round = "running";
    state.roundNumber++;
    state.multiplier = CONFIG.START_MULTIPLIER;
    state.crashPoint = parseFloat((0.97 / (1 - Math.random())).toFixed(2));
    if (Math.random() < 0.03) state.crashPoint = 1.00;

    dom.plane?.classList.remove("idle");
    if (dom.roundTag) dom.roundTag.textContent = `ROUND ${state.roundNumber}`;
    if (dom.status) dom.status.textContent = "Plane taking off...";
    dom.multiplier?.classList.remove("crashed");

    // Measure stage geometry once per round — never inside the loop.
    state.stageRect = dom.stage ? dom.stage.getBoundingClientRect() : null;
    state.lastMultiplierText = "";
    state.lastPlaneX = null;
    state.lastPlaneY = null;

    // Any bets queued during the waiting window now become active.
    [1, 2].forEach(id => {
      const bet = state.bets[id];
      if (bet.pending) {
        bet.pending = false;
        bet.active = true;
        bet.cashedOut = false;
        const btn = dom.startBtns[id];
        if (btn) {
          setStartBtnLabel(btn, "CASH OUT", `${state.multiplier.toFixed(2)}x`);
          btn.classList.add("cashout");
          btn.disabled = false;
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

    if (dom.multiplier && text !== state.lastMultiplierText) {
      dom.multiplier.textContent = text;
      state.lastMultiplierText = text;

      // Live-update each active cash-out button's payout preview, but
      // only on the same "value actually changed" cadence as above.
      [1, 2].forEach(id => {
        const bet = state.bets[id];
        const btn = dom.startBtns[id];
        if (btn && bet.active && !bet.cashedOut) {
          const span = btn.querySelector("span");
          if (span) span.textContent = text;
        }
      });
    }

    if (dom.plane) {
      const pos = Math.min(75, (state.multiplier / 10) * 75);
      const rect = state.stageRect;
      const w = rect ? rect.width : 300;
      const h = rect ? rect.height : 220;
      const x = Math.round((pos / 75) * (w * 0.6));
      const y = Math.round((pos / 75) * (h * 0.5));

      if (x !== state.lastPlaneX || y !== state.lastPlaneY) {
        dom.plane.style.transform = `translate3d(${x}px, ${-y}px, 0)`;
        state.lastPlaneX = x;
        state.lastPlaneY = y;

        if (dom.trail) {
          const len = Math.round(Math.sqrt((x * x) + (y * y)));
          const angle = -(Math.atan2(y, x) * (180 / Math.PI));
          dom.trail.style.width = `${len}px`;
          dom.trail.style.transform = `rotate(${angle}deg)`;
        }
      }
    }
  }

  function cashOutPanel(panelId) {
    const bet = state.bets[panelId];
    if (!bet.active || bet.cashedOut) return;
    bet.cashedOut = true;

    const winnings = Math.floor(bet.amount * state.multiplier);
    setTokens(getTokens() + winnings);

    const btn = dom.startBtns[panelId];
    if (btn) {
      setStartBtnLabel(btn, "WON", winnings);
      btn.classList.remove("cashout");
      btn.disabled = true;
    }
  }

  function finishRound() {
    state.round = "crashed";
    cancelAnimationFrame(state.animationFrame);

    const finalVal = Number(state.multiplier.toFixed(2));
    addHistory(finalVal);

    dom.multiplier?.classList.add("crashed");
    if (dom.status) dom.status.textContent = `Flew away at ${finalVal}x`;

    [1, 2].forEach(id => {
      const bet = state.bets[id];
      if (bet.active && !bet.cashedOut) {
        const btn = dom.startBtns[id];
        if (btn) {
          setStartBtnLabel(btn, "LOST", `${finalVal.toFixed(2)}x`);
          btn.classList.remove("cashout");
          btn.disabled = true;
        }
      }
    });

    clearTimeout(state.crashTimer);
    state.crashTimer = setTimeout(() => {
      if (state.cycleActive) scheduleWaiting();
    }, CONFIG.CRASH_HOLD_MS);
  }

  /* ---------------------------------------------------------
     HISTORY / STATISTICS (rendered on demand, not every frame)
  --------------------------------------------------------- */

  function historyClass(v) {
    if (v < 2) return "low";
    if (v < 10) return "medium";
    return "high";
  }

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
    dom.history.innerHTML = state.history
      .map(v => `<div class="mg-history-item ${historyClass(v)}">${v.toFixed(2)}x</div>`)
      .join("");
  }

  function renderStatistics() {
    if (!dom.statistics) return;
    dom.statistics.innerHTML = `
      <div class="mg-statistics-title">In-game odds (arcade mechanic — for entertainment only, not real-money odds)</div>
      ${RTP_STATISTICS.map(s => `
        <div class="mg-statistics-row">
          <span>Target: <strong>${s.target.toFixed(2)}x</strong></span>
          <small>Chance: ${s.probability}%</small>
        </div>
      `).join("")}
    `;
  }

  // Simulated activity feed, clearly labeled as demo data — no real
  // user data is read, generated, or displayed here.
  function renderLiveBets() {
    if (!dom.liveBetsList) return;
    let total = 0;
    const rows = DEMO_NAMES.map(name => {
      const amt = Math.floor(Math.random() * 900 + 100);
      total += amt;
      return `
        <div class="mg-live-bet-item">
          <div class="user"><span class="dot"></span>${name} <span class="mg-demo-tag">DEMO</span></div>
          <span class="mg-live-bet-amount">${fmt(amt)} Tokens</span>
        </div>
      `;
    }).join("");
    dom.liveBetsList.innerHTML = rows;

    state.demoTotal = total;
    if (dom.demoBetsCount) dom.demoBetsCount.textContent = DEMO_NAMES.length;
    if (dom.demoTotal) dom.demoTotal.textContent = fmt(total);
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

    window.addEventListener("beforeunload", () => {
      stopCycle();
      stopLivePlayerTimer();
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();