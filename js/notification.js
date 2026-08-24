/* =========================================================
   EARNRUSH — NOTIFICATIONS
   FINAL MOBILE-SAFE VERSION
========================================================= */

(() => {
  "use strict";

  if (window.__earnRushNotificationsLoaded) return;
  window.__earnRushNotificationsLoaded = true;

  const NOTIF_KEY = "earnRushNotifications";

  let notifications = [];

  const dom = {};

  function cacheDom() {
    dom.bellBtn = document.getElementById("notifBellBtn");
    dom.badge = document.getElementById("notifBadge");
    dom.overlay = document.getElementById("notifOverlay");
    dom.panel = document.getElementById("notifPanel");
    dom.list = document.getElementById("notifList");
    dom.closeBtn = document.getElementById("notifCloseBtn");
  }

  function loadNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveNotifications() {
    try {
      localStorage.setItem(
        NOTIF_KEY,
        JSON.stringify(notifications)
      );
    } catch {}
  }

  function unreadCount() {
    return notifications.filter(n => !n.read).length;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) return "";

    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric"
    });
  }

  function renderBadge() {
    if (!dom.badge) return;

    const count = unreadCount();

    let enabled = true;

    try {
      if (
        window.EarnRushSettings &&
        typeof window.EarnRushSettings.get === "function"
      ) {
        enabled =
          window.EarnRushSettings.get(
            "notificationsEnabled"
          );
      }
    } catch {}

    if (count > 0 && enabled !== false) {
      dom.badge.hidden = false;
      dom.badge.textContent =
        count > 99 ? "99+" : String(count);
    } else {
      dom.badge.hidden = true;
    }
  }

  function renderList() {
    if (!dom.list) return;

    if (!notifications.length) {
      dom.list.innerHTML = `
        <div class="panel-empty-state">
          <div class="panel-empty-icon">🔔</div>
          <div class="panel-empty-text">
            No new notifications
          </div>
        </div>
      `;
      return;
    }

    const sorted = [...notifications].sort(
      (a, b) =>
        Number(b.timestamp) -
        Number(a.timestamp)
    );

    dom.list.innerHTML = sorted.map(n => `
      <div
        class="notif-item ${n.read ? "" : "unread"}"
        data-notif-id="${escapeHtml(n.id)}"
      >
        <div class="notif-item-dot"></div>

        <div class="notif-item-body">
          <div class="notif-item-title">
            ${escapeHtml(n.title)}
          </div>

          <div class="notif-item-message">
            ${escapeHtml(n.message)}
          </div>

          <div class="notif-item-time">
            ${formatTime(n.timestamp)}
          </div>
        </div>
      </div>
    `).join("");
  }

  function render() {
    renderBadge();
    renderList();
  }

  function openPanel() {
    cacheDom();

    if (!dom.overlay) return;

    /*
     * Do NOT use hidden.
     * Existing CSS controls the panel.
     */
    dom.overlay.hidden = false;

    dom.overlay.classList.add("is-open");

    dom.overlay.style.display = "flex";
    dom.overlay.style.visibility = "visible";
    dom.overlay.style.opacity = "1";
    dom.overlay.style.pointerEvents = "auto";

    if (dom.bellBtn) {
      dom.bellBtn.setAttribute(
        "aria-expanded",
        "true"
      );
    }

    render();
  }

  function closePanel() {
    cacheDom();

    if (!dom.overlay) return;

    dom.overlay.classList.remove("is-open");

    dom.overlay.hidden = true;

    dom.overlay.style.display = "none";
    dom.overlay.style.visibility = "hidden";
    dom.overlay.style.opacity = "0";
    dom.overlay.style.pointerEvents = "none";

    if (dom.bellBtn) {
      dom.bellBtn.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  }

  function togglePanel() {
    cacheDom();

    if (!dom.overlay) return;

    const open =
      dom.overlay.classList.contains("is-open");

    if (open) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function markAsRead(id) {
    const notification =
      notifications.find(
        n => String(n.id) === String(id)
      );

    if (!notification) return;

    notification.read = true;

    saveNotifications();
    render();
  }

  function setupEvents() {

    /*
     * CLICK — capture phase
     * Works reliably on mobile.
     */
    document.addEventListener(
      "click",
      function (event) {

        const bell =
          event.target.closest &&
          event.target.closest("#notifBellBtn");

        if (bell) {
          event.preventDefault();
          event.stopPropagation();

          togglePanel();
          return;
        }

        const close =
          event.target.closest &&
          event.target.closest("#notifCloseBtn");

        if (close) {
          event.preventDefault();
          event.stopPropagation();

          closePanel();
          return;
        }

        const item =
          event.target.closest &&
          event.target.closest("[data-notif-id]");

        if (item) {
          markAsRead(
            item.getAttribute("data-notif-id")
          );
          return;
        }

        if (
          dom.overlay &&
          event.target === dom.overlay
        ) {
          closePanel();
        }
      },
      true
    );


    /*
     * TOUCH — important for mobile
     */
    document.addEventListener(
      "touchend",
      function (event) {

        const bell =
          event.target.closest &&
          event.target.closest("#notifBellBtn");

        if (bell) {
          event.preventDefault();
          event.stopPropagation();

          togglePanel();
        }
      },
      {
        capture: true,
        passive: false
      }
    );


    /*
     * ESC
     */
    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Escape" &&
          dom.overlay &&
          dom.overlay.classList.contains("is-open")
        ) {
          closePanel();
        }
      }
    );
  }

  window.EarnRushNotifications = {

    push({ title, message }) {

      if (!title || !message) return null;

      const entry = {
        id:
          `${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,

        title: String(title),
        message: String(message),
        timestamp: Date.now(),
        read: false
      };

      notifications.unshift(entry);

      notifications =
        notifications.slice(0, 100);

      saveNotifications();
      render();

      return entry.id;
    },

    markAllRead() {

      notifications.forEach(
        n => {
          n.read = true;
        }
      );

      saveNotifications();
      render();
    },

    clearAll() {

      notifications = [];

      saveNotifications();
      render();
    },

    getUnreadCount() {
      return unreadCount();
    },

    refresh() {
      cacheDom();
      notifications = loadNotifications();
      render();
    }
  };

  function init() {

    cacheDom();

    notifications =
      loadNotifications();

    /*
     * Make sure initial state is closed.
     */
    if (dom.overlay) {
      dom.overlay.hidden = true;
      dom.overlay.classList.remove("is-open");
      dom.overlay.style.display = "none";
      dom.overlay.style.pointerEvents = "none";
    }

    setupEvents();
    render();
  }

  if (
    document.readyState === "loading"
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