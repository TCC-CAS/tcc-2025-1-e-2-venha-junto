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

      // 1. Tenta o login usando o helper global do api.js
      if (typeof window.apiPartnerLogin !== "function") {
         throw new Error("Erro interno: O script de conexão (api.js) não foi carregado corretamente.");
      }

      const loginRes = await window.apiPartnerLogin({ email, senha });
      console.log("[Login] Sucesso:", loginRes);

      // 2. Confere os dados do parceiro (Session check)
      const user = await window.apiPartnerMe();
      console.log("[Login] Parceiro identificado:", user);

      errEls.mainText.textContent = `Bem-vindo, ${user.nome || "Parceiro"}! Verificando conta...`;
      errEls.main.style.borderColor = "#bbf7d0";
      errEls.main.style.backgroundColor = "#f0fdf4";
      errEls.main.style.color = "#15803d";

      // 3. Verifica se tem locais para roteamento inteligente
      let hasLocais = false;
      try {
        if (typeof window.apiPartnerListPlaces === "function") {
          const locais = await window.apiPartnerListPlaces();
          hasLocais = (locais && Array.isArray(locais) && locais.length > 0);
        } else {
          const locRes = await fetch("http://127.0.0.1:8000/api/estabelecimentos", {credentials: 'include'});
          if (locRes.ok) {
            const locaisData = await locRes.json();
            hasLocais = (locaisData && Array.isArray(locaisData) && locaisData.length > 0);
          }
        }
      } catch(e) { console.warn("Aviso: falha na verificação pós-login", e); }

      setTimeout(() => {
        if (hasLocais) {
           window.location.href = "./parceiro-dashboard.html";
        } else {
           window.location.href = "./parceiro-cadastro-estabelecimento.html";
        }
      }, 1000);
    } catch (err) {
      errEls.main.style.borderColor = "#fca5a5";
      errEls.main.style.backgroundColor = "#fef2f2";
      errEls.main.style.color = "#b91c1c";
      showMainError(err?.message || "Erro de conexão ao entrar como parceiro.");
    }
  });
})();
