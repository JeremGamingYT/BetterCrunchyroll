const $ = id => document.getElementById(id);

const DEF = {
  radius: 16,
  colorTitles: true,
  autoHideHeader: true,
  accentColor: '#ff8833',
  theme: 'default',
  font: 'Inter',
  autoSkip: false,
  autoNext: false,
  autoNextDelay: 5,
  pipDraggable: false
};

document.addEventListener('DOMContentLoaded',()=>{
  initPopup();
});

function initPopup(){
  // ----------- Chargement des paramètres -----------
  chrome.storage.sync.get(DEF, cfg => {
    $('radius').value          = cfg.radius;
    $('colorTitles').checked   = cfg.colorTitles;
    $('autoHideHeader').checked= cfg.autoHideHeader;
    $('accentColor').value     = cfg.accentColor;
    $('theme').value           = cfg.theme;
    $('font').value            = cfg.font;
    $('autoSkip').checked      = cfg.autoSkip;
    $('autoNext').checked      = cfg.autoNext;
    $('autoNextDelay').value   = cfg.autoNextDelay;
    $('delayLabel').textContent= cfg.autoNextDelay;
    $('pipDraggable').checked  = cfg.pipDraggable;

    // apply accent and radius to popup itself
    document.documentElement.style.setProperty('--accent', cfg.accentColor);
    document.documentElement.style.setProperty('--radius', cfg.radius+'px');
  });

  // ---------- Helpers ----------
  const queryCrunchyTabs = cb => chrome.tabs.query({url: '*://*.crunchyroll.com/*'}, cb);

  const updateRootVariable = (cssFragment) => {
    queryCrunchyTabs(tabs => {
      tabs.forEach(t => chrome.scripting.insertCSS({ target: {tabId: t.id}, css: `:root{${cssFragment}}` }));
    });
  };

  // ---------- Listeners ----------
  $('radius').addEventListener('input', e => {
    const v = +e.target.value;
    updateRootVariable(`--cr-radius:${v}px!important;--cr-img-radius:${v-4}px!important;`);
    chrome.storage.sync.set({ radius: v });
  });

  $('colorTitles').addEventListener('change', e => chrome.storage.sync.set({ colorTitles: e.target.checked }));

  $('autoHideHeader').addEventListener('change', e => chrome.storage.sync.set({ autoHideHeader: e.target.checked }));

  $('accentColor').addEventListener('input', e => {
    const val = e.target.value;
    updateRootVariable(`--cr-accent:${val}!important;`);
    chrome.storage.sync.set({ accentColor: val });
  });

  $('theme').addEventListener('change', e => {
    const th = e.target.value;
    // simple prototype: inject body background color override
    const themeCss = {
      default: '',
      dark: 'body{background:#000!important;color:#fff!important;}',
      light: 'body{background:#f7f7f7!important;color:#000!important;}'
    }[th];
    queryCrunchyTabs(tabs=>{
      tabs.forEach(t=>{
        if(themeCss)
          chrome.scripting.insertCSS({target:{tabId:t.id}, css: themeCss});
      });
    });
    chrome.storage.sync.set({ theme: th });
  });

  $('font').addEventListener('change', e => {
    const font = e.target.value;
    const importUrl = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}:wght@400;600&display=swap`;
    queryCrunchyTabs(tabs => {
      tabs.forEach(t => {
        chrome.scripting.executeScript({
          target:{tabId:t.id},
          func: (url,f) => {
            if(!document.getElementById('bcp-font-link')){
              const l=document.createElement('link');l.id='bcp-font-link';l.rel='stylesheet';l.href=url;document.head.appendChild(l);
            }else{document.getElementById('bcp-font-link').href=url;}
            /* update CSS var */
            const st=document.getElementById('bcp-font-style')||(()=>{const s=document.createElement('style');s.id='bcp-font-style';document.head.appendChild(s);return s;})();
            st.textContent=`:root{--cr-font:'${f}',sans-serif!important;}`;
          },
          args:[importUrl,font]
        });
      });
    });
    chrome.storage.sync.set({ font });
  });

  // ----------- Save page (screenshot) -----------
  $('savePage').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'SAVE_PAGE' }));

  // ----- Auto-Skip -----
  $('autoSkip').addEventListener('change', e => chrome.storage.sync.set({ autoSkip: e.target.checked }));

  // ----- Auto-Next -----
  $('autoNext').addEventListener('change', e => chrome.storage.sync.set({ autoNext: e.target.checked }));

  $('autoNextDelay').addEventListener('input', e => {
    $('delayLabel').textContent = e.target.value;
    chrome.storage.sync.set({ autoNextDelay: +e.target.value });
  });
}