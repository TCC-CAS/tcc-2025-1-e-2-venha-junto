// frontend/public/js/admin-dashboard.js
import { apiFetch, requireAdmin } from "./auth.js";

const VJ_API_BASE = (function() {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || !window.location.hostname;
  return isLocal ? "" : "";
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
  
  // Partners View Elements
  const fullPartnersList = document.getElementById("full-partners-list");

  // Support View Elements 🎧
  const fullSupportList = document.getElementById("full-support-list");
  const btnReloadSupportList = document.getElementById("btnReloadSupportList");
  const badgeSupport = document.getElementById("badgeSupport");

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
    if (target === "locais") loadLocais();
    if (target === "support") loadSupport();
    if (target === "denuncias") loadDenuncias();
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

  async function apiListSupport() {
    return apiFetch(`/api/admin/suporte/chamados`);
  }

  async function apiUpdateSupportStatus(id, status) {
    return apiFetch(`/api/admin/suporte/chamados/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }

  async function apiSuspendPartner(id, reason, obs) {
    return apiFetch(`/api/admin/parceiros/${id}/suspend`, { 
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({reason, observation: obs}) 
    });
  }

  async function apiReactivatePartner(id) {
    return apiFetch(`/api/admin/parceiros/${id}/reactivate`, { 
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}) 
    });
  }

  async function apiSuspendLocal(id, reason, obs) {
    return apiFetch(`/api/admin/estabelecimentos/${id}/suspend`, { 
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({reason, observation: obs}) 
    });
  }

  async function apiReactivateLocal(id) {
    return apiFetch(`/api/admin/estabelecimentos/${id}/reactivate`, { 
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}) 
    });
  }

  async function apiGetAuditLogs() {
    return apiFetch(`/api/admin/audit-logs`);
  }

  async function apiGetDenuncias() {
    return apiFetch(`/api/admin/denuncias`);
  }

  async function apiUpdateDenunciaStatus(id, status, resposta_admin) {
    const body = { status };
    if (resposta_admin !== undefined) body.resposta_admin = resposta_admin;
    return apiFetch(`/api/admin/denuncias/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
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
        labels: ['Básico', 'Pro', 'Premium'],
        datasets: [{
          data: [
            stats.planos_distribuicao ? stats.planos_distribuicao.basico : 0, 
            stats.planos_distribuicao ? stats.planos_distribuicao.pro : 0, 
            stats.planos_distribuicao ? stats.planos_distribuicao.premium : 0
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
                <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-right: 8px;">
                  ${p.status}
                </span>
                ${p.status === 'ATIVO' 
                  ? `<button class="btn-action btn-reject" onclick="handleSuspendPartner(${p.id})">Suspender</button>`
                  : `<button class="btn-action btn-approve" onclick="handleReactivatePartner(${p.id})">Reativar</button>`
                }
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

    window.handleSuspendPartner = async (id) => {
      const { value: formValues } = await Swal.fire({
        title: '<h3 style="color:#0f172a; font-weight:800; margin:0; display:flex; align-items:center; justify-content:center; gap:8px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Suspender Parceiro</h3>',
        html: `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: left; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #991b1b; margin: 0 0 8px 0; font-weight: 700;">Ao suspender este parceiro:</p>
            <ul style="font-size: 13px; color: #991b1b; margin: 0; padding-left: 16px; line-height: 1.5;">
              <li>Todos os locais sairão do ar (invisíveis ao público).</li>
              <li>O acesso dele ao painel ficará <strong>restrito</strong> (só poderá abrir chamado de suporte).</li>
              <li>As cobranças do plano ativo serão <strong>pausadas</strong>.</li>
            </ul>
          </div>
          <div style="text-align: left; margin-bottom: 8px; font-weight: 700; font-size: 13px; color: #1e293b;">Motivo da Suspensão:</div>
          <select id="swal-reason" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; margin-bottom: 16px; font-family: inherit; font-size: 14px; background: #f8fafc; color: #0f172a;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#cbd5e1'">
            <option value="Violação dos Termos de Uso">Violação dos Termos de Uso</option>
            <option value="Inadimplência">Inadimplência de Pagamento</option>
            <option value="Informações falsas">Uso de Informações Falsas</option>
            <option value="Reclamações recorrentes">Reclamações recorrentes</option>
            <option value="Conteúdo inadequado">Conteúdo inadequado (Fotos/Textos)</option>
            <option value="Outro">Outro Motivo</option>
          </select>
          <div style="text-align: left; margin-bottom: 8px; font-weight: 700; font-size: 13px; color: #1e293b;">Observação (visível para o parceiro):</div>
          <textarea id="swal-obs" placeholder="Detalhe o motivo para o parceiro entender a punição..." style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; min-height: 80px; font-family: inherit; resize: none; font-size: 14px; background: #f8fafc; color: #0f172a;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Confirmar Suspensão',
        cancelButtonText: 'Cancelar',
        width: '500px',
        preConfirm: () => {
          return {
            reason: document.getElementById('swal-reason').value,
            obs: document.getElementById('swal-obs').value
          }
        }
      });

      if (formValues) {
        try {
          await apiSuspendPartner(id, formValues.reason, formValues.obs);
          Swal.fire('Suspenso', 'O parceiro e seus locais foram suspensos.', 'success');
          loadPartners();
          loadStats();
        } catch (e) {
          Swal.fire('Erro', e.message, 'error');
        }
      }
    };

    window.handleReactivatePartner = async (id) => {
      const result = await Swal.fire({
        title: 'Reativar Parceiro?',
        text: "Os locais vinculados também poderão ficar visíveis novamente.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Sim, reativar!'
      });

      if (result.isConfirmed) {
        try {
          await apiReactivatePartner(id);
          Swal.fire('Reativado', 'O parceiro foi reativado.', 'success');
          loadPartners();
          loadStats();
        } catch (e) {
          Swal.fire('Erro', e.message, 'error');
        }
      }
    };

  // ---------------------------
  // Support 🎧
  // ---------------------------
  async function loadSupport() {
    try {
      const tickets = await apiListSupport();
      renderSupport(tickets);
    } catch (e) {
      console.error("Erro ao carregar suporte:", e);
    }
  }

  function renderSupport(tickets) {
    if (!fullSupportList) return;
    if (!tickets || tickets.length === 0) {
      fullSupportList.innerHTML = `<div class="empty-state"><h3>Nenhum chamado encontrado</h3><p>Não há solicitações de parceiros no momento.</p></div>`;
      badgeSupport.style.display = "none";
      return;
    }

    let openCount = 0;
    const html = tickets.map(t => {
      if (t.status === "ABERTO" || t.status === "EM_ANDAMENTO") openCount++;
      
      const statusCls = t.status === "ABERTO" ? "badge-pending" : t.status === "RESOLVIDO" ? "badge-approved" : "badge-rejected";
      
      let priorityColor = "#64748b";
      if (t.priority === "Urgente") priorityColor = "#ef4444";
      else if (t.priority === "Alta") priorityColor = "#f97316";

      return `
        <div class="admin-card" style="margin-bottom: 16px;">
          <div class="admin-card-info">
            <div class="admin-entity-details" style="width: 100%;">
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                <span class="item-badge ${statusCls}" style="font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">${t.status}</span>
                <span style="font-size: 11px; font-weight: 800; color: ${priorityColor}; text-transform: uppercase;">${t.priority}</span>
                <span style="font-size: 12px; color: var(--admin-text-secondary); margin-left: auto;">${t.category}</span>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: var(--admin-text-primary);">${t.title}</h3>
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; line-height: 1.5;">${t.description}</p>
              
              ${t.admin_response ? `
                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
                  <strong style="font-size: 12px; color: #166534; display: block; margin-bottom: 4px;">Sua Resposta:</strong>
                  <p style="font-size: 13px; color: #166534; margin: 0;">${t.admin_response}</p>
                </div>
              ` : ''}

              <div style="font-size: 12px; color: var(--admin-text-secondary); display: flex; gap: 16px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                 <span>👤 <strong>${t.partner_nome}</strong> (${t.partner_email})</span>
                 <span>📅 ${new Date(t.created_at).toLocaleString('pt-BR')}</span>
                 <span>ID: #${t.id}</span>
              </div>
            </div>
          </div>
          <div class="admin-card-actions" style="margin-top: 16px; border-top: 1px dashed #e2e8f0; padding-top: 16px; display: flex; gap: 8px;">
            ${t.status !== 'RESOLVIDO' ? `
              <button class="btn-action btn-approve" onclick="updateTicketStatus(${t.id}, 'RESOLVIDO')">Marcar como Resolvido</button>
              ${t.status === 'ABERTO' ? `
                <button class="btn-action btn-details" onclick="updateTicketStatus(${t.id}, 'EM_ANDAMENTO')">Atender Chamado</button>
              ` : ''}
            ` : '<span style="color: #10b981; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 4px;">✅ Resolvido</span>'}
          </div>
        </div>
      `;
    }).join("");

    fullSupportList.innerHTML = html;
    if (openCount > 0) {
      badgeSupport.textContent = openCount;
      badgeSupport.style.display = "flex";
    } else {
      badgeSupport.style.display = "none";
    }
  }

  window.updateTicketStatus = async (id, status) => {
    try {
      let admin_response = null;

      if (status === 'RESOLVIDO' || status === 'EM_ANDAMENTO') {
        const { value: text } = await Swal.fire({
          title: 'Enviar resposta ao parceiro?',
          input: 'textarea',
          inputLabel: 'Sua mensagem (opcional)',
          inputPlaceholder: 'Digite aqui as orientações ou resposta para o parceiro...',
          showCancelButton: true,
          confirmButtonText: 'Confirmar e Enviar',
          cancelButtonText: 'Apenas mudar status',
          confirmButtonColor: '#ea580c'
        });
        
        if (text) admin_response = text;
      }

      await apiUpdateSupportStatus(id, { status, admin_response });
      loadSupport();
      showToast(`Chamado #${id} atualizado com sucesso!`);
    } catch (e) {
      console.error(e);
      showToast("Erro ao atualizar chamado", "error");
    }
  };

  async function apiUpdateSupportStatus(id, data) {
    return apiFetch(`/api/admin/suporte/chamados/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }

  function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = type === "error" ? "#ef4444" : "#10b981";
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 3000);
  }

  // ---------------------------
  // Locais Logic
  // ---------------------------
  async function loadLocais() {
    const list = document.getElementById("full-locais-list");
    if (!list) return;
    list.innerHTML = '<div style="padding: 40px; text-align: center;">Carregando...</div>';

    try {
      const items = await apiListPlaces('ALL'); // Backend must handle 'ALL'
      list.innerHTML = "";

      if (items.length === 0) {
        list.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--admin-text-secondary);">Nenhum local encontrado.</div>';
        return;
      }

      items.forEach(p => {
        let badgeColor = p.status === 'APPROVED' ? '#10b981' : (p.status === 'SUSPENDED' ? '#ef4444' : '#f59e0b');
        let badgeBg = p.status === 'APPROVED' ? '#dcfce7' : (p.status === 'SUSPENDED' ? '#fee2e2' : '#fef3c7');

        const card = document.createElement("div");
        card.className = "admin-card";
        card.innerHTML = `
          <div class="admin-card-info">
            <img src="${p.foto_perfil ? VJ_API_BASE + '/api/estabelecimentos/fotos/' + p.foto_perfil : '../img/placeholder.png'}" class="admin-entity-img">
            <div class="admin-entity-details">
              <h3>${p.nome}</h3>
              <p>${p.tipo} • ${p.cidade}</p>
              <p style="margin-top:4px;font-size:12px;color:var(--admin-text-secondary);">Cadastrado em: ${new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
          <div class="admin-card-actions">
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-right: 8px;">
              ${p.status}
            </span>
            ${p.status === 'APPROVED' || p.status === 'PENDING_REVIEW'
              ? `<button class="btn-action btn-reject" onclick="handleSuspendLocal(${p.id})">Suspender</button>`
              : `<button class="btn-action btn-approve" onclick="handleReactivateLocal(${p.id})">Reativar</button>`
            }
            <button class="btn-action btn-details" onclick="window.open('./local-detalhes.html?id=${p.id}', '_blank')">Detalhes</button>
          </div>
        `;
        list.appendChild(card);
      });
    } catch (e) {
      console.error(e);
      list.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--admin-danger);">Erro: ${e.message}</div>`;
    }
  }

  window.handleSuspendLocal = async (id) => {
    const { value: formValues } = await Swal.fire({
      title: '<h3 style="color:#0f172a; font-weight:800; margin:0; display:flex; align-items:center; justify-content:center; gap:8px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Suspender Local</h3>',
      html: `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; text-align: left; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #92400e; margin: 0;"><strong>Atenção:</strong> Ao suspender este local, ele sairá do ar imediatamente, mas o parceiro ainda terá acesso ao sistema e aos outros locais dele.</p>
        </div>
        <div style="text-align: left; margin-bottom: 8px; font-weight: 700; font-size: 13px; color: #1e293b;">Motivo da Suspensão:</div>
        <select id="swal-reason-loc" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; margin-bottom: 16px; font-family: inherit; font-size: 14px; background: #f8fafc; color: #0f172a;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#cbd5e1'">
          <option value="Informações incorretas">Informações incorretas / falsas</option>
          <option value="Falta de acessibilidade">Acessibilidade Inexistente (Fraude)</option>
          <option value="Reclamações recorrentes">Reclamações recorrentes</option>
          <option value="Conteúdo inadequado">Fotos ou Conteúdo inadequado</option>
          <option value="Violação dos Termos de Uso">Violação dos Termos de Uso</option>
          <option value="Outro">Outro</option>
        </select>
        <div style="text-align: left; margin-bottom: 8px; font-weight: 700; font-size: 13px; color: #1e293b;">Observação (visível para o parceiro):</div>
        <textarea id="swal-obs-loc" placeholder="Detalhe por que o local foi suspenso..." style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; min-height: 80px; font-family: inherit; resize: none; font-size: 14px; background: #f8fafc; color: #0f172a;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Suspender Local',
      cancelButtonText: 'Cancelar',
      width: '500px',
      preConfirm: () => {
        return {
          reason: document.getElementById('swal-reason-loc').value,
          obs: document.getElementById('swal-obs-loc').value
        }
      }
    });

    if (formValues) {
      try {
        await apiSuspendLocal(id, formValues.reason, formValues.obs);
        Swal.fire('Suspenso', 'O estabelecimento foi suspenso.', 'success');
        loadLocais();
        loadStats();
      } catch (e) {
        Swal.fire('Erro', e.message, 'error');
      }
    }
  };

  window.handleReactivateLocal = async (id) => {
    const result = await Swal.fire({
      title: 'Reativar Local?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Sim, reativar!'
    });

    if (result.isConfirmed) {
      try {
        await apiReactivateLocal(id);
        Swal.fire('Reativado', 'O estabelecimento foi reativado.', 'success');
        loadLocais();
        loadStats();
      } catch (e) {
        Swal.fire('Erro', e.message, 'error');
      }
    }
  };

  // ---------------------------
  // Denúncias Logic
  // ---------------------------
  async function loadDenuncias() {
    try {
      const denuncias = await apiGetDenuncias();
      const listDiv = document.getElementById("full-denuncias-list");
      if (!listDiv) return;

      const badge = document.getElementById("badgeDenuncias");
      const pendentes = denuncias.filter(d => d.status === "ABERTO").length;
      if (badge) {
        badge.textContent = pendentes;
        badge.style.display = pendentes > 0 ? "flex" : "none";
      }

      if (!denuncias || denuncias.length === 0) {
        listDiv.innerHTML = '<div style="padding:16px; color:#64748b; text-align:center;">Nenhuma denúncia ou feedback recebido.</div>';
        return;
      }

      listDiv.innerHTML = denuncias.map(d => {
        let statusBadge = '';
        if (d.status === 'ABERTO') statusBadge = '<span style="font-size: 11px; padding: 4px 8px; border-radius: 6px; background:#fee2e2; color:#ef4444; font-weight: 700;">🚨 Aberto</span>';
        else if (d.status === 'EM ANÁLISE') statusBadge = '<span style="font-size: 11px; padding: 4px 8px; border-radius: 6px; background:#fef3c7; color:#d97706; font-weight: 700;">⏳ Em Análise</span>';
        else statusBadge = '<span style="font-size: 11px; padding: 4px 8px; border-radius: 6px; background:#dcfce7; color:#16a34a; font-weight: 700;">✅ Resolvido</span>';

        return `
          <div class="admin-card">
            <div class="admin-card-info" style="align-items: flex-start;">
              <div style="width: 48px; height: 48px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">
                💬
              </div>
              <div class="admin-entity-details" style="width: 100%;">
                <h3 style="display:flex; align-items:center; justify-content:space-between;">
                  ${d.categoria} 
                  ${statusBadge}
                </h3>
                <p style="margin-top: 4px;">Enviado por: <strong>${d.nome_usuario}</strong> (${d.email_usuario})</p>
                <p style="margin-top: 2px; font-size: 12px; color: #94a3b8;">Em: ${new Date(d.created_at).toLocaleString('pt-BR')}</p>
                ${d.estabelecimento_nome ? `<p style="color: #ea580c; font-weight: 600; margin-top: 4px;">📍 Local: ${d.estabelecimento_nome}</p>` : ''}
                
                <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; margin-top: 12px; font-size: 14px; color: #334155; line-height: 1.5; border-left: 4px solid #cbd5e1;">
                  "${d.mensagem}"
                </div>
                
                ${d.resposta_admin ? `
                <div style="background: #fffbeb; padding: 14px; border-radius: 8px; margin-top: 12px; font-size: 14px; color: #92400e; line-height: 1.5; border: 1px solid #fde68a;">
                  <strong>Resposta do Administrador:</strong><br>
                  ${d.resposta_admin}
                </div>
                ` : ''}
              </div>
            </div>

            <div class="admin-card-actions">
              ${d.status !== 'RESOLVIDO' ? `
                <button class="btn-action btn-approve" onclick="handleDenunciaStatus(${d.id}, 'RESOLVIDO')">✅ Marcar Resolvido</button>
              ` : ''}
              ${d.status === 'ABERTO' ? `
                <button class="btn-action btn-details" onclick="handleDenunciaStatus(${d.id}, 'EM ANÁLISE')">⏳ Em Análise</button>
              ` : ''}
              ${d.estabelecimento_id && d.status !== 'RESOLVIDO' ? `
                <button class="btn-action btn-reject" onclick="handleSuspendLocal(${d.estabelecimento_id}, 'Local suspenso via Denúncia do usuário')">🚫 Suspender Local</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch(err) {
      console.error(err);
      Swal.fire('Erro', 'Falha ao carregar chamados de contato', 'error');
    }
  }

  window.handleDenunciaStatus = async (id, status) => {
    try {
      const { value: resposta } = await Swal.fire({
        title: 'Atualizar Status',
        input: 'textarea',
        inputLabel: 'Resposta do Administrador (opcional)',
        inputPlaceholder: 'Digite uma nota de resolução ou registro interno...',
        showCancelButton: true,
        confirmButtonText: 'Atualizar',
        cancelButtonText: 'Cancelar'
      });

      if (resposta !== undefined) {
        await apiUpdateDenunciaStatus(id, status, resposta);
        Swal.fire({ title: 'Sucesso', text: 'Status atualizado com sucesso.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        loadDenuncias();
      }
    } catch(err) {
      Swal.fire('Erro', err.message || 'Falha ao atualizar', 'error');
    }
  };

  // ---------------------------
  // Config Logic
  // ---------------------------
  window.saveConfig = () => {
    Swal.fire('Sucesso!', 'Configurações da plataforma atualizadas.', 'success');
  };

  window.saveSecurity = () => {
    Swal.fire('Segurança', 'Senha administrativa atualizada com sucesso.', 'success');
    document.getElementById('securityForm').reset();
  };

  window.editAdminProfile = () => {
    Swal.fire({
      title: 'Editar Perfil',
      text: 'A funcionalidade de edição de perfil de administrador será disponibilizada em breve.',
      icon: 'info'
    });
  };

  // ---------------------------
  // Init
  // ---------------------------
  async function init() {
    const admin = await requireAdmin();
    if (!admin) return;

    document.getElementById("adminNome").textContent = admin.nome;
    
    // Setup Conta Administrativa Info
    const confNome = document.getElementById("config-admin-nome");
    if (confNome) confNome.textContent = admin.nome;
    
    const confEmail = document.getElementById("config-admin-email");
    if (confEmail) confEmail.textContent = admin.email;
    
    const confRole = document.getElementById("config-admin-role");
    if (confRole) confRole.textContent = admin.role === 'admin' ? 'Master Admin' : 'Administrador';

    // Se o backend não retorna created_at ou ultimo_acesso, mantemos os defaults do layout ou preenchemos genérico.
    const confCreated = document.getElementById("config-admin-created");
    if (confCreated && admin.created_at) confCreated.textContent = new Date(admin.created_at).toLocaleDateString('pt-BR');
    
    const confAcesso = document.getElementById("config-admin-acesso");
    if (confAcesso && admin.ultimo_acesso) confAcesso.textContent = new Date(admin.ultimo_acesso).toLocaleString('pt-BR');
    else if (confAcesso) confAcesso.textContent = new Date().toLocaleString('pt-BR'); // Mock current login time

    // Default view
    loadStats();
    
    btnReloadList.addEventListener("click", loadApprovals);
    filterStatus.addEventListener("change", loadApprovals);
    
    const btnReloadPartners = document.getElementById("btnReloadPartnersList");
    if(btnReloadPartners) btnReloadPartners.addEventListener("click", loadPartners);

    const btnReloadLocais = document.getElementById("btnReloadLocaisList");
    if(btnReloadLocais) btnReloadLocais.addEventListener("click", loadLocais);

    if(btnReloadSupportList) btnReloadSupportList.addEventListener("click", loadSupport);
    
    const btnReloadDenuncias = document.getElementById("btnReloadDenunciasList");
    if(btnReloadDenuncias) btnReloadDenuncias.addEventListener("click", loadDenuncias);
    
    btnLogout.addEventListener("click", () => {
      apiFetch("/api/usuarios/logout", { method: "POST" }).then(() => {
        window.location.href = "./admin-login.html";
      });
    });
  }

  init();
})();

