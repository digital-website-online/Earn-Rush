/* =========================================
   EARNRUSH — REWARDS SYSTEM
========================================= */

(() => {
    "use strict";


    const rewards = [

        {
            id: "starter",
            title: "Starter Bonus",
            requirement: "Reach 100 Rs.",
            target: 100,
            reward: 50
        },

        {
            id: "level5",
            title: "Level 5 Bonus",
            requirement: "Reach Level 5.",
            target: 5,
            reward: 250
        },

        {
            id: "level10",
            title: "Level 10 Bonus",
            requirement: "Reach Level 10.",
            target: 10,
            reward: 750
        },

        {
            id: "combo10",
            title: "Combo Master",
            requirement: "Reach 10x Combo.",
            target: 10,
            reward: 500
        }
    ];


    function getState() {

        if (!window.EarnRushGame) {
            return null;
        }

        return window
            .EarnRushGame
            .getState();
    }


    function isClaimed(
        reward,
        state
    ) {

        return state.claimedRewards
            .includes(
                reward.id
            );
    }


    function getProgress(
        reward,
        state
    ) {

        if (
            reward.id ===
            "starter"
        ) {

            return state.balance;
        }


        if (
            reward.id ===
            "level5" ||
            reward.id ===
            "level10"
        ) {

            return state.level;
        }


        if (
            reward.id ===
            "combo10"
        ) {

            return state.combo;
        }


        return 0;
    }


    function claimReward(
        reward,
        state
    ) {

        if (
            isClaimed(
                reward,
                state
            )
        ) {

            return;
        }


        state.claimedRewards.push(
            reward.id
        );


        window
            .EarnRushGame
            .addBalance(
                reward.reward
            );


        window
            .EarnRushGame
            .showMessage(
                `🎁 Reward Unlocked! +${reward.reward} Rs`
            );
    }


    function checkRewards() {

        const state =
            getState();

        if (!state) return;


        rewards.forEach(
            reward => {

                if (
                    isClaimed(
                        reward,
                        state
                    )
                ) {

                    return;
                }


                const progress =
                    getProgress(
                        reward,
                        state
                    );


                if (
                    progress >=
                    reward.target
                ) {

                    claimReward(
                        reward,
                        state
                    );
                }
            }
        );
    }


    function renderRewards() {

        const container =
            document.getElementById(
                "rewardsList"
            );

        if (!container) {
            return;
        }


        const state =
            getState();

        if (!state) {
            return;
        }


        container.innerHTML = "";


        rewards.forEach(
            reward => {

                const claimed =
                    isClaimed(
                        reward,
                        state
                    );


                const progress =
                    getProgress(
                        reward,
                        state
                    );


                const percentage =
                    Math.min(
                        100,
                        (
                            progress /
                            reward.target
                        ) * 100
                    );


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "reward-card";


                if (claimed) {

                    card.classList.add(
                        "claimed"
                    );
                }


                card.innerHTML = `

                    <div class="reward-icon">
                        ${claimed ? "✓" : "🎁"}
                    </div>

                    <div class="reward-content">

                        <div class="reward-title">
                            ${reward.title}
                        </div>

                        <div class="reward-description">
                            ${reward.requirement}
                        </div>

                        <div class="reward-progress-track">

                            <div
                                class="reward-progress-fill"
                                style="width:${percentage}%"
                            ></div>

                        </div>

                    </div>

                    <div class="reward-value">
                        +${reward.reward} Rs
                    </div>

                `;


                container.appendChild(
                    card
                );
            }
        );
    }


    window.EarnRushRewards = {

        check() {

            checkRewards();
        },

        render() {

            renderRewards();
        },

        getRewards() {

            return rewards;
        }
    };


    document.addEventListener(
        "DOMContentLoaded",
        () => {

            renderRewards();
        }
    );

})();
