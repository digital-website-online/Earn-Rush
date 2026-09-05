/* ============================================================
   EarnRush — DAILY REWARD / CHECK-IN
   Premium 7-Day Weekly System
   ============================================================

   WEEK 1
   Day 1 = 1,000
   Day 2 = 2,000
   Day 3 = 3,000
   Day 4 = 4,000
   Day 5 = 5,000
   Day 6 = 6,000
   Day 7 = 7,000

   WEEK 2
   Day 1 = 1,500
   Day 2 = 3,000
   ...
   Day 7 = 10,500

   WEEK 3
   Day 1 = 2,000
   Day 2 = 4,000
   ...
   Day 7 = 14,000

   Every new week:
   Day-1 reward +500 Coins

   RULES
   ------------------------------------------------------------
   • Only current day can be claimed.
   • Future days are locked.
   • Closing popup does NOT claim reward.
   • If user does not claim, popup appears again on next open.
   • After claiming, next reward becomes available exactly 24h later.
   • Day 7 completion moves to the next week after 24h.
   • Existing EarnRushGame.addCoins() is used.
   • No second/fake coin system.
   • No external assets or guessed files required.
   ============================================================ */

(function () {
    "use strict";

    /* ============================================================
       CONFIG
       ============================================================ */

    const STORAGE_KEY = "earnRushDailyCheckin";

    const DAYS_PER_WEEK = 7;

    const DAY_COOLDOWN =
        24 * 60 * 60 * 1000;

    const WEEK_1_START_REWARD = 1000;

    const WEEK_INCREMENT = 500;

    const AUTO_OPEN_DELAY = 550;


    /* ============================================================
       RUNTIME
       ============================================================ */

    let state = null;

    let modal = null;

    let rewardsCard = null;

    let countdownInterval = null;

    let claimInProgress = false;


    /* ============================================================
       DEFAULT STATE
       ============================================================ */

    function defaultState() {
        return {
            week: 1,
            day: 1,
            claimedAt: null,
            completedDays: [],
            totalClaims: 0
        };
    }


    /* ============================================================
       LOAD STATE
       ============================================================ */

    function loadState() {
        try {
            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) {
                return defaultState();
            }

            const saved =
                JSON.parse(raw);

            if (
                !saved ||
                typeof saved !== "object"
            ) {
                return defaultState();
            }

            return {
                week:
                    Number.isFinite(
                        Number(saved.week)
                    ) &&
                    Number(saved.week) >= 1
                        ? Math.floor(
                              Number(saved.week)
                          )
                        : 1,

                day:
                    Number.isFinite(
                        Number(saved.day)
                    ) &&
                    Number(saved.day) >= 1 &&
                    Number(saved.day) <= 7
                        ? Math.floor(
                              Number(saved.day)
                          )
                        : 1,

                claimedAt:
                    Number.isFinite(
                        Number(saved.claimedAt)
                    ) &&
                    Number(saved.claimedAt) > 0
                        ? Number(saved.claimedAt)
                        : null,

                completedDays:
                    Array.isArray(
                        saved.completedDays
                    )
                        ? saved.completedDays
                        : [],

                totalClaims:
                    Number.isFinite(
                        Number(saved.totalClaims)
                    ) &&
                    Number(saved.totalClaims) >= 0
                        ? Math.floor(
                              Number(saved.totalClaims)
                          )
                        : 0
            };

        } catch (error) {
            console.error(
                "Daily Check-in: state load failed.",
                error
            );

            return defaultState();
        }
    }


    /* ============================================================
       SAVE STATE
       ============================================================ */

    function saveState() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );
        } catch (error) {
            console.error(
                "Daily Check-in: state save failed.",
                error
            );
        }
    }


    /* ============================================================
       REWARD CALCULATION
       ============================================================ */

    function getWeekStartReward(
        week
    ) {
        return (
            WEEK_1_START_REWARD +
            (
                (week - 1) *
                WEEK_INCREMENT
            )
        );
    }


    function getReward(
        week,
        day
    ) {
        return (
            getWeekStartReward(week) *
            day
        );
    }


    function getCurrentReward() {
        return getReward(
            state.week,
            state.day
        );
    }


    /* ============================================================
       FORMATTING
       ============================================================ */

    function number(value) {
        return Number(value).toLocaleString(
            "en-US"
        );
    }


    function dayKey(
        week,
        day
    ) {
        return `${week}-${day}`;
    }


    function isCompleted(
        week,
        day
    ) {
        return state.completedDays.includes(
            dayKey(week, day)
        );
    }


    /* ============================================================
       24 HOUR COOLDOWN
       ============================================================ */

    function cooldownEnd() {
        if (!state.claimedAt) {
            return 0;
        }

        return (
            state.claimedAt +
            DAY_COOLDOWN
        );
    }


    function cooldownActive() {
        return (
            !!state.claimedAt &&
            Date.now() <
                cooldownEnd()
        );
    }


    function remainingTime() {
        if (!state.claimedAt) {
            return 0;
        }

        return Math.max(
            0,
            cooldownEnd() -
                Date.now()
        );
    }


    /* ============================================================
       MOVE TO NEXT DAY / WEEK
       ============================================================ */

    function advanceAfterCooldown() {

        if (!state.claimedAt) {
            return false;
        }

        if (cooldownActive()) {
            return false;
        }

        /*
         * Previous reward has completed its
         * full 24-hour cooldown.
         */

        if (
            state.day <
            DAYS_PER_WEEK
        ) {
            state.day += 1;
        } else {
            /*
             * Day 7 finished.
             * Start a completely new week.
             */

            state.week += 1;

            state.day = 1;
        }

        state.claimedAt = null;

        saveState();

        return true;
    }


    /* ============================================================
       PREMIUM CSS
       ============================================================ */

    function injectCSS() {

        if (
            document.getElementById(
                "erDailyRewardCSS"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "erDailyRewardCSS";

        style.textContent = `

        /* ========================================================
           MAIN REWARD CARD
           ======================================================== */

        .er-reward-launcher {
            position: relative;
            margin: 0 0 18px;
            padding: 18px;
            width: 100%;
            box-sizing: border-box;

            border-radius: 20px;

            background:
                linear-gradient(
                    145deg,
                    #16283d 0%,
                    #0b1727 55%,
                    #07111d 100%
                );

            border: 1px solid
                rgba(255,255,255,.09);

            box-shadow:
                0 18px 45px
                    rgba(0,0,0,.25),
                inset 0 1px 0
                    rgba(255,255,255,.04);

            overflow: hidden;

            cursor: pointer;

            transition:
                transform .2s ease,
                border-color .2s ease,
                box-shadow .2s ease;
        }

        .er-reward-launcher:hover {
            transform: translateY(-2px);

            border-color:
                rgba(255,196,50,.25);

            box-shadow:
                0 23px 55px
                    rgba(0,0,0,.30);
        }

        .er-reward-launcher-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .er-reward-launcher-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .er-reward-launcher-icon {
            width: 46px;
            height: 46px;

            display: grid;
            place-items: center;

            border-radius: 14px;

            background:
                linear-gradient(
                    145deg,
                    rgba(255,196,50,.18),
                    rgba(255,196,50,.05)
                );

            border: 1px solid
                rgba(255,196,50,.18);

            font-size: 23px;
        }

        .er-reward-launcher-kicker {
            margin: 0 0 3px;

            color:
                rgba(255,255,255,.42);

            font-size: 9px;
            font-weight: 900;

            letter-spacing: 1.3px;
            text-transform: uppercase;
        }

        .er-reward-launcher-title {
            margin: 0;

            color: #fff;

            font-size: 17px;
            font-weight: 900;
        }

        .er-reward-launcher-status {
            padding: 7px 10px;

            border-radius: 999px;

            background:
                rgba(255,196,50,.10);

            border: 1px solid
                rgba(255,196,50,.16);

            color: #ffc432;

            font-size: 9px;
            font-weight: 900;

            white-space: nowrap;
        }

        .er-reward-launcher-bottom {
            margin-top: 15px;

            display: flex;
            align-items: flex-end;
            justify-content: space-between;

            gap: 12px;
        }

        .er-reward-launcher-label {
            margin: 0 0 4px;

            color:
                rgba(255,255,255,.40);

            font-size: 10px;
            font-weight: 700;
        }

        .er-reward-launcher-value {
            margin: 0;

            color: #fff;

            font-size: 23px;
            font-weight: 950;
        }

        .er-reward-launcher-value span {
            color: #ffc432;

            font-size: 10px;
            font-weight: 900;
        }

        .er-reward-launcher-button {
            min-height: 37px;

            padding: 0 14px;

            display: inline-flex;
            align-items: center;
            justify-content: center;

            border-radius: 11px;

            background:
                rgba(255,196,50,.10);

            border: 1px solid
                rgba(255,196,50,.18);

            color: #ffc432;

            font-size: 10px;
            font-weight: 900;
        }


        /* ========================================================
           FULL SCREEN MODAL
           ======================================================== */

        .er-reward-modal {
            position: fixed;

            inset: 0;

            z-index: 999999;

            display: flex;

            align-items: center;
            justify-content: center;

            padding: 18px;

            box-sizing: border-box;

            background:
                rgba(3,7,12,.84);

            backdrop-filter:
                blur(13px);

            -webkit-backdrop-filter:
                blur(13px);

            opacity: 0;
            visibility: hidden;
            pointer-events: none;

            transition:
                opacity .22s ease,
                visibility .22s ease;
        }

        .er-reward-modal.open {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }


        /* ========================================================
           REWARD PANEL
           ======================================================== */

        .er-reward-panel {
            position: relative;

            width:
                min(720px, 100%);

            max-height:
                calc(100vh - 36px);

            overflow-y: auto;

            box-sizing: border-box;

            padding: 0 0 22px;

            background:
                linear-gradient(
                    145deg,
                    #202b36,
                    #0b1016 70%
                );

            border:
                1px solid
                rgba(255,255,255,.14);

            border-radius: 8px;

            box-shadow:
                0 35px 100px
                    rgba(0,0,0,.65),
                0 0 50px
                    rgba(255,196,50,.04);

            transform:
                translateY(18px)
                scale(.975);

            transition:
                transform .25s
                cubic-bezier(.2,.8,.2,1);
        }

        .er-reward-modal.open
        .er-reward-panel {
            transform:
                translateY(0)
                scale(1);
        }


        /* ========================================================
           MODAL HEADER
           ======================================================== */

        .er-reward-header {
            position: relative;

            min-height: 72px;

            display: flex;

            align-items: center;
            justify-content: center;

            padding: 12px 65px 12px 20px;

            box-sizing: border-box;

            background:
                linear-gradient(
                    180deg,
                    rgba(255,255,255,.08),
                    rgba(255,255,255,.025)
                );

            border-bottom:
                1px solid
                rgba(255,255,255,.09);
        }

        .er-reward-header-title {
            margin: 0;

            color: #fff;

            font-size:
                clamp(25px, 5vw, 39px);

            line-height: 1;

            font-weight: 900;

            letter-spacing:
                1.5px;

            text-transform:
                uppercase;

            text-align: center;

            text-shadow:
                0 2px 12px
                    rgba(0,0,0,.4);
        }

        .er-reward-close {
            position: absolute;

            top: 50%;
            right: 12px;

            transform:
                translateY(-50%);

            width: 52px;
            height: 52px;

            display: grid;
            place-items: center;

            border: 0;

            border-radius: 3px;

            background:
                linear-gradient(
                    145deg,
                    #f31616,
                    #b60000
                );

            color: #fff;

            font-size: 33px;
            font-weight: 300;

            line-height: 1;

            cursor: pointer;

            box-shadow:
                inset 0 1px 0
                    rgba(255,255,255,.18),
                0 5px 18px
                    rgba(0,0,0,.25);

            transition:
                filter .18s ease,
                transform .18s ease;
        }

        .er-reward-close:hover {
            filter: brightness(1.1);

            transform:
                translateY(-50%)
                scale(1.03);
        }


        /* ========================================================
           REWARD GRID
           ======================================================== */

        .er-reward-grid {
            display: grid;

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

            grid-template-rows:
                repeat(2, minmax(130px, 1fr));

            gap: 12px;

            padding: 18px 20px 10px;

            box-sizing: border-box;
        }


        /* ========================================================
           REWARD TILE
           ======================================================== */

        .er-reward-tile {
            position: relative;

            min-width: 0;
            min-height: 145px;

            display: flex;
            flex-direction: column;

            overflow: hidden;

            border-radius: 3px;

            border:
                2px solid
                rgba(255,255,255,.18);

            background:
                linear-gradient(
                    160deg,
                    #050505,
                    #151515 48%,
                    #080808
                );

            box-shadow:
                inset 0 0 0 1px
                    rgba(0,0,0,.8),
                0 7px 18px
                    rgba(0,0,0,.30);

            transition:
                transform .2s ease,
                border-color .2s ease,
                filter .2s ease;
        }

        .er-reward-tile.current {
            border-color:
                #20f000;

            box-shadow:
                0 0 0 1px
                    rgba(32,240,0,.40),
                0 8px 22px
                    rgba(0,0,0,.40);
        }

        .er-reward-tile.locked {
            filter:
                saturate(.45)
                brightness(.70);
        }

        .er-reward-tile.claimed {
            border-color:
                rgba(37,211,102,.65);

            filter:
                saturate(.75);
        }

        .er-reward-tile.day-seven {
            grid-column: 4;
            grid-row: 1 / span 2;
        }


        /* ========================================================
           TILE DAY LABEL
           ======================================================== */

        .er-reward-tile-day {
            position: relative;
            z-index: 2;

            padding: 8px 5px 3px;

            color: #fff;

            font-size:
                clamp(13px, 2vw, 17px);

            line-height: 1;

            font-weight: 900;

            letter-spacing:
                1.2px;

            text-transform:
                uppercase;

            text-align: center;

            text-shadow:
                0 2px 5px
                    rgba(0,0,0,.8);
        }


        /* ========================================================
           TILE VISUAL
           ======================================================== */

        .er-reward-visual {
            flex: 1;

            min-height: 0;

            display: flex;

            align-items: center;
            justify-content: center;

            padding: 3px 8px;

            box-sizing: border-box;

            font-size:
                clamp(44px, 8vw, 75px);

            line-height: 1;

            text-shadow:
                0 8px 15px
                    rgba(0,0,0,.8);

            transform:
                translateZ(0);
        }

        .er-reward-tile.day-seven
        .er-reward-visual {
            font-size:
                clamp(65px, 11vw, 105px);
        }


        /* ========================================================
           TILE REWARD STRIP
           ======================================================== */

        .er-reward-tile-footer {
            position: relative;
            z-index: 2;

            min-height: 36px;

            display: flex;

            align-items: center;
            justify-content: center;

            padding: 5px 6px;

            box-sizing: border-box;

            background:
                linear-gradient(
                    180deg,
                    rgba(255,223,85,.20),
                    rgba(255,223,85,.07)
                );

            border-top:
                1px solid
                rgba(255,223,85,.14);

            color: #fff;

            font-size:
                clamp(10px, 1.8vw, 14px);

            font-weight: 900;

            text-align: center;

            text-shadow:
                0 2px 4px
                    rgba(0,0,0,.7);
        }

        .er-reward-tile.locked
        .er-reward-tile-footer {
            color:
                rgba(255,255,255,.50);
        }

        .er-reward-tile.current
        .er-reward-tile-footer {
            color: #fff;

            background:
                linear-gradient(
                    180deg,
                    rgba(255,222,60,.28),
                    rgba(255,196,50,.12)
                );
        }

        .er-reward-tile.claimed
        .er-reward-tile-footer {
            color: #25d366;

            background:
                rgba(37,211,102,.10);
        }


        /* ========================================================
           LOCK
           ======================================================== */

        .er-reward-lock {
            position: absolute;

            top: 50%;
            left: 50%;

            transform:
                translate(-50%, -50%);

            width: 36px;
            height: 36px;

            display: grid;
            place-items: center;

            border-radius: 50%;

            background:
                rgba(0,0,0,.55);

            border:
                1px solid
                rgba(255,255,255,.15);

            font-size: 17px;

            z-index: 5;
        }


        /* ========================================================
           CLAIM AREA
           ======================================================== */

        .er-reward-action-area {
            padding:
                12px 20px 0;

            text-align: center;
        }

        .er-reward-week {
            margin: 0 0 11px;

            color:
                rgba(255,255,255,.35);

            font-size: 10px;

            font-weight: 900;

            letter-spacing:
                1.2px;

            text-transform:
                uppercase;
        }

        .er-reward-claim {
            width:
                min(255px, 100%);

            min-height: 58px;

            border:
                2px solid
                rgba(255,196,50,.85);

            border-radius: 3px;

            background:
                linear-gradient(
                    145deg,
                    #ffd72e,
                    #e7a800
                );

            color: #fff;

            font-size: 17px;

            font-weight: 900;

            letter-spacing:
                1px;

            text-transform:
                uppercase;

            text-shadow:
                0 2px 4px
                    rgba(0,0,0,.55);

            box-shadow:
                0 8px 25px
                    rgba(0,0,0,.28),
                inset 0 1px 0
                    rgba(255,255,255,.35);

            cursor: pointer;

            transition:
                transform .18s ease,
                filter .18s ease;
        }

        .er-reward-claim:hover {
            filter:
                brightness(1.08);

            transform:
                translateY(-1px);
        }

        .er-reward-claim:active {
            transform:
                translateY(1px);
        }

        .er-reward-claim:disabled {
            opacity: .55;
            cursor: not-allowed;
            transform: none;
            filter: none;
        }

        .er-reward-countdown {
            display: none;

            margin: 11px auto 0;

            color:
                rgba(255,255,255,.45);

            font-size: 10px;

            font-weight: 700;
        }

        .er-reward-countdown strong {
            color: #ffc432;
        }


        /* ========================================================
           MOBILE
           ======================================================== */

        @media (max-width: 600px) {

            .er-reward-modal {
                padding: 8px;
            }

            .er-reward-panel {
                max-height:
                    calc(100vh - 16px);

                border-radius: 6px;
            }

            .er-reward-header {
                min-height: 62px;

                padding:
                    9px 55px 9px 10px;
            }

            .er-reward-header-title {
                font-size:
                    clamp(22px, 8vw, 30px);

                letter-spacing:
                    1px;
            }

            .er-reward-close {
                right: 8px;

                width: 45px;
                height: 45px;

                font-size: 29px;
            }

            .er-reward-grid {
                grid-template-columns:
                    repeat(3, minmax(0, 1fr));

                grid-template-rows:
                    repeat(3, minmax(105px, 1fr));

                gap: 7px;

                padding:
                    10px 9px 7px;
            }

            .er-reward-tile {
                min-height: 105px;
            }

            .er-reward-tile.day-seven {
                grid-column: 3;
                grid-row: 2 / span 2;
            }

            .er-reward-tile-day {
                padding:
                    6px 2px 2px;

                font-size: 11px;

                letter-spacing: .7px;
            }

            .er-reward-visual {
                font-size: 42px;
            }

            .er-reward-tile.day-seven
            .er-reward-visual {
                font-size: 58px;
            }

            .er-reward-tile-footer {
                min-height: 29px;

                font-size: 8px;

                padding:
                    4px 2px;
            }

            .er-reward-lock {
                width: 28px;
                height: 28px;

                font-size: 13px;
            }

            .er-reward-action-area {
                padding:
                    8px 10px 12px;
            }

            .er-reward-claim {
                min-height: 52px;

                width:
                    min(260px, 100%);

                font-size: 15px;
            }
        }


        /* ========================================================
           VERY SMALL SCREENS
           ======================================================== */

        @media (max-width: 360px) {

            .er-reward-grid {
                gap: 5px;
            }

            .er-reward-tile {
                min-height: 94px;
            }

            .er-reward-visual {
                font-size: 36px;
            }

            .er-reward-tile.day-seven
            .er-reward-visual {
                font-size: 50px;
            }

            .er-reward-tile-footer {
                font-size: 7px;
            }
        }


        /* ========================================================
           REDUCED MOTION
           ======================================================== */

        @media (prefers-reduced-motion: reduce) {

            .er-reward-modal,
            .er-reward-panel,
            .er-reward-launcher,
            .er-reward-close,
            .er-reward-claim {
                transition: none !important;
            }
        }

        `;

        document.head.appendChild(style);
    }


    /* ============================================================
       TILE VISUALS
       ============================================================ */

    function getVisual(day) {

        const visuals = {
            1: "🪙",
            2: "💰",
            3: "💰",
            4: "💵",
            5: "💰",
            6: "💎",
            7: "🏆"
        };

        return (
            visuals[day] ||
            "🪙"
        );
    }


    /* ============================================================
       CREATE LAUNCHER CARD
       ============================================================ */

    function createLauncher() {

        const rewardsList =
            document.getElementById(
                "rewardsList"
            );

        if (!rewardsList) {
            console.error(
                "Daily Check-in: #rewardsList not found."
            );

            return;
        }

        rewardsCard =
            document.createElement(
                "div"
            );

        rewardsCard.id =
            "erDailyRewardLauncher";

        rewardsCard.className =
            "er-reward-launcher";

        rewardsList.prepend(
            rewardsCard
        );

        rewardsCard.addEventListener(
            "click",
            function () {
                openModal();
            }
        );

        updateLauncher();
    }


    /* ============================================================
       UPDATE LAUNCHER
       ============================================================ */

    function updateLauncher() {

        if (!rewardsCard) {
            return;
        }

        const reward =
            getCurrentReward();

        const cooldown =
            cooldownActive();

        let status =
            "CLAIM NOW";

        let button =
            "VIEW REWARD";

        if (cooldown) {
            status =
                "CLAIMED";

            button =
                "CHECK BACK LATER";
        }

        rewardsCard.innerHTML = `

            <div class="er-reward-launcher-head">

                <div
                    class="er-reward-launcher-left"
                >

                    <div
                        class="er-reward-launcher-icon"
                    >
                        🎁
                    </div>

                    <div>

                        <p
                            class="er-reward-launcher-kicker"
                        >
                            WEEK ${state.week}
                            • DAY ${state.day}
                        </p>

                        <h3
                            class="er-reward-launcher-title"
                        >
                            Daily Reward
                        </h3>

                    </div>

                </div>

                <span
                    class="er-reward-launcher-status"
                >
                    ${status}
                </span>

            </div>

            <div
                class="er-reward-launcher-bottom"
            >

                <div>

                    <p
                        class="er-reward-launcher-label"
                    >
                        Today's Reward
                    </p>

                    <p
                        class="er-reward-launcher-value"
                    >
                        ${number(reward)}
                        <span>COINS</span>
                    </p>

                </div>

                <span
                    class="er-reward-launcher-button"
                >
                    ${button}
                </span>

            </div>
        `;
    }


    /* ============================================================
       CREATE MODAL
       ============================================================ */

    function createModal() {

        if (
            document.getElementById(
                "erDailyRewardModal"
            )
        ) {
            modal =
                document.getElementById(
                    "erDailyRewardModal"
                );

            return;
        }

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "erDailyRewardModal";

        modal.className =
            "er-reward-modal";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.innerHTML = `

            <div
                class="er-reward-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="erDailyRewardTitle"
            >

                <div
                    class="er-reward-header"
                >

                    <h2
                        class="er-reward-header-title"
                        id="erDailyRewardTitle"
                    >
                        Daily Reward
                    </h2>

                    <button
                        type="button"
                        class="er-reward-close"
                        id="erDailyRewardClose"
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>

                <div
                    class="er-reward-grid"
                    id="erDailyRewardGrid"
                ></div>

                <div
                    class="er-reward-action-area"
                >

                    <p
                        class="er-reward-week"
                        id="erDailyRewardWeek"
                    ></p>

                    <button
                        type="button"
                        class="er-reward-claim"
                        id="erDailyRewardClaim"
                    >
                        CLAIM
                    </button>

                    <div
                        class="er-reward-countdown"
                        id="erDailyRewardCountdown"
                    >
                        Next reward available in
                        <strong
                            id="erDailyRewardCountdownValue"
                        >
                            24:00:00
                        </strong>
                    </div>

                </div>

            </div>
        `;

        document.body.appendChild(
            modal
        );


        const close =
            document.getElementById(
                "erDailyRewardClose"
            );

        const claim =
            document.getElementById(
                "erDailyRewardClaim"
            );


        close.addEventListener(
            "click",
            closeModal
        );


        claim.addEventListener(
            "click",
            claimReward
        );


        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {
                    closeModal();
                }

            }
        );


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    modal.classList.contains(
                        "open"
                    )
                ) {
                    closeModal();
                }

            }
        );
    }


    /* ============================================================
       BUILD REWARD GRID
       ============================================================ */

    function buildRewardGrid() {

        const grid =
            document.getElementById(
                "erDailyRewardGrid"
            );

        if (!grid) {
            return;
        }

        let html = "";

        for (
            let day = 1;
            day <= DAYS_PER_WEEK;
            day++
        ) {

            const reward =
                getReward(
                    state.week,
                    day
                );

            const completed =
                isCompleted(
                    state.week,
                    day
                );

            const current =
                day === state.day &&
                !completed;

            const locked =
                day > state.day;

            let classes =
                "er-reward-tile";

            if (current) {
                classes +=
                    " current";
            }

            if (locked) {
                classes +=
                    " locked";
            }

            if (completed) {
                classes +=
                    " claimed";
            }

            if (day === 7) {
                classes +=
                    " day-seven";
            }

            let footer =
                `GET ${number(reward)} COINS`;

            if (completed) {
                footer =
                    `✓ ${number(reward)} COINS`;
            }

            html += `

                <div
                    class="${classes}"
                    data-day="${day}"
                >

                    <div
                        class="er-reward-tile-day"
                    >
                        DAY ${day}
                    </div>

                    <div
                        class="er-reward-visual"
                    >
                        ${getVisual(day)}
                    </div>

                    ${
                        locked
                            ? `
                                <div
                                    class="er-reward-lock"
                                >
                                    🔒
                                </div>
                              `
                            : ""
                    }

                    <div
                        class="er-reward-tile-footer"
                    >
                        ${footer}
                    </div>

                </div>
            `;
        }

        grid.innerHTML =
            html;
    }


    /* ============================================================
       UPDATE MODAL
       ============================================================ */

    function updateModal() {

        if (!modal) {
            return;
        }

        buildRewardGrid();

        const reward =
            getCurrentReward();

        const week =
            document.getElementById(
                "erDailyRewardWeek"
            );

        const claim =
            document.getElementById(
                "erDailyRewardClaim"
            );

        const countdown =
            document.getElementById(
                "erDailyRewardCountdown"
            );

        if (week) {
            week.textContent =
                `WEEK ${state.week} • DAY ${state.day} • ${number(reward)} COINS`;
        }

        if (
            cooldownActive()
        ) {

            if (claim) {
                claim.disabled =
                    true;

                claim.textContent =
                    "CLAIMED ✓";
            }

            if (countdown) {
                countdown.style.display =
                    "block";
            }

            startCountdown();

        } else {

            if (claim) {
                claim.disabled =
                    false;

                claim.textContent =
                    `CLAIM ${number(reward)} COINS`;
            }

            if (countdown) {
                countdown.style.display =
                    "none";
            }

            stopCountdown();
        }
    }


    /* ============================================================
       OPEN MODAL
       ============================================================ */

    function openModal() {

        if (!modal) {
            createModal();
        }

        updateModal();

        modal.classList.add(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    }


    /* ============================================================
       CLOSE MODAL
       ============================================================ */

    function closeModal() {

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";

        /*
         * VERY IMPORTANT:
         *
         * Closing the popup does not claim
         * the reward.
         *
         * claimedAt is NOT changed here.
         */
    }


    /* ============================================================
       ADD COINS THROUGH EXISTING GAME
       ============================================================ */

    function giveCoins(
        amount
    ) {

        if (
            !window.EarnRushGame ||
            typeof window.EarnRushGame.addCoins !==
                "function"
        ) {

            console.error(
                "Daily Check-in: EarnRushGame.addCoins() is unavailable."
            );

            return false;
        }

        try {

            /*
             * Existing EarnRush economy.
             * No duplicate/local fake balance.
             */

            window.EarnRushGame.addCoins(
                amount
            );

            return true;

        } catch (error) {

            console.error(
                "Daily Check-in: Could not add reward.",
                error
            );

            return false;
        }
    }


    /* ============================================================
       CLAIM
       ============================================================ */

    function claimReward() {

        if (claimInProgress) {
            return;
        }

        /*
         * Current reward must be available.
         */

        if (
            cooldownActive()
        ) {
            return;
        }

        const claimButton =
            document.getElementById(
                "erDailyRewardClaim"
            );

        if (!claimButton) {
            return;
        }

        claimInProgress =
            true;

        claimButton.disabled =
            true;

        const reward =
            getCurrentReward();

        /*
         * Add coins first.
         */

        const success =
            giveCoins(reward);

        if (!success) {

            claimInProgress =
                false;

            claimButton.disabled =
                false;

            claimButton.textContent =
                `CLAIM ${number(reward)} COINS`;

            return;
        }


        /*
         * Mark today's exact week/day as completed.
         */

        const key =
            dayKey(
                state.week,
                state.day
            );

        if (
            !state.completedDays.includes(
                key
            )
        ) {
            state.completedDays.push(
                key
            );
        }


        /*
         * Start the exact 24-hour cooldown
         * from the moment of claim.
         */

        state.claimedAt =
            Date.now();

        state.totalClaims +=
            1;

        saveState();


        /*
         * Refresh existing game UI if available.
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
                "Daily Check-in: UI refresh unavailable.",
                error
            );
        }


        /*
         * Update reward card immediately.
         */

        updateLauncher();

        updateModal();


        /*
         * Give the user a short visual confirmation,
         * then close the popup.
         */

        claimButton.textContent =
            "CLAIMED ✓";

        setTimeout(
            function () {

                closeModal();

                claimInProgress =
                    false;

            },
            650
        );
    }


    /* ============================================================
       COUNTDOWN
       ============================================================ */

    function countdownText(
        milliseconds
    ) {

        const seconds =
            Math.max(
                0,
                Math.floor(
                    milliseconds /
                        1000
                )
            );

        const hours =
            Math.floor(
                seconds / 3600
            );

        const minutes =
            Math.floor(
                (seconds % 3600) /
                    60
            );

        const secs =
            seconds % 60;

        return (
            String(hours)
                .padStart(2, "0") +
            ":" +
            String(minutes)
                .padStart(2, "0") +
            ":" +
            String(secs)
                .padStart(2, "0")
        );
    }


    function updateCountdown() {

        const value =
            document.getElementById(
                "erDailyRewardCountdownValue"
            );

        if (!value) {
            return;
        }

        const remaining =
            remainingTime();

        if (
            remaining <= 0
        ) {

            stopCountdown();

            /*
             * 24 hours completed.
             * Move to the next day/week.
             */

            if (
                advanceAfterCooldown()
            ) {

                updateLauncher();

                updateModal();

                /*
                 * If popup is currently open,
                 * show the newly unlocked day.
                 */

                if (
                    modal &&
                    modal.classList.contains(
                        "open"
                    )
                ) {
                    updateModal();
                }
            }

            return;
        }

        value.textContent =
            countdownText(
                remaining
            );
    }


    function startCountdown() {

        stopCountdown();

        updateCountdown();

        countdownInterval =
            setInterval(
                updateCountdown,
                1000
            );
    }


    function stopCountdown() {

        if (
            countdownInterval
        ) {

            clearInterval(
                countdownInterval
            );

            countdownInterval =
                null;
        }
    }


    /* ============================================================
       AUTO POPUP
       ============================================================ */

    function autoOpen() {

        /*
         * First ever visit:
         * current reward has never been claimed.
         */

        if (!state.claimedAt) {

            setTimeout(
                openModal,
                AUTO_OPEN_DELAY
            );

            return;
        }


        /*
         * Still inside 24-hour cooldown:
         * do NOT show popup.
         */

        if (
            cooldownActive()
        ) {
            return;
        }


        /*
         * 24 hours have passed:
         * unlock next day/week and show it.
         */

        if (
            advanceAfterCooldown()
        ) {
            updateLauncher();
        }

        setTimeout(
            openModal,
            AUTO_OPEN_DELAY
        );
    }


    /* ============================================================
       PAGE VISIBILITY
       ============================================================ */

    function onVisible() {

        if (
            document.visibilityState !==
            "visible"
        ) {
            return;
        }

        state =
            loadState();

        if (
            state.claimedAt &&
            !cooldownActive()
        ) {

            if (
                advanceAfterCooldown()
            ) {
                updateLauncher();
            }
        }
    }


    /* ============================================================
       WINDOW FOCUS
       ============================================================ */

    function onFocus() {

        state =
            loadState();

        if (
            state.claimedAt &&
            !cooldownActive()
        ) {

            if (
                advanceAfterCooldown()
            ) {
                updateLauncher();
            }
        }
    }


    /* ============================================================
       INITIALIZE
       ============================================================ */

    function init() {

        /*
         * Prevent duplicate initialization.
         */

        if (
            window.__EarnRushDailyRewardStarted
        ) {
            return;
        }

        window.__EarnRushDailyRewardStarted =
            true;


        state =
            loadState();


        /*
         * If the previous 24-hour cooldown
         * has already finished while the game
         * was closed, unlock next day first.
         */

        if (
            state.claimedAt &&
            !cooldownActive()
        ) {
            advanceAfterCooldown();
        }


        injectCSS();

        createModal();

        createLauncher();

        updateLauncher();

        autoOpen();


        document.addEventListener(
            "visibilitychange",
            onVisible
        );

        window.addEventListener(
            "focus",
            onFocus
        );


        console.log(
            "EarnRush Daily Reward initialized:",
            {
                week: state.week,
                day: state.day,
                reward:
                    getCurrentReward()
            }
        );
    }


    /* ============================================================
       START AFTER DOM
       ============================================================ */

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


    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.EarnRushDailyCheckin = {

        open: function () {
            openModal();
        },

        close: function () {
            closeModal();
        },

        getState: function () {
            return {
                ...state
            };
        },

        getReward: function (
            week,
            day
        ) {
            return getReward(
                week,
                day
            );
        },

        getCurrentReward:
            function () {
                return getCurrentReward();
            }
    };

})();