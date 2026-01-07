/**
 * AUTO-DOWNLOADER UNIVERSAL - v3.0 COM PAINEL VISUAL
 * 
 * Script com interface visual completa:
 * - Painel de controle flutuante
 * - Lista de downloads com checkboxes
 * - Barra de progresso
 * - Estatísticas em tempo real
 * - Controles de velocidade
 * 
 * COMO USAR:
 * 1. Abra o console (F12 > Console)
 * 2. Cole este script e pressione Enter
 * 3. Um painel aparecerá no canto superior direito
 * 
 * SEMPRE COMEÇA COM dryRun: true (MODO SEGURO)
 */

(() => {
  if (window.__dl?.stop) window.__dl.stop();

  // ============================================
  // CONFIGURAÇÕES INICIAIS
  // ============================================
  const opts = {
    dryRun: true,
    delayMs: 800,
    waitForDownload: false,
    rootSelector: null,
    autoDetectIframe: true,
    maxClicks: Infinity,
    dedupe: true,
    verbose: false  // menos logs no console com UI ativa
  };

  // ============================================
  // UTILITÁRIOS
  // ============================================
  const exts = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|odt|ods|txt|csv|rtf)$/i;
  const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const toAbs = href => { 
    try { 
      return new URL(href, document.baseURI).href; 
    } catch { 
      return ''; 
    } 
  };
  
  const hash = s => { 
    let h = 0; 
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; 
    return (h >>> 0).toString(36); 
  };

  const isVisible = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    try {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && (s.display === 'none' || s.visibility === 'hidden')) return false;
    } catch {}
    return true;
  };

  const looksLikeDownload = el => {
    const text = norm(el.innerText);
    const cls = norm(el.className);
    const hrefAttr = el.getAttribute('href') || el.dataset.href || el.dataset.url || el.dataset.file || '';
    const hrefAbs = toAbs(hrefAttr);
    const onclick = el.getAttribute('onclick') || '';

    const uiKeywords = /fechar|aplicar|cancelar|limpar|remover|ir para|visualizar|adicionar|campo|página|paginação/i;
    if (uiKeywords.test(text)) return false;

    return (
      el.hasAttribute('download') ||
      /download|baixar|baixe|\.pdf/i.test(text) ||
      /scgridfieldoddlink|scgridfieldoddlink|css_arquivo_documento/i.test(cls) ||
      exts.test(hrefAttr) || exts.test(hrefAbs) ||
      /nm_mostra_doc/i.test(hrefAttr) ||
      /wpdm-download|download-file/i.test(hrefAttr) ||
      /wpdm-download-button/i.test(cls)
    );
  };

  const getContainer = el =>
    el.closest('article, li, .elementor-post, .elementor-widget, .wpdm-link-template, .card, .list-group-item, .entry, .item, .row, tr, [id]') || 
    el.parentElement || 
    el;

  const keyOf = (el, idx) => {
    const href = toAbs(el.getAttribute('href') || el.dataset.href || el.dataset.url || el.dataset.file || '');
    
    if (el.dataset && el.dataset.package) return `pkg:${el.dataset.package}`;
    if (el.dataset && el.dataset.id) return `id:${el.dataset.id}`;
    
    const cont = getContainer(el);
    const contId = cont.getAttribute('id') || cont.getAttribute('data-id') || cont.getAttribute('data-package-id');
    if (contId) return 'cont:' + contId;
    
    const btnText = norm(el.innerText || el.textContent || '').slice(0, 100);
    const contText = norm(cont.innerText || '').slice(0, 200);
    const combined = btnText + '|' + contText;
    
    if (href && href !== document.baseURI) return 'url:' + href + '|txt:' + hash(combined);
    
    return 'txt:' + hash(combined) + ':idx:' + idx;
  };

  // ============================================
  // SELETORES
  // ============================================
  const selectors = [
    'a[download]',
    'a[href*="/download"]',
    'a[href*="nm_mostra_doc"]',
    'a.scGridFieldOddLink, a.scGridFieldEvenLink',
    'a.css_arquivo_documento_grid_line',
    'a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".xls"], a[href$=".xlsx"], ' +
    'a[href$=".ppt"], a[href$=".pptx"], a[href$=".zip"], a[href$=".rar"], a[href$=".7z"], ' +
    'a[href$=".odt"], a[href$=".ods"], a[href$=".txt"], a[href$=".csv"], a[href$=".rtf"]',
    'a.wpdm-download-button, a.wpdm-download-link',
    '[data-download], [data-file]'
  ].join(',');

  // ============================================
  // ESTADO GLOBAL
  // ============================================
  const state = {
    queue: [],
    processed: [],
    running: false,
    timer: null,
    startedAt: null,
    errors: [],
    doneKeys: new Set(),
    queuedKeys: new Set(),
    selectedKeys: new Set(),
    pageType: null
  };

  const detectPageType = () => {
    const url = window.location.href.toLowerCase();
    const html = document.documentElement.outerHTML.toLowerCase();
    
    if (html.includes('nmsc_iframe') || 
        html.includes('scriptcase') ||
        html.includes('pesq_publicacoes_grid')) {
      return 'iframe-grid';
    }
    
    if (html.includes('wpdm') || 
        html.includes('download-monitor') ||
        html.includes('elementor')) {
      return 'direct-links';
    }
    
    return 'generic';
  };

  state.pageType = detectPageType();

  // ============================================
  // COLETA DE LINKS
  // ============================================
  const collect = () => {
    let root = opts.rootSelector ? document.querySelector(opts.rootSelector) : document;

    if (opts.autoDetectIframe && !opts.rootSelector) {
      const iframeSelectors = [
        '#nmsc_iframe_pesq_publicacoes_grid',
        'iframe[name*="grid"]',
        'iframe[name*="resultado"]',
        'iframe[id*="resultado"]',
        'iframe[src*="publicacoes"]',
        'iframe[src*="documentos"]'
      ];
      
      for (const selector of iframeSelectors) {
        const foundIframe = document.querySelector(selector);
        if (foundIframe && foundIframe.contentWindow && foundIframe.contentWindow.document) {
          root = foundIframe.contentWindow.document;
          break;
        }
      }
    }

    if (!root) { 
      return []; 
    }

    const all = Array.from(root.querySelectorAll(selectors))
      .filter(el => {
        const tag = el.tagName;
        const isBtn = tag === 'A' || tag === 'BUTTON' || el.getAttribute('role') === 'button';
        const visible = isVisible(el);
        const download = looksLikeDownload(el);
        return isBtn && visible && download;
      })
      .map((el, idx) => {
        const url = toAbs(el.getAttribute('href') || el.dataset.href || el.dataset.url || el.dataset.file || '');
        const text = (el.innerText || '').trim().slice(0, 120);
        const key = keyOf(el, idx);
        return { el, url, text, key, idx };
      });

    const map = new Map();
    for (const it of all) if (!map.has(it.key)) map.set(it.key, it);

    return Array.from(map.values());
  };

  // ============================================
  // SCAN: Lista todos os downloads
  // ============================================
  const scan = () => {
    const items = collect();
    state.queue = [];
    state.queuedKeys.clear();
    state.selectedKeys.clear();
    let added = 0;
    
    for (const it of items) {
      if (opts.dedupe && state.doneKeys.has(it.key)) continue;
      state.queue.push(it);
      state.queuedKeys.add(it.key);
      state.selectedKeys.add(it.key);
      added++;
    }

    updateUI();
    return items;
  };

  // ============================================
  // CLICK & DOWNLOAD
  // ============================================
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const safeClick = async it => {
    const el = it.el;
    try {
      el.scrollIntoView({ block: 'center' });
    } catch {}
    
    await wait(100);
    
    try {
      if (typeof el.click === 'function') {
        el.click();
      } else {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
    } catch (e) {
      if (it.url) try { window.open(it.url, '_blank'); } catch {}
      throw e;
    }
  };

  const processNext = async () => {
    if (!state.running) return;
    
    while (state.queue.length > 0 && !state.selectedKeys.has(state.queue[0].key)) {
      state.queue.shift();
    }
    
    if (!state.queue.length || state.processed.length >= opts.maxClicks) {
      state.running = false;
      updateUI();
      return;
    }

    const it = state.queue.shift();
    try {
      await safeClick(it);
      state.doneKeys.add(it.key);
      state.processed.push(it);
      updateUI();
    } catch (err) {
      state.errors.push({ key: it.key, text: it.text, err: String(err) });
      updateUI();
    }

    await wait(opts.delayMs);
    state.timer = setTimeout(processNext, 10);
  };

  // ============================================
  // API PÚBLICA
  // ============================================
  const start = () => {
    if (state.running) return;
    if (!state.queue.length) scan();
    
    if (state.queue.length === 0) {
      alert('[DL] Nenhum arquivo na fila. Execute scan() primeiro.');
      return;
    }

    state.running = true;
    state.startedAt = new Date();
    updateUI();
    processNext();
  };

  const stop = () => {
    state.running = false;
    clearTimeout(state.timer);
    updateUI();
  };

  const reset = () => {
    state.queue = [];
    state.processed = [];
    state.errors = [];
    state.doneKeys.clear();
    state.queuedKeys.clear();
    state.selectedKeys.clear();
    state.running = false;
    clearTimeout(state.timer);
    updateUI();
  };

  const setOptions = newOpts => { 
    Object.assign(opts, newOpts || {});
  };

  const selectAll = () => {
    state.queue.forEach(it => state.selectedKeys.add(it.key));
    updateUI();
  };

  const deselectAll = () => {
    state.selectedKeys.clear();
    updateUI();
  };

  const toggleSelect = (key) => {
    if (state.selectedKeys.has(key)) {
      state.selectedKeys.delete(key);
    } else {
      state.selectedKeys.add(key);
    }
    updateUI();
  };

  window.__dl = { 
    start, stop, reset, scan,
    selectAll, deselectAll, toggleSelect,
    setOptions, opts, state
  };

  // ============================================
  // PAINEL VISUAL - HTML/CSS
  // ============================================
  const CSS = `
    * {
      box-sizing: border-box;
    }

    #__dl-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      width: 450px;
      max-height: 85vh;
      background: #1a1a1a;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.3s ease;
      color: #ffffff;
    }

    @keyframes slideIn {
      from { transform: translateX(500px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    #__dl-header {
      background: #2a2a2a;
      color: #ffffff;
      padding: 14px 16px;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #333333;
    }

    #__dl-close {
      background: transparent;
      border: none;
      color: #888888;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 20px;
      transition: all 0.2s;
    }

    #__dl-close:hover {
      color: #ffffff;
      background: #333333;
    }

    #__dl-stats {
      background: #242424;
      padding: 12px;
      font-size: 11px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      border-bottom: 1px solid #333333;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      color: #888888;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
    }

    #__dl-progress {
      padding: 12px;
      border-bottom: 1px solid #333333;
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: #333333;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #ffffff;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 4px;
    }

    #__dl-progress-text {
      font-size: 9px;
      color: #000000;
      font-weight: 600;
      display: none;
    }

    #__dl-controls {
      padding: 12px;
      display: flex;
      gap: 6px;
      border-bottom: 1px solid #333333;
      flex-wrap: wrap;
    }

    .btn {
      flex: 1;
      min-width: 70px;
      padding: 8px 10px;
      border: 1px solid #333333;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: #2a2a2a;
      color: #ffffff;
    }

    .btn:hover:not(:disabled) {
      border-color: #555555;
      background: #333333;
    }

    .btn-primary {
      background: #ffffff;
      color: #000000;
      border-color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #f0f0f0;
      border-color: #f0f0f0;
    }

    .btn-danger {
      background: #dc3545;
      color: #ffffff;
      border-color: #dc3545;
    }

    .btn-danger:hover:not(:disabled) {
      background: #c82333;
      border-color: #c82333;
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    #__dl-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
    }

    .download-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      background: #242424;
      border: 1px solid #333333;
      transition: all 0.2s;
      gap: 8px;
    }

    .download-item:hover {
      background: #2a2a2a;
      border-color: #444444;
    }

    .download-item.done {
      background: #1a3a1a;
      border-color: #4CAF50;
    }

    .download-item.processing {
      background: #3a2a1a;
      border-color: #ff9800;
    }

    .download-checkbox {
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: #ffffff;
    }

    .download-name {
      flex: 1;
      font-size: 11px;
      color: #cccccc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .download-item.done .download-name {
      color: #4CAF50;
    }

    .download-item.processing .download-name {
      color: #ff9800;
    }

    .download-icon {
      font-size: 11px;
      color: #888888;
      min-width: 12px;
      text-align: center;
    }

    .download-item.done .download-icon {
      color: #4CAF50;
    }

    .download-item.processing .download-icon {
      color: #ff9800;
    }

    .speed-control {
      padding: 12px;
      border-top: 1px solid #333333;
      font-size: 11px;
    }

    .speed-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      color: #888888;
      font-weight: 500;
    }

    input[type="range"] {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: #333333;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.2s;
    }

    input[type="range"]::-webkit-slider-thumb:hover {
      width: 14px;
      height: 14px;
    }

    input[type="range"]::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    input[type="range"]::-moz-range-thumb:hover {
      width: 14px;
      height: 14px;
    }

    #__dl-list::-webkit-scrollbar {
      width: 6px;
    }

    #__dl-list::-webkit-scrollbar-track {
      background: #1a1a1a;
    }

    #__dl-list::-webkit-scrollbar-thumb {
      background: #444444;
      border-radius: 3px;
    }

    #__dl-list::-webkit-scrollbar-thumb:hover {
      background: #555555;
    }

    @media (max-width: 600px) {
      #__dl-panel {
        width: calc(100% - 20px);
        right: 10px;
        left: 10px;
        max-height: 80vh;
      }

      #__dl-controls {
        padding: 8px;
        gap: 4px;
      }

      .btn {
        min-width: 60px;
        padding: 6px 8px;
        font-size: 10px;
      }
    }
  `;

  // ============================================
  // RENDERIZAR PAINEL
  // ============================================
  const createPanel = () => {
    const existing = document.getElementById('__dl-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = '__dl-panel';
    panel.innerHTML = `
      <div id="__dl-header">
        <span>[↓] AUTO-DOWNLOADER</span>
        <button id="__dl-close">✕</button>
      </div>

      <div id="__dl-stats">
        <div class="stat-item">
          <span class="stat-label">Fila</span>
          <span class="stat-value" id="stat-queue">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Processados</span>
          <span class="stat-value" id="stat-processed">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Selecionados</span>
          <span class="stat-value" id="stat-selected">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Erros</span>
          <span class="stat-value" id="stat-errors">0</span>
        </div>
      </div>

      <div id="__dl-progress">
        <div class="progress-bar">
          <div class="progress-fill" id="__dl-progress-fill" style="width: 0%">
            <span id="__dl-progress-text"></span>
          </div>
        </div>
      </div>

      <div id="__dl-controls">
        <button class="btn btn-primary" id="btn-scan">[⊙] Escanear</button>
        <button class="btn btn-primary" id="btn-start">[▶] Iniciar</button>
        <button class="btn btn-secondary" id="btn-stop" disabled>[⏸] Pausar</button>
        <button class="btn btn-secondary" id="btn-select-all">[+] Todos</button>
        <button class="btn btn-secondary" id="btn-deselect-all">[-] Nenhum</button>
        <button class="btn btn-danger" id="btn-reset">[↻] Reset</button>
      </div>

      <div id="__dl-list"></div>

      <div class="speed-control">
        <div class="speed-label">
          <span>Velocidade</span>
          <span id="speed-value">800ms</span>
        </div>
        <input type="range" id="speed-slider" min="200" max="3000" step="100" value="800">
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    document.body.appendChild(panel);

    document.getElementById('__dl-close').onclick = () => panel.remove();
    document.getElementById('btn-scan').onclick = () => { scan(); };
    document.getElementById('btn-start').onclick = () => start();
    document.getElementById('btn-stop').onclick = () => stop();
    document.getElementById('btn-select-all').onclick = () => selectAll();
    document.getElementById('btn-deselect-all').onclick = () => deselectAll();
    document.getElementById('btn-reset').onclick = () => { if (confirm('Resetar tudo?')) reset(); };
    
    document.getElementById('speed-slider').onchange = (e) => {
      const value = parseInt(e.target.value);
      opts.delayMs = value;
      document.getElementById('speed-value').textContent = value + 'ms';
    };

    updateUI();
  };

  // ============================================
  // ATUALIZAR PAINEL
  // ============================================
  const updateUI = () => {
    const panel = document.getElementById('__dl-panel');
    if (!panel) return;

    document.getElementById('stat-queue').textContent = state.queue.length;
    document.getElementById('stat-processed').textContent = state.processed.length;
    document.getElementById('stat-selected').textContent = state.selectedKeys.size;
    document.getElementById('stat-errors').textContent = state.errors.length;

    const total = state.processed.length + state.queue.length;
    const percent = total > 0 ? Math.round((state.processed.length / total) * 100) : 0;
    const progressFill = document.getElementById('__dl-progress-fill');
    progressFill.style.width = percent + '%';
    document.getElementById('__dl-progress-text').textContent = percent + '%';

    document.getElementById('btn-start').disabled = state.running || state.queue.length === 0;
    document.getElementById('btn-stop').disabled = !state.running;
    document.getElementById('btn-scan').disabled = state.running;

    const listEl = document.getElementById('__dl-list');
    listEl.innerHTML = '';

    state.queue.forEach((it, idx) => {
      const isSelected = state.selectedKeys.has(it.key);
      const isProcessing = state.running && idx === 0;
      const isDone = state.doneKeys.has(it.key);

      const item = document.createElement('div');
      item.className = 'download-item';
      if (isDone) item.classList.add('done');
      if (isProcessing) item.classList.add('processing');

      item.innerHTML = `
        <input type="checkbox" class="download-checkbox" ${isSelected ? 'checked' : ''}>
        <span class="download-name" title="${it.text}">${it.text || '(sem nome)'}</span>
        <span class="download-icon">${isDone ? '[✓]' : isProcessing ? '[~]' : '[ ]'}</span>
      `;

      item.querySelector('.download-checkbox').onchange = () => toggleSelect(it.key);
      listEl.appendChild(item);
    });
  };

  // ============================================
  // INICIALIZAÇÃO
  // ============================================
  console.clear();
  console.log('%c✅ AUTO-DOWNLOADER v3.0 ATIVADO', 'color: #0099ff; font-size: 14px; font-weight: bold');
  console.log('%cPainel visual carregado no canto superior direito!', 'color: #666; font-size: 12px');
  console.log('%cComandos disponíveis: __dl.scan(), __dl.start(), __dl.stop(), __dl.reset()', 'color: #666; font-size: 11px');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }

})();
