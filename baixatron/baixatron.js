  // ==UserScript==
  // @name         BAIXATRON - Auto Downloader Universal
  // @namespace    https://github.com/HelloKiw1
  // @version      3.0
  // @description  👾 O Alien que invade downloads! 📡 - Painel visual para download automático de arquivos
  // @author       HelloKiw1
  // @match        *://*/*
  // @grant        none
  // @run-at       document-idle
  // @icon         data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">👾</text></svg>
  // ==/UserScript==

  /**
   * BAIXATRON - AUTO-DOWNLOADER UNIVERSAL v3.0 COM PAINEL VISUAL
   * 
   * 👾 O Alien que invade downloads! 📡
   * 
   * Produzido por HelloKiw1
   * GitHub: https://github.com/HelloKiw1
   * 
   * Script com interface visual completa:
   * - Painel de controle flutuante
   * - Lista de downloads com checkboxes
   * - Barra de progresso
   * - Estatísticas em tempo real
   * - Controles de velocidade
   * 
   * COMO USAR:
   * - O painel aparece automaticamente ao carregar a página
   * - Clique em [⊙] Escanear para encontrar downloads
   * - Selecione os arquivos desejados
   * - Clique em [▶] Iniciar para começar
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
      delayMs: 2000,
      waitForDownload: true,
      waitForDownloadTimeout: 3000,
      concurrency: 1,
      maxRetries: 1,
      rootSelector: null,
      autoDetectIframe: true,
      maxClicks: Infinity,
      dedupe: true,
      verbose: true // ativar logs para debug
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
      
      // Se tem URL válida e única, usar ela como chave principal
      if (href && href !== document.baseURI && href.length > 10) {
        return 'url:' + href;
      }
      
      const cont = getContainer(el);
      const contId = cont.getAttribute('id') || cont.getAttribute('data-id') || cont.getAttribute('data-package-id');
      if (contId) return 'cont:' + contId;
      
      const btnText = norm(el.innerText || el.textContent || '').slice(0, 100);
      const contText = norm(cont.innerText || '').slice(0, 200);
      const combined = btnText + '|' + contText;
      
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
      'a.elementor-button, a.elementor-button-link',
      'a.nt_btn',
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

      console.log('[BAIXATRON] 🔍 Collect: elementos brutos:', all.length, '| únicos após dedupe:', map.size);
      return Array.from(map.values());
    };

    // ============================================
    // SCAN: Lista todos os downloads
    // ============================================
    const scan = () => {
      const items = collect();
      console.log('[BAIXATRON] 📊 Coleta: encontrados', items.length, 'botões únicos');
      
      state.queue = [];
      state.queuedKeys.clear();
      state.selectedKeys.clear();
      let added = 0;
      let skipped = 0;
      
      for (const it of items) {
        if (opts.dedupe && state.doneKeys.has(it.key)) {
          skipped++;
          console.log('[BAIXATRON] ⏭️ Pulando (já processado):', it.text?.slice(0, 40));
          continue;
        }
        state.queue.push(it);
        state.queuedKeys.add(it.key);
        state.selectedKeys.add(it.key);
        added++;
      }

      console.log('[BAIXATRON] ✅ Adicionados:', added, '| ⏭️ Pulados:', skipped, '| 📝 Total histórico:', state.doneKeys.size);
      updateUI();
      return items;
    };

    // ============================================
    // CLICK & DOWNLOAD
    // ============================================
    const wait = ms => new Promise(r => setTimeout(r, ms));

    const safeClick = async it => {
      const el = it.el;
      const url = toAbs(it.url);
      
      try {
        el.scrollIntoView({ block: 'center' });
      } catch {}
      
      await wait(100);
      
      // Download direto via Fetch + Blob (melhor compatibilidade, sem abrir abas)
      try {
        // Fazer fetch do arquivo
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // Receber como octet-stream para forçar download (não abrir PDF)
        const blob = await response.blob();
        const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(downloadBlob);
        
        // Extrair nome do arquivo da URL ou usar texto do botão
        let fileName = '';
        if (url) {
          const urlParts = url.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          fileName = lastPart.split('?')[0].split('#')[0];
        }
        
        // Se não conseguiu nome válido, usar texto do botão
        if (!fileName || fileName.length < 3) {
          const cleanText = (it.text || 'download')
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 50);
          fileName = cleanText + '.pdf';
        }
        
        // Criar elemento <a> com blob URL
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.style.display = 'none'; // Garantir que não seja visível
        
        // Adicionar ao DOM e clicar
        document.body.appendChild(a);
        a.click();
        
        // Limpar
        await wait(100);
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
      } catch (e) {
        console.warn('[BAIXATRON] ⚠️ Erro no Fetch, tentando fallback:', e.message);
        
        // Fallback 1: tentar com URL direto (se mesmo domínio)
        try {
          const a = document.createElement('a');
          a.href = url;
          
          let fileName = '';
          if (url) {
            const urlParts = url.split('/');
            const lastPart = urlParts[urlParts.length - 1];
            fileName = lastPart.split('?')[0].split('#')[0];
          }
          
          if (!fileName || fileName.length < 3) {
            const cleanText = (it.text || 'download')
              .replace(/[^a-z0-9]/gi, '_')
              .substring(0, 50);
            fileName = cleanText + '.pdf';
          }
          
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          
          await wait(100);
          document.body.removeChild(a);
          
        } catch (e2) {
          // Fallback 2: tentar click no elemento original
          try {
            if (typeof el.click === 'function') {
              el.click();
            } else {
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            }
          } catch (e3) {
            // Fallback 3: abrir URL (último recurso)
            if (url) {
              try { 
                window.open(url, '_blank'); 
              } catch (e4) {
                throw e;
              }
            } else {
              throw e;
            }
          }
        }
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
      console.log('[BAIXATRON] ⏳ Aguardando download completar...');
      await wait(opts.waitForDownloadTimeout);
      console.log('[BAIXATRON] ⏱️ Timeout atingido, prosseguindo...');
    };

    const runItem = async it => {
      runningSet.add(it.key);
      const itemStartTime = Date.now();
      updateUI();
      console.log('[BAIXATRON] 🎯 Iniciando:', it.text?.slice(0, 60));
      try {
        await safeClick(it);
        console.log('[BAIXATRON] 🖱️ Click executado, aguardando...');
        await waitForCompletion();
        const itemDuration = Date.now() - itemStartTime;
        it.duration = itemDuration;
        state.doneKeys.add(it.key);
        state.processed.push(it);
        console.log('[BAIXATRON] ✅ Download concluído:', it.text?.slice(0, 50));
      } catch (err) {
        it.retries = (it.retries || 0) + 1;
        console.warn(`[BAIXATRON] ⚠️ Erro (tentativa ${it.retries}/${opts.maxRetries}):`, it.text?.slice(0, 50), '-', err.message);
        if (it.retries <= opts.maxRetries) {
          console.log('[BAIXATRON] 🔄 Recolocando na fila para retry...');
          state.queue.push(it);
        } else {
          console.error('[BAIXATRON] ❌ Item descartado após max retries:', it.text?.slice(0, 50));
          state.errors.push({ key: it.key, text: it.text, err: String(err) });
        }
      } finally {
        runningSet.delete(it.key);
        console.log('[BAIXATRON] ⏱️ Aguardando', opts.delayMs + 'ms...');
        await wait(opts.delayMs);
        updateUI();
      }
    };

    // ============================================
    // API PÚBLICA
    // ============================================
    const start = async () => {
      if (state.running) return;
      if (!state.queue.length) scan();
      
      if (state.queue.length === 0) {
        alert('[BAIXATRON] Nenhum arquivo na fila. Execute scan() primeiro.');
        return;
      }

      state.running = true;
      state.startedAt = new Date();
      updateUI();
      processLoop();
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

    const clearHistory = () => {
      state.doneKeys.clear();
      state.processed = [];
      state.errors = [];
      console.log('[BAIXATRON] 🗑️ Histórico limpo! Escaneando novamente...');
      updateUI();
      // Escanear automaticamente após limpar histórico
      setTimeout(() => {
        scan();
      }, 100);
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
        localStorage.setItem('__dl-theme', 'dark');
        document.getElementById('__dl-theme-toggle').textContent = '🌙';
      } else {
        panel.classList.add('light-mode');
        localStorage.setItem('__dl-theme', 'light');
        document.getElementById('__dl-theme-toggle').textContent = '☀️';
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
      start, stop, reset, scan, clearHistory,
      selectAll, deselectAll, toggleSelect,
      setOptions, opts, state,
      toggleTheme
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
        cursor: move;
        user-select: none;
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

      #__dl-theme-toggle {
        background: transparent;
        border: none;
        color: #888888;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 16px;
        transition: all 0.2s;
        margin-right: 4px;
      }

      #__dl-theme-toggle:hover {
        color: #ffffff;
        background: #333333;
      }

      /* LIGHT MODE */
      #__dl-panel.light-mode {
        background: #f5f5f5;
        color: #1a1a1a;
      }

      #__dl-panel.light-mode #__dl-header {
        background: #ffffff;
        color: #1a1a1a;
        border-bottom-color: #ddd;
      }

      #__dl-panel.light-mode #__dl-close,
      #__dl-panel.light-mode #__dl-theme-toggle {
        color: #666666;
      }

      #__dl-panel.light-mode #__dl-close:hover,
      #__dl-panel.light-mode #__dl-theme-toggle:hover {
        color: #1a1a1a;
        background: #e8e8e8;
      }

      #__dl-panel.light-mode #__dl-stats {
        background: #ffffff;
        border-bottom-color: #ddd;
      }

      #__dl-panel.light-mode .stat-label {
        color: #666666;
      }

      #__dl-panel.light-mode .stat-value {
        color: #1a1a1a;
      }

      #__dl-panel.light-mode #__dl-progress {
        border-bottom-color: #ddd;
      }

      #__dl-panel.light-mode .progress-bar {
        background: #ddd;
      }

      #__dl-panel.light-mode .progress-fill {
        background: #1a1a1a;
      }

      #__dl-panel.light-mode #__dl-controls {
        border-bottom-color: #ddd;
      }

      #__dl-panel.light-mode .btn {
        border-color: #ddd;
        background: #ffffff;
        color: #1a1a1a;
      }

      #__dl-panel.light-mode .btn:hover:not(:disabled) {
        border-color: #999;
        background: #f0f0f0;
      }

      #__dl-panel.light-mode .btn-primary {
        background: #1a1a1a;
        color: #ffffff;
        border-color: #1a1a1a;
      }

      #__dl-panel.light-mode .btn-primary:hover:not(:disabled) {
        background: #333333;
        border-color: #333333;
      }

      #__dl-panel.light-mode #__dl-list {
        background: #f5f5f5;
      }

      #__dl-panel.light-mode .download-item {
        background: #ffffff;
        border-color: #ddd;
        color: #1a1a1a;
      }

      #__dl-panel.light-mode .download-item:hover {
        background: #f9f9f9;
        border-color: #999;
      }

      #__dl-panel.light-mode .download-item.done {
        background: #f0f8f0;
        border-color: #4CAF50;
      }

      #__dl-panel.light-mode .download-item.processing {
        background: #fff9f0;
        border-color: #ff9800;
      }

      #__dl-panel.light-mode .download-checkbox {
        accent-color: #1a1a1a;
      }

      #__dl-panel.light-mode .download-name {
        color: #333333;
      }

      #__dl-panel.light-mode .download-icon {
        color: #666666;
      }

      #__dl-panel.light-mode .speed-control {
        border-top-color: #ddd;
      }

      #__dl-panel.light-mode .speed-label {
        color: #666666;
      }

      #__dl-panel.light-mode input[type="range"] {
        background: #ddd;
      }

      #__dl-panel.light-mode input[type="range"]::-webkit-slider-thumb {
        background: #1a1a1a;
      }

      #__dl-panel.light-mode input[type="range"]::-moz-range-thumb {
        background: #1a1a1a;
      }

      #__dl-panel.light-mode #__dl-list::-webkit-scrollbar-track {
        background: #f5f5f5;
      }

      #__dl-panel.light-mode #__dl-list::-webkit-scrollbar-thumb {
        background: #bbb;
      }

      #__dl-panel.light-mode #__dl-list::-webkit-scrollbar-thumb:hover {
        background: #999;
      }

      #__dl-panel.light-mode #__dl-warning {
        background: #fff3cd !important;
        color: #856404 !important;
        border-left-color: #ffc107 !important;
      }

      #__dl-warning {
        cursor: pointer;
        transition: all 0.3s ease;
      }

      #__dl-warning:hover {
        opacity: 0.8;
      }

      #__dl-warning.hidden {
        display: none !important;
      }

      #__dl-stats {
        background: #242424;
        padding: 12px;
        font-size: 11px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1 1 120px;
        min-width: 120px;
        max-width: 100%;
        padding: 10px 12px;
        border: 1px solid #333333;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        background: #2a2a2a;
        color: #ffffff;
        white-space: normal;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
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
          flex: 1 1 48%;
          min-width: 0;
          padding: 8px 10px;
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
          <span>👾 BAIXATRON 📡</span>
          <div style="display: flex; gap: 4px;">
            <button id="__dl-theme-toggle" title="Alternar tema">🌙</button>
            <button id="__dl-close">✕</button>
          </div>
        </div>

        <div id="__dl-warning" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 0; font-size: 11px; color: #856404; display: flex; gap: 8px; align-items: flex-start;">
          <span style="font-size: 16px; flex-shrink: 0;">⚠️</span>
          <div style="flex: 1;">
            <strong>Aviso de Segurança:</strong>
            <p style="margin: 4px 0 0 0;"><strong>O navegador pode pedir confirmação para downloads.</strong> Opções:</p>
            <ul style="margin: 4px 0 0 0; padding-left: 20px;">
              <li>Se aparecer caixa: marque <strong>"Sempre fazer isso"</strong> (nem todos navegadores mostram)</li>
              <li>Senão: confirme cada download ou configure preferências do navegador</li>
              <li>Aumente o delay entre downloads se necessário</li>
            </ul>
            <p style="margin: 4px 0 0 0; font-size: 10px; opacity: 0.8;">Clique aqui para fechar este aviso.</p>
          </div>
        </div>

        <div id="__dl-stats">
          <div class="stat-item">
            <span class="stat-label">Fila</span>
            <span class="stat-value" id="stat-queue">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Ativos</span>
            <span class="stat-value" id="stat-active">0</span>
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 600;" id="progress-percent">0%</span>
            <span style="font-size: 11px; color: #888;" id="progress-time">--:--</span>
          </div>
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
          <button class="btn btn-secondary" id="btn-clear-history">[🗑️] Limpar Histórico</button>
          <button class="btn btn-danger" id="btn-reset">[↻] Reset Total</button>
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
      document.getElementById('__dl-theme-toggle').onclick = () => toggleTheme();
      document.getElementById('__dl-warning').onclick = () => {
        document.getElementById('__dl-warning').classList.add('hidden');
        localStorage.setItem('__dl-warning-closed', 'true');
      };
      document.getElementById('btn-scan').onclick = () => { scan(); };
      document.getElementById('btn-start').onclick = () => start();
      document.getElementById('btn-stop').onclick = () => stop();
      document.getElementById('btn-select-all').onclick = () => selectAll();
      document.getElementById('btn-deselect-all').onclick = () => deselectAll();
      document.getElementById('btn-clear-history').onclick = () => { 
        if (confirm('Limpar histórico de downloads? Isso permitirá escanear novamente todos os arquivos.')) clearHistory(); 
      };
      document.getElementById('btn-reset').onclick = () => { 
        if (confirm('Resetar TUDO (fila + histórico)?')) reset(); 
      };
      
      document.getElementById('speed-slider').onchange = (e) => {
        const value = parseInt(e.target.value);
        opts.delayMs = value;
        document.getElementById('speed-value').textContent = value + 'ms';
      };

      enableDrag(panel, document.getElementById('__dl-header'));
      
      // Verificar se aviso foi fechado antes
      if (localStorage.getItem('__dl-warning-closed') === 'true') {
        document.getElementById('__dl-warning').classList.add('hidden');
      }
      
      // Aplicar tema salvo
      const savedTheme = localStorage.getItem('__dl-theme') || 'dark';
      if (savedTheme === 'light') {
        panel.classList.add('light-mode');
        document.getElementById('__dl-theme-toggle').textContent = '☀️';
      } else {
        document.getElementById('__dl-theme-toggle').textContent = '🌙';
      }

      updateUI();
    };

    // ============================================
    // ARRASTAR PAINEL
    // ============================================
    const enableDrag = (panel, handle) => {
      if (!panel || !handle) return;

      const dragState = { active: false, offsetX: 0, offsetY: 0 };

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
      document.getElementById('__dl-progress-text').textContent = percent + '%';
      
      // Atualizar porcentagem e tempo estimado
      const percentEl = document.getElementById('progress-percent');
      const timeEl = document.getElementById('progress-time');
      if (percentEl) percentEl.textContent = percent + '%';
      if (timeEl) {
        const estimatedSeconds = getEstimatedTime();
        if (estimatedSeconds && state.running) {
          timeEl.textContent = '⏱️ ' + formatTime(estimatedSeconds);
        } else if (state.running) {
          timeEl.textContent = '⏱️ calculando...';
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
    console.log('%c👾 BAIXATRON v3.0 ATIVADO 📡', 'color: #00ff00; font-size: 14px; font-weight: bold');
    console.log('%cO alien invasor de downloads está pronto!', 'color: #666; font-size: 12px');
    console.log('%cComandos disponíveis: __dl.scan(), __dl.start(), __dl.stop(), __dl.reset()', 'color: #666; font-size: 11px');

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createPanel);
    } else {
      createPanel();
    }

  })();
