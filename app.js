// Clean navigation & tiles handler (2025-11-09)
(function(){
  const grid = document.getElementById('group-grid');
  const covers = window.__COVERS__ || {};

  // Render tiles only if grid is empty (keeps static markup if present)
  if(grid && grid.children.length === 0){
    Object.keys(covers).sort().forEach(name=>{
      const el = document.createElement('a');
      el.href = '#price';
      el.className = 'tile';
      el.setAttribute('data-search', name);
      try{
        var _p = (window.__resolvePage ? window.__resolvePage(name) : 1);
        if(Number.isFinite(_p) && _p>0) el.setAttribute('data-page', String(_p));
      }catch(_){} 
      el.setAttribute('data-search', name);
      el.innerHTML = '<img loading="lazy" src="'+covers[name]+'" alt="'+name+'"><div class="name">'+name+'</div>';
      grid.appendChild(el);
    });
  }

  const pdf = document.getElementById('pdf-view');
  if(!pdf) return;

  const MAP = (window.__getPageMap ? window.__getPageMap() : (window.__PAGE_MAP__||{}));
  const TOTAL = Math.max(0, ...Object.values(MAP).map(v=>parseInt(v,10)).filter(Number.isFinite)) || 999;
  let currentPage = 1;

  function setPdfPage(page){
    currentPage = page;
    window.__setPdfHard(currentPage);
    const priceEl = document.getElementById('price');
    if(priceEl) priceEl.scrollIntoView({behavior:'smooth'});
  }

  window.openPage = function(page){
    page = parseInt(page, 10);
    if(!Number.isFinite(page) || page < 1) page = 1;
    if(page > TOTAL) page = TOTAL;
    setPdfPage(page);
  };

  // Tile clicks -> mapped page
  if(grid){
    grid.addEventListener('click', function(e){
      const a = e.target.closest('a.tile');
      if(!a) return;
      e.preventDefault();
      e.stopPropagation();
      const name = a.getAttribute('data-search');
      window.openPage(window.__resolvePage(name));
    });
  }

  // Prev/Next buttons
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  if(prevBtn){
    prevBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); window.openPage((currentPage||1)-1); });
  }
  if(nextBtn){
    nextBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); window.openPage((currentPage||1)+1); });
  }
})();

// Smooth scroll for anchor links, but ignore when inside #group-grid or .pdf-toolbar
document.addEventListener('click', function(e){
  if(e.target.closest('#group-grid, .pdf-toolbar')) return; // let our handlers run
  const a = e.target.closest('a[href^="#"]');
  if(a && /#price&page=\d+/i.test(a.getAttribute('href')||'')) return;
  if(a && /#price&page=\d+/i.test(a.getAttribute('href'))) return;
  if(!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if(el){
    e.preventDefault();
    el.scrollIntoView({behavior:'smooth'});
  }
}, {passive:false});

// === Force reload PDF by recreating <object> (blank-fix) — 2025-11-09 ===
(function(){
  const getObj = () => document.getElementById('pdf-view');
  window.__setPdfHard = function(page){
    const old = getObj();
    if(!old) return;
    const parent = old.parentNode;
    const cls = old.className;
    const newObj = document.createElement('object');
    newObj.id = 'pdf-view';
    newObj.name = 'viewer';
    newObj.type = 'application/pdf';
    newObj.className = cls;
    newObj.setAttribute('data', 'gratan_price.pdf#page='+page+'&view=FitH');
    try{
      parent.replaceChild(newObj, old);
    }catch(e){
      // fallback: append after removing
      old.remove();
      parent.appendChild(newObj);
    }
  };
})();

// === PAGE MAP overrides & editor (2025-11-09) ===
(function(){
  const KEY = 'PAGE_MAP_USER';
  function getUserMap(){
    try{ return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){ return {}; }
  }
  function setUserMap(obj){
    localStorage.setItem(KEY, JSON.stringify(obj||{}));
  }
  function mergedMap(){
    const base = window.__PAGE_MAP__ || {};
    return Object.assign({}, base, getUserMap());
  }
  window.__getPageMap = mergedMap;

  // Editor UI
  const btn = document.getElementById('btn-map');
  const modal = document.getElementById('map-modal');
  const form = document.getElementById('map-form');
  const btnCancel = document.getElementById('map-cancel');
  const btnSave = document.getElementById('map-save');

  function openModal(){
    if(!modal || !form) return;
    // Build rows from covers keys (fallback to base map keys)
    const covers = window.__COVERS__ || {};
    const names = Object.keys(covers).length ? Object.keys(covers) : Object.keys(window.__PAGE_MAP__||{});
    const cur = mergedMap();
    form.innerHTML = '';
    names.sort().forEach(name=>{
      const row = document.createElement('div');
      row.className = 'row';
      const lab = document.createElement('label');
      lab.textContent = name;
      lab.setAttribute('for', 'page-'+name);
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '1';
      inp.step = '1';
      inp.id = 'page-'+name;
      inp.name = name;
      inp.value = cur[name] ? parseInt(cur[name],10) : '';
      form.appendChild(lab);
      form.appendChild(inp);
    });
    modal.hidden = false;
  }
  function closeModal(){ if(modal) modal.hidden = true; }

  btn && btn.addEventListener('click', openModal);
  btnCancel && btnCancel.addEventListener('click', closeModal);
  modal && modal.addEventListener('click', (e)=>{ if(e.target === modal || e.target.classList.contains('map-modal__backdrop')) closeModal(); });
  form && form.addEventListener('submit', function(e){
    e.preventDefault();
    const data = new FormData(form);
    const out = {};
    for (const [name, val] of data.entries()){
      const v = parseInt(val,10);
      if(Number.isFinite(v) && v>0) out[name] = v;
    }
    setUserMap(out);
    closeModal();
    // small toast
    alert('Сохранено. Теперь клики по категориям откроют заданные страницы.');
  });
})();

// === Robust name→page resolver (2025-11-09) ===
(function(){
  function normalize(s){
    return (s||'').toString().toUpperCase().replace(/\s+/g,' ').trim();
  }
  // Build a normalized map once
  function buildNormMap(map){
    const nm = {};
    Object.keys(map||{}).forEach(k=>{
      nm[normalize(k)] = parseInt(map[k],10);
    });
    // synonyms
    if(nm['ПЛИТЫ УТЕПЛИТЕЛЯ'] && !nm['ПЛИТЫ']) nm['ПЛИТЫ'] = nm['ПЛИТЫ УТЕПЛИТЕЛЯ'];
    if(nm['СУХИЕ СМЕСИ'] && !nm['СМЕСИ']) nm['СМЕСИ'] = nm['СУХИЕ СМЕСИ'];
    if(nm['УТЕПЛИТЕЛЬ'] && !nm['РУЛОННЫЕ УТЕПЛИТЕЛИ']) nm['РУЛОННЫЕ УТЕПЛИТЕЛИ'] = nm['УТЕПЛИТЕЛЬ'];
    return nm;
  }
  window.__resolvePage = function(name){
    const MAP = (window.__getPageMap ? window.__getPageMap() : (window.__PAGE_MAP__||{}));
    const nm = buildNormMap(MAP);
    const key = normalize(name);
    if(Number.isFinite(nm[key])) return nm[key];
    // partial heuristics
    if(key.includes('ГКЛ')) return nm['ГКЛ'] || 1;
    if(key.includes('КРОВЛ')) return nm['КРОВЛЯ'] || 1;
    if(key.includes('ПРОФИЛ')) return nm['ПРОФИЛЬ'] || 1;
    if(key.includes('СМЕС')) return nm['СУХИЕ СМЕСИ'] || nm['СМЕСИ'] || 1;
    if(key.includes('ПЛИТ')) return nm['ПЛИТЫ УТЕПЛИТЕЛЯ'] || 1;
    if(key.includes('УТЕПЛ')) return nm['УТЕПЛИТЕЛЬ'] || nm['РУЛОННЫЕ УТЕПЛИТЕЛИ'] || 1;
    return 1;
  };
})();

// === Assign explicit data-page to tiles at startup (2025-11-09) ===
document.addEventListener('DOMContentLoaded', function(){
  const grid = document.getElementById('group-grid');
  if(!grid) return;
  const tiles = grid.querySelectorAll('a.tile');
  tiles.forEach(a=>{
    const name = a.getAttribute('data-search') || a.textContent;
    const page = (window.__resolvePage ? window.__resolvePage(name) : 1);
    if(page && !a.hasAttribute('data-page')){
      a.setAttribute('data-page', String(page));
    }
  });
}, {once:true});

// Update click handler to use data-page directly
(function(){
  const grid = document.getElementById('group-grid');
  if(!grid) return;
  grid.addEventListener('click', function(e){
    const a = e.target.closest('a.tile');
    if(!a) return;
    e.preventDefault();
    e.stopPropagation();
    const pageAttr = a.getAttribute('data-page');
    let page = parseInt(pageAttr||'', 10);
    if(!Number.isFinite(page) || page < 1){
      const name = a.getAttribute('data-search') || a.textContent;
      page = (window.__resolvePage ? window.__resolvePage(name) : 1);
    }
    try{ console && console.log && console.log('Tile click:', a.getAttribute('data-search'), '→ page', page); }catch(_){}
    if(window.__resolvePage){
      const name = a.getAttribute('data-search') || a.textContent;
      const rp = window.__resolvePage(name);
      if(Number.isFinite(rp) && rp>0) page = rp;
    }
    if(window.openPage) window.openPage(page); else if(window.__setPdfHard) window.__setPdfHard(page);
  });
})();

// === Assign data-page to any future tiles (MutationObserver) — 2025-11-09 ===
(function(){
  const grid = document.getElementById('group-grid');
  if(!grid || !window.__resolvePage) return;
  const ensure = (a)=>{
    if(!a) return;
    if(!a.hasAttribute('data-page')){
      const name = a.getAttribute('data-search') || a.textContent;
      const pg = window.__resolvePage(name);
      if(Number.isFinite(pg) && pg>0) a.setAttribute('data-page', String(pg));
    }
  };
  // initial pass
  grid.querySelectorAll('a.tile').forEach(ensure);
  // observe
  const mo = new MutationObserver((muts)=>{
    for(const m of muts){
      m.addedNodes && m.addedNodes.forEach(n=>{
        if(n.nodeType===1){
          if(n.matches && n.matches('a.tile')) ensure(n);
          n.querySelectorAll && n.querySelectorAll('a.tile').forEach(ensure);
        }
      });
    }
  });
  mo.observe(grid, {childList:true, subtree:true});
})();

// === Hash router for pages (2025-11-09) ===
(function(){
  function parseHash(){
    const m = String(location.hash||'').match(/(?:^|[#&?])page=(\d+)/i);
    return m ? parseInt(m[1],10) : null;
  }
  function goFromHash(){
    const p = parseHash();
    if(Number.isFinite(p) && p>0){
      if(window.openPage) window.openPage(p);
      else if(window.__setPdfHard) window.__setPdfHard(p);
    }
  }
  window.addEventListener('hashchange', goFromHash);
  document.addEventListener('DOMContentLoaded', goFromHash, {once:true});

  // Ensure tiles have href with page=
  document.addEventListener('DOMContentLoaded', function(){
    const grid = document.getElementById('group-grid');
    if(!grid) return;
    grid.querySelectorAll('a.tile').forEach(a=>{
      let page = parseInt(a.getAttribute('data-page')||'',10);
      if(!Number.isFinite(page) || page<1){
        const name = a.getAttribute('data-search') || a.textContent;
        page = (window.__resolvePage ? window.__resolvePage(name) : 1);
      }
      a.setAttribute('href', '#price&page='+page);
    });
  }, {once:true});
})();


// === Tile click: update hash + embedded viewer (no new tab) — 2025-11-09 ===
(function(){
  const grid = document.getElementById('group-grid');
  if(!grid) return;
  grid.addEventListener('click', function(e){
    const a = e.target.closest('a.tile');
    if(!a) return;
    e.preventDefault();
    const pageAttr = a.getAttribute('data-page');
    let page = parseInt(pageAttr||'', 10);
    if(!Number.isFinite(page) || page < 1){
      const name = a.getAttribute('data-search') || a.textContent;
      page = (window.__resolvePage ? window.__resolvePage(name) : 1);
    }
    // update hash for UX/back-button and refresh embedded viewer
    try{ history.replaceState(null, '', '#price&page='+page); }catch(_){ location.hash = '#price&page='+page; }
    if(window.openPage) window.openPage(page); else if(window.__setPdfHard) window.__setPdfHard(page);
    const priceEl = document.getElementById('price');
    priceEl && priceEl.scrollIntoView({behavior:'smooth'});
  });
})();

// === Hash router for embedded viewer — 2025-11-09 ===
(function(){
  function parseHash(){
    const m = String(location.hash||'').match(/(?:^|[#&?])page=(\d+)/i);
    return m ? parseInt(m[1],10) : null;
  }
  function goFromHash(){
    const p = parseHash();
    if(Number.isFinite(p) && p>0){
      if(window.openPage) window.openPage(p); else if(window.__setPdfHard) window.__setPdfHard(p);
    }
  }
  window.addEventListener('hashchange', goFromHash);
  document.addEventListener('DOMContentLoaded', goFromHash, {once:true});
})();
