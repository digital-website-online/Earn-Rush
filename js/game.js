/* =========================================================
   EARNRUSH — CORE GAME ENGINE
   Version 5.0
   Coins • XP • Levels • Combo • Streak • Save System
========================================================= */

(() => {
    "use strict";

    const SAVE_KEY = "earnRushSave";
    const SAVE_VERSION = 5;

    const TAP_TAP_LIMIT = 2000;

    const defaultState = {
        saveVersion: SAVE_VERSION,

        coins: 50000,

        level: 1,
        xp: 0,
        xpToNextLevel: 500,

        combo: 1,
        comboProgress: 0,

        totalTaps: 0,
        baseCoinsPerTap: 1,

        tapTapEarned: 0,
        tapTapUnlocked: true,

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
       UI
    ===================================================== */

    const gameUI = window.EarnRushUI?.game;

    if (!gameUI) {
        console.error(
            "[EarnRush Game] EarnRushUI.game is not available. Make sure ui.js loads before game.js."
        );
    } else {
        gameUI.init();
    }


    /* =====================================================
       REWARDED-AD PROVIDER INTERFACE
    ===================================================== */

    if (!window.EarnRushAds) {
        window.EarnRushAds = {
            showRewardedAd(onComplete, onUnavailable) {
                console.warn(
                    "[EarnRush] No rewarded-ad provider is connected yet. " +
                    "Tap-Tap cannot unlock until window.EarnRushAds.showRewardedAd " +
                    "is replaced with a real provider integration."
                );

                if (typeof onUnavailable === "function") {
                    onUnavailable("no_provider");
                }
            }
        };
    }


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


    function queueSave() {

        clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {
            saveGame();
        }, 120);
    }


    /* =====================================================
       UTILITIES
    ===================================================== */

    function safeNumber(value, fallback = 0) {

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    /* =====================================================
       UI UPDATE
    ===================================================== */

    function updateUI() {

        if (!gameUI) return;

        gameUI.update({
            coins: gameState.coins,
            level: gameState.level,
            combo: gameState.combo,
            comboProgress: gameState.comboProgress,
            xp: gameState.xp,
            xpToNextLevel: gameState.xpToNextLevel,
            streak: gameState.streak
        });
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

        gameUI?.showMessage(
            `🎉 LEVEL ${gameState.level}! +${bonus} Coins`
        );

        gameUI?.createRewardPopup(
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

            gameUI?.showMessage(
                `🔥 COMBO x${gameState.combo}!`
            );
        }
    }


    /* =====================================================
       TAP-TAP LOCK
    ===================================================== */

    function showTapTapLockPopup() {

        if (!gameUI) return;

        gameUI.showTapTapLockPopup({
            onComplete: (popup) => {

                window.EarnRushAds.showRewardedAd(
                    () => {

                        gameState.tapTapEarned = 0;
                        gameState.tapTapUnlocked = true;

                        queueSave();

                        popup.remove();

                        gameUI.showMessage(
                            "✅ Tap-Tap unlocked!"
                        );
                    },

                    () => {

                        popup.remove();

                        gameUI.showMessage(
                            "Ad not available right now — try again soon."
                        );
                    }
                );
            }
        });
    }


    /* =====================================================
       TAP
    ===================================================== */

    let tapLocked = false;


    function performTap(event) {

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (tapLocked) return;

        tapLocked = true;

        requestAnimationFrame(() => {
            tapLocked = false;
        });


        if (
            !gameState.tapTapUnlocked ||
            gameState.tapTapEarned >= TAP_TAP_LIMIT
        ) {
            gameState.tapTapUnlocked = false;
            showTapTapLockPopup();
            return;
        }


        const reward =
            calculateTapReward();


        gameState.coins += reward;
        gameState.tapTapEarned += reward;

        if (gameState.tapTapEarned >= TAP_TAP_LIMIT) {
            gameState.tapTapUnlocked = false;
        }

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
        gameUI?.reactorEffect();
        gameUI?.coinsEffect();

        gameUI?.createRewardPopup(
            reward,
            "coins"
        );
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

    function bindTapEvents() {

        if (!gameUI?.dom) return;

        const reactor = gameUI.dom.reactorCore;
        const tapButton = gameUI.dom.tapButton;

        if (reactor) {
            reactor.onclick = performTap;
        }

        if (tapButton && tapButton !== reactor) {
            tapButton.onclick = performTap;
        }
    }

    bindTapEvents();


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


        /*
         * Sync the visible/local game balance with the
         * authoritative Supabase profile balance.
         */
        setCoinsFromServer(amount) {

            const coins =
                safeNumber(amount);

            gameState.coins =
                Math.max(0, coins);

            updateUI();
            saveGame();
        },


        showMessage(text) {
            gameUI?.showMessage(text);
        },


        createRewardPopup(
            amount,
            type
        ) {

            gameUI?.createRewardPopup(
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
            return gameState.totalTaps;
        },


        getBaseCoinsPerTap() {
            return gameState.baseCoinsPerTap;
        },


        getCompletedMissions() {
            return gameState.completedMissions;
        },


        getClaimedRewards() {
            return gameState.claimedRewards;
        },


        resetGame() {
            localStorage.removeItem(SAVE_KEY);
            location.reload();
        }

    };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    updateDailyStreak();
    updateUI();
    saveGame();

})();