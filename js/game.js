/* =========================================================
   EARNRUSH — CORE GAME ENGINE
   Version 5.0
   Coins • XP • Levels • Combo • Streak • Save System
========================================================= */

(() => {
    "use strict";

    const SAVE_KEY = "earnRushSave";
    const SAVE_VERSION = 5;

    const defaultState = {
        saveVersion: SAVE_VERSION,

        coins: 0,

        level: 1,
        xp: 0,
        xpToNextLevel: 500,

        combo: 1,
        comboProgress: 0,

        totalTaps: 0,
        baseCoinsPerTap: 1,

        streak: 1,
        lastPlayedDate: null,

        completedMissions: [],
        claimedRewards: []
    };


    /* =====================================================
       STATE
    ===================================================== */

    function createDefaultState() {
        return {
            ...defaultState,
            completedMissions: [],
            claimedRewards: []
        };
    }


    function loadGame() {

        try {

            const saved = localStorage.getItem(SAVE_KEY);

            if (!saved) {
                return createDefaultState();
            }

            const parsed = JSON.parse(saved);

            if (!parsed || typeof parsed !== "object") {
                return createDefaultState();
            }

            /*
             * Keep old progress if the version is compatible.
             * This avoids unnecessary data loss during normal upgrades.
             */
            if (
                parsed.saveVersion &&
                parsed.saveVersion > SAVE_VERSION
            ) {
                console.warn("EarnRush save is from a newer version.");
                return createDefaultState();
            }

            return {
                ...createDefaultState(),
                ...parsed,

                saveVersion: SAVE_VERSION,

                completedMissions:
                    Array.isArray(parsed.completedMissions)
                        ? parsed.completedMissions
                        : [],

                claimedRewards:
                    Array.isArray(parsed.claimedRewards)
                        ? parsed.claimedRewards
                        : []
            };

        } catch (error) {

            console.warn(
                "EarnRush save could not be loaded.",
                error
            );

            return createDefaultState();
        }
    }


    const gameState = loadGame();


    /* =====================================================
       SAVE SYSTEM
    ===================================================== */

    let saveTimer = null;


    function saveGame() {

        try {

            gameState.saveVersion = SAVE_VERSION;

            localStorage.setItem(
                SAVE_KEY,
                JSON.stringify(gameState)
            );

        } catch (error) {

            console.warn(
                "EarnRush save could not be saved.",
                error
            );
        }
    }


    /*
     * Small debounce prevents localStorage being written
     * excessively during rapid gameplay.
     */
    function queueSave() {

        clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {
            saveGame();
        }, 120);
    }


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const coinsElement =
        document.getElementById("balance");

    const levelElement =
        document.getElementById("levelValue");

    const reactorCore =
        document.getElementById("reactorCore");

    const tapButton =
        document.getElementById("tapButton");

    const progressFill =
        document.querySelector(".progress-fill");

    const comboValue =
        document.querySelector(".combo-value");

    const xpBar =
        document.getElementById("xpBar");

    const xpText =
        document.getElementById("xpText");

    const streakElement =
        document.getElementById("streakValue");


    /* =====================================================
       UTILITIES
    ===================================================== */

    function formatNumber(value) {

        const number = Number(value) || 0;

        return number.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }


    function safeNumber(value, fallback = 0) {

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    /* =====================================================
       UI — COINS
    ===================================================== */

    function updateCoins() {

        if (!coinsElement) return;

        coinsElement.textContent =
            formatNumber(gameState.coins);
    }


    /* =====================================================
       UI — LEVEL
    ===================================================== */

    function updateLevel() {

        if (!levelElement) return;

        levelElement.textContent =
            String(gameState.level).padStart(2, "0");
    }


    /* =====================================================
       UI — COMBO
    ===================================================== */

    function updateCombo() {

        if (!comboValue) return;

        comboValue.textContent =
            `🔥 x${gameState.combo}`;
    }


    function updateComboProgress() {

        if (!progressFill) return;

        const progress = Math.max(
            0,
            Math.min(100, gameState.comboProgress)
        );

        progressFill.style.width =
            `${progress}%`;
    }


    /* =====================================================
       UI — XP
    ===================================================== */

    function updateXP() {

        const required =
            Math.max(1, gameState.xpToNextLevel);

        const current =
            Math.max(0, gameState.xp);

        const percentage =
            Math.min(
                100,
                (current / required) * 100
            );

        if (xpBar) {
            xpBar.style.width =
                `${percentage}%`;
        }

        if (xpText) {
            xpText.textContent =
                `${current} / ${required} XP`;
        }
    }


    /* =====================================================
       UI — STREAK
    ===================================================== */

    function updateStreak() {

        if (!streakElement) return;

        streakElement.textContent =
            `🔥 ${gameState.streak} Day`;
    }


    /* =====================================================
       COMPLETE UI
    ===================================================== */

    function updateUI() {

        updateCoins();
        updateLevel();
        updateCombo();
        updateComboProgress();
        updateXP();
        updateStreak();
    }


    /* =====================================================
       XP SYSTEM
    ===================================================== */

    function addXP(amount) {

        amount = safeNumber(amount);

        if (amount <= 0) return;

        gameState.xp += amount;

        let levelUps = 0;

        while (
            gameState.xp >= gameState.xpToNextLevel
        ) {

            gameState.xp -=
                gameState.xpToNextLevel;

            gameState.level += 1;

            gameState.baseCoinsPerTap += 0.5;

            gameState.xpToNextLevel =
                Math.floor(
                    gameState.xpToNextLevel * 1.25
                );

            levelUps++;

            levelUp();
        }

        updateUI();

        return levelUps;
    }


    /* =====================================================
       LEVEL UP
    ===================================================== */

    function levelUp() {

        const bonus =
            gameState.level * 10;

        gameState.coins += bonus;

        showMessage(
            `🎉 LEVEL ${gameState.level}! +${bonus} Coins`
        );

        createRewardPopup(
            bonus,
            "coins"
        );
    }


    /* =====================================================
       TAP REWARD
    ===================================================== */

    function calculateTapReward() {

        return Math.max(
            0.5,
            gameState.baseCoinsPerTap
        );
    }


    /* =====================================================
       COMBO SYSTEM
    ===================================================== */

    function updateComboFromTap() {

        gameState.comboProgress += 5;

        if (
            gameState.comboProgress >= 100
        ) {

            gameState.combo += 1;

            gameState.comboProgress = 0;

            showMessage(
                `🔥 COMBO x${gameState.combo}!`
            );
        }
    }


    /* =====================================================
       TAP
    ===================================================== */

    let tapLocked = false;


    function performTap(event) {

        /*
         * Prevent accidental double triggering when
         * reactorCore is inside/clicked through tapButton.
         */
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (tapLocked) return;

        tapLocked = true;

        requestAnimationFrame(() => {
            tapLocked = false;
        });


        const reward =
            calculateTapReward();


        gameState.coins += reward;

        gameState.totalTaps += 1;


        /* XP */
        addXP(1);


        /* Combo */
        updateComboFromTap();


        /* Missions */
        if (
            window.EarnRushMissions &&
            typeof window.EarnRushMissions.handleTap === "function"
        ) {

            try {

                window.EarnRushMissions.handleTap(
                    gameState
                );

            } catch (error) {

                console.warn(
                    "Mission tap handler failed.",
                    error
                );
            }
        }


        /* UI */
        updateUI();


        /* Save */
        queueSave();


        /* Effects */
        reactorEffect();
        coinsEffect();

        createRewardPopup(
            reward,
            "coins"
        );
    }


    /* =====================================================
       REACTOR EFFECT
    ===================================================== */

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


    /* =====================================================
       COIN EFFECT
    ===================================================== */

    function coinsEffect() {

        if (!coinsElement) return;

        coinsElement.classList.remove(
            "balance-pop"
        );

        void coinsElement.offsetWidth;

        coinsElement.classList.add(
            "balance-pop"
        );
    }


    /* =====================================================
       REWARD POPUP
    ===================================================== */

    function createRewardPopup(
        amount,
        type = "coins"
    ) {

        const value =
            safeNumber(amount);

        const popup =
            document.createElement("div");

        const icon =
            type === "coins"
                ? "🪙"
                : "💰";

        popup.textContent =
            `+${formatNumber(value)} ${icon}`;


        popup.className =
            "earnrush-reward-popup";


        /*
         * Fallback inline styling keeps the popup working
         * even if additional animation CSS is unavailable.
         */
        Object.assign(
            popup.style,
            {
                position: "fixed",
                left: "50%",
                top: "45%",
                transform:
                    "translate(-50%, -50%)",
                color: "#39ff88",
                fontSize: "22px",
                fontWeight: "900",
                pointerEvents: "none",
                zIndex: "9999",
                textShadow:
                    "0 0 15px rgba(57,255,136,.5)"
            }
        );


        document.body.appendChild(popup);


        if (
            typeof popup.animate ===
            "function"
        ) {

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


            animation.onfinish = () => {
                popup.remove();
            };

        } else {

            setTimeout(
                () => popup.remove(),
                700
            );
        }
    }


    /* =====================================================
       MESSAGE
    ===================================================== */

    let messageTimer = null;


    function showMessage(text) {

        const oldMessage =
            document.querySelector(
                ".earnrush-game-message"
            );

        if (oldMessage) {
            oldMessage.remove();
        }


        const message =
            document.createElement("div");

        message.className =
            "earnrush-game-message";

        message.textContent =
            String(text);


        Object.assign(
            message.style,
            {
                position: "fixed",
                left: "50%",
                top: "18%",
                transform:
                    "translateX(-50%)",
                padding: "12px 20px",
                borderRadius: "14px",
                background: "#0b1625",
                border:
                    "1px solid rgba(57,255,136,.35)",
                color: "#ffffff",
                fontWeight: "900",
                zIndex: "10000",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                maxWidth:
                    "calc(100vw - 30px)",
                textAlign: "center"
            }
        );


        document.body.appendChild(
            message
        );


        clearTimeout(messageTimer);


        if (
            typeof message.animate ===
            "function"
        ) {

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


            animation.onfinish = () => {
                message.remove();
            };

        } else {

            messageTimer =
                setTimeout(
                    () => message.remove(),
                    1200
                );
        }
    }


    /* =====================================================
       DAILY STREAK
    ===================================================== */

    function getLocalDateKey() {

        const date =
            new Date();

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function updateDailyStreak() {

        const today =
            getLocalDateKey();


        if (!gameState.lastPlayedDate) {

            gameState.lastPlayedDate =
                today;

            gameState.streak = 1;

            return;
        }


        if (
            gameState.lastPlayedDate ===
            today
        ) {
            return;
        }


        const previous =
            new Date(
                `${gameState.lastPlayedDate}T00:00:00`
            );

        const current =
            new Date(
                `${today}T00:00:00`
            );


        const difference =
            Math.round(
                (current - previous) /
                86400000
            );


        if (difference === 1) {

            gameState.streak += 1;

        } else {

            gameState.streak = 1;
        }


        gameState.lastPlayedDate =
            today;
    }


    /* =====================================================
       EVENTS
    ===================================================== */

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


    /* =====================================================
       SAVE WHEN PAGE LEAVES / HIDES
    ===================================================== */

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


    window.addEventListener(
        "pagehide",
        saveGame
    );


    window.addEventListener(
        "beforeunload",
        saveGame
    );


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.EarnRushGame = {

        getState() {
            return gameState;
        },


        save() {
            saveGame();
        },


        updateUI() {
            updateUI();
        },


        addXP(amount) {

            addXP(amount);

            saveGame();
        },


        addCoins(amount) {

            amount =
                safeNumber(amount);

            if (amount <= 0) return;

            gameState.coins += amount;

            updateUI();

            saveGame();
        },


        showMessage(text) {
            showMessage(text);
        },


        createRewardPopup(
            amount,
            type
        ) {

            createRewardPopup(
                amount,
                type
            );
        },


        getCoins() {
            return gameState.coins;
        },


        getLevel() {
            return gameState.level;
        },


        getXP() {
            return gameState.xp;
        },


        getCombo() {
            return gameState.combo;
        },


        getStreak() {
            return gameState.streak;
        },


        getTotalTaps() {
      