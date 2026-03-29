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

  // === RENDENRIZAÇÃO DE DADOS DINÂMICOS ===
  async function carregarDadosParceiro() {
    try {
      // 1. Carregar Parceiro Logado
      const resMe = await fetch("http://127.0.0.1:8000/partner-auth/me", {credentials: 'include'});
      if (!resMe.ok) {
         if (resMe.status === 401) window.location.href = "./index.html"; // Redireciona se não estiver logado
         throw new Error("Erro ao buscar parceiro");
      }
      const parceiro = await resMe.json();
      
      // Atualizar Nomes na Tela
      document.querySelectorAll(".username-display, .user-name, .dash-user-info strong").forEach(el => {
          el.textContent = parceiro.nome || "Parceiro";
      });
      // Atualizar Avatar (Primeira Letra)
      document.querySelectorAll(".dash-avatar").forEach(el => {
          el.textContent = (parceiro.nome || "P").charAt(0).toUpperCase();
      });
      
      // Atualizar Formulário de Configurações
      const inputNome = document.querySelector("#formDashboardConfig input[type='text']");
      const inputEmail = document.querySelector("#formDashboardConfig input[type='email']");
      if (inputNome) inputNome.value = parceiro.nome || "";
      if (inputEmail) inputEmail.value = parceiro.email || "";

      // 2. Carregar Locais Cadastrados
      const resLocais = await fetch("http://127.0.0.1:8000/api/estabelecimentos", {credentials: 'include'});
      if (!resLocais.ok) throw new Error("Erro ao buscar locais");
      const locais = await resLocais.json();

      let todasAvaliacoes = [];
      // 3. Buscar avaliações de cada local
      for (const loc of locais) {
          try {
              const resRev = await fetch(`http://127.0.0.1:8000/public/places/${loc.id}/reviews`);
              if (resRev.ok) {
                  const revs = await resRev.json();
                  revs.forEach(r => r.local_nome = loc.nome); // Anexa o nome do local na review
                  todasAvaliacoes.push(...revs);
              }
          } catch(e) { console.error(e); }
      }

      // Ordenar avaliações pela data mais recente (supondo que created_at exista, senão pela ordem reversa)
      todasAvaliacoes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      renderizarListas(locais);
      calcularEstatisticasGlobais(locais);
      renderizarAvaliacoes(todasAvaliacoes);

    } catch (error) {
        console.error("Erro no Dashboard:", error);
    }
  }

  function getStatusStyle(statusTxt) {
    if (statusTxt === "APPROVED") return "status-aprovado";
    if (statusTxt === "PENDING_REVIEW") return "status-analise";
    return "status-reprovado";
  }
  
  function getStatusLabel(statusTxt) {
    if (statusTxt === "APPROVED") return "Aprovado";
    if (statusTxt === "PENDING_REVIEW") return "Em análise";
    return "Reprovado";
  }

  function renderizarListas(locais) {
      const previewContainer = document.getElementById("locaisListPreview");
      const gridContainer = document.getElementById("locaisGridCompleto");
      
      let htmlPreview = "";
      let htmlGrid = "";

      if (locais.length === 0) {
          const emptyMsg = `<div style="padding: 24px; text-align: center; color: #64748b;">Nenhum local cadastrado ainda.</div>`;
          if (previewContainer) previewContainer.innerHTML = emptyMsg;
          if (gridContainer) gridContainer.innerHTML = emptyMsg;
          return;
      }

      locais.forEach((loc) => {
          // Fallback para imagem
          let imgUrl = "./assets/img/placeholder-place.png";
          if (loc.foto_perfil) {
              imgUrl = `http://127.0.0.1:8000/api/estabelecimentos/fotos/${loc.foto_perfil}`;
          }

          const cls = getStatusStyle(loc.status);
          const lbl = getStatusLabel(loc.status);
          const icon = loc.status === "APPROVED" ? "✓" : loc.status === "PENDING_REVIEW" ? "⏱" : "✕";

          // Para preview na Home
          htmlPreview += `
            <div class="local-row">
                <div class="local-img-box"><img src="${imgUrl}" alt="foto" style="width: 100%; height: 100%; object-fit: cover;"></div>
                <div class="local-infos">
                  <strong>${loc.nome}</strong>
                  <span>${loc.tipo || "Outro"}</span>
                </div>
                
                <span class="local-status ${cls}">
                  ${icon} ${lbl}
                </span>
                <div class="local-stats-mini">
                  <strong>${loc.reviews_count || 0}</strong>
                  <span>avaliações</span>
                </div>
            </div>
          `;

          // Para Grid na aba Meus Locais
          htmlGrid += `
            <div class="local-card">
              <div class="local-card-banner">
                <img src="${imgUrl}" alt="Capa" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
              <div class="local-card-content">
                <div class="local-card-head">
                   <span class="cat">${loc.tipo || "Outro"}</span>
                   <span class="local-status ${cls}" style="margin:0; padding:2px 8px; font-size:11px;">
                     ${lbl}
                   </span>
                </div>
                <h4 style="margin: 8px 0;">${loc.nome}</h4>

                <div class="local-card-metrics">
                   <div class="metric-mini">
                     <strong>0</strong>
                     <span style="font-size: 11px;">Views</span>
                   </div>
                   <div class="metric-mini">
                     <strong>0</strong>
                     <span style="font-size: 11px;">Cliques</span>
                   </div>
                   <div class="metric-mini">
                     <strong>${loc.avg_rating ? loc.avg_rating.toFixed(1) : "--"}</strong>
                     <span style="font-size: 11px;">Nota</span>
                   </div>
                </div>
                <a href="#" class="btn-gray-outline" onclick="alert('Edição de local em breve!')">Editar local</a>
              </div>
            </div>
          `;
      });

      if (previewContainer) previewContainer.innerHTML = htmlPreview;
      if (gridContainer) gridContainer.innerHTML = htmlGrid;
  }
  
  function calcularEstatisticasGlobais(locais, avaliacoes) {
      let totalAvaliacoes = 0;
      let somaNotas = 0;
      let locaisAvaliados = 0;
      let totalFavoritos = 0;
      let totalViews = 0;
      let totalClicks = 0;
      
      locais.forEach(loc => {
          const rCount = loc.reviews_count || 0;
          totalAvaliacoes += rCount;
          
          if (rCount > 0 && loc.avg_rating) {
              somaNotas += loc.avg_rating;
              locaisAvaliados++;
          }
          
          totalFavoritos += loc.favorites_count || 0;
          totalViews += loc.views_count || 0;
          totalClicks += loc.clicks_count || 0;
      });
      
      // % de Avaliações Positivas (4+ estrelas)
      let positivasCount = 0;
      if (avaliacoes && avaliacoes.length > 0) {
          positivasCount = avaliacoes.filter(r => r.rating >= 4).length;
      }
      const engajamentoPerc = totalAvaliacoes > 0 ? Math.round((positivasCount / totalAvaliacoes) * 100) : 0;

      const mediaGlobal = locaisAvaliados > 0 ? (somaNotas / locaisAvaliados).toFixed(1) : "0.0";
      
      // Atualiza blocos da Aba Dashboard
      const dashboardCards = document.querySelectorAll("#section-dashboard .metrics-grid .metric-card strong");
      if (dashboardCards.length >= 4) {
          dashboardCards[0].textContent = totalViews; // Views Reais
          dashboardCards[1].textContent = totalClicks; // Clicks Reais
          dashboardCards[2].textContent = totalAvaliacoes; // Avaliações
          dashboardCards[3].textContent = totalFavoritos; // Favoritos Real
      }

      // Zera o chart de barras inicial (mock de 7 dias)
      const mockBars = document.querySelectorAll("#section-dashboard .chart-faux .bar-fill");
      mockBars.forEach(b => b.style.height = "0%");
      
      // Atualiza Engajamento na Home (%)
      const engajamentoBig = document.querySelector("#section-dashboard .dash-grid-2 .dash-card:nth-child(2) strong");
      if (engajamentoBig) {
          engajamentoBig.textContent = engajamentoPerc + "%";
          const progBar = engajamentoBig.parentElement.querySelector("div > div");
          if (progBar) progBar.style.width = engajamentoPerc + "%";
      }

      // Atualiza blocos da aba Métricas Detalhadas
      const metricsCards = document.querySelectorAll("#section-metricas .metrics-grid .metric-card strong");
      if (metricsCards.length >= 4) {
          metricsCards[0].textContent = totalViews; // Views Reais
          metricsCards[1].textContent = totalClicks; // Clicks Reais
          metricsCards[2].textContent = totalAvaliacoes; // Avaliações
          metricsCards[3].textContent = totalFavoritos; // Favoritos Real
      }
      
      const conversaoPerc = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;
      
      // Zera gráficos horizontais de Visualizações
      const hbars = document.querySelectorAll("#section-metricas .horizontal-chart .hbar-row");
      hbars.forEach(row => {
          const fill = row.querySelector(".hbar-fill");
          const val = row.querySelector(".hbar-value");
          const suf = row.querySelector(".hbar-suffix");
          if (fill) fill.style.width = "0%";
          if (val) val.textContent = "0";
          if (suf) suf.textContent = "0 cliques";
      });

      // Atualiza Taxa de Conversão e Engajamento na aba Métricas Detalhadas
      const conversaoAba = document.querySelector("#section-metricas .dash-grid-2 .dash-card:nth-child(1) strong");
      if (conversaoAba) {
          conversaoAba.textContent = conversaoPerc + "%";
          const progBar = conversaoAba.parentElement.querySelector("div > div");
          if (progBar) progBar.style.width = conversaoPerc + "%";
      }

      const engajamentoAba = document.querySelector("#section-metricas .dash-grid-2 .dash-card:nth-child(2) strong");
      if (engajamentoAba) {
          engajamentoAba.textContent = engajamentoPerc + "%";
          const progBar = engajamentoAba.parentElement.querySelector("div > div");
          if (progBar) progBar.style.width = engajamentoPerc + "%";
      }
      
      // Atualiza Aba Avaliações
      const avaliacoesCards = document.querySelectorAll("#section-avaliacoes .metrics-grid .metric-card strong");
      if (avaliacoesCards.length >= 3) {
          avaliacoesCards[0].textContent = mediaGlobal;
          avaliacoesCards[1].textContent = totalAvaliacoes;
          avaliacoesCards[2].textContent = engajamentoPerc + "%";
      }
  }

  function renderizarAvaliacoes(avaliacoes) {
      const containerHome = document.querySelector("#section-dashboard .review-list");
      const containerAba = document.querySelector("#section-avaliacoes .review-box-list");

      if (!avaliacoes || avaliacoes.length === 0) {
          const emptyHtml = `<div style="color: #64748b; padding: 12px 0;">Nenhuma avaliação encontrada.</div>`;
          if (containerHome) containerHome.innerHTML = emptyHtml;
          if (containerAba) containerAba.innerHTML = emptyHtml;
          return;
      }

      let htmlHome = "";
      let htmlAba = "";

      // Mostramos no máximo as 3 mais recentes na Home
      const top3 = avaliacoes.slice(0, 3);
      
      const renderStars = (rating) => {
          let str = "";
          for(let i=1; i<=5; i++) {
              str += i <= rating ? "★" : "☆";
          }
          return str;
      };

      top3.forEach(rev => {
          const fallbackData = rev.created_at ? new Date(rev.created_at).toLocaleDateString('pt-BR') : 'Recente';
          const init = (rev.usuario_nome || 'U').charAt(0).toUpperCase();
          htmlHome += `
            <div class="review-item">
              <div class="review-head">
                <strong>${rev.usuario_nome || 'Usuário Anônimo'}</strong>
                <div class="stars">${renderStars(rev.rating)}</div>
              </div>
              <p style="font-size: 11px; color:#ea580c; margin-bottom: 4px;">🎯 ${rev.local_nome}</p>
              <p>${rev.comment || 'Sem comentários.'}</p>
              <span>${fallbackData}</span>
            </div>
          `;
      });
      if (containerHome) containerHome.innerHTML = htmlHome;

      avaliacoes.forEach(rev => {
          const fallbackData = rev.created_at ? new Date(rev.created_at).toLocaleDateString('pt-BR') : 'Recente';
          const init = (rev.usuario_nome || 'U').charAt(0).toUpperCase();

          htmlAba += `
            <div class="review-box-item" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; gap: 12px; align-items: center">
                  <div style="width: 40px; height: 40px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff;">
                    ${init}
                  </div>
                  <div>
                    <strong style="display: block; font-size: 14px; color: #0f172a">${rev.usuario_nome || 'Usuário Anônimo'}</strong>
                    <span style="font-size: 12px; color: #64748b">${fallbackData} • no local <strong>${rev.local_nome}</strong></span>
                  </div>
                </div>
                <div class="stars" style="color: #ea580c; letter-spacing: 2px;">${renderStars(rev.rating)}</div>
              </div>
              <p style="margin: 0; font-size: 14px; color: #475569">
                ${rev.comment || 'Sem comentários adicionais.'}
              </p>
            </div>
          `;
      });
      if (containerAba) containerAba.innerHTML = htmlAba;
  }

  // Chamar na inicialização
  carregarDadosParceiro();
});

function logout() {
  // Limpar tokens de parceiro ou alertar
  if (confirm("Deseja realmente sair da área do parceiro?")) {
    window.location.href = "./index.html";
  }
}

// === MÉTODOS DO MODAL DE CUPOM ===
function openCupomModal() {
  const modal = document.getElementById("modalNovoCupom");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeCupomModal() {
  const modal = document.getElementById("modalNovoCupom");
  if (modal) {
    modal.classList.remove("active");
  }
}

function salvarNovoCupom() {
  const titulo = document.getElementById("c_titulo").value;
  const codigo = document.getElementById("c_codigo").value;

  if (!titulo || !codigo) {
    alert(
      "Por favor, preencha o Código e o Título do cupom (campos obrigatórios).",
    );
    return;
  }

  alert("Cupom '" + codigo + "' criado com sucesso!");
  closeCupomModal();

  // Atualiza a UI para mostrar que tem cupom (simulação)
  const bannerSem = document.getElementById("promoBannerSemCupom");
  const bannerCom = document.getElementById("promoBannerComCupom");
  if (bannerSem) bannerSem.style.display = "none";
  if (bannerCom) {
    bannerCom.style.display = "flex";
    const dataDesc = new Date();
    dataDesc.setMonth(dataDesc.getMonth() + 1);
    const dataTxt = document.getElementById("dashCupomData");
    if (dataTxt) {
      dataTxt.innerText = dataDesc.toLocaleDateString("pt-BR");
    }
  }
}
