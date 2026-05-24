(function () {

  // ─── Inject img tag inside every .user-circle if not already there ───────────
  function ensureAvatarImg(circleEl) {
    if (circleEl.querySelector("img.uc-avatar-img")) return;
    const img = document.createElement("img");
    img.className = "uc-avatar-img";
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:none;position:absolute;top:0;left:0;";
    circleEl.style.position = "relative";
    circleEl.style.overflow = "hidden";
    circleEl.appendChild(img);
  }

  // ─── Load avatar into all .user-circle elements ─────────────────────────────
  function loadAvatarIntoAllCircles(forceRefresh = false) {
    const circles = document.querySelectorAll(".user-circle");
    if (!circles.length) return;

    let url = "/api/usuarios/me/avatar";
    if (forceRefresh) {
      url += "?t=" + Date.now();
    } else {
      const cachedUrl = localStorage.getItem("vj_last_avatar_url");
      if (cachedUrl) url = cachedUrl;
    }

    const testImg = new Image();
    testImg.onload = () => {
      localStorage.setItem("vj_last_avatar_url", url);
      circles.forEach(el => {
        ensureAvatarImg(el);
        const img = el.querySelector("img.uc-avatar-img");
        if (img) {
          img.src = url;
          img.style.display = "block";
          // Hide the text/fallback letter
          el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
          });
        }
      });
    };
    testImg.onerror = () => {
      // No avatar — show letter fallback, clear cached URL
      if (forceRefresh) localStorage.removeItem("vj_last_avatar_url");
      circles.forEach(el => {
        const img = el.querySelector("img.uc-avatar-img");
        if (img) img.style.display = "none";
      });
    };
    testImg.src = url;
  }

  // ─── Render user name / state ─────────────────────────────────────────────
  function renderUserBox(user) {
    const userCircles = document.querySelectorAll(".user-circle");
    const userNames = document.querySelectorAll(".user-name");

    // SEGURANÇA: Se o usuário for ADMIN, não mostramos ele como "logado" no portal comum.
    // Isso garante que o admin não acesse áreas de usuário por engano.
    const isAdmin = user && (user.role === 'admin' || user.role === 'master' || user.email === 'admin@gmail.com');

    if (!user || !user.nome || isAdmin) {
      userCircles.forEach(el => {
        el.textContent = "👤";
        el.href = "./usuario-login.html";
        el.style.background = "#94a3b8";
        const img = el.querySelector("img.uc-avatar-img");
        if (img) img.style.display = "none";
      });
      userNames.forEach(el => { el.textContent = "Entrar"; });
      return;
    }

    const initial = user.nome.charAt(0).toUpperCase();
    userCircles.forEach(el => {
      ensureAvatarImg(el);
      el.href = "./perfil.html";
      el.style.background = "#F5892A";
      // Set the fallback letter (only visible when no photo)
      const img = el.querySelector("img.uc-avatar-img");
      const letterNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      if (letterNode) {
        letterNode.textContent = (img && img.style.display === "block") ? "" : initial;
      } else {
        // Ensure a text node exists for the fallback letter
        el.insertBefore(document.createTextNode(initial), img || null);
      }
    });
    userNames.forEach(el => { el.textContent = user.nome; });
  }

  // ─── Main ─────────────────────────────────────────────────────────────────
  async function updateUserBox() {
    // Fast cache render first (no flicker)
    const cachedName  = localStorage.getItem("vj_last_user_name");
    const cachedEmail = localStorage.getItem("vj_last_user_email");
    if (cachedName && cachedEmail) {
      renderUserBox({ nome: cachedName, email: cachedEmail });
      loadAvatarIntoAllCircles(false); // use cached URL
    }

    try {
      const user = await window.apiMe();

      if (user && user.nome) {
        localStorage.setItem("vj_last_user_name", user.nome);
        localStorage.setItem("vj_last_user_email", user.email);
      }

      renderUserBox(user);
      loadAvatarIntoAllCircles(false);

      // Listen for avatar upload events (fired from perfil.html after upload)
      document.addEventListener("userbox:refresh", () => {
        loadAvatarIntoAllCircles(true); // force refresh to bypass cache
      });

    } catch (e) {
      localStorage.removeItem("vj_last_user_name");
      localStorage.removeItem("vj_last_user_email");
      localStorage.removeItem("vj_last_avatar_url");
      renderUserBox(null);
    }
  }

  document.addEventListener("DOMContentLoaded", updateUserBox);
})();
