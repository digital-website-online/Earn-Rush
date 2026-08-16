
/* =========================================
   EARNRUSH — GAME ENGINE
========================================= */

(() => {
    "use strict";

    /* -----------------------------
       GAME STATE
    ----------------------------- */

    const gameState = {
        balance: 12840,
        level: 7,
        combo: 12,
        totalTaps: 0,

        baseReward: 245,

        comboProgress: 62
    };


    /* -----------------------------
       ELEMENTS
    ----------------------------- */

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


    /* -----------------------------
       FORMAT BALANCE
    ----------------------------- */

    function formatBalance(value) {

        return Math.floor(value).toLocaleString("en-US");

    }


    /* -----------------------------
       UPDATE BALANCE
    ----------------------------- */

    function updateBalance() {

        if (!balanceElement) return;

        balanceElement.textContent =
            formatBalance(gameState.balance);

    }


    /* -----------------------------
       UPDATE COMBO
    ----------------------------- */

    function updateCombo() {

        if (!comboValue) return;

        comboValue.textContent =
            `🔥 x${gameState.combo}`;

    }


    /* -----------------------------
       UPDATE PROGRESS
    ----------------------------- */

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


    /* -----------------------------
       CALCULATE REWARD
    ----------------------------- */

    function calculateReward() {

        const multiplier =
            1 + (gameState.combo * 0.05);

        return Math.floor(
            gameState.baseReward * multiplier
        );

    }


    /* -----------------------------
       TAP ACTION
    ----------------------------- */

    function performTap() {

        const reward =
            calculateReward();

        gameState.balance += reward;

        gameState.totalTaps++;

        gameState.comboProgress += 7;


        /* Combo increase */

        if (gameState.comboProgress >= 100) {

            gameState.combo++;

            gameState.comboProgress = 0;

        }


        updateBalance();
        updateCombo();
        updateProgress();

        playTapAnimation();

    }


    /* -----------------------------
       TAP ANIMATION
    ----------------------------- */

    function playTapAnimation() {

        if (!reactorCore) return;

        reactorCore.classList.remove("tap-pop");

        /*
         * Force browser reflow so the
         * animation can restart.
         */

        void reactorCore.offsetWidth;

        reactorCore.classList.add("tap-pop");


        if (balanceElement) {

            balanceElement.classList.remove(
                "balance-pop"
            );

            void balanceElement.offsetWidth;

            balanceElement.classList.add(
                "balance-pop"
            );

        }

    }


    /* -----------------------------
       EVENT LISTENERS
    ----------------------------- */

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


    /* -----------------------------
       INITIALIZE
    ----------------------------- */

    updateBalance();
    updateCombo();
    updateProgress();

})();