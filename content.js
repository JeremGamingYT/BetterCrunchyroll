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
      tmp.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = SAMPLE;
        c.getContext('2d').drawImage(tmp,0,0,SAMPLE,SAMPLE);
        title.style.color = enhance(avgRgb(c));
        done.add(title);
        URL.revokeObjectURL(res.blobURL);
      };
      tmp.src = res.blobURL;
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