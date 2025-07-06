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
};

chrome.storage.sync.get(SETTINGS, stored => {
  Object.assign(SETTINGS, stored);

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
}

function runColorTitles(){
  const done = new WeakSet();
  const SAMPLE = 14;

  const avgRgb = canvas => {
    const d = canvas.getContext('2d',{willReadFrequently:true})
                    .getImageData(0,0,SAMPLE,SAMPLE).data;
    let r=0,g=0,b=0; for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}
    const n=d.length/4; return [r/n,g/n,b/n];
  };
  const enhance = ([r,g,b])=>{
    const fac = 1.2; r*=fac; g*=fac;
    const max=Math.max(r,g,b); if(max>255){r*=255/max;g*=255/max;b*=255/max;}
    return `rgb(${r|0},${g|0},${b|0})`;
  };

  const paint = (img, title) => {
    if (done.has(title)) return;
    chrome.runtime.sendMessage({ type:'FETCH_BLOB', url: img.src }, res => {
      if (!res?.ok) return;
      const tmp = new Image();
      const blobURL = URL.createObjectURL(res.blob);
      tmp.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = SAMPLE;
        c.getContext('2d').drawImage(tmp,0,0,SAMPLE,SAMPLE);
        title.style.color = enhance(avgRgb(c));
        done.add(title);
        URL.revokeObjectURL(blobURL);
      };
      tmp.src = blobURL;
    });
  };

  const selectTitle = n =>
    n.querySelector('a[class^="browse-card__title-link--"]') ||
    n.querySelector('h3[class^="browse-card__title--"],h4[class^="browse-card__title--"]');

  const treat = n => {
    const img = n.querySelector('img'); if (!img) return;
    const title = selectTitle(n); if (!title) return;
    img.complete ? paint(img,title) : img.addEventListener('load',()=>paint(img,title),{once:true});
  };

  const scan = root => root.querySelectorAll?.('article,li,div').forEach(treat);
  scan(document.body);

  new MutationObserver(ms => ms.forEach(m=>m.addedNodes.forEach(scan)))
  .observe(document.body,{childList:true,subtree:true});
}

function runPiP(){
  const waitForEl = (sel, timeout=8000) => new Promise(res=>{
    const t0 = Date.now();
    const tryFind = ()=>{
      const el=document.querySelector(sel);
      if(el) return res(el);
      if(Date.now()-t0>timeout) return res(null);
      requestAnimationFrame(tryFind);
    };
    tryFind();
  });

  const POLL_INTERVAL = 800;
  const getVideo = () => document.querySelector('video');

  const ensureVideoReady = () => new Promise(res => {
    const v = getVideo();
    if (v) return res(v);
    const int = setInterval(() => {
      const vid = getVideo();
      if (vid) { clearInterval(int); res(vid);} }, POLL_INTERVAL);
  });

  const createPiPButton = (video) => {
    if (document.getElementById('bcp-pip-btn')) return;
    /* remove CR restrictions */
    video.disablePictureInPicture = false;
    video.removeAttribute('disablePictureInPicture');

    const btn = document.createElement('button');
    btn.id = 'bcp-pip-btn';
    btn.title = 'Picture-in-Picture (Ctrl+P)';
    btn.className = 'bcp-pip';
    btn.innerHTML = '⧉';
    Object.assign(btn.style, {
      position:'absolute',bottom:'1rem',right:'1rem',zIndex:9999,
      width:'2.5rem',height:'2.5rem',borderRadius:'50%',border:'none',cursor:'pointer',
      background:'var(--cr-accent,#ff8833)',color:'#000',fontSize:'1.2rem',fontWeight:'bold',
      display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 3px 10px rgba(0,0,0,.3)'
    });

    btn.addEventListener('click',e=>{e.stopPropagation();togglePiP(video);});

    const settingsControl = document.getElementById('settingsControl');
    if(settingsControl){
      const container = settingsControl.parentElement; // .r-18u37iz group
      const pipWrapper = settingsControl.firstElementChild.cloneNode(false); // replicate button wrapper
      pipWrapper.id = 'bcp-pip-wrapper';
      pipWrapper.style.backgroundColor = 'rgba(0,0,0,0.6)';
      pipWrapper.appendChild(btn);
      container.insertBefore(pipWrapper, settingsControl); // place before settings btn
      btn.classList.add('bcp-pip-inbar');
      btn.style.background='none';
    }else{
      /* place to top-right as fallback */
      const container = video.parentElement ?? document.body;
      if(getComputedStyle(container).position==='static') container.style.position='relative';
      container.appendChild(btn);
      btn.classList.add('bcp-pip-floating');
    }
  };

  const togglePiP = async (video) => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch(e){console.warn('PiP error',e);}
  };

  const init = async () => {
    const video = await ensureVideoReady();
    await waitForEl('#settingsControl',8000);
    const ensurePiP = ()=>{
      const settingsControl=document.getElementById('settingsControl');
      if(!settingsControl) return;
      let wrapper=document.getElementById('bcp-pip-wrapper');
      const existingBtn=document.getElementById('bcp-pip-btn');
      if(!existingBtn){
        createPiPButton(video);
        return; // will be placed next cycle
      }
      if(!wrapper){
        wrapper=settingsControl.firstElementChild?.cloneNode(false)||document.createElement('div');
        wrapper.id='bcp-pip-wrapper';
        wrapper.style.backgroundColor='rgba(0,0,0,0.6)';
        wrapper.appendChild(existingBtn);
      }
      // Ensure wrapper precedes settingsControl
      const parent=settingsControl.parentElement;
      if(parent && wrapper!==parent.children[parent.children.length-1]){
        parent.insertBefore(wrapper, settingsControl);
      }
      // Ensure btn inside wrapper
      if(existingBtn.parentElement!==wrapper) wrapper.appendChild(existingBtn);
    };
    ensurePiP();
    /* Observe controls container for re-render and ensure PiP persists */
    const controlsParent = document.getElementById('settingsControl')?.parentElement;
    if(controlsParent){
      new MutationObserver(()=>ensurePiP()).observe(controlsParent,{childList:true});
    }

    /* shortcut */
    window.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='p'){e.preventDefault();togglePiP(video);} },{passive:false});

    /* fallback observer on body in case entire controls DOM is rejuvenated */
    new MutationObserver(()=>{
      if(!document.getElementById('bcp-pip-btn')){
        const vid=getVideo(); if(vid) ensurePiP();
      }
    }).observe(document.body,{childList:true,subtree:true});
  };

  /* Ensure controls container present */
  init();
}

/* ---------------- Auto Skip ---------------- */

function setupAutoSkip(video){
  if(!SETTINGS.autoSkip) return;

  const observeSkipBtn=()=>{
    const wrapper=document.querySelector('[data-testid="skipButton"]');
    const btn = wrapper?.querySelector('[role="button"]') || null;
    if(btn){
      btn.click();
      showToast('Intro sautée');
      skipped=true;
    }
  };
  observeSkipBtn();
  new MutationObserver(observeSkipBtn).observe(document.body,{childList:true,subtree:true});

  const OUTRO_START_OFFSET=100;
  let outroSkipped=false, skipped=false;
  video.addEventListener('timeupdate',()=>{
    if(!outroSkipped && video.duration-video.currentTime<OUTRO_START_OFFSET){
      outroSkipped=true; showToast('Outro sautée');
      video.currentTime = video.duration-1;
    }
  });
}

function showToast(msg){
  const t=document.createElement('div');
  t.textContent=msg;
  Object.assign(t.style,{position:'fixed',bottom:'20px',right:'20px',background:'rgba(0,0,0,.8)',padding:'8px 12px',borderRadius:'6px',color:'#fff',zIndex:99999,fontSize:'0.9rem'});
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

/* ---------------- Auto Next ---------------- */
function setupAutoNext(){
  const video=document.querySelector('video');
  if(!video) return;
  video.addEventListener('ended',()=>{
    const nextLink=document.querySelector('a[data-t="next-episode"], a[aria-label*="Prochain"]');
    if(!nextLink) return;
    let countdown=SETTINGS.autoNextDelay;
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-size:1.3rem;z-index:99999';
    const info=document.createElement('div');
    overlay.appendChild(info);
    const cancel=document.createElement('button');
    cancel.textContent='Annuler';
    cancel.style.cssText='margin-top:12px;padding:6px 14px;border:none;border-radius:6px;background:var(--cr-accent,#ff8833);color:#000;font-weight:bold;cursor:pointer;font-size:1rem;';
    overlay.appendChild(cancel);
    document.body.appendChild(overlay);
    const int=setInterval(()=>{
      info.textContent=`Prochain épisode dans ${countdown}s`;
      if(--countdown<0){clearInterval(int);window.location.href=nextLink.href;}
    },1000);
    cancel.onclick=()=>{clearInterval(int);overlay.remove();};
  });
}

function waitForVideo(){
  return new Promise(res=>{const v=document.querySelector('video'); if(v) return res(v);
    const int=setInterval(()=>{const vd=document.querySelector('video'); if(vd){clearInterval(int);res(vd);}},400);});
}

function drawSkipZones(video){
  if(!video.duration || isNaN(video.duration)) video.addEventListener('loadedmetadata',()=>drawSkipZones(video),{once:true});

  const seekContainerSelector='div[role="slider"]>div'; // fallback generic timeline container? We'll query given classes too
  const getTimeline=()=>{
    const edge=document.querySelector('div[style*="height: 16px"][style*="width: 8px"][style*="left: -8px"]');
    return edge?edge.parentElement:null;
  };

  const placeMarkers=()=>{
    const tl=getTimeline(); if(!tl) return false;
    return true;
  };

  if(!placeMarkers()){
    // Observe until timeline appears
    new MutationObserver(()=>placeMarkers()).observe(document.body,{childList:true,subtree:true});
  }
}

/* ---------------- Progress bar recolor ---------------- */
function recolorProgressBar(){
  const STYLE_ID='bcp-progress-style';
  const ensureStyle=(accent)=>{
    let st=document.getElementById(STYLE_ID);
    if(!st){st=document.createElement('style'); st.id=STYLE_ID; document.head.appendChild(st);} 
    st.textContent=`[data-testid="vilos-knob"]{background-color:${accent} !important;}
      [data-testid="vilos-scrub_bar"] .r-6dt33c{background-color:${accent} !important;}`;
  };

  const update=()=>{
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--cr-accent')?.trim()||'#ff8833';
    ensureStyle(accent);
    /* Recolor inline segments (progress/buffer) that have background-color set inline */
    document.querySelectorAll('[data-testid="vilos-scrub_bar"] div').forEach(el=>{
      const bg=el.style.backgroundColor;
      if(bg && /rgb\(255,\s*94,\s*0\)/.test(bg)){
        el.style.backgroundColor=accent;
      }
    });
  };

  update();
  new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['style'],subtree:true});
}

/* ---------------- Loading spinner recolor ---------------- */
function recolorLoading(){
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--cr-accent')?.trim()||'#ff8833';
  document.querySelectorAll('[data-testid="vilos-loading"] path').forEach(p=>{
    const stroke=p.getAttribute('stroke');
    if(stroke && /rgb\(255,\s*94,\s*0\)/.test(stroke)){
      p.setAttribute('stroke',accent);
    }
  });
}
recolorLoading();
new MutationObserver(recolorLoading).observe(document.body,{childList:true,subtree:true});

/* ---------------- Watch time tracker ---------------- */
function setupWatchTracker(){
  const INTERVAL_MS = 10000;
  let last = Date.now();
  setInterval(()=>{
    if(document.hidden){last=Date.now();return;}
    const v=document.querySelector('video');
    if(v && !v.paused && !v.seeking && !v.ended){
      const now=Date.now();
      const diff=Math.floor((now-last)/1000);
      if(diff>0){
        chrome.runtime.sendMessage({type:'WATCH_TICK', seconds: diff});
        last=now;
      }
    }else{
      last=Date.now();
    }
  },INTERVAL_MS);
}

async function renderStatsPage(){
  const mainEl=document.querySelector('main')||document.body;
  if(document.getElementById('bcp-stats-page')){mainEl.scrollIntoView({block:'start'});return;}
  mainEl.innerHTML='';
  const container=document.createElement('div');
  container.id='bcp-stats-page';
  container.style.padding='2rem';
  container.style.maxWidth='800px';
  container.style.margin='0 auto';
  container.style.color='var(--cr-text,#f0f0f0)';
  container.style.textAlign='center';
  container.innerHTML=`<h1 style="font-size:1.8rem;margin-bottom:1rem;color:var(--cr-accent,#ff8833)">BetterCrunchy – Stats</h1>
  <p>Total watch time: <span id="bcpTotalTime">…</span></p>
  <p>Time saved (Smart Skip): <span id="bcpTimeSaved">…</span></p>
  <button id="bcpResetStats" style="margin-top:1rem;padding:8px 18px;border:none;border-radius:8px;background:var(--cr-accent,#ff8833);color:#000;font-weight:bold;cursor:pointer">Reset stats</button>`;
  mainEl.appendChild(container);
  const fmt=s=>{const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return `${h}h ${m}m`;};
  const refresh=()=>chrome.runtime.sendMessage({type:'STAT_REQUEST'},s=>{if(!s)return;document.getElementById('bcpTotalTime').textContent=fmt(s.totalSeconds||0);document.getElementById('bcpTimeSaved').textContent=fmt(s.timeSaved||0);});
  refresh();
  document.getElementById('bcpResetStats').addEventListener('click',()=>chrome.runtime.sendMessage({type:'STAT_RESET'},()=>refresh()));

  const ensureHeaderFooter=async()=>{
    // If both header and footer are already in the DOM, nothing to do
    if(document.querySelector('header, .header-content') && document.querySelector('footer, .footer-container')) return;

    // Utility that tries to fetch an HTML snippet (either from the site root or the packaged fallback file)
    const getHtml = async (url)=>{
      try{const r=await fetch(url); if(r.ok) return await r.text();}catch(e){console.warn('[BCP] fetch failed',url,e);}return null;};

    // 1) Try to grab header/footer from the home page (same locale if present)
    const localePrefix = location.pathname.split('/')[1] || '';
    const homeUrl = localePrefix? `/${localePrefix}/` : '/';
    let html = await getHtml(homeUrl);

    // 2) Fallback to extension-packaged static files if we still don't have markup
    if(!html){
      const headerUrl = chrome.runtime.getURL('crunchyroll-header.html');
      const footerUrl = chrome.runtime.getURL('crunchyroll-footer.html');
      const [headerHtml, footerHtml] = await Promise.all([getHtml(headerUrl), getHtml(footerUrl)]);
      html = `${headerHtml||''}${footerHtml||''}`;
    }
    if(!html) return; // give up

    const dom = new DOMParser().parseFromString(html,'text/html');

    // Insert header if missing
    if(!document.querySelector('header')){
      const hdrNode = dom.querySelector('header');
      if(hdrNode){
        document.body.prepend(hdrNode.cloneNode(true));
      }else{
        const hc = dom.querySelector('.header-content');
        if(hc){
          const wrapper=document.createElement('header');
          wrapper.appendChild(hc.cloneNode(true));
          document.body.prepend(wrapper);
        }
      }
    }

    // Insert footer if missing
    if(!document.querySelector('footer, .footer-container')){
      const ftr = dom.querySelector('footer') || dom.querySelector('.footer-container');
      if(ftr) document.body.appendChild(ftr.cloneNode(true));
    }
  };
  await ensureHeaderFooter();

  // ---- Header simplifié pour la page Stats ----
  (async function addSimpleHeader(){
    // Supprime tous les headers BetterCrunchy précédents et ceux de Crunchyroll
    document.querySelectorAll('header,#bcp-simple-header').forEach(h=>h.remove());

    // Crée un header minimal (on utilise un div pour éviter les règles CSS hostiles)
    const hdr=document.createElement('div');
    hdr.id='bcp-simple-header';
    hdr.style.cssText='width:100%;padding:0.5rem 0;margin-top:1rem;background:transparent;z-index:9999;display:flex;justify-content:center;';

    const link=document.createElement('a');
    link.href='https://www.crunchyroll.com';
    link.style.cssText='display:inline-block;height:40px;text-decoration:none;';

    // SVG horizontal Crunchyroll – version statique fiable
    const STATIC_SVG=`<svg class="logo-icon logo-scalable-horizontal" fill="var(--cr-accent,#ff8833)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 303 52" aria-hidden="true" role="img"><path d="M62.177 26.065c0-8.685 7.01-15.695 15.695-15.695 6.332 0 11.397 3.527 13.974 8.638l-6.422 3.166c-1.356-2.895-4.116-5.065-7.553-5.065-4.704 0-8.549 3.891-8.549 8.956s3.845 9.002 8.549 9.002c3.437 0 6.197-2.17 7.553-5.065l6.422 3.166c-2.577 5.112-7.642 8.638-13.974 8.638-8.685 0-15.695-7.01-15.695-15.694Zm32.16-7.328h6.739v3.662c1.221-2.306 3.12-3.662 5.429-3.662h1.899v6.65h-2.217c-3.212 0-4.704 1.763-4.704 4.886v11.08h-7.147v-22.616Zm16.416 12.936v-12.936h7.146v12.936c0 2.488 1.584 4.027 3.98 4.027 2.395 0 3.98-1.539 3.98-4.027v-12.936h7.146v12.936c0 6.015-4.705 10.131-11.126 10.131-6.422 0-11.126-4.116-11.126-10.131Zm25.649-12.936h7.01v2.759c1.585-1.81 3.798-2.985 6.379-2.985 5.518 0 9.137 4.026 9.137 9.816v13.025h-7.147v-13.025c0-2.398-1.763-4.208-4.115-4.208-2.353 0-4.115 1.81-4.115 4.208v13.025h-7.149v-22.625Zm42.288 13.388 5.835 2.759c-1.855 4.069-5.879 6.92-10.766 6.92-6.603 0-11.897-5.247-11.897-11.761 0-6.514 5.294-11.761 11.897-11.761 4.93 0 8.956 2.895 10.812 6.965l-5.879 2.806c-.768-2.081-2.67-3.527-4.93-3.527-2.984 0-5.247 2.442-5.247 5.519s2.263 5.519 5.247 5.519c2.217 0 4.116-1.403 4.93-3.438Zm8.141-21.303h7.146v10.63c1.585-1.81 3.756-2.942 6.244-2.942 5.518 0 9.138 4.026 9.138 9.816v13.025h-7.146v-13.025c0-2.398-1.764-4.208-4.116-4.208-2.353 0-4.115 1.81-4.115 4.208v13.025h-7.151v-30.529Zm35.505 21.392 4.794-13.478h7.147l-9.137 23.972c-1.899 4.976-4.886 7.1-9.952 7.1h-3.255v-6.243h3.255c1.947 0 2.942-.814 3.485-2.17l-9.002-22.659h7.643l4.978 13.478Zm13.75-13.478h6.739v3.662c1.221-2.306 3.12-3.662 5.429-3.662h1.899v6.65h-2.217c-3.213 0-4.705 1.763-4.705 4.886v11.08h-7.145v-22.616Zm15.063 11.308c0-6.468 5.294-11.761 11.987-11.761 6.693 0 11.987 5.293 11.987 11.761 0 6.468-5.294 11.762-11.987 11.762-6.693 0-11.987-5.247-11.987-11.762Zm7.651 0c0 3.166 2.352 5.518 5.336 5.518 2.984 0 5.336-2.352 5.336-5.518 0-3.166-2.352-5.518-5.336-5.518-2.984 0-5.336 2.352-5.336 5.518Zm25.573 11.307c-5.924 0-8.366-2.624-8.366-8.232v-22.298h7.146v22.298c0 1.267.543 1.991 1.81 1.991h1.174v6.241h-1.764Zm12.039 0c-5.925 0-8.367-2.624-8.367-8.232v-22.298h7.146v22.298c0 1.267.543 1.991 1.81 1.991h1.174v6.241h-1.764Zm-290.55-12.23c.013-11.65 9.468-21.086 21.119-21.073 11.154.01 20.276 8.677 21.023 19.637.027-.466.042-.94.042-1.412C50.013 10.77 39.279.014 26.023 0 12.767-.014 2.013 10.721 1.999 23.976c-.014 13.254 10.721 24.011 23.976 24.024.549 0 1.092-.018 1.629-.053-11.051-.677-19.8-9.857-19.788-21.077Zm32.568.312c-4.528-.003-8.197-3.68-8.19-8.209.003-3.55 2.267-6.57 5.426-7.708a17.924 17.924 0 0 0-8.374-2.073c-9.95-.01-18.023 8.047-18.032 17.995-.01 9.949 8.047 18.022 17.995 18.032 9.949.01 18.022-8.047 18.032-17.996 0-1.128-.103-2.23-.301-3.302-1.498 1.982-3.875 3.265-6.554 3.262Z"/></svg>`;

    // Ajoute le SVG statique pour garantir l'affichage immédiat
    link.innerHTML = STATIC_SVG;

    hdr.appendChild(link);
    document.body.prepend(hdr);
  })();

  /* Ensure our stats markup persists against framework re-renders */
  const statsEl=document.getElementById('bcp-stats-page');
  if(statsEl){
    new MutationObserver(()=>{
      if(!document.body.contains(statsEl)) renderStatsPage();
    }).observe(document.body,{childList:true,subtree:true});
  }
}

/* ---------- Stats header link ---------- */
function addStatsHeaderLink(){
  if(/\/bettercrunchy\/stats$/.test(location.pathname)) return; // pas sur nos pages interne
  const createLink=()=>{
    if(document.querySelector('.bcp-stats-link')) return;
    const ext=document.querySelector('.header-external-links');
    if(!ext) return;
    const a=document.createElement('a');
    a.href='/bettercrunchy/stats';
    a.textContent='Stats';
    a.className='erc-header-tile bcp-stats-link';
    a.style.marginLeft='1rem';
    a.style.color='var(--cr-accent,#ff8833)';
    a.style.fontWeight='600';
    a.style.textDecoration='none';
    // insert after news menu dropdown
    const newsMenu=ext.querySelector('.erc-news-menu');
    if(newsMenu && newsMenu.nextSibling){ext.insertBefore(a, newsMenu.nextSibling);} else ext.appendChild(a);
    a.addEventListener('click',e=>{e.preventDefault();history.pushState(null,'','/bettercrunchy/stats');renderStatsPage();});
  };
  createLink();
  new MutationObserver(()=>createLink()).observe(document.body,{childList:true,subtree:true});
}

/*
 * Déplace le conteneur "prev-next-episodes" sur le côté du lecteur vidéo.
 * On attend que le player et le conteneur cible soient dispos, puis on adapte le layout.
 */
function runPrevNextSidebar(){
  const STYLE_ID = 'bcp-prevnext-style';
  const WRAPPER_ID = 'bcp-prevnext';

  /* Injecte le CSS une seule fois */
  const injectCss = ()=>{
    if(document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      /* --- BetterCrunchy Prev/Next Sidebar --- */
      #${WRAPPER_ID}{
        display:flex;
        flex-direction:column;
        gap:1rem;
        max-width:340px;
      }

      /* Empile les cartes verticalement */
      #${WRAPPER_ID} .prev-next-episodes,
      #${WRAPPER_ID} .erc-watch-more-episodes,
      #${WRAPPER_ID} .videos-wrapper{
        display:flex !important;
        flex-direction:column !important;
        gap:1rem !important;
      }

      /* Petit écran: le bloc repasse sous le player */
      @media(max-width: 1000px){
        #${WRAPPER_ID}{
          max-width:none;
          width:100%;
          margin:1.5rem 0 0 0;
        }
      }
    `;
    document.head.appendChild(st);
  };

  const findTarget = () =>
    document.querySelector('.collapsed-section') ||
    document.querySelector('.videos-wrapper') ||
    document.querySelector('.erc-watch-more-episodes') ||
    document.querySelector('.prev-next-episodes');

  const findPlayerRoot = () => {
    // 1) Ids connus
    return document.getElementById('vilos') ||
           document.querySelector('div[data-testid="video-player"]') ||
           document.getElementById('velocity-player-package') ||
           document.getElementById('vilosRoot') ||
           // 2) via #settingsControl (même logique que runPiP)
           (function(){
              const sc = document.getElementById('settingsControl');
              return sc ? sc.parentElement?.parentElement : null;
           })() ||
           // 3) dernier recours : parent du <video>
           document.querySelector('video')?.parentElement;
  };

  const tryRelocate = () => {
    const target = findTarget();
    if(!target) return;

    const playerRoot = findPlayerRoot();
    if(!playerRoot) return;

    if(document.getElementById(WRAPPER_ID)) return;

    const wrapper = document.createElement('div');
    wrapper.id = WRAPPER_ID;
    wrapper.style.marginLeft = '2rem';

    target.style.margin = '0';
    target.style.width = 'auto';

    wrapper.appendChild(target);

    const commonParent = playerRoot.parentElement;
    if(!commonParent) return;
    if(getComputedStyle(commonParent).display !== 'flex'){
      commonParent.style.display = 'flex';
      commonParent.style.alignItems = 'flex-start';
      commonParent.style.gap = '1rem';
    }

    commonParent.insertBefore(wrapper, playerRoot.nextSibling);

    injectCss();
  };

  // Tentative initiale + observer pour les modifs dynamiques
  tryRelocate();
  const obs = new MutationObserver(tryRelocate);
  obs.observe(document.body, { childList:true, subtree:true });
}