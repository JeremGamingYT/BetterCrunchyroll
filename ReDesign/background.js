/* Proxy cross-origin des jaquettes pour éviter le "tainted canvas" */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg.type !== 'FETCH_BLOB') return;
    fetch(msg.url, { mode: 'cors' })
      .then(r => r.blob())
      .then(b => reply({ ok: true, blob: b }))
      .catch(() => reply({ ok: false }));
    return true;           // async
});  

/* —— Sauvegarde de la page courante ———————————————— */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type !== 'SAVE_PAGE') return;

  // Récupère l'onglet actif
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs.length) return;
    const tabId = tabs[0].id;

    // Exécute du code dans l'onglet pour obtenir le HTML complet
    const run = (tId, fn) => {
      if (chrome.scripting && typeof chrome.scripting.executeScript === 'function') {
        return chrome.scripting.executeScript({ target: { tabId: tId }, func: fn });
      }
      if (chrome.tabs && typeof chrome.tabs.executeScript === 'function') {
        return new Promise((resolve, reject) => {
          chrome.tabs.executeScript(tId, { code: '(' + fn.toString() + ')()' }, res => {
            const err = chrome.runtime.lastError;
            if (err) reject(err);
            else resolve([{ result: res[0] }]);
          });
        });
      }
      // Aucun moyen d'exécuter du code sur l'onglet
      return Promise.reject(new Error('Aucune API scripting disponible'));
    };

    run(tabId, () => document.documentElement.outerHTML).then(([{ result: html }]) => {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const filename = `crunchyroll_page_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;

      chrome.downloads.download({ url, filename, saveAs: true }, () => {
        // Libère l'URL après 1 min.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      });
    });
  });

  return true; // Indique que la réponse est asynchrone
});  

/* —— Notifications Nouveaux Épisodes ———————————————— */
const FEED_URL = 'https://www.crunchyroll.com/simulcastcalendar';
const CHECK_INTERVAL_MIN = 30; // fréquence de vérification
const STORAGE_KEY = 'seenEpisodes';

// Création de l'alarme au démarrage / installation (vérif existence chrome.alarms)
function initEpisodeAlarm(){
  if(!chrome.alarms){
    console.warn('chrome.alarms API non disponible');
    return;
  }
  chrome.alarms.create('checkEpisodes', { periodInMinutes: CHECK_INTERVAL_MIN });
}
chrome.runtime.onInstalled.addListener(initEpisodeAlarm);
chrome.runtime.onStartup.addListener(initEpisodeAlarm);

if(chrome.alarms && chrome.alarms.onAlarm){
  chrome.alarms.onAlarm.addListener(alarm=>{
    if(alarm.name==='checkEpisodes') checkNewEpisodes();
  });
}

async function checkNewEpisodes(){
  try {
    const res = await fetch(FEED_URL);
    const html = await res.text();
    // extrait tous les liens /watch/XYZ
    const matches = [...html.matchAll(/href=["'](\/watch\/[^"']+)["']/g)].map(m=>m[1]);
    if(!matches.length) return;
    // récupère la liste cache
    chrome.storage.local.get({ [STORAGE_KEY]: [] }, data => {
      const seen = new Set(data[STORAGE_KEY]);
      const newOnes = matches.filter(m=>!seen.has(m));
      if(newOnes.length){
        // met à jour le cache et tronque si trop grand
        const updated = [...seen, ...newOnes];
        chrome.storage.local.set({ [STORAGE_KEY]: updated.slice(-500) });
        // notification + badge
        notifyNewEpisodes(newOnes.length);
      }
    });
  }catch(e){
    console.error('BetterCrunchy episode check failed', e);
  }
}

function notifyNewEpisodes(count){
  const title = 'New episodes on Crunchyroll!';
  const message = count === 1 ? '1 new episode just dropped.' : `${count} new episodes just dropped.`;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/logo.png',
    title, message,
    silent: true
  });
  chrome.action.setBadgeBackgroundColor({ color: '#ff8833' });
  chrome.action.setBadgeText({ text: String(count) });
  // remet le badge à vide après 1 min
  setTimeout(()=>chrome.action.setBadgeText({ text: '' }), 60_000);
}

chrome.runtime.onMessage.addListener((msg, sender, reply)=>{
  switch(msg.type){
    case 'TEST_NOTIFICATION':
      notifyNewEpisodes(1);
      break;
    case 'WATCH_TICK':{
      const add = msg.seconds||0;
      chrome.storage.local.get({stats:{totalSeconds:0,timeSaved:0}}, data=>{
        const stats=data.stats; stats.totalSeconds=(stats.totalSeconds||0)+add;
        if(stats.timeSaved===undefined) stats.timeSaved=0;
        chrome.storage.local.set({stats});
      });
      break;}
    case 'STAT_REQUEST':{
      chrome.storage.local.get({stats:{totalSeconds:0}}, data=>{reply(data.stats);});
      return true;}
    case 'STAT_RESET':{
      chrome.storage.local.set({stats:{totalSeconds:0}}, ()=>reply({totalSeconds:0}));
      return true;}
    case 'STAT_SIMULATE':{
      chrome.storage.local.get({stats:{totalSeconds:0}}, data=>{
        data.stats.totalSeconds+=300;
        chrome.storage.local.set({stats:data.stats}, ()=>reply(data.stats));
      });
      return true;}
  }
});  