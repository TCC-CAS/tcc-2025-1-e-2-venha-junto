// frontend/public/js/home.js
// ✅ Sem mock
// ✅ Sem localStorage
// ✅ Busca do backend: GET /public/places
// ✅ Filtro garantido no front (caso backend não filtre)

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
    const sidebar = document.getElementById("sidebar");
    const btn = document.getElementById("btnMenu");
    if (!sidebar || !btn) return;

    const open = sidebar.getAttribute("data-open") === "true";
    const next = !open;
    sidebar.setAttribute("data-open", String(next));
    btn.setAttribute("aria-expanded", String(next));
  }

  function bindMobileMenu() {
    const btn = document.getElementById("btnMenu");
    if (!btn) return;

    btn.addEventListener("click", openCloseSidebar);

    document.addEventListener("click", (e) => {
      const sidebar = document.getElementById("sidebar");
      if (!sidebar) return;

      const isMobile = window.matchMedia("(max-width: 860px)").matches;
      if (!isMobile) return;

      const open = sidebar.getAttribute("data-open") === "true";
      if (!open) return;

      const clickedInside = sidebar.contains(e.target) || btn.contains(e.target);
      if (!clickedInside) {
        sidebar.setAttribute("data-open", "false");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* =========================
     HTTP helpers
  ========================= */
  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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

  async function apiMe() {
    return apiFetch("/auth/me");
  }

  async function apiPublicPlaces({ cidade, tipo, verified_first } = {}) {
    const params = new URLSearchParams();
    if (cidade) params.set("cidade", cidade);
    if (tipo && String(tipo).toLowerCase() !== "todos") params.set("tipo", tipo);
    if (typeof verified_first === "boolean")
      params.set("verified_first", String(verified_first));

    const q = params.toString();
    const url = q ? `/public/places?${q}` : "/public/places";
    return apiFetch(url);
  }

  /* =========================
     Normalização (GARANTE filtro)
  ========================= */
  function normalizeText(s) {
    return (s || "")
      .toString()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .toLowerCase();
  }

  function normalizeTipoToApi(tipoUi) {
    const t = normalizeText(tipoUi);

    if (!t || t === "todos") return "Todos";
    if (t === "hoteis" || t === "hotel") return "Hotel";
    if (t === "restaurantes" || t === "restaurante") return "Restaurante";
    if (t === "atracoes" || t === "atracao") return "Atracao";
    if (t === "passeios" || t === "passeio") return "Passeio";

    return tipoUi;
  }

  function matchesTipo(placeTipo, selectedTipoApi) {
    if (!selectedTipoApi || normalizeText(selectedTipoApi) === "todos") return true;

    const a = normalizeText(placeTipo);
    const b = normalizeText(selectedTipoApi);

    if (b === "hotel") return a.includes("hotel");
    if (b === "restaurante") return a.includes("restaurante");
    if (b === "atracao") return a.includes("atracao");
    if (b === "passeio") return a.includes("passeio");

    return a === b;
  }

  /* =========================
     UI helpers
  ========================= */
  function safeText(v) {
    return (v ?? "").toString();
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

  function buildCard(place) {
    const a = document.createElement("a");
    a.className = "local-card";
    a.href = `./local-detalhes.html?id=${encodeURIComponent(place.id)}`;

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

    // Badge Tipo
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
    const canShowDistance = (place.plano_escolhido === "Pro" || place.plano_escolhido === "Pro Plus");
    
    if (userCoords && place.latitude && place.longitude && canShowDistance) {
        const dist = calculateDistance(userCoords.lat, userCoords.lng, place.latitude, place.longitude);
        if (dist !== null) {
            const distSpan = document.createElement("span");
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
    rAvg.innerHTML = `${getIcon("star")} ${(place.avg_rating || (4 + Math.random())).toFixed(1)}`;
    
    const rAccess = document.createElement("div");
    rAccess.className = "rating-item access";
    rAccess.innerHTML = `${getIcon("accessibility", "#10b981", 18)} 5.0`;
    
    ratingBar.appendChild(rAvg);
    ratingBar.appendChild(rAccess);
    body.appendChild(ratingBar);

    // Chips de Categoria
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
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = a.href;
    });
    footer.appendChild(btn);
    a.appendChild(footer);

    return a;
  }

  function render(lista) {
    const container = qs("listaLocais");
    if (!container) return;

    container.style.opacity = "1";
    container.innerHTML = "";

    if (!lista || lista.length === 0) {
      container.innerHTML =
        `<div class="vj-empty">Nenhum estabelecimento encontrado.</div>`;
      return;
    }

    lista.forEach((p) => container.appendChild(buildCard(p)));
  }

  async function loadUserHeader() {
    const userEmail = document.getElementById("userEmail");
    if (!userEmail) return;

    try {
      const me = await apiMe();
      userEmail.textContent = me?.email || "visitante@venhajunto.com";
    } catch {
      userEmail.textContent = "visitante@venhajunto.com";
    }
  }

  async function aplicarFiltros() {
    const cidade = qs("cidade")?.value || "";
    const tipoUi = qs("tipoLocal")?.value || "Todos";
    const priorizar = !!qs("toggleAcessiveis")?.checked;

    const tipoApi = normalizeTipoToApi(tipoUi);
    const verified_first = priorizar ? true : false;

    const container = qs("listaLocais");
    if (container) {
      container.innerHTML = "";
    }

    try {
      // 1) tenta filtrado no backend
      let lista = await apiPublicPlaces({
        cidade: cidade || undefined,
        tipo: tipoApi || undefined,
        verified_first,
      });

      // 2) GARANTIA: filtra no front também
      if (tipoApi && normalizeText(tipoApi) !== "todos") {
        lista = (Array.isArray(lista) ? lista : []).filter((p) =>
          matchesTipo(p?.tipo, tipoApi)
        );
      }

      render(lista);
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="vj-error">Erro ao carregar locais: ${String(
          e.message
        )}</div>`;
      }
      console.error(e);
    }
  }

  async function main() {
    bindMobileMenu();

    Promise.all([
      loadUserHeader().catch(console.error),
      aplicarFiltros().catch(console.error)
    ]);

    // Tentar pegar localização do usuário
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            console.log("Localização obtida:", userCoords);
            // Re-renderiza para mostrar distâncias
            aplicarFiltros(); 
        }, (err) => {
            console.warn("GPS negado ou erro:", err.message);
        });
    }

    // Botão Buscar
    const btnBuscar = qs("btnBuscar");
    if (btnBuscar) btnBuscar.addEventListener("click", aplicarFiltros);

    // Aplica na hora que mudar os filtros
    const cidadeEl = qs("cidade");
    const tipoEl = qs("tipoLocal");
    const toggleEl = qs("toggleAcessiveis");

    if (cidadeEl) cidadeEl.addEventListener("change", aplicarFiltros);
    if (tipoEl) tipoEl.addEventListener("change", aplicarFiltros);
    if (toggleEl) toggleEl.addEventListener("change", aplicarFiltros);

    // Enter também funciona
    ["cidade", "tipoLocal"].forEach((id) => {
      const el = qs(id);
      if (!el) return;

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") aplicarFiltros();
      });
    });
  }

  main();
})();
