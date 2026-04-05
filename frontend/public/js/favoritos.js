// frontend/public/js/favoritos.js
(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  function qs(id) {
    return document.getElementById(id);
  }

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

      const clickedInside = sidebar.contains(e.target) || btn.contains(e.target);
      if (!clickedInside) {
        sidebar.setAttribute("data-open", "false");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include",
      headers: { ...(opts.headers || {}) },
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
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function apiFavoritesList() {
    return apiFetch("/favorites");
  }

  async function apiRemoveFavorite(placeId) {
    return apiFetch(`/favorites/${encodeURIComponent(placeId)}`, { method: "DELETE" });
  }

  function safeText(v) {
    return (v ?? "").toString();
  }

  function normalizeImageUrl(url) {
    const u = safeText(url).trim();
    if (!u) return "";
    if (u.startsWith("/")) return API_BASE + u;
    return u;
  }

  function setCount(n) {
    const el = qs("countFavoritos");
    if (el) el.textContent = String(n);
  }

  function showEmpty(show) {
    const empty = qs("emptyState");
    const list = qs("listaFavoritos");
    if (empty) empty.hidden = !show;
    if (list) list.hidden = show;
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

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function buildCard(place) {
    const a = document.createElement("a");
    a.className = "local-card";
    a.href = `./local-detalhes.html?id=${encodeURIComponent(place.id)}`;

    // 1. ÁREA DA IMAGEM
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "img-wrapper";

    if (place.foto_perfil) {
      const img = document.createElement("img");
      img.alt = safeText(place.nome);
      img.loading = "lazy";
      img.src = `${API_BASE}/api/estabelecimentos/fotos/${place.foto_perfil}`;
      imgWrapper.appendChild(img);
    } else {
      const empty = document.createElement("div");
      empty.className = "imgEmpty";
      empty.textContent = "Sem imagem";
      imgWrapper.appendChild(empty);
    }

    // Badges sobre a imagem
    const badges = document.createElement("div");
    badges.className = "card-badges";
    
    if (place.plano_escolhido === "Pro Plus" || place.plano_escolhido === "Pro") {
      const bPremium = document.createElement("div");
      bPremium.className = "badge-item premium";
      bPremium.innerHTML = `${getIcon('star')} Destaque`;
      badges.appendChild(bPremium);
    }

    const bType = document.createElement("div");
    bType.className = "badge-item atracao";
    bType.textContent = place.tipo || "Local";
    badges.appendChild(bType);

    const hasFeatures = place.recursos_acessibilidade && place.recursos_acessibilidade.length > 0;
    if (hasFeatures) {
      const bAccess = document.createElement("div");
      bAccess.className = "badge-item acessivel";
      bAccess.innerHTML = `${getIcon('zap')} Acessível`;
      badges.appendChild(bAccess);
    }

    if (place.status === "APPROVED" || place.verified) {
      const bVerif = document.createElement("div");
      bVerif.className = "badge-item verificado";
      bVerif.innerHTML = `${getIcon('shield')} Verificado`;
      badges.appendChild(bVerif);
    }
    imgWrapper.appendChild(badges);

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-btn is-active";
    favBtn.innerHTML = `<span class="fav-icon">❤</span>`;
    favBtn.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      try {
        await apiRemoveFavorite(place.id);
        a.remove();
        const grid = qs("gridFavoritos");
        const remaining = grid ? grid.querySelectorAll(".local-card").length : 0;
        setCount(remaining);
        if (remaining === 0) showEmpty(true);
      } catch (err) { alert(err.message || "Erro ao remover favorito"); }
    });
    imgWrapper.appendChild(favBtn);
    a.appendChild(imgWrapper);

    // 2. CORPO DO CARD
    const body = document.createElement("div");
    body.className = "body";

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    const h3 = document.createElement("h3");
    h3.textContent = safeText(place.nome);
    titleRow.appendChild(h3);
    
    // Distância GPS (Se tivermos localização e for plano PRO)
    if (window.userCoords && (place.plano_escolhido === "Pro" || place.plano_escolhido === "Pro Plus")) {
        const dist = getDistance(window.userCoords.lat, window.userCoords.lng, place.latitude, place.longitude);
        if (dist) {
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
    body.appendChild(titleRow);

    const locRow = document.createElement("div");
    locRow.className = "loc-row";
    locRow.innerHTML = `${getIcon("location", "#64748b", 16)} ${place.bairro || ""}, ${place.cidade || ""}`;
    body.appendChild(locRow);

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

    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = place.descricao || "Sem descrição disponível.";
    body.appendChild(desc);

    if (hasFeatures) {
      const accessBox = document.createElement("div");
      accessBox.className = "access-box";
      const h4 = document.createElement("h4");
      h4.innerHTML = `${getIcon("accessibility", "#166534", 16)} Recursos Acessíveis`;
      accessBox.appendChild(h4);
      const aChips = document.createElement("div");
      aChips.className = "access-chips";
      const accessibilityMap = { rampa: "Rampa", banheiro: "Banheiro", elevador: "Elevador", piso_tatil: "Piso tátil", estacionamento: "Vaga PCD" };
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

    const footer = document.createElement("div");
    footer.className = "footer";
    const btnDet = document.createElement("button");
    btnDet.className = "btn";
    btnDet.innerHTML = `${getIcon("eye", "#fff", 18)} Ver Detalhes`;
    footer.appendChild(btnDet);
    a.appendChild(footer);

    return a;
  }

  function render(lista) {
    const grid = qs("gridFavoritos"); // ✅ aqui!
    if (!grid) return;

    grid.innerHTML = "";

    const arr = Array.isArray(lista) ? lista : [];
    setCount(arr.length);

    if (arr.length === 0) {
      showEmpty(true);
      return;
    }

    showEmpty(false);
    arr.forEach((p) => grid.appendChild(buildCard(p)));
  }

  async function main() {
    bindMobileMenu();

    qs("btnExplorar")?.addEventListener("click", () => (window.location.href = "./explorar.html"));
    qs("btnVoltar")?.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "./index.html";
    });

    try {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
              window.userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              // Re-renderizar se já carregou a lista
              apiFavoritesList().then(render).catch(console.error);
          });
      }

      const lista = await apiFavoritesList();
      render(lista);
    } catch (e) {
      if (e.status === 401) {
        window.location.href = "./usuario-login.html";
        return;
      }
      const grid = qs("gridFavoritos");
      if (grid) grid.innerHTML = `<div class="vj-error">Erro: ${String(e.message || e)}</div>`;
      console.error(e);
    }
  }

  main();
})();
