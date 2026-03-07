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
  };

  let currentStep = 1;

  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 4) return;
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
    progressBar.style.width = `${(stepNumber / 4) * 100}%`;
    if (currentStepNum) currentStepNum.innerText = stepNumber;
    if (currentStepTitle)
      currentStepTitle.innerText = stepInfo[stepNumber].title;
    if (currentStepDesc) currentStepDesc.innerText = stepInfo[stepNumber].desc;
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

  // Form Submit handler
  const form = document.getElementById("formCadastroParceiro");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert(
        "Cadastro concluído com sucesso! Os dados foram enviados (simulação).",
      );
      window.location.href = "./parceiro.html"; // Volta pra home do parceiro
    });
  }

  // Inicializa o passo 1 visualmente correto
  goToStep(1);
});
