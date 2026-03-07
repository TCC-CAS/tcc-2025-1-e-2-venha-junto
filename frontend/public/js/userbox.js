(function () {
  async function loadAvatarIntoUserBox(imgElement, fallbackElement) {
    const url = "http://127.0.0.1:8000/api/usuarios/me/avatar?t=" + Date.now();

    try {
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Sem avatar");

      imgElement.src = url;
      imgElement.style.display = "block";
      if (fallbackElement) fallbackElement.style.display = "none";
    } catch (e) {
      imgElement.src = "";
      imgElement.style.display = "none";
      if (fallbackElement) fallbackElement.style.display = "flex";
    }
  }

  async function updateUserBox() {
    const userActions = document.getElementById("userActions");
    if (!userActions) return;

    try {
      // Tenta pegar o usuário
      const user = await window.apiMe();

      // Logado: Substitui os botões pelo Userbox
      const initial = user.nome ? user.nome.charAt(0).toUpperCase() : "👤";
      const name = user.nome || "Usuário";
      const email = user.email || "";

      userActions.innerHTML = `
        <div id="userBox" class="userbox" title="Abrir perfil" style="cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 6px 16px; border: 1px solid #e2e8f0; border-radius: 99px;">
          <div class="avatar" aria-hidden="true" style="width: 40px; height: 40px; border-radius: 50%; background: #f97316; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; overflow: hidden; position: relative;">
            <span id="userAvatarFallback" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${initial}</span>
            <img id="userAvatarImg" alt="Foto do usuário" style="display: none; width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" />
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

      await loadAvatarIntoUserBox(userAvatarImg, userAvatarFallback);

      // Listening para atualizações do Perfil (Upload da Imagem)
      document.addEventListener("userbox:refresh", () => {
        loadAvatarIntoUserBox(userAvatarImg, userAvatarFallback);
      });
    } catch (e) {
      // Não logado, deixa os botões padrão
    }
  }

  document.addEventListener("DOMContentLoaded", updateUserBox);
})();
