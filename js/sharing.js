/* =========================================
   EARNRUSH — WHATSAPP SHARE TASK
========================================= */
(() => {
  "use strict";

  const SHARE_URL = "https://earn-rush.vercel.app/";
  const SHARE_TEXT = "🔥 Playing EarnRush and earning real rewards! Tap, level up, and cash out. Try it now:";
  const SHARE_REWARD = 200; // Rs — adjust as needed
  const MIN_AWAY_MS = 4000; // user must be away at least 4s to count as a real share attempt

  let shareClickedAt = null;

  function getState() {
    if (!window.EarnRushGame) return null;
    return window.EarnRushGame.getState();
  }

  function isShareCompleted(state) {
    return state.completedMissions.includes("whatsapp_share");
  }

  function openWhatsAppShare() {
    const message = `${SHARE_TEXT} ${SHARE_URL}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    shareClickedAt = Date.now();
    window.open(url, "_blank");
  }

  function handleVisibilityReturn() {
    if (document.visibilityState !== "visible") return;
    if (!shareClickedAt) return;

    const awayTime = Date.now() - shareClickedAt;
    shareClickedAt = null;

    // Too quick — probably closed WhatsApp without sharing
    if (awayTime < MIN_AWAY_MS) return;

    completeShareTask();
  }

  function completeShareTask() {
    const state = getState();
    if (!state) return;
    if (isShareCompleted(state)) return;

    state.completedMissions.push("whatsapp_share");
    window.EarnRushGame.addBalance(SHARE_REWARD);
    window.EarnRushGame.showMessage(`🎉 Share Task Complete! +${SHARE_REWARD} Rs`);
    window.EarnRushGame.save();
    renderShareTask();
  }

  function renderShareTask() {
    const container = document.getElementById("missionsList");
    if (!container) return;

    const state = getState();
    if (!state) return;

    // Remove old card if it exists (avoid duplicates on re-render)
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
        <div class="mission-description">Share EarnRush with a friend or group</div>
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

  document.addEventListener("visibilitychange", handleVisibilityReturn);
  document.addEventListener("DOMContentLoaded", () => {
    // Small delay so it renders after mission.js's own render
    setTimeout(renderShareTask, 50);
  });

  window.EarnRushSharing = {
    render: renderShareTask
  };
})();

