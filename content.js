/* BetterCrunchy PLUS – logique JS */

const SETTINGS = {
  colorTitles: true,
  autoHideHeader: true,
  accentColor: '#ff8833',
  radius: 16,
  font: 'Inter',
  autoSkip: false,
  autoNext: false,
  autoNextDelay: 5,
  enabled: true,
};

const CSS_LINK_ID = 'bcp-style';

function ensureCssInjected(enabled){
  const existing = document.getElementById(CSS_LINK_ID);
  if(enabled && !existing){
    const href = chrome.runtime.getURL('content.css');
    const link = document.createElement('link');
    link.id = CSS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    document.documentElement.appendChild(link);
  }
  if(!enabled && existing){
    existing.remove();
  }
}

// Initial load of settings
chrome.storage.sync.get(SETTINGS, stored => {
  Object.assign(SETTINGS, stored);

  // Inject or remove our CSS according to the enabled flag
  ensureCssInjected(SETTINGS.enabled);

  // Si l'extension est désactivée, on sort immédiatement
  if (!SETTINGS.enabled) {
    // Retire la feuille de variables racine si elle existe
    const vars = document.getElementById('bcp-root-vars');
    if (vars) vars.remove();
    console.log('[BetterCrunchy] Extension désactivée via les paramètres.');
    return;
  }

  /* Utility to lighten a hex color */
  function lighten(hex, percent=0.3){
    const h = hex.replace('#','');
    if(h.length!==6) return hex;
    const num=parseInt(h,16);
    let r=(num>>16)&0xFF,g=(num>>8)&0xFF,b=num&0xFF;
    r = Math.min(255, Math.round(r + (255-r)*percent));
    g = Math.min(255, Math.round(g + (255-g)*percent));
    b = Math.min(255, Math.round(b + (255-b)*percent));
    return `#${(1<<24 | (r<<16) | (g<<8) | b).toString(16).slice(1)}`;
  }

  const accentLight = lighten(SETTINGS.accentColor,0.35);
  /* Apply root-level CSS variables for accent color, radius and font */
  const style = document.createElement('style');
  style.id = 'bcp-root-vars';
  style.textContent = `:root{--cr-accent:${SETTINGS.accentColor}!important;--cr-accent-light:${accentLight}!important;--cr-radius:${SETTINGS.radius}px!important;--cr-img-radius:${SETTINGS.radius-4}px!important;--cr-font:'${SETTINGS.font}',sans-serif!important;}`;
  document.head.appendChild(style);

  initFeatures();
  recolorProgressBar();
});

/* Listen for runtime enable/disable toggle */
chrome.storage.onChanged.addListener((changes, area)=>{
  if(area==='sync' && changes.enabled){
    const enabled = changes.enabled.newValue;
    ensureCssInjected(enabled);
    if(enabled){
      // Re-enable: reload to re-inject scripts and styles
      window.location.reload();
      return;
    }
    // Disable: remove injected styles and cleanup
    document.getElementById('bcp-root-vars')?.remove();
    console.log('[BetterCrunchy] Extension disabled (runtime). Cleaned up.');
  }
});

function initFeatures(){
  /* ---------- Auto-hide header ---------- */
  let lastY = 0;
  if (SETTINGS.autoHideHeader) {
    window.addEventListener('scroll', () => {
      if (scrollY > 80 && scrollY > lastY) document.body.classList.add('bcp--scrolled');
      else document.body.classList.remove('bcp--scrolled');
      lastY = scrollY;
    }, { passive: true });
  }

  /* ---------- Couleur dynamique des titres ---------- */
  if (SETTINGS.colorTitles) {
    runColorTitles();
  }

  /* ---------- Picture-in-Picture toggle (v2) ---------- */
  runPiP();

  if(SETTINGS.autoNext){
    setupAutoNext();
  }

  if(SETTINGS.autoSkip){
    waitForVideo().then(v=>setupAutoSkip(v));
  }

  /* ---------------- Watch time tracker ---------------- */
  setupWatchTracker();

  /* 
   * -------------------------------------------------------
   * BetterCrunchy internal pages (e.g. /bettercrunchy/stats)
   * -------------------------------------------------------
   */
  const isStatsURL = ()=> {
    const href = decodeURIComponent(location.href);
    if(href.includes('/bettercrunchy/stats')) return true;
    // Fallback: Crunchyroll 404 route but page <head> contains alternate links to our stats URL
    return !!document.querySelector('head link[href*="/bettercrunchy/stats"]');
  };
  if(isStatsURL()){
    renderStatsPage();
    // ensure visible URL is correct
    if(!location.pathname.includes('/bettercrunchy/stats')){
      history.replaceState(null,'','/bettercrunchy/stats');
    }
    return;
  }

  /* ---------- Stats header link ---------- */
  addStatsHeaderLink();

  // add pop/replace state listeners
  ['popstate','pushstate','replacestate'].forEach(evt=>{
    window.addEventListener(evt,()=>{ if(isStatsURL()) renderStatsPage(); });
  });

  // Patch history API to emit events we can listen to
  (()=>{
    const emit=type=>window.dispatchEvent(new Event(type));
    ['pushState','replaceState'].forEach(fn=>{
      const orig=history[fn];
      history[fn]=function(...a){const r=orig.apply(this,a);emit(fn.toLowerCase());return r;};
    });
  })();

  /* ---------- Repositionnement Prev/Next Episodes ---------- */
  runPrevNextSidebar();
  runDomModDemo(); // Ajout de la démo
  runSeasonHeaderMarginToggle();
}

// ... rest of the file unchanged ...
