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
/* ---------------------------------------------------------
   AUTH UI
   --------------------------------------------------------- */

(() => {
  "use strict";

  window.EarnRushUI = window.EarnRushUI || {};

  const UI = window.EarnRushUI;

  UI.auth = {
    dom: {},

    cacheDom() {
      this.dom.overlay = document.getElementById("authOverlay");
      this.dom.panel = document.getElementById("authPanel");
      this.dom.closeBtn = document.getElementById("authCloseBtn");

      this.dom.tabLogin = document.getElementById("authTabLogin");
      this.dom.tabSignup = document.getElementById("authTabSignup");

      this.dom.loginForm = document.getElementById("authLoginForm");
      this.dom.signupForm = document.getElementById("authSignupForm");

      this.dom.errorEl = document.getElementById("authError");

      this.dom.userChip = document.getElementById("authUserChip");
      this.dom.guestActions = document.getElementById("authGuestActions");
      this.dom.loginBtn = document.getElementById("authLoginBtn");
      this.dom.signupBtn = document.getElementById("authSignupBtn");
    },

    showError(message) {
      if (!this.dom.errorEl) return;

      this.dom.errorEl.textContent = message;
      this.dom.errorEl.hidden = !message;
    },

    setMode(mode) {
      const isLogin = mode === "login";

      this.dom.tabLogin?.classList.toggle("active", isLogin);
      this.dom.tabSignup?.classList.toggle("active", !isLogin);

      if (this.dom.loginForm) {
        this.dom.loginForm.hidden = !isLogin;
      }

      if (this.dom.signupForm) {
        this.dom.signupForm.hidden = isLogin;
      }

      this.showError("");
    },

    open(mode = "login") {
      if (!this.dom.overlay) return;

      this.showError("");
      this.setMode(mode);

      this.dom.overlay.hidden = false;
    },

    close() {
      if (!this.dom.overlay) return;

      this.dom.overlay.hidden = true;
    },

    renderUserChip(user, profile) {
      const loggedIn = !!user;

      if (this.dom.guestActions) {
        this.dom.guestActions.hidden = loggedIn;
      }

      if (this.dom.userChip) {
        this.dom.userChip.hidden = !loggedIn;

        if (loggedIn) {
          this.dom.userChip.textContent =
            profile?.name ||
            user?.email ||
            "Account";
        }
      }
    },

    setupEvents({
      onLogin,
      onSignup,
      onLogout,
      onClose
    } = {}) {
      this.dom.closeBtn?.addEventListener(
        "click",
        () => {
          this.close();
          onClose?.();
        }
      );

      this.dom.overlay?.addEventListener(
        "click",
        (e) => {
          if (e.target === this.dom.overlay) {
            this.close();
            onClose?.();
          }
        }
      );

      this.dom.panel?.addEventListener(
        "click",
        (e) => e.stopPropagation()
      );

      document.addEventListener(
        "keydown",
        (e) => {
          if (
            e.key === "Escape" &&
            this.dom.overlay &&
            !this.dom.overlay.hidden
          ) {
            this.close();
            onClose?.();
          }
        }
      );

      this.dom.tabLogin?.addEventListener(
        "click",
        () => this.setMode("login")
      );

      this.dom.tabSignup?.addEventListener(
        "click",
        () => this.setMode("signup")
      );

      this.dom.loginBtn?.addEventListener(
        "click",
        () => this.open("login")
      );

      this.dom.signupBtn?.addEventListener(
        "click",
        () => this.open("signup")
      );

      this.dom.loginForm?.addEventListener(
        "submit",
        (e) => onLogin?.(e)
      );

      this.dom.signupForm?.addEventListener(
        "submit",
        (e) => onSignup?.(e)
      );

      this.dom.userChip?.addEventListener(
        "click",
        () => onLogout?.()
      );
    }
  };
})();