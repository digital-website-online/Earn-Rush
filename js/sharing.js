/* =========================================
   EARNRUSH — WHATSAPP SHARE TASK (Referral verified)
========================================= */
(() => {
  "use strict";

  const SHARE_BASE_URL = "https://earn-rush.vercel.app/";
  const SHARE_TEXT = "🔥 Playing EarnRush and earning real rewards! Tap, level up, and cash out. Try it now:";
  const SHARE_REWARD = 200; // Rs — adjust as needed
  const POLL_INTERVAL_MS = 8000;

  let pollTimer = null;

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

  function isShareCompleted(state) {
    return state.completedMissions.includes("whatsapp_share");
  }

  function openWhatsAppShare() {
    const myCode = getOrCreateRefCode();
    const link = `${SHARE_BASE_URL}?ref=${myCode}`;
    const message = `${SHARE_TEXT} ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    startPolling();
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

  async function checkMyReferral() {
    const state = getState();
    if (!state || isShareCompleted(state)) {
      stopPolling();
      return;
    }

    const myCode = getOrCreateRefCode();

    try {
      const response = await fetch(`/api/check-referral?ref=${myCode}`);
      const data = await response.json();

      if (data.count && data.count >= 1) {
        completeShareTask();
      }
    } catch (error) {
      console.warn("Referral check failed", error);
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(checkMyReferral, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function completeShareTask() {
    const state = getState();
    if (!state || isShareCompleted(state)) return;

    state.completedMissions.push("whatsapp_share");
    window.EarnRushGame.addBalance(SHARE_REWARD);
    window.EarnRushGame.showMessage(`🎉 Share Confirmed! +${SHARE_REWARD} Rs`);
    window.EarnRushGame.save();
    stopPolling();
    renderShareTask();
  }

  function renderShareTask() {
    const container = document.getElementById("missionsList");
    if (!container) return;

    const state = getState();
    if (!state) return;

    const existing = document.getElementById("shareTaskCard");
    if (existing) existing.remove();

    const completed = isShareCompleted(state);

    const card = document.createElement("div");
    card.className = `mission-card ${completed ? "completed" : ""}`;
    card.id = "shareTaskCard";
    card.innerHTML = `
      <div class="mission-icon">${completed ? "✓" : "📤"}</div>
      <div class="mission-content">
        <div class="mission-title">Share on WhatsApp</div>
        <div class="mission-description">${completed ? "Confirmed!" : "Share your link — unlocks when someone opens it"}</div>
      </div>
      <div class="mission-reward">
        ${completed ? "Claimed" : `<button type="button" id="shareTaskBtn">Share</button>`}
      </div>
    `;
    container.appendChild(card);

    if (!completed) {
      const btn = document.getElementById("shareTaskBtn");
      if (btn) btn.addEventListener("click", openWhatsAppShare);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    trackIncomingReferral();
    setTimeout(renderShareTask, 50);

    const state = getState();
    if (state && !isShareCompleted(state)) {
      startPolling();
    }
  });

  window.EarnRushSharing = {
    render: renderShareTask
  };
})();