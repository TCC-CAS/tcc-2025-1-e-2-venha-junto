(function () {
  const form = document.getElementById("formCriarConta");

  const els = {
    nome:          document.getElementById("nome"),
    email:         document.getElementById("email"),
    telefone:      document.getElementById("telefone"),
    senha:         document.getElementById("senha"),
    confirmarSenha:document.getElementById("confirmarSenha"),
    aceite:        document.getElementById("aceite"),
  };

  const errEls = {
    nome:          document.getElementById("nomeError"),
    email:         document.getElementById("emailError"),
    telefone:      document.getElementById("telefoneError"),
    senha:         document.getElementById("senhaError"),
    confirmarSenha:document.getElementById("confirmarSenhaError"),
    main:          document.getElementById("mainError"),
    mainText:      document.getElementById("mainErrorText"),
  };

  const togglePwd        = document.getElementById("togglePwd");
  const toggleConfirmPwd = document.getElementById("toggleConfirmPwd");
  const pwdMeter         = document.getElementById("pwdStrengthMeter");
  const pwdBar           = document.getElementById("pwdStrengthBar");
  const pwdText          = document.getElementById("pwdStrengthText");

  if (!form) return;

  // ── Máscara de telefone: (99) 99999-9999 ou (99) 9999-9999 ───────────────
  if (els.telefone) {
    els.telefone.addEventListener("input", function (e) {
      let x = e.target.value.replace(/\D/g, "").slice(0, 11);
      let fmt = x;
      if (x.length > 2) {
        const body = x.slice(2);
        if (x.length > 10) {
          // Celular: (11) 99999-9999
          fmt = `(${x.slice(0,2)}) ${body.slice(0,5)}-${body.slice(5)}`;
        } else if (x.length > 6) {
          // Fixo: (11) 9999-9999
          fmt = `(${x.slice(0,2)}) ${body.slice(0,4)}-${body.slice(4)}`;
        } else {
          fmt = `(${x.slice(0,2)}) ${body}`;
        }
      }
      e.target.value = fmt;
    });
  }

  // ── Toggle visibilidade da senha ──────────────────────────────────────────
  function setupToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = show
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  }
  setupToggle(togglePwd, els.senha);
  setupToggle(toggleConfirmPwd, els.confirmarSenha);

  // ── Limpar erros ──────────────────────────────────────────────────────────
  function clearErrors() {
    Object.values(errEls).forEach(el => { if (el) el.classList.remove("show"); });
    Object.values(els).forEach(el => { if (el) el.classList?.remove("invalid"); });
  }

  function showError(fieldId, msg) {
    if (errEls[fieldId]) { errEls[fieldId].textContent = msg; errEls[fieldId].classList.add("show"); }
    if (els[fieldId])    els[fieldId].classList.add("invalid");
  }

  function showMainError(msg) {
    if (errEls.main && errEls.mainText) {
      errEls.mainText.textContent = msg;
      errEls.main.classList.add("show");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } else { alert(msg); }
  }

  // ── Medidor de força de senha ─────────────────────────────────────────────
  if (els.senha) {
    els.senha.addEventListener("input", (e) => {
      const val = e.target.value;
      if (!val) {
        if (pwdMeter) pwdMeter.style.display = "none";
        if (pwdText)  pwdText.style.display  = "none";
        return;
      }
      if (pwdMeter) pwdMeter.style.display = "block";
      if (pwdText)  pwdText.style.display  = "block";

      let str = 0;
      if (val.length >= 8)              str++;
      if (val.length >= 12)             str++;
      if (/[A-Z]/.test(val))            str++;
      if (/[0-9]/.test(val))            str++;
      if (/[^A-Za-z0-9]/.test(val))     str++;

      if (pwdBar) {
        pwdBar.className = "";
        if (str <= 2) {
          pwdBar.classList.add("strength-weak");
          if (pwdText) { pwdText.textContent = "Senha Fraca — use letras maiúsculas, números e símbolos"; pwdText.style.color = "#ef4444"; }
        } else if (str <= 3) {
          pwdBar.classList.add("strength-medium");
          if (pwdText) { pwdText.textContent = "Senha Média"; pwdText.style.color = "#eab308"; }
        } else {
          pwdBar.classList.add("strength-strong");
          if (pwdText) { pwdText.textContent = "Senha Forte ✔"; pwdText.style.color = "#22c55e"; }
        }
      }
    });

    // Verifica confirmação em tempo real
    if (els.confirmarSenha) {
      els.confirmarSenha.addEventListener("input", () => {
        if (els.confirmarSenha.value && els.confirmarSenha.value !== els.senha.value) {
          showError("confirmarSenha", "As senhas não coincidem.");
        } else {
          if (errEls.confirmarSenha) errEls.confirmarSenha.classList.remove("show");
          if (els.confirmarSenha) els.confirmarSenha.classList.remove("invalid");
        }
      });
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    const nome      = els.nome?.value?.trim()  || "";
    const email     = (els.email?.value || "").trim().toLowerCase();
    const telefone  = els.telefone?.value?.replace(/\D/g, "") || "";
    const senha     = els.senha?.value         || "";
    const confirmar = els.confirmarSenha?.value || "";
    const aceite    = els.aceite?.checked;

    // Nome: obrigatório e mínimo 3 letras
    if (!nome || nome.length < 3) {
      showError("nome", "Informe o nome completo do responsável (mínimo 3 caracteres).");
      hasError = true;
    }

    // Telefone: obrigatório e mínimo 10 dígitos
    if (!telefone || telefone.length < 10) {
      showError("telefone", "Informe um número de telefone válido com DDD.");
      hasError = true;
    }

    // Email: formato válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showError("email", "Digite um e-mail válido (ex: empresa@dominio.com).");
      hasError = true;
    }

    // Senha: mínimo 8 caracteres
    if (senha.length < 8) {
      showError("senha", "A senha deve ter no mínimo 8 caracteres.");
      hasError = true;
    }

    // Confirmação de senha
    if (senha !== confirmar) {
      showError("confirmarSenha", "As senhas digitadas não coincidem.");
      hasError = true;
    }

    // Aceite de termos
    if (!aceite) {
      showMainError("Você precisa aceitar os Termos e a Política de Privacidade.");
      return;
    }

    const recaptchaToken = typeof grecaptcha !== "undefined" ? grecaptcha.getResponse() : "";
    if (!recaptchaToken) {
      showMainError("Por favor, valide o reCAPTCHA de segurança.");
      return;
    }

    if (hasError) return;

    const btn = form.querySelector('button[type="submit"]');
    try {
      // Feedback de carregamento
      if (errEls.main && errEls.mainText) {
        errEls.mainText.textContent = "Criando conta, aguarde...";
        errEls.main.style.cssText = "border-color:#bae6fd;background:#f0f9ff;color:#0369a1;";
        errEls.main.classList.add("show");
      }
      if (btn) { btn.disabled = true; btn.textContent = "Aguarde..."; }

      await window.apiPartnerRegister({ nome, email, telefone, senha, recaptcha_token: recaptchaToken });

      if (errEls.mainText) {
        errEls.mainText.textContent = "Conta criada com sucesso! Redirecionando...";
        errEls.main.style.cssText = "border-color:#bbf7d0;background:#f0fdf4;color:#15803d;";
      }
      setTimeout(() => { window.location.href = "./parceiro-login.html"; }, 1500);

    } catch (err) {
      if (errEls.main) errEls.main.style.cssText = "border-color:#fca5a5;background:#fef2f2;color:#b91c1c;";
      showMainError(err?.message || "Erro ao criar conta de parceiro. Verifique os dados.");
      if (btn) { btn.disabled = false; btn.textContent = "Criar conta →"; }
    }
  });
})();
