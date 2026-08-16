/* =========================================================
   EARNRUSH — MISSIONS
========================================================= */

const missions = [
    {
        id: "tap100",
        title: "First Rush",
        description: "Tap the reactor 100 times",
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

const missionStorageKey = "earnrush_missions";

let missionData = JSON.parse(
    localStorage.getItem(missionStorageKey)
) || {
    completed: []
};


/* =========================================================
   GET TOTAL TAPS
========================================================= */

function getTotalTaps() {

    return Number(
        localStorage.getItem("earnrush_taps") || 0
    );

}


/* =========================================================
   SAVE MISSIONS
========================================================= */

function saveMissionData() {

    localStorage.setItem(
        missionStorageKey,
        JSON.stringify(missionData)
    );

}


/* =========================================================
   RENDER MISSIONS
========================================================= */

function renderMissions() {

    const container =
        document.getElementById("missionsList");

    if (!container) return;

    const taps = getTotalTaps();

    container.innerHTML = missions.map(mission => {

        const completed =
            missionData.completed.includes(mission.id);

        const progress =
            Math.min(
                taps,
                mission.target
            );

        const percent =
            Math.min(
                (progress / mission.target) * 100,
                100
            );

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


/* =========================================================
   CHECK MISSION COMPLETION
========================================================= */

function checkMissions() {

    const taps = getTotalTaps();

    let changed = false;

    missions.forEach(mission => {

        if (
            taps >= mission.target &&
            !missionData.completed.includes(mission.id)
        ) {

            missionData.completed.push(mission.id);

            changed = true;

            /*
             * Reward is added only once when
             * the mission is actually completed.
             */

            const balance =
                Number(
                    localStorage.getItem(
                        "earnrush_balance"
                    ) || 0
                );

            localStorage.setItem(
                "earnrush_balance",
                balance + mission.reward
            );

        }

    });


    if (changed) {
        saveMissionData();
    }

    renderMissions();

}


/* =========================================================
   UPDATE MISSIONS
========================================================= */

function updateMissions() {

    checkMissions();

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderMissions();

        window.addEventListener(
            "earnrushTap",
            updateMissions
        );

    }
);