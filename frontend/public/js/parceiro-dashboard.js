document.addEventListener("DOMContentLoaded", () => {
  // === LÓGICA DE ABAS (NAVEGAÇÃO TAB MENU) ===
  const navBtns = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".dash-section");
  const pageTitle = document.getElementById("pageTitle");

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // 1. Remove active das tabs
      navBtns.forEach((b) => b.classList.remove("active"));
      // 2. Add active na tab clicada
      btn.classList.add("active");

      // 3. Muda título (extrai o texto limpo, sem o SVG)
      const titleText = btn.textContent.trim();
      pageTitle.textContent = titleText;

      // 4. Mostra/Esconde seções
      const target = btn.getAttribute("data-target");
      sections.forEach((sec) => {
        if (sec.id === `section-${target}`) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });
    });
  });

  // === RENDENRIZAÇÃO DE DADOS (FRONTEND MOCK) ===
  // Aqui futuramente chamaremos a API FastAPI "/api/locais/me"
  const mockLocais = [
    {
      id: 1,
      nome: "Restaurante Inclusivo Sabor & Arte",
      categoria: "Restaurantes",
      status: "Aprovado", // Aprovado, Em análise, Reprovado
      views: 1420,
      cliques: 198,
      nota: 4.7,
      imgUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=300&h=200",
    },
    {
      id: 2,
      nome: "Café Acessível Paulista",
      categoria: "Restaurantes",
      status: "Em análise",
      views: 0,
      cliques: 0,
      nota: "--",
      imgUrl:
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=300&h=200",
    },
    {
      id: 3,
      nome: "Loja Inclusiva Centro",
      categoria: "Outro",
      status: "Reprovado",
      views: 0,
      cliques: 0,
      nota: "--",
      imgUrl:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=300&h=200",
    },
  ];

  function getStatusStyle(statusTxt) {
    if (statusTxt === "Aprovado") return "status-aprovado";
    if (statusTxt === "Em análise") return "status-analise";
    return "status-reprovado";
  }

  // Renderizar View Simples (Aba Dashboard)
  const previewContainer = document.getElementById("locaisListPreview");
  if (previewContainer) {
    previewContainer.innerHTML = "";
    mockLocais.forEach((loc) => {
      const cls = getStatusStyle(loc.status);
      previewContainer.innerHTML += `
        <div class="local-row">
            <div class="local-img-box"><img src="${loc.imgUrl}" alt="foto"></div>
            <div class="local-infos">
              <strong>${loc.nome}</strong>
              <span>${loc.categoria}</span>
            </div>
            
            <span class="local-status ${cls}">
              ${loc.status === "Aprovado" ? "✓" : loc.status === "Em análise" ? "⏱" : "✕"} ${loc.status}
            </span>
            <div class="local-stats-mini">
              <strong>${loc.views}</strong>
              <span>views</span>
            </div>
        </div>
      `;
    });
  }

  // Renderizar Grid Completo (Aba Meus Locais)
  const gridContainer = document.getElementById("locaisGridCompleto");
  if (gridContainer) {
    gridContainer.innerHTML = "";
    mockLocais.forEach((loc) => {
      const cls = getStatusStyle(loc.status);
      gridContainer.innerHTML += `
        <div class="local-card">
          <div class="local-card-banner">
            <img src="${loc.imgUrl}" alt="Capa">
          </div>
          <div class="local-card-content">
            <div class="local-card-head">
               <span class="cat">${loc.categoria}</span>
               <span class="local-status ${cls}" style="margin:0; padding:2px 8px; font-size:11px;">
                 ${loc.status}
               </span>
            </div>
            <h4>${loc.nome}</h4>

            <div class="local-card-metrics">
               <div class="metric-mini">
                 <strong>${loc.views}</strong>
                 <span>Views</span>
               </div>
               <div class="metric-mini">
                 <strong>${loc.cliques}</strong>
                 <span>Cliques</span>
               </div>
               <div class="metric-mini">
                 <strong>${loc.nota}</strong>
                 <span>Nota</span>
               </div>
            </div>

            <a href="#" class="btn-gray-outline">Editar local</a>
          </div>
        </div>
      `;
    });
  }
});

function logout() {
  // Limpar tokens de parceiro ou alertar
  if (confirm("Deseja realmente sair da área do parceiro?")) {
    window.location.href = "./index.html";
  }
}
