// Tabs + Search (UI only) – moved from inline to satisfy CSP
(function(){
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const setTab = id => {
    tabs.forEach(t=>t.setAttribute('aria-selected', String(t.dataset.tab===id)));
    panels.forEach(p=>p.classList.toggle('active', p.dataset.panel===id));
  };
  tabs.forEach(t=>t.addEventListener('click', ()=> setTab(t.dataset.tab)));
  document.querySelectorAll('.pill[data-jump]').forEach(b=>b.addEventListener('click',()=> setTab(b.dataset.jump)));
  setTab('tweaks');

  // Search filter
  const q = document.getElementById('searchInput');
  if(q){
    q.addEventListener('input', ()=>{
      const s = q.value.trim().toLowerCase();
      panels.forEach(p=>{
        if(!s){ p.style.display = p.classList.contains('active')? 'block':'none'; return; }
        p.style.display = 'block';
        Array.from(p.querySelectorAll('.row')).forEach(r=>{
          const text = r.innerText.toLowerCase();
          r.style.display = text.includes(s) ? 'flex' : 'none';
        });
      });
    });
  }
})();
