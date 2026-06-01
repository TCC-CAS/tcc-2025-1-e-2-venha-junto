document.addEventListener("DOMContentLoaded", () => {
  const form         = document.getElementById("formRecover");
  const emailInput   = document.getElementById("email");
  const passInput    = document.getElementById("senha");
  const confirmInput = document.getElementById("confirmar");
  const confirmError = document.getElementById("confirmarError");
  const formMsg      = document.getElementById("formMsg");

  // ─── Toggle olho (mostrar/ocultar senha) ────────────────────────────────
  document.querySelectorAll(".recover-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-eye"));
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = show
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  });

  // ─── Validação dos requisitos de senha ──────────────────────────────────
  const reqSpecial = document.getElementById("req-special");
  const reqUpper   = document.getElementById("req-upper");
  const reqLength  = document.getElementById("req-length");

  function toggleReq(el, ok) {
    if (!el) return;
    el.classList.toggle("valid",   ok);
    el.classList.toggle("missing", !ok);
    const icon = el.querySelector(".req-icon");
    if (icon) icon.textContent = ok ? "✔" : "!";
  }

  function validatePassword() {
    if (!passInput) return true;
    const v = passInput.value;
    const sp  = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(v);
    const up  = /[A-Z]/.test(v);
    const len = v.length >= 8;
    toggleReq(reqSpecial, sp);
    toggleReq(reqUpper,   up);
    toggleReq(reqLength,  len);
    return sp && up && len;
  }

  if (passInput) passInput.addEventListener("input", validatePassword);

  function showMsg(text, type) {
    if (!formMsg) return;
    formMsg.textContent = text;
    formMsg.className   = `vj-form-msg ${type}`;
    formMsg.style.display = "block";
  }

  // ─── Envio do formulário ─────────────────────────────────────────────────
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (confirmError) confirmError.textContent = "";
      if (formMsg) formMsg.style.display = "none";

      const email     = emailInput?.value.trim();
      const novaSenha = passInput?.value;
      const confirmar = confirmInput?.value;

      if (!email) { showMsg("Informe o e-mail corporativo.", "error"); return; }

      if (!validatePassword()) {
        passInput.focus();
        return;
      }

      if (novaSenha !== confirmar) {
        if (confirmError) confirmError.textContent = "As senhas não coincidem.";
        confirmInput.focus();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const origBtnText = btn.innerHTML;
      btn.disabled    = true;
      btn.textContent = "Salvando...";

      try {
        const res = await fetch("/api/parceiros/redefinir-senha", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email, nova_senha: novaSenha }),
        });

        const data = await res.json();

        if (res.ok) {
          showMsg("✔ Senha redefinida com sucesso! Redirecionando...", "success");
          setTimeout(() => { window.location.href = "./parceiro-login.html"; }, 2000);
        } else {
          showMsg(data.detail || "Erro ao redefinir senha.", "error");
          btn.disabled    = false;
          btn.innerHTML   = origBtnText;
        }
      } catch (err) {
        showMsg("Erro de conexão. Tente novamente.", "error");
        btn.disabled    = false;
        btn.innerHTML   = origBtnText;
      }
    });
  }
});
