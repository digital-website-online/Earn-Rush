/* =========================================================
   EARNRUSH — UI
   -----------------------------------------------------------
   Central UI helpers.
   This module handles DOM rendering and visual UI state.
   Feature/business logic remains in feature modules.
   ========================================================= */

(() => {
  "use strict";

  window.EarnRushUI = window.EarnRushUI || {};

  const UI = window.EarnRushUI;

  /* ---------------------------------------------------------
     ADMIN UI
     --------------------------------------------------------- */

  UI.admin = {
    dom: {},

    cacheDom() {
      this.dom.btn = document.getElementById("adminPanelBtn");
      this.dom.overlay = document.getElementById("adminOverlay");
      this.dom.panel = document.getElementById("adminPanel");
      this.dom.list = document.getElementById("adminList");
      this.dom.closeBtn = document.getElementById("adminCloseBtn");
    },

    setVisible(isAdmin) {
      if (this.dom.btn) {
        this.dom.btn.hidden = !isAdmin;
      }

      if (!isAdmin && this.dom.overlay && !this.dom.overlay.hidden) {
        this.close();
      }
    },

    open() {
      if (!this.dom.overlay) return;

      this.dom.overlay.hidden = false;
    },

    close() {
      if (!this.dom.overlay) return;

      this.dom.overlay.hidden = true;
    },

    showListMessage(message) {
      if (!this.dom.list) return;

      this.dom.list.innerHTML = `
        <div class="panel-empty-text" style="padding:14px;text-align:center;">
          ${message}
        </div>
      `;
    },

    showLoading() {
      this.showListMessage("Loading…");
    },

    showEmpty() {
      this.showListMessage("No withdrawal requests.");
    },

    showError(message) {
      this.showListMessage(message);
    },

    renderWithdrawals(data, statusOptions) {
      if (!this.dom.list) return;

      this.dom.list.innerHTML = data.map(w => `
        <div class="admin-withdrawal-item" data-id="${w.id}">
          <div class="withdraw-history-row">
            <strong>${Number(w.coins).toLocaleString()} 🪙 → Rs ${w.cash_amount}</strong>
            <span class="withdraw-status-badge status-${w.status}">${w.status}</span>
          </div>

          <div class="withdraw-history-meta">
            ${w.payment_method} — ${w.payment_account}
          </div>

          <div class="withdraw-history-meta">
            ${new Date(w.created_at).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
            ${w.transaction_reference
              ? ` • Ref: ${w.transaction_reference}`
              : ""}
          </div>

          <div class="admin-update-row">
            <select class="admin-status-select">
              ${statusOptions.map(s => `
                <option value="${s}" ${s === w.status ? "selected" : ""}>
                  ${s}
                </option>
              `).join("")}
            </select>

            <input
              type="text"
              class="admin-note-input"
              placeholder="Admin note"
              value="${w.admin_note || ""}"
            >

            <input
              type="text"
              class="admin-ref-input"
              placeholder="Transaction reference"
              value="${w.transaction_reference || ""}"
            >

            <button type="button" class="admin-update-btn">
              Update
            </button>
          </div>
        </div>
      `).join("");
    },

    setUpdateLoading(itemEl, loading) {
      const btn = itemEl?.querySelector(".admin-update-btn");

      if (!btn) return;

      btn.disabled = loading;
    }
  };
})();