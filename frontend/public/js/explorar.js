// frontend/public/js/explorar.js
// ✅ Sem mock
// ✅ Puxa do backend: GET /public/places
// ✅ Favoritos via BACKEND (sem cookie/localStorage no front)
// ✅ Coração no card + ao favoritar vai para favoritos.html
// ✅ Ajuste: cidade padrão = TODAS (não filtra por São Paulo)
// ✅ Ajuste: detalhes abre com &from=explorar

(function () {
  const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:" ||
    !window.location.hostname
      ? `http://${window.location.hostname || "localhost"}:8000`
      : "https://venha-junto-h54n.onrender.com";

  function qs(id) {
    return document.getElementById(id);
  }

  let userCoords = null;

  function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /* =========================
     MENU MOBILE / SIDEBAR
  ========================= */
  function openCloseSidebar() {
    const sidebar = qs("sidebar");
    const btn = qs("btnMenu");
    if (!sidebar || !btn) return;

    const open = sidebar.getAttribute("data-open") === "true";
    const next = !open;
    sidebar.setAttribute("data-open", String(next));
    btn.setAttribute("aria-expanded", String(next));
  }

  function bindMobileMenu() {
    const btn = qs("btnMenu");
    if (!btn) return;

    btn.addEventListener("click", openCloseSidebar);

    document.addEventListener("click", (e) => {
      const sidebar = qs("sidebar");
      if (!sidebar) return;

      const isMobile = window.matchMedia("(max-width: 860px)").matches;
      if (!isMobile) return;

      const open = sidebar.getAttribute("data-open") === "true";
      if (!open) return;

      const clickedInside =
        sidebar.contains(e.target) || btn.contains(e.target);
      if (!clickedInside) {
        sidebar.setAttribute("data-open", "false");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* =========================
     Painel de filtros
  ========================= */
  function bindFiltersPanel() {
    const btn = qs("btnFiltros");
    const panel = qs("painelFiltros");
    const close = qs("btnFecharFiltros");

    if (!btn || !panel) return;

    const openPanel = () => {
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    };
    const closePanel = () => {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", () => {
      if (panel.hidden) openPanel();
      else closePanel();
    });
    if (close) close.addEventListener("click", closePanel);
  }

  function setCount(n) {
    const el = qs("countLocais");
    if (!el) return;
    
    const parentContainer = el.closest(".count-bar");
    if (n === null) {
      if (parentContainer) parentContainer.style.display = "none";
    } else {
      el.textContent = String(n);
      if (parentContainer) parentContainer.style.display = "block";
    }
  }

  /* =========================
     HTTP helpers
  ========================= */
  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include",
      headers: {
        ...(opts.headers || {}),
      },
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const data = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => null);

    if (!res.ok) {
      const detail =
        data && typeof data === "object" && data.detail
          ? data.detail
          : typeof data === "string"
            ? data
            : `HTTP ${res.status}`;
      throw new Error(detail);
    }
    return data;
  }

  async function apiPublicPlaces({ cidade, tipo } = {}) {
    const params = new URLSearchParams();
    if (cidade) params.set("cidade", cidade);
    if (tipo && normalizeText(tipo) !== "todos") params.set("tipo", tipo);

    const q = params.toString();
    const url = q ? `/public/places?${q}` : "/public/places";
    return apiFetch(url);
  }

  // ✅ Favoritos via BACKEND
  async function apiFavoritesIds() {
    const data = await apiFetch("/favorites/ids");
    return Array.isArray(data) ? data.map(String) : [];
  }

  async function apiAddFavorite(placeId) {
    return apiFetch(`/favorites/${encodeURIComponent(placeId)}`, {
      method: "POST",
    });
  }

  async function apiRemoveFavorite(placeId) {
    return apiFetch(`/favorites/${encodeURIComponent(placeId)}`, {
      method: "DELETE",
    });
  }

  /* =========================
     Normalização / filtros
  ========================= */
  function normalizeText(s) {
    return (s || "")
      .toString()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizeTipoToApi(tipoUi) {
    const t = normalizeText(tipoUi);
    if (!t || t === "todos" || t === "todos os tipos") return "Todos";
    if (t === "hoteis" || t === "hotel") return "Hotel";
    if (t === "restaurantes" || t === "restaurante") return "Restaurante";
    if (t === "atracoes" || t === "atracao") return "Atracao";
    if (t === "passeios" || t === "passeio") return "Passeio";
    return tipoUi;
  }

  function matchesTipo(placeTipo, selectedTipoApi) {
    if (!selectedTipoApi || normalizeText(selectedTipoApi) === "todos")
      return true;

    const a = normalizeText(placeTipo);
    const b = normalizeText(selectedTipoApi);

    if (b === "hotel") return a.includes("hotel");
    if (b === "restaurante") return a.includes("restaurante");
    if (b === "atracao") return a.includes("atracao");
    if (b === "passeio") return a.includes("passeio");

    return a === b;
  }

  function matchesQuery(place, q) {
    if (!q) return true;
    const nq = normalizeText(q);

    const nome = normalizeText(place?.nome);
    const bairro = normalizeText(place?.bairro);
    const desc = normalizeText(place?.descricao);

    return nome.includes(nq) || bairro.includes(nq) || desc.includes(nq);
  }

  // Retorna array dos valores acc selecionados: ['rampa', 'banheiro', ...]
  function getSelectedAcc() {
    const boxes = document.querySelectorAll('input[data-acc]:checked');
    return Array.from(boxes).map(b => b.dataset.acc);
  }

  // Verifica se o lugar tem TODOS os recursos selecionados
  function matchesAcc(place, selectedAcc) {
    if (!selectedAcc || selectedAcc.length === 0) return true;
    const recursos = (place.recursos_acessibilidade || '').split(',').map(s => s.trim());
    return selectedAcc.every(acc => recursos.includes(acc));
  }

  // =========================
  // GEOLOCALIZAÇÃO E DISTÂNCIA
  // =========================
  let userLocation = null; // { lat, lng }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distância em km
  }

  function bindLocationFilter() {
    const raioBusca = qs("raioBusca");
    const raioValor = qs("raioValor");

    if (!raioBusca) return;

    raioBusca.addEventListener("input", (e) => {
      raioValor.textContent = `${e.target.value} km`;
    });

    raioBusca.addEventListener("change", () => {
      if (!userLocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            userLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            aplicarFiltros();
          },
          (err) => {
            console.warn("Localização bloqueada ou erro:", err);
            console.info("Usando Praça da Sé (SP) como fallback para demonstração do TCC.");
            // Fallback para Praça da Sé - São Paulo, SP
            userLocation = {
              lat: -23.550520,
              lng: -46.633308
            };
            aplicarFiltros();
          }
        );
      } else {
        aplicarFiltros();
      }
    });
  }

  /* =========================
     UI / Cards
  ========================= */
  function safeText(v) {
    return (v ?? "").toString();
  }

  function normalizeImageUrl(url) {
    const u = safeText(url).trim();
    if (!u) return "";
    if (u.startsWith("/")) return API_BASE + u;
    return u;
  }

  // guarda em memória (somente runtime) quais ids são favoritos
  let favSet = new Set();

  async function refreshFavSet() {
    try {
      const ids = await apiFavoritesIds();
      favSet = new Set(ids.map(String));
    } catch (e) {
      favSet = new Set();
      console.warn(
        "Não foi possível carregar favoritos (talvez não logado):",
        e.message || e,
      );
    }
  }

  function getIcon(name, color = "currentColor", size = 18) {
    const icons = {
      location: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
      star: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
      accessibility: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="4" r="1"></circle><path d="m18 19 1-7-6 1"></path><path d="m5 8 3-3 5.5 2-2.36 3.5"></path><path d="M4.24 14.5a5 5 0 0 0 6.88 6"></path><path d="M13.76 17.5a5 5 0 0 0-6.88-6"></path></svg>`,
      user: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
      eye: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
      check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
      zap: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
      shield: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
    };
    return icons[name] || "";
  }

  function buildCard(place, distanceKm = null) {
    const a = document.createElement("a");
    a.className = "local-card";
    a.href = `./local-detalhes.html?id=${encodeURIComponent(place.id)}&from=explorar`;

    // 1. ÁREA DA IMAGEM
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "img-wrapper";
    imgWrapper.style.position = "relative";

    let imageUrls = [];
    if (place.foto_perfil) {
      imageUrls.push(`${API_BASE}/api/estabelecimentos/fotos/${place.foto_perfil}`);
    }
    if (place.fotos_galeria) {
      const extra = place.fotos_galeria.split(",").filter(v => v.trim());
      extra.forEach(foto => {
        if (foto.trim() !== place.foto_perfil) {
           imageUrls.push(`${API_BASE}/api/estabelecimentos/fotos/${foto.trim()}`);
        }
      });
    }

    if (window.VJCarousel && window.VJCarousel.create) {
        const carousel = window.VJCarousel.create(imageUrls, safeText(place.nome) || "Local");
        // Força a altura e largura para o wrapper herdado do VJCarousel
        carousel.style.width = "100%";
        carousel.style.height = "100%";
        imgWrapper.appendChild(carousel);
    } else {
        if (imageUrls.length > 0) {
            const img = document.createElement("img");
            img.alt = safeText(place.nome) || "Local";
            img.loading = "lazy";
            img.src = imageUrls[0];
            imgWrapper.appendChild(img);
        } else {
            const empty = document.createElement("div");
            empty.className = "imgEmpty";
            empty.textContent = "Sem imagem";
            imgWrapper.appendChild(empty);
        }
    }

    // Badges sobre a imagem
    const badges = document.createElement("div");
    badges.className = "card-badges";
    
    // Badge Premium (Pro / Pro Plus)
    if (place.plano_escolhido === "Pro Plus" || place.plano_escolhido === "Pro") {
      const bPremium = document.createElement("div");
      bPremium.className = "badge-item premium";
      bPremium.innerHTML = `${getIcon('star')} Destaque`;
      bPremium.style.backgroundColor = "#fffbeb";
      bPremium.style.color = "#b45309";
      bPremium.style.border = "1px solid #fde68a";
      badges.appendChild(bPremium);
      
      if (place.plano_escolhido === "Pro Plus") {
        a.style.border = "2px solid #f59e0b";
        a.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.15)";
      }
    }

    // Badge Tipo (Atração/Restaurante/etc)
    const bType = document.createElement("div");
    bType.className = "badge-item atracao";
    bType.textContent = place.tipo || "Local";
    badges.appendChild(bType);

    // Badge Acessível (se tiver recursos)
    const hasFeatures = place.recursos_acessibilidade && place.recursos_acessibilidade.length > 0;
    if (hasFeatures) {
      const bAccess = document.createElement("div");
      bAccess.className = "badge-item acessivel";
      bAccess.innerHTML = `${getIcon('zap')} Acessível`;
      badges.appendChild(bAccess);
    }

    // Badge Verificado
    if (place.status === "APPROVED" || place.verified) {
      const bVerif = document.createElement("div");
      bVerif.className = "badge-item verificado";
      bVerif.innerHTML = `${getIcon('shield')} Verificado`;
      badges.appendChild(bVerif);
    }
    imgWrapper.appendChild(badges);

    // Coração
    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-btn";
    const favIcon = document.createElement("span");
    favIcon.className = "fav-icon";
    favIcon.textContent = "❤";
    favBtn.appendChild(favIcon);
    const sid = String(place.id);
    if (favSet.has(sid)) favBtn.classList.add("is-active");
    favBtn.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      const currentlyFav = favBtn.classList.contains("is-active");
      try {
        if (currentlyFav) {
          await apiRemoveFavorite(place.id);
          favBtn.classList.remove("is-active");
          favSet.delete(sid);
        } else {
          await apiAddFavorite(place.id);
          favBtn.classList.add("is-active");
          favSet.add(sid);
        }
      } catch (err) { alert(err.message || "Erro ao atualizar favorito"); }
    });
    imgWrapper.appendChild(favBtn);
    a.appendChild(imgWrapper);

    // 2. CORPO DO CARD
    const body = document.createElement("div");
    body.className = "body";

    // Linha do Título
    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    const h3 = document.createElement("h3");
    h3.textContent = safeText(place.nome);
    const userIcon = document.createElement("div");
    userIcon.className = "user-icon";
    userIcon.innerHTML = getIcon("user", "#94a3b8", 20);
    titleRow.appendChild(h3);
    
    // Distância GPS (Somente para planos Pro e Pro Plus)
    const canShowDistance = (place.plano_escolhido === "Pro" || place.plano_escolhido === "pro_plus" || place.plano_escolhido === "Pro Plus");

    if (userLocation && place.latitude && place.longitude && canShowDistance) {
        const dist = getDistance(userLocation.lat, userLocation.lng, place.latitude, place.longitude);
        if (dist !== null) {
            const distSpan = document.createElement("span");
            distSpan.className = "distance-badge";
            distSpan.style.fontSize = "11px";
            distSpan.style.color = "#ef4444";
            distSpan.style.fontWeight = "900";
            distSpan.style.backgroundColor = "#fee2e2";
            distSpan.style.padding = "2px 6px";
            distSpan.style.borderRadius = "6px";
            distSpan.style.marginLeft = "auto"; 
            distSpan.innerHTML = `📍 ${dist.toFixed(1)} km`;
            titleRow.appendChild(distSpan);
        }
    }

    titleRow.appendChild(userIcon);
    body.appendChild(titleRow);

    // Linha de Localização
    const locRow = document.createElement("div");
    locRow.className = "loc-row";
    locRow.innerHTML = `${getIcon("location", "#64748b", 16)} ${place.bairro || ""}, ${place.cidade || ""}`;
    body.appendChild(locRow);

    // Linha de Avaliação
    const ratingBar = document.createElement("div");
    ratingBar.className = "rating-bar";
    
    const rAvg = document.createElement("div");
    rAvg.className = "rating-item avg";
    rAvg.innerHTML = `${getIcon("star")} ${(place.avg_rating || 4.5).toFixed(1)}`;
    
    const rAccess = document.createElement("div");
    rAccess.className = "rating-item access";
    rAccess.innerHTML = `${getIcon("accessibility", "#10b981", 18)} 5.0`;
    
    ratingBar.appendChild(rAvg);
    ratingBar.appendChild(rAccess);
    body.appendChild(ratingBar);

    // Chips de Categoria (opcional, usando o tipo como exemplo)
    const catChips = document.createElement("div");
    catChips.className = "category-chips";
    ["Família", "Acessível"].forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "cat-chip";
      chip.textContent = tag;
      catChips.appendChild(chip);
    });
    body.appendChild(catChips);

    // Descrição
    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = place.descricao || "Sem descrição disponível.";
    body.appendChild(desc);

    // Box de Recursos Acessíveis
    if (hasFeatures) {
      const accessBox = document.createElement("div");
      accessBox.className = "access-box";
      
      const h4 = document.createElement("h4");
      h4.innerHTML = `${getIcon("accessibility", "#166534", 16)} Recursos Acessíveis`;
      accessBox.appendChild(h4);

      const aChips = document.createElement("div");
      aChips.className = "access-chips";
      
      const accessibilityMap = {
        rampa: "Rampa de acesso",
        banheiro: "Banheiro adaptado",
        elevador: "Elevador",
        piso_tatil: "Piso tátil",
        estacionamento: "Vaga PCD"
      };

      const features = place.recursos_acessibilidade.split(",").slice(0, 3);
      features.forEach(f => {
        const val = f.trim();
        if(!val) return;
        const span = document.createElement("span");
        span.className = "access-chip";
        span.textContent = accessibilityMap[val] || val;
        aChips.appendChild(span);
      });
      accessBox.appendChild(aChips);
      body.appendChild(accessBox);
    }

    a.appendChild(body);

    // 3. FOOTER (BOTÃO)
    const footer = document.createElement("div");
    footer.className = "footer";
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerHTML = `${getIcon("eye", "#fff", 18)} Ver Detalhes`;
    footer.appendChild(btn);

    a.appendChild(body);
    a.appendChild(footer);

    return a;
  }

  function render(listaFull) {
    const container = qs("listaLocais");
    if (!container) return;

    container.style.opacity = "1";
    container.innerHTML = "";
    
    const maxDist = parseFloat(qs("raioBusca")?.value || 10);
    let arrFiltrado = [];

    // Se a localização estiver ativada, calculamos a distância
    if (userLocation) {
        listaFull.forEach(p => {
            let pLat = parseFloat(p.latitude);
            let pLng = parseFloat(p.longitude);
            
            if (!isNaN(pLat) && !isNaN(pLng)) {
                const dist = getDistance(userLocation.lat, userLocation.lng, pLat, pLng);
                if (dist <= maxDist) {
                    p._distance = dist; // salvamos a dist na memoria
                    arrFiltrado.push(p);
                }
            }
        });
        // Ordenar os locais do mais próximo para o mais distante
        arrFiltrado.sort((a, b) => a._distance - b._distance);
    } else {
        arrFiltrado = Array.isArray(listaFull) ? listaFull : [];
    }

    setCount(arrFiltrado.length);

    if (arrFiltrado.length === 0) {
      container.innerHTML = `<div class="vj-empty">Nenhum estabelecimento encontrado nesta área${userLocation ? " (tente aumentar o raio)" : ""}.</div>`;
      return;
    }

    arrFiltrado.forEach((p) => container.appendChild(buildCard(p, p._distance)));
  }

  async function aplicarFiltros() {
    const q = qs("q")?.value || "";
    const tipoUi = qs("tipo")?.value || "Todos";
    // ✅ agora cidade padrão = TODAS (vazio)
    const cidade = qs("cidade")?.value || "";

    const tipoApi = normalizeTipoToApi(tipoUi);

    const container = qs("listaLocais");
    if (container) {
      container.innerHTML = "";
    }
    setCount(null);

    try {
      await refreshFavSet();

      let lista = await apiPublicPlaces({
        cidade: cidade || undefined, // vazio => não envia filtro
        tipo: tipoApi || undefined,
      });

      lista = Array.isArray(lista) ? lista : [];

      if (tipoApi && normalizeText(tipoApi) !== "todos") {
        lista = lista.filter((p) => matchesTipo(p?.tipo, tipoApi));
      }

      if (q) {
        lista = lista.filter((p) => matchesQuery(p, q));
      }

      const selectedAcc = getSelectedAcc();
      if (selectedAcc.length > 0) {
        lista = lista.filter((p) => matchesAcc(p, selectedAcc));
      }

      render(lista);
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="vj-empty">Nenhum estabelecimento encontrado.</div>`;
      }
      console.error("Não foi possível carregar locais da API: ", e);
    }
  }

  function limpar() {
    if (qs("q")) qs("q").value = "";
    if (qs("tipo")) qs("tipo").value = "Todos";
    // ✅ limpar volta para TODAS
    if (qs("cidade")) qs("cidade").value = "";
    if (qs("estilo")) qs("estilo").value = "Qualquer";
    if (qs("orcamento")) qs("orcamento").value = "Qualquer";
    
    // Reseta checkboxes de acessibilidade
    document.querySelectorAll('input[data-acc]').forEach(cb => cb.checked = false);

    // Reseta slider e zera localização
    if (qs("raioBusca")) qs("raioBusca").value = "10";
    if (qs("raioValor")) qs("raioValor").textContent = "10 km";
    userLocation = null;
    
    aplicarFiltros();
  }

  async function main() {
    bindMobileMenu();
    bindFiltersPanel();
    bindLocationFilter();

    // Tentar pegar localização ao carregar
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            console.log("GPS Ativo (Explorar):", userLocation);
            aplicarFiltros();
        });
    }

    await aplicarFiltros();

    qs("filtrar")?.addEventListener("click", aplicarFiltros);
    qs("limpar")?.addEventListener("click", limpar);

    qs("q")?.addEventListener("input", () => aplicarFiltros());
    qs("tipo")?.addEventListener("change", aplicarFiltros);
    qs("cidade")?.addEventListener("change", aplicarFiltros);

    // ✅ Filtros de acessibilidade — atualiza ao clicar em qualquer checkbox
    document.querySelectorAll('input[data-acc]').forEach(cb => {
      cb.addEventListener('change', aplicarFiltros);
    });
  }

  main();
})();
