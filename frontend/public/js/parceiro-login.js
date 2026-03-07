(function () {
  const form = document.getElementById("formLogin");

  // Elements
  const els = {
    email: document.getElementById("email"),
    senha: document.getElementById("senha"),
  };

  const toggleBtn = document.getElementById("togglePwd");

  // Error spans
  const errEls = {
    email: document.getElementById("emailError"),
    senha: document.getElementById("senhaError"),
    main: document.getElementById("mainError"),
    mainText: document.getElementById("mainErrorText"),
  };

  const API_BASE = "http://127.0.0.1:8000";

  // 👁️ Mostrar / esconder senha
  if (toggleBtn && els.senha) {
    toggleBtn.addEventListener("click", () => {
      els.senha.type = els.senha.type === "password" ? "text" : "password";
    });
  }

  if (!form) return;

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
    } else {
      alert(msg); // fallback
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const email = (els.email?.value || "").trim().toLowerCase();
    const senha = els.senha?.value || "";

    let hasError = false;

    if (!email || !email.includes("@")) {
      showError("email", "Digite um e-mail corporativo válido.");
      hasError = true;
    }

    if (!senha) {
      showError("senha", "Digite sua senha de parceiro.");
      hasError = true;
    }

    if (hasError) return;

    try {
      showMainError("Acessando a conta, aguarde...");
      errEls.main.style.borderColor = "#bae6fd";
      errEls.main.style.backgroundColor = "#f0f9ff";
      errEls.main.style.color = "#0369a1";

      const res = await fetch(`${API_BASE}/partner-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha }),
      });

      if (!res.ok) {
        throw new Error("E-mail ou senha incorretos.");
      }

      // Confere se está logado
      const meRes = await fetch(`${API_BASE}/partner-auth/me`, {
        credentials: "include",
      });

      if (meRes.status === 401) {
        throw new Error("Falha ao autenticar sua conta de parceiro.");
      }

      errEls.mainText.textContent = "Login bem-sucedido! Redirecionando...";
      errEls.main.style.borderColor = "#bbf7d0";
      errEls.main.style.backgroundColor = "#f0fdf4";
      errEls.main.style.color = "#15803d";

      setTimeout(() => {
        window.location.href = "./parceiro-cadastro-estabelecimento.html";
      }, 1000);
    } catch (err) {
      errEls.main.style.borderColor = "#fca5a5";
      errEls.main.style.backgroundColor = "#fef2f2";
      errEls.main.style.color = "#b91c1c";
      showMainError(err?.message || "Erro de conexão ao entrar como parceiro.");
    }
  });
})();
