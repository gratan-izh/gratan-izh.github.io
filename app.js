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
      el.innerHTML = '<img loading="lazy" src="'+covers[name]+'" alt="'+name+'"><div class="name">'+name+'</div>';
      grid.appendChild(el);
    });
  }

  const pdf = document.getElementById('pdf-view');
  if(!pdf) return;

  const MAP = window.__PAGE_MAP__ || {};
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
      const page = parseInt(MAP[name], 10);
      window.openPage(Number.isFinite(page) ? page : 1);
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

