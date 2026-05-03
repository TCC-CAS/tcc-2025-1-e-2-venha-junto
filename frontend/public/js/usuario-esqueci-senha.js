document.addEventListener("DOMContentLoaded", () => {
  // ─── Detecta qual página estamos ──────────────────────────────────────────
  const isRecoverPage = !!document.getElementById("formRecover");
  const isRequestPage = !!document.getElementById("formEsqueciSenha");

  // ─── Toggle de visibilidade da senha ──────────────────────────────────────
  document.querySelectorAll(".recover-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-eye");
      const input = document.getElementById(targetId);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.innerHTML = isHidden
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  });

  // ─── Validação de requisitos de senha ─────────────────────────────────────
  const passInput = document.getElementById("senha");
  const reqSpecial = document.getElementById("req-special");
  const reqUpper   = document.getElementById("req-upper");
  const reqLength  = document.getElementById("req-length");

  function toggleReq(el, isValid) {
    if (!el) return;
    el.classList.toggle("valid", isValid);
    el.classList.toggle("missing", !isValid);
    const icon = el.querySelector(".req-icon");
    if (icon) icon.textContent = isValid ? "✔" : "!";
  }

  function validatePassword() {
    if (!passInput) return true;
    const val = passInput.value;
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(val);
    const hasUpper   = /[A-Z]/.test(val);
    const hasLength  = val.length >= 8;
    toggleReq(reqSpecial, hasSpecial);
    toggleReq(reqUpper,   hasUpper);
    toggleReq(reqLength,  hasLength);
    return hasSpecial && hasUpper && hasLength;
  }

  if (passInput) passInput.addEventListener("input", validatePassword);

  // ─── Página: Esqueci minha senha (envia e-mail) ───────────────────────────
  if (isRequestPage) {
    const form = document.getElementById("formEsqueciSenha");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("email");
      const msgEl      = document.getElementById("formMsg");
      const btn        = form.querySelector('button[type="submit"]');

      const email = emailInput.value.trim();
      if (!email) return;

      btn.disabled = true;
      btn.textContent = "Enviando...";
      if (msgEl) { msgEl.textContent = ""; msgEl.className = "vj-form-msg"; }

      try {
        const res = await fetch("/api/usuarios/solicitar-reset-senha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (msgEl) {
          msgEl.textContent = data.detail || data.message || "Verifique seu e-mail!";
          msgEl.className = res.ok ? "vj-form-msg success" : "vj-form-msg error";
        }
      } catch (err) {
        if (msgEl) { msgEl.textContent = "Erro de conexão. Tente novamente."; msgEl.className = "vj-form-msg error"; }
      } finally {
        btn.disabled = false;
        btn.textContent = "Enviar link";
      }
    });
  }

  // ─── Página: Redefinir senha (usa token da URL) ───────────────────────────
  if (isRecoverPage) {
    const form = document.getElementById("formRecover");
    const confirmInput = document.getElementById("confirmar");
    const confirmError = document.getElementById("confirmarError");
    const msgEl        = document.getElementById("formMsg");

    // Pega o token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      if (msgEl) {
        msgEl.textContent = "Link inválido ou expirado. Solicite um novo.";
        msgEl.className = "vj-form-msg error";
        msgEl.style.display = "block";
      }
      form.querySelector('button[type="submit"]').disabled = true;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (confirmError) confirmError.textContent = "";

      const isValidPass = validatePassword();
      if (!isValidPass) { passInput.focus(); return; }

      if (passInput.value !== confirmInput.value) {
        if (confirmError) confirmError.textContent = "As senhas não coincidem.";
        confirmInput.focus();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Salvando...";

      try {
        const res = await fetch("/api/usuarios/confirmar-reset-senha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nova_senha: passInput.value })
        });
        const data = await res.json();

        if (res.ok) {
          if (msgEl) {
            msgEl.textContent = "✔ Senha redefinida com sucesso! Redirecionando...";
            msgEl.className = "vj-form-msg success";
            msgEl.style.display = "block";
          }
          setTimeout(() => { window.location.href = "./usuario-login.html"; }, 2000);
        } else {
          if (msgEl) {
            msgEl.textContent = data.detail || "Erro ao redefinir senha.";
            msgEl.className = "vj-form-msg error";
            msgEl.style.display = "block";
          }
          btn.disabled = false;
          btn.textContent = "Salvar →";
        }
      } catch (err) {
        if (msgEl) { msgEl.textContent = "Erro de conexão. Tente novamente."; msgEl.className = "vj-form-msg error"; msgEl.style.display = "block"; }
        btn.disabled = false;
        btn.textContent = "Salvar →";
      }
    });
  }
});
