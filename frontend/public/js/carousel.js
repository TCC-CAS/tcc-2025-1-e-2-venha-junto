// frontend/public/js/carousel.js
// Utilitário para gerar Carrossel VJ 100% nativo (sem lib)

window.VJCarousel = window.VJCarousel || {};

/**
 * Retorna um Wrapper Element que contém o container com scroll-snap,
 * botoes laterais e bolinhas (dots) de paginacão.
 * @param {Array<string>} imageUrls Lista de URLs de imagens absolutas ou relativas
 * @param {string} altText Texto alternativo da imagem principal
 * @returns {HTMLDivElement} Elemento DOM final do carrossel
 */
window.VJCarousel.create = function(imageUrls, altText = "Imagem") {
    const wrapper = document.createElement("div");
    wrapper.className = "vj-carousel-wrapper";

    if (!imageUrls || imageUrls.length === 0) {
        const empty = document.createElement("div");
        empty.className = "imgEmpty";
        empty.textContent = "Sem imagem";
        wrapper.appendChild(empty);
        return wrapper;
    }

    // Se tiver só 1 imagem, retorna uma img normal preenchendo o wrapper
    if (imageUrls.length === 1) {
        const img = document.createElement("img");
        img.src = imageUrls[0];
        img.alt = altText;
        img.loading = "lazy";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        wrapper.appendChild(img);
        return wrapper;
    }

    // MULTIPLAS IMAGENS: Constroi Carrossel
    const container = document.createElement("div");
    container.className = "vj-carousel-container";
    wrapper.appendChild(container);

    // Controles (Dots)
    const dotsContainer = document.createElement("div");
    dotsContainer.className = "vj-carousel-dots";

    const dotElements = [];

    imageUrls.forEach((url, i) => {
        const slide = document.createElement("div");
        slide.className = "vj-carousel-slide";
        const img = document.createElement("img");
        img.src = url;
        img.alt = altText + ` - Foto ${i + 1}`;
        img.loading = "lazy";
        
        // click helper: prevent dragging from breaking links by not attaching to drag
        slide.appendChild(img);
        container.appendChild(slide);

        const dot = document.createElement("div");
        dot.className = "vj-carousel-dot";
        if (i === 0) dot.classList.add("active");
        
        dot.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            slide.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        });
        
        dotElements.push(dot);
        dotsContainer.appendChild(dot);
    });

    wrapper.appendChild(dotsContainer);

    // Controles (Buttons)
    const btnPrev = document.createElement("button");
    btnPrev.className = "vj-carousel-nav-btn prev";
    btnPrev.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
    
    const btnNext = document.createElement("button");
    btnNext.className = "vj-carousel-nav-btn next";
    btnNext.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    wrapper.appendChild(btnPrev);
    wrapper.appendChild(btnNext);

    // Lógica CSS Scroll Snap e IntersectionObserver para dots e botões
    let currentIndex = 0;
    const slides = Array.from(container.children);

    const updateUIState = (index) => {
        dotElements.forEach(d => d.classList.remove("active"));
        if (dotElements[index]) dotElements[index].classList.add("active");
        
        btnPrev.style.display = index === 0 ? "none" : "flex";
        btnNext.style.display = index === slides.length - 1 ? "none" : "flex";
    };
    
    // Inicia estado
    updateUIState(0);

    // Observer pra rastrear a bolinha certa quando dá swipe no touch
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const index = slides.indexOf(entry.target);
                if (index !== -1) {
                    currentIndex = index;
                    updateUIState(currentIndex);
                }
            }
        });
    }, {
        root: container,
        threshold: 0.6 // qd o slide toma 60% da visibilidade, ele eh considerado o ativo
    });

    slides.forEach(s => observer.observe(s));

    // Ações de clique preveem stopPropagation pra evitar clicar num `<a href...>` pai
    btnPrev.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex > 0) {
            slides[currentIndex - 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }
    });

    btnNext.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex < slides.length - 1) {
            slides[currentIndex + 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }
    });

    return wrapper;
};
