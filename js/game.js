/* =========================================
   EARNRUSH — GAME ENGINE v1
========================================= */

(() => {
    "use strict";

    /* =========================================
       SAVE VERSION
    ========================================== */

    const SAVE_KEY = "earnRushSave";
    const SAVE_VERSION = 2;


    /* =========================================
       NEW PLAYER DEFAULTS
    ========================================== */

    const defaultState = {
        saveVersion: SAVE_VERSION,

        balance: 0,

        level: 1,

        combo: 1,

        comboProgress: 0,

        totalTaps: 0,

        baseReward: 10
    };


    /* =========================================
       LOAD GAME
    ========================================== */

    function loadGame() {

        try {

            const savedData =
                localStorage.getItem(SAVE_KEY);

            if (!savedData) {
                return {
                    ...defaultState
                };
            }

            const parsed =
                JSON.parse(savedData);


            /*
             * Ignore old demo save data.
             */

            if (
                parsed.saveVersion !==
                SAVE_VERSION
            ) {

                localStorage.removeItem(
                    SAVE_KEY
                );

                return {
                    ...defaultState
                };
            }


            return {
                ...defaultState,
                ...parsed
            };

        } catch (error) {

            console.warn(
                "EarnRush save could not be loaded.",
                error
            );

            localStorage.removeItem(
                SAVE_KEY
            );

            return {
                ...defaultState
            };
        }
    }


    /* =========================================
       GAME STATE
    ========================================== */

    const gameState = loadGame();


    /* =========================================
       SAVE GAME
    ========================================== */

    function saveGame() {

        try {

            localStorage.setItem(
                SAVE_KEY,
                JSON.stringify(gameState)
            );

        } catch (error) {

            console.warn(
                "EarnRush save could not be created.",
                error
            );
        }
    }


    /* =========================================
       ELEMENTS
    ========================================== */

    const balanceElement =
        document.getElementById("balance");

    const levelElement =
        document.getElementById("levelValue");

    const reactorCore =
        document.getElementById("reactorCore");

    const tapButton =
        document.getElementById("tapButton");

    const progressFill =
        document.querySelector(
            ".progress-fill"
        );

    const comboValue =
        document.querySelector(
            ".combo-value"
        );


    /* =========================================
       NUMBER FORMAT
    ========================================== */

    function formatNumber(number) {

        return Math.floor(
            number
        ).toLocaleString("en-US");

    }


    /* =========================================
       UPDATE BALANCE
    ========================================== */

    function updateBalance() {

        if (!balanceElement) {
            return;
        }

        balanceElement.textContent =
            formatNumber(
                gameState.balance
            );
    }


    /* =========================================
       UPDATE LEVEL
    ========================================== */

    function updateLevel() {

        if (!levelElement) {
            return;
        }

        levelElement.textContent =
            String(
                gameState.level
            ).padStart(2, "0");
    }


    /* =========================================
       UPDATE COMBO
    ========================================== */

    function updateCombo() {

        if (!comboValue) {
            return;
        }

        comboValue.textContent =
            `🔥 x${gameState.combo}`;
    }


    /* =========================================
       UPDATE PROGRESS
    ========================================== */

    function updateProgress() {

        if (!progressFill) {
            return;
        }

        const progress =
            Math.max(
                0,
                Math.min(
                    100,
                    gameState.comboProgress
                )
            );

        progressFill.style.width =
            `${progress}%`;
    }


    /* =========================================
       UPDATE COMPLETE UI
    ========================================== */

    function updateUI() {

        updateBalance();

        updateLevel();

        updateCombo();

        updateProgress();
    }


    /* =========================================
       TAP REWARD
    ========================================== */

    function calculateReward() {

        /*
         * Reward grows slowly with combo.
         */

        const comboBonus =
            (gameState.combo - 1) * 2;

        return (
            gameState.baseReward +
            comboBonus
        );
    }


    /* =========================================
       REACTOR EFFECT
    ========================================== */

    function reactorEffect() {

        if (!reactorCore) {
            return;
        }

        reactorCore.classList.remove(
            "tap-pop"
        );

        void reactorCore.offsetWidth;

        reactorCore.classList.add(
            "tap-pop"
        );
    }


    /* =========================================
       BALANCE EFFECT
    ========================================== */

    function balanceEffect() {

        if (!balanceElement) {
            return;
        }

        balanceElement.classList.remove(
            "balance-pop"
        );

        void balanceElement.offsetWidth;

        balanceElement.classList.add(
            "balance-pop"
        );
    }


    /* =========================================
       REWARD POPUP
    ========================================== */

    function createRewardPopup(
        amount
    ) {

        const popup =
            document.createElement(
                "div"
            );

        popup.textContent =
            `+${formatNumber(amount)} Rs`;

        popup.style.position =
            "fixed";

        popup.style.left =
            "50%";

        popup.style.top =
            "45%";

        popup.style.transform =
            "translate(-50%, -50%)";

        popup.style.color =
            "#39ff88";

        popup.style.fontSize =
            "22px";

        popup.style.fontWeight =
            "900";

        popup.style.pointerEvents =
            "none";

        popup.style.zIndex =
            "9999";

        popup.style.textShadow =
            "0 0 15px rgba(57,255,136,.5)";

        document.body.appendChild(
            popup
        );


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

                    easing:
                        "ease-out"
                }
            );


        animation.onfinish =
            () => popup.remove();
    }


    /* =========================================
       MESSAGE
    ========================================== */

    function showMessage(
        text
    ) {

        const message =
            document.createElement(
                "div"
            );

        message.textContent =
            text;

        message.style.position =
            "fixed";

        message.style.left =
            "50%";

        message.style.top =
            "18%";

        message.style.transform =
            "translateX(-50%)";

        message.style.padding =
            "12px 20px";

        message.style.borderRadius =
            "14px";

        message.style.background =
            "#0b1625";

        message.style.border =
            "1px solid rgba(57,255,136,.35)";

        message.style.color =
            "#ffffff";

        message.style.fontWeight =
            "900";

        message.style.zIndex =
            "10000";

        message.style.pointerEvents =
            "none";

        message.style.whiteSpace =
            "nowrap";

        message.style.boxShadow =
            "0 0 30px rgba(57,255,136,.18)";

        document.body.appendChild(
            message
        );


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

                    easing:
                        "ease-out"
                }
            );


        animation.onfinish =
            () => message.remove();
    }


    /* =========================================
       COMBO LEVEL UP
    ========================================== */

    function comboLevelUp() {

        gameState.combo += 1;

        gameState.comboProgress = 0;


        /*
         * Small bonus for maintaining combo.
         */

        const comboBonus = 50;

        gameState.balance +=
            comboBonus;


        createRewardPopup(
            comboBonus
        );


        showMessage(
            `🔥 COMBO x${gameState.combo}!`
        );
    }


    /* =========================================
       GAME LEVEL CALCULATION
    ========================================== */

    function checkLevelUp() {

        /*
         * Every 100 taps = next level.
         */

        const requiredTaps =
            gameState.level * 100;


        if (
            gameState.totalTaps >=
            requiredTaps
        ) {

            gameState.level += 1;


            showMessage(
                `🎉 LEVEL ${gameState.level}!`
            );
        }
    }


    /* =========================================
       MAIN TAP
    ========================================== */

    function performTap() {

        const reward =
            calculateReward();


        /*
         * Add balance.
         */

        gameState.balance +=
            reward;


        /*
         * Count tap.
         */

        gameState.totalTaps += 1;


        /*
         * Combo progress.
         */

        gameState.comboProgress += 8;


        /*
         * Combo milestone.
         */

        if (
            gameState.comboProgress >=
            100
        ) {

            comboLevelUp();
        }


        /*
         * Level check.
         */

        checkLevelUp();


        /*
         * Update UI.
         */

        updateUI();


        /*
         * Save immediately.
         */

        saveGame();


        /*
         * Visual feedback.
         */

        reactorEffect();

        balanceEffect();

        createRewardPopup(
            reward
        );
    }


    /* =========================================
       TAP EVENTS
    ========================================== */

    if (reactorCore) {

        reactorCore.addEventListener(
            "click",
            performTap
        );
    }


    if (tapButton) {

        tapButton.addEventListener(
            "click",
            performTap
        );
    }


    /* =========================================
       SAVE WHEN TAB GOES BACKGROUND
    ========================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "hidden"
            ) {

                saveGame();
            }
        }
    );


    /* =========================================
       SAVE BEFORE LEAVING
    ========================================== */

    window.addEventListener(
        "beforeunload",
        saveGame
    );


    /* =========================================
       INITIALIZE
    ========================================== */

    updateUI();

    saveGame();

})();