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

  const STATUS_OPTIONS = ["pending", "processing", "paid", "rejected"];

  function getUI() {
    return window.EarnRushUI?.admin || null;
  }

  async function checkIsAdmin() {
    if (!window.supabase || !window.EarnRushAuth?.getUser()) {
      return false;
    }

    try {
      const { data, error } = await window.supabase.rpc("is_admin");

      if (error) return false;

      return !!data;
    } catch (e) {
      return false;
    }
  }

  async function refreshAdminVisibility() {
    const ui = getUI();
    if (!ui) return;

    const isAdmin = await checkIsAdmin();

    ui.setVisible(isAdmin);
  }

  async function loadWithdrawals() {
    const ui = getUI();

    if (!ui?.dom.list) return;

    ui.showLoading();

    const { data, error } =
      await window.supabase.rpc("admin_get_withdrawals");

    if (error) {
      // The RPC independently enforces admin access server-side.
      ui.showError(error.message);
      return;
    }

    if (!data || data.length === 0) {
      ui.showEmpty();
      return;
    }

    ui.renderWithdrawals(data, STATUS_OPTIONS);
  }

  async function handleUpdate(itemEl) {
    const id = Number(itemEl.dataset.id);

    const status =
      itemEl.querySelector(".admin-status-select")?.value;

    const note =
      itemEl.querySelector(".admin-note-input")?.value || null;

    const ref =
      itemEl.querySelector(".admin-ref-input")?.value || null;

    const ui = getUI();

    if (!ui) return;

    ui.setUpdateLoading(itemEl, true);

    const { data, error } =
      await window.supabase.rpc("admin_update_withdrawal", {
        p_withdrawal_id: id,
        p_status: status,
        p_admin_note: note,
        p_transaction_reference: ref
      });

    ui.setUpdateLoading(itemEl, false);

    if (error) {
      alert(`Update failed: ${error.message}`);
      return;
    }

    // Re-render from the authoritative server response/state.
    await loadWithdrawals();
  }

  function openAdminPanel() {
    const ui = getUI();

    if (!ui) return;

    ui.open();

    loadWithdrawals();
  }

  function closeAdminPanel() {
    const ui = getUI();

    if (!ui) return;

    ui.close();
  }

  function setupEvents() {
    const ui = getUI();

    if (!ui) return;

    ui.dom.btn?.addEventListener("click", openAdminPanel);

    ui.dom.closeBtn?.addEventListener(
      "click",
      closeAdminPanel
    );

    ui.dom.overlay?.addEventListener("click", (e) => {
      if (e.target === ui.dom.overlay) {
        closeAdminPanel();
      }
    });

    ui.dom.panel?.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        ui.dom.overlay &&
        !ui.dom.overlay.hidden
      ) {
        closeAdminPanel();
      }
    });

    ui.dom.list?.addEventListener("click", (e) => {
      const btn = e.target.closest(".admin-update-btn");

      if (!btn) return;

      const item = btn.closest(".admin-withdrawal-item");

      if (item) {
        handleUpdate(item);
      }
    });
  }

  function init() {
    const ui = getUI();

    if (!ui) {
      console.warn(
        "EarnRushUI.admin is not available. Make sure ui.js loads before admin.js."
      );
      return;
    }

    ui.cacheDom();

    setupEvents();

    // Re-check admin visibility whenever auth state changes.
    // Logout must immediately hide the admin button.
    if (window.supabase?.auth?.onAuthStateChange) {
      window.supabase.auth.onAuthStateChange(() => {
        refreshAdminVisibility();
      });
    }

    // Initial check after auth.js has had a moment to restore
    // any existing session.
    setTimeout(refreshAdminVisibility, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();