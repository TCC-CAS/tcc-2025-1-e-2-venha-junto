document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Edit] Inicializando fluxo de edição...");

  // Elementos de UI do Wizard
  const steps = document.querySelectorAll(".step-link");
  const panels = document.querySelectorAll(".form-panel");
  const btnNexts = document.querySelectorAll(".btn-next");
  const btnPrevs = document.querySelectorAll(".btn-prev");
  const progressBar = document.getElementById("progressBar");
  const currentStepNum = document.getElementById("currentStepNum");
  const currentStepTitle = document.getElementById("currentStepTitle");
  const currentStepDesc = document.getElementById("currentStepDesc");

  const stepInfo = {
    1: { title: "Responsável", desc: "Conte-nos sobre o responsável pelo estabelecimento" },
    2: { title: "Estabelecimento", desc: "Informações detalhadas do local" },
    3: { title: "Fotos & Acesso", desc: "Fotos e recursos de acessibilidade disponíveis" },
    4: { title: "Plano", desc: "Visibilidade do seu estabelecimento" },
    5: { title: "Concluído", desc: "Seu cadastro foi enviado com sucesso" },
  };

  let currentStep = 1;

  // ==========================================
  // Mascaras e Helpers
  // ==========================================
  function applyPhoneMask(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", function (e) {
      let x = e.target.value.replace(/\D/g, "");
      if (x.length === 0) { e.target.value = ""; return; }
      if (x.length <= 10) x = x.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
      else x = x.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
      e.target.value = x.replace(/-$/, "");
    });
  }
  applyPhoneMask(document.getElementById("telefoneResponsavel"));
  applyPhoneMask(document.getElementById("telLocal"));
  applyPhoneMask(document.getElementById("zapLocal"));

  function applyCnpjCpfMask(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", (e) => {
      let x = e.target.value.replace(/\D/g, "");
      if (x.length <= 11) {
        x = x.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      } else {
        x = x.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
      }
      e.target.value = x.substring(0, 18);
    });
  }
  applyCnpjCpfMask(document.getElementById("cnpj_cpf"));

  // ==========================================
  // Navegação do Wizard
  // ==========================================
  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 5) return;
    currentStep = stepNumber;

    panels.forEach((p) => p.classList.remove("active"));
    const activePanel = document.querySelector(`.form-panel[data-step="${stepNumber}"]`);
    if (activePanel) activePanel.classList.add("active");

    steps.forEach((s) => {
      const sNum = parseInt(s.getAttribute("data-target"));
      s.classList.remove("active");
      if (sNum < stepNumber) {
        s.classList.add("completed");
        s.querySelector(".step-icon").innerHTML = "✓";
        s.removeAttribute("disabled");
      } else if (sNum === stepNumber) {
        s.classList.remove("completed");
        s.classList.add("active");
        s.querySelector(".step-icon").innerHTML = sNum;
        s.removeAttribute("disabled");
      } else {
        s.classList.remove("completed");
        s.querySelector(".step-icon").innerHTML = sNum;
        s.setAttribute("disabled", "true");
      }
    });

    const progressPercent = Math.min((stepNumber / 4) * 100, 100);
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (currentStepNum) currentStepNum.innerText = Math.min(stepNumber, 4);
    if (currentStepTitle && stepInfo[stepNumber]) currentStepTitle.innerText = stepInfo[stepNumber].title;
    if (currentStepDesc && stepInfo[stepNumber]) currentStepDesc.innerText = stepInfo[stepNumber].desc;

    // Header/Sidebar visibilidade
    const stepHeader = document.querySelector(".step-header");
    const parentSidebar = document.querySelector(".cadastro-sidebar");
    const mainPanel = document.querySelector(".cadastro-main");

    if (stepNumber === 5) {
      if (stepHeader) stepHeader.style.display = "none";
      if (parentSidebar) parentSidebar.style.display = "none";
      if (mainPanel) mainPanel.style.maxWidth = "100%";
    } else {
      if (stepHeader) stepHeader.style.display = "block";
      if (parentSidebar) parentSidebar.style.display = "flex";
      if (mainPanel) mainPanel.style.maxWidth = "800px";
    }

    if (stepNumber === 2) {
      setTimeout(() => {
        if (typeof mapSearch !== "undefined" && mapSearch) mapSearch.resize();
        if (typeof mapPreview !== "undefined" && mapPreview) mapPreview.resize();
      }, 250);
    }
  }

  btnNexts.forEach(btn => btn.addEventListener("click", () => {
    const next = parseInt(btn.getAttribute("data-next"));
    if (next) goToStep(next);
  }));
  btnPrevs.forEach(btn => btn.addEventListener("click", () => {
    const prev = parseInt(btn.getAttribute("data-prev"));
    if (prev) goToStep(prev);
  }));
  steps.forEach(s => s.addEventListener("click", () => {
    if (!s.hasAttribute("disabled")) goToStep(parseInt(s.getAttribute("data-target")));
  }));

  // ==========================================
  // Custom Select (Tipo Estabelecimento)
  // ==========================================
  const customSelect = document.getElementById("customTipoSelect");
  const customTrigger = document.getElementById("customTipoTrigger");
  const customOptions = document.querySelectorAll("#customTipoOptions .custom-option");
  const nativeSelect = document.getElementById("tipoEstabelecimento");
  const customText = document.querySelector("#customTipoTrigger .custom-select-text");

  if (customSelect && customTrigger) {
    customTrigger.addEventListener("click", () => customSelect.classList.toggle("open"));
    document.addEventListener("click", (e) => { if (!customSelect.contains(e.target)) customSelect.classList.remove("open"); });

    customOptions.forEach(opt => {
      opt.addEventListener("click", () => {
        const val = opt.getAttribute("data-value");
        if (customText) customText.innerHTML = opt.innerHTML;
        if (nativeSelect) { nativeSelect.value = val; nativeSelect.dispatchEvent(new Event("change")); }
        customOptions.forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        customSelect.classList.remove("open");
      });
    });
  }

  // ==========================================
  // Fotos (Upload)
  // ==========================================
  const fotoUpload = document.getElementById("fotoUpload");
  const uploadArea = document.querySelector(".upload-area");
  const previewContainer = document.getElementById("photo-preview-container");
  const limitWarning = document.getElementById("photo-limit-warning");
  let selectedFiles = [];

  if (fotoUpload && uploadArea) {
    uploadArea.addEventListener("click", () => fotoUpload.click());
    fotoUpload.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 3) {
        if (limitWarning) limitWarning.style.display = "block";
        const space = 3 - selectedFiles.length;
        if (space > 0) selectedFiles = [...selectedFiles, ...newFiles.slice(0, space)];
      } else {
        if (limitWarning) limitWarning.style.display = "none";
        selectedFiles = [...selectedFiles, ...newFiles];
      }
      renderPreviews();
      e.target.value = "";
    });

    function renderPreviews() {
      if (!previewContainer) return;
      previewContainer.innerHTML = "";
      selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const div = document.createElement("div");
          div.className = "photo-preview-item"; // Usando classe ou style direto
          div.style = "position:relative; padding-top:100%; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;";
          const img = document.createElement("img");
          img.src = ev.target.result;
          img.style = "position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;";
          const rem = document.createElement("div");
          rem.innerHTML = "×";
          rem.style = "position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); color:#fff; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;";
          rem.onclick = () => { selectedFiles.splice(index, 1); renderPreviews(); };
          div.appendChild(img); div.appendChild(rem); previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  // ==========================================
  // CARREGAMENTO DOS DADOS (PRE-FILL)
  // ==========================================
  async function loadData() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (!id) return;

    try {
      console.log(`[Edit] Buscando dados do local ID: ${id}...`);
      // Usa a função padronizada do api.js
      const estab = await window.apiPartnerGetPlace(id);
      console.log("[Edit] Dados recebidos:", estab);

      // Passo 1: Responsável
      if (estab.nome_responsavel) document.getElementById("nomeResponsavel").value = estab.nome_responsavel;
      if (estab.email_responsavel) document.getElementById("emailResponsavel").value = estab.email_responsavel;
      if (estab.telefone_responsavel) document.getElementById("telefoneResponsavel").value = estab.telefone_responsavel;

      // Passo 2: Estabelecimento
      if (estab.nome) document.getElementById("nomeEstabelecimento").value = estab.nome;
      if (estab.cnpj_cpf) document.getElementById("cnpj_cpf").value = estab.cnpj_cpf;
      if (estab.descricao) document.getElementById("descEstabelecimento").value = estab.descricao;
      
      if (estab.tipo) {
        if (nativeSelect) {
          nativeSelect.value = estab.tipo;
          // Atualiza visual do custom select
          const opt = Array.from(customOptions).find(o => o.getAttribute("data-value") === estab.tipo);
          if (opt && customText) {
            customText.innerHTML = opt.innerHTML;
            customOptions.forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
          }
        }
      }

      // Endereço
      if (estab.cep) document.getElementById("cep").value = estab.cep;
      if (estab.endereco) document.getElementById("endereco").value = estab.endereco;
      if (estab.numero_apto) document.getElementById("endApto").value = estab.numero_apto;
      if (estab.bairro) document.getElementById("bairro").value = estab.bairro;
      if (estab.cidade) document.getElementById("cidade").value = estab.cidade;
      if (estab.estado) document.getElementById("endEstado").value = estab.estado;
      if (document.getElementById("toggleMapLocation")) document.getElementById("toggleMapLocation").checked = !!estab.mostrar_mapa;

      // Se já tem endereço, pula a busca do mapa e mostra o form
      const confView = document.getElementById("addressConfirmView");
      const srcView = document.getElementById("addressSearchView");
      if (estab.endereco && confView && srcView) {
        srcView.style.display = "none";
        confView.style.display = "block";
      }

      // Contatos auxiliares
      if (estab.telefone_local) document.getElementById("telLocal").value = estab.telefone_local;
      if (estab.whatsapp_local) document.getElementById("zapLocal").value = estab.whatsapp_local;
      if (estab.email_local) document.getElementById("emailLocal").value = estab.email_local;
      if (estab.site_local) document.getElementById("siteLocal").value = estab.site_local;
      if (estab.instagram_local && document.getElementById("instaLocal")) document.getElementById("instaLocal").value = estab.instagram_local;
      if (estab.facebook_local && document.getElementById("faceLocal")) document.getElementById("faceLocal").value = estab.facebook_local;
      if (estab.horario_funcionamento) document.getElementById("horarioLocal").value = estab.horario_funcionamento;

      // Passo 3: Acessibilidade
      if (estab.recursos_acessibilidade) {
        const list = estab.recursos_acessibilidade.split(",");
        document.querySelectorAll('input[name="acessibilidade"]').forEach(cb => {
          if (list.some(item => item.trim() === cb.value)) cb.checked = true;
        });
      }

      // Passo 4: Plano
      if (estab.plano_escolhido) {
        const radio = document.querySelector(`input[name="plano_escolhido"][value="${estab.plano_escolhido}"]`);
        if (radio) {
          radio.checked = true;
          // Trigger da UI de planos se houver
          const changeEv = new Event("change");
          radio.dispatchEvent(changeEv);
        }
      }

      console.log("[Edit] Formulário preenchido com sucesso.");
    } catch (err) {
      console.error("[Edit] Erro ao carregar dados do estabelecimento:", err);
      alert("Não foi possível carregar os dados do seu estabelecimento para edição.");
    }
  }

  // Auth check sidebar
  async function checkPartnerAuth() {
    try {
      if (typeof window.apiPartnerMe === "function") {
        const user = await window.apiPartnerMe();
        if (user && user.nome) {
          const avatarG = document.querySelector(".cadastro-sidebar .user-info .avatar");
          const nomeG = document.querySelector(".cadastro-sidebar .user-info strong");
          if (avatarG) avatarG.textContent = user.nome.charAt(0).toUpperCase();
          if (nomeG) nomeG.textContent = user.nome;
        }
      }
    } catch (e) { console.warn("Sessão de parceiro não encontrada."); }
  }

  // Execução inicial
  goToStep(1);
  checkPartnerAuth();
  await loadData();

  // ==========================================
  // SUBMISSÃO (PATCH)
  // ==========================================
  const form = document.getElementById("formCadastroParceiro");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const cupomAtivo = document.getElementById("cupom_ativo");
      let cupomData = null;
      if (cupomAtivo && cupomAtivo.checked) {
        cupomData = {
          titulo: document.getElementById("cupom_titulo").value,
          codigo: document.getElementById("cupom_codigo").value,
          descricao: document.getElementById("cupom_descricao").value,
          tipo_desconto: document.getElementById("cupom_tipo").value,
          valor: parseInt(document.getElementById("cupom_valor").value),
          validade: document.getElementById("cupom_validade").value,
          regras: document.getElementById("cupom_regras").value,
        };
      }

      const checkboxesAc = document.querySelectorAll('input[name="acessibilidade"]:checked');
      const acessibilidadeArr = Array.from(checkboxesAc).map(cb => cb.value);

      const selPlano = document.querySelector('input[name="plano_escolhido"]:checked');
      const planoEscolhido = selPlano ? selPlano.value : "basico";

      const payload = {
        nome_responsavel: document.getElementById("nomeResponsavel").value,
        email_responsavel: document.getElementById("emailResponsavel").value,
        telefone_responsavel: document.getElementById("telefoneResponsavel").value,
        nome: document.getElementById("nomeEstabelecimento").value,
        cnpj_cpf: document.getElementById("cnpj_cpf").value,
        tipo: document.getElementById("tipoEstabelecimento").value,
        descricao: document.getElementById("descEstabelecimento").value,
        cep: document.getElementById("cep").value,
        endereco: document.getElementById("endereco").value,
        numero_apto: document.getElementById("endApto").value,
        bairro: document.getElementById("bairro").value,
        cidade: document.getElementById("cidade").value,
        estado: document.getElementById("endEstado").value,
        mostrar_mapa: document.getElementById("toggleMapLocation")?.checked || false,
        telefone_local: document.getElementById("telLocal").value,
        whatsapp_local: document.getElementById("zapLocal").value,
        email_local: document.getElementById("emailLocal").value,
        site_local: document.getElementById("siteLocal").value,
        instagram_local: document.getElementById("instaLocal")?.value || null,
        facebook_local: document.getElementById("faceLocal")?.value || null,
        horario_funcionamento: document.getElementById("horarioLocal").value,
        recursos_acessibilidade: acessibilidadeArr.join(","),
        plano_escolhido: planoEscolhido,
        cupom: cupomData,
      };

      try {
        const btnSubmit = form.querySelector(".btn-submit");
        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = "Salvando alterações..."; }

        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get("id");

        const resPatch = await fetch(`${window.API_BASE}/api/estabelecimentos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload)
        });

        if (!resPatch.ok) {
          const errData = await resPatch.json();
          throw new Error(errData.detail || "Erro ao salvar alterações.");
        }

        // Upload de Fotos se houver novas
        if (selectedFiles.length > 0) {
          if (btnSubmit) btnSubmit.textContent = "Enviando novas fotos...";
          for (let i = 0; i < selectedFiles.length; i++) {
            await window.apiUploadPlacePhoto(id, selectedFiles[i], i === 0);
          }
        }

        // Finaliza
        goToStep(5);
        document.getElementById("successPlanoNome").textContent = planoEscolhido.toUpperCase();
        
        let count = 3;
        const btnBack = document.querySelector("#stepSuccess .btn");
        const timer = setInterval(() => {
          count--;
          if (btnBack) btnBack.innerText = `Voltando ao Painel (${count}s)`;
          if (count <= 0) { clearInterval(timer); window.location.href = "./parceiro-dashboard.html"; }
        }, 1000);

      } catch (err) {
        alert("Erro: " + err.message);
        const btnSubmit = form.querySelector(".btn-submit");
        if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = "Confirmar e Enviar Cadastro"; }
      }
    });
  }

  // Prepara Planos/Cupons UI
  const planoRadios = document.querySelectorAll('input[name="plano_escolhido"]');
  if (planoRadios.length > 0) {
    function checkPlano() {
      let isBasico = true;
      planoRadios.forEach(r => {
        if (r.checked) {
          r.closest(".plano-card")?.classList.add("selected-card");
          if (r.value !== "basico") isBasico = false;
        } else {
          r.closest(".plano-card")?.classList.remove("selected-card");
        }
      });
      document.getElementById("cardCupons").style.display = isBasico ? "none" : "block";
    }
    planoRadios.forEach(r => r.addEventListener("change", checkPlano));
    checkPlano();
  }
});

// ==========================================
// MAPS (MAPBOX)
// ==========================================
let mapSearch, mapPreview, markerPreview;
mapboxgl.accessToken = window.ENV.MAPBOX_TOKEN;

function initMapas() {
  const defaultCenter = [-46.6333, -23.5505];
  if (document.getElementById("map-search")) {
    mapSearch = new mapboxgl.Map({ container: "map-search", style: "mapbox://styles/mapbox/light-v11", center: defaultCenter, zoom: 12, interactive: false });
  }
  if (document.getElementById("map-preview")) {
    mapPreview = new mapboxgl.Map({ container: "map-preview", style: "mapbox://styles/mapbox/light-v11", center: defaultCenter, zoom: 14, interactive: false });
    markerPreview = new mapboxgl.Marker({ color: "#e11d48" }).setLngLat(defaultCenter).addTo(mapPreview);
  }
}

function configurarAutocomplete() {
  const input = document.getElementById("fakeSearchMap");
  const results = document.getElementById("autocomplete-results");
  if (!input || !results) return;

  input.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    if (q.length < 3) { results.style.display = "none"; return; }
    
    // Geocoding SIMPLES
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxgl.accessToken}&country=BR&limit=5`;
    fetch(url).then(r => r.json()).then(data => {
      results.innerHTML = "";
      results.style.display = "block";
      data.features.forEach(f => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.innerText = f.place_name;
        div.onclick = () => {
          document.getElementById("endereco").value = f.place_name;
          if (mapPreview && f.center) { mapPreview.jumpTo({ center: f.center, zoom: 16 }); markerPreview.setLngLat(f.center); }
          document.getElementById("addressSearchView").style.display = "none";
          document.getElementById("addressConfirmView").style.display = "block";
          results.style.display = "none";
          input.value = "";
        };
        results.appendChild(div);
      });
    });
  });
}

// Inicia Mapas fora do DOMContentLoaded principal para manter escopo global das variaveis de mapa se necessario
document.addEventListener("DOMContentLoaded", () => {
    initMapas();
    configurarAutocomplete();
});
