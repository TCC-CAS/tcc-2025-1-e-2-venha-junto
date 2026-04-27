document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formRecover");
  const passInput = document.getElementById("senha");
  const confirmInput = document.getElementById("confirmar");
  const confirmError = document.getElementById("confirmarError");
  const eyes = document.querySelectorAll(".recover-eye");

  // Req Elements
  const reqSpecial = document.getElementById("req-special");
  const reqUpper = document.getElementById("req-upper");
  const reqLength = document.getElementById("req-length");

  // Eye toggle
  eyes.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-eye");
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <!-- Eye-on icon -->
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>`;
      } else {
        input.type = "password";
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <!-- Eye-off icon -->
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>`;
      }
    });
  });

  // Password validation
  function validatePassword() {
    const val = passInput.value;

    // Special char (! @ # $ % etc)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(val);
    toggleReq(reqSpecial, hasSpecial);

    // Uppercase
    const hasUpper = /[A-Z]/.test(val);
    toggleReq(reqUpper, hasUpper);

    // Length
    const hasLength = val.length >= 8;
    toggleReq(reqLength, hasLength);

    return hasSpecial && hasUpper && hasLength;
  }

  function toggleReq(el, isValid) {
    if (isValid) {
      el.classList.remove("missing");
      el.classList.add("valid");
      el.querySelector(".req-icon").textContent = "✔";
    } else {
      el.classList.remove("valid");
      el.classList.add("missing");
      el.querySelector(".req-icon").textContent = "!";
    }
  }

  passInput.addEventListener("input", validatePassword);

  // Form Submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    confirmError.textContent = "";

    const isValidPass = validatePassword();
    if (!isValidPass) {
      passInput.focus();
      return;
    }

    if (passInput.value !== confirmInput.value) {
      confirmError.textContent = "As senhas não coincidem.";
      confirmInput.focus();
      return;
    }

    // Success simulation
    const btn = form.querySelector('button[type="submit"]');
    const oldText = btn.textContent;
    btn.textContent = "Salvando...";
    btn.disabled = true;

    setTimeout(() => {
      alert(
        "Sua senha foi redefinida com sucesso! Redirecionando para o login...",
      );
      window.location.href = "./usuario-login.html";
    }, 1500);
  });
});
