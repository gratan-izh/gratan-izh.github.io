
(function(){
  const covers = window.__COVERS__ || {};
  const grid = document.getElementById('group-grid');
  Object.keys(covers).sort().forEach(name=>{
    const el = document.createElement('a');
    el.href = '#price';
    el.className = 'tile';
    el.setAttribute('data-search', name);
    el.innerHTML = '<img loading="lazy" src="'+covers[name]+'" alt="'+name+'"><div class="name">'+name+'</div>';
    grid.appendChild(el);
  });

  const pdf = document.getElementById('pdf-view');
  let currentPage = 1;
  function setPdf(url){ pdf.setAttribute('data', url); document.getElementById('price').scrollIntoView({behavior:'smooth'}); }
  function openPage(p){ currentPage = Math.max(1, p|0); setPdf('gratan_price.pdf#view=FitH&page='+currentPage); }

  document.addEventListener('click', function(e){
  /* enforce-router */
    const a = e.target.closest('a');
    if(!a) return;
    const page = a.getAttribute('data-page');
    const search = a.getAttribute('data-search');
    if(page || search){
      // перехват клика по карточкам каталога
      e.stopImmediatePropagation();
      e.preventDefault();
      const base = 'gratan_price.pdf#view=FitH';
      const url = base + (page ? ('&page='+page) : ('&search=' + encodeURIComponent(search)));
      setPdf(url);
    }
  }, {passive:false});

  document.getElementById('btn-prev').addEventListener('click', ()=> openPage(currentPage-1));
  document.getElementById('btn-next').addEventListener('click', ()=> openPage(currentPage+1));
})();
/* nav-smooth */
document.addEventListener('click', function(e){
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if(el){
    e.preventDefault();
    el.scrollIntoView({behavior:'smooth'});
  }
}, {passive:false});
