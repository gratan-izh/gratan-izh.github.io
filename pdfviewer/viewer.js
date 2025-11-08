/* Lightweight PDF.js viewer that supports ?file=... and hash #page= / #search= */
(function(){
  const $ = sel => document.querySelector(sel);
  const canvas = $('#pageCanvas');
  const ctx = canvas.getContext('2d');
  const status = $('#status');
  let pdfDoc = null;
  let pageNum = 1;
  let scale = 1.2;
  let fileUrl = null;

  function parseParams(){
    const url = new URL(window.location.href);
    const file = url.searchParams.get('file');
    // Hash supports #view=FitH&search=... or #view=FitH&page=N
    const hash = new URLSearchParams((url.hash||'').replace(/^#/, ''));
    const search = hash.get('search') || null;
    const page = parseInt(hash.get('page')||'0', 10) || 0;
    return { file, search, page };
  }

  function setStatus(msg){
    status.textContent = msg || '';
  }

  async function renderPage(n){
    pageNum = n;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const renderCtx = { canvasContext: ctx, viewport };
    setStatus(`Страница ${pageNum} / ${pdfDoc.numPages}`);
    await page.render(renderCtx).promise;
    $('#pageInput').value = pageNum;
  }

  async function findFirst(search){
    const norm = (s)=> (s||'').toLowerCase();
    const query = norm(search);
    if(!query) return 0;
    for(let i=1;i<=pdfDoc.numPages;i++){
      const page = await pdfDoc.getPage(i);
      const text = await page.getTextContent();
      const str = text.items.map(it=>it.str).join(' ').toLowerCase();
      if(str.includes(query)) return i;
    }
    return 0;
  }

  async function openPdf(initial){
    const { file, search, page } = initial;
    if(!file){ setStatus('Не указан файл'); return; }
    fileUrl = file;
    // Configure pdf.js worker via CDN too
    if(window['pdfjsLib']){
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    pdfDoc = await pdfjsLib.getDocument(fileUrl).promise;
    let targetPage = page || 1;
    if(!page && search){
      try { targetPage = await findFirst(search) || 1; } catch(e){ targetPage = 1; }
    }
    await renderPage(targetPage);
  }

  // Controls
  $('#prev').addEventListener('click', ()=> { if(pageNum>1) renderPage(pageNum-1); });
  $('#next').addEventListener('click', ()=> { if(pageNum<pdfDoc.numPages) renderPage(pageNum+1); });
  $('#pageInput').addEventListener('change', (e)=>{
    const v = Math.max(1, Math.min(pdfDoc.numPages, e.target.value|0));
    renderPage(v);
  });
  $('#find').addEventListener('click', async ()=>{
    const q = $('#searchInput').value.trim();
    if(!q) return;
    setStatus('Поиск...');
    const p = await findFirst(q);
    if(p>0){ await renderPage(p); setStatus(`Найдено на стр. ${p}`); }
    else setStatus('Не найдено');
  });

  window.addEventListener('hashchange', ()=>{
    // React on external updates like #page=... or #search=...
    const { search, page } = parseParams();
    if(page) renderPage(Math.max(1, Math.min(pdfDoc.numPages, page|0)));
    else if(search){ $('#searchInput').value = search; $('#find').click(); }
  });

  // Boot
  const init = parseParams();
  openPdf(init).catch(err=>{ setStatus('Ошибка загрузки PDF'); console.error(err); });
})();