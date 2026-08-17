/* =========================================
   EARNRUSH — CORE GAME ENGINE (Coins System)
   Version 4.0
========================================= */
(() => {
  "use strict";

  const SAVE_KEY = "earnRushSave";
  const SAVE_VERSION = 4;

  const defaultState = {
    saveVersion: SAVE_VERSION,
    coins: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 500,
    combo: 1,
    comboProgress: 0,
    totalTaps: 0,
    baseCoinsPerTap: 1,
    streak: 1,
    lastPlayedDate: null,
    completedMissions: [],
    claimedRewards: []
  };

  /* LOAD GAME */
  function loadGame() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) {
        return { ...defaultState };
      }
      const parsed = JSON.parse(saved);
      if (parsed.saveVersion !== SAVE_VERSION) {
        localStorage.removeItem(SAVE_KEY);
        return { ...defaultState };
      }
      return { ...defaultState, ...parsed };
    } catch (error) {
      console.warn("EarnRush save could not be loaded.", error);
      localStorage.removeItem(SAVE_KEY);
      return { ...defaultState };
    }
  }

  const gameState = loadGame();

  /* SAVE GAME */
  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    } catch (error) {
      console.warn("EarnRush save could not be saved.", error);
    }
  }

  /* ELEMENTS */
  const coinsElement = document.getElementById("balance");
  const levelElement = document.getElementById("levelValue");
  const reactorCore = document.getElementById("reactorCore");
  const tapButton = document.getElementById("tapButton");
  const progressFill = document.querySelector(".progress-fill");
  const comboValue = document.querySelector(".combo-value");
  const xpBar = document.getElementById("xpBar");
  const xpText = document.getElementById("xpText");
  const streakElement = document.getElementById("streakValue");

  /* FORMAT NUMBER */
  function formatNumber(value) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /* UPDATE COINS */
  function updateCoins() {
    if (!coinsElement) return;
    coinsElement.textContent = formatNumber(gameState.coins);
  }

  /* UPDATE LEVEL */
  function updateLevel() {
    if (!levelElement) return;
    levelElement.textContent = String(gameState.level).padStart(2, "0");
  }

  /* UPDATE COMBO */
  function updateCombo() {
    if (!comboValue) return;
    comboValue.textContent = `🔥 x${gameState.combo}`;
  }

  /* UPDATE COMBO PROGRESS */
  function updateComboProgress() {
    if (!progressFill) return;
    progressFill.style.width = `${gameState.comboProgress}%`;
  }

  /* UPDATE XP */
  function updateXP() {
    const percentage = Math.min(100, (gameState.xp / gameState.xpToNextLevel) * 100);
    if (xpBar) {
      xpBar.style.width = `${percentage}%`;
    }
    if (xpText) {
      xpText.textContent = `${gameState.xp} / ${gameState.xpToNextLevel} XP`;
    }
  }

  /* UPDATE STREAK */
  function updateStreak() {
    if (!streakElement) return;
    streakElement.textContent = `🔥 ${gameState.streak} Day`;
  }

  /* UPDATE COMPLETE UI */
  function updateUI() {
    updateCoins();
    updateLevel();
    updateCombo();
    updateComboProgress();
    updateXP();
    updateStreak();
  }

  /* ADD XP */
  function addXP(amount) {
    gameState.xp += amount;
    while (gameState.xp >= gameState.xpToNextLevel) {
      gameState.xp -= gameState.xpToNextLevel;
      gameState.level += 1;
      gameState.baseCoinsPerTap += 0.5;
      gameState.xpToNextLevel = Math.floor(gameState.xpToNextLevel * 1.25);
      levelUp();
    }
    updateUI();
  }

  /* LEVEL UP */
  function levelUp() {
    const bonus = gameState.level * 10;
    gameState.coins += bonus;
    showMessage(`🎉 LEVEL ${gameState.level}! +${bonus} Coins`);
    createRewardPopup(bonus, "coins");
  }

  /* TAP */
  function performTap() {
    const reward = gameState.baseCoinsPerTap;
    gameState.coins += reward;
    gameState.totalTaps += 1;

    addXP(1);

    gameState.comboProgress += 5;
    if (gameState.comboProgress >= 100) {
      gameState.combo += 1;
      gameState.comboProgress = 0;
      showMessage(`🔥 COMBO x${gameState.combo}!`);
    }

    if (window.EarnRushMissions && typeof window.EarnRushMissions.handleTap === "function") {
      window.EarnRushMissions.handleTap(gameState);
    }

    updateUI();
    saveGame();
    reactorEffect();
    coinsEffect();
    createRewardPopup(reward, "coins");
  }

  /* REACTOR EFFECT */
  function reactorEffect() {
    if (!reactorCore) return;
    reactorCore.classList.remove("tap-pop");
    void reactorCore.offsetWidth;
    reactorCore.classList.add("tap-pop");
  }

  /* COINS EFFECT */
  function coinsEffect() {
    if (!coinsElement) return;
    coinsElement.classList.remove("balance-pop");
    void coinsElement.offsetWidth;
    coinsElement.classList.add("balance-pop");
  }

  /* REWARD POPUP */
  function createRewardPopup(amount, type = "coins") {
    const popup = document.createElement("div");
    const icon = type === "coins" ? "🪙" : "💰";
    popup.textContent = `+${formatNumber(amount)} ${icon}`;
    popup.style.position = "fixed";
    popup.style.left = "50%";
    popup.style.top = "45%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.color = "#39ff88";
    popup.style.fontSize = "22px";
    popup.style.fontWeight = "900";
    popup.style.pointerEvents = "none";
    popup.style.zIndex = "9999";
    popup.style.textShadow = "0 0 15px rgba(57,255,136,.5)";
    document.body.appendChild(popup);

    const animation = popup.animate(
      [
        { opacity: 0, transform: "translate(-50%, -30%) scale(.7)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
        { opacity: 0, transform: "translate(-50%, -100%) scale(1.15)" }
      ],
      { duration: 700, easing: "ease-out" }
    );
    animation.onfinish = () => popup.remove();
  }

  /* MESSAGE */
  function showMessage(text) {
    const message = document.createElement("div");
    message.textContent = text;
    message.style.position = "fixed";
    message.style.left = "50%";
    message.style.top = "18%";
    message.style.transform = "translateX(-50%)";
    message.style.padding = "12px 20px";
    message.style.borderRadius = "14px";
    message.style.background = "#0b1625";
    message.style.border = "1px solid rgba(57,255,136,.35)";
    message.style.color = "#ffffff";
    message.style.fontWeight = "900";
    message.style.zIndex = "10000";
    message.style.pointerEvents = "none";
    message.style.whiteSpace = "nowrap";
    document.body.appendChild(message);

    const animation = message.animate(
      [
        { opacity: 0, transform: "translate(-50%, -10px)" },
        { opacity: 1, transform: "translate(-50%, 0)" },
        { opacity: 0, transform: "translate(-50%, -10px)" }
      ],
      { duration: 1200, easing: "ease-out" }
    );
    animation.onfinish = () => message.remove();
  }

  /* DAILY STREAK */
  function updateDailyStreak() {
    const today = new Date().toISOString().split("T")[0];

    if (!gameState.lastPlayedDate) {
      gameState.lastPlayedDate = today;
      gameState.streak = 1;
      return;
    }

    if (gameState.lastPlayedDate === today) {
      return;
    }

    const previous = new Date(gameState.lastPlayedDate);
    const current = new Date(today);
    const difference = Math.floor((current - previous) / 86400000);

    if (difference === 1) {
      gameState.streak += 1;
    } else {
      gameState.streak = 1;
    }

    gameState.lastPlayedDate = today;
  }

  /* EVENTS */
  if (reactorCore) {
    reactorCore.addEventListener("click", performTap);
  }
  if (tapButton) {
    tapButton.addEventListener("click", performTap);
  }

  /* SAVE ON BACKGROUND */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveGame();
    }
  });
  window.addEventListener("beforeunload", saveGame);

  /* PUBLIC API */
  window.EarnRushGame = {
    getState() {
      return gameState;
    },
    save() {
      saveGame();
    },
    updateUI() {
      updateUI();
    },
    addXP(amount) {
      addXP(amount);
      saveGame();
    },
    addCoins(amount) {
      gameState.coins += amount;
      updateUI();
      saveGame();
    },
    showMessage(text) {
      showMessage(text);
    },
    createRewardPopup(amount, type) {
      createRewardPopup(amount, type);
    }
  };

  /* INITIALIZE */
  updateDailyStreak();
  updateUI();
  saveGame();
})();
