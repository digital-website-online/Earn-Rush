/* =========================================================
   EARNRUSH — ADMIN WITHDRAWALS
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
      const {
        data,
        error
      } = await window.supabase.rpc(
        "is_admin"
      );

      if (error) return false;

      return !!data;
    } catch (error) {
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

    ui.showLoading();

    try {
      const {
        data,
        error
      } = await window.supabase.rpc(
        "admin_get_withdrawals"
      );

      if (error) {
        ui.showError(error.message);
        return;
      }

      if (!data || data.length === 0) {
        ui.showEmpty();
        return;
      }

      ui.renderWithdrawals(
        data,
        STATUS_OPTIONS
      );

    } catch (error) {
      ui.showError(
        error?.message ||
        "Failed to load withdrawals."
      );
    }
  }

  async function handleUpdate(itemEl) {
    const id =
      Number(itemEl.dataset.id);

    if (!id) return;

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

    ui.setUpdateLoading(
      itemEl,
      true
    );

    try {
      const {
        error
      } = await window.supabase.rpc(
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


  /*
   * DELETE
   *
   * IMPORTANT:
   * This expects a server-side RPC named:
   *
   * admin_delete_withdrawal
   *
   * I am NOT inventing a direct table delete here.
   * The RPC must enforce admin permission server-side.
   */

  async function handleDelete(itemEl) {
    const id =
      Number(itemEl.dataset.id);

    if (!id) return;

    const confirmed =
      window.confirm(
        "Delete this withdrawal request?\n\nThis action cannot be undone."
      );

    if (!confirmed) return;

    const ui = getUI();

    if (!ui) return;

    ui.setDeleteLoading(
      itemEl,
      true
    );

    try {
      const {
        error
      } = await window.supabase.rpc(
        "admin_delete_withdrawal",
        {
          p_withdrawal_id: id
        }
      );

      if (error) {
        alert(
          `Delete failed: ${error.message}`
        );

        return;
      }

      itemEl.remove();

      if (
        !ui.dom.list.querySelector(
          ".admin-withdrawal-item"
        )
      ) {
        ui.showEmpty();
      }

    } catch (error) {
      alert(
        `Delete failed: ${
          error?.message ||
          "Unknown error"
        }`
      );
    } finally {
      ui.setDeleteLoading(
        itemEl,
        false
      );
    }
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


    /*
     * ADMIN BUTTON
     */

    ui.dom.btn?.addEventListener(
      "click",
      openAdminPanel
    );


    /*
     * CLOSE BUTTON
     */

    ui.dom.closeBtn?.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        closeAdminPanel();
      }
    );


    /*
     * OVERLAY CLICK
     */

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


    /*
     * PANEL MUST NOT CLOSE
     */

    ui.dom.panel?.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      }
    );


    /*
     * ESCAPE
     */

    document.addEventListener(
      "keydown",
      (e) => {
        if (
          e.key === "Escape" &&
          ui.dom.overlay &&
          !ui.dom.overlay.hidden
        ) {
          e.preventDefault();
          closeAdminPanel();
        }
      }
    );


    /*
     * UPDATE + DELETE
     *
     * Event delegation means dynamically
     * rendered cards also work.
     */

    ui.dom.list?.addEventListener(
      "click",
      (e) => {

        const updateBtn =
          e.target.closest(
            ".admin-update-btn"
          );

        if (updateBtn) {
          const item =
            updateBtn.closest(
              ".admin-withdrawal-item"
            );

          if (item) {
            handleUpdate(item);
          }

          return;
        }


        const deleteBtn =
          e.target.closest(
            ".admin-delete-btn"
          );

        if (deleteBtn) {
          const item =
            deleteBtn.closest(
              ".admin-withdrawal-item"
            );

          if (item) {
            handleDelete(item);
          }
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
     * AUTH STATE
     */

    if (
      window.supabase?.auth?.onAuthStateChange
    ) {
      window.supabase.auth.onAuthStateChange(
        () => {
          refreshAdminVisibility();
        }
      );
    }


    /*
     * Initial admin check
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