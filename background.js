/* Proxy cross-origin des jaquettes pour éviter le "tainted canvas" */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg.type !== 'FETCH_BLOB') return;
    fetch(msg.url, { mode: 'cors' })
      .then(r => r.blob())
      .then(b => reply({ ok: true, blobURL: URL.createObjectURL(b) }))
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