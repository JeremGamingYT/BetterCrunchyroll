/* BetterCrunchy – early preload for internal pages
 * Injected at document_start to avoid server-side 404 markup flashing.
 */
(function(){
  const isStatsPage = ()=> decodeURIComponent(location.href).includes('/bettercrunchy/stats');
  if(!isStatsPage()) return;

  // Replace incoming 404 HTML with a minimal shell; our main content script will fill it in later.
  document.open();
  document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>BetterCrunchy – Stats</title><style>body{margin:0;background:#0b0b12;color:#f0f0f0;font-family:Inter,Arial,Helvetica,sans-serif}</style></head><body></body></html>`);
  document.close();

  // Inject Crunchyroll default CSS so cloned header/footer are properly styled
  const cssFiles=[
    'Crunchyroll Default Files/346dc578e470de46.css',
    'Crunchyroll Default Files/e97e7874a8d765b8.css'
  ];
  cssFiles.forEach(p=>{
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=chrome.runtime.getURL(p);
    document.head.appendChild(link);
  });
})(); 