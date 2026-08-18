/* =========================================================
   EARNRUSH — MISSIONS SYSTEM
   WhatsApp Referral + Ad Watching
========================================================= */

(() => {
  "use strict";

  const SHARE_BASE_URL = "https://earn-rush.vercel.app/";
  const SHARE_TEXT =
    "🔥 Playing EarnRush and earning real rewards! Tap, level up, and cash out. Try it now:";

  const POLL_INTERVAL_MS = 8000;

  const AD_REWARD = 5000;

  const tiers = [
    { id: "ref_1", target: 1, coins: 1000, xp: 25 },
    { id: "ref_5", target: 5, coins: 5000, xp: 100 },
    { id: "ref_7", target: 7, coins: 7500, xp: 150 },
    { id: "ref_15", target: 15, coins: 15000, xp: 300 },
    { id: "ref_25", target: 25, coins: 25000, xp: 500 },
    { id: "ref_35", target: 35, coins: 35000, xp: 750 },
    { id: "ref_50", target: 50, coins: 50000, xp: 1200 }
  ];

  let pollTimer = null;
  let referralCount = 0;

  /* =====================================================
     GAME STATE
  ===================================================== */

  function getState() {
    return window.EarnRushGame?.getState();
  }

  /* =====================================================
     REFERRAL CODE
  ===================================================== */

  function getOrCreateRefCode() {
    let code = localStorage.getItem("earnRushRefCode");

    if (!code) {
      code =
        "u" +
        Math.random()
          .toString(36)
          .slice(2, 10);

      localStorage.setItem(
        "earnRushRefCode",
        code
      );
    }

    return code;
  }

  /* =====================================================
     VISITOR ID
  ===================================================== */

  function getOrCreateVisitorId() {
    let id =
      localStorage.getItem(
        "earnRushVisitorId"
      );

    if (!id) {
      id =
        "v" +
        Math.random()
          .toString(36)
          .slice(2, 12);

      localStorage.setItem(
        "earnRushVisitorId",
        id
      );
    }

    return id;
  }

  /* =====================================================
     CLAIM CHECK
  ===================================================== */

  function isClaimed(tier, state) {
    return Array.isArray(state.claimedRewards) &&
      state.claimedRewards.includes(tier.id);
  }

  /* =====================================================
     WHATSAPP SHARE
  ===================================================== */

  function openWhatsAppShare() {
    const myCode =
      getOrCreateRefCode();

    const link =
      `${SHARE_BASE_URL}?ref=${encodeURIComponent(myCode)}`;

    const message =
      `${SHARE_TEXT} ${link}`;

    const url =
      `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =====================================================
     INCOMING REFERRAL
  ===================================================== */

  async function trackIncomingReferral() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const ref =
      params.get("ref");

    if (!ref) return;

    const visitor =
      getOrCreateVisitorId();

    try {
      await fetch(
        "/api/track-click",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            ref,
            visitor
          })
        }
      );
    } catch (error) {
      console.warn(
        "Referral tracking failed:",
        error
      );
    }
  }

  /* =====================================================
     REFERRAL COUNT
  ===================================================== */

  async function refreshReferralCount() {
    const myCode =
      getOrCreateRefCode();

    try {
      const response =
        await fetch(
          `/api/check-referral?ref=${encodeURIComponent(myCode)}`,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      referralCount =
        Number(data.count) || 0;

    } catch (error) {
      console.warn(
        "Referral check failed:",
        error
      );
    }

    render();
  }

  /* =====================================================
     POLLING
  ===================================================== */

  function startPolling() {
    if (pollTimer) return;

    pollTimer =
      setInterval(
        refreshReferralCount,
        POLL_INTERVAL_MS
      );
  }

  /* =====================================================
     CLAIM REFERRAL
  ===================================================== */

  function claimTier(tier) {
    const state =
      getState();

    if (!state) return;

    if (isClaimed(tier, state)) {
      return;
    }

    if (
      referralCount <
      tier.target
    ) {
      return;
    }

    if (!Array.isArray(state.claimedRewards)) {
      state.claimedRewards = [];
    }

    state.claimedRewards.push(
      tier.id
    );

    window.EarnRushGame.addCoins(
      tier.coins
    );

    window.EarnRushGame.addXP(
      tier.xp
    );

    window.EarnRushGame.showMessage(
      `🎉 +${tier.coins.toLocaleString()} 🪙`
    );

    render();
  }

  /* =====================================================
     AD TASK
     
     IMPORTANT:
     Button does NOT reward yet.
     Actual ad provider will later call a
     verified completion flow.
  ===================================================== */

  function startAdTask() {
    window.EarnRushGame?.showMessage(
      "📺 Ads will be available soon!"
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  function render() {
    const container =
      document.getElementById(
        "missionsList"
      );

    if (!container) return;

    const state =
      getState();

    if (!state) return;

    const existing =
      document.getElementById(
        "earnRushTasks"
      );

    if (existing) {
      existing.remove();
    }

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.id =
      "earnRushTasks";

    /* ===================================================
       TOP TASK GRID
    =================================================== */

    const taskGrid =
      document.createElement(
        "div"
      );

    taskGrid.className =
      "earnrush-task-grid";

    /* ===================================================
       WHATSAPP TASK
    =================================================== */

    const shareCard =
      document.createElement(
        "div"
      );

    shareCard.className =
      "mission-card earnrush-task-card share-task-card";

    shareCard.innerHTML = `
      <div class="mission-icon">📤</div>

      <div class="mission-content">
        <div class="mission-title">
          WhatsApp Referral
        </div>

        <div class="mission-description">
          Share your referral link
          and earn rewards
        </div>

        <div class="task-stat">
          👥 ${referralCount} referrals
        </div>
      </div>

      <div class="mission-reward">
        <button
          type="button"
          id="shareTaskBtn"
          class="task-action-btn share-action-btn"
        >
          Share Now
        </button>
      </div>
    `;

    /* ===================================================
       AD TASK
    =================================================== */

    const adCard =
      document.createElement(
        "div"
      );

    adCard.className =
      "mission-card earnrush-task-card ad-task-card";

    adCard.innerHTML = `
      <div class="mission-icon">📺</div>

      <div class="mission-content">
        <div class="mission-title">
          Watch an Ad
        </div>

        <div class="mission-description">
          Complete the full ad
          to earn your reward
        </div>

        <div class="task-stat ad-reward-text">
          🪙 +${AD_REWARD.toLocaleString()} Coins
        </div>
      </div>

      <div class="mission-reward">
        <button
          type="button"
          id="watchAdBtn"
          class="task-action-btn ad-action-btn"
        >
          Watch Ad
        </button>
      </div>
    `;

    taskGrid.appendChild(
      shareCard
    );

    taskGrid.appendChild(
      adCard
    );

    wrapper.appendChild(
      taskGrid
    );

    /* ===================================================
       REFERRAL REWARDS TITLE
    =================================================== */

    const rewardsTitle =
      document.createElement(
        "div"
      );

    rewardsTitle.className =
      "missions-subtitle";

    rewardsTitle.textContent =
      "Referral Rewards";

    wrapper.appendChild(
      rewardsTitle
    );

    /* ===================================================
       REFERRAL TIERS
    =================================================== */

    tiers.forEach(
      tier => {
        const claimed =
          isClaimed(
            tier,
            state
          );

        const unlocked =
          referralCount >=
          tier.target;

        const progress =
          Math.min(
            referralCount,
            tier.target
          );

        const percent =
          Math.min(
            (progress /
              tier.target) *
              100,
            100
          );

        const card =
          document.createElement(
            "div"
          );

        card.className =
          `mission-card referral-tier-card ${
            claimed
              ? "completed"
              : ""
          }`;

        card.innerHTML = `
          <div class="mission-icon">
            ${claimed ? "✓" : "🎁"}
          </div>

          <div class="mission-content">

            <div class="mission-title">
              ${tier.target}
              Friend${tier.target > 1 ? "s" : ""}
            </div>

            <div class="mission-description">
              🪙 ${tier.coins.toLocaleString()}
              • ⭐ ${tier.xp} XP
            </div>

            <div class="mission-progress">

              <div class="mission-progress-track">
                <div
                  class="mission-progress-fill"
                  style="width:${percent}%"
                ></div>
              </div>

              <span>
                ${progress}/${tier.target}
              </span>

            </div>

          </div>

          <div
            class="mission-reward ${
              claimed
                ? "claimed"
                : ""
            }"
          >
            ${
              claimed
                ? "✓ Claimed"
                : `
                  <button
                    type="button"
                    class="claimBtn"
                    data-id="${tier.id}"
                    ${unlocked ? "" : "disabled"}
                  >
                    Claim
                  </button>
                `
            }
          </div>
        `;

        wrapper.appendChild(
          card
        );
      }
    );

    container.appendChild(
      wrapper
    );

    /* ===================================================
       EVENTS
    =================================================== */

    const shareBtn =
      wrapper.querySelector(
        "#shareTaskBtn"
      );

    if (shareBtn) {
      shareBtn.addEventListener(
        "click",
        openWhatsAppShare
      );
    }

    const watchAdBtn =
      wrapper.querySelector(
        "#watchAdBtn"
      );

    if (watchAdBtn) {
      watchAdBtn.addEventListener(
        "click",
        startAdTask
      );
    }

    wrapper
      .querySelectorAll(
        ".claimBtn"
      )
      .forEach(
        button => {
          button.addEventListener(
            "click",
            () => {
              const tierId =
                button.getAttribute(
                  "data-id"
                );

              const tier =
                tiers.find(
                  item =>
                    item.id ===
                    tierId
                );

              if (tier) {
                claimTier(
                  tier
                );
              }
            }
          );
        }
      );
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  function init() {
    trackIncomingReferral();

    setTimeout(
      () => {
        refreshReferralCount();
        startPolling();
      },
      100
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  window.EarnRushMissions = {
    render,

    handleTap() {
      /* Reserved for tap missions */
    }
  };

})();