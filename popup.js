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
  pipDraggable: false,
  enabled: true
};

document.addEventListener('DOMContentLoaded',()=>{
  initPopup();
});

function lighten(hex,percent=.3){const h=hex.replace('#','');if(h.length!==6)return hex;const n=parseInt(h,16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;r=Math.min(255,Math.round(r+(255-r)*percent));g=Math.min(255,Math.round(g+(255-g)*percent));b=Math.min(255,Math.round(b+(255-b)*percent));return`#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1)}`}
function setHeaderGradient(col){const lighter=lighten(col,.4);document.querySelector('header').style.background=`linear-gradient(135deg,${col} 0%,${lighter} 100%)`;document.documentElement.style.setProperty('--accent',col);}

function initPopup(){
  // ----------- Chargement des paramètres -----------
  chrome.storage.sync.get(DEF, cfg => {
    // $('radius').value          = cfg.radius;
    $('colorTitles').checked   = cfg.colorTitles;
    $('autoHideHeader').checked= cfg.autoHideHeader;
    $('accentColor').value     = cfg.accentColor;
    $('theme').value           = cfg.theme;
    // $('font').value            = cfg.font;
    $('autoSkip').checked      = cfg.autoSkip;
    $('autoNext').checked      = cfg.autoNext;
    $('autoNextDelay').value   = cfg.autoNextDelay;
    $('delayLabel').textContent= cfg.autoNextDelay;
    $('extEnabled').checked    = cfg.enabled;

    // apply accent and radius to popup itself
    document.documentElement.style.setProperty('--accent', cfg.accentColor);
    document.documentElement.style.setProperty('--radius', cfg.radius+'px');
    setHeaderGradient(cfg.accentColor);
  });

  // ---------- Helpers ----------
  const queryCrunchyTabs = cb => chrome.tabs.query({url: '*://*.crunchyroll.com/*'}, cb);

  const updateRootVariable = (cssFragment) => {
    queryCrunchyTabs(tabs => {
      tabs.forEach(t => chrome.scripting.insertCSS({ target: {tabId: t.id}, css: `:root{${cssFragment}}` }));
    });
  };

  // ---------- Listeners ----------
  // radius slider removed
  /*
  $('radius').addEventListener('input', e => {
    const v = +e.target.value;
    updateRootVariable(`--cr-radius:${v}px!important;--cr-img-radius:${v-4}px!important;`);
    chrome.storage.sync.set({ radius: v });
  });
  */

  $('colorTitles').addEventListener('change', e => chrome.storage.sync.set({ colorTitles: e.target.checked }));

  $('autoHideHeader').addEventListener('change', e => chrome.storage.sync.set({ autoHideHeader: e.target.checked }));

  $('accentColor').addEventListener('input', e => {
    const val = e.target.value;
    updateRootVariable(`--cr-accent:${val}!important;`);
    setHeaderGradient(val);
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

  // ----------- Save page (screenshot) -----------
  $('savePage').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'SAVE_PAGE' }));

  // ----- Auto-Skip -----
  $('autoSkip').addEventListener('change', e => chrome.storage.sync.set({ autoSkip: e.target.checked }));

  // ----- Auto-Next -----
  $('autoNext').addEventListener('change', e => {
    chrome.storage.sync.set({ autoNext: e.target.checked });
    toggleDelay();
  });

  $('autoNextDelay').addEventListener('input', e => {
    $('delayLabel').textContent = e.target.value;
    chrome.storage.sync.set({ autoNextDelay: +e.target.value });
  });

  // ----- Enable / Disable extension -----
  $('extEnabled').addEventListener('change', e => {
    const enabled = e.target.checked;
    chrome.storage.sync.set({ enabled });
    // Recharge les onglets Crunchyroll pour appliquer immédiatement
    queryCrunchyTabs(tabs => {
      tabs.forEach(t => chrome.tabs.reload(t.id));
    });
  });

  // hide delay row toggle
  const toggleDelay=()=>{$('autoNextDelayRow').style.display=$('autoNext').checked?'flex':'none';};
  toggleDelay();

  // ----------- Test notification ----------
  if(document.getElementById('testEpisodeNotif')){
    document.getElementById('testEpisodeNotif').addEventListener('click',()=>{
      chrome.runtime.sendMessage({type:'TEST_NOTIFICATION'});
    });
  }

  /* ---------- Stats ---------- */
  function fmt(sec){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return `${h}h ${m}m`;}
  function refreshStats(){
    chrome.runtime.sendMessage({type:'STAT_REQUEST'}, stats=>{
      if(stats && document.getElementById('statTime')){
        document.getElementById('statTime').textContent = fmt(stats.totalSeconds||0);
      }
    });
  }
  refreshStats();
  const simBtn=document.getElementById('statSimulate');
  if(simBtn) simBtn.addEventListener('click',()=>{chrome.runtime.sendMessage({type:'STAT_SIMULATE'}, stats=>{if(stats) document.getElementById('statTime').textContent=fmt(stats.totalSeconds);} );});
  const resetBtn=document.getElementById('statReset');
  if(resetBtn) resetBtn.addEventListener('click',()=>{chrome.runtime.sendMessage({type:'STAT_RESET'}, stats=>{if(stats) document.getElementById('statTime').textContent=fmt(stats.totalSeconds);} );});
}