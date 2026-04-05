// i18n.js - Modal Premium de Idiomas
// =====================================================
// Lista completa de países com bandeira, código de tradução e idioma nativo
// =====================================================
const VJ_LANGUAGES = [
    { flag: '🇧🇷', country: 'Brasil',          lang: 'Português',   code: 'pt' },
    { flag: '🇺🇸', country: 'United States',   lang: 'English',     code: 'en' },
    { flag: '🇬🇧', country: 'United Kingdom',  lang: 'English',     code: 'en' },
    { flag: '🇦🇺', country: 'Australia',       lang: 'English',     code: 'en' },
    { flag: '🇨🇦', country: 'Canada',          lang: 'English',     code: 'en' },
    { flag: '🇪🇸', country: 'España',          lang: 'Español',     code: 'es' },
    { flag: '🇲🇽', country: 'México',          lang: 'Español',     code: 'es' },
    { flag: '🇦🇷', country: 'Argentina',       lang: 'Español',     code: 'es' },
    { flag: '🇨🇴', country: 'Colombia',        lang: 'Español',     code: 'es' },
    { flag: '🇫🇷', country: 'France',          lang: 'Français',    code: 'fr' },
    { flag: '🇧🇪', country: 'Belgique',        lang: 'Français',    code: 'fr' },
    { flag: '🇮🇹', country: 'Italia',          lang: 'Italiano',    code: 'it' },
    { flag: '🇩🇪', country: 'Deutschland',     lang: 'Deutsch',     code: 'de' },
    { flag: '🇦🇹', country: 'Österreich',      lang: 'Deutsch',     code: 'de' },
    { flag: '🇨🇭', country: 'Schweiz',         lang: 'Deutsch',     code: 'de' },
    { flag: '🇯🇵', country: '日本',             lang: '日本語',       code: 'ja' },
    { flag: '🇨🇳', country: '中国',             lang: '简体中文',     code: 'zh-CN' },
    { flag: '🇷🇺', country: 'Россия',          lang: 'Русский',     code: 'ru' },
    { flag: '🇸🇦', country: 'السعودية',         lang: 'العربية',    code: 'ar' },
    { flag: '🇦🇪', country: 'الإمارات',          lang: 'العربية',    code: 'ar' },
    { flag: '🇵🇹', country: 'Portugal',         lang: 'Português',   code: 'pt' },
    { flag: '🇳🇱', country: 'Nederland',        lang: 'Nederlands',  code: 'nl' },
    { flag: '🇸🇪', country: 'Sverige',          lang: 'Svenska',     code: 'sv' },
    { flag: '🇳🇴', country: 'Norge',            lang: 'Norsk',       code: 'no' },
    { flag: '🇩🇰', country: 'Danmark',          lang: 'Dansk',       code: 'da' },
    { flag: '🇫🇮', country: 'Suomi',            lang: 'Suomi',       code: 'fi' },
    { flag: '🇵🇱', country: 'Polska',           lang: 'Polski',      code: 'pl' },
    { flag: '🇺🇦', country: 'Україна',          lang: 'Українська',  code: 'uk' },
    { flag: '🇹🇷', country: 'Türkiye',          lang: 'Türkçe',      code: 'tr' },
    { flag: '🇰🇷', country: '한국',              lang: '한국어',       code: 'ko' },
    { flag: '🇮🇳', country: 'India',            lang: 'Hindi',       code: 'hi' },
    { flag: '🇻🇳', country: 'Việt Nam',         lang: 'Tiếng Việt',  code: 'vi' },
    { flag: '🇲🇦', country: 'Maroc',            lang: 'Français',    code: 'fr' },
    { flag: '🇬🇷', country: 'Ελλάδα',           lang: 'Ελληνικά',    code: 'el' },
    { flag: '🇭🇺', country: 'Magyarország',     lang: 'Magyar',      code: 'hu' },
    { flag: '🇨🇿', country: 'Česko',            lang: 'Čeština',     code: 'cs' },
    { flag: '🇮🇩', country: 'Indonesia',        lang: 'Bahasa',      code: 'id' },
    { flag: '🇲🇾', country: 'Malaysia',         lang: 'Bahasa',      code: 'ms' },
    { flag: '🇹🇭', country: 'Thailand',         lang: 'ภาษาไทย',     code: 'th' },
    { flag: '🇮🇱', country: 'ישראל',            lang: 'עברית',       code: 'iw' },
];

// =====================================================
// Motor do Google Translate (invisível)
// =====================================================
function googleTranslateElementInit() {
    if (!document.getElementById('google_translate_element_hidden')) {
        const div = document.createElement('div');
        div.id = 'google_translate_element_hidden';
        div.className = 'skiptranslate';
        div.style.cssText = 'display:none;visibility:hidden;height:0;width:0;overflow:hidden;position:absolute;';
        document.body.appendChild(div);
    }
    new google.translate.TranslateElement({
        pageLanguage: 'pt',
        autoDisplay: false,
        includedLanguages: 'pt,en,es,fr,it,de,ja,zh-CN,ar,ru,nl,sv,no,da,fi,pl,uk,tr,ko,hi,vi,el,hu,cs,id,ms,th,iw'
    }, 'google_translate_element_hidden');
}

function changeLanguage(langCode) {
    const select = document.querySelector('.goog-te-combo');
    if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        
        // Backup: se o script do Google estiver travado, força via cookie e recarrega
        document.cookie = `googtrans=/pt/${langCode}; path=/`;
        document.cookie = `googtrans=/pt/${langCode}; domain=.${location.hostname}; path=/`;
    } else {
        setTimeout(() => changeLanguage(langCode), 500);
    }
}

// =====================================================
// Limpeza leve da UI do Google (roda UMA vez, depois para)
// =====================================================
function vjCleanGoogleUI() {
    const selectors = [
        '.goog-te-banner-frame', '#goog-gt-tt',
        '.goog-te-balloon-frame', '.goog-te-banner'
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
    });
    
    // Assegura que o widget invisível não suma a combo
    const gadget = document.querySelector('.goog-te-gadget');
    if (gadget) gadget.style.display = 'none';

    document.documentElement.style.marginTop = '0';
    document.body && (document.body.style.top = '0');
}

// =====================================================
// Lógica do Modal
// =====================================================
function vjOpenModal() {
    const overlay = document.getElementById('vjLangOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('vjLangSearch')?.focus(), 200);
    }
}

function vjCloseModal() {
    const overlay = document.getElementById('vjLangOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        const search = document.getElementById('vjLangSearch');
        if (search) { search.value = ''; vjFilterLangs(''); }
    }
}

function vjFilterLangs(query) {
    const items = document.querySelectorAll('.vj-lang-item');
    const q = query.toLowerCase();
    items.forEach(item => {
        const text = item.dataset.search || '';
        item.style.display = text.includes(q) ? '' : 'none';
    });
}

function vjSelectLang(code) {
    changeLanguage(code);
    vjCloseModal();
}

// =====================================================
// Inicialização do DOM
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    // Limpa a UI do Google de forma leve — escuta APENAS inserções de novos nós
    // (childList + sem subtree/attributes = muito menos callbacks)
    const observer = new MutationObserver((mutations, obs) => {
        let found = false;
        for (const m of mutations) {
            if (m.addedNodes.length) { found = true; break; }
        }
        if (found) vjCleanGoogleUI();
    });
    observer.observe(document.body, { childList: true });

    // (Div oculta do Google agora é criada na função googleTranslateElementInit para evitar race conditions)

    // Monta o Modal no host (somente na Home)
    const host = document.getElementById('vj-translate-host');
    if (!host) return;

    // Gera os itens da grade
    const gridItems = VJ_LANGUAGES.map(l => `
        <button class="vj-lang-item" data-search="${l.country.toLowerCase()} ${l.lang.toLowerCase()}" onclick="vjSelectLang('${l.code}')">
            <span class="vj-lang-flag">${l.flag}</span>
            <span class="vj-lang-info">
                <span class="vj-lang-country">${l.country}</span>
                <span class="vj-lang-name">${l.lang}</span>
            </span>
        </button>
    `).join('');

    host.innerHTML = `
        <!-- Botão de Abertura -->
        <div class="vj-lang-wrapper">
            <button class="vj-lang-btn" id="vjLangBtn" onclick="vjOpenModal()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span>Idioma</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6"></path>
                </svg>
            </button>
        </div>

        <!-- Modal Overlay -->
        <div class="vj-lang-overlay" id="vjLangOverlay" onclick="if(event.target===this)vjCloseModal()">
            <div class="vj-lang-modal">
                <div class="vj-lang-header">
                    <h2>Escolha seu país / idioma</h2>
                    <button class="vj-lang-close" onclick="vjCloseModal()" aria-label="Fechar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="vj-lang-search-box">
                    <div class="vj-lang-search-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input class="vj-lang-search-input" id="vjLangSearch" type="text" placeholder="Pesquisar um país ou idioma..." oninput="vjFilterLangs(this.value)">
                    </div>
                </div>
                <div class="vj-lang-body">
                    <div class="vj-lang-grid" id="vjLangGrid">
                        ${gridItems}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Fechar com ESC
    document.addEventListener('keydown', e => { if (e.key === 'Escape') vjCloseModal(); });
});
