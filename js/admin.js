/* =========================================================
   EARNRUSH — ADMIN WITHDRAWALS
   -----------------------------------------------------------
   Admin status is determined ONLY by calling the real
   public.is_admin() RPC (which checks admin_users server-side).
   There is no client-side/localStorage admin flag anywhere in
   this file — an ordinary user cannot make this panel appear no
   matter what they set in devtools, because the actual data fetch
   (admin_get_withdrawals) independently re-checks is_admin() again
   on the server and raises an exception for non-admins regardless
   of whether this button is visible.
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushAdminLoaded) return;
  window.__earnRushAdminLoaded = true;

  const STATUS_OPTIONS = ["processing", "paid", "rejected"];

  const dom = {};

  function cacheDom() {
    dom.btn = document.getElementById("adminPanelBtn");
    dom.overlay = document.getElementById("adminOverlay");
    dom.panel = document.getElementById("adminPanel");
    dom.list = document.getElementById("adminList");
    dom.closeBtn = document.getElementById("adminCloseBtn");
  }

  async function checkIsAdmin() {
    if (!window.supabase || !window.EarnRushAuth?.getUser()) return false;
    try {
      const { data, error } = await window.supabase.rpc("is_admin");
      if (error) return false;
      return !!data;
    } catch (e) {
      return false;
    }
  }

  async function refreshAdminVisibility() {
    const isAdmin = await checkIsAdmin();
    if (dom.btn) dom.btn.hidden = !isAdmin;
    if (!isAdmin && dom.overlay && !dom.overlay.hidden) closeAdminPanel();
  }

  async function loadWithdrawals() {
    if (!dom.list) return;
    dom.list.innerHTML = `<div class="panel-empty-text" style="padding:14px;text-align:center;">Loading…</div>`;

    const { data, error } = await window.supabase.rpc("admin_get_withdrawals");

    if (error) {
      // Also covers the case where a non-admin somehow reaches this
      // (e.g. stale UI state) — the RPC itself raises "Admin access
      // required" and this is what the user sees, not fabricated data.
      dom.list.innerHTML = `<div class="panel-empty-text" style="padding:14px;text-align:center;">${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      dom.list.innerHTML = `<div class="panel-empty-text" style="padding:14px;text-align:center;">No withdrawal requests.</div>`;
      return;
    }

    dom.list.innerHTML = data.map(w => `
      <div class="admin-withdrawal-item" data-id="${w.id}">
        <div class="withdraw-history-row">
          <strong>${Number(w.coins).toLocaleString()} 🪙 → Rs ${w.cash_amount}</strong>
          <span class="withdraw-status-badge status-${w.status}">${w.status}</span>
        </div>
        <div class="withdraw-history-meta">
          ${w.payment_method} — ${w.payment_account}
        </div>
        <div class="withdraw-history-meta">
          ${new Date(w.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          ${w.transaction_reference ? ` • Ref: ${w.transaction_reference}` : ""}
        </div>

        <div class="admin-update-row">
          <select class="admin-status-select">
            ${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === w.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <input type="text" class="admin-note-input" placeholder="Admin note" value="${w.admin_note || ""}">
          <input type="text" class="admin-ref-input" placeholder="Transaction reference" value="${w.transaction_reference || ""}">
          <button type="button" class="admin-update-btn">Update</button>
        </div>
      </div>
    `).join("");
  }

  async function handleUpdate(itemEl) {
    const id = Number(itemEl.dataset.id);
    const status = itemEl.querySelector(".admin-status-select")?.value;
    const note = itemEl.querySelector(".admin-note-input")?.value || null;
    const ref = itemEl.querySelector(".admin-ref-input")?.value || null;
    const btn = itemEl.querySelector(".admin-update-btn");

    if (btn) btn.disabled = true;

    const { data, error } = await window.supabase.rpc("admin_update_withdrawal", {
      p_withdrawal_id: id,
      p_status: status,
      p_admin_note: note,
      p_transaction_reference: ref
    });

    if (btn) btn.disabled = false;

    if (error) {
      alert(`Update failed: ${error.message}`);
      return;
    }

    // Re-render this row from the returned, authoritative record.
    await loadWithdrawals();
  }

  function openAdminPanel() {
    if (!dom.overlay) return;
    dom.overlay.hidden = false;
    loadWithdrawals();
  }

  function closeAdminPanel() {
    if (!dom.overlay) return;
    dom.overlay.hidden = true;
  }

  function setupEvents() {
    dom.btn?.addEventListener("click", openAdminPanel);
    dom.closeBtn?.addEventListener("click", closeAdminPanel);
    dom.overlay?.addEventListener("click", (e) => {
      if (e.target === dom.overlay) closeAdminPanel();
    });
    dom.panel?.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dom.overlay && !dom.overlay.hidden) closeAdminPanel();
    });

    dom.list?.addEventListener("click", (e) => {
      const btn = e.target.closest(".admin-update-btn");
      if (!btn) return;
      const item = btn.closest(".admin-withdrawal-item");
      if (item) handleUpdate(item);
    });
  }

  function init() {
    cacheDom();
    setupEvents();

    // Re-check admin visibility whenever auth state changes — a
    // logout must immediately hide the button again.
    if (window.supabase?.auth?.onAuthStateChange) {
      window.supabase.auth.onAuthStateChange(() => {
        refreshAdminVisibility();
      });
    }

    // Initial check, after auth.js has had a moment to restore any
    // existing session.
    setTimeout(refreshAdminVisibility, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
