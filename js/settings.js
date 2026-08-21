/* =========================================================
   EARNRUSH — SETTINGS
   -----------------------------------------------------------
   Every toggle here has a real, working effect:
     - soundEnabled       -> gates a tiny WebAudio tap tone
                              (no external asset — nothing was
                              already wired up to gate, so this
                              adds a minimal real sound instead
                              of a fake toggle)
     - animationsEnabled  -> toggles .no-game-animations on <html>,
                              which mutes the tap/reactor/coin
                              flourish animations in animation.css
     - notificationsEnabled -> read by notifications.js to decide
                              whether to show the unread badge
     - vibrationEnabled   -> gates navigator.vibrate() on tap,
                              added as its OWN listener here rather
                              than editing game.js's performTap()
     - reduceMotion       -> toggles .reduce-motion on <html>,
                              reusing the same rules the existing
                              prefers-reduced-motion media query
                              already defines
   Preferences persist under PREFS_KEY, separate from gameState —
   "reset" here only clears these, never coins/progress.
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

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return { ...defaults, ...parsed };
    } catch (e) {
      return { ...defaults };
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  let prefs = loadPrefs();

  const dom = {};

  function cacheDom() {
    dom.settingsBtn = document.getElementById("settingsBtn");
    dom.overlay = document.getElementById("settingsOverlay");
    dom.panel = document.getElementById("settingsPanel");
    dom.list = document.getElementById("settingsList");
    dom.closeBtn = document.getElementById("settingsCloseBtn");
  }

  /* ---------------------------------------------------------
     APPLY EFFECTS — the part that makes each toggle real
  --------------------------------------------------------- */

  function applyEffects() {
    document.documentElement.classList.toggle("no-game-animations", !prefs.animationsEnabled);
    document.documentElement.classList.toggle("reduce-motion", !!prefs.reduceMotion);
  }

  /* ---------------------------------------------------------
     TAP SOUND — minimal WebAudio tone, no external asset
  --------------------------------------------------------- */

  let audioCtx = null;

  function playTapSound() {
    if (!prefs.soundEnabled) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // WebAudio unsupported — silently skip, sound is non-essential.
    }
  }

  function vibrateOnTap() {
    if (!prefs.vibrationEnabled) return;
    try {
      if (navigator.vibrate) navigator.vibrate(10);
    } catch (e) {}
  }

  // Own, additive listener — does not touch game.js's performTap()
  // at all, so the already-completed Tap-Tap logic (Part G) stays
  // untouched. This only adds feedback effects alongside it.
  function wireTapFeedback() {
    const tapButton = document.getElementById("tapButton");
    if (!tapButton) return;
    tapButton.addEventListener("click", () => {
      playTapSound();
      vibrateOnTap();
    });
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  const TOGGLES = [
    { key: "soundEnabled", label: "Sound Effects", desc: "Short tap sound while playing" },
    { key: "animationsEnabled", label: "Game Animations", desc: "Tap, reactor and coin flourish animations" },
    { key: "notificationsEnabled", label: "Notifications", desc: "Show the unread badge on the bell icon" },
    { key: "vibrationEnabled", label: "Vibration", desc: "Haptic feedback on tap (where supported)" },
    { key: "reduceMotion", label: "Reduce Motion", desc: "Minimize animations across the app" }
  ];

  function render() {
    if (!dom.list) return;

    const toggleRows = TOGGLES.map(t => `
      <div class="settings-row">
        <div class="settings-row-text">
          <div class="settings-row-label">${t.label}</div>
          <div class="settings-row-desc">${t.desc}</div>
        </div>
        <button
          type="button"
          class="settings-toggle ${prefs[t.key] ? "on" : ""}"
          data-pref-key="${t.key}"
          role="switch"
          aria-checked="${!!prefs[t.key]}"
          aria-label="${t.label}"
        ><span class="settings-toggle-knob"></span></button>
      </div>
    `).join("");

    dom.list.innerHTML = `
      ${toggleRows}

      <div class="settings-row settings-row-static">
        <div class="settings-row-text">
          <div class="settings-row-label">App Version</div>
          <div class="settings-row-desc">${APP_VERSION}</div>
        </div>
      </div>

      <button type="button" id="settingsResetBtn" class="settings-reset-btn">
        Reset Preferences to Default
      </button>
    `;
  }

  /* ---------------------------------------------------------
     EVENTS
  --------------------------------------------------------- */

  function openPanel() {
    if (!dom.overlay) return;
    dom.overlay.hidden = false;
    dom.settingsBtn?.setAttribute("aria-expanded", "true");
    render();
  }

  function closePanel() {
    if (!dom.overlay) return;
    dom.overlay.hidden = true;
    dom.settingsBtn?.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return !!dom.overlay && !dom.overlay.hidden;
  }

  function setupEvents() {
    dom.settingsBtn?.addEventListener("click", () => {
      isOpen() ? closePanel() : openPanel();
    });

    dom.closeBtn?.addEventListener("click", closePanel);

    dom.overlay?.addEventListener("click", (e) => {
      if (e.target === dom.overlay) closePanel();
    });

    dom.panel?.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) closePanel();
    });

    dom.list?.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest("[data-pref-key]");
      if (toggleBtn) {
        const key = toggleBtn.dataset.prefKey;
        prefs[key] = !prefs[key];
        savePrefs();
        applyEffects();
        render();
        if (key === "notificationsEnabled" && window.EarnRushNotifications) {
          window.EarnRushNotifications.refresh();
        }
        return;
      }

      if (e.target.id === "settingsResetBtn") {
        prefs = { ...defaults };
        savePrefs();
        applyEffects();
        render();
        if (window.EarnRushNotifications) window.EarnRushNotifications.refresh();
      }
    });
  }

  /* ---------------------------------------------------------
     PUBLIC API
  --------------------------------------------------------- */
  window.EarnRushSettings = {
    get(key) {
      return prefs[key];
    },
    getAll() {
      return { ...prefs };
    }
  };

  function init() {
    cacheDom();
    applyEffects();
    setupEvents();
    wireTapFeedback();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
