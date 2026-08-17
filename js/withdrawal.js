/* =========================================
   EARNRUSH — WITHDRAWAL SYSTEM (FINAL)
========================================= */
(() => {
  "use strict";

  /* LIVE USERS COUNTER */
  function initLiveCounter() {
    const counterEl = document.getElementById("liveUsersCounter");
    if (!counterEl) return;

    let currentCount = Math.floor(Math.random() * (350 - 200) + 200);
    counterEl.textContent = currentCount;

    setInterval(() => {
      const change = Math.floor(Math.random() * 60) - 30;
      currentCount = Math.max(200, Math.min(350, currentCount + change));
      counterEl.textContent = currentCount;
    }, 3000);
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

    if (accountTypeSelect) {
      accountTypeSelect.addEventListener("change", (e) => {
        const isMobile = e.target.value !== "bank";
        if (mobileInputGroup) mobileInputGroup.style.display = isMobile ? "block" : "none";
        if (bankInputGroup) bankInputGroup.style.display = isMobile ? "none" : "block";
      });
    }

    if (coinsInput && rsDisplay) {
      coinsInput.addEventListener("input", (e) => {
        const coins = parseFloat(e.target.value) || 0;
        const rs = (coins * 0.01).toFixed(2);
        rsDisplay.textContent = `= ${rs} Rs`;

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

    if (withdrawBtn) {
      withdrawBtn.addEventListener("click", () => {
        const state = window.EarnRushGame?.getState();
        if (!state) return;

        const coins = parseFloat(coinsInput.value) || 0;

        // VALIDATION
        if (coins < 500) {
          showErrorPopup("Minimum 500 coins required", "Enter at least 500 coins to withdraw");
          return;
        }

        if (coins > state.coins) {
          showErrorPopup("Aap ke paas coins kam hain", "You don't have enough coins. Keep earning!");
          return;
        }

        const accountType = accountTypeSelect.value;
        let accountNumber = "";

        if (accountType === "bank") {
          const bank = document.getElementById("bankSelect")?.value;
          accountNumber = document.getElementById("bankAccountNumber")?.value || "";
          if (!bank || !accountNumber) {
            showErrorPopup("Complete the form", "Please select bank and enter account number");
            return;
          }
        } else {
          accountNumber = document.getElementById("mobileNumber")?.value || "";
          if (!accountNumber || accountNumber.length < 10) {
            showErrorPopup("Invalid phone number", "Please enter a valid mobile number");
            return;
          }
        }

        // Show loading
        showLoading();
        withdrawBtn.disabled = true;

        // 8-10 sec verification
        setTimeout(() => {
          withdrawBtn.disabled = false;
          hideLoading();
          
          // Show pending message
          const msg = document.getElementById("withdrawMessage");
          if (msg) {
            msg.textContent = "⏳ Aap abhi eligible nahi hain. Admin approval pending.";
            msg.className = "withdraw-message pending show";
            msg.style.display = "block";
          }
        }, Math.random() * 2000 + 8000);
      });
    }
  }

  function showErrorPopup(title, message) {
    // Remove existing popup if any
    const existing = document.getElementById("errorPopup");
    if (existing) existing.remove();

    const popup = document.createElement("div");
    popup.id = "errorPopup";
    popup.className = "error-popup";
    popup.innerHTML = `
      <div class="error-popup-icon">❌</div>
      <div class="error-popup-title">${title}</div>
      <div class="error-popup-message">${message}</div>
      <button class="error-popup-btn" onclick="this.parentElement.remove()">OK</button>
    `;
    document.body.appendChild(popup);

    // Auto close after 5 seconds
    setTimeout(() => {
      if (existing) existing.remove();
    }, 5000);
  }

  function showLoading() {
    const loader = document.getElementById("withdrawLoader");
    if (loader) {
      loader.style.display = "flex";
      loader.classList.add("active");
    }
  }

  function hideLoading() {
    const loader = document.getElementById("withdrawLoader");
    if (loader) {
      loader.style.display = "none";
      loader.classList.remove("active");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLiveCounter();
    initWithdrawal();
  });
})();
