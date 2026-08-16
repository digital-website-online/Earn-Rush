
/* =========================================
   EARNRUSH — MISSIONS SYSTEM
========================================= */

(() => {
    "use strict";


    const missionDefinitions = [

        {
            id: "tap_25",
            title: "First Rush",
            description: "Tap the reactor 25 times.",
            type: "taps",
            target: 25,
            reward: 25,
            xp: 10
        },

        {
            id: "tap_100",
            title: "Tap Machine",
            description: "Tap the reactor 100 times.",
            type: "taps",
            target: 100,
            reward: 75,
            xp: 25
        },

        {
            id: "balance_100",
            title: "First Hundred",
            description: "Reach 100 Rs.",
            type: "balance",
            target: 100,
            reward: 50,
            xp: 20
        },

        {
            id: "combo_5",
            title: "Combo Starter",
            description: "Reach a 5x combo.",
            type: "combo",
            target: 5,
            reward: 100,
            xp: 30
        },

        {
            id: "level_3",
            title: "Rising Player",
            description: "Reach Level 3.",
            type: "level",
            target: 3,
            reward: 150,
            xp: 40
        }
    ];


    /* =========================================
       GET MISSION STATE
    ========================================= */

    function getMissionState() {

        const game =
            window.EarnRushGame;

        if (!game) {
            return null;
        }

        return game.getState();
    }


    /* =========================================
       IS COMPLETED
    ========================================= */

    function isCompleted(
        mission,
        state
    ) {

        return state.completedMissions
            .includes(
                mission.id
            );
    }


    /* =========================================
       GET PROGRESS
    ========================================= */

    function getProgress(
        mission,
        state
    ) {

        let current = 0;

        switch (
            mission.type
        ) {

            case "taps":

                current =
                    state.totalTaps;

                break;


            case "balance":

                current =
                    state.balance;

                break;


            case "combo":

                current =
                    state.combo;

                break;


            case "level":

                current =
                    state.level;

                break;
        }


        return Math.min(
            current,
            mission.target
        );
    }


    /* =========================================
       COMPLETE MISSION
    ========================================= */

    function completeMission(
        mission,
        state
    ) {

        if (
            isCompleted(
                mission,
                state
            )
        ) {

            return;
        }


        state.completedMissions.push(
            mission.id
        );


        /* Reward */

        if (
            window.EarnRushGame
        ) {

            window
                .EarnRushGame
                .addBalance(
                    mission.reward
                );

            window
                .EarnRushGame
                .addXP(
                    mission.xp
                );

            window
                .EarnRushGame
                .showMessage(
                    `🎯 Mission Complete! +${mission.reward} Rs`
                );
        }
    }


    /* =========================================
       CHECK MISSIONS
    ========================================= */

    function checkMissions() {

        const state =
            getMissionState();

        if (!state) return;


        missionDefinitions.forEach(
            mission => {

                if (
                    isCompleted(
                        mission,
                        state
                    )
                ) {

                    return;
                }


                const progress =
                    getProgress(
                        mission,
                        state
                    );


                if (
                    progress >=
                    mission.target
                ) {

                    completeMission(
                        mission,
                        state
                    );
                }
            }
        );
    }


    /* =========================================
       TAP HANDLER
    ========================================= */

    function handleTap() {

        checkMissions();

        renderMissions();
    }


    /* =========================================
       RENDER MISSIONS
    ========================================= */

    function renderMissions() {

        const container =
            document.getElementById(
                "missionsList"
            );

        if (!container) {
            return;
        }


        const state =
            getMissionState();

        if (!state) {
            return;
        }


        container.innerHTML = "";


        missionDefinitions.forEach(
            mission => {

                const completed =
                    isCompleted(
                        mission,
                        state
                    );


                const progress =
                    getProgress(
                        mission,
                        state
                    );


                const percentage =
                    (
                        progress /
                        mission.target
                    ) * 100;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "mission-card";


                if (completed) {

                    card.classList.add(
                        "completed"
                    );
                }


                card.innerHTML = `

                    <div class="mission-icon">
                        ${completed ? "✓" : "🎯"}
                    </div>

                    <div class="mission-content">

                        <div class="mission-title">
                            ${mission.title}
                        </div>

                        <div class="mission-description">
                            ${mission.description}
                        </div>

                        <div class="mission-progress">

                            <div class="mission-progress-track">

                                <div
                                    class="mission-progress-fill"
                                    style="width:${percentage}%"
                                ></div>

                            </div>

                            <span>
                                ${progress}/${mission.target}
                            </span>

                        </div>

                    </div>

                    <div class="mission-reward">
                        +${mission.reward} Rs
                    </div>

                `;


                container.appendChild(
                    card
                );
            }
        );
    }


    /* =========================================
       PUBLIC API
    ========================================= */

    window.EarnRushMissions = {

        handleTap() {

            checkMissions();

            renderMissions();
        },

        check() {

            checkMissions();
        },

        render() {

            renderMissions();
        },

        getDefinitions() {

            return missionDefinitions;
        }
    };


    /* =========================================
       INITIAL RENDER
    ========================================= */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            renderMissions();
        }
    );

})();