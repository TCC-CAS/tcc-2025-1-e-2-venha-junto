/* frontend/public/js/local-detalhes.js */

const API_BASE = "http://127.0.0.1:8000";

(function () {
  const params = new URLSearchParams(window.location.search);
  const placeId = params.get("id");

  const el = (id) => document.getElementById(id);
  const setText = (id, text) => { const e = el(id); if (e) e.textContent = text || ""; };

  async function apiMe() {
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/me`, { credentials: "include" });
      if (!res.ok) throw new Error("Não autenticado");
      return res.json();
    } catch {
      return null;
    }
  }

  function setRatingLine(place) {
    const rc = Number(place.reviews_count || 0);
    const ar = Number(place.avg_rating || 0);
    setText("ratingAvg", ar.toFixed(1));
    setText("reviewsTitle", `Avaliações (${rc})`);
  }

  async function registrarClique(id) {
    try {
      await fetch(`${API_BASE}/public/places/${id}/click`, { method: "POST" });
    } catch(e) { console.warn("Erro ao registrar clique", e); }
  }

  async function renderReviews(id) {
    const container = el("reviewsList");
    if (!container) return;
    
    try {
      const res = await fetch(`${API_BASE}/public/places/${id}/reviews`);
      if (!res.ok) throw new Error("Erro ao carregar");
      const reviews = await res.json();

      if (reviews.length === 0) {
        container.innerHTML = `
          <div class="empty-reviews" id="emptyReviews">
            <p>Ainda não há avaliações para este local.</p>
            <button id="btnAvaliarPrimeiro" class="btn-outline">Seja o primeiro a avaliar</button>
          </div>
        `;
        const btnP = el("btnAvaliarPrimeiro");
        if (btnP) btnP.onclick = () => window.handleOpenReview && window.handleOpenReview();
        return;
      }

      container.innerHTML = "";
      reviews.forEach(r => {
        const div = document.createElement("div");
        div.className = "vj-review";
        
        let stars = "";
        for (let i = 1; i <= 5; i++) {
          stars += `<span style="color: ${i <= r.rating ? '#f59e0b' : '#cbd5e1'}">★</span>`;
        }

        const date = new Date(r.created_at).toLocaleDateString("pt-BR");

        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <strong style="color: #0f172a">${r.usuario_nome || 'Usuário'}</strong>
            <span style="font-size: 12px; color: #64748b">${date}</span>
          </div>
          <div style="margin-bottom: 8px;">${stars}</div>
          <p style="margin:0; color: #475569; font-size: 14px; line-height: 1.5;">${r.comment || "Sem comentário."}</p>
        `;
        container.appendChild(div);
      });
    } catch (e) {
      container.innerHTML = `<div class="vj-muted">Não foi possível carregar as avaliações.</div>`;
    }
  }

  function renderStars(container, value, onChange) {
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement("button");
      s.type = "button";
      s.className = "vj-star";
      s.textContent = "★";
      s.setAttribute("data-on", i <= value ? "true" : "false");
      s.addEventListener("click", () => onChange(i));
      container.appendChild(s);
    }
  }

  async function main() {
    if (!placeId) return;

    const starsBox = el("starsBox");
    const reviewBox = el("reviewBox");
    const commentInput = el("commentInput");
    const msg = el("reviewMsg");
    const btnAvaliar = el("btnAvaliar");
    const btnSend = el("btnSend");
    const btnCancel = el("btnCancel");

    function setMsg(t) { if (msg) msg.textContent = t || ""; }

    let currentRating = 0;
    const updateStars = (val) => {
      currentRating = val;
      renderStars(starsBox, currentRating, updateStars);
    };
    updateStars(0);

    try {
      const res = await fetch(`${API_BASE}/public/places/${placeId}`);
      if (!res.ok) throw new Error("Local não encontrado");
      const place = await res.json();

      // UI BÁSICA - SYNC COM HTML IDs
      setText("nome", place.nome);
      setText("enderecoTopo", `${place.endereco}, ${place.numero_apto || ''} - ${place.bairro}`);
      setText("tipoBadge", place.tipo);
      setText("descricao", place.descricao);
      
      // Sidebar
      setText("addressRua", place.endereco);
      
      const telEl = el("telefoneLocal");
      if (telEl) {
          telEl.textContent = place.telefone_local || "Não informado";
          if (place.telefone_local) {
              telEl.style.cursor = "pointer";
              telEl.style.textDecoration = "underline";
              telEl.onclick = () => {
                  registrarClique(placeId);
                  window.location.href = `tel:${place.telefone_local.replace(/\D/g,'')}`;
              };
          }
      }

      setText("horarioLocal", place.horario_funcionamento || "Não informado");

      // Adicionar link de Site se existir
      if (place.site_local) {
          const detailBox = document.querySelector(".card-details");
          if (detailBox) {
              const siteItem = document.createElement("div");
              siteItem.className = "detail-item";
              siteItem.style.cursor = "pointer";
              siteItem.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span style="text-decoration: underline;">Visitar Website</span>
              `;
              siteItem.onclick = () => {
                  registrarClique(placeId);
                  window.open(place.site_local, "_blank");
              };
              detailBox.appendChild(siteItem);
          }
      }

      // Adicionar WhatsApp se existir
      if (place.whatsapp_local) {
          const detailBox = document.querySelector(".card-details");
          if (detailBox) {
               const zapItem = document.createElement("div");
               zapItem.className = "detail-item";
               zapItem.style.cursor = "pointer";
               zapItem.style.color = "#16a34a";
               zapItem.innerHTML = `
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                 <span style="text-decoration: underline; font-weight: bold;">Chamar no WhatsApp</span>
               `;
               zapItem.onclick = () => {
                   registrarClique(placeId);
                   const msg = encodeURIComponent(`Olá! Vi seu local "${place.nome}" no Venha Junto e gostaria de mais informações.`);
                   window.open(`https://wa.me/55${place.whatsapp_local.replace(/\D/g,'')}?text=${msg}`, "_blank");
               };
               detailBox.appendChild(zapItem);
          }
      }

      const verifiedBadge = el("verifiedBadge");
      if (verifiedBadge) verifiedBadge.style.display = place.status === "APPROVED" ? "flex" : "none";

      const imgWrap = el("imgWrap");
      if (imgWrap) {
        imgWrap.innerHTML = "";
        
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
            const carousel = window.VJCarousel.create(imageUrls, place.nome || "Local");
            carousel.style.width = "100%";
            carousel.style.height = "100%";
            imgWrap.appendChild(carousel);
        } else {
            if (imageUrls.length > 0) {
              const img = document.createElement("img");
              img.src = imageUrls[0];
              imgWrap.appendChild(img);
            } else {
              imgWrap.innerHTML = `<div class="vj-hero__imgEmpty">Sem imagem</div>`;
            }
        }
      }

      // ACESSIBILIDADE
      const feats = el("features");
      if (feats) {
        const accessibilityMap = {
          rampa: "Rampa de acesso",
          banheiro: "Banheiro adaptado",
          elevador: "Elevador",
          estacionamento: "Vaga PCD em estacionamento",
          libras: "Intérprete de Libras",
          entrada_acessivel: "Entrada sem degraus",
          cardapio_braille: "Cardápio em Braille",
          cadeira_rodas: "Cadeira de rodas disponível",
          sinalizacao_braille: "Sinalização em Braille",
          atendimento_prioritario: "Atendimento prioritário"
        };
        const list = place.features || [];
        feats.innerHTML = list.length ? "" : `<div class="vj-muted">Nenhum recurso informado.</div>`;
        list.forEach(f => {
          const label = accessibilityMap[f.toLowerCase()] || f.replace(/_/g, ' ');
          const item = document.createElement("div");
          item.className = "access-item";
          item.innerHTML = `<span class="dot"></span> ${label}`;
          feats.appendChild(item);
        });
      }

      setRatingLine(place);
      renderReviews(placeId);

      // EVENTOS AVALIAR
      window.handleOpenReview = async () => {
        const user = await apiMe();
        if (!user) {
          const returnUrl = window.location.pathname + window.location.search;
          if (window.VJ_openAuthModal) window.VJ_openAuthModal(returnUrl);
          return;
        }

        reviewBox.hidden = false;
        setMsg("");
        
        // Verificar se já avaliou para Edição
        const rRes = await fetch(`${API_BASE}/public/places/${placeId}/reviews`);
        if (rRes.ok) {
          const all = await rRes.json();
          const existing = all.find(r => r.usuario_id === user.id);
          if (existing) {
            updateStars(existing.rating);
            if (commentInput) commentInput.value = existing.comment || "";
            setMsg("Você já avaliou este local. Ao enviar, você atualizará sua nota anterior.");
          } else {
            updateStars(0);
            if (commentInput) commentInput.value = "";
          }
        }
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      };

      if (btnAvaliar) btnAvaliar.onclick = () => window.handleOpenReview();
      if (btnCancel) btnCancel.onclick = () => { reviewBox.hidden = true; };

      if (btnSend) {
        btnSend.onclick = async () => {
          if (!currentRating) return setMsg("Por favor, selecione uma nota.");
          setMsg("Enviando...");
          try {
            const res = await fetch(`${API_BASE}/public/places/${placeId}/reviews`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rating: currentRating, comment: commentInput.value })
            });
            if (!res.ok) throw new Error("Erro ao salvar avaliação.");
            
            setMsg("✅ Avaliação salva!");
            setTimeout(async () => {
              reviewBox.hidden = true;
              const refresh = await fetch(`${API_BASE}/public/places/${placeId}`);
              if (refresh.ok) setRatingLine(await refresh.json());
              renderReviews(placeId);
            }, 1000);
          } catch (e) {
            setMsg("Erro: " + e.message);
          }
        };
      }

    } catch (e) {
      console.error(e);
      setText("nome", "Local não encontrado");
    }
  }

  main();
})();

// Voltar inteligente
(function() {
  const btn = document.getElementById("btnVoltar");
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      // Se houver histórico, volta. Se não (aberto link direto), vai para Home.
      if (document.referrer && document.referrer.includes(window.location.hostname)) {
          window.history.back();
      } else {
          window.location.href = "./index.html";
      }
    };
  }
})();
