/* =========================================================
   EARNRUSH — ADMIN WITHDRAWALS
   -----------------------------------------------------------
   Admin status is determined ONLY by calling the real
   public.is_admin() RPC.

   Server-side security remains authoritative:
   admin_get_withdrawals and admin_update_withdrawal
   independently enforce admin access.

   UI/performance improvements only.
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushAdminLoaded) return;

  window.__earnRushAdminLoaded = true;

  const STATUS_OPTIONS = [
    "pending",
    "processing",
    "paid",
    "rejected"
  ];

  let loadSequence = 0;
  let updateInProgress = false;

  function getUI() {
    return window.EarnRushUI?.admin || null;
  }

  async function checkIsAdmin() {
    if (
      !window.supabase ||
      !window.EarnRushAuth?.getUser()
    ) {
      return false;
    }

    try {
      const { data, error } =
        await window.supabase.rpc(
          "is_admin"
        );

      if (error) {
        return false;
      }

      return !!data;
    } catch (e) {
      return false;
    }
  }

  async function refreshAdminVisibility() {
    const ui = getUI();

    if (!ui) return;

    const isAdmin =
      await checkIsAdmin();

    ui.setVisible(isAdmin);
  }

  async function loadWithdrawals() {
    const ui = getUI();

    if (!ui?.dom.list) return;

    const currentSequence =
      ++loadSequence;

    ui.showLoading();

    try {
      const { data, error } =
        await window.supabase.rpc(
          "admin_get_withdrawals"
        );

      /*
       * If another load started after this one,
       * do not overwrite the newer UI state.
       */
      if (
        currentSequence !==
        loadSequence
      ) {
        return;
      }

      if (error) {
        ui.showError(
          error.message
        );
        return;
      }

      if (
        !data ||
        data.length === 0
      ) {
        ui.showEmpty();
        return;
      }

      ui.renderWithdrawals(
        data,
        STATUS_OPTIONS
      );

    } catch (error) {
      if (
        currentSequence !==
        loadSequence
      ) {
        return;
      }

      ui.showError(
        error?.message ||
        "Unable to load withdrawal requests."
      );
    }
  }

  async function handleUpdate(itemEl) {
    if (
      !itemEl ||
      updateInProgress
    ) {
      return;
    }

    const id =
      Number(
        itemEl.dataset.id
      );

    if (
      !Number.isFinite(id)
    ) {
      return;
    }

    const status =
      itemEl.querySelector(
        ".admin-status-select"
      )?.value;

    const note =
      itemEl.querySelector(
        ".admin-note-input"
      )?.value || null;

    const ref =
      itemEl.querySelector(
        ".admin-ref-input"
      )?.value || null;

    const ui = getUI();

    if (!ui) return;

    /*
     * Only lock this particular request card.
     * Other UI remains responsive.
     */
    ui.setUpdateLoading(
      itemEl,
      true
    );

    try {
      const { data, error } =
        await window.supabase.rpc(
          "admin_update_withdrawal",
          {
            p_withdrawal_id: id,
            p_status: status,
            p_admin_note: note,
            p_transaction_reference: ref
          }
        );

      if (error) {
        alert(
          `Update failed: ${error.message}`
        );
        return;
      }

      /*
       * Re-render from authoritative
       * server state exactly as before.
       */
      await loadWithdrawals();

    } catch (error) {
      alert(
        `Update failed: ${
          error?.message ||
          "Unknown error"
        }`
      );
    } finally {
      ui.setUpdateLoading(
        itemEl,
        false
      );
    }
  }

  function openAdminPanel() {
    const ui = getUI();

    if (!ui) return;

    ui.open();

    /*
     * Start loading after the panel has been
     * opened so the opening interaction itself
     * stays lightweight.
     */
    loadWithdrawals();
  }

  function closeAdminPanel() {
    const ui = getUI();

    if (!ui) return;

    /*
     * Invalidate any older render result.
     * A late response cannot overwrite a newer state.
     */
    loadSequence++;

    ui.close();
  }

  function setupEvents() {
    const ui = getUI();

    if (!ui) return;

    ui.dom.btn?.addEventListener(
      "click",
      openAdminPanel
    );

    ui.dom.closeBtn?.addEventListener(
      "click",
      closeAdminPanel
    );

    ui.dom.overlay?.addEventListener(
      "click",
      (e) => {
        if (
          e.target ===
          ui.dom.overlay
        ) {
          closeAdminPanel();
        }
      }
    );

    ui.dom.panel?.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      }
    );

    document.addEventListener(
      "keydown",
      (e) => {
        if (
          e.key === "Escape" &&
          ui.dom.overlay &&
          !ui.dom.overlay.hidden
        ) {
          closeAdminPanel();
        }
      }
    );

    /*
     * Event delegation:
     * one listener for the whole list,
     * not one listener per withdrawal card.
     */
    ui.dom.list?.addEventListener(
      "click",
      (e) => {
        const btn =
          e.target.closest(
            ".admin-update-btn"
          );

        if (!btn) return;

        const item =
          btn.closest(
            ".admin-withdrawal-item"
          );

        if (item) {
          handleUpdate(item);
        }
      }
    );
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

    /*
     * Re-check admin visibility whenever
     * auth state changes.
     *
     * Logout immediately hides the button.
     */
    if (
      window.supabase?.auth
        ?.onAuthStateChange
    ) {
      window.supabase.auth.onAuthStateChange(
        () => {
          refreshAdminVisibility();
        }
      );
    }

    /*
     * Initial check after auth restoration.
     */
    setTimeout(
      refreshAdminVisibility,
      400
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();