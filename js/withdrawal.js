/* =========================================
   EARNRUSH — WITHDRAWAL SYSTEM (FINAL)
========================================= */
(() => {
  "use strict";

  /* =====================================================
     LIVE USERS COUNTER — SMOOTH NUMBER WHEEL
  ===================================================== */

  function initLiveCounter() {
    const counterEl =
      document.getElementById("liveUsersCounter");

    if (!counterEl) return;

    let currentCount =
      Math.floor(Math.random() * 51) + 200;


    /* ---------------------------------------------
       Create digit wheel
    --------------------------------------------- */

    function createDigits(number) {
      return String(number)
        .padStart(3, "0")
        .split("")
        .map((digit, index) => `
          <span
            class="counter-digit"
            data-index="${index}"
          >
            <span class="digit-track">
              <span>${digit}</span>
            </span>
          </span>
        `)
        .join("");
    }


    counterEl.classList.add(
      "live-counter-wheel"
    );

    counterEl.innerHTML =
      createDigits(currentCount);


    /* ---------------------------------------------
       Animate number
    --------------------------------------------- */

    function animateNumber(nextNumber) {

      const oldNumber =
        currentCount;

      if (
        nextNumber === oldNumber
      ) {
        return;
      }


      const oldDigits =
        String(oldNumber)
          .padStart(3, "0")
          .split("");


      const newDigits =
        String(nextNumber)
          .padStart(3, "0")
          .split("");


      const digitElements =
        counterEl.querySelectorAll(
          ".counter-digit"
        );


      digitElements.forEach(
        (digitEl, index) => {

          const track =
            digitEl.querySelector(
              ".digit-track"
            );

          if (!track) return;


          const oldDigit =
            Number(oldDigits[index]);

          const newDigit =
            Number(newDigits[index]);


          if (
            oldDigit === newDigit
          ) {
            return;
          }


          /*
           * Direction is decided
           * for EACH digit.
           */
          let direction;

          if (
            newDigit > oldDigit
          ) {
            direction = "up";
          } else if (
            newDigit < oldDigit
          ) {
            direction = "down";
          } else {
            return;
          }


          /*
           * Reset previous animation
           */
          track.classList.remove(
            "rolling",
            "counter-roll-up",
            "counter-roll-down"
          );


          track.style.transition =
            "none";


          /*
           * Old + new digit
           */
          track.innerHTML = `
            <span>${oldDigit}</span>
            <span>${newDigit}</span>
          `;


          /*
           * Starting position
           */
          track.style.transform =
            direction === "up"
              ? "translateY(0)"
              : "translateY(-100%)";


          void track.offsetWidth;


          /*
           * Small stagger between digits.
           * Prevents the whole number
           * from looking like one jump.
           */
          const delay =
            index * 55;


          setTimeout(() => {

            track.style.transition =
              "transform 480ms cubic-bezier(.22,.61,.36,1)";


            track.style.transform =
              direction === "up"
                ? "translateY(-100%)"
                : "translateY(0)";


          }, delay);


          /*
           * Clean animation
           */
          setTimeout(() => {

            track.style.transition =
              "none";

            track.classList.remove(
              "rolling",
              "counter-roll-up",
              "counter-roll-down"
            );


            track.innerHTML = `
              <span>${newDigit}</span>
            `;


            track.style.transform =
              "translateY(0)";


          }, 600 + delay);

        }
      );


      currentCount =
        nextNumber;
    }


    /* ---------------------------------------------
       Choose next number
    --------------------------------------------- */

    function chooseNextNumber() {

      /*
       * Only 1–2 users at a time.
       */
      const step =
        Math.floor(
          Math.random() * 2
        ) + 1;


      /*
       * Slightly more chance
       * of increasing.
       */
      const direction =
        Math.random() < 0.55
          ? 1
          : -1;


      let nextNumber =
        currentCount +
        direction * step;


      /*
       * Keep realistic range.
       */
      nextNumber =
        Math.max(
          200,
          Math.min(
            350,
            nextNumber
          )
        );


      /*
       * Boundary protection
       */
      if (
        nextNumber === currentCount
      ) {

        nextNumber =
          currentCount < 350
            ? currentCount + 1
            : currentCount - 1;
      }


      animateNumber(
        nextNumber
      );
    }


    /* ---------------------------------------------
       Natural timing
    --------------------------------------------- */

    function scheduleNextChange() {

      const delay =
        Math.floor(
          Math.random() * 2500
        ) + 2500;


      setTimeout(() => {

        chooseNextNumber();

        scheduleNextChange();

      }, delay);
    }


    scheduleNextChange();
  }


  /* =====================================================
     WITHDRAWAL SYSTEM
  ===================================================== */

  function initWithdrawal() {

    const accountTypeSelect =
      document.getElementById(
        "accountType"
      );

    const mobileInputGroup =
      document.getElementById(
        "mobileInputGroup"
      );

    const bankInputGroup =
      document.getElementById(
        "bankInputGroup"
      );

    const coinsInput =
      document.getElementById(
        "withdrawCoins"
      );

    const rsDisplay =
      document.getElementById(
        "rsDisplay"
      );

    const withdrawBtn =
      document.getElementById(
        "withdrawBtn"
      );


    /* ---------------------------------------------
       Account type
    --------------------------------------------- */

    if (accountTypeSelect) {

      accountTypeSelect.addEventListener(
        "change",
        (e) => {

          const isMobile =
            e.target.value !== "bank";


          if (mobileInputGroup) {

            mobileInputGroup.style.display =
              isMobile
                ? "block"
                : "none";
          }


          if (bankInputGroup) {

            bankInputGroup.style.display =
              isMobile
                ? "none"
                : "block";
          }

        }
      );
    }


    /* ---------------------------------------------
       Coins → Rs
    --------------------------------------------- */

    if (
      coinsInput &&
      rsDisplay
    ) {

      coinsInput.addEventListener(
        "input",
        (e) => {

          const coins =
            parseFloat(
              e.target.value
            ) || 0;


          const rs =
            (
              coins * 0.001
            ).toFixed(2);


          rsDisplay.textContent =
            `= ${rs} Rs`;


          if (withdrawBtn) {

            withdrawBtn.disabled =
              coins < 500;


            if (
              coins < 500
            ) {

              withdrawBtn.style.opacity =
                "0.5";

              withdrawBtn.style.cursor =
                "not-allowed";

            } else {

              withdrawBtn.style.opacity =
                "1";

              withdrawBtn.style.cursor =
                "pointer";
            }
          }

        }
      );
    }


    /* ---------------------------------------------
       Withdraw
    --------------------------------------------- */

    if (withdrawBtn) {

      withdrawBtn.addEventListener(
        "click",
        () => {

          const state =
            window.EarnRushGame?.getState();


          if (!state) return;


          const coins =
            parseFloat(
              coinsInput?.value
            ) || 0;


          /* VALIDATION */

          if (
            coins < 500
          ) {

            showErrorPopup(
              "Minimum 500 coins required",
              "Enter at least 500 coins to withdraw"
            );

            return;
          }


          if (
            coins > state.coins
          ) {

            showErrorPopup(
              "Aap ke paas coins kam hain",
              "You don't have enough coins. Keep earning!"
            );

            return;
          }


          const accountType =
            accountTypeSelect?.value;


          let accountNumber =
            "";


          /* BANK */

          if (
            accountType === "bank"
          ) {

            const bank =
              document.getElementById(
                "bankSelect"
              )?.value;


            accountNumber =
              document.getElementById(
                "bankAccountNumber"
              )?.value || "";


            if (
              !bank ||
              !accountNumber
            ) {

              showErrorPopup(
                "Complete the form",
                "Please select bank and enter account number"
              );

              return;
            }

          }


          /* MOBILE */

          else {

            accountNumber =
              document.getElementById(
                "mobileNumber"
              )?.value || "";


            if (
              !accountNumber ||
              accountNumber.length < 10
            ) {

              showErrorPopup(
                "Invalid phone number",
                "Please enter a valid mobile number"
              );

              return;
            }
          }


          /* LOADING */

          showLoading();

          withdrawBtn.disabled =
            true;


          /*
           * Verification delay
           */
          setTimeout(() => {

            withdrawBtn.disabled =
              false;

            hideLoading();


            const msg =
              document.getElementById(
                "withdrawMessage"
              );


            if (msg) {

              msg.textContent =
                "⏳ Aap abhi eligible nahi hain. Admin approval pending.";


              msg.className =
                "withdraw-message pending show";


              msg.style.display =
                "block";
            }

          }, Math.random() * 2000 + 8000);

        }
      );
    }
  }


  /* =====================================================
     ERROR POPUP
  ===================================================== */

  function showErrorPopup(
    title,
    message
  ) {

    const existing =
      document.getElementById(
        "errorPopup"
      );


    if (existing) {
      existing.remove();
    }


    const popup =
      document.createElement(
        "div"
      );


    popup.id =
      "errorPopup";


    popup.className =
      "error-popup";


    popup.innerHTML = `
      <div class="error-popup-icon">
        ❌
      </div>

      <div class="error-popup-title">
        ${title}
      </div>

      <div class="error-popup-message">
        ${message}
      </div>

      <button
        class="error-popup-btn"
        type="button"
      >
        OK
      </button>
    `;


    document.body.appendChild(
      popup
    );


    const closeBtn =
      popup.querySelector(
        ".error-popup-btn"
      );


    if (closeBtn) {

      closeBtn.addEventListener(
        "click",
        () => popup.remove()
      );
    }


    /* Auto close */

    setTimeout(() => {

      if (
        document.getElementById(
          "errorPopup"
        ) === popup
      ) {

        popup.remove();
      }

    }, 5000);
  }


  /* =====================================================
     WITHDRAW LOADING
  ===================================================== */

  function showLoading() {

    const loader =
      document.getElementById(
        "withdrawLoader"
      );


    if (loader) {

      loader.style.display =
        "flex";

      loader.classList.add(
        "active"
      );
    }
  }


  function hideLoading() {

    const loader =
      document.getElementById(
        "withdrawLoader"
      );


    if (loader) {

      loader.style.display =
        "none";

      loader.classList.remove(
        "active"
      );
    }
  }


  /* =====================================================
     INITIALIZE
  ===================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      initLiveCounter();

      initWithdrawal();

    }
  );

})();