/* =========================================================
   EARNRUSH — NOTIFICATIONS
   -----------------------------------------------------------
   Clean, ready-to-use notification system. Starts empty — no
   fake/hardcoded notifications. Future real notifications can be
   added via window.EarnRushNotifications.push({ title, message }).

   Data shape (persisted to localStorage under NOTIF_KEY):
     { id, title, message, timestamp, read }
   ========================================================= */

(() => {
  "use strict";

  if (window.__earnRushNotificationsLoaded) return;
  window.__earnRushNotificationsLoaded = true;

  const NOTIF_KEY = "earnRushNotifications";

  function loadNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveNotifications(list) {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  let notifications = loadNotifications();

  const dom = {};

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

  function formatTimestamp(ts) {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      return sameDay
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function renderBadge() {
    if (!dom.badge) return;
    const count = unreadCount();
    // Respect the "Notifications" preference from Settings — badge
    // still tracked internally, just not shown, if the user muted it.
    const notifsEnabled = window.EarnRushSettings
      ? window.EarnRushSettings.get("notificationsEnabled")
      : true;

    if (count > 0 && notifsEnabled !== false) {
      dom.badge.hidden = false;
      dom.badge.textContent = count > 99 ? "99+" : String(count);
    } else {
      dom.badge.hidden = true;
    }
  }

  function renderList() {
    if (!dom.list) return;

    if (notifications.length === 0) {
      dom.list.innerHTML = `
        <div class="panel-empty-state">
          <div class="panel-empty-icon">🔔</div>
          <div class="panel-empty-text">No new notifications</div>
        </div>
      `;
      return;
    }

    // Newest first.
    const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

    dom.list.innerHTML = sorted.map(n => `
      <div class="notif-item ${n.read ? "" : "unread"}" data-notif-id="${n.id}">
        <div class="notif-item-dot" aria-hidden="true"></div>
        <div class="notif-item-body">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-message">${escapeHtml(n.message)}</div>
          <div class="notif-item-time">${formatTimestamp(n.timestamp)}</div>
        </div>
      </div>
    `).join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function render() {
    renderBadge();
    renderList();
  }

  function markAsRead(id) {
    const n = notifications.find(n => String(n.id) === String(id));
    if (!n || n.read) return;
    n.read = true;
    saveNotifications(notifications);
    render();
  }

  function openPanel() {
  if (!dom.overlay) return;

  dom.overlay.hidden = false;
  dom.overlay.style.display = "flex";

  dom.bellBtn?.setAttribute(
    "aria-expanded",
    "true"
  );

  render();
}

  function closePanel() {
  if (!dom.overlay) return;

  dom.overlay.hidden = true;
  dom.overlay.style.display = "none";

  dom.bellBtn?.setAttribute(
    "aria-expanded",
    "false"
  );
}

  function isOpen() {
    return !!dom.overlay && !dom.overlay.hidden;
  }

  function setupEvents() {
    document.addEventListener("click", (e) => {
  const bell = e.target.closest("#notifBellBtn");

  if (!bell) return;

  e.preventDefault();
  e.stopPropagation();

  if (isOpen()) {
    closePanel();
  } else {
    openPanel();
  }
});

    dom.closeBtn?.addEventListener("click", closePanel);

    // Outside-click / backdrop close — overlay itself is the
    // backdrop, panel click shouldn't bubble to it.
    dom.overlay?.addEventListener("click", (e) => {
      if (e.target === dom.overlay) closePanel();
    });

    dom.panel?.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) closePanel();
    });

    dom.list?.addEventListener("click", (e) => {
      const item = e.target.closest("[data-notif-id]");
      if (item) markAsRead(item.dataset.notifId);
    });
  }

  /* ---------------------------------------------------------
     PUBLIC API — for wiring real notifications in later
  --------------------------------------------------------- */
  window.EarnRushNotifications = {
    // push({ title, message }) -> adds a new unread notification
    push({ title, message }) {
      if (!title || !message) return null;

      const entry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: String(title),
        message: String(message),
        timestamp: Date.now(),
        read: false
      };

      notifications.unshift(entry);
      // Keep this bounded so localStorage doesn't grow unbounded.
      notifications = notifications.slice(0, 100);
      saveNotifications(notifications);
      render();
      return entry.id;
    },

    markAllRead() {
      notifications.forEach(n => { n.read = true; });
      saveNotifications(notifications);
      render();
    },

    clearAll() {
      notifications = [];
      saveNotifications(notifications);
      render();
    },

    getUnreadCount: unreadCount,
    refresh: render
  };

  function init() {
    cacheDom();
    setupEvents();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
