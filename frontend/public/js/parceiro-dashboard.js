document.addEventListener("DOMContentLoaded", () => {
  // === LÓGICA DE ABAS (NAVEGAÇÃO TAB MENU) ===
  const navBtns = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".dash-section");
  const pageTitle = document.getElementById("pageTitle");

  // === FUNÇÃO PARA TROCAR DE SEÇÃO (Exposta globalmente) ===
  window.switchToSection = function(target) {
    navBtns.forEach((b) => {
      if (b.getAttribute("data-target") === target) b.classList.add("active");
      else b.classList.remove("active");
    });
    const activeBtn = Array.from(navBtns).find(b => b.getAttribute("data-target") === target);
    if (activeBtn) pageTitle.textContent = activeBtn.textContent.trim();
    sections.forEach((sec) => {
      if (sec.id === `section-${target}`) sec.classList.add("active");
      else sec.classList.remove("active");
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      window.switchToSection(target);
    });
  });

  // === LÓGICA DE MENU MOBILE (HAMBURGER) ===
  const dashMenuBtn = document.getElementById("dashMenuBtn");
  const dashSidebar = document.querySelector(".dash-sidebar");
  const dashOverlay = document.createElement("div");
  dashOverlay.className = "dash-sidebar-overlay";
  document.body.appendChild(dashOverlay);

  const toggleMenu = () => {
    dashSidebar.classList.toggle("active");
    dashOverlay.classList.toggle("active");
  };

  if (dashMenuBtn) {
    dashMenuBtn.addEventListener("click", toggleMenu);
    dashOverlay.addEventListener("click", toggleMenu);
  }

  // Fechar menu ao clicar em um item (mobile)
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (window.innerWidth <= 992 && dashSidebar.classList.contains("active")) toggleMenu();
    });
  });

  // === RENDENRIZAÇÃO DE DADOS DINÂMICOS ===
  async function carregarDadosParceiro() {
    try {
      // 1. Carregar Parceiro Logado
      const resMe = await fetch("/partner-auth/me", {credentials: 'include'});
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
      const resLocais = await fetch("/api/estabelecimentos", {credentials: 'include'});
      if (!resLocais.ok) throw new Error("Erro ao buscar locais");
      const locais = await resLocais.json();

      // Regra de Negócio: Cupom apenas para planos Pagos (Pro/Premium)
      window.partnerCanCreateCoupon = locais.some(loc => {
          let pl = loc.plano_escolhido ? loc.plano_escolhido.toLowerCase() : 'basico';
          return pl.includes('pro') || pl.includes('premium') || pl.includes('plus');
      });

      // Atualizar Badge de Plano na Sidebar
      const userPlanBadge = document.querySelector(".dash-user-info .badge-premium");
      if (userPlanBadge) {
          let highestTier = "basico";
          const tierMap = {"basico": 1, "pro": 2, "premium": 3, "premium": 3};
          locais.forEach(loc => {
              let pl = loc.plano_escolhido ? loc.plano_escolhido.toLowerCase() : "basico";
              if (tierMap[pl] > tierMap[highestTier]) highestTier = pl;
          });

          if (highestTier === "premium" || highestTier === "premium") {
              userPlanBadge.innerHTML = `💎 Premium`;
              userPlanBadge.style.background = "#fffbeb";
              userPlanBadge.style.color = "#d97706";
          } else if (highestTier === "pro") {
              userPlanBadge.innerHTML = `⭐ Pro`;
              userPlanBadge.style.background = "#f0fdf4";
              userPlanBadge.style.color = "#15803d";
          } else {
              userPlanBadge.innerHTML = `📋 Básico`;
              userPlanBadge.style.background = "rgba(255, 255, 255, 0.2)";
              userPlanBadge.style.color = "white";
          }
      }

      // Aplica Paywall na Aba de Métricas (Padrão de Mercado) se for gratuito
      if (window.partnerCanCreateCoupon === false) {
          const secMetricas = document.getElementById("section-metricas");
          if (secMetricas) {
             secMetricas.style.position = "relative";
             secMetricas.style.overflow = "hidden";
             const overlay = document.createElement("div");
             const editLink = locais.length > 0 ? `parceiro-editar-estabelecimento.html?id=${locais[0].id}` : `parceiro-cadastro-estabelecimento.html`;
             overlay.innerHTML = `
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); z-index: 50; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; text-align:center; padding-top: 150px;">
                   <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 440px; border: 1px solid #f1f5f9;">
                     <div style="width: 70px; height: 70px; background: #fff7ed; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                       <span style="font-size: 32px;">🔒</span>
                     </div>
                     <h3 style="margin-bottom: 12px; color: #0f172a; font-size: 22px;">Métricas Avançadas Bloqueadas</h3>
                     <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                        A aba de métricas detalhadas é exclusiva para parceiros Pro ou Premium. Descubra os dias de maior fluxo, o perfil dos cliques e converta mais turistas habilitando o plano completo!
                     </p>
                     <a href="${editLink}" class="btn-orange" style="display:inline-block; text-decoration:none; padding: 14px 28px; width: 100%;">Quero Desbloquear</a>
                   </div>
                </div>
             `;
             secMetricas.appendChild(overlay);
          }
      }

      let todasAvaliacoes = [];
      // 3. Buscar avaliações de cada local
      for (const loc of locais) {
          try {
              const resRev = await fetch(`/public/places/${loc.id}/reviews`);
              if (resRev.ok) {
                  const revs = await resRev.json();
                  revs.forEach(r => {
                      r.local_nome = loc.nome; // Anexa o nome do local na review
                      r.local_id = loc.id;     // ID para filtro
                  });
                  todasAvaliacoes.push(...revs);
              }
          } catch(e) { console.error(e); }
      }

      // Ordenar avaliações pela data mais recente (supondo que created_at exista, senão pela ordem reversa)
      todasAvaliacoes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      let metricas7DiasMap = {}; // data -> { views, clicks }
      window.allMetricas7DiasByLocal = {};
      if (locais.length > 0) {
          try {
              // Buscar métricas de TODOS os locais e somar por data
              for (const loc of locais) {
                  const resMet = await fetch(`/api/estabelecimentos/${loc.id}/metricas-7dias`, {credentials: 'include'});
                  if (resMet.ok) {
                      const dados = await resMet.json();
                      window.allMetricas7DiasByLocal[loc.id] = dados;
                      dados.forEach(m => {
                          if (!metricas7DiasMap[m.data]) metricas7DiasMap[m.data] = { views: 0, clicks: 0 };
                          metricas7DiasMap[m.data].views += m.views || 0;
                          metricas7DiasMap[m.data].clicks += m.clicks || 0;
                      });
                  }
              }
          } catch(e) { console.error("Erro ao agregar métricas:", e); }
      }

      // Converte o Mapa agregado para Array no formato esperado pelas funções de render
      const metricas7DiasAgregadas = Object.keys(metricas7DiasMap).map(d => ({
          data: d,
          views: metricas7DiasMap[d].views,
          clicks: metricas7DiasMap[d].clicks
      }));

      // Salva globalmente para o filtro
      window.loadedLocais = locais;
      window.loadedAvaliacoes = todasAvaliacoes;
      window.loadedMetricas7DiasAgregadas = metricas7DiasAgregadas;

      // Popula os selects de filtro (Dashboard e Métricas)
      const selectDashboard = document.getElementById("filtroEstabelecimentoDashboard");
      const selectMetricas = document.getElementById("filtroEstabelecimentoMetricas");
      const filterSelects = [selectDashboard, selectMetricas].filter(Boolean);

      filterSelects.forEach(sel => {
        sel.innerHTML = '<option value="todos">Todos os estabelecimentos</option>';
        locais.forEach(loc => {
          const opt = document.createElement("option");
          opt.value = loc.id;
          opt.textContent = loc.nome;
          sel.appendChild(opt);
        });

        // Registra o evento de mudança se ainda não registrado
        if (!sel.dataset.listenerRegistered) {
          sel.dataset.listenerRegistered = "true";
          sel.addEventListener("change", (e) => {
            const selectedValue = e.target.value;
            
            // Sincroniza o outro select
            filterSelects.forEach(otherSel => {
              if (otherSel !== sel) otherSel.value = selectedValue;
            });

            let locaisFiltrados = window.loadedLocais || [];
            let avaliacoesFiltrados = window.loadedAvaliacoes || [];
            let metricasFiltradas = [];

            if (selectedValue === "todos") {
              metricasFiltradas = window.loadedMetricas7DiasAgregadas || [];
              window._primeiroEstabId = (window.loadedLocais && window.loadedLocais.length > 0) ? window.loadedLocais[0].id : null;
            } else {
              const selectedId = parseInt(selectedValue);
              locaisFiltrados = (window.loadedLocais || []).filter(l => l.id === selectedId);
              avaliacoesFiltrados = (window.loadedAvaliacoes || []).filter(r => r.local_id === selectedId);
              metricasFiltradas = (window.allMetricas7DiasByLocal || {})[selectedId] || [];
              window._primeiroEstabId = selectedId;
            }

            // Re-calcula e re-renderiza as estatísticas globais e avaliações baseadas no filtro!
            calcularEstatisticasGlobais(locaisFiltrados, avaliacoesFiltrados, metricasFiltradas);
            renderizarAvaliacoes(avaliacoesFiltrados);
          });
        }
      });

      renderizarListas(locais);
      calcularEstatisticasGlobais(locais, todasAvaliacoes, metricas7DiasAgregadas);
      renderizarAvaliacoes(todasAvaliacoes);

      // Carrega cupons do primeiro estabelecimento (para o banner do dashboard)
      if (locais.length > 0) {
        window._primeiroEstabId = locais[0].id;
        
        // --- NOVO: Atualiza o Card de Plano na seção Configurações ---
        renderizarCardPlano(locais[0]);

        const todosCupons = [];
        for (const loc of locais) {
          const cuponsLoc = await carregarCuponsDoEstab(loc.id);
          cuponsLoc.forEach(c => { c._localNome = loc.nome; });
          todosCupons.push(...cuponsLoc);
        }

        if (todosCupons.length > 0) {
          // Mostra banner "cupom ativo"
          const bannerSem = document.getElementById("promoBannerSemCupom");
          const bannerCom = document.getElementById("promoBannerComCupom");
          if (bannerSem) bannerSem.style.display = "none";
          if (bannerCom) {
            bannerCom.style.display = "flex";
            const dataTxt = document.getElementById("dashCupomData");
            if (dataTxt) dataTxt.innerText = todosCupons[0].validade || "Ativo";
          }
          renderCuponsSection(todosCupons);
        }
      }

      // --- NOVO: Verificação Preemptiva de Limites para criação de Locais ---
      window._totalLocais = locais.length;
      window._capacidadeLocais = 1; // Default Básico
      if (locais.length > 0) {
        const tierMap = {"Basico": 1, "Básico": 1, "basico": 1, "Pro": 5, "pro": 5, "Premium": 100, "premium": 100};
        const melhorPlano = locais.reduce((prev, curr) => {
           const p1 = prev.plano_escolhido || "Básico";
           const p2 = curr.plano_escolhido || "Básico";
           const val1 = tierMap[p1] || 1;
           const val2 = tierMap[p2] || 1;
           return (val2 > val1) ? curr : prev;
        }, locais[0]);
        window._capacidadeLocais = tierMap[melhorPlano.plano_escolhido] || 1;
      }

      const btnsNovoLocal = document.querySelectorAll("a[href*='parceiro-cadastro-estabelecimento.html']");
      btnsNovoLocal.forEach(btn => {
        btn.addEventListener("click", (e) => {
             if (window._totalLocais >= window._capacidadeLocais) {
                 e.preventDefault();
                 const modal = document.getElementById('planLimitModal');
                 const msg = document.getElementById('planLimitMsg');
                 if (modal && msg) {
                     msg.textContent = `Você atingiu o limite de locais (${window._capacidadeLocais}) para o seu plano atual. Faça um upgrade na aba Configurações para cadastrar mais estabelecimentos.`;
                     modal.style.display = 'flex';
                 }
             }
        });
      });

      // Carrega os chamados de suporte
      carregarChamados();

    } catch (error) {
        console.error("Erro no Dashboard:", error);
    }
  }

  function getStatusStyle(statusTxt) {
    if (statusTxt === "APPROVED") return "status-aprovado";
    if (statusTxt === "PENDING_REVIEW") return "status-analise";
    if (statusTxt === "PENDING_DELETE") return "status-exclusao";
    return "status-reprovado";
  }
  
  function getStatusLabel(statusTxt) {
    if (statusTxt === "APPROVED") return "Aprovado";
    if (statusTxt === "PENDING_REVIEW") return "Em análise";
    if (statusTxt === "PENDING_DELETE") return "Exclusão Solicitada";
    return "Reprovado";
  }

  function getVisibilidadeBadge(vis, ocultoAte) {
    if (vis === "INATIVO") return `<span class="status-inativo">🔴 Inativo</span>`;
    if (vis === "OCULTO_TEMPORARIO") {
      const dataFmt = ocultoAte ? new Date(ocultoAte + "T00:00:00").toLocaleDateString("pt-BR") : "";
      return `<span class="status-oculto">🟡 Oculto até ${dataFmt}</span>`;
    }
    return `<span class="status-ativo">🟢 Ativo</span>`;
  }

  function renderizarCardPlano(loc) {
    const planTextEl = document.querySelector(".plan-text strong");
    const planPriceEl = document.querySelector(".plan-text span");
    const planBtn = document.getElementById("btnAlterarPlanoConfig");
    const cancelBtn = document.getElementById("btnCancelarPlanoConfig");
    
    if (planTextEl && loc) {
        let pName = loc.plano_escolhido || "basico";
        // Formatação amigável
        let displayTitle = "Plano Básico";
        let displayPrice = "Grátis";
        let showCancel = false;
        
        if (pName.toLowerCase().includes("premium") || pName.toLowerCase().includes("plus")) {
            displayTitle = "Plano Premium";
            displayPrice = "R$79/mês";
            showCancel = true;
        } else if (pName.toLowerCase().includes("pro")) {
            displayTitle = "Plano Pro";
            displayPrice = "R$39/mês";
            showCancel = true;
        }

        planTextEl.textContent = displayTitle;
        if (planPriceEl) planPriceEl.textContent = displayPrice;
        if (planBtn) planBtn.href = `./planos.html?estabId=${loc.id}`;
        
        if (cancelBtn) {
            cancelBtn.style.display = showCancel ? "inline-flex" : "none";
            cancelBtn.dataset.estabid = loc.id;
        }
    }
  }

  window.cancelarPlanoAtual = async function() {
    const cancelBtn = document.getElementById("btnCancelarPlanoConfig");
    const estabId = cancelBtn ? cancelBtn.dataset.estabid : window._primeiroEstabId;
    if (!estabId) return;

    const result = await Swal.fire({
      title: 'Cancelar Assinatura?',
      html: `
        <div style="text-align: left; font-size: 14px; color: #475569;">
            <p style="margin-bottom: 12px; color: #0f172a; font-weight: 500;">Sua assinatura será cancelada, mas nenhum dado será perdido.</p>
            <ul style="padding-left: 20px; line-height: 1.5; margin-bottom: 0;">
                <li>Seus benefícios atuais permanecerão ativos por 30 dias.</li>
                <li>Após esse período, sua conta será migrada para o Plano Básico.</li>
                <li>Estabelecimentos que excederem o limite do plano serão ocultados, mas continuarão cadastrados.</li>
                <li>Você poderá reativar sua assinatura a qualquer momento.</li>
            </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sim, cancelar assinatura',
      cancelButtonText: 'Manter plano'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({ title: 'Processando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        
        // Simulação de cancelamento real: faz PATCH para basico
        const response = await fetch(`/api/estabelecimentos/${estabId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plano_escolhido: "basico" }),
          credentials: 'include'
        });

        if (response.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'Assinatura Cancelada',
            text: 'Sua assinatura foi cancelada. Seus dados permanecem salvos e poderão ser reativados ao renovar um plano futuro.',
            confirmButtonColor: '#10b981'
          });
          window.location.reload();
        } else {
          const errData = await response.json();
          Swal.fire('Erro', errData.detail || "Erro desconhecido", 'error');
        }
      } catch (err) {
        Swal.fire('Erro', 'Falha ao conectar com o servidor.', 'error');
      }
    }
  };

  function getBotaoVisibilidade(loc) {
    const v = loc.visibilidade || "ATIVO";
    if (v === "INATIVO") {
      return `<button class="btn-reativar" onclick="reativarEstab(${loc.id}, this)">Reativar</button>`;
    }
    if (v === "OCULTO_TEMPORARIO") {
      return `<button class="btn-reativar" onclick="reativarEstab(${loc.id}, this)">Ativar agora</button>`;
    }
    return `<button class="btn-gerenciar-vis" onclick="abrirModalVisibilidade(${loc.id}, '${loc.nome.replace(/'/g, "\\'")}', '${v}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      Gerenciar
    </button>`;
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
              imgUrl = `/api/estabelecimentos/fotos/${loc.foto_perfil}`;
          }

          const cls = getStatusStyle(loc.status);
          const lbl = getStatusLabel(loc.status);
          const icon = loc.status === "APPROVED" ? "✓" : loc.status === "PENDING_REVIEW" ? "⏱" : "✕";
          const visBadge = getVisibilidadeBadge(loc.visibilidade, loc.oculto_ate);
          const visBtn   = getBotaoVisibilidade(loc);

          // Para preview na Home
          htmlPreview += `
            <div class="local-row">
                <div class="local-img-box"><img src="${imgUrl}" alt="foto" style="width: 100%; height: 100%; object-fit: cover;"></div>
                <div class="local-infos">
                  <strong>${loc.nome}</strong>
                  <span>${loc.tipo || "Outro"}</span>
                  <div style="margin-top:4px;">${visBadge}</div>
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
            <div class="local-card" style="${loc.visibilidade !== 'ATIVO' ? 'opacity:0.8; border-color:#e2e8f0;' : ''}">
              <div class="local-card-banner" style="position:relative;">
                <img src="${imgUrl}" alt="Capa" style="width: 100%; height: 100%; object-fit: cover;">
                ${loc.visibilidade !== 'ATIVO' ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:13px;font-weight:800;background:rgba(0,0,0,0.5);padding:4px 10px;border-radius:6px;">' + (loc.visibilidade === 'INATIVO' ? '🔴 Inativo' : '🟡 Oculto') + '</span></div>' : ''}
              </div>
              <div class="local-card-content">
                <div class="local-card-head">
                   <span class="cat">${loc.tipo || "Outro"}</span>
                   <span class="local-status ${cls}" style="margin:0; padding:2px 8px; font-size:11px;">
                     ${lbl}
                   </span>
                </div>
                <h4 style="margin: 8px 0;">${loc.nome}</h4>
                <div style="margin-bottom:12px;">${visBadge}</div>

                <div class="local-card-metrics">
                   <div class="metric-mini">
                     <strong>${loc.views_count || 0}</strong>
                     <span style="font-size: 11px;">Views</span>
                   </div>
                   <div class="metric-mini">
                     <strong>${loc.clicks_count || 0}</strong>
                     <span style="font-size: 11px;">Cliques</span>
                   </div>
                   <div class="metric-mini">
                     <strong>${loc.avg_rating ? loc.avg_rating.toFixed(1) : "--"}</strong>
                     <span style="font-size: 11px;">Nota</span>
                   </div>
                </div>
                <div class="local-card-actions" style="display:flex; gap:8px; margin-top:12px;">
                  <a href="./parceiro-editar-estabelecimento.html?id=${loc.id}" style="flex:1; padding: 8px; border: 1px solid #f97316; color: #fff; background: #ea580c; border-radius: 6px; font-size: 12px; cursor: pointer; text-decoration: none; text-align: center; font-weight:600; display: inline-flex; align-items: center; justify-content: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Editar</a>
                  ${visBtn}
                </div>
              </div>
            </div>
          `;
      });

      if (previewContainer) previewContainer.innerHTML = htmlPreview;
      if (gridContainer) gridContainer.innerHTML = htmlGrid;
  }
  
  function calcularEstatisticasGlobais(locais, avaliacoes, metricas7Dias = []) {
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

      // ─── ATUALIZAÇÃO DO GRÁFICO DE BARRAS (DASHBOARD) ───
      const mockBars = document.querySelectorAll("#section-dashboard .chart-faux .bar-col");
      const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      
      // Helper para formatar data local como YYYY-MM-DD
      const formatLocalISO = (dateObj) => {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      // Mapear métricas reais para os últimos 7 dias
      const hoje = new Date();
      const ultimos7Dias = [];
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(hoje.getDate() - i);
          const dataStr = formatLocalISO(d);
          const metrica = metricas7Dias.find(m => m.data === dataStr) || { views: 0, clicks: 0 };
          ultimos7Dias.push({
              label: diasSemana[d.getDay()],
              views: metrica.views,
              clicks: metrica.clicks,
              dataStr: dataStr
          });
      }

      const maxViews = Math.max(...ultimos7Dias.map(d => d.views), 1);
      
      mockBars.forEach((col, idx) => {
          if (ultimos7Dias[idx]) {
              const fill = col.querySelector(".bar-fill");
              const label = col.querySelector(".bar-label");
              if (fill) fill.style.height = `${(ultimos7Dias[idx].views / maxViews) * 100}%`;
              if (label) label.textContent = ultimos7Dias[idx].label;
          }
      });
      
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
      
      // ─── ATUALIZAÇÃO DO GRÁFICO HORIZONTAL (MÉTRICAS) ───
      const hbars = document.querySelectorAll("#section-metricas .horizontal-chart .hbar-row");
      const maxViewsH = Math.max(...ultimos7Dias.map(d => d.views), 1);

      hbars.forEach((row, idx) => {
          const dataInfo = ultimos7Dias[idx];
          if (dataInfo) {
              const label = row.querySelector(".hbar-label");
              const fill = row.querySelector(".hbar-fill");
              const val = row.querySelector(".hbar-value");
              const suf = row.querySelector(".hbar-suffix");

              if (label) label.textContent = dataInfo.label;
              if (fill) fill.style.width = `${(dataInfo.views / maxViewsH) * 100}%`;
              if (val) val.textContent = dataInfo.views;
              if (suf) suf.textContent = `${dataInfo.clicks} cliques`;
          }
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
  Swal.fire({
    title: 'Deseja sair?',
    text: 'Você será desconectado da área do parceiro.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Sim, sair',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Chama o endpoint real de logout para limpar o cookie do parceiro
        await fetch('/partner-auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.warn('[Logout] Erro ao chamar endpoint:', e);
      }
      window.location.href = './parceiro-login.html';
    }
  });
}

// === MÉTODOS DO MODAL DE CUPOM ===
function openCupomModal(estabId) {
  const alvoId = estabId || window._primeiroEstabId || "";
  
  if (window.partnerCanCreateCoupon === false) {
      if (confirm("❌ Recurso Exclusivo!\n\nA criação de Cupons é exclusiva dos Planos Pro ou Premium.\n\nDeseja fazer o upgrade agora para atrair mais clientes pagantes?")) {
         window.location.href = `./pagamento.html?plan=pro&estab_id=${alvoId}`;
      }
      return;
  }
  
  const modal = document.getElementById("modalNovoCupom");
  if (modal) {
    // Guarda o id do estabelecimento para usar ao salvar
    modal.dataset.estabId = estabId || window._primeiroEstabId || "";
    
    // Limpa o formulário
    ["c_titulo","c_codigo","c_desc","c_valor"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const destaque = document.getElementById("c_destaque");
    if (destaque) destaque.checked = true;
    
    const select = document.getElementById("c_estab_id");
    const alvoId = modal.dataset.estabId;
    if (select && window._meusLocais) {
       select.innerHTML = window._meusLocais.map(l => `<option value="${l.id}" ${l.id == alvoId ? "selected" : ""}>${l.nome}</option>`).join("");
    }

    modal.classList.add("active");
    const tipo = document.getElementById("c_tipo");
    if (tipo) tipo.value = "percentual";
  }
}

function closeCupomModal() {
  const modal = document.getElementById("modalNovoCupom");
  if (modal) {
    modal.classList.remove("active");
  }
}

async function salvarNovoCupom() {
  const titulo = document.getElementById("c_titulo").value.trim();
  const codigo = document.getElementById("c_codigo").value.trim();
  const desc   = document.getElementById("c_desc").value.trim();
  const tipo   = document.getElementById("c_tipo").value;
  const valor  = parseInt(document.getElementById("c_valor").value) || 0;
  
  const select = document.getElementById("c_estab_id");
  const modal  = document.getElementById("modalNovoCupom");
  const estabId = (select && select.value) ? select.value : (modal ? modal.dataset.estabId : "");

  if (!titulo || !codigo) {
    alert("Por favor, preencha o Código e o Título do cupom (campos obrigatórios).");
    return;
  }

  if (!estabId) {
    alert("Nenhum estabelecimento selecionado para vincular o cupom.");
    return;
  }

  const btnCriar = document.querySelector(".btn-criar");
  if (btnCriar) {
    btnCriar.textContent = "Salvando...";
    btnCriar.disabled = true;
  }

  try {
    const res = await fetch(`/api/estabelecimentos/${estabId}/cupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        titulo,
        codigo,
        descricao: desc,
        tipo_desconto: tipo,
        valor,
        validade: null,
        regras: null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Erro: " + (err.detail || "Não foi possível criar o cupom."));
      return;
    }

    const cupom = await res.json();
    closeCupomModal();

    // Atualiza UI — mostra banner "cupom ativo"
    const bannerSem = document.getElementById("promoBannerSemCupom");
    const bannerCom = document.getElementById("promoBannerComCupom");
    if (bannerSem) bannerSem.style.display = "none";
    if (bannerCom) {
      bannerCom.style.display = "flex";
      const dataTxt = document.getElementById("dashCupomData");
      if (dataTxt) dataTxt.innerText = cupom.validade || "Indeterminado";
    }

    // Renderiza a lista de cupons
    renderCuponsSection([cupom]);

  } catch (e) {
    console.error(e);
    alert("Erro de conexão com o servidor.");
  } finally {
    if (btnCriar) {
      btnCriar.textContent = "Criar Cupom";
      btnCriar.disabled = false;
    }
  }
}

async function carregarCuponsDoEstab(estabId) {
  try {
    const res = await fetch(`/api/estabelecimentos/${estabId}/cupons`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function deletarCupom(cupomId) {
  if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
  try {
    const res = await fetch(`/api/cupons/${cupomId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok || res.status === 204) {
      alert("Cupom excluído com sucesso!");
      window.location.reload();
    } else {
      const err = await res.json();
      alert("Erro: " + (err.detail || "Não foi possível excluir."));
    }
  } catch (e) {
    alert("Erro de conexão.");
  }
}

function renderCuponsSection(cupons) {
  // Cria/atualiza a seção de cupons dentro do dashboard
  let container = document.getElementById("cuponsSectionContainer");
  if (!container) {
    const dashContent = document.querySelector(".dash-content #section-dashboard");
    if (!dashContent) return;
    container = document.createElement("div");
    container.id = "cuponsSectionContainer";
    container.className = "dash-card mt-24";
    dashContent.appendChild(container);
  }

  if (!cupons || cupons.length === 0) {
    container.innerHTML = "";
    return;
  }

  const itens = cupons.map(c => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f1f5f9;">
      <div>
        <strong style="display:block; color:#0f172a;">${c.titulo}</strong>
        <code style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-size:12px; color:#ea580c;">${c.codigo}</code>
        <span style="margin-left:8px; font-size:12px; color:#64748b;">${c.tipo_desconto === 'percentual' ? c.valor + '%' : 'R$' + c.valor} de desconto</span>
        ${c.validade ? `<span style="font-size:11px; color:#94a3b8; margin-left:8px;">Válido até ${c.validade}</span>` : ""}
      </div>
      <button onclick="deletarCupom(${c.id})" style="background:#fef2f2; color:#ef4444; border:1px solid #fee2e2; border-radius:6px; padding:6px 12px; font-size:12px; cursor:pointer;">
        Excluir
      </button>
    </div>
  `).join("");

  container.innerHTML = `
    <div class="card-header-flex">
      <h4>🎟️ Cupons Ativos</h4>
      <button onclick="openCupomModal(window._primeiroEstabId)" class="btn-orange-small">+ Novo Cupom</button>
    </div>
    <div style="margin-top:12px;">${itens}</div>
  `;
}

// =============================================
// GERENCIAMENTO DE VISIBILIDADE (Airbnb-style) 👁️
// =============================================

let _visEstabId = null;
let _visOpcaoSelecionada = null;

function abrirModalVisibilidade(estabId, nomeEstab, visAtual) {
  _visEstabId = estabId;
  _visOpcaoSelecionada = null;

  // Reseta o modal
  [1, 2, 3].forEach(n => {
    const el = document.getElementById(`visOpcao${n}`);
    if (el) el.classList.remove("selected");
  });
  const dateBlock = document.getElementById("visDateBlock");
  if (dateBlock) dateBlock.classList.remove("visible");
  const alertaCupons = document.getElementById("visAlertaCupons");
  if (alertaCupons) alertaCupons.classList.remove("visible");
  const btnConfirmar = document.getElementById("btnConfirmarVisib");
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.className = "btn-vis-confirmar";
    btnConfirmar.textContent = "Confirmar ação";
  }

  // Seta data mínima para amanhã
  const input = document.getElementById("visDataFim");
  if (input) {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    input.min = amanha.toISOString().split("T")[0];
    input.value = "";
  }

  // Atualiza título
  const subtitle = document.getElementById("visModalSubtitle");
  if (subtitle && nomeEstab) subtitle.textContent = `"${nomeEstab}"`;

  document.getElementById("modalVisibilidade").classList.add("active");
  document.body.style.overflow = "hidden";
}

function fecharModalVisibilidade() {
  const modal = document.getElementById("modalVisibilidade");
  if (modal) modal.classList.remove("active");
  document.body.style.overflow = "";
  _visEstabId = null;
  _visOpcaoSelecionada = null;
}

function selecionarOpcaoVis(n) {
  _visOpcaoSelecionada = n;

  [1, 2, 3].forEach(i => {
    const el = document.getElementById(`visOpcao${i}`);
    if (el) el.classList.toggle("selected", i === n);
  });

  // Mostra/esconde bloco de datas
  const dateBlock = document.getElementById("visDateBlock");
  if (dateBlock) dateBlock.classList.toggle("visible", n === 1);

  // Alerta de cupons só na opção 3 (remover)
  const alertaCupons = document.getElementById("visAlertaCupons");
  if (alertaCupons) alertaCupons.classList.toggle("visible", n === 3);

  // Atualiza botão
  const btn = document.getElementById("btnConfirmarVisib");
  if (btn) {
    btn.disabled = false;
    if (n === 3) {
      btn.className = "btn-vis-confirmar danger-action";
      btn.textContent = "⚠️ Remover permanentemente";
    } else if (n === 2) {
      btn.className = "btn-vis-confirmar";
      btn.textContent = "Desativar estabelecimento";
    } else {
      btn.className = "btn-vis-confirmar";
      btn.textContent = "Confirmar ocultação";
    }
  }
}

async function confirmarAcaoVisibilidade() {
  if (!_visEstabId || !_visOpcaoSelecionada) return;

  const btn = document.getElementById("btnConfirmarVisib");
  const originalText = btn.textContent;
  const originalBg = btn.style.background;
  btn.disabled = true;
  btn.textContent = "Aguarde...";
  
  let sucesso = false;

  try {
    // OPÇÃO 1: Ocultar por período
    if (_visOpcaoSelecionada === 1) {
      const dataFim = document.getElementById("visDataFim").value;
      if (!dataFim) {
        alert("Por favor, selecione a data até quando o local deve ficar oculto.");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      const res = await fetch(`/api/estabelecimentos/${_visEstabId}/visibilidade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ acao: "OCULTAR_PERIODO", oculto_ate: dataFim })
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro: " + (err.detail || "Não foi possível ocultar."));
        return;
      }
      sucesso = true;
      btn.style.background = "#22c55e";
      btn.style.borderColor = "#22c55e";
      btn.textContent = "✅ Local ocultado!";
    }

    // OPÇÃO 2: Desativar
    else if (_visOpcaoSelecionada === 2) {
      // O confirm() nativo foi removido porque o modal já serve como confirmação pro usuário
      const res = await fetch(`/api/estabelecimentos/${_visEstabId}/visibilidade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ acao: "DESATIVAR" })
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro: " + (err.detail || "Não foi possível desativar."));
        return;
      }
      sucesso = true;
      btn.style.background = "#22c55e";
      btn.style.borderColor = "#22c55e";
      btn.textContent = "✅ Local desativado!";
    }

    // OPÇÃO 3: Remover permanentemente
    else if (_visOpcaoSelecionada === 3) {
      // O confirm() nativo foi removido porque o usuário já leu o aviso na própria UI da modal
      
      let res = await fetch(`/api/estabelecimentos/${_visEstabId}`, {
        method: "DELETE",
        credentials: "include"
      });

      // Se tem cupons ativos, o backend retorna 409. Como a interface já avisa o usuário (no alerta amarelo),
      // podemos simplesmente forçar a deleção automaticamente chamando novamente com force=true
      if (res.status === 409) {
        res = await fetch(`/api/estabelecimentos/${_visEstabId}?force=true`, {
          method: "DELETE",
          credentials: "include"
        });
      }

      if (res.ok) {
        sucesso = true;
        btn.style.background = "#22c55e";
        btn.style.borderColor = "#22c55e";
        btn.textContent = "✅ Removido com sucesso!";
      } else {
        const err = await res.json();
        alert("Erro: " + (err.detail || "Não foi possível remover."));
        return;
      }
    }

    if (sucesso) {
      // Ao invés de um alert bloqueante final, mostramos o status no botão e recarregamos a página de forma fluída
      setTimeout(() => {
        fecharModalVisibilidade();
        window.location.reload();
      }, 1500);
    }
    
  } catch (e) {
    console.error(e);
    alert("Erro de conexão com o servidor.");
  } finally {
    if (btn && !sucesso) {
      btn.disabled = false;
      btn.textContent = originalText;
      btn.style.background = originalBg;
    }
  }
}

async function reativarEstab(estabId, btnElement) {
  const originalText = btnElement ? btnElement.textContent : "Reativar";
  const originalBg = btnElement ? btnElement.style.background : "";
  
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = "Aguarde...";
  }

  try {
    const res = await fetch(`/api/estabelecimentos/${estabId}/visibilidade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ acao: "REATIVAR" })
    });
    
    if (res.ok) {
      if (btnElement) {
        btnElement.style.background = "#22c55e"; // Verde sucesso
        btnElement.style.borderColor = "#22c55e";
        btnElement.style.color = "#fff";
        btnElement.textContent = "✅ Reativado!";
      }
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      const err = await res.json();
      alert("Erro: " + (err.detail || "Não foi possível reativar."));
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.textContent = originalText;
        btnElement.style.background = originalBg;
      }
    }
  } catch (e) {
    alert("Erro de conexão.");
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.textContent = originalText;
      btnElement.style.background = originalBg;
    }
  }
}

// Fechar modal clicando fora
document.addEventListener("click", function(e) {
  const modal = document.getElementById("modalVisibilidade");
  if (modal && e.target === modal) fecharModalVisibilidade();
});

// Alias legado
window.solicitarExclusao = function(id) {
  abrirModalVisibilidade(id, "", "ATIVO");
  setTimeout(() => selecionarOpcaoVis(3), 100);
};

// =============================================
// GERENCIAMENTO DA CONTA DO PARCEIRO (TOTAL) 🛠️
// =============================================

function openDeactivateModal() {
    if (confirm("Deseja realmente desativar sua conta temporariamente? \n\nSeus locais serão ocultados imediatamente, mas seus dados serão preservados para quando você desejar voltar.")) {
        fetch("/partner-auth/deactivate", {
            method: "POST",
            credentials: "include"
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message || "Conta desativada com sucesso!");
            window.location.reload();
        })
        .catch(err => {
            console.error(err);
            alert("Erro ao desativar conta.");
        });
    }
}

async function checkDeletionPendencies() {
    const btn = document.querySelector(".btn-delete-request");
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "Verificando...";

    try {
        const res = await fetch("/partner-auth/pendencies", { credentials: "include" });
        const data = await res.json();

        const modal = document.getElementById("modalExcluirConta");
        const list = document.getElementById("listPendencies");
        const areaPendencies = document.getElementById("deletionPendenciesArea");
        const areaConfirm = document.getElementById("deletionConfirmArea");
        const btnDelete = document.getElementById("btnConfirmDeleteAccount");

        list.innerHTML = "";
        
        if (data.has_pendencies) {
            data.pendencies.forEach(p => {
                const li = document.createElement("li");
                li.style.marginBottom = "8px";
                li.textContent = p;
                list.appendChild(li);
            });
            areaPendencies.style.display = "block";
            areaConfirm.style.display = "none";
            btnDelete.style.display = "none";
        } else {
            areaPendencies.style.display = "none";
            areaConfirm.style.display = "block";
            btnDelete.style.display = "block";
            btnDelete.disabled = true;
            btnDelete.style.opacity = "0.5";
        }

        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("active"), 10);
        document.body.style.overflow = "hidden";

    } catch (e) {
        console.error(e);
        alert("Erro ao verificar pendências de exclusão.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

function closeDeleteAccountModal() {
    const modal = document.getElementById("modalExcluirConta");
    modal.classList.remove("active");
    setTimeout(() => {
        modal.style.display = "none";
        document.body.style.overflow = "";
        document.getElementById("confirmDeleteInput").value = "";
    }, 300);
}

function validateDeleteAccountPhrase() {
    const val = document.getElementById("confirmDeleteInput").value.trim().toUpperCase();
    const btn = document.getElementById("btnConfirmDeleteAccount");
    btn.disabled = (val !== "EXCLUIR MINHA CONTA");
    btn.style.opacity = btn.disabled ? "0.5" : "1";
}

async function confirmDeleteAccount() {
    const phrase = document.getElementById("confirmDeleteInput").value.trim().toUpperCase();
    if (phrase !== "EXCLUIR MINHA CONTA") return;

    if (!confirm("Esta é uma ação IRREVERSÍVEL. Tem certeza absoluta que deseja excluir sua conta e todos os dados de estabelecimentos?")) {
        return;
    }

    const btn = document.getElementById("btnConfirmDeleteAccount");
    btn.disabled = true;
    btn.textContent = "Excluindo...";

    try {
        const res = await fetch("/partner-auth/delete-request", {
            method: "POST",
            credentials: "include"
        });
        const data = await res.json();

        if (res.ok) {
            alert("Sua conta foi encerrada. Até logo!");
            window.location.href = "./index.html";
        } else {
            alert("Erro: " + (data.detail || "Não foi possível excluir a conta."));
            btn.disabled = false;
            btn.textContent = "Excluir permanentemente";
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão ao solicitar exclusão.");
        btn.disabled = false;
        btn.textContent = "Excluir permanentemente";
    }
}

// =============================================
// LÓGICA DE SUPORTE 🎧
// =============================================

function openSupportModal() {
  const modal = document.getElementById("modalNovoChamado");
  if (modal) {
    modal.classList.add("active");
    document.getElementById("sup_titulo").value = "";
    document.getElementById("sup_descricao").value = "";
    document.getElementById("sup_categoria").value = "Outro";
    document.getElementById("sup_prioridade").value = "Média";
  }
}

function closeSupportModal() {
  const modal = document.getElementById("modalNovoChamado");
  if (modal) modal.classList.remove("active");
}

async function salvarNovoChamado() {
  const title = document.getElementById("sup_titulo").value.trim();
  const description = document.getElementById("sup_descricao").value.trim();
  const category = document.getElementById("sup_categoria").value;
  const priority = document.getElementById("sup_prioridade").value;

  if (!title || !description) {
    alert("Por favor, preencha o título e a descrição.");
    return;
  }

  const btn = document.getElementById("btnSalvarChamado");
  btn.disabled = true;
  btn.textContent = "Abrindo...";

  try {
    const res = await fetch("/api/suporte/chamados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, description, category, priority })
    });

    if (res.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Chamado Aberto!',
        text: 'Seu chamado foi registrado e nossa equipe já foi notificada.',
        confirmButtonColor: '#ea580c'
      });
      closeSupportModal();
      carregarChamados();
    } else {
      const err = await res.json();
      Swal.fire({
        icon: 'error',
        title: 'Erro ao abrir chamado',
        text: err.detail || 'Não foi possível registrar sua solicitação no momento.'
      });
    }
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Erro de conexão',
      text: 'Verifique sua internet e tente novamente.'
    });
  } finally {
    btn.disabled = false;
    btn.textContent = "Abrir Chamado";
  }
}

async function carregarChamados() {
  try {
    const res = await fetch("/api/suporte/chamados", { credentials: "include" });
    if (res.ok) {
      const tickets = await res.json();
      renderizarChamados(tickets);
    }
  } catch (e) {
    console.error("Erro ao carregar chamados:", e);
  }
}

function renderizarChamados(tickets) {
  const list = document.getElementById("ticketsList");
  const statAbertos = document.getElementById("stat-tickets-abertos");
  const statResolvidos = document.getElementById("stat-tickets-resolvidos");
  const statTotal = document.getElementById("stat-tickets-total");

  if (!list) return;

  if (!tickets || tickets.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #64748b;">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">💬</span>
        <p>Nenhum chamado aberto ainda. Nossa equipe está pronta para te ajudar!</p>
        <button class="btn-orange-small" style="margin-top: 16px;" onclick="openSupportModal()">Abrir primeiro chamado</button>
      </div>
    `;
    if (statAbertos) statAbertos.textContent = "0";
    if (statResolvidos) statResolvidos.textContent = "0";
    if (statTotal) statTotal.textContent = "0";
    return;
  }

  let abertos = 0;
  let resolvidos = 0;

  const html = tickets.map(t => {
    if (t.status === "RESOLVIDO") resolvidos++;
    else if (t.status !== "CANCELADO") abertos++;

    const statusCls = t.status === "ABERTO" ? "status-analise" : t.status === "RESOLVIDO" ? "status-aprovado" : "status-reprovado";
    const priorityColor = t.priority === "Urgente" ? "#ef4444" : t.priority === "Alta" ? "#f97316" : "#64748b";

    return `
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <span style="font-size: 11px; text-transform: uppercase; color: ${priorityColor}; font-weight: 800;">${t.priority} • ${t.category}</span>
            <h5 style="margin: 4px 0; font-size: 15px; color: #0f172a;">${t.title}</h5>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${t.status === "ABERTO" ? `
              <button onclick="cancelarChamado(${t.id})" style="background: none; border: 1px solid #cbd5e1; color: #64748b; font-size: 10px; padding: 2px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#ef4444'; this.style.color='#ef4444'" onmouseout="this.style.borderColor='#cbd5e1'; this.style.color='#64748b'">Cancelar</button>
            ` : ''}
            <span class="local-status ${statusCls}" style="font-size: 11px; padding: 2px 8px;">${t.status}</span>
          </div>
        </div>
        <p style="font-size: 13px; color: #475569; margin: 0;">${t.description}</p>
        
        ${t.admin_response ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #ea580c; border-radius: 8px; padding: 12px; margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #ea580c; margin-bottom: 4px;">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
               Resposta da Equipe
            </div>
            <p style="font-size: 13px; color: #334155; margin: 0; line-height: 1.4;">${t.admin_response}</p>
          </div>
        ` : ''}

        <div style="margin-top: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
           <span>Aberto em: ${new Date(t.created_at).toLocaleString('pt-BR')}</span>
           <span>ID: #${t.id}</span>
        </div>
      </div>
    `;
  }).join("");

  list.innerHTML = html;
  if (statAbertos) statAbertos.textContent = abertos;
  if (statResolvidos) statResolvidos.textContent = resolvidos;
  if (statTotal) statTotal.textContent = tickets.length;
}

async function cancelarChamado(id) {
  const result = await Swal.fire({
    title: 'Cancelar chamado?',
    text: "Esta ação não pode ser desfeita.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sim, cancelar!',
    cancelButtonText: 'Manter aberto'
  });

  if (result.isConfirmed) {
    try {
      const res = await fetch(`/api/suporte/chamados/${id}/cancelar`, {
        method: "POST",
        credentials: "include"
      });

      if (res.ok) {
        Swal.fire(
          'Cancelado!',
          'Seu chamado foi encerrado com sucesso.',
          'success'
        );
        carregarChamados();
      } else {
        const err = await res.json();
        Swal.fire('Erro', err.detail || 'Não foi possível cancelar.', 'error');
      }
    } catch (e) {
      Swal.fire('Erro', 'Falha na conexão.', 'error');
    }
  }
}

// ---------------------------
// Central de Notificações 🔔
// ---------------------------
const btnNotif = document.getElementById("btnNotifications");
const dropdownNotif = document.getElementById("notifDropdown");
const notifList = document.getElementById("notifList");
const notifDot = document.getElementById("notifDot");
const notifCount = document.getElementById("notifCount");

if (btnNotif) {
  btnNotif.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = dropdownNotif.style.display === "block";
    dropdownNotif.style.display = isVisible ? "none" : "block";
    if (!isVisible) carregarNotificacoes();
  });
}

document.addEventListener("click", () => {
  if (dropdownNotif) dropdownNotif.style.display = "none";
});

if (dropdownNotif) {
  dropdownNotif.addEventListener("click", (e) => e.stopPropagation());
}

async function carregarNotificacoes() {
  try {
    // Vamos usar os chamados como fonte de notificações por enquanto
    const tickets = await apiFetch("/api/suporte/chamados");
    const respondidos = tickets.filter(t => t.admin_response && t.status !== "CANCELADO");
    
    // Atualizar Badge
    if (respondidos.length > 0) {
      notifDot.style.display = "block";
      notifCount.style.display = "block";
      notifCount.textContent = respondidos.length;
    } else {
      notifDot.style.display = "none";
      notifCount.style.display = "none";
    }

    if (!notifList) return;

    if (respondidos.length === 0) {
      notifList.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px;">
          Nenhuma nova notificação.
        </div>
      `;
      return;
    }

    notifList.innerHTML = respondidos.map(t => `
      <div class="notif-item" onclick="switchToSection('suporte'); carregarChamados();">
        <div class="notif-icon-circle" style="background: #fff7ed; color: #ea580c;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <div class="notif-content">
          <span class="notif-title">Resposta no chamado #${t.id}</span>
          <span class="notif-text">A equipe enviou uma devolutiva sobre: "${t.title}"</span>
          <span class="notif-time">${new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    `).join("");

  } catch (e) {
    console.error("Erro ao carregar notificações:", e);
  }
}

// Chamar uma vez no início para atualizar o badge
carregarNotificacoes();
setInterval(carregarNotificacoes, 60000); // Atualiza a cada 1 minuto

// Inicialização
function switchToSection(target) {
  // Já existe uma função similar provavelmente, mas vou garantir o acesso global
  const items = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".dash-section");
  
  items.forEach(i => {
    if (i.getAttribute("data-target") === target) i.click();
  });
}

