// frontend/public/js/admin-dashboard.js
import { apiFetch, requireAdmin } from "./auth.js";

const VJ_API_BASE = (function() {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || !window.location.hostname;
  return isLocal ? "http://127.0.0.1:8000" : "https://venha-junto-h54n.onrender.com";
})();
console.log("[Dashboard] VJ_API_BASE:", VJ_API_BASE);

(function () {
  const listEl = document.getElementById("list");
  const statusFilter = document.getElementById("statusFilter");
  const searchInput = document.getElementById("searchInput");
  const btnReload = document.getElementById("btnReload");
  const toastEl = document.getElementById("toast");

  const adminNomeEl = document.getElementById("adminNome");
  const adminEmailEl = document.getElementById("adminEmail");

  // ---------------------------
  // Toast
  // ---------------------------
  let toastTimer = null;
  function toast(msg, type = "info") {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = msg;

    if (type === "error") toastEl.style.background = "#b91c1c";
    else toastEl.style.background = "#111827";

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2500);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------
  // API (REAL)
  // ---------------------------
  async function apiAdminPing() {
    return apiFetch("/auth/me");
  }

  async function apiListPlaces(status) {
    return apiFetch(`/api/admin/estabelecimentos?status=${status}`);
  }

  async function apiApprove(placeId) {
    return apiFetch(`/api/admin/estabelecimentos/${placeId}/approve`, {
      method: "POST"
    });
  }

  async function apiReject(placeId) {
    return apiFetch(`/api/admin/estabelecimentos/${placeId}/reject`, {
      method: "POST"
    });
  }

  // ---------------------------
  // UI rendering
  // ---------------------------
  function getStatusBadge(status) {
    switch (status) {
      case 'PENDING_REVIEW': return '<span class="badge pending">Em Análise</span>';
      case 'APPROVED': return '<span class="badge approved">Aprovado</span>';
      case 'REJECTED': return '<span class="badge rejected">Reprovado</span>';
      default: return `<span class="badge" style="background: #e2e8f0; color: #475569;">${status}</span>`;
    }
  }

  function formatAcessibilidade(raw) {
    if (!raw) return "Nenhum";
    const map = {
      rampa: "Rampa de acesso",
      banheiro: "Banheiro adaptado",
      piso_tatil: "Piso tátil",
      elevador: "Elevador",
      estacionamento: "Estacionamento PCD",
      libras: "Intérprete de Libras",
      cardapio_braille: "Cardápio em Braille",
      cadeira_rodas: "Cadeira de rodas",
      entrada_acessivel: "Entrada acessível",
      sinalizacao_braille: "Sinalização em Braille",
      atendimento_prioritario: "Atendimento prioritário",
      vaga_embarque: "Vaga PCD"
    };
    return raw.split(",")
      .map(v => map[v.trim()] || v.trim())
      .join(", ");
  }

  function makeCard(p) {
    const id = p.id;
    const nome = escapeHtml(p.nome || "(sem nome)");
    const tipo = escapeHtml(p.tipo || "-");
    const cidade = escapeHtml(p.cidade || "-");
    const bairro = escapeHtml(p.bairro || "-");
    const statusHtml = getStatusBadge(p.status || "-");
    
    // Formata Data
    let createdAt = "-";
    if (p.created_at) {
      const d = new Date(p.created_at);
      createdAt = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    }

    const plan = escapeHtml(p.plano_escolhido || "Básico");
    const telefone = escapeHtml(p.telefone_responsavel || "Não informado");
    const cnpj = escapeHtml(p.cnpj_cpf || "Não informado");
    const descricao = escapeHtml(p.descricao || "Sem descrição");
    const acess = escapeHtml(formatAcessibilidade(p.recursos_acessibilidade));

    const canApprove = p.status === "PENDING_REVIEW";
    const canReject = p.status === "PENDING_REVIEW";

    // Gera o HTML das imagens
    let fotosHtml = '';
    
    // Foto de Perfil
    if (p.foto_perfil) {
      const url = `${VJ_API_BASE}/api/estabelecimentos/fotos/${p.foto_perfil}`;
      fotosHtml += `
        <div class="gallery-item-wrapper">
          <img src="${escapeHtml(url)}" class="admin-gallery-img" alt="Principal" title="Foto Principal">
          <span class="gallery-label">Principal</span>
        </div>`;
    }
    
    // Galeria
    if (p.fotos_galeria) {
      const galeria = p.fotos_galeria.split(",").filter(x => x.trim() !== "");
      galeria.forEach(filename => {
        const url = `${VJ_API_BASE}/api/estabelecimentos/fotos/${filename.trim()}`;
        fotosHtml += `
          <div class="gallery-item-wrapper">
            <img src="${escapeHtml(url)}" class="admin-gallery-img" alt="Galeria">
          </div>`;
      });
    }

    if (!fotosHtml) {
      fotosHtml = '<p style="color: #94a3b8; font-size: 13px; font-style: italic; margin:0;">Nenhuma foto enviada</p>';
    }

    const div = document.createElement("div");
    div.className = "admin-card";

    div.innerHTML = `
      <div class="admin-card-header">
        <div>
          <h3 class="admin-card-title">#${id} • ${nome}</h3>
          <p class="admin-card-subtitle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${cidade} - ${bairro}
          </p>
        </div>
        ${statusHtml}
      </div>

      <div class="admin-card-grid">
        <div class="grid-item">
          <strong>Tipo</strong>
          <span>${tipo}</span>
        </div>
        <div class="grid-item">
          <strong>Solicitação</strong>
          <span>${createdAt}</span>
        </div>
        <div class="grid-item">
          <strong>Telefone Comercial</strong>
          <span>${telefone}</span>
        </div>
        <div class="grid-item">
          <strong>CNPJ/CPF</strong>
          <span>${cnpj}</span>
        </div>
        <div class="grid-item" style="grid-column: 1 / -1;">
          <strong>Recursos de Acessibilidade</strong>
          <span style="color: #0b57d0">${acess}</span>
        </div>
      </div>
      
      <div class="admin-details-row">
        <strong>Sobre o Estabelecimento:</strong>
        <p>${descricao}</p>
      </div>

      <div class="admin-details-row">
        <strong>Plano Selecionado:</strong>
        <p style="font-weight: 700; color: #eab308; display: flex; align-items: center; gap: 4px;">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
           ${plan}
        </p>
      </div>

      <div class="admin-details-row">
        <strong>Galeria de Fotos:</strong>
        <div class="admin-card-gallery">
          ${fotosHtml}
        </div>
      </div>

      <div class="admin-card-actions">
        <button class="btn-reject" type="button" data-act="reject" ${canReject ? "" : "disabled"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Recusar Cadastro
        </button>
        <button class="btn-approve" type="button" data-act="approve" ${canApprove ? "" : "disabled"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Aprovar Cadastro
        </button>
      </div>
    `;

    const btnApprove = div.querySelector('[data-act="approve"]');
    const btnReject = div.querySelector('[data-act="reject"]');

    if (btnApprove) {
      btnApprove.addEventListener("click", async () => {
        try {
          btnApprove.disabled = true;
          toast(`Aprovando #${id}...`);
          await apiApprove(id);
          toast(`✅ Aprovado #${id}`, "success");
          await load();
        } catch (e) {
          toast(`❌ ${e.message}`, "error");
          btnApprove.disabled = false;
        }
      });
    }

    if (btnReject) {
      btnReject.addEventListener("click", async () => {
        try {
          btnReject.disabled = true;
          toast(`Reprovando #${id}...`);
          await apiReject(id);
          toast(`✅ Reprovado #${id}`, "success");
          await load();
        } catch (e) {
          toast(`❌ ${e.message}`, "error");
          btnReject.disabled = false;
        }
      });
    }

    return div;
  }

  function renderEmpty(text) {
    listEl.innerHTML = `<div class="empty">${escapeHtml(text)}</div>`;
  }

  function applySearchFilter(items) {
    const term = (searchInput?.value || "").trim().toLowerCase();
    if (!term) return items;

    return items.filter((p) => {
      const nome = String(p.nome || "").toLowerCase();
      const cidade = String(p.cidade || "").toLowerCase();
      const bairro = String(p.bairro || "").toLowerCase();
      return nome.includes(term) || cidade.includes(term) || bairro.includes(term);
    });
  }

  // ---------------------------
  // Main load
  // ---------------------------
  async function load() {
    if (!listEl) return;

    btnReload && (btnReload.disabled = true);
    renderEmpty("Carregando...");

    try {
      // ✅ 0) REAL: Exige auth real
      const admin = await requireAdmin();
      if (!admin) return;

      if (adminNomeEl) adminNomeEl.textContent = admin.nome || "Admin";
      if (adminEmailEl) adminEmailEl.textContent = admin.email || "-";

      // ✅ 1) ping admin
      await apiAdminPing();

      // ✅ 2) lista por status
      const status = statusFilter?.value || "PENDING_REVIEW";
      const items = await apiListPlaces(status);

      // ✅ 3) aplica busca
      const filtered = applySearchFilter(items);

      if (!filtered || filtered.length === 0) {
        renderEmpty("Nenhum estabelecimento encontrado para esse filtro.");
        btnReload && (btnReload.disabled = false);
        return;
      }

      // ✅ 4) renderiza
      listEl.innerHTML = "";
      filtered.forEach((p) => listEl.appendChild(makeCard(p)));

      btnReload && (btnReload.disabled = false);
    } catch (e) {
      btnReload && (btnReload.disabled = false);

      renderEmpty(
        `Erro: ${e.message}\n\nDica: confirme se seu usuário tem role=admin e faça login novamente.`
      );
      toast(`❌ ${e.message}`, "error");
    }
  }

  // ---------------------------
  // Events
  // ---------------------------
  btnReload && btnReload.addEventListener("click", load);
  statusFilter && statusFilter.addEventListener("change", load);
  searchInput && searchInput.addEventListener("input", load);

  // start
  load();
})();
