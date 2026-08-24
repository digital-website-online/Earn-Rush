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

(() => {
  "use strict";

  window.EarnRushUI = window.EarnRushUI || {};

  const UI = window.EarnRushUI;

  UI.admin = {
    dom: {},

    cacheDom() {
      this.dom.btn =
        document.getElementById("adminPanelBtn");

      this.dom.overlay =
        document.getElementById("adminOverlay");

      this.dom.panel =
        document.getElementById("adminPanel");

      this.dom.list =
        document.getElementById("adminList");

      this.dom.closeBtn =
        document.getElementById("adminCloseBtn");
    },

    setVisible(isAdmin) {
      if (this.dom.btn) {
        this.dom.btn.hidden = !isAdmin;
      }

      if (!isAdmin) {
        this.close();
      }
    },

    open() {
      if (!this.dom.overlay) return;

      this.dom.overlay.hidden = false;

      document.body.classList.add(
        "admin-panel-open"
      );

      requestAnimationFrame(() => {
        this.dom.closeBtn?.focus?.();
      });
    },

    close() {
      if (!this.dom.overlay) return;

      this.dom.overlay.hidden = true;

      document.body.classList.remove(
        "admin-panel-open"
      );
    },

    showListMessage(message) {
      if (!this.dom.list) return;

      this.dom.list.innerHTML = `
        <div class="panel-empty-text">
          ${String(message)}
        </div>
      `;
    },

    showLoading() {
      this.showListMessage("Loading…");
    },

    showEmpty() {
      this.showListMessage(
        "No withdrawal requests."
      );
    },

    showError(message) {
      this.showListMessage(
        String(message || "Something went wrong.")
      );
    },

    renderWithdrawals(data, statusOptions) {
      if (!this.dom.list) return;

      this.dom.list.innerHTML = data.map(w => `
        <div
          class="admin-withdrawal-item"
          data-id="${Number(w.id)}"
        >

          <div class="withdraw-history-row">
            <strong>
              ${Number(w.coins).toLocaleString()}
              🪙 → Rs ${w.cash_amount}
            </strong>

            <span
              class="withdraw-status-badge status-${w.status}"
            >
              ${w.status}
            </span>
          </div>

          <div class="withdraw-history-meta">
            ${w.payment_method || ""}
            — 
            ${w.payment_account || ""}
          </div>

          <div class="withdraw-history-meta">
            ${new Date(w.created_at).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}

            ${
              w.transaction_reference
                ? ` • Ref: ${w.transaction_reference}`
                : ""
            }
          </div>

          <div class="admin-update-row">

            <select class="admin-status-select">
              ${statusOptions.map(s => `
                <option
                  value="${s}"
                  ${s === w.status ? "selected" : ""}
                >
                  ${s}
                </option>
              `).join("")}
            </select>

            <input
              type="text"
              class="admin-note-input"
              placeholder="Admin note"
              value="${String(
                w.admin_note || ""
              ).replace(/"/g, "&quot;")}"
            >

            <input
              type="text"
              class="admin-ref-input"
              placeholder="Transaction reference"
              value="${String(
                w.transaction_reference || ""
              ).replace(/"/g, "&quot;")}"
            >

            <button
              type="button"
              class="admin-update-btn"
            >
              Update
            </button>

            <button
              type="button"
              class="admin-delete-btn"
              data-delete-id="${Number(w.id)}"
            >
              Delete
            </button>

          </div>

        </div>
      `).join("");
    },

    setUpdateLoading(itemEl, loading) {
      const btn =
        itemEl?.querySelector(
          ".admin-update-btn"
        );

      if (!btn) return;

      btn.disabled = loading;
    },

    setDeleteLoading(itemEl, loading) {
      const btn =
        itemEl?.querySelector(
          ".admin-delete-btn"
        );

      if (!btn) return;

      btn.disabled = loading;
    }
  };
})();

  /* ---------------------------------------------------------
     AUTH UI
     --------------------------------------------------------- */

  UI.auth = {
    dom: {},

    cacheDom() {
      this.dom.overlay =
        document.getElementById("authOverlay");

      this.dom.panel =
        document.getElementById("authPanel");

      this.dom.closeBtn =
        document.getElementById("authCloseBtn");

      this.dom.tabLogin =
        document.getElementById("authTabLogin");

      this.dom.tabSignup =
        document.getElementById("authTabSignup");

      this.dom.loginForm =
        document.getElementById("authLoginForm");

      this.dom.signupForm =
        document.getElementById("authSignupForm");

      this.dom.errorEl =
        document.getElementById("authError");

      this.dom.userChip =
        document.getElementById("authUserChip");

      this.dom.guestActions =
        document.getElementById("authGuestActions");

      this.dom.loginBtn =
        document.getElementById("authLoginBtn");

      this.dom.signupBtn =
        document.getElementById("authSignupBtn");
    },

    showError(message) {
      if (!this.dom.errorEl) return;

      this.dom.errorEl.textContent =
        message;

      this.dom.errorEl.hidden =
        !message;
    },

    setMode(mode) {
      const isLogin =
        mode === "login";

      this.dom.tabLogin?.classList.toggle(
        "active",
        isLogin
      );

      this.dom.tabSignup?.classList.toggle(
        "active",
        !isLogin
      );

      if (this.dom.loginForm) {
        this.dom.loginForm.hidden =
          !isLogin;
      }

      if (this.dom.signupForm) {
        this.dom.signupForm.hidden =
          isLogin;
      }

      this.showError("");
    },

    open(mode = "login") {
      if (!this.dom.overlay) return;

      this.showError("");

      this.setMode(mode);

      this.dom.overlay.hidden =
        false;
    },

    close() {
      if (!this.dom.overlay) return;

      this.dom.overlay.hidden =
        true;
    },

    renderUserChip(user, profile) {
      const loggedIn =
        !!user;

      if (this.dom.guestActions) {
        this.dom.guestActions.hidden =
          loggedIn;
      }

      if (this.dom.userChip) {
        this.dom.userChip.hidden =
          !loggedIn;

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
          if (
            e.target ===
            this.dom.overlay
          ) {
            this.close();
            onClose?.();
          }
        }
      );

      this.dom.panel?.addEventListener(
        "click",
        (e) =>
          e.stopPropagation()
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
        () =>
          this.setMode("login")
      );

      this.dom.tabSignup?.addEventListener(
        "click",
        () =>
          this.setMode("signup")
      );

      this.dom.loginBtn?.addEventListener(
        "click",
        () =>
          this.open("login")
      );

      this.dom.signupBtn?.addEventListener(
        "click",
        () =>
          this.open("signup")
      );

      this.dom.loginForm?.addEventListener(
        "submit",
        (e) =>
          onLogin?.(e)
      );

      this.dom.signupForm?.addEventListener(
        "submit",
        (e) =>
          onSignup?.(e)
      );

      this.dom.userChip?.addEventListener(
        "click",
        () =>
          onLogout?.()
      );
    }
  };


  /* ---------------------------------------------------------
     GAME UI
     --------------------------------------------------------- */

  UI.game = {
    dom: {},

    cacheDom() {
      this.dom.coins =
        document.getElementById("balance");

      this.dom.level =
        document.getElementById("levelValue");

      this.dom.reactorCore =
        document.getElementById("reactorCore");

      this.dom.tapButton =
        document.getElementById("tapButton");

      this.dom.progressFill =
        document.querySelector(
          ".progress-fill"
        );

      this.dom.comboValue =
        document.querySelector(
          ".combo-value"
        );

      this.dom.xpBar =
        document.getElementById("xpBar");

      this.dom.xpText =
        document.getElementById("xpText");

      this.dom.streak =
        document.getElementById(
          "streakValue"
        );
    },

    formatNumber(value) {
      const number =
        Number(value) || 0;

      return number.toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );
    },

    updateCoins(value) {
      if (!this.dom.coins) return;

      this.dom.coins.textContent =
        this.formatNumber(value);
    },

    updateLevel(value) {
      if (!this.dom.level) return;

      this.dom.level.textContent =
        String(value).padStart(
          2,
          "0"
        );
    },

    updateCombo(value) {
      if (!this.dom.comboValue) return;

      this.dom.comboValue.textContent =
        `🔥 x${value}`;
    },

    updateComboProgress(value) {
      if (!this.dom.progressFill) return;

      const progress =
        Math.max(
          0,
          Math.min(
            100,
            Number(value) || 0
          )
        );

      this.dom.progressFill.style.width =
        `${progress}%`;
    },

    updateXP(current, required) {
      const needed =
        Math.max(
          1,
          Number(required) || 1
        );

      const xp =
        Math.max(
          0,
          Number(current) || 0
        );

      const percentage =
        Math.min(
          100,
          (xp / needed) * 100
        );

      if (this.dom.xpBar) {
        this.dom.xpBar.style.width =
          `${percentage}%`;
      }

      if (this.dom.xpText) {
        this.dom.xpText.textContent =
          `${xp} / ${needed} XP`;
      }
    },

    updateStreak(value) {
      if (!this.dom.streak) return;

      this.dom.streak.textContent =
        `🔥 ${value} Day`;
    },

    update({
      coins,
      level,
      combo,
      comboProgress,
      xp,
      xpToNextLevel,
      streak
    }) {
      this.updateCoins(coins);
      this.updateLevel(level);
      this.updateCombo(combo);
      this.updateComboProgress(
        comboProgress
      );
      this.updateXP(
        xp,
        xpToNextLevel
      );
      this.updateStreak(streak);
    },

    reactorEffect() {
      if (!this.dom.reactorCore) return;

      this.dom.reactorCore.classList.remove(
        "tap-pop"
      );

      void this.dom.reactorCore.offsetWidth;

      this.dom.reactorCore.classList.add(
        "tap-pop"
      );
    },

    coinsEffect() {
      if (!this.dom.coins) return;

      this.dom.coins.classList.remove(
        "balance-pop"
      );

      void this.dom.coins.offsetWidth;

      this.dom.coins.classList.add(
        "balance-pop"
      );
    },

    createRewardPopup(
      amount,
      type = "coins"
    ) {
      const value =
        Number(amount) || 0;

      const popup =
        document.createElement("div");

      const icon =
        type === "coins"
          ? "🪙"
          : "💰";

      popup.textContent =
        `+${this.formatNumber(value)} ${icon}`;

      popup.className =
        "earnrush-reward-popup";

      Object.assign(
        popup.style,
        {
          position: "fixed",
          left: "50%",
          top: "45%",
          transform:
            "translate(-50%, -50%)",
          color: "#39ff88",
          fontSize: "22px",
          fontWeight: "900",
          pointerEvents: "none",
          zIndex: "9999",
          textShadow:
            "0 0 15px rgba(57,255,136,.5)"
        }
      );

      document.body.appendChild(
        popup
      );

      if (
        typeof popup.animate ===
        "function"
      ) {
        const animation =
          popup.animate(
            [
              {
                opacity: 0,
                transform:
                  "translate(-50%, -30%) scale(.7)"
              },
              {
                opacity: 1,
                transform:
                  "translate(-50%, -50%) scale(1)"
              },
              {
                opacity: 0,
                transform:
                  "translate(-50%, -100%) scale(1.15)"
              }
            ],
            {
              duration: 700,
              easing: "ease-out"
            }
          );

        animation.onfinish =
          () => {
            popup.remove();
          };
      } else {
        setTimeout(
          () => popup.remove(),
          700
        );
      }
    },

    showMessage(text) {
      const oldMessage =
        document.querySelector(
          ".earnrush-game-message"
        );

      if (oldMessage) {
        oldMessage.remove();
      }

      const message =
        document.createElement("div");

      message.className =
        "earnrush-game-message";

      message.textContent =
        String(text);

      Object.assign(
        message.style,
        {
          position: "fixed",
          left: "50%",
          top: "18%",
          transform:
            "translateX(-50%)",
          padding: "12px 20px",
          borderRadius: "14px",
          background: "#0b1625",
          border:
            "1px solid rgba(57,255,136,.35)",
          color: "#ffffff",
          fontWeight: "900",
          zIndex: "10000",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          maxWidth:
            "calc(100vw - 30px)",
          textAlign: "center"
        }
      );

      document.body.appendChild(
        message
      );

      if (
        typeof message.animate ===
        "function"
      ) {
        const animation =
          message.animate(
            [
              {
                opacity: 0,
                transform:
                  "translate(-50%, -10px)"
              },
              {
                opacity: 1,
                transform:
                  "translate(-50%, 0)"
              },
              {
                opacity: 0,
                transform:
                  "translate(-50%, -10px)"
              }
            ],
            {
              duration: 1200,
              easing: "ease-out"
            }
          );

        animation.onfinish =
          () => {
            message.remove();
          };
      } else {
        setTimeout(
          () => message.remove(),
          1200
        );
      }
    },

    showTapTapLockPopup({
      onComplete,
      onUnavailable
    } = {}) {

      const existing =
        document.getElementById(
          "tapTapLockPopup"
        );

      if (existing) {
        existing.remove();
      }

      const popup =
        document.createElement("div");

      popup.id =
        "tapTapLockPopup";

      popup.className =
        "error-popup";

      popup.innerHTML = `
        <div class="error-popup-icon">
          🔒
        </div>

        <div class="error-popup-title">
          Tap-Tap Locked
        </div>

        <div class="error-popup-message">
          Watch 1 short ad to unlock Tap-Tap again.
        </div>

        <button
          class="error-popup-btn primary"
     type="button"
          id="tapTapWatchAdBtn"
        >
          Watch Ad to Unlock
        </button>

        <button
          class="error-popup-btn"
          type="button"
          id="tapTapClosePopupBtn"
        >
          Close
        </button>
      `;

      document.body.appendChild(
        popup
      );

      document
        .getElementById(
          "tapTapWatchAdBtn"
        )
        ?.addEventListener(
          "click",
          () => {
            onComplete?.(popup);
          }
        );

      document
        .getElementById(
          "tapTapClosePopupBtn"
        )
        ?.addEventListener(
          "click",
          () => {
            popup.remove();
          }
        );

      return popup;
    },

    init() {
      this.cacheDom();
    }
  };

})();