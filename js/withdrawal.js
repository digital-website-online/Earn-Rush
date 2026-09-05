/* =========================================
   EARNRUSH — WITHDRAWAL SYSTEM (FINAL)
========================================= */
(() => {
  "use strict";

  // Single source of truth for the coin economy on this page.
  // 2,000 Coins = Rs 1  ->  RATE = 0.0005
  // Minimum withdrawal = 50,000 Coins = Rs 25
  const COIN_TO_RS_RATE = 0.0005;
  const MIN_WITHDRAW_COINS = 50000;

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
              coins * COIN_TO_RS_RATE
            ).toFixed(2);


          rsDisplay.textContent =
            `= ${rs} Rs`;


          if (withdrawBtn) {

            withdrawBtn.disabled =
              coins < MIN_WITHDRAW_COINS;


            if (
              coins < MIN_WITHDRAW_COINS
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
        async () => {

          // Auth gate — smallest possible addition ahead of the
          // existing validation below, which is otherwise untouched.
          // A guest must sign in/create an account before a real
          // withdrawal can be created against their profile.
          if (window.EarnRushAuth && !window.EarnRushAuth.getUser()) {
            window.EarnRushAuth.requireAuth();
            return;
          }

          // Prevent double submission while a request is in flight.
          if (withdrawBtn.disabled) return;

          const state =
            window.EarnRushGame?.getState();


          if (!state) return;


          const coins =
            parseFloat(
              coinsInput?.value
            ) || 0;


          /* VALIDATION */

          if (
            coins < MIN_WITHDRAW_COINS
          ) {

            showErrorPopup(
              "Minimum 50,000 coins required",
              "Enter at least 50,000 coins to withdraw"
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


          // Cash amount is derived server-side-equivalent here from
          // the trusted coin count only — never read from any input
          // or variable a caller could set directly, so this can't be
          // used to submit an arbitrary cash_amount alongside a
          // smaller coins value. (True enforcement still requires the
          // Supabase-side function in Task B to recompute this again
          // and reject any client-supplied cash_amount — see report.)
          const cashAmount = Number(
            (coins * COIN_TO_RS_RATE).toFixed(2)
          );


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


          /* REAL WITHDRAWAL — calls the existing create_withdrawal
             RPC with its exact, verified signature. The database is
             authoritative: it re-validates auth, minimum, balance,
             and computes cash_amount itself (2,000 coins = Rs 1).
             The client-side checks above are for responsive UX only. */

          const paymentMethod =
            accountType; // "easypaisa" | "jazzcash" | "bank" — matches p_payment_method, a plain required text field

          const paymentAccount =
            accountType === "bank"
              ? `${document.getElementById("bankSelect")?.value || ""} - ${accountNumber}`
              : accountNumber;

          showLoading();
          withdrawBtn.disabled = true;

          try {
            const { data: withdrawal, error } =
              await window.supabase.rpc("create_withdrawal", {
                p_coins: coins,
                p_payment_method: paymentMethod,
                p_payment_account: paymentAccount
              });

            hideLoading();
            withdrawBtn.disabled = false;

            if (error) {
              // The RPC's own raised exceptions are already
              // human-readable ("Minimum withdrawal is 50,000
              // coins", "Insufficient coin balance", etc.) — surface
              // them directly rather than a generic message.
              showErrorPopup("Withdrawal Failed", error.message);
              return;
            }

            const msg =
              document.getElementById("withdrawMessage");

            if (msg) {
              msg.textContent =
                `✅ Withdrawal request submitted — Rs ${withdrawal.cash_amount} ` +
                `for ${withdrawal.coins.toLocaleString()} coins is now ${withdrawal.status}.`;
              msg.className = "withdraw-message pending show";
              msg.style.display = "block";
            }


/* =====================================================
   CREATE WITHDRAWAL NOTIFICATION
===================================================== */

if (window.EarnRushNotifications) {

  const user =
    window.EarnRushAuth?.getUser();

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.display_name ||
    "there";

  const cashAmount =
    Number(withdrawal.cash_amount || 0).toFixed(2);

  const withdrawalId =
    withdrawal.id || "";

  const requestRef =
    withdrawalId
      ? `#ER-${String(withdrawalId).slice(-4).toUpperCase()}`
      : "#ER-PENDING";

  window.EarnRushNotifications.push({
    title: "Withdrawal Request Received",
    message:
      `Hi ${userName}, your withdrawal request has been received ` +
      `successfully and is currently pending. Our team will review ` +
      `and process your request shortly. Once the verification ` +
      `process is complete, your withdrawal will be completed and ` +
      `the amount will be sent to your selected account.\n\n` +
      `Status: 🟡 Pending\n` +
      `Amount: Rs ${cashAmount}\n` +
      `Request: ${requestRef}`
  });
}

            if (coinsInput) coinsInput.value = "";
            if (rsDisplay) rsDisplay.textContent = "= 0 Rs";

            await refreshCoinBalance();
            await loadWithdrawalHistory();

            await loadWithdrawalHistory();

          } catch (err) {
            hideLoading();
            withdrawBtn.disabled = false;
            showErrorPopup(
              "Withdrawal Failed",
              err?.message || "Something went wrong. Please try again."
            );
          }

        }
      );
    }
  }


  /* =====================================================
     REFRESH COIN BALANCE — after a successful withdrawal, re-read
     the real profile balance from Supabase (authoritative) rather
     than assuming the local deduction math.
  ===================================================== */

  async function refreshCoinBalance() {
    const user = window.EarnRushAuth?.getUser();
    if (!user || !window.supabase) return;

    const { data, error } = await window.supabase
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single();

    if (error || !data) return;

    if (window.EarnRushGame && typeof window.EarnRushGame.setCoinsFromServer === "function") {
      window.EarnRushGame.setCoinsFromServer(data.coins);
    } else {
      const balanceEl = document.getElementById("balance");
      if (balanceEl) balanceEl.textContent = data.coins.toLocaleString();
    }
  }


  /* =====================================================
     WITHDRAWAL HISTORY — plain authenticated select; RLS ("Users
     can view own withdrawals") restricts this to the caller's own
     rows at the database level, so there is no need to fetch
     everything and filter client-side.
  ===================================================== */

  async function loadWithdrawalHistory() {
    const listEl = document.getElementById("withdrawHistoryList");
    if (!listEl) return;

    const user = window.EarnRushAuth?.getUser();
    if (!user || !window.supabase) {
      listEl.innerHTML = `<div class="panel-empty-text" style="padding:14px;text-align:center;">Log in to see your withdrawal history.</div>`;
      return;
    }

    const { data, error } = await window.supabase
      .from("withdrawals")
      .select("id, coins, cash_amount, payment_method, status, created_at, transaction_reference, admin_note")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      listEl.innerHTML = `<div class="panel-empty-text" style="padding:14px;text-align:center;">Couldn't load history: ${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      listEl.innerHTML = `<div class="panel-empty-text" style="padding:14px;text-align:center;">No withdrawals yet.</div>`;
      return;
    }

    listEl.innerHTML = data.map(w => `
      <div class="withdraw-history-item">
        <div class="withdraw-history-row">
          <strong>${w.coins.toLocaleString()} 🪙 → Rs ${w.cash_amount}</strong>
          <span class="withdraw-status-badge status-${w.status}">${w.status}</span>
        </div>
        <div class="withdraw-history-meta">
          ${w.payment_method} • ${new Date(w.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
          ${w.transaction_reference ? ` • Ref: ${w.transaction_reference}` : ""}
        </div>
        ${w.admin_note ? `<div class="withdraw-history-note">${w.admin_note}</div>` : ""}
      </div>
    `).join("");
  }

  window.EarnRushWithdrawal = {
    loadWithdrawalHistory,
    refreshCoinBalance
  };


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

      // Load history immediately if a session already exists
      // (e.g. returning logged-in user); auth.js also triggers this
      // again once sign-in/sign-up resolves for a fresh session.
      loadWithdrawalHistory();

    }
  );

})();