(function () {
  function loadAvatarIntoUserBox(imgElement, fallbackElement, forceRefresh = false) {
    let url = "http://127.0.0.1:8000/api/usuarios/me/avatar";
    if (forceRefresh) {
        url += "?t=" + Date.now();
        localStorage.setItem("vj_last_avatar_url", url);
    } else {
        const cachedUrl = localStorage.getItem("vj_last_avatar_url");
        if (cachedUrl) url = cachedUrl;
    }

    const testImg = new Image();
    testImg.onload = () => {
      imgElement.src = url;
      imgElement.style.display = "block";
      if (fallbackElement) fallbackElement.style.display = "none";
      if (imgElement.parentElement) imgElement.parentElement.style.background = "transparent";
      localStorage.setItem("vj_last_avatar_url", url);
    };
    testImg.onerror = () => {
      imgElement.src = "";
      imgElement.style.display = "none";
      if (fallbackElement) fallbackElement.style.display = "flex";
      if (imgElement.parentElement) imgElement.parentElement.style.background = "#f97316";
      // Apenas limpa o cache se for um erro genuíno do servidor (não encontrado/deslogado)
      // Como onerror não distingue aborto de erro 404, não faremos removeItem aqui agressivamente.
      // Se não tem avatar, simplesmente não exibe.
    };
    testImg.src = url;
  }

  function renderUserBox(user) {
    const userActions = document.getElementById("userActions");
    if (!userActions) return;

    if (!user || !user.nome) {
        userActions.innerHTML = `
          <a href="./usuario-login.html" class="btn-top-login">Entrar</a>
          <a href="./usuario-criar-conta.html" class="btn-top-signup">Cadastrar</a>
        `;
        userActions.classList.add("loaded");
        return;
    }

    const initial = user.nome ? user.nome.charAt(0).toUpperCase() : "👤";
    const name = user.nome || "Usuário";
    const email = user.email || "";
    
    // Evita refazer o DOM inteiro se já renderizou a mesma pessoa (evita mini piscos)
    if (userActions.innerHTML.includes('id="userBox"')) {
        const nameEl = document.getElementById("userName");
        if (nameEl && nameEl.textContent === name) return;
    }

    userActions.innerHTML = `
      <div id="userBox" class="userbox" title="Abrir perfil" style="cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 6px 16px; border: 1px solid #e2e8f0; border-radius: 99px;">
        <div class="avatar" aria-hidden="true" style="width: 40px; height: 40px; border-radius: 50%; background: ${user.avatarUrl ? 'transparent' : '#f97316'}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; overflow: hidden; position: relative;">
          <span id="userAvatarFallback" style="display: ${user.avatarUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; width: 100%; height: 100%;">${initial}</span>
          <img id="userAvatarImg" alt="Foto do usuário" src="${user.avatarUrl || ''}" style="display: ${user.avatarUrl ? 'block' : 'none'}; width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" />
        </div>
        <div>
          <strong id="userName" style="display: block; color: #0f172a; font-size: 14px;">${name}</strong>
          <small id="userEmail" style="display: block; color: #64748b; font-size: 12px;">${email}</small>
        </div>
      </div>
    `;

    const userBox = document.getElementById("userBox");
    const userAvatarImg = document.getElementById("userAvatarImg");
    const userAvatarFallback = document.getElementById("userAvatarFallback");

    if (userBox) {
      userBox.onclick = () => {
        window.location.href = "./perfil.html";
      };
    }

    userActions.classList.add("loaded");
    
    // Se a imagem veio pré-carregada do cache, exibe ela logo
    if (user.avatarUrl) {
        userAvatarImg.style.display = "block";
        userAvatarFallback.style.display = "none";
    } else {
        // Apenas verifica ativamente o servidor se não houver cache
        loadAvatarIntoUserBox(userAvatarImg, userAvatarFallback, false);
    }
  }

  async function updateUserBox() {
    // 1) Otimização agressiva contra pisca-pisca: tenta carregar do cache antes
    const cachedName = localStorage.getItem("vj_last_user_name");
    const cachedEmail = localStorage.getItem("vj_last_user_email");
    const cachedAvatar = localStorage.getItem("vj_last_avatar_url");
    
    if (cachedName && cachedEmail) {
        renderUserBox({ nome: cachedName, email: cachedEmail, avatarUrl: cachedAvatar });
    }

    try {
      // 2) Tenta pegar o usuário do backend para confirmar
      const user = await window.apiMe();
      
      // Atualiza cache
      if (user && user.nome) {
          localStorage.setItem("vj_last_user_name", user.nome);
          localStorage.setItem("vj_last_user_email", user.email);
      }
      
      const cachedAvatar = localStorage.getItem("vj_last_avatar_url");
      user.avatarUrl = cachedAvatar;

      // Renderiza os dados oficiais recebidos do backend
      renderUserBox(user);

      // Listening para atualizações do Perfil (Upload da Imagem)
      document.addEventListener("userbox:refresh", () => {
        const userAvatarImg = document.getElementById("userAvatarImg");
        const userAvatarFallback = document.getElementById("userAvatarFallback");
        if (userAvatarImg && userAvatarFallback) {
           loadAvatarIntoUserBox(userAvatarImg, userAvatarFallback, true);
        }
      });
    } catch (e) {
      // Não logado, limpa cache e mostra botões Entrar/Cadastrar
      localStorage.removeItem("vj_last_user_name");
      localStorage.removeItem("vj_last_user_email");
      localStorage.removeItem("vj_last_avatar_url");
      renderUserBox(null);
    }
  }

  document.addEventListener("DOMContentLoaded", updateUserBox);
})();
