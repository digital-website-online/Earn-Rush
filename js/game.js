/* =========================================
   EARNRUSH — COMPLETE GAME ENGINE
========================================= */

(() => {
    "use strict";

    /* =========================================
       DEFAULT GAME STATE
    ========================================== */

    const defaultState = {
        balance: 12840,
        level: 7,
        combo: 12,
        comboProgress: 62,
        totalTaps: 0,
        baseReward: 245
    };


    /* =========================================
       LOAD SAVED GAME
    ========================================== */

    function loadGame() {

        try {

            const saved =
                localStorage.getItem("earnRushSave");

            if (!saved) {
                return {
                    ...defaultState
                };
            }

            const parsed =
                JSON.parse(saved);

            return {
                ...defaultState,
                ...parsed
            };

        } catch (error) {

            console.warn(
                "EarnRush save could not be loaded.",
                error
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
                "earnRushSave",
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

    const reactorCore =
        document.getElementById("reactorCore");

    const tapButton =
        document.getElementById("tapButton");

    const progressFill =
        document.querySelector(".progress-fill");

    const comboValue =
        document.querySelector(".combo-value");


    /* =========================================
       FORMAT NUMBERS
    ========================================== */

    function formatNumber(number) {

        return Math.floor(number)
            .toLocaleString("en-US");

    }


    /* =========================================
       UPDATE BALANCE
    ========================================== */

    function updateBalance() {

        if (!balanceElement) return;

        balanceElement.textContent =
            formatNumber(
                gameState.balance
            );
    }


    /* =========================================
       UPDATE COMBO
    ========================================== */

    function updateCombo() {

        if (!comboValue) return;

        comboValue.textContent =
            `🔥 x${gameState.combo}`;
    }


    /* =========================================
       UPDATE PROGRESS BAR
    ========================================== */

    function updateProgress() {

        if (!progressFill) return;

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
       UPDATE EVERYTHING
    ========================================== */

    function updateUI() {

        updateBalance();
        updateCombo();
        updateProgress();

    }


    /* =========================================
       CALCULATE TAP REWARD
    ========================================== */

    function calculateReward() {

        const comboBonus =
            gameState.combo * 25;

        return Math.floor(
            gameState.baseReward +
            comboBonus
        );
    }


    /* =========================================
       REACTOR ANIMATION
    ========================================== */

    function reactorEffect() {

        if (!reactorCore) return;

        reactorCore.classList.remove(
            "tap-pop"
        );

        void reactorCore.offsetWidth;

        reactorCore.classList.add(
            "tap-pop"
        );
    }


    /* =========================================
       BALANCE ANIMATION
    ========================================== */

    function balanceEffect() {

        if (!balanceElement) return;

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

    function createRewardPopup(amount) {

        const popup =
            document.createElement("div");

        popup.className =
            "earnrush-reward-popup";

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
                    easing: "ease-out"
                }
            );


        animation.onfinish =
            () => popup.remove();
    }


    /* =========================================
       MESSAGE POPUP
    ========================================== */

    function showMessage(text) {

        const message =
            document.createElement("div");

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
                    easing: "ease-out"
                }
            );


        animation.onfinish =
            () => message.remove();
    }


    /* =========================================
       COMBO LEVEL UP
    ========================================== */

    function comboLevelUp() {

        gameState.combo++;

        gameState.comboProgress = 0;

        const bonus = 1000;

        gameState.balance += bonus;

        createRewardPopup(
            bonus
        );

        showMessage(
            `🔥 COMBO x${gameState.combo}!`
        );
    }


    /* =========================================
       MAIN TAP FUNCTION
    ========================================== */

    function performTap() {

        const reward =
            calculateReward();


        /* Add reward */

        gameState.balance +=
            reward;


        /* Count tap */

        gameState.totalTaps++;


        /* Increase combo progress */

        gameState.comboProgress += 8;


        /* Check combo */

        if (
            gameState.comboProgress >=
            100
        ) {

            comboLevelUp();

        }


        /* Update screen */

        updateUI();


        /* Save immediately */

        saveGame();


        /* Visual feedback */

        reactorEffect();

        balanceEffect();

        createRewardPopup(
            reward
        );

    }


    /* =========================================
       BUTTON EVENTS
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
       SAVE WHEN PAGE IS HIDDEN
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
       SAVE BEFORE PAGE CLOSE
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