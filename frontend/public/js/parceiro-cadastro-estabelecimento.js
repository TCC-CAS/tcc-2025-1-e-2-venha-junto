document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".step-link");
  const panels = document.querySelectorAll(".form-panel");
  const btnNexts = document.querySelectorAll(".btn-next");
  const btnPrevs = document.querySelectorAll(".btn-prev");

  const progressBar = document.getElementById("progressBar");
  const currentStepNum = document.getElementById("currentStepNum");
  const currentStepTitle = document.getElementById("currentStepTitle");
  const currentStepDesc = document.getElementById("currentStepDesc");

  const stepInfo = {
    1: {
      title: "Responsável",
      desc: "Conte-nos sobre o responsável pelo estabelecimento",
    },
    2: { title: "Estabelecimento", desc: "Informações detalhadas do local" },
    3: {
      title: "Fotos & Acesso",
      desc: "Fotos e recursos de acessibilidade disponíveis",
    },
    4: { title: "Plano", desc: "Visibilidade do seu estabelecimento" },
    5: { title: "Concluído", desc: "Seu cadastro foi enviado com sucesso" },
  };

  // ==========================================
  // Phone Mask Helper
  // ==========================================
  function applyPhoneMask(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", function (e) {
      let x = e.target.value.replace(/\D/g, "");
      if (x.length === 0) {
        e.target.value = "";
        return;
      }
      if (x.length <= 10) {
        // (XX) XXXX-XXXX
        x = x.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
      } else {
        // (XX) XXXXX-XXXX
        x = x.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
      }
      // Remove trailing hyphens
      e.target.value = x.replace(/-$/, "");
    });
  }

  applyPhoneMask(document.getElementById("telefoneResponsavel"));
  applyPhoneMask(document.getElementById("telLocal"));
  applyPhoneMask(document.getElementById("zapLocal"));

  function applyCnpjCpfMask(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", function (e) {
      let x = e.target.value.replace(/\D/g, "");
      if (x.length <= 11) {
        // CPF: 000.000.000-00
        x = x.replace(/(\d{3})(\d)/, "$1.$2");
        x = x.replace(/(\d{3})(\d)/, "$1.$2");
        x = x.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      } else {
        // CNPJ: 00.000.000/0000-00
        x = x.replace(/^(\d{2})(\d)/, "$1.$2");
        x = x.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        x = x.replace(/\.(\d{3})(\d)/, ".$1/$2");
        x = x.replace(/(\d{4})(\d)/, "$1-$2");
      }
      e.target.value = x.substring(0, 18);
    });
  }

  applyCnpjCpfMask(document.getElementById("cnpj_cpf"));

  let currentStep = 1;

  // ==========================================
  // Fetch Auth & Update Sidebar
  // ==========================================
  async function checkPartnerAuth() {
    try {
      if (typeof window.apiPartnerMe === "function") {
        const user = await window.apiPartnerMe();
        console.log("Dados do parceiro:", user);

        if (user && user.nome) {
          const nomeCurto = user.nome.split(" ")[0]; // Primeiro nome
          const avatarG = document.querySelector(
            ".cadastro-sidebar .user-info .avatar",
          );
          const nomeG = document.querySelector(
            ".cadastro-sidebar .user-info strong",
          );

          if (avatarG) {
            avatarG.textContent = nomeCurto.charAt(0).toUpperCase();
          }
          if (nomeG) {
            nomeG.textContent = user.nome;
          }
        }
      } else {
        console.warn("apiPartnerMe não está definida na janela.");
      }
    } catch (e) {
      console.warn("Usuário não logado ou sessão expirada.", e);
      // window.location.href = "./parceiro-login.html";
    }
  }

  // Executa ao carregar
  checkPartnerAuth();

  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 5) return;
    currentStep = stepNumber;

    // Atualiza Paineis (Esconde todos e mostra o ativo com fade in)
    panels.forEach((p) => p.classList.remove("active"));
    const activePanel = document.querySelector(
      `.form-panel[data-step="${stepNumber}"]`,
    );
    if (activePanel) activePanel.classList.add("active");

    // Atualiza Sidebar Menus
    steps.forEach((s, index) => {
      const sNum = parseInt(s.getAttribute("data-target"));
      s.classList.remove("active");

      // Se já passou, fica completado
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

    // Atualiza Header e Progress Bar
    const progressPercent = Math.min((stepNumber / 4) * 100, 100);
    progressBar.style.width = `${progressPercent}%`;
    if (currentStepNum) currentStepNum.innerText = Math.min(stepNumber, 4);
    if (currentStepTitle && stepInfo[stepNumber])
      currentStepTitle.innerText = stepInfo[stepNumber].title;
    if (currentStepDesc && stepInfo[stepNumber])
      currentStepDesc.innerText = stepInfo[stepNumber].desc;

    // Oculta Cabeçalho se for Passo 5 (Sucesso)
    const stepHeader = document.querySelector(".step-header");
    if (stepHeader) {
      if (stepNumber === 5) {
        stepHeader.style.display = "none";
        // Ajusta a sidebar também
        const parentSidebar = document.querySelector(".cadastro-sidebar");
        if (parentSidebar) parentSidebar.style.display = "none";
        // Expande o main
        const mainPanel = document.querySelector(".cadastro-main");
        if (mainPanel) mainPanel.style.maxWidth = "100%";
      } else {
        stepHeader.style.display = "block";
        const parentSidebar = document.querySelector(".cadastro-sidebar");
        if (parentSidebar) parentSidebar.style.display = "flex";
        const mainPanel = document.querySelector(".cadastro-main");
        if (mainPanel) mainPanel.style.maxWidth = "800px";
      }
    }

    // Força reajuste dos mapas se entrar no passo 2
    if (stepNumber === 2) {
      setTimeout(() => {
        if (typeof mapSearch !== "undefined" && mapSearch) mapSearch.resize();
        if (typeof mapPreview !== "undefined" && mapPreview)
          mapPreview.resize();
      }, 250);
    }
  }

  // Event Listeners pros botões Próximo / Voltar
  btnNexts.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextStep = parseInt(btn.getAttribute("data-next"));
      if (nextStep) goToStep(nextStep);
    });
  });

  btnPrevs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const prevStep = parseInt(btn.getAttribute("data-prev"));
      if (prevStep) goToStep(prevStep);
    });
  });

  // Event Listeners pros links do menu lateral
  steps.forEach((stepLink) => {
    stepLink.addEventListener("click", () => {
      if (!stepLink.hasAttribute("disabled")) {
        const target = parseInt(stepLink.getAttribute("data-target"));
        goToStep(target);
      }
    });
  });

  // ==========================================
  // Custom Select Logic (Tipo de Estabelecimento)
  // ==========================================
  const customSelect = document.getElementById("customTipoSelect");
  const customTrigger = document.getElementById("customTipoTrigger");
  const customOptions = document.querySelectorAll(
    "#customTipoOptions .custom-option",
  );
  const nativeSelect = document.getElementById("tipoEstabelecimento");
  const customText = document.querySelector(
    "#customTipoTrigger .custom-select-text",
  );

  if (customSelect && customTrigger) {
    customTrigger.addEventListener("click", () => {
      customSelect.classList.toggle("open");
    });

    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
      if (!customSelect.contains(e.target)) {
        customSelect.classList.remove("open");
      }
    });

    customOptions.forEach((opt) => {
      opt.addEventListener("click", () => {
        const val = opt.getAttribute("data-value");
        const html = opt.innerHTML; // Pega o icone e span

        customText.innerHTML = html; // atualiza o trigger visual

        // Atualiza nativo
        if (nativeSelect) {
          nativeSelect.value = val;
          // Dispara evento caso tenha alguma validação ouvindo
          nativeSelect.dispatchEvent(new Event("change"));
        }

        // Marca classe css
        customOptions.forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");

        customSelect.classList.remove("open");

        // Remove style de erro se existir
        customSelect.style.borderColor = "";
      });
    });
  }

  // Intercepta validação HTML5 do select invisível para mostrar erro visual
  if (nativeSelect && customSelect) {
    nativeSelect.addEventListener("invalid", (e) => {
      customSelect.style.borderColor = "#ef4444";
      customSelect.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1)";
    });
    nativeSelect.addEventListener("change", () => {
      customSelect.style.borderColor = "";
      customSelect.style.boxShadow = "";
    });
  }

  // ==========================================
  // Photo Upload Logic (Max 3 on Free Plan)
  // ==========================================
  const fotoUpload = document.getElementById("fotoUpload");
  const uploadArea = document.querySelector(".upload-area");
  const previewContainer = document.getElementById("photo-preview-container");
  const limitWarning = document.getElementById("photo-limit-warning");
  let selectedFiles = [];

  if (fotoUpload && uploadArea && previewContainer && limitWarning) {
    uploadArea.addEventListener("click", () => {
      fotoUpload.click();
    });

    fotoUpload.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files);

      // Calculate total files if we append the new ones
      const totalFiles = selectedFiles.length + newFiles.length;

      if (totalFiles > 3) {
        // Show Warning
        limitWarning.style.display = "block";

        // Take only up to 3 files
        const allowedSpace = 3 - selectedFiles.length;
        if (allowedSpace > 0) {
          selectedFiles = [
            ...selectedFiles,
            ...newFiles.slice(0, allowedSpace),
          ];
        }
      } else {
        // Hide warning and add all
        limitWarning.style.display = "none";
        selectedFiles = [...selectedFiles, ...newFiles];
      }

      renderPreviews();

      // Reset input so the same files can trigger logic again if needed
      e.target.value = "";
    });

    function renderPreviews() {
      previewContainer.innerHTML = "";

      selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const div = document.createElement("div");
          div.style.position = "relative";
          div.style.paddingTop = "100%"; // aspect ratio 1:1
          div.style.borderRadius = "8px";
          div.style.overflow = "hidden";
          div.style.border = "1px solid #e2e8f0";

          const img = document.createElement("img");
          img.src = e.target.result;
          img.style.position = "absolute";
          img.style.top = "0";
          img.style.left = "0";
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";

          const removeBtn = document.createElement("div");
          removeBtn.innerHTML = "×";
          removeBtn.style.position = "absolute";
          removeBtn.style.top = "4px";
          removeBtn.style.right = "4px";
          removeBtn.style.background = "rgba(0,0,0,0.5)";
          removeBtn.style.color = "white";
          removeBtn.style.width = "20px";
          removeBtn.style.height = "20px";
          removeBtn.style.display = "flex";
          removeBtn.style.alignItems = "center";
          removeBtn.style.justifyContent = "center";
          removeBtn.style.borderRadius = "50%";
          removeBtn.style.cursor = "pointer";
          removeBtn.style.fontSize = "14px";
          removeBtn.style.lineHeight = "1";

          removeBtn.onclick = () => {
            selectedFiles.splice(index, 1);
            if (selectedFiles.length <= 3) limitWarning.style.display = "none";
            renderPreviews();
          };

          div.appendChild(img);
          div.appendChild(removeBtn);
          previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  // Form Submit handler
  const form = document.getElementById("formCadastroParceiro");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Coleta dados dos Cupons (Se ativo)
      const cupomAtivo = document.getElementById("cupom_ativo");
      let cupomData = null;

      if (cupomAtivo && cupomAtivo.checked) {
        const titulo = document.getElementById("cupom_titulo").value;
        const codigo = document.getElementById("cupom_codigo").value;
        const valor = document.getElementById("cupom_valor").value;
        const tipo = document.getElementById("cupom_tipo").value;
        const validade = document.getElementById("cupom_validade").value;
        const descricaoC = document.getElementById("cupom_descricao").value;
        const regras = document.getElementById("cupom_regras").value;

        if (!titulo || titulo.trim() === "") {
          alert("Por favor, preencha o Título do cupom.");
          return;
        }
        if (!codigo || codigo.trim() === "") {
          alert("Por favor, preencha o Código do cupom.");
          return;
        }
        if (!valor || parseFloat(valor) <= 0) {
          alert("O valor do desconto deve ser maior que 0.");
          return;
        }
        if (tipo === "percentual" && parseFloat(valor) > 100) {
          alert("O valor percentual não pode ser maior que 100%.");
          return;
        }

        if (validade) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const dataValidade = new Date(validade + "T00:00:00");
          if (dataValidade < hoje) {
            alert("A data de validade não pode estar no passado.");
            return;
          }
        }

        cupomData = {
          titulo: titulo,
          codigo: codigo,
          descricao: descricaoC,
          tipo_desconto: tipo,
          valor: parseInt(valor),
          validade: validade,
          regras: regras,
        };
      }

      // Plano escolhido
      let planoEscolhido = "basico";
      let planoNome = "Básico";
      const selPlano = document.querySelector(
        'input[name="plano_escolhido"]:checked',
      );
      if (selPlano) {
        planoEscolhido = selPlano.value;
        if (selPlano.value === "pro") planoNome = "Pro";
        if (selPlano.value === "pro_plus") planoNome = "Pro Plus";
      }

      // Recursos de acessibilidade selecionados
      const checkboxesAc = document.querySelectorAll(
        'input[name="acessibilidade"]:checked',
      );
      const acessibilidadeArr = Array.from(checkboxesAc).map((cb) => cb.value);

      // Constrói o Payload para API
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
          mostrar_mapa: document.getElementById("toggleMapLocation") ? document.getElementById("toggleMapLocation").checked : false,
          telefone_local: document.getElementById("telLocal").value,
          whatsapp_local: document.getElementById("zapLocal").value,
          email_local: document.getElementById("emailLocal").value,
          site_local: document.getElementById("siteLocal").value,
          horario_funcionamento: document.getElementById("horarioLocal").value,
          recursos_acessibilidade: acessibilidadeArr.join(","),
          plano_escolhido: planoEscolhido,
          cupom: cupomData,
        };

      try {
        const btnSubmit = form.querySelector(".btn-submit");
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = "Enviando Dados...";
        }

        console.log("--- INICIANDO CADASTRO ---");
        // API_BASE log removido pois agora o api.js já loga a URL completa

        if (typeof window.apiPartnerCreatePlace !== "function") {
          throw new Error("Função apiPartnerCreatePlace não encontrada. Verifique se api.js foi carregado.");
        }

        const estabCriado = await window.apiPartnerCreatePlace(payload);
        const estabId = estabCriado.id;
        console.log("Sucesso no Passo 1! ID do Estabelecimento:", estabId);

        // --- UPLOAD DE FOTOS ---
        console.log(`Verificando ${selectedFiles.length} fotos para upload.`);
        
        if (selectedFiles.length > 0) {
          if (btnSubmit) btnSubmit.textContent = "Enviando Fotos...";
          
          for (let i = 0; i < selectedFiles.length; i++) {
            const isProfile = (i === 0);
            console.log(`[UPLOAD] Enviando foto ${i+1}/${selectedFiles.length} (${isProfile ? 'Perfil' : 'Galeria'})...`);
            
            try {
              // Delay opcional para evitar sobrecarga no servidor dev
              await new Promise(r => setTimeout(r, 300));
              
              const res = await window.apiUploadPlacePhoto(estabId, selectedFiles[i], isProfile);
              console.log(`[UPLOAD] Foto ${i + 1} enviada com sucesso! Resposta:`, res);
            } catch (imgErr) {
              console.error(`[UPLOAD] ERRO na foto ${i+1}:`, imgErr);
              // Não interromper o fluxo total se uma foto de galeria falhar? 
              // Por segurança do TCC, vamos apenas logar e continuar se for galeria, mas falhar se for perfil.
              if (isProfile) {
                throw new Error(`Erro crítico: Não foi possível enviar a foto principal. ${imgErr.message}`);
              } else {
                console.warn(`Aviso: Falha ao enviar foto da galeria ${i+1}, continuando...`);
              }
            }
          }
        } else {
          console.warn("Nenhuma foto selecionada para enviar.");
        }

        // Sucesso: Atualiza visual e finaliza
        const elPlanoNome = document.getElementById("successPlanoNome");
        if (elPlanoNome) elPlanoNome.textContent = planoNome;
        console.log("Cadastro finalizado com sucesso!");
        goToStep(5);
        
        let contagem = 4;
        const btnDash = form.querySelector("#stepSuccess .btn");
        
        let destination = "./parceiro-dashboard.html";
        if (planoEscolhido !== "basico") {
           destination = `./pagamento.html?plan=${planoEscolhido}&estabId=${estabId}`;
           if (btnDash) btnDash.innerText = `Ir para Pagamento (${contagem}s)`;
        } else {
           if (btnDash) btnDash.innerText = `Acessar Área do Parceiro (${contagem}s)`;
        }
        
        const timer = setInterval(() => {
            contagem--;
            if (planoEscolhido !== "basico") {
                if (btnDash) btnDash.innerText = `Ir para Pagamento (${contagem}s)`;
            } else {
                if (btnDash) btnDash.innerText = `Acessar Área do Parceiro (${contagem}s)`;
            }
            if(contagem <= 0) {
               clearInterval(timer);
               window.location.href = destination;
            }
        }, 1000);
      } catch (error) {
        console.error("ERRO NO PROCESSO DE CADASTRO:", error);
        alert("Erro no cadastro: " + error.message);
        
        const btnSubmit = form.querySelector(".btn-submit");
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Confirmar e Enviar Cadastro";
        }
      }
    });
  }

  // Lógica de Planos e Cupons
  const planoRadios = document.querySelectorAll(
    'input[name="plano_escolhido"]',
  );
  const cardCupons = document.getElementById("cardCupons");
  const cupomAtivoSwitch = document.getElementById("cupom_ativo");
  const cupomForm = document.getElementById("cupomForm");

  if (planoRadios.length > 0) {
    function checkPlano() {
      let planoSelecionado = "basico";
      planoRadios.forEach((r) => {
        const parentCard = r.closest(".plano-card");
        if (r.checked) {
          planoSelecionado = r.value;
          if (parentCard) parentCard.classList.add("selected-card");
        } else {
          if (parentCard) parentCard.classList.remove("selected-card");
        }
      });

      if (planoSelecionado === "basico") {
        if (cardCupons) cardCupons.style.display = "none";
        if (cupomAtivoSwitch) cupomAtivoSwitch.checked = false;
        if (cupomForm) cupomForm.style.display = "none";
      } else {
        if (cardCupons) cardCupons.style.display = "block";
      }
    }

    planoRadios.forEach((radio) => {
      radio.addEventListener("change", checkPlano);
    });

    // Inicializa a lógica de planos na carga da tela
    checkPlano();
  }

  if (cupomAtivo && cupomForm) {
    cupomAtivo.addEventListener("change", function () {
      if (this.checked) {
        cupomForm.style.display = "block";
        document
          .getElementById("cupom_titulo")
          .setAttribute("required", "true");
        document
          .getElementById("cupom_codigo")
          .setAttribute("required", "true");
        document.getElementById("cupom_valor").setAttribute("required", "true");
      } else {
        cupomForm.style.display = "none";
        document.getElementById("cupom_titulo").removeAttribute("required");
        document.getElementById("cupom_codigo").removeAttribute("required");
        document.getElementById("cupom_valor").removeAttribute("required");
      }
    });
  }

  if (cupomTipo && cupomValorHelp && cupomValor) {
    cupomTipo.addEventListener("change", function () {
      if (this.value === "percentual") {
        cupomValorHelp.innerText = "Informe apenas o número (ex: 5 para 5%)";
        cupomValor.placeholder = "Ex: 5";
      } else {
        cupomValorHelp.innerText =
          "Informe o valor em Reais (ex: 15 para R$ 15,00)";
        cupomValor.placeholder = "Ex: 15";
      }
    });
  }

  // Lógica de UI Endereço (Mapa vs Form) original removida daqui, agora tratada pela API do Google.

  // Preview do Minimapa Toggle
  const toggleMapLocation = document.getElementById("toggleMapLocation");
  const miniMapPreview = document.querySelector(".mini-map-preview");

  if (toggleMapLocation && miniMapPreview) {
    miniMapPreview.style.opacity = "0.5";
    miniMapPreview.style.pointerEvents = "none";

    toggleMapLocation.addEventListener("change", (e) => {
      if (e.target.checked) {
        miniMapPreview.style.opacity = "1";
        miniMapPreview.style.pointerEvents = "auto";
        miniMapPreview.querySelector(".tooltip-mapa").innerText =
          "Mostrando sua localização exata.";
      } else {
        miniMapPreview.style.opacity = "0.5";
        miniMapPreview.style.pointerEvents = "none";
        miniMapPreview.querySelector(".tooltip-mapa").innerText =
          "Compartilharemos sua localização aproximada.";
      }
    });
  }

  // Inicializa o passo 1 visualmente correto
  goToStep(1);
});

// ==========================================
// INTEGRAÇÃO MAPBOX
// ==========================================

// Token fornecido pelo usuário via config.js (segurança do GitHub)
mapboxgl.accessToken = window.ENV.MAPBOX_TOKEN;

let mapSearch, mapPreview, markerPreview;

// Inicializa os mapas quando o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
  initMapas();
  configurarAutocomplete();
});

function initMapas() {
  // Configuração padrão: São Paulo (Nota: Mapbox usa [lng, lat])
  const defaultCenter = [-46.6333, -23.5505];

  // 1. Mapa Oculto de Busca (para dar o visual de fundo na View 1)
  const mapSearchDiv = document.getElementById("map-search");
  if (mapSearchDiv) {
    mapSearch = new mapboxgl.Map({
      container: "map-search",
      style: "mapbox://styles/mapbox/light-v11", // Estilo flat/claro
      center: defaultCenter,
      zoom: 12,
      interactive: false, // desabilita arraste e zoom para ficar só fundo
    });

    // Força reajuste de tamanho após renderização do CSS Flexbox
    setTimeout(() => {
      mapSearch.resize();
    }, 200);
  }

  // 2. Mapa Menor de Preview (Confirmação)
  const mapPreviewDiv = document.getElementById("map-preview");
  if (mapPreviewDiv) {
    mapPreview = new mapboxgl.Map({
      container: "map-preview",
      style: "mapbox://styles/mapbox/light-v11",
      center: defaultCenter,
      zoom: 14,
      interactive: false,
    });

    // Adiciona pino inicial
    markerPreview = new mapboxgl.Marker({ color: "#e11d48" })
      .setLngLat(defaultCenter)
      .addTo(mapPreview);
  }
}

function configurarAutocomplete() {
  const fakeSearchMap = document.getElementById("fakeSearchMap");
  const resultsDropdown = document.getElementById("autocomplete-results");
  let debounceTimer;

  if (!fakeSearchMap || !resultsDropdown) return;

  fakeSearchMap.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 3) {
      resultsDropdown.style.display = "none";
      return;
    }

    debounceTimer = setTimeout(() => {
      // Mapbox Geocoding API: Busca no Brasil
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=BR&language=pt&autocomplete=true&limit=5`;

      resultsDropdown.style.zIndex = "999999";
      resultsDropdown.style.display = "block";
      resultsDropdown.innerHTML =
        '<div class="autocomplete-item" style="color:#94a3b8;text-align:center;">Buscando com Mapbox...</div>';

      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error("Erro na API Mapbox");
          return response.json();
        })
        .then((data) => {
          resultsDropdown.innerHTML = "";
          if (data && data.features && data.features.length > 0) {
            data.features.forEach((place) => {
              const item = document.createElement("div");
              item.className = "autocomplete-item";

              // Mapbox já devolve formatado no "place_name" (Ex: "Avenida Paulista, São Paulo, Brazil")
              // Vamos apenas limpar o final se tiver "Brazil" ou "Brasil" pra ficar mais limpo.
              let addressText = place.place_name
                .replace(/, Brazil$/, "")
                .replace(/, Brasil$/, "");
              item.innerText = addressText;

              item.addEventListener("click", () => {
                preencherFormularioComPlace(place, addressText);
                resultsDropdown.style.display = "none";
                fakeSearchMap.value = ""; // Limpa pra próxima caso volte
              });

              resultsDropdown.appendChild(item);
            });
          } else {
            resultsDropdown.innerHTML =
              '<div class="autocomplete-item" style="color:#e11d48;text-align:center;">Nenhum local encontrado.</div>';
          }
        })
        .catch((err) => {
          console.error("Erro na geocodificação Mapbox:", err);
          resultsDropdown.innerHTML =
            '<div class="autocomplete-item" style="color:#e11d48;text-align:center;">Falha ao contactar Mapbox.</div>';
        });
    }, 400); // delay menor que do OSM pois Mapbox aguenta mais rate limit
  });

  // Fecha dropdown se clicar fora
  document.addEventListener("click", (e) => {
    if (
      !fakeSearchMap.contains(e.target) &&
      !resultsDropdown.contains(e.target)
    ) {
      resultsDropdown.style.display = "none";
    }
  });

  // Caso o usuário aperte Enter sem clicar
  fakeSearchMap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && fakeSearchMap.value.trim() !== "") {
      e.preventDefault();
      document.getElementById("endereco").value = fakeSearchMap.value;
      mudarParaFormulario();
    }
  });
}

function preencherFormularioComPlace(place, displayText) {
  // Mapbox devolve contexto em place.context
  let bairro = "";
  let cidade = "";
  let estado = "";
  let cep = "";

  if (place.context) {
    place.context.forEach((c) => {
      if (c.id.includes("neighborhood") || c.id.includes("locality"))
        bairro = c.text;
      if (c.id.includes("place")) cidade = c.text;
      if (c.id.includes("region")) estado = c.text; // geralmente a sigla BR-SP, e text="São Paulo"
      if (c.id.includes("postcode")) cep = c.text;
    });
  }

  // O texto base se for POI ou endereço
  const rua = place.text || "";
  const addressNum = place.address || "";

  // Compõe endereço principal extraído
  let valEndereco =
    rua && addressNum ? `${rua}, ${addressNum}` : displayText.split(",")[0];

  document.getElementById("endereco").value = valEndereco;
  document.getElementById("bairro").value = bairro;
  if (cidade) document.getElementById("cidade").value = cidade;

  // Limpando o estado se ele vier longo. "São Paulo"
  // Mapbox context region.text é geralmente o nome inteiro. O HTML aceito depende de como ele tratar
  if (estado) document.getElementById("endEstado").value = estado;
  if (cep) document.getElementById("cep").value = cep;

  // Atualiza mapa de preview
  if (mapPreview && markerPreview && place.center) {
    const lngLat = place.center; // [lng, lat]
    mapPreview.jumpTo({ center: lngLat, zoom: 16 });
    markerPreview.setLngLat(lngLat);
  }

  mudarParaFormulario();
}

function mudarParaFormulario() {
  const viewMapSearch = document.getElementById("addressSearchView");
  const viewAddressForm = document.getElementById("addressConfirmView");
  if (viewMapSearch && viewAddressForm) {
    viewMapSearch.style.display = "none";
    viewAddressForm.style.display = "block";

    // Resize do Mapbox pra redesenhar quando a div fica visível
    if (mapPreview) {
      setTimeout(() => {
        mapPreview.resize();
      }, 300);
    }
  }
}
