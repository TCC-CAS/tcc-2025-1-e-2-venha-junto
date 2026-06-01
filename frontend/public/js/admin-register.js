(function () {
  const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:" ||
    !window.location.hostname
      ? `http://${window.location.hostname || "localhost"}:8000`
      : "";

  const form = document.getElementById("formAdminRegister");
  const nomeEl = document.getElementById("nome");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const passConfirmEl = document.getElementById("passwordConfirm");
  const inviteCodeEl = document.getElementById("inviteCode");
  const btnRegister = document.getElementById("btnRegister");
  const toastEl = document.getElementById("toast");

  // Strength UI
  const strengthContainer = document.querySelector(".pwd-strength-container");
  const strengthText = document.querySelector(".pwd-strength-text");

  // Toggle Password Visibility
  const iconEye = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  document.querySelectorAll(".btn-toggle-pwd").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = iconEyeOff;
      } else {
        input.type = "password";
        btn.innerHTML = iconEye;
      }
    });
  });

  // Password Strength Logic
  passEl.addEventListener("input", (e) => {
    const pwd = e.target.value;
    strengthContainer.className = "pwd-strength-container"; // reset
    
    if (!pwd) {
      strengthText.textContent = "Força";
      strengthText.style.color = "#94a3b8";
      return;
    }

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-zA-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++; // Special char

    if (score <= 1) {
      strengthContainer.classList.add("pwd-weak");
      strengthText.textContent = "Fraca";
      strengthText.style.color = "#ef4444";
    } else if (score === 2 || score === 3) {
      strengthContainer.classList.add("pwd-medium");
      strengthText.textContent = "Média";
      strengthText.style.color = "#f59e0b";
    } else {
      strengthContainer.classList.add("pwd-strong");
      strengthText.textContent = "Forte";
      strengthText.style.color = "#10b981";
    }
  });

  function showToast(msg, type = "info") {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.className = "toast " + type;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toastEl.hidden = true), 4000);
  }

  async function apiFetch(path, options = {}) {
    const resp = await fetch(API_BASE + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      credentials: "include",
    });

    const ct = resp.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await resp.json() : await resp.text();

    if (!resp.ok) {
      const msg = (data && data.detail) ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : "Erro na requisição";
      throw new Error(msg);
    }

    return data;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = (nomeEl.value || "").trim();
    const email = (emailEl.value || "").trim();
    const senha = passEl.value;
    const senhaConfirm = passConfirmEl ? passConfirmEl.value : "";
    const codigo_convite = inviteCodeEl ? inviteCodeEl.value.trim() : "";

    if (!nome) return showToast("Informe seu nome.", "error");
    if (!email || !email.includes("@")) return showToast("Informe um e-mail válido.", "error");
    
    // Validação de E-mail Corporativo (Segurança Adicional)
    const allowedDomains = ["@venhajunto.com.br", "@fatec.sp.gov.br"];
    const isSpecialAdmin = email.toLowerCase() === "admin@gmail.com"; // Para apresentação do TCC
    const isCorporate = allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
    
    if (!isCorporate && !isSpecialAdmin) {
      return showToast("Utilize um e-mail corporativo autorizado (ex: @venhajunto.com.br).", "error");
    }

    // Validação de senha forte
    if (!senha || senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
        return showToast("A senha deve ter no mínimo 8 caracteres, contendo letras e números.", "error");
    }

    // Validação de senhas iguais
    if (senha !== senhaConfirm) {
        return showToast("As senhas não coincidem.", "error");
    }

    if (!codigo_convite) return showToast("Informe o código de convite.", "error");

    const recaptchaToken = typeof grecaptcha !== "undefined" ? grecaptcha.getResponse() : "";
    if (!recaptchaToken) {
      return showToast("Por favor, valide o reCAPTCHA.", "error");
    }

    btnRegister.disabled = true;
    btnRegister.textContent = "Criando...";

    try {
      await apiFetch("/api/admin/cadastro", {
        method: "POST",
        body: JSON.stringify({ nome, email, senha, codigo_convite, recaptcha_token: recaptchaToken }),
      });

      showToast("Administrador criado com sucesso.", "success");
      setTimeout(() => {
        window.location.href = "./admin-login.html";
      }, 2000);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Erro ao criar conta.", "error");
      btnRegister.disabled = false;
      btnRegister.textContent = "Criar Conta Admin";
    }
  });
})();
