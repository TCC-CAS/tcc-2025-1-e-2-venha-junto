(function () {
  const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:" ||
    !window.location.hostname
      ? `http://${window.location.hostname || "localhost"}:8000`
      : "https://venha-junto-h54n.onrender.com";

  const form = document.getElementById("formAdminRegister");
  const nomeEl = document.getElementById("nome");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btnRegister = document.getElementById("btnRegister");
  const toastEl = document.getElementById("toast");

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

    if (!nome) return showToast("Informe seu nome.", "error");
    if (!email || !email.includes("@")) return showToast("Informe um e-mail válido.", "error");
    if (!senha || senha.length < 6) return showToast("A senha deve ter pelo menos 6 caracteres.", "error");

    btnRegister.disabled = true;
    btnRegister.textContent = "Criando...";

    try {
      await apiFetch("/api/admin/cadastro", {
        method: "POST",
        body: JSON.stringify({ nome, email, senha }),
      });

      showToast("Conta criada com sucesso! Redirecionando...", "success");
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
