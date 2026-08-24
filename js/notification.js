/* =========================================================
   EARNRUSH — NOTIFICATIONS
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushNotificationsLoaded) return;
  window.__earnRushNotificationsLoaded = true;

  const NOTIF_KEY = "earnRushNotifications";

  let notifications = [];

  const dom = {
    bellBtn: null,
    badge: null,
    overlay: null,
    panel: null,
    list: null,
    closeBtn: null
  };

  function loadNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
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

  function cacheDom() {
    dom.bellBtn = document.getElementById("notifBellBtn");
    dom.badge = document.getElementById("notifBadge");
    dom.overlay = document.getElementById("notifOverlay");
    dom.panel = document.getElementById("notifPanel");
    dom.list = document.getElementById("notifList");
    dom.closeBtn = document.getElementById("notifCloseBtn");
  }

  function unreadCount() {
    return notifications.filter(n => !n.read).length;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function formatTimestamp(ts) {
    try {
      const d = new Date(ts);

      if (isNaN(d.getTime())) return "";

      const now = new Date();

      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      return d.toLocaleDateString([], {
        month: "short",
        day: "numeric"
      });
    } catch {
      return "";
    }
  }

  function renderBadge() {
    if (!dom.badge) return;

    const count = unreadCount();

    const enabled =
      window.EarnRushSettings?.get
        ? window.EarnRushSettings.get("notificationsEnabled")
        : true;

    if (count > 0 && enabled !== false) {
      dom.badge.hidden = false;
      dom.badge.textContent = count > 99
        ? "99+"
        : String(count);
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
      (a, b) => Number(b.timestamp) - Number(a.timestamp)
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
            ${formatTimestamp(n.timestamp)}
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
    if (!dom.overlay) {
      console.warn("notifOverlay not found");
      return;
    }

    dom.overlay.hidden = false;

    // Force visibility on mobile
    dom.overlay.style.display = "flex";
    dom.overlay.classList.add("is-open");

    document.body.classList.add("notifications-open");

    if (dom.bellBtn) {
      dom.bellBtn.setAttribute(
        "aria-expanded",
        "true"
      );
    }

    render();
  }

  function closePanel() {
    if (!dom.overlay) return;

    dom.overlay.hidden = true;
    dom.overlay.style.display = "none";
    dom.overlay.classList.remove("is-open");

    document.body.classList.remove("notifications-open");

    if (dom.bellBtn) {
      dom.bellBtn.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  }

  function togglePanel() {
    if (dom.overlay && !dom.overlay.hidden) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function isOpen() {
    return !!dom.overlay && !dom.overlay.hidden;
  }

  function markAsRead(id) {
    const item = notifications.find(
      n => String(n.id) === String(id)
    );

    if (!item) return;

    item.read = true;

    saveNotifications();
    render();
  }

  function setupEvents() {

    /*
     * EVENT DELEGATION
     * Works even if the header/bell is dynamically replaced.
     */
    document.addEventListener("click", function(e) {

      const bell = e.target.closest("#notifBellBtn");

      if (bell) {
        e.preventDefault();
        e.stopPropagation();

        togglePanel();
        return;
      }

      const close = e.target.closest("#notifCloseBtn");

      if (close) {
        e.preventDefault();
        e.stopPropagation();

        closePanel();
        return;
      }

      if (
        dom.overlay &&
        e.target === dom.overlay
      ) {
        closePanel();
        return;
      }

      const item = e.target.closest("[data-notif-id]");

      if (item) {
        markAsRead(item.dataset.notifId);
      }
    }, true);


    /*
     * Prevent panel clicks from closing overlay.
     */
    if (dom.panel) {
      dom.panel.addEventListener(
        "click",
        e => e.stopPropagation()
      );
    }


    /*
     * ESC
     */
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && isOpen()) {
        closePanel();
      }
    });
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
        n => n.read = true
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
      render();
    }
  };


  function init() {

    cacheDom();

    notifications = loadNotifications();

    setupEvents();

    render();

    // Re-cache DOM shortly after page load.
    // Useful if header/panel is injected dynamically.
    setTimeout(() => {
      cacheDom();
      render();
    }, 300);

    setTimeout(() => {
      cacheDom();
      render();
    }, 1000);
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