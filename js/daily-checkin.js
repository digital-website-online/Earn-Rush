(() => {
  "use strict";

  const STORAGE_KEY = "earnRushDailyCheckin";
  const CLAIM_COOLDOWN = 24 * 60 * 60 * 1000;

  // Confirmed requirement:
  // Day 1 = 1,000 Coins
  const DAILY_REWARDS = [
    1000
  ];

  let modal = null;
  let card = null;
  let countdownTimer = null;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return { day: 0, claimedAt: 0 };

      const state = JSON.parse(saved);

      return {
        day: Number.isFinite(state.day) ? state.day : 0,
        claimedAt: Number.isFinite(state.claimedAt) ? state.claimedAt : 0
      };
    } catch {
      return { day: 0, claimedAt: 0 };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getCurrentDay(state) {
    return Math.min(state.day, DAILY_REWARDS.length - 1);
  }

  function isReady(state) {
    if (!state.claimedAt) return true;
    return Date.now() - state.claimedAt >= CLAIM_COOLDOWN;
  }

  function getRemaining(state) {
    if (!state.claimedAt) return 0;

    return Math.max(
      0,
      CLAIM_COOLDOWN - (Date.now() - state.claimedAt)
    );
  }

  function formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0")
    ].join(":");
  }

  function updateCard() {
    if (!card) return;

    const state = loadState();

    if (isReady(state)) {
      card.classList.remove("is-locked");

      card.innerHTML = `
        <div class="dc-card-icon">🎁</div>
        <div class="dc-card-content">
          <span class="dc-card-kicker">DAILY CHECK-IN</span>
          <strong>Claim today's reward</strong>
          <small>Day 1 • 1,000 Coins</small>
        </div>
        <div class="dc-card-arrow">›</div>
      `;

      return;
    }

    card.classList.add("is-locked");

    card.innerHTML = `
      <div class="dc-card-icon">⏳</div>
      <div class="dc-card-content">
        <span class="dc-card-kicker">DAILY CHECK-IN</span>
        <strong>Next check-in available</strong>
        <small>${formatTime(getRemaining(state))}</small>
      </div>
      <div class="dc-card-arrow">›</div>
    `;
  }

  function openModal() {
    if (!modal) return;

    const state = loadState();

    if (!isReady(state)) {
      showLockedState(state);
    } else {
      showClaimState();
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("daily-checkin-open");

    startCountdown();
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("daily-checkin-open");

    stopCountdown();
  }

  function showClaimState() {
    const reward = DAILY_REWARDS[0];

    modal.innerHTML = `
      <div class="dc-backdrop" data-dc-close></div>

      <div class="dc-dialog" role="dialog" aria-modal="true">
        <button class="dc-close" type="button" aria-label="Close" data-dc-close>
          ×
        </button>

        <div class="dc-reward-icon">
          🎁
        </div>

        <span class="dc-kicker">DAILY CHECK-IN</span>

        <h2>Day 1 Reward</h2>

        <p class="dc-subtitle">
          Check in today and keep your progress going.
        </p>

        <div class="dc-reward-box">
          <span class="dc-reward-label">TODAY'S REWARD</span>
          <strong>+${reward.toLocaleString()} Coins</strong>
        </div>

        <button class="dc-claim" type="button" id="dcClaimButton">
          Claim ${reward.toLocaleString()} Coins
        </button>

        <p class="dc-note">
          Your next check-in becomes available 24 hours after claiming.
        </p>
      </div>
    `;

    modal.querySelector("[data-dc-close]").addEventListener("click", closeModal);
    modal.querySelector(".dc-backdrop").addEventListener("click", closeModal);

    modal.querySelector("#dcClaimButton").addEventListener("click", claimReward);
  }

  function showLockedState(state) {
    modal.innerHTML = `
      <div class="dc-backdrop" data-dc-close></div>

      <div class="dc-dialog" role="dialog" aria-modal="true">
        <button class="dc-close" type="button" aria-label="Close" data-dc-close>
          ×
        </button>

        <div class="dc-reward-icon">
          ⏳
        </div>

        <span class="dc-kicker">DAILY CHECK-IN</span>

        <h2>You're all checked in!</h2>

        <p class="dc-subtitle">
          Your next daily reward will be available in:
        </p>

        <div class="dc-countdown" id="dcCountdown">
          ${formatTime(getRemaining(state))}
        </div>

        <div class="dc-reward-box dc-next-box">
          <span class="dc-reward-label">NEXT CHECK-IN</span>
          <strong>DAY 2</strong>
        </div>

        <button class="dc-secondary" type="button" data-dc-close>
          Close
        </button>
      </div>
    `;

    modal.querySelectorAll("[data-dc-close]").forEach(button => {
      button.addEventListener("click", closeModal);
    });
  }

  function claimReward() {
    const state = loadState();

    if (!isReady(state)) {
      showLockedState(state);
      return;
    }

    const reward = DAILY_REWARDS[0];

    if (
      !window.EarnRushGame ||
      typeof window.EarnRushGame.addCoins !== "function"
    ) {
      console.error("EarnRushGame.addCoins is unavailable.");
      return;
    }

    const button = modal.querySelector("#dcClaimButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Claiming...";
    }

    window.EarnRushGame.addCoins(reward);

    saveState({
      day: state.day + 1,
      claimedAt: Date.now()
    });

    updateCard();

    setTimeout(() => {
      showLockedState(loadState());
      startCountdown();
    }, 350);
  }

  function startCountdown() {
    stopCountdown();

    countdownTimer = setInterval(() => {
      const state = loadState();

      updateCard();

      if (isReady(state)) {
        stopCountdown();

        if (modal && modal.classList.contains("is-open")) {
          showClaimState();
        }

        return;
      }

      const countdown = document.getElementById("dcCountdown");

      if (countdown) {
        countdown.textContent = formatTime(getRemaining(state));
      }
    }, 1000);
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function init() {
    modal = document.getElementById("dailyCheckinModal");
    card = document.getElementById("dailyCheckinCard");

    if (!modal || !card) {
      console.error("Daily Check-in UI elements are missing.");
      return;
    }

    card.addEventListener("click", openModal);

    updateCard();

    // Automatic popup:
    // only appears when today's check-in has not been claimed
    // or the 24-hour cooldown has finished.
    const state = loadState();

    if (isReady(state)) {
      setTimeout(openModal, 450);
    }

    window.addEventListener("beforeunload", stopCountdown);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();