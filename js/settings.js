/* =========================================================
   EARNRUSH — PREMIUM SETTINGS v2
   Functional + Premium UI Structure
========================================================= */

(() => {
  "use strict";

  if (window.__earnRushSettingsLoaded) return;
  window.__earnRushSettingsLoaded = true;

  const PREFS_KEY = "earnRushPreferences";
  const APP_VERSION = "EarnRush v5.0";

  const defaults = {
    soundEnabled: true,
    animationsEnabled: true,
    notificationsEnabled: true,
    vibrationEnabled: true,
    reduceMotion: window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  };

  let prefs = loadPrefs();
  let audioCtx = null;

  const dom = {};

  /* =====================================================
     STORAGE
  ===================================================== */

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};

      return {
        ...defaults,
        ...(parsed && typeof parsed === "object" ? parsed : {})
      };
    } catch {
      return { ...defaults };
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify(prefs)
      );
    } catch {}
  }

  /* =====================================================
     DOM
  ===================================================== */

  function cacheDom() {
    dom.settingsBtn =
      document.getElementById("settingsBtn");

    dom.overlay =
      document.getElementById("settingsOverlay");

    dom.panel =
      document.getElementById("settingsPanel");

    dom.list =
      document.getElementById("settingsList");

    dom.closeBtn =
      document.getElementById("settingsCloseBtn");
  }

  /* =====================================================
     APPLY PREFERENCES
  ===================================================== */

  function applyEffects() {
    document.documentElement.classList.toggle(
      "no-game-animations",
      !prefs.animationsEnabled
    );

    document.documentElement.classList.toggle(
      "reduce-motion",
      !!prefs.reduceMotion
    );
  }

  /* =====================================================
     SOUND
  ===================================================== */

  function playTapSound() {
    if (!prefs.soundEnabled) return;

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) return;

      audioCtx =
        audioCtx || new AudioContext();

      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const oscillator =
        audioCtx.createOscillator();

      const gain =
        audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;

      gain.gain.setValueAtTime(
        0.07,
        audioCtx.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.08
      );

      oscillator
        .connect(gain)
        .connect(audioCtx.destination);

      oscillator.start();

      oscillator.stop(
        audioCtx.currentTime + 0.09
      );

    } catch {}
  }

  /* =====================================================
     VIBRATION
  ===================================================== */

  function vibrateOnTap() {
    if (!prefs.vibrationEnabled) return;

    try {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {}
  }

  function wireTapFeedback() {
    const tapButton =
      document.getElementById("tapButton");

    if (!tapButton) return;

    tapButton.addEventListener(
      "click",
      () => {
        playTapSound();
        vibrateOnTap();
      },
      { passive: true }
    );
  }

  /* =====================================================
     SETTINGS DATA
  ===================================================== */

  const sections = [

    {
      title: "GAME EXPERIENCE",
      icon: "🎮",

      items: [

        {
          key: "soundEnabled",
          icon: "🔊",
          label: "Sound Effects",
          desc: "Play subtle sounds while tapping."
        },

        {
          key: "animationsEnabled",
          icon: "✨",
          label: "Game Animations",
          desc: "Enable tap, reactor and coin effects."
        },

        {
          key: "vibrationEnabled",
          icon: "📳",
          label: "Vibration",
          desc: "Use haptic feedback when supported."
        }

      ]
    },

    {
      title: "NOTIFICATIONS",
      icon: "🔔",

      items: [

        {
          key: "notificationsEnabled",
          icon: "🔔",
          label: "Notifications",
          desc: "Show notification alerts and unread badges."
        }

      ]
    },

    {
      title: "ACCESSIBILITY",
      icon: "♿",

      items: [

        {
          key: "reduceMotion",
          icon: "🎞️",
          label: "Reduce Motion",
          desc: "Minimize animations across the app."
        }

      ]
    }

  ];

  /* =====================================================
     TOGGLE
  ===================================================== */

  function createToggle(item) {
    return `
      <button
        type="button"
        class="settings-toggle ${prefs[item.key] ? "on" : ""}"
        data-pref-key="${item.key}"
        role="switch"
        aria-checked="${!!prefs[item.key]}"
        aria-label="${item.label}"
      >
        <span class="settings-toggle-knob"></span>
      </button>
    `;
  }

  /* =====================================================
     RENDER
  ===================================================== */

  function render() {
    if (!dom.list) return;

    let html = `
      <div class="settings-hero">

        <div class="settings-hero-icon">
          ⚙️
        </div>

        <div class="settings-hero-content">

          <div class="settings-hero-title">
            Customize EarnRush
          </div>

          <div class="settings-hero-desc">
            Control your gameplay experience and preferences.
          </div>

        </div>

      </div>
    `;

    sections.forEach(section => {

      html += `
        <div class="settings-section">

          <div class="settings-section-title">

            <span class="settings-section-icon">
              ${section.icon}
            </span>

            <span>
              ${section.title}
            </span>

          </div>
      `;

      section.items.forEach(item => {

        html += `
          <div class="settings-row">

            <div class="settings-row-icon">
              ${item.icon}
            </div>

            <div class="settings-row-text">

              <div class="settings-row-label">
                ${item.label}
              </div>

              <div class="settings-row-desc">
                ${item.desc}
              </div>

            </div>

            ${createToggle(item)}

          </div>
        `;

      });

      html += `
        </div>
      `;

    });

    /* APP SECTION */

    html += `
      <div class="settings-section settings-app-section">

        <div class="settings-section-title">

          <span class="settings-section-icon">
            ℹ️
          </span>

          <span>
            APP
          </span>

        </div>

        <div class="settings-row settings-row-static">

          <div class="settings-row-icon">
            🚀
          </div>

          <div class="settings-row-text">

            <div class="settings-row-label">
              EarnRush
            </div>

            <div class="settings-row-desc">
              ${APP_VERSION} • Play. Rush. Level Up.
            </div>

          </div>

          <span class="settings-version-badge">
            v5.0
          </span>

        </div>

        <button
          type="button"
          id="settingsResetBtn"
          class="settings-reset-btn"
        >
          <span>↻</span>
          Reset Preferences
        </button>

        <div class="settings-footer">
          Your game progress and Coins are not affected.
        </div>

      </div>
    `;

    dom.list.innerHTML = html;
  }

  /* =====================================================
     PANEL
  ===================================================== */

  function openPanel() {
    if (!dom.overlay) return;

    dom.overlay.hidden = false;

    dom.settingsBtn?.setAttribute(
      "aria-expanded",
      "true"
    );

    render();

    requestAnimationFrame(() => {
      dom.panel?.classList.add(
        "settings-panel-open"
      );
    });
  }

  function closePanel() {
    if (!dom.overlay) return;

    dom.panel?.classList.remove(
      "settings-panel-open"
    );

    setTimeout(() => {
      if (
        dom.panel &&
        !dom.panel.classList.contains(
          "settings-panel-open"
        )
      ) {
        dom.overlay.hidden = true;
      }
    }, 180);

    dom.settingsBtn?.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  function isOpen() {
    return !!dom.overlay &&
      !dom.overlay.hidden;
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  function setupEvents() {

    dom.settingsBtn?.addEventListener(
      "click",
      () => {
        isOpen()
          ? closePanel()
          : openPanel();
      }
    );

    dom.closeBtn?.addEventListener(
      "click",
      closePanel
    );

    dom.overlay?.addEventListener(
      "click",
      e => {
        if (e.target === dom.overlay) {
          closePanel();
        }
      }
    );

    dom.panel?.addEventListener(
      "click",
      e => e.stopPropagation()
    );

    document.addEventListener(
      "keydown",
      e => {
        if (
          e.key === "Escape" &&
          isOpen()
        ) {
          closePanel();
        }
      }
    );

    dom.list?.addEventListener(
      "click",
      e => {

        const toggle =
          e.target.closest(
            "[data-pref-key]"
          );

        if (toggle) {

          const key =
            toggle.dataset.prefKey;

          if (!(key in prefs)) return;

          prefs[key] =
            !prefs[key];

          savePrefs();
          applyEffects();
          render();

          if (
            key === "notificationsEnabled" &&
            window.EarnRushNotifications
          ) {
            window.EarnRushNotifications.refresh();
          }

          return;
        }

        if (
          e.target.closest(
            "#settingsResetBtn"
          )
        ) {

          prefs = {
            ...defaults
          };

          savePrefs();
          applyEffects();
          render();

          if (
            window.EarnRushNotifications
          ) {
            window.EarnRushNotifications.refresh();
          }

        }

      }
    );
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  window.EarnRushSettings = {

    get(key) {
      return prefs[key];
    },

    getAll() {
      return {
        ...prefs
      };
    }

  };

  /* =====================================================
     INIT
  ===================================================== */

  function init() {

    cacheDom();

    applyEffects();

    setupEvents();

    wireTapFeedback();

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