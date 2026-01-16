// ==UserScript==
  // @name         BAIXATRON HACKER - Auto Downloader Cyberpunk
  // @namespace    https://github.com/HelloKiw1
  // @version      3.0
  // @description  👾 SISTEMA DE INVASÃO DE DOWNLOADS ATIVADO 💻 - Painel hacker para download automático
  // @author       HelloKiw1
  // @match        *://*/*
  // @grant        none
  // @run-at       document-idle
  // @icon         data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">👾</text></svg>
  // ==/UserScript==

  /**
 * BAIXATRON HACKER EDITION - AUTO-DOWNLOADER COM ESTÉTICA CYBERPUNK
 * 
 * > SISTEMA DE INVASÃO DE DOWNLOADS ATIVADO
 * > ACESSO PERMITIDO: ELITE HACKER MODE
 * 
 * Produzido por HelloKiw1
 * GitHub: https://github.com/HelloKiw1
 * 
 * Funciona tanto via PAINEL UI quanto via CONSOLE
 * 
 * COMO USAR:
 * 1. Abra o console (F12 > Console)
 * 2. Cole este script e pressione Enter
 * 3. Use os comandos via console OU o painel visual
 * 
 * COMANDOS CONSOLE:
 * __dl.scan()           - Escanear downloads na página
 * __dl.start()          - Iniciar download automático
 * __dl.stop()           - Parar o processo
 * __dl.reset()          - Resetar tudo
 * __dl.selectAll()      - Selecionar todos os itens
 * __dl.deselectAll()    - Deselecionar todos
 * __dl.setOptions({...})- Configurar opções
 */

(() => {
  if (window.__dl?.stop) window.__dl.stop();

  // ============================================
  // CONFIGURAÇÕES INICIAIS
  // ============================================
  const opts = {
    dryRun: true,
    delayMs: 800,
    waitForDownload: true,
    waitForDownloadTimeout: 3000,
    concurrency: 1,
    maxRetries: 1,
    rootSelector: null,
    autoDetectIframe: true,
    maxClicks: Infinity,
    dedupe: true,
    verbose: true
  };

  // ============================================
  // UTILITÁRIOS & LOGGER HACKER
  // ============================================
  const log = (msg, type = 'info') => {
    const colors = {
      info: 'color: #00ff41; font-family: Courier New',
      success: 'color: #00ff00; font-family: Courier New; font-weight: bold',
      error: 'color: #ff0055; font-family: Courier New; font-weight: bold',
      warning: 'color: #ffff00; font-family: Courier New',
      hack: 'color: #00ffff; font-family: Courier New; font-style: italic'
    };
    console.log(`%c[BAIXATRON] ${msg}`, colors[type] || colors.info);
  };

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

  const runningSet = new Set();

  const detectPageType = () => {
    const url = window.location.href.toLowerCase();
    const html = document.documentElement.outerHTML.toLowerCase();
    
    if (html.includes('nmsc_iframe') || html.includes('scriptcase') || html.includes('pesq_publicacoes_grid')) {
      return 'iframe-grid';
    }
    if (html.includes('wpdm') || html.includes('download-monitor') || html.includes('elementor')) {
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

    if (!root) return [];

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
  // SCAN
  // ============================================
  const scan = () => {
    log('>> INICIANDO SCAN DE DOWNLOADS...', 'hack');
    const items = collect();
    log(`>> ENCONTRADOS ${items.length} ARQUIVOS`, 'info');
    
    state.queue = [];
    state.queuedKeys.clear();
    state.selectedKeys.clear();
    
    for (const it of items) {
      if (opts.dedupe && state.doneKeys.has(it.key)) continue;
      state.queue.push(it);
      state.queuedKeys.add(it.key);
      state.selectedKeys.add(it.key);
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

  const processLoop = async () => {
    if (!state.running) return;

    while (runningSet.size < opts.concurrency && state.queue.length > 0) {
      const next = pullNext();
      if (!next) break;
      runItem(next);
    }

    if (!state.running) return;

    if (state.queue.length === 0 && runningSet.size === 0) {
      state.running = false;
      log('>> DOWNLOAD COMPLETO - MISSION ACCOMPLISHED', 'success');
      updateUI();
      return;
    }

    clearTimeout(state.timer);
    state.timer = setTimeout(processLoop, opts.delayMs);
  };

  const pullNext = () => {
    const originalLength = state.queue.length;
    const skipped = [];
    
    for (let i = 0; i < originalLength && state.processed.length < opts.maxClicks; i++) {
      const candidate = state.queue.shift();
      if (!candidate) break;
      
      if (state.selectedKeys.has(candidate.key)) {
        // Recoloca items pulados na fila
        state.queue.unshift(...skipped);
        return candidate;
      }
      skipped.push(candidate);
    }
    
    // Recoloca todos os items pulados
    state.queue.unshift(...skipped);
    return null;
  };

  const waitForCompletion = async () => {
    if (!opts.waitForDownload) return;
    log('⏳ Aguardando download completar...', 'info');
    await wait(opts.waitForDownloadTimeout);
  };

  const runItem = async it => {
    runningSet.add(it.key);
    const itemStartTime = Date.now();
    updateUI();
    log(`🎯 Iniciando: ${it.text?.slice(0, 60)}`, 'info');
    try {
      await safeClick(it);
      log('🖱️ Click executado, aguardando...', 'info');
      await waitForCompletion();
      const itemDuration = Date.now() - itemStartTime;
      it.duration = itemDuration;
      state.doneKeys.add(it.key);
      state.processed.push(it);
      log(`[✓] ${it.text || 'arquivo anônimo'}`, 'success');
    } catch (err) {
      it.retries = (it.retries || 0) + 1;
      log(`[⚠] Erro (tentativa ${it.retries}/${opts.maxRetries}): ${it.text?.slice(0, 50)} - ${err.message}`, 'warning');
      if (it.retries <= opts.maxRetries) {
        log('🔄 Recolocando na fila para retry...', 'info');
        state.queue.push(it);
      } else {
        log(`[✗] ERRO: ${it.text}`, 'error');
        state.errors.push({ key: it.key, text: it.text, err: String(err) });
      }
    } finally {
      runningSet.delete(it.key);
      log(`⏱️ Aguardando ${opts.delayMs}ms...`, 'info');
      await wait(opts.delayMs);
      updateUI();
    }
  };

  // ============================================
  // API PÚBLICA
  // ============================================
  const start = () => {
    if (state.running) return;
    if (!state.queue.length) scan();
    
    if (state.queue.length === 0) {
      log('ERRO: Nenhum arquivo na fila. Execute scan() primeiro.', 'error');
      return;
    }

    state.running = true;
    state.startedAt = new Date();
    log(`>> INICIANDO DOWNLOAD DE ${state.queue.length} ARQUIVOS...`, 'hack');
    updateUI();
    processLoop();
  };

  const stop = () => {
    state.running = false;
    clearTimeout(state.timer);
    log('>> DOWNLOAD PAUSADO', 'warning');
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
    log('>> SISTEMA RESETADO', 'info');
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

  const toggleTheme = () => {
    const panel = document.getElementById('__dl-panel');
    if (!panel) return;
    
    const isLightMode = panel.classList.contains('light-mode');
    if (isLightMode) {
      panel.classList.remove('light-mode');
      localStorage.setItem('__dl-theme-hacker', 'dark');
      const themeBtn = document.getElementById('__dl-theme-toggle');
      if (themeBtn) themeBtn.textContent = '🌙';
    } else {
      panel.classList.add('light-mode');
      localStorage.setItem('__dl-theme-hacker', 'light');
      const themeBtn = document.getElementById('__dl-theme-toggle');
      if (themeBtn) themeBtn.textContent = '☀️';
    }
  };

  const getEstimatedTime = () => {
    if (!state.running || state.processed.length === 0) return null;
    
    // Calcular tempo médio por item
    const processedWithTime = state.processed.filter(it => it.duration);
    if (processedWithTime.length === 0) return null;
    
    const totalDuration = processedWithTime.reduce((sum, it) => sum + it.duration, 0);
    const avgDuration = totalDuration / processedWithTime.length;
    
    // Itens restantes (fila + ativos)
    const remaining = state.queue.length + runningSet.size;
    const estimatedMs = remaining * avgDuration;
    
    return Math.ceil(estimatedMs / 1000); // retorna em segundos
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return '--:--';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  window.__dl = { 
    start, stop, reset, scan,
    selectAll, deselectAll, toggleSelect,
    setOptions, opts, state,
    toggleTheme
  };

  // ============================================
  // PAINEL VISUAL - HACKER THEME
  // ============================================
  const CSS = `
    * {
      box-sizing: border-box;
    }

    #__dl-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      width: 520px;
      max-height: 85vh;
      background: #0a0e27;
      border-radius: 0;
      border: 2px solid #00ff41;
      box-shadow: 0 0 20px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1);
      font-family: 'Courier New', Consolas, monospace;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.5s ease;
      color: #00ff41;
    }

    @keyframes slideIn {
      from { 
        transform: translateX(600px); 
        opacity: 0;
        filter: blur(10px);
      }
      to { 
        transform: translateX(0); 
        opacity: 1;
        filter: blur(0);
      }
    }

    @keyframes glitch {
      0%, 100% { text-shadow: 2px 2px #00ff41; }
      25% { text-shadow: -2px -2px #00ffff; }
      50% { text-shadow: 2px -2px #ff0055; }
      75% { text-shadow: -2px 2px #ffff00; }
    }

    @keyframes blink {
      0%, 49%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    #__dl-header {
      background: linear-gradient(90deg, #0a0e27 0%, #1a1f3a 100%);
      color: #00ff41;
      padding: 16px;
      font-weight: bold;
      font-size: 13px;
      border-bottom: 2px solid #00ff41;
      display: flex;
      justify-content: space-between;
      align-items: center;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: move;
      user-select: none;
    }

    #__dl-header::before {
      content: '> ';
      color: #00ffff;
      animation: blink 1s infinite;
    }

    #__dl-header-title {
      animation: glitch 3s infinite;
    }

    #__dl-close {
      background: transparent;
      border: 1px solid #00ff41;
      color: #00ff41;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 0;
      font-size: 16px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      transition: all 0.2s;
    }

    #__dl-close:hover {
      color: #ff0055;
      border-color: #ff0055;
      text-shadow: 0 0 10px #ff0055;
    }

    #__dl-stats {
      background: #0f1429;
      padding: 14px;
      font-size: 11px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      gap: 10px;
      border-bottom: 1px solid #00ff4133;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-left: 2px solid #00ff41;
      padding-left: 8px;
    }

    .stat-label {
      color: #00ffff;
      font-weight: bold;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-label::before {
      content: '[ ';
      color: #00ff41;
    }

    .stat-label::after {
      content: ' ]';
      color: #00ff41;
    }

    .stat-value {
      color: #00ff41;
      font-weight: bold;
      font-size: 18px;
      text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
    }

    #__dl-progress {
      padding: 14px;
      border-bottom: 1px solid #00ff4133;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #1a1f3a;
      border: 1px solid #00ff41;
      border-radius: 2px;
      overflow: hidden;
      box-shadow: inset 0 0 10px rgba(0, 255, 65, 0.2);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00ff41, #00ffff);
      transition: width 0.3s ease;
      box-shadow: 0 0 15px #00ff41;
    }

    #__dl-controls {
      padding: 12px;
      display: flex;
      gap: 6px;
      border-bottom: 1px solid #00ff4133;
      flex-wrap: wrap;
    }

    .btn {
      flex: 1 1 0;
      min-width: 90px;
      padding: 8px 10px;
      border: 1px solid #00ff41;
      border-radius: 0;
      font-size: 10px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      background: #1a1f3a;
      color: #00ff41;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      white-space: nowrap;
      text-align: center;
    }

    .btn::before {
      content: '< ';
    }

    .btn::after {
      content: ' >';
    }

    .btn:hover:not(:disabled) {
      border-color: #00ffff;
      color: #00ffff;
      text-shadow: 0 0 10px #00ffff;
      box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.2);
    }

    .btn-primary {
      background: #00ff41;
      color: #0a0e27;
      border-color: #00ff41;
    }

    .btn-primary:hover:not(:disabled) {
      background: #00ffff;
      border-color: #00ffff;
      color: #0a0e27;
    }

    .btn-danger {
      border-color: #ff0055;
      color: #ff0055;
    }

    .btn-danger:hover:not(:disabled) {
      background: #ff0055;
      color: #ffffff;
      box-shadow: inset 0 0 10px rgba(255, 0, 85, 0.3);
    }

    .btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    #__dl-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .download-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 0;
      margin-bottom: 4px;
      background: #1a1f3a;
      border: 1px solid #00ff4144;
      transition: all 0.2s;
      gap: 8px;
      font-size: 10px;
    }

    .download-item:hover {
      background: #242a3a;
      border-color: #00ffff;
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
    }

    .download-item.done {
      background: #0a2a0a;
      border-color: #00ff41;
      box-shadow: 0 0 8px rgba(0, 255, 65, 0.2);
    }

    .download-item.processing {
      background: #2a1a0a;
      border-color: #ffff00;
      animation: blink 0.5s infinite;
      box-shadow: 0 0 8px rgba(255, 255, 0, 0.2);
    }

    .download-checkbox {
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: #00ff41;
      border: 1px solid #00ff41;
    }

    .download-name {
      flex: 1;
      font-size: 10px;
      color: #00ffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: 'Courier New', monospace;
    }

    .download-item.done .download-name {
      color: #00ff41;
    }

    .download-item.processing .download-name {
      color: #ffff00;
    }

    .download-icon {
      font-size: 11px;
      color: #00ff41;
      min-width: 12px;
      text-align: center;
      font-weight: bold;
    }

    .download-item.done .download-icon {
      color: #00ff41;
      text-shadow: 0 0 5px #00ff41;
    }

    .download-item.processing .download-icon {
      color: #ffff00;
    }

    .speed-control {
      padding: 12px;
      border-top: 1px solid #00ff4133;
      font-size: 11px;
    }

    .speed-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      color: #00ffff;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .speed-label::before {
      content: '[ ';
      color: #00ff41;
    }

    input[type="range"] {
      width: 100%;
      height: 6px;
      border-radius: 0;
      background: #1a1f3a;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      border: 1px solid #00ff4144;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 0;
      background: #00ff41;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 0 8px #00ff41;
    }

    input[type="range"]::-webkit-slider-thumb:hover {
      background: #00ffff;
      box-shadow: 0 0 12px #00ffff;
    }

    input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 0;
      background: #00ff41;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      box-shadow: 0 0 8px #00ff41;
    }

    input[type="range"]::-moz-range-thumb:hover {
      background: #00ffff;
      box-shadow: 0 0 12px #00ffff;
    }

    #__dl-list::-webkit-scrollbar {
      width: 8px;
    }

    #__dl-list::-webkit-scrollbar-track {
      background: #0a0e27;
    }

    #__dl-list::-webkit-scrollbar-thumb {
      background: #00ff4166;
      border-radius: 0;
    }

    #__dl-list::-webkit-scrollbar-thumb:hover {
      background: #00ff41;
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
        min-width: 50px;
        padding: 6px 8px;
        font-size: 9px;
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
        <span id="__dl-header-title">BAIXATRON HACKER</span>
        <button id="__dl-close">✕</button>
      </div>

      <div id="__dl-stats">
        <div class="stat-item">
          <span class="stat-label">Queue</span>
          <span class="stat-value" id="stat-queue">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active</span>
          <span class="stat-value" id="stat-active">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Pwned</span>
          <span class="stat-value" id="stat-processed">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Select</span>
          <span class="stat-value" id="stat-selected">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Failed</span>
          <span class="stat-value" id="stat-errors">0</span>
        </div>
      </div>

      <div id="__dl-progress">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 600; color: #00ff41;" id="progress-percent">0%</span>
          <span style="font-size: 11px; color: #00ffff;" id="progress-time">--:--</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="__dl-progress-fill" style="width: 0%"></div>
        </div>
      </div>

      <div id="__dl-controls">
        <button class="btn btn-primary" id="btn-scan">Scan</button>
        <button class="btn btn-primary" id="btn-start">Start</button>
        <button class="btn btn-secondary" id="btn-stop" disabled>Stop</button>
        <button class="btn btn-secondary" id="btn-select-all">Select</button>
        <button class="btn btn-secondary" id="btn-deselect-all">Clear</button>
        <button class="btn btn-danger" id="btn-reset">Reset</button>
      </div>

      <div id="__dl-list"></div>

      <div class="speed-control">
        <div class="speed-label">
          <span>VELOCITY</span>
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
    document.getElementById('btn-reset').onclick = () => { if (confirm('[!] RESETAR SISTEMA? [Y/N]')) reset(); };
    
    document.getElementById('speed-slider').onchange = (e) => {
      const value = parseInt(e.target.value);
      opts.delayMs = value;
      document.getElementById('speed-value').textContent = value + 'ms';
    };

    enableDrag(panel, document.getElementById('__dl-header'));
    updateUI();
  };

  // ============================================
  // ARRASTAR PAINEL
  // ============================================
  const enableDrag = (panel, handle) => {
    if (!panel || !handle) return;

    const dragState = { active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 };

    const onMove = e => {
      if (!dragState.active) return;
      const x = e.clientX - dragState.offsetX;
      const y = e.clientY - dragState.offsetY;
      panel.style.right = '';
      panel.style.left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, x)) + 'px';
      panel.style.top = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, y)) + 'px';
    };

    const onUp = () => {
      dragState.active = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    handle.addEventListener('mousedown', e => {
      dragState.active = true;
      dragState.offsetX = e.clientX - panel.getBoundingClientRect().left;
      dragState.offsetY = e.clientY - panel.getBoundingClientRect().top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  };

  // ============================================
  // ATUALIZAR PAINEL
  // ============================================
  const updateUI = () => {
    const panel = document.getElementById('__dl-panel');
    if (!panel) return;

    document.getElementById('stat-queue').textContent = state.queue.length;
    document.getElementById('stat-active').textContent = runningSet.size;
    document.getElementById('stat-processed').textContent = state.processed.length;
    document.getElementById('stat-selected').textContent = state.selectedKeys.size;
    document.getElementById('stat-errors').textContent = state.errors.length;

    const total = state.processed.length + state.queue.length + runningSet.size;
    const percent = total > 0 ? Math.round((state.processed.length / total) * 100) : 0;
    const progressFill = document.getElementById('__dl-progress-fill');
    progressFill.style.width = percent + '%';
    
    // Atualizar porcentagem e tempo estimado
    const percentEl = document.getElementById('progress-percent');
    const timeEl = document.getElementById('progress-time');
    if (percentEl) percentEl.textContent = percent + '%';
    if (timeEl) {
      const estimatedSeconds = getEstimatedTime();
      if (estimatedSeconds && state.running) {
        timeEl.textContent = '⏱️ ' + formatTime(estimatedSeconds);
      } else if (state.running) {
        timeEl.textContent = '⏱️ calculating...';
      } else {
        timeEl.textContent = '--:--';
      }
    }

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
        <span class="download-name" title="${it.text}">${it.text || '[ANONYMOUS]'}</span>
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
  console.log('%c╔═══════════════════════════════════════════╗', 'color: #00ff41; font-family: Courier New; font-weight: bold');
  console.log('%c║  BAIXATRON HACKER EDITION ATIVADO        ║', 'color: #00ff41; font-family: Courier New; font-weight: bold');
  console.log('%c║  > SISTEMA DE INVASÃO DE DOWNLOADS      ║', 'color: #00ffff; font-family: Courier New');
  console.log('%c║  > ACESSO: ELITE HACKER MODE            ║', 'color: #ffff00; font-family: Courier New');
  console.log('%c╚═══════════════════════════════════════════╝', 'color: #00ff41; font-family: Courier New; font-weight: bold');
  
  log('Sistema inicializado com sucesso!', 'success');
  log('Comandos disponíveis no console:', 'info');
  console.log('%c  __dl.scan()      - Escanear downloads', 'color: #00ffff; font-family: Courier New');
  console.log('%c  __dl.start()     - Iniciar downloads', 'color: #00ffff; font-family: Courier New');
  console.log('%c  __dl.stop()      - Parar processo', 'color: #00ffff; font-family: Courier New');
  console.log('%c  __dl.reset()     - Resetar sistema', 'color: #00ffff; font-family: Courier New');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }

})();
