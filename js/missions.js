/* EarnRush Missions */

const missionList = [
    {
        id: "tap100",
        title: "First Rush",
        description: "Reach 100 total taps",
        target: 100,
        reward: 100
    },
    {
        id: "tap500",
        title: "Rush Master",
        description: "Reach 500 total taps",
        target: 500,
        reward: 500
    },
    {
        id: "tap1000",
        title: "Elite Tapper",
        description: "Reach 1,000 total taps",
        target: 1000,
        reward: 1000
    }
];


function renderMissions(gameState) {

    const container = document.getElementById("missionsList");

    if (!container) return;

    container.innerHTML = missionList.map(mission => {

        const completed =
            gameState.completedMissions.includes(mission.id);

        const progress =
            Math.min(gameState.totalTaps, mission.target);

        const percent =
            Math.min((progress / mission.target) * 100, 100);

        return `
            <div class="mission-card ${completed ? "completed" : ""}">

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
                                style="width:${percent}%"
                            ></div>
                        </div>

                        <span>
                            ${progress}/${mission.target}
                        </span>

                    </div>

                </div>

                <div class="mission-reward">
                    +${mission.reward} RS
                </div>

            </div>
        `;

    }).join("");
}


function handleTap(gameState) {

    let changed = false;

    missionList.forEach(mission => {

        if (
            gameState.totalTaps >= mission.target &&
            !gameState.completedMissions.includes(mission.id)
        ) {

            gameState.completedMissions.push(mission.id);

            gameState.balance += mission.reward;

            changed = true;
        }

    });

    renderMissions(gameState);

    return changed;
}


window.EarnRushMissions = {
    handleTap,
    renderMissions
};
