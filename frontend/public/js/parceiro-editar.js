document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Edit] Inicializando fluxo de edição...");
  let partnerActivePlan = "Básico";

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
    1: { title: "Estabelecimento", desc: "Informações detalhadas do local" },
    2: { title: "Fotos & Acesso", desc: "Fotos e recursos de acessibilidade disponíveis" },
    3: { title: "Plano", desc: "Visibilidade do seu estabelecimento" },
    4: { title: "Concluído", desc: "Seu cadastro foi enviado com sucesso" },
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
  // applyPhoneMask(document.getElementById("telefoneResponsavel"));
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

  function showVjToast(title, message, type = "error") {
    let toast = document.querySelector(".vj-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "vj-toast";
      document.body.appendChild(toast);
    }

    toast.className = `vj-toast ${type === 'success' ? 'success' : ''}`;

    const iconSvg = type === 'success' 
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    toast.innerHTML = `
      <div class="toast-icon">
        ${iconSvg}
      </div>
      <div class="toast-content">
        <strong>${title}</strong>
        <span>${message}</span>
      </div>
    `;


    toast.classList.remove("active");
    void toast.offsetWidth; // trigger reflow
    toast.classList.add("active");

    setTimeout(() => {
      toast.classList.remove("active");
    }, 4000);
  }

  const cnpjInput = document.getElementById("cnpj_cpf");
  if (cnpjInput) {
    cnpjInput.addEventListener("blur", async (e) => {
      const val = e.target.value.replace(/\D/g, "");
      if (val.length === 14) {
        try {
          const res = await fetch(`${window.API_BASE}/api/validar-cnpj/${val}`);
          if (!res.ok) {
            const err = await res.json();
            showVjToast("Erro no CNPJ", err.detail || "CNPJ inválido ou não encontrado.");
            e.target.style.borderColor = "#ef4444";
            e.target.dataset.validApi = "false";
            return;
          }
          const data = await res.json();
          e.target.style.borderColor = "#22c55e"; // Sucesso
          e.target.dataset.validApi = "true";
          showVjToast("CNPJ Válido", `Empresa: ${data.nome_fantasia || data.razao_social}`, "success");
          
          // Preenche os campos se estiverem vazios
          const nomeInput = document.getElementById("nomeEstabelecimento");
          if (nomeInput && !nomeInput.value) {
            nomeInput.value = data.nome_fantasia || data.razao_social || "";
          }
          
          const cepInput = document.getElementById("cep");
          if (cepInput && !cepInput.value && data.cep) {
            cepInput.value = data.cep;
          }
        } catch (error) {
          console.error("Erro ao validar CNPJ:", error);
          showVjToast("Aviso", "Não foi possível verificar o CNPJ no momento.");
        }
      }
    });
  }

  // ==========================================
  // Navegação do Wizard
  // ==========================================
  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 4) return;
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

    const progressPercent = Math.min((stepNumber / 3) * 100, 100);
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (currentStepNum) currentStepNum.innerText = Math.min(stepNumber, 3);
    if (currentStepTitle && stepInfo[stepNumber]) currentStepTitle.innerText = stepInfo[stepNumber].title;
    if (currentStepDesc && stepInfo[stepNumber]) currentStepDesc.innerText = stepInfo[stepNumber].desc;

    // Header/Sidebar visibilidade
    const stepHeader = document.querySelector(".step-header");
    const parentSidebar = document.querySelector(".cadastro-sidebar");
    const mainPanel = document.querySelector(".cadastro-main");

    if (stepNumber === 4) {
      if (stepHeader) stepHeader.style.display = "none";
      if (parentSidebar) parentSidebar.style.display = "none";
      if (mainPanel) mainPanel.style.maxWidth = "100%";
    } else {
      if (stepHeader) stepHeader.style.display = "block";
      if (parentSidebar) parentSidebar.style.display = "flex";
      if (mainPanel) mainPanel.style.maxWidth = "800px";
    }

    if (stepNumber === 1) {
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

        // Lógica para Outro
        const groupEspecifique = document.getElementById("groupEspecifiqueTipo");
        const inputEspecifique = document.getElementById("especifiqueTipo");
        if (val === "Outro") {
          if (groupEspecifique) groupEspecifique.style.display = "block";
          if (inputEspecifique) inputEspecifique.setAttribute("required", "true");
        } else {
          if (groupEspecifique) groupEspecifique.style.display = "none";
          if (inputEspecifique) {
            inputEspecifique.removeAttribute("required");
            inputEspecifique.value = "";
          }
        }

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
  let existingPhotos = [];
  let selectedFiles = [];

  if (fotoUpload && uploadArea) {
    uploadArea.addEventListener("click", (e) => {
      if (e.target !== fotoUpload) {
        fotoUpload.click();
      }
    });
    fotoUpload.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files);
      
      let maxPhotos = 3;
      const planNorm = partnerActivePlan ? partnerActivePlan.toLowerCase() : "básico";
      if (planNorm.includes("premium") || planNorm.includes("premium")) {
        maxPhotos = 100;
      } else if (planNorm.includes("pro")) {
        maxPhotos = 10;
      }

      const totalCount = existingPhotos.length + selectedFiles.length + newFiles.length;
      if (totalCount > maxPhotos) {
        if (limitWarning) limitWarning.style.display = "block";
        const space = maxPhotos - (existingPhotos.length + selectedFiles.length);
        if (space > 0) selectedFiles = [...selectedFiles, ...newFiles.slice(0, space)];
      } else {
        if (limitWarning) limitWarning.style.display = "none";
        selectedFiles = [...selectedFiles, ...newFiles];
      }
      window.renderPreviewsUI();
      e.target.value = "";
    });

    window.renderPreviewsUI = function() {
      if (!previewContainer) return;
      previewContainer.innerHTML = "";
      
      // Renderizar fotos existentes
      existingPhotos.forEach((url, index) => {
        const div = document.createElement("div");
        div.className = "photo-preview-item";
        div.style = "position:relative; padding-top:100%; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;";
        const img = document.createElement("img");
        const S3_BASE_URL = "https://venha-junto-images.s3.us-east-2.amazonaws.com/fotos/";
        img.src = url.startsWith('http') ? url : (url.includes('/') ? url : S3_BASE_URL + url);
        img.style = "position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity: 0.8;";
        const label = document.createElement("div");
        label.innerHTML = "Já salvo";
        label.style = "position:absolute; bottom:4px; left:50%; transform: translateX(-50%); background:rgba(0,0,0,0.6); color:#fff; font-size:10px; padding:2px 6px; border-radius:4px;";
        div.appendChild(img); div.appendChild(label); 
        
        // Botão de remover foto existente
        const rem = document.createElement("div");
        rem.innerHTML = "×";
        rem.style = "position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;";
        rem.onclick = async () => {
          if (confirm("Deseja realmente excluir esta foto?")) {
            const estabId = new URLSearchParams(window.location.search).get("id");
            if (estabId) {
              try {
                // extrair nome do arquivo
                const filename = url.split('/').pop();
                const res = await fetch(`${window.API_BASE}/api/estabelecimentos/${estabId}/fotos/${filename}`, {
                  method: 'DELETE',
                  credentials: 'include'
                });
                if (!res.ok) throw new Error("Falha ao remover a foto");
                existingPhotos.splice(index, 1);
                window.renderPreviewsUI();
              } catch (err) {
                alert("Erro ao remover a foto: " + err.message);
              }
            }
          }
        };
        div.appendChild(rem);
        previewContainer.appendChild(div);
      });

      // Renderizar novas fotos
      selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const div = document.createElement("div");
          div.className = "photo-preview-item";
          div.style = "position:relative; padding-top:100%; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; border-color: #ea580c;";
          const img = document.createElement("img");
          img.src = ev.target.result;
          img.style = "position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;";
          const rem = document.createElement("div");
          rem.innerHTML = "×";
          rem.style = "position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); color:#fff; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;";
          rem.onclick = () => {
            selectedFiles.splice(index, 1);
            let maxPhotos = 3;
            const planNorm = partnerActivePlan ? partnerActivePlan.toLowerCase() : "básico";
            if (planNorm.includes("premium") || planNorm.includes("premium")) {
              maxPhotos = 100;
            } else if (planNorm.includes("pro")) {
              maxPhotos = 10;
            }
            const totalCount = existingPhotos.length + selectedFiles.length;
            if (totalCount <= maxPhotos) {
              if (limitWarning) limitWarning.style.display = "none";
            }
            window.renderPreviewsUI();
          };
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

      // Passo 1: Responsável removido
      
      // Passo 1 (agora Estabelecimento)
      if (estab.nome) document.getElementById("nomeEstabelecimento").value = estab.nome;
      if (estab.cnpj_cpf) document.getElementById("cnpj_cpf").value = estab.cnpj_cpf;
      if (estab.descricao) document.getElementById("descEstabelecimento").value = estab.descricao;
      
      if (estab.tipo) {
        if (nativeSelect) {
          const standardTypes = ["Restaurante", "Cafeteria", "Museu", "Centro Cultural", "Teatro", "Cinema", "Parque", "Hotel", "Passeio"];
          const isStandard = standardTypes.includes(estab.tipo);
          
          if (isStandard) {
            nativeSelect.value = estab.tipo;
            const opt = Array.from(customOptions).find(o => o.getAttribute("data-value") === estab.tipo);
            if (opt && customText) {
              customText.innerHTML = opt.innerHTML;
              customOptions.forEach(o => o.classList.remove("selected"));
              opt.classList.add("selected");
            }
            const groupEspecifique = document.getElementById("groupEspecifiqueTipo");
            const inputEspecifique = document.getElementById("especifiqueTipo");
            if (groupEspecifique) groupEspecifique.style.display = "none";
            if (inputEspecifique) {
              inputEspecifique.removeAttribute("required");
              inputEspecifique.value = "";
            }
          } else {
            nativeSelect.value = "Outro";
            const opt = Array.from(customOptions).find(o => o.getAttribute("data-value") === "Outro");
            if (opt && customText) {
              customText.innerHTML = opt.innerHTML;
              customOptions.forEach(o => o.classList.remove("selected"));
              opt.classList.add("selected");
            }
            const groupEspecifique = document.getElementById("groupEspecifiqueTipo");
            const inputEspecifique = document.getElementById("especifiqueTipo");
            if (groupEspecifique) groupEspecifique.style.display = "block";
            if (inputEspecifique) {
              inputEspecifique.setAttribute("required", "true");
              inputEspecifique.value = estab.tipo;
            }
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

      // Fotos já salvas
      if (estab.foto_perfil || estab.fotos_galeria) {
        if (estab.foto_perfil) existingPhotos.push(estab.foto_perfil);
        if (estab.fotos_galeria) existingPhotos = existingPhotos.concat(estab.fotos_galeria.split(',').map(u => u.trim()).filter(Boolean));
        if (typeof window.renderPreviewsUI === "function") window.renderPreviewsUI();
      }

      // Passo 3: Acessibilidade
      if (estab.recursos_acessibilidade) {
        const list = estab.recursos_acessibilidade.split(",");
        document.querySelectorAll('input[name="acessibilidade"]').forEach(cb => {
          if (list.some(item => item.trim() === cb.value)) cb.checked = true;
        });
      }

      // Passo 4: Plano
      if (estab.plano_escolhido) {
        window._originalPlan = estab.plano_escolhido.toLowerCase();
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
          let activePlan = user.plano_ativo || "Básico";
          const storedPlan = localStorage.getItem("vj_checkout_plan");
          if (activePlan === "Básico" && storedPlan) {
            if (storedPlan === "pro") {
              activePlan = "Pro";
            } else if (storedPlan === "premium" || storedPlan === "premium") {
              activePlan = "Premium";
            }
          }
          partnerActivePlan = activePlan;
          console.log("[Edit] Plano ativo do parceiro (com override de checkout):", partnerActivePlan);
          updatePlanLimitsUI();

          const avatarG = document.querySelector(".cadastro-sidebar .user-info .avatar");
          const nomeG = document.querySelector(".cadastro-sidebar .user-info strong");
          if (avatarG) avatarG.textContent = user.nome.charAt(0).toUpperCase();
          if (nomeG) nomeG.textContent = user.nome;
        }
      }
    } catch (e) { console.warn("Sessão de parceiro não encontrada."); }
  }

  function updatePlanLimitsUI() {
    const planNorm = partnerActivePlan ? partnerActivePlan.toLowerCase() : "básico";
    const alertInfo = document.querySelector(".alert-info");
    const limitWarning = document.getElementById("photo-limit-warning");

    let maxPhotos = 3;
    let planDisplayName = "Gratuito";
    
    if (planNorm.includes("premium") || planNorm.includes("premium")) {
      maxPhotos = 100;
      planDisplayName = "Premium";
    } else if (planNorm.includes("pro")) {
      maxPhotos = 10;
      planDisplayName = "Pro";
    }

    if (alertInfo) {
      if (planDisplayName === "Premium") {
        alertInfo.innerHTML = `
          <span class="icon">✨</span>
          Plano <strong>${planDisplayName}</strong>: Fotos ilimitadas inclusas.
        `;
      } else if (planDisplayName === "Pro") {
        alertInfo.innerHTML = `
          <span class="icon">⭐</span>
          Plano <strong>${planDisplayName}</strong>: até 10 fotos inclusas.
        `;
      } else {
        alertInfo.innerHTML = `
          <span class="icon">📋</span>
          Plano <strong>Gratuito</strong>: até 3 fotos. Atualize para mais fotos.
        `;
      }
    }

    if (limitWarning) {
      limitWarning.innerHTML = `
        <strong>Limite de ${maxPhotos} fotos atingido!</strong><br />
        Seu plano atual (${planDisplayName}) permite até ${maxPhotos} fotos do local. 
        Avance para o próximo passo se desejar fazer upgrade de plano para adicionar mais imagens.
      `;
    }
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
    // Evita submit acidental ao pressionar Enter nos inputs
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const target = e.target;
        if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") {
          return;
        }
        e.preventDefault();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Validação caso seja "Outro"
      const tipoVal = document.getElementById("tipoEstabelecimento").value;
      const especifiqueInput = document.getElementById("especifiqueTipo");
      if (tipoVal === "Outro" && (!especifiqueInput || !especifiqueInput.value || especifiqueInput.value.trim() === "")) {
        showVjToast("Tipo de Estabelecimento", "Por favor, especifique o tipo do estabelecimento.");
        if (especifiqueInput) {
          especifiqueInput.focus();
          const fg = especifiqueInput.closest(".field-group");
          if (fg) fg.classList.add("has-error");
        }
        return;
      }

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
        nome: document.getElementById("nomeEstabelecimento").value,
        cnpj_cpf: document.getElementById("cnpj_cpf").value,
        tipo: tipoVal === "Outro" ? especifiqueInput.value.trim() : tipoVal,
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

        // Redirecionamento condicional (Upgrade de Plano -> Pagamento)
        const changedToPaidPlan = planoEscolhido !== "basico" && planoEscolhido !== window._originalPlan;
        
        if (changedToPaidPlan) {
          if (btnSubmit) btnSubmit.textContent = "Redirecionando para o Pagamento...";
          // Como o plano foi atualizado no PATCH, vamos simular a etapa de pagamento
          window.location.href = `./pagamento.html?plan=${planoEscolhido}&estab_id=${id}`;
          return;
        }

        // Finaliza (Fluxo Normal)
        goToStep(4);
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
const token = window.ENV?.MAPBOX_TOKEN || "";
console.log("[Mapbox Edit] Inicializando com token:", token ? "Token presente" : "Token AUSENTE");
mapboxgl.accessToken = token;

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
