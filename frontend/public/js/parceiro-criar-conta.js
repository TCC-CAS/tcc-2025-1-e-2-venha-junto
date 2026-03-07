(function () {
  const form = document.getElementById("formCriarConta");

  // Elements
  const els = {
    nome: document.getElementById("nome"),
    email: document.getElementById("email"),
    telefone: document.getElementById("telefone"),
    senha: document.getElementById("senha"),
    confirmarSenha: document.getElementById("confirmarSenha"),
    aceite: document.getElementById("aceite"),
  };

  // Error spans
  const errEls = {
    nome: document.getElementById("nomeError"),
    email: document.getElementById("emailError"),
    telefone: document.getElementById("telefoneError"),
    senha: document.getElementById("senhaError"),
    confirmarSenha: document.getElementById("confirmarSenhaError"),
    main: document.getElementById("mainError"),
    mainText: document.getElementById("mainErrorText"),
  };

  // Password toggles
  const togglePwd = document.getElementById("togglePwd");
  const toggleConfirmPwd = document.getElementById("toggleConfirmPwd");

  // Password Strength
  const pwdMeter = document.getElementById("pwdStrengthMeter");
  const pwdBar = document.getElementById("pwdStrengthBar");
  const pwdText = document.getElementById("pwdStrengthText");

  if (!form) return;

  // Mask Phone: (99) 99999-9999
  if (els.telefone) {
    els.telefone.addEventListener("input", function (e) {
      let x = e.target.value.replace(/\D/g, "");
      if (x.length > 11) x = x.slice(0, 11); // Max 11 digits

      let formatted = x;
      if (x.length > 2) {
        formatted = `(${x.slice(0, 2)}) `;
        if (x.length > 7) {
          formatted += `${x.slice(2, 7)}-${x.slice(7)}`;
        } else {
          formatted += x.slice(2);
        }
      }
      e.target.value = formatted;
    });
  }

  // Toggles Pwd
  function setupToggle(btn, input) {
    if (btn && input) {
      btn.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
      });
    }
  }
  setupToggle(togglePwd, els.senha);
  setupToggle(toggleConfirmPwd, els.confirmarSenha);

  function clearErrors() {
    Object.values(errEls).forEach((el) => {
      if (el) el.classList.remove("show");
    });
    Object.values(els).forEach((el) => {
      if (el) el.classList.remove("invalid");
    });
  }

  function showError(fieldId, msg) {
    if (errEls[fieldId]) {
      errEls[fieldId].textContent = msg;
      errEls[fieldId].classList.add("show");
    }
    if (els[fieldId]) {
      els[fieldId].classList.add("invalid");
    }
  }

  function showMainError(msg) {
    if (errEls.main && errEls.mainText) {
      errEls.mainText.textContent = msg;
      errEls.main.classList.add("show");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      alert(msg);
    }
  }

  // Password strength logic
  if (els.senha) {
    els.senha.addEventListener("input", (e) => {
      const val = e.target.value;
      if (!val) {
        pwdMeter.style.display = "none";
        pwdText.style.display = "none";
        return;
      }

      pwdMeter.style.display = "block";
      pwdText.style.display = "block";

      let strength = 0;
      if (val.length >= 6) strength += 1; // tem mínimo
      if (val.length >= 8) strength += 1; // bom tamanho
      if (/[A-Z]/.test(val)) strength += 1; // maiúscula
      if (/[0-9]/.test(val)) strength += 1; // número
      if (/[^A-Za-z0-9]/.test(val)) strength += 1; // especial

      pwdBar.className = "";
      if (strength <= 2) {
        pwdBar.classList.add("strength-weak");
        pwdText.textContent = "Senha Fraca (use letras, números e símbolos)";
        pwdText.style.color = "#ef4444";
      } else if (strength === 3 || strength === 4) {
        pwdBar.classList.add("strength-medium");
        pwdText.textContent = "Senha Média";
        pwdText.style.color = "#eab308";
      } else {
        pwdBar.classList.add("strength-strong");
        pwdText.textContent = "Senha Forte";
        pwdText.style.color = "#22c55e";
      }
    });
  }

  // Form Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    const nome = els.nome?.value?.trim() || "";
    const email = (els.email?.value || "").trim().toLowerCase();
    const telefone = els.telefone?.value?.replace(/\D/g, "") || "";
    const senha = els.senha?.value || "";
    const confirmar = els.confirmarSenha?.value || "";
    const aceite = els.aceite?.checked;

    if (!nome) {
      showError("nome", "Informe o nome do responsável.");
      hasError = true;
    }
    if (!email || !email.includes("@")) {
      showError("email", "Digite um e-mail válido.");
      hasError = true;
    }
    if (!telefone) {
      showError("telefone", "Informe o telefone de contato.");
      hasError = true;
    }

    if (senha.length < 6) {
      showError("senha", "A senha deve ter no mínimo 6 caracteres.");
      hasError = true;
    }

    if (senha !== confirmar) {
      showError("confirmarSenha", "As senhas digitadas não coincidem.");
      hasError = true;
    }

    if (!aceite) {
      showMainError(
        "Você precisa aceitar os Termos e a Política de Privacidade.",
      );
      return;
    }

    if (hasError) return;

    try {
      showMainError("Criando conta, aguarde..."); // Exibe info de carregamento
      errEls.main.style.borderColor = "#bae6fd";
      errEls.main.style.backgroundColor = "#f0f9ff";
      errEls.main.style.color = "#0369a1";

      await window.apiPartnerRegister({
        nome,
        email,
        telefone,
        senha,
      });

      errEls.mainText.textContent =
        "Conta criada com sucesso! Redirecionando...";
      errEls.main.style.borderColor = "#bbf7d0";
      errEls.main.style.backgroundColor = "#f0fdf4";
      errEls.main.style.color = "#15803d";

      setTimeout(() => {
        window.location.href = "./parceiro-login.html";
      }, 1500);
    } catch (err) {
      errEls.main.style.borderColor = "#fca5a5";
      errEls.main.style.backgroundColor = "#fef2f2";
      errEls.main.style.color = "#b91c1c";
      showMainError(
        err?.message || "Erro ao criar conta de parceiro. Verifique os dados.",
      );
    }
  });
})();
