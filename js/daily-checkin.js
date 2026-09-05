/* =========================================================
   EarnRush — Premium Daily Check-in
   Version 2.0

   Rules:
   • 7 days per week
   • Only current day is claimable
   • Days 2–7 remain locked until their turn
   • Unclaimed reward shows automatically whenever the game opens
   • Closing the popup does NOT claim the reward
   • After claiming, exactly 24 hours must pass
   • After 24 hours, the next day becomes available
   • After Day 7, the next week starts after 24 hours
   • Week 1 starts at 1,000 Coins
   • Week 2 starts at 1,500 Coins
   • Week 3 starts at 2,000 Coins
   • Every following week increases the Day-1 reward by 500 Coins
   ========================================================= */

(function () {
    "use strict";

    /* =========================================================
       CONFIG
       ========================================================= */

    const STORAGE_KEY = "earnRushDailyCheckin";

    const DAY_COUNT = 7;

    const COOLDOWN_MS = 24 * 60 * 60 * 1000;

    const FIRST_WEEK_DAY_1_REWARD = 1000;

    const WEEK_INCREMENT = 500;

    const AUTO_OPEN_DELAY = 600;


    /* =========================================================
       STATE
       ========================================================= */

    let state = loadState();

    let countdownTimer = null;

    let modal = null;

    let card = null;


    /* =========================================================
       WEEK REWARD CALCULATION
       ========================================================= */

    function getDayReward(week, day) {
        const weekStartReward =
            FIRST_WEEK_DAY_1_REWARD +
            ((week - 1) * WEEK_INCREMENT);

        return weekStartReward * day;
    }


    /* =========================================================
       DEFAULT STATE
       ========================================================= */

    function getDefaultState() {
        return {
            week: 1,
            day: 1,
            claimedAt: null,
            completedDays: [],
            totalClaims: 0
        };
    }


    /* =========================================================
       LOAD STATE
       ========================================================= */

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return getDefaultState();
            }

            const parsed = JSON.parse(saved);

            if (!parsed || typeof parsed !== "object") {
                return getDefaultState();
            }

            return {
                week:
                    Number.isFinite(Number(parsed.week)) &&
                    Number(parsed.week) >= 1
                        ? Math.floor(Number(parsed.week))
                        : 1,

                day:
                    Number.isFinite(Number(parsed.day)) &&
                    Number(parsed.day) >= 1 &&
                    Number(parsed.day) <= DAY_COUNT
                        ? Math.floor(Number(parsed.day))
                        : 1,

                claimedAt:
                    Number.isFinite(Number(parsed.claimedAt)) &&
                    Number(parsed.claimedAt) > 0
                        ? Number(parsed.claimedAt)
                        : null,

                completedDays:
                    Array.isArray(parsed.completedDays)
                        ? parsed.completedDays
                        : [],

                totalClaims:
                    Number.isFinite(Number(parsed.totalClaims)) &&
                    Number(parsed.totalClaims) >= 0
                        ? Math.floor(Number(parsed.totalClaims))
                        : 0
            };

        } catch (error) {
            console.error(
                "EarnRush Daily Check-in: Could not load state.",
                error
            );

            return getDefaultState();
        }
    }


    /* =========================================================
       SAVE STATE
       ========================================================= */

    function saveState() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );
        } catch (error) {
            console.error(
                "EarnRush Daily Check-in: Could not save state.",
                error
            );
        }
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function formatNumber(number) {
        return Number(number).toLocaleString("en-US");
    }


    function getCurrentReward() {
        return getDayReward(
            state.week,
            state.day
        );
    }


    function getCooldownEnd() {
        if (!state.claimedAt) {
            return null;
        }

        return state.claimedAt + COOLDOWN_MS;
    }


    function isCooldownActive() {
        const cooldownEnd = getCooldownEnd();

        if (!cooldownEnd) {
            return false;
        }

        return Date.now() < cooldownEnd;
    }


    function getRemainingMs() {
        const cooldownEnd = getCooldownEnd();

        if (!cooldownEnd) {
            return 0;
        }

        return Math.max(
            0,
            cooldownEnd - Date.now()
        );
    }


    function isCurrentRewardClaimable() {
        return !isCooldownActive();
    }


    function getDayKey(week, day) {
        return `${week}-${day}`;
    }


    function isDayCompleted(week, day) {
        return state.completedDays.includes(
            getDayKey(week, day)
        );
    }


    /* =========================================================
       CSS
       ========================================================= */

    function injectStyles() {
        if (document.getElementById(
            "earnrush-daily-checkin-styles"
        )) {
            return;
        }

        const style = document.createElement("style");

        style.id =
            "earnrush-daily-checkin-styles";

        style.textContent = `
            /* =================================================
               DAILY CHECK-IN CARD
               ================================================= */

            .er-daily-card {
                position: relative;
                width: 100%;
                margin: 0 0 16px;
                padding: 20px;
                border-radius: 22px;
                border: 1px solid rgba(255,255,255,.08);
                background:
                    linear-gradient(
                        145deg,
                        rgba(20,34,53,.98),
                        rgba(8,18,31,.98)
                    );
                box-shadow:
                    0 18px 45px rgba(0,0,0,.22),
                    inset 0 1px 0 rgba(255,255,255,.035);
                overflow: hidden;
                cursor: pointer;
                transition:
                    transform .22s ease,
                    border-color .22s ease,
                    box-shadow .22s ease;
                box-sizing: border-box;
            }

            .er-daily-card:hover {
                transform: translateY(-2px);
                border-color: rgba(37,211,102,.28);
                box-shadow:
                    0 22px 50px rgba(0,0,0,.28),
                    0 0 0 1px rgba(37,211,102,.04);
            }

            .er-daily-card:active {
                transform: translateY(0);
            }

            .er-daily-card::before {
                content: "";
                position: absolute;
                width: 180px;
                height: 180px;
                top: -90px;
                right: -70px;
                border-radius: 50%;
                background: rgba(37,211,102,.10);
                filter: blur(8px);
                pointer-events: none;
            }

            .er-daily-card-top {
                position: relative;
                z-index: 1;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
            }

            .er-daily-card-title-wrap {
                display: flex;
                align-items: center;
                gap: 13px;
                min-width: 0;
            }

            .er-daily-card-icon {
                width: 48px;
                height: 48px;
                flex: 0 0 48px;
                display: grid;
                place-items: center;
                border-radius: 15px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(37,211,102,.20),
                        rgba(37,211,102,.07)
                    );
                border: 1px solid rgba(37,211,102,.16);
                font-size: 24px;
            }

            .er-daily-card-kicker {
                margin: 0 0 4px;
                color: rgba(255,255,255,.48);
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1.4px;
                text-transform: uppercase;
            }

            .er-daily-card-title {
                margin: 0;
                color: #fff;
                font-size: 18px;
                font-weight: 800;
                line-height: 1.15;
            }

            .er-daily-card-status {
                flex: 0 0 auto;
                padding: 7px 10px;
                border-radius: 999px;
                background: rgba(37,211,102,.10);
                border: 1px solid rgba(37,211,102,.16);
                color: #25d366;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: .7px;
                white-space: nowrap;
            }

            .er-daily-card-status.locked {
                color: rgba(255,255,255,.55);
                background: rgba(255,255,255,.055);
                border-color: rgba(255,255,255,.08);
            }

            .er-daily-card-reward {
                position: relative;
                z-index: 1;
                margin-top: 17px;
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: 14px;
            }

            .er-daily-reward-label {
                margin: 0 0 4px;
                color: rgba(255,255,255,.45);
                font-size: 11px;
                font-weight: 600;
            }

            .er-daily-reward-value {
                margin: 0;
                color: #fff;
                font-size: 24px;
                line-height: 1;
                font-weight: 900;
                letter-spacing: -.5px;
            }

            .er-daily-reward-value span {
                color: #25d366;
                font-size: 12px;
                font-weight: 800;
                margin-left: 4px;
                letter-spacing: .2px;
            }

            .er-daily-card-action {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 38px;
                padding: 0 15px;
                border-radius: 12px;
                border: 1px solid rgba(37,211,102,.18);
                background: rgba(37,211,102,.12);
                color: #25d366;
                font-size: 11px;
                font-weight: 800;
                white-space: nowrap;
            }

            .er-daily-card.locked {
                cursor: default;
            }

            .er-daily-card.locked:hover {
                transform: none;
                border-color: rgba(255,255,255,.08);
                box-shadow:
                    0 18px 45px rgba(0,0,0,.22),
                    inset 0 1px 0 rgba(255,255,255,.035);
            }

            .er-daily-progress {
                position: relative;
                z-index: 1;
                display: grid;
                grid-template-columns:
                    repeat(7, minmax(0, 1fr));
                gap: 7px;
                margin-top: 20px;
            }

            .er-daily-progress-day {
                min-width: 0;
                text-align: center;
            }

            .er-daily-day-box {
                position: relative;
                width: 100%;
                aspect-ratio: 1;
                display: grid;
                place-items: center;
                border-radius: 11px;
                background: rgba(255,255,255,.045);
                border: 1px solid rgba(255,255,255,.07);
                color: rgba(255,255,255,.48);
                font-size: 11px;
                font-weight: 800;
                box-sizing: border-box;
            }

            .er-daily-progress-day.active
                .er-daily-day-box {
                color: #25d366;
                background: rgba(37,211,102,.10);
                border-color: rgba(37,211,102,.28);
                box-shadow:
                    0 0 0 2px rgba(37,211,102,.04);
            }

            .er-daily-progress-day.completed
                .er-daily-day-box {
                color: #fff;
                background:
                    linear-gradient(
                        145deg,
                        rgba(37,211,102,.85),
                        rgba(37,211,102,.55)
                    );
                border-color: rgba(37,211,102,.35);
            }

            .er-daily-progress-day.completed
                .er-daily-day-box::after {
                content: "✓";
                position: absolute;
                right: 3px;
                top: 2px;
                font-size: 7px;
                font-weight: 900;
            }

            .er-daily-progress-day.locked
                .er-daily-day-box {
                color: rgba(255,255,255,.28);
            }

            .er-daily-day-label {
                margin-top: 5px;
                color: rgba(255,255,255,.32);
                font-size: 8px;
                font-weight: 700;
            }

            .er-daily-progress-day.active
                .er-daily-day-label {
                color: #25d366;
            }

            /* =================================================
               MODAL
               ================================================= */

            .er-daily-modal {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(2,8,15,.78);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transition:
                    opacity .22s ease,
                    visibility .22s ease;
                box-sizing: border-box;
            }

            .er-daily-modal.open {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }

            .er-daily-dialog {
                position: relative;
                width: min(430px, 100%);
                max-height: min(700px, calc(100vh - 40px));
                overflow-y: auto;
                border-radius: 28px;
                border: 1px solid rgba(255,255,255,.09);
                background:
                    linear-gradient(
                        155deg,
                        #13243a 0%,
                        #081321 72%
                    );
                box-shadow:
                    0 35px 100px rgba(0,0,0,.55),
                    0 0 0 1px rgba(255,255,255,.015);
                transform:
                    translateY(16px)
                    scale(.97);
                transition:
                    transform .24s cubic-bezier(.2,.8,.2,1);
                box-sizing: border-box;
                scrollbar-width: thin;
            }

            .er-daily-modal.open
                .er-daily-dialog {
                transform:
                    translateY(0)
                    scale(1);
            }

            .er-daily-dialog::before {
                content: "";
                position: absolute;
                width: 230px;
                height: 230px;
                top: -120px;
                left: 50%;
                transform: translateX(-50%);
                border-radius: 50%;
                background: rgba(37,211,102,.13);
                filter: blur(28px);
                pointer-events: none;
            }

            .er-daily-close {
                position: absolute;
                z-index: 5;
                top: 15px;
                right: 15px;
                width: 36px;
                height: 36px;
                display: grid;
                place-items: center;
                padding: 0;
                border: 1px solid rgba(255,255,255,.08);
                border-radius: 50%;
                background: rgba(255,255,255,.055);
                color: rgba(255,255,255,.72);
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                transition:
                    background .18s ease,
                    transform .18s ease;
            }

            .er-daily-close:hover {
                background: rgba(255,255,255,.10);
                transform: rotate(5deg);
            }

            .er-daily-modal-content {
                position: relative;
                z-index: 1;
                padding: 34px 24px 24px;
                text-align: center;
            }

            .er-daily-modal-icon {
                width: 74px;
                height: 74px;
                margin: 0 auto 16px;
                display: grid;
                place-items: center;
                border-radius: 23px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(37,211,102,.20),
                        rgba(37,211,102,.06)
                    );
                border: 1px solid rgba(37,211,102,.20);
                box-shadow:
                    0 12px 30px rgba(37,211,102,.08);
                font-size: 36px;
            }

            .er-daily-modal-kicker {
                margin: 0 0 7px;
                color: #25d366;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 1.5px;
                text-transform: uppercase;
            }

            .er-daily-modal-title {
                margin: 0;
                color: #fff;
                font-size: 27px;
                line-height: 1.1;
                font-weight: 900;
                letter-spacing: -.6px;
            }

            .er-daily-modal-subtitle {
                margin: 9px auto 0;
                max-width: 320px;
                color: rgba(255,255,255,.53);
                font-size: 13px;
                line-height: 1.55;
            }

            .er-daily-modal-reward {
                margin: 22px 0 18px;
                padding: 20px 16px;
                border-radius: 19px;
                background: rgba(255,255,255,.045);
                border: 1px solid rgba(255,255,255,.07);
            }

            .er-daily-modal-reward-label {
                margin: 0 0 7px;
                color: rgba(255,255,255,.42);
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .er-daily-modal-reward-value {
                margin: 0;
                color: #fff;
                font-size: 36px;
                line-height: 1;
                font-weight: 950;
                letter-spacing: -1px;
            }

            .er-daily-modal-reward-value span {
                color: #25d366;
                font-size: 13px;
                margin-left: 5px;
                letter-spacing: 0;
            }

            .er-daily-week-label {
                margin: 0 0 12px;
                color: rgba(255,255,255,.42);
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .er-daily-modal-days {
                display: grid;
                grid-template-columns:
                    repeat(7, minmax(0, 1fr));
                gap: 6px;
                margin-bottom: 20px;
            }

            .er-daily-modal-day {
                min-width: 0;
                padding: 9px 3px;
                border-radius: 10px;
                background: rgba(255,255,255,.035);
                border: 1px solid rgba(255,255,255,.06);
            }

            .er-daily-modal-day.active {
                background: rgba(37,211,102,.10);
                border-color: rgba(37,211,102,.28);
            }

            .er-daily-modal-day.completed {
                background: rgba(37,211,102,.58);
                border-color: rgba(37,211,102,.30);
            }

            .er-daily-modal-day-number {
                color: rgba(255,255,255,.45);
                font-size: 9px;
                font-weight: 800;
            }

            .er-daily-modal-day.active
                .er-daily-modal-day-number,
            .er-daily-modal-day.completed
                .er-daily-modal-day-number {
                color: #fff;
            }

            .er-daily-modal-day-reward {
                margin-top: 3px;
                color: rgba(255,255,255,.78);
                font-size: 8px;
                font-weight: 800;
                line-height: 1.2;
            }

            .er-daily-claim-btn {
                width: 100%;
                min-height: 52px;
                border: 0;
                border-radius: 16px;
                background:
                    linear-gradient(
                        135deg,
                        #25d366,
                        #18b957
                    );
                color: #06140c;
                font-size: 14px;
                font-weight: 900;
                letter-spacing: .1px;
                cursor: pointer;
                box-shadow:
                    0 12px 30px rgba(37,211,102,.18);
                transition:
                    transform .18s ease,
                    filter .18s ease,
                    box-shadow .18s ease;
            }

            .er-daily-claim-btn:hover {
                filter: brightness(1.05);
                transform: translateY(-1px);
                box-shadow:
                    0 15px 35px rgba(37,211,102,.23);
            }

            .er-daily-claim-btn:active {
                transform: translateY(0);
            }

            .er-daily-claim-btn:disabled {
                opacity: .65;
                cursor: not-allowed;
                transform: none;
            }

            .er-daily-countdown {
                display: none;
                margin-top: 14px;
                padding: 13px;
                border-radius: 14px;
                background: rgba(255,255,255,.04);
                border: 1px solid rgba(255,255,255,.06);
                color: rgba(255,255,255,.55);
                font-size: 11px;
                font-weight: 700;
            }

            .er-daily-countdown strong {
                color: #fff;
            }

            .er-daily-note {
                margin: 13px 0 0;
                color: rgba(255,255,255,.30);
                font-size: 9px;
                line-height: 1.45;
            }

            @media (max-width: 430px) {
                .er-daily-modal {
                    padding: 12px;
                }

                .er-daily-dialog {
                    border-radius: 24px;
                    max-height: calc(100vh - 24px);
                }

                .er-daily-modal-content {
                    padding: 29px 17px 18px;
                }

                .er-daily-modal-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: 20px;
                    font-size: 31px;
                }

                .er-daily-modal-title {
                    font-size: 24px;
                }

                .er-daily-modal-reward-value {
                    font-size: 32px;
                }

                .er-daily-card {
                    padding: 16px;
                    border-radius: 19px;
                }

                .er-daily-card-icon {
                    width: 43px;
                    height: 43px;
                    flex-basis: 43px;
                    border-radius: 13px;
                    font-size: 21px;
                }

                .er-daily-card-title {
                    font-size: 16px;
                }

                .er-daily-card-status {
                    padding: 6px 8px;
                    font-size: 8px;
                }

                .er-daily-reward-value {
                    font-size: 21px;
                }

                .er-daily-card-action {
                    min-height: 34px;
                    padding: 0 11px;
                    font-size: 9px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .er-daily-card,
                .er-daily-claim-btn,
                .er-daily-close,
                .er-daily-modal,
                .er-daily-dialog {
                    transition: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }


    /* =========================================================
       CREATE MODAL
       ========================================================= */

    function createModal() {
        if (document.getElementById(
            "erDailyCheckinModal"
        )) {
            modal = document.getElementById(
                "erDailyCheckinModal"
            );

            return;
        }

        modal = document.createElement("div");

        modal.id = "erDailyCheckinModal";

        modal.className = "er-daily-modal";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.innerHTML = `
            <div
                class="er-daily-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="erDailyTitle"
            >
                <button
                    type="button"
                    class="er-daily-close"
                    id="erDailyClose"
                    aria-label="Close Daily Check-in"
                >
                    ×
                </button>

                <div class="er-daily-modal-content">

                    <div class="er-daily-modal-icon">
                        🎁
                    </div>

                    <p class="er-daily-modal-kicker">
                        DAILY CHECK-IN
                    </p>

                    <h2
                        class="er-daily-modal-title"
                        id="erDailyTitle"
                    >
                        Your Daily Reward
                    </h2>

                    <p class="er-daily-modal-subtitle">
                        Claim today's reward and keep your
                        7-day check-in streak moving.
                    </p>

                    <div class="er-daily-modal-reward">

                        <p class="er-daily-modal-reward-label">
                            Today's Reward
                        </p>

                        <p
                            class="er-daily-modal-reward-value"
                            id="erDailyReward"
                        >
                            1,000
                            <span>COINS</span>
                        </p>

                    </div>

                    <p
                        class="er-daily-week-label"
                        id="erDailyWeekLabel"
                    >
                        Week 1 • Day 1
                    </p>

                    <div
                        class="er-daily-modal-days"
                        id="erDailyModalDays"
                    ></div>

                    <button
                        type="button"
                        class="er-daily-claim-btn"
                        id="erDailyClaim"
                    >
                        Claim Reward
                    </button>

                    <div
                        class="er-daily-countdown"
                        id="erDailyCountdown"
                    >
                        Next reward available in
                        <strong id="erDailyCountdownValue">
                            24:00:00
                        </strong>
                    </div>

                    <p class="er-daily-note">
                        Your next check-in becomes available
                        24 hours after claiming today's reward.
                    </p>

                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeButton =
            document.getElementById(
                "erDailyClose"
            );

        const claimButton =
            document.getElementById(
                "erDailyClaim"
            );

        closeButton.addEventListener(
            "click",
            closeModal
        );

        claimButton.addEventListener(
            "click",
            claimReward
        );

        modal.addEventListener(
            "click",
            function (event) {
                if (event.target === modal) {
                    closeModal();
                }
            }
        );

        document.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key === "Escape" &&
                    modal &&
                    modal.classList.contains("open")
                ) {
                    closeModal();
                }
            }
        );
    }


    /* =========================================================
       CREATE REWARDS CARD
       ========================================================= */

    function createCard() {
        const rewardsList =
            document.getElementById(
                "rewardsList"
            );

        if (!rewardsList) {
            console.error(
                "EarnRush Daily Check-in: #rewardsList was not found."
            );

            return;
        }

        const existingCard =
            document.getElementById(
                "erDailyCheckinCard"
            );

        if (existingCard) {
            card = existingCard;
            return;
        }

        card = document.createElement("div");

        card.id = "erDailyCheckinCard";

        card.className =
            "er-daily-card";

        card.setAttribute(
            "role",
            "button"
        );

        card.setAttribute(
            "tabindex",
            "0"
        );

        rewardsList.prepend(card);

        card.addEventListener(
            "click",
            function () {
                openModal();
            }
        );

        card.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    openModal();
                }
            }
        );

        updateCard();
    }


    /* =========================================================
       UPDATE REWARDS CARD
       ========================================================= */

    function updateCard() {
        if (!card) {
            return;
        }

        const reward =
            getCurrentReward();

        const cooldown =
            isCooldownActive();

        const completed =
            isDayCompleted(
                state.week,
                state.day
            );

        let statusText = "CLAIM NOW";

        let statusClass = "";

        let actionText = "Claim Reward";

        if (completed && cooldown) {
            statusText = "CLAIMED";
            statusClass = "locked";
            actionText = "24H COOLDOWN";
        }

        card.className =
            "er-daily-card" +
            (cooldown ? " locked" : "");

        card.innerHTML = `
            <div class="er-daily-card-top">

                <div class="er-daily-card-title-wrap">

                    <div class="er-daily-card-icon">
                        🎁
                    </div>

                    <div>
                        <p class="er-daily-card-kicker">
                            WEEK ${state.week}
                        </p>

                        <h3 class="er-daily-card-title">
                            Daily Check-in
                        </h3>
                    </div>

                </div>

                <span
                    class="er-daily-card-status ${statusClass}"
                >
                    ${statusText}
                </span>

            </div>

            <div class="er-daily-card-reward">

                <div>
                    <p class="er-daily-reward-label">
                        Day ${state.day} Reward
                    </p>

                    <p class="er-daily-reward-value">
                        ${formatNumber(reward)}
                        <span>COINS</span>
                    </p>
                </div>

                <span class="er-daily-card-action">
                    ${actionText}
                </span>

            </div>

            <div
                class="er-daily-progress"
                aria-label="7 day check-in progress"
            >
                ${buildProgressDays()}
            </div>
        `;

        card.classList.toggle(
            "locked",
            cooldown
        );
    }


    /* =========================================================
       BUILD 7 DAYS
       ========================================================= */

    function buildProgressDays() {
        let html = "";

        for (
            let day = 1;
            day <= DAY_COUNT;
            day++
        ) {
            const completed =
                isDayCompleted(
                    state.week,
                    day
                );

            const active =
                day === state.day &&
                !completed;

            const locked =
                day > state.day;

            let classes =
                "er-daily-progress-day";

            if (completed) {
                classes += " completed";
            } else if (active) {
                classes += " active";
            } else if (locked) {
                classes += " locked";
            }

            html += `
                <div class="${classes}">

                    <div class="er-daily-day-box">
                        ${
                            completed
                                ? "✓"
                                : day
                        }
                    </div>

                    <div class="er-daily-day-label">
                        Day ${day}
                    </div>

                </div>
            `;
        }

        return html;
    }


    /* =========================================================
       BUILD MODAL DAYS
       ========================================================= */

    function buildModalDays() {
        const container =
            document.getElementById(
                "erDailyModalDays"
            );

        if (!container) {
            return;
        }

        let html = "";

        for (
            let day = 1;
            day <= DAY_COUNT;
            day++
        ) {
            const completed =
                isDayCompleted(
                    state.week,
                    day
                );

            const active =
                day === state.day &&
                !completed;

            let classes =
                "er-daily-modal-day";

            if (completed) {
                classes += " completed";
            }

            if (active) {
                classes += " active";
            }

            const reward =
                getDayReward(
                    state.week,
                    day
                );

            html += `
                <div class="${classes}">

                    <div class="er-daily-modal-day-number">
                        ${
                            completed
                                ? "✓"
                                : `D${day}`
                        }
                    </div>

                    <div
                        class="er-daily-modal-day-reward"
                    >
                        ${formatNumber(reward)}
                    </div>

                </div>
            `;
        }

        container.innerHTML = html;
    }


    /* =========================================================
       UPDATE MODAL
       ========================================================= */

    function updateModal() {
        if (!modal) {
            return;
        }

        const reward =
            getCurrentReward();

        const rewardElement =
            document.getElementById(
                "erDailyReward"
            );

        const weekLabel =
            document.getElementById(
                "erDailyWeekLabel"
            );

        const claimButton =
            document.getElementById(
                "erDailyClaim"
            );

        const countdown =
            document.getElementById(
                "erDailyCountdown"
            );

        if (rewardElement) {
            rewardElement.innerHTML =
                `${formatNumber(reward)}
                <span>COINS</span>`;
        }

        if (weekLabel) {
            weekLabel.textContent =
                `Week ${state.week} • Day ${state.day}`;
        }

        buildModalDays();

        if (isCooldownActive()) {
            claimButton.disabled = true;

            claimButton.textContent =
                "Reward Claimed ✓";

            if (countdown) {
                countdown.style.display =
                    "block";
            }

            startCountdown();

        } else {
            claimButton.disabled = false;

            claimButton.textContent =
                `Claim ${formatNumber(reward)} Coins`;

            if (countdown) {
                countdown.style.display =
                    "none";
            }

            stopCountdown();
        }
    }


    /* =========================================================
       OPEN MODAL
       ========================================================= */

    function openModal() {
        if (!modal) {
            createModal();
        }

        updateModal();

        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    }


    /* =========================================================
       CLOSE MODAL
       ========================================================= */

    function closeModal() {
        if (!modal) {
            return;
        }

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";

        /*
         * IMPORTANT:
         * Closing does NOT claim the reward.
         * Nothing is saved here.
         */
    }


    /* =========================================================
       ADD COINS
       ========================================================= */

    function addCoinsToGame(amount) {
        if (
            window.EarnRushGame &&
            typeof window.EarnRushGame.addCoins ===
                "function"
        ) {
            window.EarnRushGame.addCoins(
                amount
            );

            return true;
        }

        /*
         * Do NOT create a second/fake coin system.
         * Daily Check-in must use the existing
         * EarnRush game economy.
         */

        console.error(
            "EarnRush Daily Check-in: EarnRushGame.addCoins() is unavailable."
        );

        return false;
    }


    /* =========================================================
       CLAIM REWARD
       ========================================================= */

    function claimReward() {
        if (isCooldownActive()) {
            return;
        }

        const claimButton =
            document.getElementById(
                "erDailyClaim"
            );

        if (!claimButton) {
            return;
        }

        const reward =
            getCurrentReward();

        /*
         * Disable immediately so a fast double click
         * cannot claim the same reward twice.
         */

        claimButton.disabled = true;

        const added =
            addCoinsToGame(reward);

        if (!added) {
            claimButton.disabled = false;

            claimButton.textContent =
                `Claim ${formatNumber(reward)} Coins`;

            return;
        }

        const currentKey =
            getDayKey(
                state.week,
                state.day
            );

        if (
            !state.completedDays.includes(
                currentKey
            )
        ) {
            state.completedDays.push(
                currentKey
            );
        }

        state.claimedAt =
            Date.now();

        state.totalClaims += 1;

        saveState();

        /*
         * Refresh game UI if the existing game exposes
         * an update method.
         */

        try {
            if (
                window.EarnRushGame &&
                typeof window.EarnRushGame.updateUI ===
                    "function"
            ) {
                window.EarnRushGame.updateUI();
            }
        } catch (error) {
            console.warn(
                "EarnRush Daily Check-in: Game UI refresh skipped.",
                error
            );
        }

        /*
         * Update the current card/modal immediately.
         */

        updateCard();

        updateModal();

        /*
         * Keep the popup visible briefly so the user
         * can clearly see that the reward was claimed.
         */

        setTimeout(
            function () {
                closeModal();
            },
            700
        );
    }


    /* =========================================================
       ADVANCE TO NEXT DAY
       ========================================================= */

    function advanceIfNeeded() {
        if (isCooldownActive()) {
            return;
        }

        /*
         * No claim has happened yet.
         * Current day must remain claimable.
         */

        if (!state.claimedAt) {
            return;
        }

        /*
         * The 24-hour cooldown has finished.
         * Move to the next day.
         */

        if (
            state.day < DAY_COUNT
        ) {
            state.day += 1;

            state.claimedAt = null;

            saveState();

            return;
        }

        /*
         * Day 7 completed.
         * Start the next week.
         */

        state.week += 1;

        state.day = 1;

        state.claimedAt = null;

        saveState();
    }


    /* =========================================================
       COUNTDOWN
       ========================================================= */

    function formatCountdown(milliseconds) {
        const totalSeconds =
            Math.max(
                0,
                Math.floor(
                    milliseconds / 1000
                )
            );

        const hours =
            Math.floor(
                totalSeconds / 3600
            );

        const minutes =
            Math.floor(
                (totalSeconds % 3600) / 60
            );

        const seconds =
            totalSeconds % 60;

        return [
            String(hours).padStart(2, "0"),
            String(minutes).padStart(2, "0"),
            String(seconds).padStart(2, "0")
        ].join(":");
    }


    function updateCountdown() {
        const countdownValue =
            document.getElementById(
                "erDailyCountdownValue"
            );

        if (!countdownValue) {
            return;
        }

        const remaining =
            getRemainingMs();

        if (remaining <= 0) {
            stopCountdown();

            advanceIfNeeded();

            updateCard();

            updateModal();

            /*
             * Once 24 hours are complete, the next
             * reward should be available.
             */

            return;
        }

        countdownValue.textContent =
            formatCountdown(
                remaining
            );
    }


    function startCountdown() {
        stopCountdown();

        updateCountdown();

        countdownTimer =
            setInterval(
                updateCountdown,
                1000
            );
    }


    function stopCountdown() {
        if (countdownTimer) {
            clearInterval(
                countdownTimer
            );

            countdownTimer = null;
        }
    }


    /* =========================================================
       AUTO OPEN LOGIC
       ========================================================= */

    function shouldAutoOpen() {
        /*
         * If no reward has ever been claimed:
         * ALWAYS show the popup.
         */

        if (!state.claimedAt) {
            return true;
        }

        /*
         * If previous reward was claimed but 24h
         * have not passed yet, do not show it.
         */

        if (isCooldownActive()) {
            return false;
        }

        /*
         * 24h have passed.
         * Advance to next day/week and show it.
         */

        advanceIfNeeded();

        return true;
    }


    function autoOpenCheckin() {
        if (!shouldAutoOpen()) {
            updateCard();
            return;
        }

        updateCard();

        setTimeout(
            function () {
                openModal();
            },
            AUTO_OPEN_DELAY
        );
    }


    /* =========================================================
       VISIBILITY / RETURN TO GAME
       ========================================================= */

    function handleVisibilityChange() {
        if (
            document.visibilityState !==
            "visible"
        ) {
            return;
        }

        /*
         * Re-read state in case another tab/window
         * changed the check-in state.
         */

        state = loadState();

        if (
            state.claimedAt &&
            !isCooldownActive()
        ) {
            advanceIfNeeded();

            updateCard();
        }
    }


    /* =========================================================
       PAGE FOCUS
       ========================================================= */

    function handleWindowFocus() {
        state = loadState();

        if (
            state.claimedAt &&
            !isCooldownActive()
        ) {
            advanceIfNeeded();

            updateCard();
        }
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function init() {
        /*
         * Prevent duplicate initialization.
         */

        if (
            window.__EarnRushDailyCheckinInitialized
        ) {
            return;
        }

        window.__EarnRushDailyCheckinInitialized =
            true;

        injectStyles();

        createModal();

        createCard();

        /*
         * In case the 24h cooldown has already expired
         * while the website was closed.
         */

        if (
            state.claimedAt &&
            !isCooldownActive()
        ) {
            advanceIfNeeded();
        }

        updateCard();

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        window.addEventListener(
            "focus",
            handleWindowFocus
        );

        /*
         * Automatic popup.
         */

        autoOpenCheckin();

        console.log(
            "EarnRush Daily Check-in initialized.",
            {
                week: state.week,
                day: state.day,
                reward: getCurrentReward(),
                claimedAt: state.claimedAt
            }
        );
    }


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }


    /* =========================================================
       OPTIONAL PUBLIC API
       ========================================================= */

    window.EarnRushDailyCheckin = {

        open: openModal,

        close: closeModal,

        getState: function () {
            return {
                ...state
            };
        },

        getCurrentReward: function () {
            return getCurrentReward();
        },

        getDayReward: function (
            week,
            day
        ) {
            return getDayReward(
                week,
                day
            );
        }

    };

})();