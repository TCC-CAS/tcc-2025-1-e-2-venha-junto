// frontend/public/js/admin-dashboard.js
import { apiFetch, requireAdmin } from "./auth.js";

const VJ_API_BASE = (function() {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || !window.location.hostname;
  return isLocal ? "http://127.0.0.1:8000" : "https://venha-junto-h54n.onrender.com";
})();

(function () {
  // Elements
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view-content");
  const btnLogout = document.getElementById("btnLogout");
  
  // Dashboard Elements
  const statPartners = document.getElementById("stat-partners");
  const statUsers = document.getElementById("stat-users");
  const statEstabs = document.getElementById("stat-estabs");
  const statRevenue = document.getElementById("stat-revenue");
  const statPending = document.getElementById("stat-pending");
  const badgeApprovals = document.getElementById("badgeApprovals");
  const miniPendingList = document.getElementById("mini-pending-list");
  
  // Approvals View Elements
  const fullApprovalsList = document.getElementById("full-approvals-list");
  const filterStatus = document.getElementById("filterStatus");
  const btnReloadList = document.getElementById("btnReloadList");

  let mainChart = null;
  let planChart = null;

  // ---------------------------
  // Navigation
  // ---------------------------
  function switchView(target) {
    views.forEach(v => v.style.display = "none");
    navItems.forEach(n => n.classList.remove("active"));
    
    const targetView = document.getElementById(`view-${target}`);
    if (targetView) targetView.style.display = "block";
    
    const targetNav = document.querySelector(`[data-target="${target}"]`);
    if (targetNav) targetNav.classList.add("active");

    if (target === "overview") loadStats();
    if (target === "approvals") loadApprovals();
    if (target === "partners") loadPartners();
  }

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");
      if (target) switchView(target);
    });
  });

  // ---------------------------
  // API Calls
  // ---------------------------
  async function apiGetStats() {
    return apiFetch("/api/admin/stats");
  }

  async function apiListPartners() {
    return apiFetch(`/api/admin/parceiros`);
  }

  async function apiListPlaces(status) {
    return apiFetch(`/api/admin/estabelecimentos?status=${status}`);
  }

  async function apiApprove(id) {
    return apiFetch(`/api/admin/estabelecimentos/${id}/approve`, { method: "POST" });
  }

  async function apiReject(id) {
    return apiFetch(`/api/admin/estabelecimentos/${id}/reject`, { method: "POST" });
  }

  async function apiConfirmDelete(id) {
    return apiFetch(`/api/admin/estabelecimentos/${id}/confirm-delete`, { method: "POST" });
  }

  async function apiAiVerify(id) {
    return apiFetch(`/api/admin/estabelecimentos/${id}/ai-verify`, { method: "POST" });
  }

  // ---------------------------
  // Stats & Charts
  // ---------------------------
  async function loadStats() {
    try {
      const stats = await apiGetStats();
      console.log("Stats carregados:", stats);
      
      // Update KPI Cards
      statPartners.textContent = stats.total_parceiros || 0;
      statUsers.textContent = stats.total_usuarios || 0;
      statEstabs.textContent = stats.total_estabelecimentos || 0;
      statRevenue.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.faturamento_estimado || 0);
      statPending.textContent = stats.pendentes_aprovacao || 0;
      
      // Update Sidebar Badge
      if (stats.pendentes_aprovacao > 0) {
        badgeApprovals.textContent = stats.pendentes_aprovacao;
        badgeApprovals.style.display = "flex";
      } else {
        badgeApprovals.style.display = "none";
      }

      // Tenta inicializar gráficos e repete se não estiverem visíveis
      const tryInitCharts = () => {
        if (initCharts(stats)) {
          console.log("Gráficos inicializados com sucesso.");
        } else {
          console.warn("Aguardando visibilidade para renderizar gráficos...");
          setTimeout(tryInitCharts, 500);
        }
      };
      
      tryInitCharts();
      loadMiniPending();
    } catch (e) {
      console.error("Erro ao carregar stats da API:", e);
      // Fallback para não deixar vazio em caso de erro 404/Conexão
      statPartners.textContent = "-";
      statEstabs.textContent = "-";
      statRevenue.textContent = "Erro API";
    }
  }

  function initCharts(stats) {
    const ctxMain = document.getElementById('mainChart');
    const ctxPlan = document.getElementById('planChart');

    if (!ctxMain || !ctxPlan) return false;
    if (ctxMain.offsetParent === null) return false; // Não visível ainda

    if (mainChart) mainChart.destroy();
    if (planChart) planChart.destroy();

    const canvasMain = ctxMain.getContext('2d');
    const gradient = canvasMain.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');

    // Chart de Acessos
    mainChart = new Chart(ctxMain, {
      type: 'line',
      data: {
        labels: stats.labels_7dias || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Acessos Únicos',
          data: stats.acessos_7dias || [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#f97316',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#f97316'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            displayColors: false
          }
        },
        scales: {
          y: { 
            grid: { color: 'rgba(226, 232, 240, 0.5)' }, 
            ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } },
            border: { display: false },
            beginAtZero: true
          },
          x: { 
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } }
          }
        }
      }
    });

    // Chart de Planos
    planChart = new Chart(ctxPlan, {
      type: 'doughnut',
      data: {
        labels: ['Básico', 'Pro', 'Pro Plus'],
        datasets: [{
          data: [
            stats.planos_distribuicao ? stats.planos_distribuicao.basico : 0, 
            stats.planos_distribuicao ? stats.planos_distribuicao.pro : 0, 
            stats.planos_distribuicao ? stats.planos_distribuicao.pro_plus : 0
          ],
          backgroundColor: ['#e2e8f0', '#f97316', '#10b981'],
          borderWidth: 6,
          borderColor: '#ffffff',
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { 
              usePointStyle: true, 
              padding: 25, 
              font: { size: 12, weight: '700' },
              color: '#64748b'
            } 
          }
        }
      }
    });
  }

  async function loadMiniPending() {
    try {
      const items = await apiListPlaces("PENDING_REVIEW");
      miniPendingList.innerHTML = "";
      
      if (items.length === 0) {
        miniPendingList.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--admin-text-secondary);">Tudo em dia!</div>';
        return;
      }

      items.slice(0, 3).forEach(p => {
        const item = document.createElement("div");
        item.className = "admin-card";
        item.innerHTML = `
          <div class="admin-card-info">
            <img src="${p.foto_perfil ? VJ_API_BASE + '/api/estabelecimentos/fotos/' + p.foto_perfil : '../img/placeholder.png'}" class="admin-entity-img">
            <div class="admin-entity-details">
              <h3>${p.nome}</h3>
              <p>${p.cidade}</p>
            </div>
          </div>
          <div class="admin-card-actions">
            <button class="btn-action btn-details" onclick="switchView('approvals')">Ver</button>
          </div>
        `;
        miniPendingList.appendChild(item);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // ---------------------------
  // Approvals View Logic
  // ---------------------------
  async function loadApprovals() {
    const status = filterStatus.value;
    fullApprovalsList.innerHTML = '<div style="padding: 40px; text-align: center;">Carregando...</div>';

    try {
      const items = await apiListPlaces(status);
      fullApprovalsList.innerHTML = "";

      if (items.length === 0) {
        fullApprovalsList.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--admin-text-secondary);">Nada encontrado.</div>';
        return;
      }

      items.forEach(p => {
        const d = new Date(p.created_at);
        const dateStr = d.toLocaleDateString("pt-BR");
        
        // Estilo AI Status
        let aiBadge = `<span class="badge-ai" style="background:#f1f5f9; color:#64748b;">Aguardando IA</span>`;
        if (p.ai_status === 'VERIFIED') {
          aiBadge = `<span class="badge-ai" style="background:#dcfce7; color:#15803d;">✨ IA: Aprovado (${Math.round(p.ai_score * 100)}%)</span>`;
        } else if (p.ai_status === 'REJECTED') {
          aiBadge = `<span class="badge-ai" style="background:#fee2e2; color:#b91c1c;">⚠️ IA: Risco (${Math.round(p.ai_score * 100)}%)</span>`;
        }

        const card = document.createElement("div");
        card.className = "admin-card";
        card.innerHTML = `
          <div class="admin-card-info">
            <img src="${p.foto_perfil ? VJ_API_BASE + '/api/estabelecimentos/fotos/' + p.foto_perfil : '../img/placeholder.png'}" class="admin-entity-img">
            <div class="admin-entity-details">
              <h3>${p.nome} <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #fef3c7; color: #92400e;">${p.plano_escolhido}</span></h3>
              <p>${p.bairro} - ${p.cidade}</p>
              <div style="margin-top:8px;">${aiBadge}</div>
            </div>
          </div>
          
          <div class="admin-card-metrics" style="gap:16px;">
            <div class="metric-item">
              <span class="metric-label">Vetting IA</span>
              <button class="btn-action btn-details" style="padding:4px 8px; font-size:10px;" data-id="${p.id}" data-act="ai-run">Rodar IA</button>
            </div>
          </div>

          <div class="admin-card-actions">
            ${status === 'PENDING_REVIEW' ? `
              <button class="btn-action btn-reject" data-id="${p.id}" data-act="reject">Recusar</button>
              <button class="btn-action btn-approve" data-id="${p.id}" data-act="approve">Aprovar Agora</button>
            ` : ''}
            <button class="btn-action btn-details" data-id="${p.id}" data-act="view">Detalhes</button>
          </div>
        `;
        fullApprovalsList.appendChild(card);
      });

      // Events for action buttons
      fullApprovalsList.querySelectorAll(".btn-action").forEach(btn => {
        btn.addEventListener("click", () => handleAction(btn));
      });

    } catch (e) {
      console.error(e);
      fullApprovalsList.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--admin-danger);">Erro: ${e.message}</div>`;
    }
  }

  async function handleAction(btn) {
    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");

    if (act === "ai-run") {
      Swal.fire({
        title: 'Analisando Local...',
        text: 'A IA está verificando os dados e fotos.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const result = await apiAiVerify(id);
        Swal.close();
        
        await Swal.fire({
          title: result.ai_status === 'VERIFIED' ? 'IA: Recomendado ✅' : 'IA: Alerta ⚠️',
          html: `<p><strong>Score:</strong> ${Math.round(result.ai_score * 100)}%</p><p>${result.ai_justification}</p>`,
          icon: result.ai_status === 'VERIFIED' ? 'success' : 'warning',
          confirmButtonText: 'Entendido'
        });
        
        loadApprovals();
      } catch (e) {
        Swal.fire('Erro na IA', e.message, 'error');
      }
      return;
    }

    if (act === "approve") {
      const result = await Swal.fire({
        title: 'Confirmar Aprovação?',
        text: "O estabelecimento ficará visível para todos os usuários.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sim, aprovar!',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        try {
          await apiApprove(id);
          Swal.fire('Aprovado!', 'O estabelecimento foi publicado.', 'success');
          loadApprovals();
          loadStats();
        } catch (e) {
          Swal.fire('Erro', e.message, 'error');
        }
      }
    }

    if (act === "reject") {
      const result = await Swal.fire({
        title: 'Recusar Cadastro?',
        text: "Informe o motivo se desejar (opcional).",
        input: 'text',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        try {
          await apiReject(id);
          Swal.fire('Recusado', 'O cadastro foi reprovado.', 'success');
          loadApprovals();
          loadStats();
        } catch (e) {
          Swal.fire('Erro', e.message, 'error');
        }
      }
    }

    if (act === "delete-forever") {
      const result = await Swal.fire({
        title: 'Excluir Permanentemente?',
        text: "Esta ação não pode ser desfeita!",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#7e22ce',
        confirmButtonText: 'Sim, excluir para sempre'
      });

      if (result.isConfirmed) {
        try {
          await apiConfirmDelete(id);
          Swal.fire('Excluído', 'Sumiu do mapa!', 'success');
          loadApprovals();
          loadStats();
        } catch (e) {
          Swal.fire('Erro', e.message, 'error');
        }
      }
    }

    if (act === "view") {
      // Simular visualização detalhada em um modal ou nova aba
      window.open(`./local-detalhes.html?id=${id}`, '_blank');
    }
  }

  // ---------------------------
  // Partners Logic
  // ---------------------------
  async function loadPartners() {
    const list = document.getElementById("full-partners-list");
    if (!list) return;

    list.innerHTML = `<div class="empty-state"><h3>Carregando parceiros...</h3></div>`;

    try {
      const data = await apiListPartners();
      
      if (!data || data.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            <h3>Nenhum Parceiro Encontrado</h3>
            <p>O sistema não possui nenhum parceiro cadastrado.</p>
          </div>
        `;
        return;
      }

      console.log(data);

      const html = data.map(p => {
        const badgeColor = p.status === 'ATIVO' ? '#10b981' : '#ef4444';
        const badgeBg = p.status === 'ATIVO' ? '#dcfce7' : '#fee2e2';

        return `
          <div class="admin-card" style="margin-bottom: 16px;">
            <div class="admin-card-info">
              <div style="width: 48px; height: 48px; min-width: 48px; border-radius: 8px; background: var(--admin-light); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: var(--admin-accent);">
                ${p.nome.charAt(0).toUpperCase()}
              </div>
              <div class="admin-entity-details" style="margin-left: 16px;">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: var(--admin-text-primary); display: flex; align-items: center; gap: 8px;">
                  ${p.nome}
                  <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #fef3c7; color: #92400e; font-weight: 700;">${p.plano}</span>
                </h3>
                <p style="margin: 0; font-size: 13px; color: var(--admin-text-secondary); display: flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  ${p.email}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 500; color: var(--admin-text-secondary);">
                  🏢 Administra: <strong>${p.qtde_estabelecimentos}</strong> local(is)
                </p>
              </div>
            </div>
            <div class="admin-card-actions">
              <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;">
                ${p.status}
              </span>
            </div>
          </div>
        `;
      }).join("");

      list.innerHTML = html;

    } catch (e) {
      console.error(e);
      list.innerHTML = `<div class="empty-state"><h3>Erro ao carregar parceiros</h3><p>${e.message}</p></div>`;
    }
  }

  // ---------------------------
  // Init
  // ---------------------------
  async function init() {
    const admin = await requireAdmin();
    if (!admin) return;

    document.getElementById("adminNome").textContent = admin.nome;
    
    // Default view
    loadStats();
    
    btnReloadList.addEventListener("click", loadApprovals);
    filterStatus.addEventListener("change", loadApprovals);
    
    const btnReloadPartners = document.getElementById("btnReloadPartnersList");
    if(btnReloadPartners) btnReloadPartners.addEventListener("click", loadPartners);
    
    btnLogout.addEventListener("click", () => {
      apiFetch("/api/usuarios/logout", { method: "POST" }).then(() => {
        window.location.href = "./admin-login.html";
      });
    });
  }

  init();
})();
