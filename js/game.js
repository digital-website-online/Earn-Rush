(() => {
    "use strict";

    const gameState = {
        balance: 12840,
        level: 7,
        combo: 12,
        comboProgress: 62,
        totalTaps: 0,
        baseReward: 245
    };

    const balanceElement = document.getElementById("balance");
    const reactorCore = document.getElementById("reactorCore");
    const tapButton = document.getElementById("tapButton");
    const progressFill = document.querySelector(".progress-fill");
    const comboValue = document.querySelector(".combo-value");

    function formatNumber(number) {
        return Math.floor(number).toLocaleString("en-US");
    }

    function updateUI() {
        if (balanceElement) {
            balanceElement.textContent =
                formatNumber(gameState.balance);
        }

        if (comboValue) {
            comboValue.textContent =
                `🔥 x${gameState.combo}`;
        }

        if (progressFill) {
            progressFill.style.width =
                `${gameState.comboProgress}%`;
        }
    }

    function calculateReward() {
        return Math.floor(
            gameState.baseReward +
            (gameState.combo * 25)
        );
    }

    function createRewardPopup(amount) {
        const popup = document.createElement("div");

        popup.textContent = `+${formatNumber(amount)} Rs`;

        popup.style.position = "fixed";
        popup.style.left = "50%";
        popup.style.top = "45%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.color = "#39ff88";
        popup.style.fontSize = "22px";
        popup.style.fontWeight = "900";
        popup.style.pointerEvents = "none";
        popup.style.zIndex = "9999";
        popup.style.textShadow =
            "0 0 15px rgba(57,255,136,.5)";

        document.body.appendChild(popup);

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
        ).onfinish = () => popup.remove();
    }

    function reactorEffect() {
        if (!reactorCore) return;

        reactorCore.classList.remove("tap-pop");

        void reactorCore.offsetWidth;

        reactorCore.classList.add("tap-pop");
    }

    function balanceEffect() {
        if (!balanceElement) return;

        balanceElement.classList.remove("balance-pop");

        void balanceElement.offsetWidth;

        balanceElement.classList.add("balance-pop");
    }

    function levelUp() {
        gameState.combo += 1;
        gameState.comboProgress = 0;

        createRewardPopup(
            1000
        );

        showMessage(
            `🔥 COMBO x${gameState.combo}!`
        );
    }

    function showMessage(text) {
        const message = document.createElement("div");

        message.textContent = text;

        message.style.position = "fixed";
        message.style.left = "50%";
        message.style.top = "18%";
        message.style.transform = "translateX(-50%)";
        message.style.padding = "12px 20px";
        message.style.borderRadius = "14px";
        message.style.background = "#0b1625";
        message.style.border =
            "1px solid rgba(57,255,136,.35)";
        message.style.color = "#ffffff";
        message.style.fontWeight = "900";
        message.style.zIndex = "10000";
        message.style.boxShadow =
            "0 0 30px rgba(57,255,136,.18)";
        message.style.pointerEvents = "none";

        document.body.appendChild(message);

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
                    opacity: 0
                }
            ],
            {
                duration: 1200,
                easing: "ease-out"
            }
        ).onfinish = () => message.remove();
    }

    function performTap() {
        const reward = calculateReward();

        gameState.balance += reward;
        gameState.totalTaps++;

        gameState.comboProgress += 8;

        if (gameState.comboProgress >= 100) {
            levelUp();
        }

        updateUI();

        reactorEffect();
        balanceEffect();

        createRewardPopup(reward);
    }

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

    updateUI();

})();