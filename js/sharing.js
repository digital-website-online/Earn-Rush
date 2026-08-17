/* =========================================
   EARNRUSH — WHATSAPP REFERRAL (Coins Tiers)
========================================= */
(() => {
  "use strict";

  const SHARE_BASE_URL = "https://earn-rush.vercel.app/";
  const SHARE_TEXT = "🔥 Playing EarnRush and earning real rewards! Tap, level up, and cash out. Try it now:";
  const POLL_INTERVAL_MS = 8000;

  const tiers = [
    { id: "ref_1",  target: 1,  coins: 1000,  xp: 25 },
    { id: "ref_5",  target: 5,  coins: 5000,  xp: 100 },
    { id: "ref_7",  target: 7,  coins: 7500,  xp: 150 },
    { id: "ref_15", target: 15, coins: 15000, xp: 300 },
    { id: "ref_25", target: 25, coins: 25000, xp: 500 },
    { id: "ref_35", target: 35, coins: 35000, xp: 750 },
    { id: "ref_50", target: 50, coins: 50000, xp: 1200 }
  ];

  let pollTimer = null;
  let referralCount = 0;

  function getState() {
    if (!window.EarnRushGame) return null;
    return window.EarnRushGame.getState();
  }

  function getOrCreateRefCode() {
    let code = localStorage.getItem("earnRushRefCode");
    if (!code) {
      code = "u" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("earnRushRefCode", code);
    }
    return code;
  }

  function getOrCreateVisitorId() {
    let id = localStorage.getItem("earnRushVisitorId");
    if (!id) {
      id = "v" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem("earnRushVisitorId", id);
    }
    return id;
  }

  function isClaimed(tier, state) {
    return state.claimedRewards.includes(tier.id);
  }

  function openWhatsAppShare() {
    const myCode = getOrCreateRefCode();
    const link = `${SHARE_BASE_URL}?ref=${myCode}`;
    const message = `${SHARE_TEXT} ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  async function trackIncomingReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    const visitor = getOrCreateVisitorId();

    try {
      await fetch("/api/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, visitor })
      });
    } catch (error) {
      console.warn("Referral tracking failed", error);
    }
  }

  async function refreshReferralCount() {
    const myCode = getOrCreateRefCode();
    try {
      const response = await fetch(`/api/check-referral?ref=${myCode}`);
      const data = await response.json();
      referralCount = data.count || 0;
    } catch (error) {
      console.warn("Referral check failed", error);
    }
    renderTiers();
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(refreshReferralCount, POLL_INTERVAL_MS);
  }

  function claimTier(tier) {
    const state = getState();
    if (!state) return;
    if (isClaimed(tier, state)) return;
    if (referralCount < tier.target) return;

    state.claimedRewards.push(tier.id);
    window.EarnRushGame.addCoins(tier.coins);
    window.EarnRushGame.addXP(tier.xp);
    window.EarnRushGame.showMessage(`🎉 Claimed! +${tier.coins} 🪙, +${tier.xp} XP`);
    renderTiers();
  }

  function renderTiers() {
    const container = document.getElementById("missionsList");
    if (!container) return;

    const state = getState();
    if (!state) return;

    const existing = document.getElementById("referralTiers");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "referralTiers";

    const shareRow = document.createElement("div");
    shareRow.className = "mission-card";
    shareRow.innerHTML = `
      <div class="mission-icon">📤</div>
      <div class="mission-content">
        <div class="mission-title">Share Your Link</div>
        <div class="mission-description">Referrals: ${referralCount}</div>
      </div>
      <div class="mission-reward">
        <button type="button" id="shareTaskBtn">Share</button>
      </div>
    `;
    wrapper.appendChild(shareRow);

    tiers.forEach(tier => {
      const claimed = isClaimed(tier, state);
      const unlocked = referralCount >= tier.target;
      const progress = Math.min(referralCount, tier.target);
      const percent = Math.min((progress / tier.target) * 100, 100);

      const card = document.createElement("div");
      card.className = `mission-card ${claimed ? "completed" : ""}`;
      card.innerHTML = `
        <div class="mission-icon">${claimed ? "✓" : "🎯"}</div>
        <div class="mission-content">
          <div class="mission-title">${tier.target} Referral${tier.target > 1 ? "s" : ""}</div>
          <div class="mission-description">+${tier.coins} 🪙, +${tier.xp} XP</div>
          <div class="mission-progress">
            <div class="mission-progress-track">
              <div class="mission-progress-fill" style="width:${percent}%"></div>
            </div>
            <span>${progress}/${tier.target}</span>
          </div>
        </div>
        <div class="mission-reward">
          ${claimed
            ? "Claimed"
            : `<button type="button" class="claimBtn" data-id="${tier.id}" ${unlocked ? "" : "disabled"}>Claim</button>`}
        </div>
      `;
      wrapper.appendChild(card);
    });

    container.appendChild(wrapper);

    const shareBtn = document.getElementById("shareTaskBtn");
    if (shareBtn) shareBtn.addEventListener("click", openWhatsAppShare);

    wrapper.querySelectorAll(".claimBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tierId = btn.getAttribute("data-id");
        const tier = tiers.find(t => t.id === tierId);
        if (tier) claimTier(tier);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    trackIncomingReferral();
    setTimeout(() => {
      refreshReferralCount();
      startPolling();
    }, 50);
  });

  window.EarnRushSharing = {
    render: renderTiers
  };
})();
