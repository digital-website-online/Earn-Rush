/* =========================================
   EARNRUSH — LIVE COUNTER + WITHDRAWAL SYSTEM
========================================= */
(() => {
  "use strict";

  /* LIVE USERS COUNTER */
  function initLiveCounter() {
    const counterEl = document.getElementById("liveUsersCounter");
    if (!counterEl) return;

    let currentCount = Math.floor(Math.random() * (350 - 200) + 200); // 200-350
    counterEl.textContent = currentCount;

    setInterval(() => {
      // Random change: +/- 5 to 30 users
      const change = Math.floor(Math.random() * 60) - 30; // -30 to +30
      currentCount = Math.max(200, Math.min(350, currentCount + change));
      counterEl.textContent = currentCount;
    }, 3000); // Change every 3 seconds
  }

  /* WITHDRAWAL SYSTEM */
  function initWithdrawal() {
    const accountTypeSelect = document.getElementById("accountType");
    const mobileInputGroup = document.getElementById("mobileInputGroup");
    const bankInputGroup = document.getElementById("bankInputGroup");
    const coinsInput = document.getElementById("withdrawCoins");
    const rsDisplay = document.getElementById("rsDisplay");
    const withdrawBtn = document.getElementById("withdrawBtn");
    const withdrawMessage = document.getElementById("withdrawMessage");

    // Toggle between account types
    if (accountTypeSelect) {
      accountTypeSelect.addEventListener("change", (e) => {
        const isMobile = e.target.value !== "bank";
        if (mobileInputGroup) mobileInputGroup.style.display = isMobile ? "block" : "none";
        if (bankInputGroup) bankInputGroup.style.display = isMobile ? "none" : "block";
      });
    }

    // Real-time coin to Rs conversion
    if (coinsInput && rsDisplay) {
      coinsInput.addEventListener("input", (e) => {
        const coins = parseFloat(e.target.value) || 0;
        const rs = (coins * 0.01).toFixed(2);
        rsDisplay.textContent = `= ${rs} Rs`;

        // Disable button if less than 500
        if (withdrawBtn) {
          withdrawBtn.disabled = coins < 500;
          if (coins < 500) {
            withdrawBtn.style.opacity = "0.5";
            withdrawBtn.style.cursor = "not-allowed";
          } else {
            withdrawBtn.style.opacity = "1";
            withdrawBtn.style.cursor = "pointer";
          }
        }
      });
    }

    // Withdraw button logic
    if (withdrawBtn) {
      withdrawBtn.addEventListener("click", () => {
        const state = window.EarnRushGame?.getState();
        if (!state) return;

        const coins = parseFloat(coinsInput.value) || 0;

        // Validation
        if (coins < 500) {
          showWithdrawMessage("❌ Minimum 500 coins required", "error");
          return;
        }

        if (coins > state.coins) {
          showWithdrawMessage("❌ Aap ke paas coins kam hain", "error");
          return;
        }

        const accountType = accountTypeSelect.value;
        let accountNumber = "";

        if (accountType === "bank") {
          const bank = document.getElementById("bankSelect")?.value;
          accountNumber = document.getElementById("bankAccountNumber")?.value || "";
          if (!bank || !accountNumber) {
            showWithdrawMessage("❌ Bank aur account number enter kren", "error");
            return;
          }
        } else {
          accountNumber = document.getElementById("mobileNumber")?.value || "";
          if (!accountNumber || accountNumber.length < 10) {
            showWithdrawMessage("❌ Valid phone number enter kren", "error");
            return;
          }
        }

        // Show loading
        showLoading();
        withdrawBtn.disabled = true;

        // Simulate 8-10 sec verification
        setTimeout(() => {
          withdrawBtn.disabled = false;
          hideLoading();

          // For now: always show "eligible nahi" message (can be changed to check actual conditions)
          showWithdrawMessage("⏳ Aap abhi eligible nahi hain. Admin approval pending.", "pending");

          // Optional: Deduct coins on success (uncomment if needed)
          // state.coins -= coins;
          // window.EarnRushGame.updateUI();
          // coinsInput.value = "";
          // rsDisplay.textContent = "= 0 Rs";
        }, Math.random() * 2000 + 8000); // 8-10 seconds
      });
    }
  }

  function showWithdrawMessage(text, type) {
    const msg = document.getElementById("withdrawMessage");
    if (!msg) return;
    msg.textContent = text;
    msg.className = `withdraw-message ${type}`;
    msg.style.display = "block";
  }

  function showLoading() {
    const loader = document.getElementById("withdrawLoader");
    if (loader) loader.style.display = "flex";
  }

  function hideLoading() {
    const loader = document.getElementById("withdrawLoader");
    if (loader) loader.style.display = "none";
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLiveCounter();
    initWithdrawal();
  });
})();
