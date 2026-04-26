(function () {
  const API_BASE = window.VJ_API_BASE || (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:" ||
    !window.location.hostname
      ? `http://${window.location.hostname || "localhost"}:8000`
      : "https://venha-junto-h54n.onrender.com"
  );

  function qs(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getIcon(name, color = "currentColor", size = 18) {
    const icons = {
      location: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
      star: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
      accessibility: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="4" r="1"></circle><path d="m18 19 1-7-6 1"></path><path d="m5 8 3-3 5.5 2-2.36 3.5"></path><path d="M4.24 14.5a5 5 0 0 0 6.88 6"></path><path d="M13.76 17.5a5 5 0 0 0-6.88-6"></path></svg>`
    };
    return icons[name] || "";
  }

  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include", // Importante para enviar cookies de autenticação
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });

    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.detail || typeof data === "string" ? data : `HTTP ${res.status}`);
    }
    return data;
  }

  // ==== FAVORITOS ====
  let isFavorite = false;
  let heartBtn = null; // Container pro botão no hero image

  async function checkFavorite(id) {
    try {
      const ids = await apiFetch("/favorites/ids");
      isFavorite = ids.includes(String(id));
      updateFavUI();
    } catch (e) {
      console.warn("Usuário não logado ou sem favoritos:", e);
    }
  }

  async function toggleFavorite(id) {
    try {
      if (isFavorite) {
        await apiFetch(`/favorites/${id}`, { method: "DELETE" });
        isFavorite = false;
      } else {
        await apiFetch(`/favorites/${id}`, { method: "POST" });
        isFavorite = true;
      }
      updateFavUI();
    } catch (e) {
      if (window.VJ_openAuthModal) {
         window.VJ_openAuthModal(window.location.href);
      } else {
         alert("Erro ao favoritar. Você precisa estar logado.");
      }
    }
  }

  function updateFavUI() {
    if (!heartBtn) return;
    if (isFavorite) {
      heartBtn.classList.add("is-active");
    } else {
      heartBtn.classList.remove("is-active");
    }
  }

  // ==== RENDERIZAÇÕES ====
  function buildFeatures(featsStr) {
    const container = qs("features");
    if (!container) return;
    container.innerHTML = "";

    if (!featsStr) {
      container.innerHTML = "<p>Nenhum recurso de acessibilidade informado.</p>";
      return;
    }

    const accessibilityMap = {
      rampa: "Rampa de Acesso",
      banheiro: "Banheiro Adaptado",
      elevador: "Elevador",
      piso_tatil: "Piso Tátil",
      estacionamento: "Vaga para PCD"
    };

    const recursos = featsStr.split(",").filter(v => v.trim() !== "");
    if (recursos.length === 0) {
      container.innerHTML = "<p>Nenhum recurso informado.</p>";
      return;
    }

    recursos.forEach(feat => {
      const val = feat.trim();
      const div = document.createElement("div");
      div.className = "access-item";
      div.innerHTML = `
        <div class="access-item-icon">${getIcon("accessibility", "#166534", 16)}</div>
        <span>${accessibilityMap[val] || val}</span>
      `;
      container.appendChild(div);
    });
  }

  function renderGalleryCarousel(fotosStr, fotoPerfil) {
    const imgWrap = qs("imgWrap");
    if (!imgWrap) return;
    imgWrap.innerHTML = ""; // Limpa "Carregando"

    let imageUrls = [];
    if (fotoPerfil) {
      imageUrls.push(`${API_BASE}/api/estabelecimentos/fotos/${fotoPerfil}`);
    }
    if (fotosStr) {
      const extra = fotosStr.split(",").filter(v => v.trim());
      extra.forEach(foto => {
        if (foto.trim() !== fotoPerfil) {
          imageUrls.push(`${API_BASE}/api/estabelecimentos/fotos/${foto.trim()}`);
        }
      });
    }

    if (imageUrls.length > 0 && window.VJCarousel && window.VJCarousel.create) {
       const carousel = window.VJCarousel.create(imageUrls, "Fotos do Estabelecimento");
       carousel.style.width = "100%";
       carousel.style.height = "100%";
       imgWrap.appendChild(carousel);
    } else if (imageUrls.length > 0) {
       const img = document.createElement("img");
       img.src = imageUrls[0];
       img.alt = "Foto de Perfil do Local";
       imgWrap.appendChild(img);
    } else {
       imgWrap.innerHTML = '<div class="vj-hero__imgEmpty" style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-weight:600;">Sem imagens disponíveis</div>';
    }

    // Botão de Favoritar Overlay
    heartBtn = document.createElement("button");
    heartBtn.type = "button";
    heartBtn.className = "fav-btn";
    heartBtn.style.position = "absolute";
    heartBtn.style.top = "16px";
    heartBtn.style.right = "16px";
    heartBtn.style.zIndex = "10";
    heartBtn.innerHTML = `<span class="fav-icon">❤</span>`;
    imgWrap.appendChild(heartBtn);

    heartBtn.addEventListener("click", () => {
       const params = new URLSearchParams(window.location.search);
       const id = params.get("id");
       if (id) toggleFavorite(id);
    });
    
    // Esconder a galeria extra embaixo se a criamos em cima!
    const gallerySection = qs("gallerySection");
    if (gallerySection) gallerySection.style.display = "none";
  }

  // ==== CARREGAMENTO DE DADOS ====
  async function loadPlaceDetails(id) {
    try {
      const place = await apiFetch(`/public/places/${id}`);
      
      // Topo
      if (qs("nome")) qs("nome").textContent = place.nome;
      if (qs("enderecoTopo")) qs("enderecoTopo").textContent = `${place.bairro}, ${place.cidade}`;
      
      // Info Card
      if (qs("tipoBadge")) qs("tipoBadge").textContent = place.tipo || "Local";
      if (qs("verifiedBadge") && place.status === "APPROVED") {
        qs("verifiedBadge").style.display = "inline-flex";
      }
      if (qs("ratingAvg")) qs("ratingAvg").textContent = Number(place.avg_rating || 0).toFixed(1);
      
      if (qs("addressRua")) qs("addressRua").textContent = place.endereco || "Não informado";
      if (qs("telefoneLocal")) qs("telefoneLocal").textContent = place.telefone_local || place.whatsapp_local || "Não informado";
      if (qs("horarioLocal")) qs("horarioLocal").textContent = place.horario_funcionamento || "Horário livre/Padrão";

      // Sobre e Acessibilidade
      if (qs("descricao")) qs("descricao").textContent = place.descricao || "Sem detalhes adicionais fornecidos.";
      
      buildFeatures(place.recursos_acessibilidade);
      renderGalleryCarousel(place.fotos_galeria, place.foto_perfil);

      // Verificar Favorito Independente (Não bloqueia se o usuário não logou)
      checkFavorite(id);

    } catch (e) {
      console.error(e);
      document.body.innerHTML = `<div style="padding:40px;text-align:center;font-family:sans-serif;"><h2>Local não encontrado ou indisponível.</h2><p>${e.message}</p><a href="./explorar.html">Voltar para mapa</a></div>`;
    }
  }

  async function loadCoupons(id) {
    try {
      const cupons = await apiFetch(`/public/places/${id}/cupons`);
      if (cupons && cupons.length > 0) {
        // Exibir apenas o primeiro (ativo)
        const c = cupons[0];
        const sec = qs("cupomSection");
        if (sec) sec.style.display = "block";
        if (qs("cupomTitulo")) qs("cupomTitulo").textContent = escapeHtml(c.titulo);
        if (qs("cupomDescontoBadge")) qs("cupomDescontoBadge").textContent = c.tipo_desconto === "percentual" ? `${c.valor}% OFF` : `R$ ${c.valor} OFF`;
        if (qs("cupomDescricao")) qs("cupomDescricao").textContent = escapeHtml(c.descricao);
        
        const btnCode = qs("cupomCodigo");
        if (btnCode) {
           btnCode.textContent = escapeHtml(c.codigo);
           btnCode.addEventListener("click", () => {
             navigator.clipboard.writeText(c.codigo);
             const original = btnCode.textContent;
             btnCode.textContent = "COPIADO!";
             btnCode.style.background = "#dcfce7";
             setTimeout(() => {
               btnCode.textContent = original;
               btnCode.style.background = "#fff";
             }, 2000);
           });
        }
        if (qs("cupomValidade")) qs("cupomValidade").textContent = c.validade ? escapeHtml(c.validade) : "Tempo Indeterminado";
      }
    } catch (e) {
      console.warn("Erro ao carregar cupons", e);
    }
  }

  // ==== REVIEWS ====
  async function loadReviews(id) {
    const list = qs("reviewsList");
    if (!list) return;

    try {
      const revs = await apiFetch(`/public/places/${id}/reviews`);
      const empty = qs("emptyReviews");
      const title = qs("reviewsTitle");

      if (title) title.textContent = `Avaliações (${revs.length})`;

      if (revs.length === 0) {
        if (empty) empty.style.display = "block";
        // Limpa tudo menos os nós com os id do 'emptyState'
        Array.from(list.children).forEach(child => {
           if (child !== empty) child.remove();
        });
        return;
      }

      if (empty) empty.style.display = "none";
      list.innerHTML = "";

      revs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

      revs.forEach(r => {
        const d = new Date(r.created_at).toLocaleDateString("pt-BR");
        const starsHtml = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
        const nameFallback = r.usuario_nome || "Usuário Anônimo";
        const initial = nameFallback.charAt(0).toUpperCase();

        const item = document.createElement("div");
        item.className = "review-card";
        item.style = "border-bottom: 1px solid #f1f5f9; padding: 20px 0;";
        item.innerHTML = `
          <div style="display:flex; gap: 12px; margin-bottom: 12px; align-items:center;">
             <div style="width: 40px; height: 40px; border-radius: 50%; background: #e2e8f0; color: #475569; font-weight: bold; display: flex; align-items:center; justify-content: center;">${initial}</div>
             <div>
                <strong style="display:block; color: #0f172a;">${escapeHtml(nameFallback)}</strong>
                <span style="font-size: 13px; color: #94a3b8;">${d}</span>
             </div>
             <div style="margin-left:auto; color: #f59e0b; letter-spacing: 2px;">${starsHtml}</div>
          </div>
          <p style="margin: 0; color: #334155; line-height: 1.5; font-size: 15px;">${escapeHtml(r.comment || "Sem comentário")}</p>
        `;
        list.appendChild(item);
      });
    } catch (e) {
      console.warn("Erro ao buscar avaliações", e);
    }
  }

  // ==== LÓGICA DO FORMULÁRIO DE AVALIAÇÃO ====
  let currentRating = 0;
  function setupReviewForm(placeId) {
    const btnAvaliarTop = qs("btnAvaliar");
    const btnAvaliarInit = qs("btnAvaliarPrimeiro");
    const box = qs("reviewBox");
    const list = qs("reviewsList");
    const btnCancel = qs("btnCancel");
    const btnSend = qs("btnSend");
    const starsBox = qs("starsBox");

    const getAuth = async () => {
      try {
        const res = await apiFetch("/auth/me");
        return res != null;
      } catch (e) { return false; }
    };

    const handleOpenForm = async () => {
      const isLogged = await getAuth();
      if (!isLogged) {
        if (window.VJ_openAuthModal) window.VJ_openAuthModal(window.location.href);
        return;
      }
      if (box) box.hidden = false;
      if (list) list.style.display = "none";
      if (btnAvaliarTop) btnAvaliarTop.style.display = "none";
    };

    const handleCloseForm = () => {
      if (box) box.hidden = true;
      if (list) list.style.display = "block";
      if (btnAvaliarTop) btnAvaliarTop.style.display = "inline-flex";
    };

    if (btnAvaliarTop) btnAvaliarTop.addEventListener("click", handleOpenForm);
    if (btnAvaliarInit) btnAvaliarInit.addEventListener("click", handleOpenForm);
    if (btnCancel) btnCancel.addEventListener("click", handleCloseForm);

    if (starsBox) {
      starsBox.innerHTML = "";
      for (let i = 1; i <= 5; i++) {
        const s = document.createElement("button");
        s.type = "button";
        s.className = "star-btn";
        s.innerHTML = "☆";
        s.style = "background:transparent; border:none; font-size:32px; color:#cbd5e1; cursor:pointer;";
        s.dataset.val = i;
        
        s.addEventListener("click", () => {
          currentRating = i;
          Array.from(starsBox.children).forEach((child, idx) => {
            child.innerHTML = idx < i ? "★" : "☆";
            child.style.color = idx < i ? "#f59e0b" : "#cbd5e1";
          });
        });
        starsBox.appendChild(s);
      }
    }

    if (btnSend) {
      btnSend.addEventListener("click", async () => {
         if (currentRating === 0) {
            alert("Por favor, selecione uma nota de 1 a 5 estrelas!");
            return;
         }
         const msg = document.getElementById("reviewMsg");
         const originalText = btnSend.textContent;
         btnSend.textContent = "Enviando...";
         btnSend.disabled = true;

         try {
           const comment = qs("commentInput")?.value || "";
           await apiFetch(`/public/places/${placeId}/reviews`, {
             method: "POST",
             body: JSON.stringify({ rating: currentRating, comment: comment })
           });

           // Oculta o formulário, recarrega e mostra o box
           handleCloseForm();
           currentRating = 0;
           if (qs("commentInput")) qs("commentInput").value = "";
           Array.from(starsBox.children).forEach(c => { c.innerHTML = "☆"; c.style.color = "#cbd5e1"; });
           
           await loadReviews(placeId);
           await loadPlaceDetails(placeId); // Atualiza nota global no banner

         } catch (e) {
           if (msg) msg.textContent = e.message || "Erro ao publicar a avaliação.";
         } finally {
           btnSend.textContent = originalText;
           btnSend.disabled = false;
         }
      });
    }
  }

  // ==== MAIN ====
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
       document.body.innerHTML = `<div style="padding:40px;text-align:center;"><h2>ID Inválido.</h2><a href="./explorar.html">Voltar para o mapa</a></div>`;
       return;
    }

    if (qs("btnVoltar")) qs("btnVoltar").addEventListener("click", (e) => {
       e.preventDefault();
       if (window.history.length > 1) {
          window.history.back();
       } else {
          window.location.href = "./explorar.html";
       }
    });

    // Fire clicks async format
    apiFetch(`/public/places/${id}/click`, { method: "POST" }).catch(()=>null);

    await loadPlaceDetails(id);
    await loadCoupons(id);
    await loadReviews(id);
    setupReviewForm(id);
  }

  init();
})();
