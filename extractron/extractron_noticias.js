// ==UserScript==
// @name         EXTRACTRON Noticias - Baixatron Style
// @namespace    https://github.com/HelloKiw1
// @version      2.0.0
// @description  Extrai noticias (titulo, data, texto e imagens) em fluxo de fila estilo Baixatron.
// @author       HelloKiw1
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  const SOURCE_TAG = 'extractron-noticias';

  if (window.__extractronNoticias && typeof window.__extractronNoticias.destroy === 'function') {
    window.__extractronNoticias.destroy();
  }

  const opts = {
    urlInicial: '',
    corsProxy: '',
    paginaInicial: 1,
    maxPaginas: 5,
    delayMs: 800,
    selectorCustom: '',
    detalharNoticias: true,
    concurrency: 1,
    maxRetries: 1,
    autoDetectApi: true,
    dedupe: true,
    verbose: true
  };

  const state = {
    queue: [],
    processed: [],
    noticias: [],
    falhas: [],
    errors: [],
    blockedFrames: [],
    running: false,
    scanning: false,
    cancelRequested: false,
    timer: null,
    startedAt: null,
    progressPercent: 0,
    statusText: 'Aguardando acao...',
    apiEndpoint: '',
    paginasVisitadas: 0,
    linksEncontrados: 0,
    doneKeys: new Set(),
    queuedKeys: new Set(),
    selectedKeys: new Set(),
    itemIdByKey: new Map(),
    nextItemId: 1
  };

  const runningSet = new Set();

  let styleEl = null;
  let panelEl = null;
  let modalEl = null;
  let isMinimized = false;

  const ui = {
    header: null,
    content: null,
    close: null,
    min: null,
    theme: null,
    warning: null,
    proxy: null,
    pageStart: null,
    pageMax: null,
    selector: null,
    detail: null,
    speed: null,
    speedValue: null,
    status: null,
    progressFill: null,
    progressPercent: null,
    progressTime: null,
    statQueue: null,
    statActive: null,
    statProcessed: null,
    statSelected: null,
    statErrors: null,
    scan: null,
    openIframes: null,
    openItems: null,
    start: null,
    stop: null,
    selectAll: null,
    deselectAll: null,
    clearHistory: null,
    reset: null,
    downloadOk: null,
    downloadImages: null,
    downloadFail: null,
    summary: null,
    iframeHint: null
  };

  const FILE_TYPE_ALIAS = {
    pdf: 'pdf',
    csv: 'csv',
    doc: 'doc',
    docx: 'docx',
    word: 'doc',
    xls: 'xls',
    xlsx: 'xlsx',
    excel: 'xls',
    xml: 'xml',
    txt: 'txt',
    text: 'txt',
    html: 'html',
    htm: 'html',
    json: 'json',
    noticia: 'news',
    noticias: 'news',
    news: 'news'
  };

  function sanitizeSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeLoose(value) {
    const base = sanitizeSpaces(value).toLowerCase();
    if (!base) return '';
    try {
      return base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch {
      return base;
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function toAbsoluteUrl(value, baseUrl) {
    const raw = sanitizeSpaces(value);
    if (!raw || raw === '#' || /^javascript:/i.test(raw)) return '';

    // Many CMS image fields come as "uploads/..." (without leading slash).
    // Resolve these against site root to avoid "/noticias/uploads/..." artifacts.
    if (/^(uploads|cms\/uploads)\//i.test(raw)) {
      try {
        const base = new URL(baseUrl || window.location.href);
        return base.origin + '/' + raw.replace(/^\/+/, '');
      } catch {
        // fallback to generic URL resolution below
      }
    }

    try {
      return new URL(raw, baseUrl).href;
    } catch {
      return '';
    }
  }

  function asPositiveInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.floor(n);
  }

  function asNonNegativeInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.floor(n);
  }

  function likelyNewsLink(url) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.toLowerCase();
      if (!path.includes('/noticias')) return false;
      if (path === '/noticias' || path === '/noticias/') return false;
      return true;
    } catch {
      return false;
    }
  }

  function normalizeFileTypeToken(raw) {
    const cleaned = normalizeLoose(raw || '')
      .replace(/^\.+/, '')
      .replace(/[^a-z0-9]+/g, '');
    if (!cleaned) return '';
    return FILE_TYPE_ALIAS[cleaned] || '';
  }

  function inferNewsTypeFromUrl(url) {
    const src = sanitizeSpaces(url);
    const extMatch = src.match(/\.([a-z0-9]{2,8})(?:[?#]|$)/i);
    if (!extMatch) return 'news';
    return normalizeFileTypeToken(extMatch[1]) || 'news';
  }

  function parseNameFilterTerms(raw) {
    return String(raw || '')
      .split(/[\n,;|]+/)
      .map((term) => sanitizeSpaces(term))
      .filter(Boolean);
  }

  function parseTypeFilterTerms(raw) {
    const terms = parseNameFilterTerms(raw);
    const tokens = new Set();
    const knownRegex = /\b(pdf|csv|docx?|xlsx?|xls|xml|txt|html?|json|news|noticia|noticias)\b/g;

    for (const term of terms) {
      const loose = normalizeLoose(term).replace(/^\s*(tipo|type)\s*[:#=\-]?\s*/i, '').trim();
      const direct = normalizeFileTypeToken(loose);
      if (direct) {
        tokens.add(direct);
        continue;
      }

      knownRegex.lastIndex = 0;
      let match = null;
      while ((match = knownRegex.exec(loose)) !== null) {
        const normalized = normalizeFileTypeToken(match[1]);
        if (normalized) tokens.add(normalized);
      }
    }

    return Array.from(tokens);
  }

  function parseFilterRules(raw) {
    const terms = parseNameFilterTerms(raw);
    const textTerms = [];
    const exactIds = new Set();
    const ranges = [];

    for (const term of terms) {
      const idMatch = term.match(/^id\s*:?\s*(\d+)$/i) || term.match(/^(\d+)$/);
      if (idMatch) {
        exactIds.add(Number(idMatch[1]));
        continue;
      }

      const rangeMatch = term.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const a = Number(rangeMatch[1]);
        const b = Number(rangeMatch[2]);
        if (Number.isFinite(a) && Number.isFinite(b)) {
          ranges.push([Math.min(a, b), Math.max(a, b)]);
          continue;
        }
      }

      textTerms.push(normalizeLoose(term));
    }

    return { textTerms, exactIds, ranges };
  }

  function applyCorsProxy(url, proxyRaw) {
    const proxy = sanitizeSpaces(proxyRaw);
    if (!proxy) return url;
    if (proxy.includes('{url}')) return proxy.replace('{url}', encodeURIComponent(url));
    const sep = proxy.includes('?') ? '&' : '?';
    return proxy + sep + 'url=' + encodeURIComponent(url);
  }

  async function fetchDocument(url, proxyRaw) {
    const attempts = [
      { requested: url, viaProxy: false },
      { requested: applyCorsProxy(url, proxyRaw), viaProxy: true }
    ];

    const seen = new Set();
    let lastError = null;

    for (const attempt of attempts) {
      if (!attempt.requested || seen.has(attempt.requested)) continue;
      seen.add(attempt.requested);
      try {
        const res = await fetch(attempt.requested, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' em ' + attempt.requested);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return { doc, sourceUrl: attempt.requested, finalUrl: url, viaProxy: attempt.viaProxy };
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error('Falha ao buscar pagina: ' + (lastError ? lastError.message : url));
  }

  function inferListingUrlFromLocation() {
    const currentHref = sanitizeSpaces(window.location.href);
    if (!currentHref) return '';

    try {
      const parsed = new URL(currentHref);
      if (/\/noticias(\/|$)/i.test(parsed.pathname)) {
        return parsed.origin + '/noticias';
      }
    } catch {
      // noop
    }

    const newsAnchor = document.querySelector('a[href*="/noticias"]');
    if (newsAnchor) {
      const found = toAbsoluteUrl(newsAnchor.getAttribute('href') || newsAnchor.href || '', currentHref);
      if (found) return found;
    }

    return currentHref;
  }

  function deepGet(source, path) {
    if (!source || !path) return undefined;
    const parts = String(path).split('.');
    let current = source;

    for (const part of parts) {
      if (current == null) return undefined;

      if (Array.isArray(current)) {
        const index = Number(part);
        if (Number.isFinite(index)) {
          current = current[index];
        } else {
          current = current[0];
          if (current == null) return undefined;
          current = current[part];
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  function deepGetStrict(source, path) {
    if (!source || !path) return undefined;
    const parts = String(path).split('.');
    let current = source;

    for (const part of parts) {
      if (current == null) return undefined;

      if (Array.isArray(current)) {
        const index = Number(part);
        if (!Number.isFinite(index)) return undefined;
        current = current[index];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  function pickFirstPath(source, paths) {
    for (const path of paths) {
      const value = deepGet(source, path);
      if (value == null) continue;
      if (typeof value === 'string' && !sanitizeSpaces(value)) continue;
      return value;
    }
    return undefined;
  }

  function pickFirstPathStrict(source, paths) {
    for (const path of paths) {
      const value = deepGetStrict(source, path);
      if (value == null) continue;
      if (typeof value === 'string' && !sanitizeSpaces(value)) continue;
      return value;
    }
    return undefined;
  }

  function stripHtmlTags(value) {
    const raw = String(value || '');
    if (!raw) return '';
    return raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\r/g, '\n')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function splitParagraphText(raw) {
    const source = String(raw || '')
      .replace(/\r/g, '\n')
      .replace(/\u00a0/g, ' ')
      .trim();

    if (!source) return [];

    const chunks = source
      .split(/\n\s*\n+/)
      .map((part) => sanitizeSpaces(part.replace(/\s*\n\s*/g, ' ')))
      .filter((part) => part.length >= 2);

    if (chunks.length) return chunks;

    const compact = sanitizeSpaces(source);
    return compact ? [compact] : [];
  }

  function uniqueParagraphs(paragraphs) {
    const out = [];
    const seen = new Set();

    (Array.isArray(paragraphs) ? paragraphs : []).forEach((item) => {
      const text = sanitizeSpaces(item || '');
      if (!text) return;
      const key = normalizeLoose(text);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(text);
    });

    return out;
  }

  function contentToParagraphs(value, depth = 0) {
    if (value == null || depth > 6) return [];

    if (typeof value === 'string') {
      return splitParagraphText(stripHtmlTags(value));
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return [String(value)];
    }

    if (Array.isArray(value)) {
      const merged = [];
      value.forEach((item) => {
        const parts = contentToParagraphs(item, depth + 1);
        if (parts.length) merged.push(...parts);
      });
      return uniqueParagraphs(merged);
    }

    if (typeof value === 'object') {
      const nodeType = normalizeLoose(value.type || value.nodeType || '');

      if ((nodeType === 'text' || nodeType === 'span') && typeof value.text === 'string') {
        return splitParagraphText(stripHtmlTags(value.text));
      }

      if (nodeType === 'paragraph') {
        const children = Array.isArray(value.children) ? value.children : [];
        const line = sanitizeSpaces(children.map((child) => contentToText(child, depth + 1)).join(' '));
        if (line) return [line];
      }

      const preferred = [
        'rendered', 'html', 'text', 'value', 'content', 'conteudo', 'body', 'raw', 'excerpt', 'description'
      ];

      for (const key of preferred) {
        if (value[key] == null) continue;
        const got = contentToParagraphs(value[key], depth + 1);
        if (got.length) return got;
      }

      const merged = [];
      Object.values(value).forEach((child) => {
        const parts = contentToParagraphs(child, depth + 1);
        if (parts.length) merged.push(...parts);
      });
      return uniqueParagraphs(merged);
    }

    return [];
  }

  function contentToText(value, depth = 0) {
    return contentToParagraphs(value, depth).join('\n\n');
  }

  function toIsoDate(rawValue) {
    const raw = sanitizeSpaces(rawValue || '');
    if (!raw) return null;

    const iso = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

    const br = raw.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
    if (br) return br[3] + '-' + br[2] + '-' + br[1];

    return null;
  }

  function normalizeNewsDate(rawValue) {
    if (Array.isArray(rawValue)) return null;

    let value = rawValue;
    if (value && typeof value === 'object') {
      value = pickFirstPathStrict(value, ['data', 'date', 'publishedAt', 'createdAt', 'value']);
    }

    const raw = sanitizeSpaces(value || '');
    if (!raw) return null;

    const directIso = toIsoDate(raw);
    if (directIso) return directIso;

    const fromText = extractDateFromText(raw);
    if (fromText) {
      const isoFromText = toIsoDate(fromText);
      return isoFromText || fromText;
    }

    return raw;
  }

  function slugify(value) {
    const normalized = normalizeLoose(value || '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
    return normalized || 'noticia';
  }

  function looksLikeImageUrl(url) {
    return /\.(jpg|jpeg|png|webp|gif|svg|avif)(?:\?|#|$)/i.test(String(url || ''));
  }

  function scoreMainImageUrl(url) {
    const raw = sanitizeSpaces(url || '');
    if (!raw) return -99999;

    let score = 0;
    const loose = normalizeLoose(raw);

    if (/(logo|favicon|avatar|sprite|icon)/i.test(loose)) score -= 2000;
    if (looksLikeImageUrl(raw)) score += 120;
    if (/\d{3,4}x\d{3,4}/i.test(raw)) score += 40;

    try {
      const parsed = new URL(raw, window.location.href);
      const path = parsed.pathname.toLowerCase();

      if (parsed.origin === window.location.origin) score += 180;
      if (/^\/uploads\//.test(path)) score += 900;
      if (/^\/cms\/uploads\//.test(path)) score += 700;
      if (/\/uploads\//.test(path)) score += 250;

      // Strong penalty for malformed detail-relative image URLs.
      if (/\/noticias\/uploads\//.test(path)) score -= 1200;
    } catch {
      // noop
    }

    return score;
  }

  function pickMainImageUrl(value) {
    const unique = [];
    const seen = new Set();

    const list = Array.isArray(value) ? value : [value];
    list.forEach((item) => {
      const raw = sanitizeSpaces(item || '');
      if (!raw) return;
      const abs = toAbsoluteUrl(raw, window.location.href);
      if (!abs || seen.has(abs)) return;
      seen.add(abs);
      unique.push(abs);
    });

    if (!unique.length) return '';

    unique.sort((a, b) => scoreMainImageUrl(b) - scoreMainImageUrl(a));
    return unique[0] || '';
  }

  function isLikelySlugToken(value) {
    const slug = sanitizeSpaces(value || '');
    if (!slug) return false;
    if (/^https?:\/\//i.test(slug)) return false;
    if (slug.startsWith('/')) return false;
    if (slug.includes('/')) return false;
    if (/\s/.test(slug)) return false;
    if (/\.[a-z0-9]{2,6}(?:[?#]|$)/i.test(slug)) return false;
    return /^[a-z0-9-_.]+$/i.test(slug);
  }

  function isLikelyNewsDetailUrl(url) {
    const raw = sanitizeSpaces(url || '');
    if (!raw) return false;
    if (/^api:\/\//i.test(raw)) return false;
    if (looksLikeImageUrl(raw)) return false;

    try {
      const parsed = new URL(raw, window.location.href);
      const path = parsed.pathname.toLowerCase();
      if (/\/(uploads|media|assets)\//.test(path)) return false;
      if (/\.(pdf|docx?|xlsx?|xls|csv|zip|rar)(?:$|\?)/i.test(path)) return false;
      if (/\/noticias(\/|$)/i.test(path)) return true;
      return !/\.[a-z0-9]{2,6}(?:$|\?)/i.test(path);
    } catch {
      return false;
    }
  }

  function isLikelyNewsRawItem(rawItem) {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) return false;

    const directTitle = pickFirstPathStrict(rawItem, [
      'titulo', 'title', 'headline',
      'attributes.titulo', 'attributes.title', 'attributes.headline'
    ]);
    const title = sanitizeSpaces(contentToText(directTitle));
    if (!title || title.length < 8) return false;

    const contentCandidate = pickFirstPathStrict(rawItem, [
      'conteudo', 'content', 'texto', 'text', 'body',
      'attributes.conteudo', 'attributes.content', 'attributes.texto',
      'content.rendered', 'excerpt.rendered'
    ]);

    const dateCandidate = pickFirstPathStrict(rawItem, [
      'data', 'date', 'publishedAt', 'createdAt',
      'attributes.data', 'attributes.date', 'attributes.publishedAt'
    ]);

    const hasContent = Boolean(contentToParagraphs(contentCandidate).length);
    const hasDate = Boolean(normalizeNewsDate(dateCandidate));
    const hasSlug = Boolean(pickFirstPathStrict(rawItem, ['slug', 'attributes.slug', 'documentId', 'attributes.documentId']));

    return hasContent || hasDate || hasSlug;
  }

  function isLikelyApiEndpoint(url) {
    return /\/api\/|\/wp-json\/|graphql|_next\/data|\.json(?:\?|$)/i.test(String(url || ''));
  }

  function sanitizeApiEndpoint(raw, baseUrl) {
    const candidate = sanitizeSpaces(raw || '');
    if (!candidate) return '';
    if (/^data:|^javascript:/i.test(candidate)) return '';

    try {
      return new URL(candidate, baseUrl).href;
    } catch {
      return '';
    }
  }

  function discoverApiCandidates(baseUrl) {
    const out = new Set();

    const push = (raw) => {
      const endpoint = sanitizeApiEndpoint(raw, baseUrl);
      if (!endpoint) return;
      if (!isLikelyApiEndpoint(endpoint)) return;
      out.add(endpoint);
    };

    const seedEndpoints = [
      '/cms/api/noticias?pagination[page]=1&pagination[pageSize]=20&populate[autor][populate]=*&populate[galeria_imagens][populate]=*&sort=data:desc',
      '/cms/api/noticias?pagination[page]=1&pagination[pageSize]=20&sort=data:desc',
      '/cms/api/noticias?pagination[page]=1&pagination[pageSize]=50',
      '/cms/api/noticias',
      '/api/noticias',
      '/api/noticias?page=1',
      '/api/noticias?limit=100',
      '/api/news',
      '/api/posts',
      '/api/public/noticias',
      '/api/public/news',
      '/wp-json/wp/v2/posts?per_page=100',
      '/wp-json/wp/v2/noticias?per_page=100'
    ];
    seedEndpoints.forEach(push);

    if (window.performance && typeof window.performance.getEntriesByType === 'function') {
      const resources = window.performance.getEntriesByType('resource') || [];
      resources.forEach((entry) => {
        const name = entry && typeof entry.name === 'string' ? entry.name : '';
        if (isLikelyApiEndpoint(name)) push(name);
      });
    }

    const scripts = Array.from(document.querySelectorAll('script'));
    const apiRegex = /(https?:\/\/[^"'\s)]+|\/(?:api|wp-json|_next\/data)[^"'\s)]+|\/(?:graphql)[^"'\s)]*)/gi;

    scripts.forEach((script) => {
      const src = sanitizeSpaces(script.getAttribute('src') || '');
      if (src && isLikelyApiEndpoint(src)) push(src);

      const text = String(script.textContent || '');
      if (!text) return;
      const sample = text.slice(0, 120000);
      apiRegex.lastIndex = 0;

      let match = null;
      while ((match = apiRegex.exec(sample)) !== null) {
        push(match[1]);
      }
    });

    if (window.__NEXT_DATA__ && window.__NEXT_DATA__.buildId) {
      try {
        const base = new URL(baseUrl);
        const routePath = base.pathname.replace(/\/+$/, '') || '/';
        const pagePath = routePath === '/' ? '/index' : routePath;
        push('/_next/data/' + window.__NEXT_DATA__.buildId + pagePath + '.json');
      } catch {
        // noop
      }
    }

    return Array.from(out);
  }

  function extractImageUrlsFromValue(node, baseUrl, maxItems = 10) {
    const out = [];
    const seen = new Set();
    const queue = [node];
    let guard = 0;

    const maybePush = (raw) => {
      const abs = toAbsoluteUrl(raw, baseUrl);
      if (!abs) return;
      if (seen.has(abs)) return;
      if (!/\.(jpg|jpeg|png|webp|gif|svg|avif)(?:\?|#|$)/i.test(abs)) return;
      if (/(logo|favicon|avatar|sprite|icon)/i.test(abs)) return;
      seen.add(abs);
      out.push(abs);
    };

    while (queue.length && guard < 2500 && out.length < maxItems) {
      guard += 1;
      const current = queue.shift();
      if (current == null) continue;

      if (typeof current === 'string') {
        maybePush(current);
        continue;
      }

      if (Array.isArray(current)) {
        current.forEach((item) => queue.push(item));
        continue;
      }

      if (typeof current === 'object') {
        Object.entries(current).forEach(([key, value]) => {
          if (typeof value === 'string' && /(img|image|foto|capa|thumb|banner|cover|url)/i.test(key)) {
            maybePush(value);
          }
          if (value && typeof value === 'object') queue.push(value);
        });
      }
    }

    return out;
  }

  function normalizeApiNewsItem(rawItem, baseUrl) {
    if (!rawItem || typeof rawItem !== 'object') return null;
    if (!isLikelyNewsRawItem(rawItem)) return null;

    const titleRaw = pickFirstPathStrict(rawItem, [
      'titulo', 'title', 'headline',
      'attributes.titulo', 'attributes.title',
      'title.rendered'
    ]);
    const title = sanitizeSpaces(contentToText(titleRaw));
    if (!title) return null;

    const dateRaw = pickFirstPathStrict(rawItem, [
      'data', 'date', 'publishedAt', 'createdAt',
      'attributes.data', 'attributes.date', 'attributes.publishedAt'
    ]);

    const contentRaw = pickFirstPathStrict(rawItem, [
      'conteudo', 'content', 'texto', 'text', 'body',
      'description', 'excerpt', 'resumo',
      'attributes.conteudo', 'attributes.content', 'attributes.texto',
      'content.rendered', 'excerpt.rendered'
    ]);

    const linkRaw = pickFirstPathStrict(rawItem, [
      'link', 'url', 'href', 'permalink', 'slug',
      'attributes.link', 'attributes.url', 'attributes.href', 'attributes.slug',
      'links.publico', 'links.public'
    ]);

    const slugRaw = pickFirstPathStrict(rawItem, [
      'slug',
      'attributes.slug',
      'documentId',
      'attributes.documentId'
    ]);

    const mainImageRaw = pickFirstPath(rawItem, [
      'imagem', 'image', 'thumbnail', 'featuredImage', 'cover',
      'attributes.imagem', 'attributes.image', 'attributes.thumbnail',
      'data.imagem', 'data.image',
      'imagem.url', 'image.url', 'thumbnail.url', 'featuredImage.url',
      'yoast_head_json.og_image.0.url'
    ]);

    let linkNoticia = toAbsoluteUrl(linkRaw, baseUrl);
    if (linkNoticia && looksLikeImageUrl(linkNoticia)) {
      linkNoticia = '';
    }

    if (!linkNoticia && typeof slugRaw === 'string') {
      const slug = sanitizeSpaces(slugRaw).replace(/^\/+/, '');
      if (isLikelySlugToken(slug)) {
        linkNoticia = toAbsoluteUrl('/noticias/' + slug, baseUrl);
      }
    }

    if (!linkNoticia && typeof linkRaw === 'string') {
      const slug = sanitizeSpaces(linkRaw).replace(/^\/+/, '');
      if (isLikelySlugToken(slug)) {
        linkNoticia = toAbsoluteUrl('/noticias/' + slug, baseUrl);
      }
    }
    if (!linkNoticia) {
      linkNoticia = 'api://noticia/' + slugify(title + '-' + normalizeNewsDate(dateRaw));
    }

    const contentParagraphs = contentToParagraphs(contentRaw);
    const contentText = contentParagraphs.join('\n\n');
    const images = extractImageUrlsFromValue(rawItem, baseUrl, 10);
    const mainImage = toAbsoluteUrl(mainImageRaw, baseUrl);
    if (mainImage && !images.includes(mainImage)) images.unshift(mainImage);
    const bestImage = pickMainImageUrl(images);

    const date = normalizeNewsDate(dateRaw);

    if (!contentText && !images.length && !date) return null;

    return {
      titulo_noticia: title,
      data_publicacao: date || null,
      texto_noticia: contentText || null,
      paragrafos_noticia: contentParagraphs,
      link_imagens: bestImage ? [bestImage] : [],
      link_noticia: linkNoticia
    };
  }

  function buildNewsSignature(item) {
    return [
      sanitizeSpaces(item && item.link_noticia ? item.link_noticia : ''),
      normalizeLoose(item && item.titulo_noticia ? item.titulo_noticia : ''),
      sanitizeSpaces(item && item.data_publicacao ? item.data_publicacao : '')
    ].join('|');
  }

  function mergeUniqueNewsItems(currentItems, incomingItems) {
    const out = Array.isArray(currentItems) ? currentItems.slice() : [];
    const seen = new Set(out.map((item) => buildNewsSignature(item)));

    (Array.isArray(incomingItems) ? incomingItems : []).forEach((item) => {
      const signature = buildNewsSignature(item);
      if (!signature || seen.has(signature)) return;
      seen.add(signature);
      out.push(item);
    });

    return out;
  }

  function extractNewsItemsFromUnknownJson(payload, baseUrl) {
    const out = [];
    const signatures = new Set();

    const pushItem = (rawItem) => {
      const normalized = normalizeApiNewsItem(rawItem, baseUrl);
      if (!normalized) return;

      const signature = (normalized.link_noticia || '') + '|' + normalizeLoose(normalized.titulo_noticia || '');
      if (signatures.has(signature)) return;
      signatures.add(signature);
      out.push(normalized);
    };

    const primaryArrays = [];
    const metaPagination = deepGet(payload, 'meta.pagination');
    if (Array.isArray(deepGet(payload, 'data')) && metaPagination) {
      primaryArrays.push(deepGet(payload, 'data'));
    }

    const candidatePaths = [
      'data', 'items', 'noticias', 'news', 'posts', 'results', 'result.items'
    ];

    candidatePaths.forEach((path) => {
      const value = deepGet(payload, path);
      if (Array.isArray(value)) primaryArrays.push(value);
    });

    if (primaryArrays.length) {
      primaryArrays.forEach((arr) => {
        arr.forEach((item) => {
          if (item && typeof item === 'object') pushItem(item);
        });
      });
      return out;
    }

    const queue = [payload];
    let guard = 0;

    while (queue.length && guard < 2000) {
      guard += 1;
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;

      if (Array.isArray(current)) {
        current.forEach((item) => {
          if (item && typeof item === 'object') {
            if (isLikelyNewsRawItem(item)) pushItem(item);
            queue.push(item);
          }
        });
        continue;
      }

      Object.values(current).forEach((value) => {
        if (value && typeof value === 'object') queue.push(value);
      });
    }

    return out;
  }

  async function tryFetchJson(endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store'
      });
      if (!res.ok) return null;

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const text = await res.text();
      if (!text) return null;

      let clean = text.trim();
      clean = clean.replace(/^\)\]\}',?\s*/, '');

      if (!contentType.includes('json') && !/^[\[{]/.test(clean)) return null;
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }

  function extractApiPagination(payload) {
    const candidates = [
      deepGet(payload, 'meta.pagination'),
      deepGet(payload, 'pagination'),
      deepGet(payload, 'data.meta.pagination'),
      deepGet(payload, 'meta')
    ];

    for (const current of candidates) {
      if (!current || typeof current !== 'object') continue;
      const page = Number(current.page);
      const pageSize = Number(current.pageSize || current.perPage || current.limit);
      const pageCount = Number(current.pageCount || current.pages || current.totalPages);
      const total = Number(current.total || current.totalCount || current.count);

      if (Number.isFinite(page) || Number.isFinite(pageCount) || Number.isFinite(total)) {
        return {
          page: Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1,
          pageSize: Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 20,
          pageCount: Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : null,
          total: Number.isFinite(total) ? Math.max(0, Math.floor(total)) : null
        };
      }
    }

    return { page: 1, pageSize: 20, pageCount: null, total: null };
  }

  function buildApiPageEndpoint(endpoint, page, pageSize) {
    try {
      const parsed = new URL(endpoint);
      const keys = Array.from(parsed.searchParams.keys()).map((key) => key.toLowerCase());
      const hasStrapiPagination = keys.some((key) => key.startsWith('pagination['));
      const hasCmsPath = /\/cms\/api\//i.test(parsed.pathname);

      if (hasStrapiPagination || hasCmsPath) {
        parsed.searchParams.set('pagination[page]', String(page));
        if (!parsed.searchParams.has('pagination[pageSize]')) {
          parsed.searchParams.set('pagination[pageSize]', String(pageSize || 20));
        }
        return parsed.href;
      }

      if (parsed.searchParams.has('pagina')) {
        parsed.searchParams.set('pagina', String(page));
      } else {
        parsed.searchParams.set('page', String(page));
      }

      if (!parsed.searchParams.has('pageSize') && !parsed.searchParams.has('per_page') && !parsed.searchParams.has('limit')) {
        parsed.searchParams.set('pageSize', String(pageSize || 20));
      }

      return parsed.href;
    } catch {
      return endpoint;
    }
  }

  async function collectApiPages(endpoint, firstPayload, baseUrl, firstItems) {
    let merged = mergeUniqueNewsItems([], firstItems);
    const pagination = extractApiPagination(firstPayload);
    const maxPagesAllowed = Math.max(1, asPositiveInt(opts.maxPaginas, 1));

    let totalPages = pagination.pageCount;
    if (!Number.isFinite(totalPages) && Number.isFinite(pagination.total) && Number.isFinite(pagination.pageSize) && pagination.pageSize > 0) {
      totalPages = Math.ceil(pagination.total / pagination.pageSize);
    }

    totalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
    totalPages = Math.min(totalPages, maxPagesAllowed);

    if (totalPages <= 1) return merged;

    for (let page = 2; page <= totalPages; page++) {
      if (state.cancelRequested) break;
      const endpointPage = buildApiPageEndpoint(endpoint, page, pagination.pageSize || 20);
      const payload = await tryFetchJson(endpointPage);
      if (!payload) break;

      const items = extractNewsItemsFromUnknownJson(payload, baseUrl);
      if (!items.length) break;
      merged = mergeUniqueNewsItems(merged, items);

      if (opts.delayMs > 0) await sleep(Math.min(opts.delayMs, 500));
    }

    return merged;
  }

  async function scanFromDetectedApi(baseUrl) {
    if (!opts.autoDetectApi) return { endpoint: '', items: [] };

    const endpoints = discoverApiCandidates(baseUrl);
    if (!endpoints.length) return { endpoint: '', items: [] };

    let best = { endpoint: '', items: [], payload: null };

    for (const endpoint of endpoints.slice(0, 14)) {
      if (state.cancelRequested) break;
      const endpointPage = buildApiPageEndpoint(endpoint, 1, 20);
      const payload = await tryFetchJson(endpointPage);
      if (!payload) continue;

      const items = extractNewsItemsFromUnknownJson(payload, baseUrl);
      if (items.length > best.items.length) {
        best = { endpoint, items, payload };
      }

      if (best.items.length >= 20) break;
    }

    if (!best.items.length) return { endpoint: '', items: [] };

    const items = await collectApiPages(best.endpoint, best.payload, baseUrl, best.items);
    return { endpoint: best.endpoint, items };
  }

  function apiItemsToQueueLinks(items, originPage) {
    return items.map((item, index) => {
      const safeLink = sanitizeSpaces(item.link_noticia || '');
      const fallbackLink = safeLink || ('api://noticia/' + slugify((item.titulo_noticia || 'item') + '-' + (index + 1)));
      return {
        link_noticia: fallbackLink,
        titulo_previo: item.titulo_noticia || null,
        data_previa: item.data_publicacao || null,
        imagem_previa: item.link_imagens && item.link_imagens.length ? item.link_imagens[0] : null,
        origem_pagina: originPage,
        api_noticia: item
      };
    });
  }

  function extractDateFromText(text) {
    const source = sanitizeSpaces(text);
    if (!source) return null;

    const numeric = source.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);
    if (numeric) {
      const d = numeric[1].padStart(2, '0');
      const m = numeric[2].padStart(2, '0');
      return d + '/' + m + '/' + numeric[3];
    }

    const extenso = source.match(/\b(\d{1,2})\s+de\s+([a-zA-Zçãõáéíóúâêôà]+)\s+de\s+(\d{4})\b/i);
    if (extenso) {
      const months = {
        janeiro: '01', fevereiro: '02', marco: '03', 'marcoo': '03', 'marco ': '03', 'marco.': '03', 'março': '03', abril: '04', maio: '05', junho: '06',
        julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
      };
      const key = extenso[2].toLowerCase();
      const month = months[key] || months[normalizeLoose(key)];
      if (month) return extenso[1].padStart(2, '0') + '/' + month + '/' + extenso[3];
    }

    return null;
  }

  function collectCardLinks(doc, pageUrl, selectorCustom) {
    const selectors = [];
    const custom = sanitizeSpaces(selectorCustom);
    if (custom) selectors.push(custom);

    selectors.push(
      'a[href*="/noticias/"]',
      'main a[href]',
      'article a[href]',
      '.grid a[href]',
      '.card a[href]'
    );

    const map = new Map();

    for (const selector of selectors) {
      let anchors = [];
      try {
        anchors = Array.from(doc.querySelectorAll(selector));
      } catch {
        continue;
      }

      for (const anchor of anchors) {
        const href = toAbsoluteUrl(anchor.getAttribute('href') || anchor.href || '', pageUrl);
        if (!href || !likelyNewsLink(href)) continue;

        const card = anchor.closest('article, .card, li, .item') || anchor.closest('a') || anchor;
        const titleEl = card.querySelector('h1, h2, h3, h4') || anchor.querySelector('h1, h2, h3, h4');
        const title = sanitizeSpaces((titleEl && titleEl.textContent) || anchor.getAttribute('title') || anchor.textContent);
        const date = extractDateFromText(card.textContent || '');

        const imageEl = card.querySelector('img') || anchor.querySelector('img');
        const previewImage = imageEl
          ? toAbsoluteUrl(
              imageEl.getAttribute('src') || imageEl.getAttribute('data-src') || imageEl.getAttribute('data-lazy-src') || '',
              pageUrl
            )
          : '';

        const key = href.split('#')[0];
        if (!map.has(key)) {
          map.set(key, {
            link_noticia: href,
            titulo_previo: title || null,
            data_previa: date || null,
            imagem_previa: previewImage || null,
            origem_pagina: pageUrl
          });
        }
      }
    }

    return Array.from(map.values());
  }

  function detectBlockedFramesAndSources(doc, pageUrl) {
    const iframes = Array.from(doc.querySelectorAll('iframe'));
    const out = [];
    for (const iframe of iframes) {
      const src = toAbsoluteUrl(iframe.getAttribute('src') || iframe.src || '', pageUrl);
      if (src) out.push(src);
    }
    return out;
  }

  function parseTotalPages(doc) {
    const text = sanitizeSpaces(doc.body ? doc.body.textContent : '');
    const match = text.match(/pagina\s+(\d+)\s+de\s+(\d+)/i);
    if (!match) return null;
    const current = Number(match[1]);
    const total = Number(match[2]);
    if (!Number.isFinite(current) || !Number.isFinite(total)) return null;
    return { current, total };
  }

  function findNextPageUrl(doc, currentUrl, expectedNextPage) {
    const anchors = Array.from(doc.querySelectorAll('a[href], button[data-href]'));
    for (const anchor of anchors) {
      const href = toAbsoluteUrl(anchor.getAttribute('href') || anchor.getAttribute('data-href') || '', currentUrl);
      if (!href) continue;

      const label = sanitizeSpaces((anchor.textContent || '') + ' ' + (anchor.getAttribute('aria-label') || ''));
      const rel = (anchor.getAttribute('rel') || '').toLowerCase();

      if (rel === 'next') return href;
      if (/proximo|pr[oó]ximo|next|seguinte|avancar|avan[cç]ar/i.test(label)) return href;
      if (label === String(expectedNextPage)) return href;
    }

    try {
      const parsed = new URL(currentUrl);

      const withPage = new URL(parsed.href);
      withPage.searchParams.set('page', String(expectedNextPage));
      if (withPage.href !== currentUrl) return withPage.href;

      const withPagina = new URL(parsed.href);
      withPagina.searchParams.set('pagina', String(expectedNextPage));
      if (withPagina.href !== currentUrl) return withPagina.href;

      const pathPage = new URL(parsed.href);
      pathPage.pathname = parsed.pathname.replace(/\/+$/, '') + '/page/' + expectedNextPage;
      if (pathPage.href !== currentUrl) return pathPage.href;

      const pathPagina = new URL(parsed.href);
      pathPagina.pathname = parsed.pathname.replace(/\/+$/, '') + '/pagina/' + expectedNextPage;
      if (pathPagina.href !== currentUrl) return pathPagina.href;
    } catch {
      return null;
    }

    return null;
  }

  function buildStartPageUrl(baseUrl, pageNumber) {
    if (pageNumber <= 1) return baseUrl;
    try {
      const parsed = new URL(baseUrl);
      if (parsed.searchParams.has('page') || !parsed.searchParams.has('pagina')) {
        parsed.searchParams.set('page', String(pageNumber));
      } else {
        parsed.searchParams.set('pagina', String(pageNumber));
      }
      return parsed.href;
    } catch {
      return baseUrl;
    }
  }

  function pickArticleRoot(doc, titleElement) {
    if (titleElement) {
      const byTitle = titleElement.closest('article, main, section, [class*="content"], [class*="post"], [class*="news"], [class*="noticia"]');
      if (byTitle) return byTitle;
    }
    return doc.querySelector('article') || doc.querySelector('main') || doc.body || doc;
  }

  function extractNewsFromDetail(doc, fallback) {
    const titleEl = doc.querySelector('h1') || doc.querySelector('main h2') || null;
    const titleMeta = doc.querySelector('meta[property="og:title"]');
    const title = sanitizeSpaces(
      (titleEl && titleEl.textContent) ||
      (titleMeta && titleMeta.getAttribute('content')) ||
      fallback.titulo_previo ||
      doc.title || ''
    ) || null;

    const timeEl = doc.querySelector('time[datetime]') || doc.querySelector('time') || doc.querySelector('[class*="date" i], [class*="data" i]');
    let date = null;
    if (timeEl) date = sanitizeSpaces(timeEl.getAttribute('datetime') || timeEl.textContent);
    date = normalizeNewsDate(date || fallback.data_previa || extractDateFromText(doc.body ? doc.body.textContent : ''));

    const root = pickArticleRoot(doc, titleEl);
    const paragraphs = [];
    const seen = new Set();

    const pEls = Array.from(root.querySelectorAll('p'));
    for (const pEl of pEls) {
      const value = sanitizeSpaces(pEl.textContent || '');
      if (!value || value.length < 3) continue;
      if (seen.has(value)) continue;
      seen.add(value);
      paragraphs.push(value);
    }

    let texto = paragraphs.join('\n\n');
    if (!texto) {
      const desc = doc.querySelector('meta[name="description"], meta[property="og:description"]');
      texto = sanitizeSpaces(desc ? desc.getAttribute('content') : '') || null;
    }

    const images = [];
    const imgSeen = new Set();
    const imgEls = Array.from(root.querySelectorAll('img'));
    for (const imgEl of imgEls) {
      const rawSrc = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
      const src = toAbsoluteUrl(rawSrc, fallback.link_noticia);
      if (!src) continue;
      if (/(logo|favicon|avatar|sprite|icon)/i.test(src.toLowerCase())) continue;
      if (imgSeen.has(src)) continue;
      imgSeen.add(src);
      images.push(src);
    }

    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const src = toAbsoluteUrl(ogImage.getAttribute('content') || '', fallback.link_noticia);
      if (src && !imgSeen.has(src)) {
        imgSeen.add(src);
        images.unshift(src);
      }
    }

    if (fallback.imagem_previa && !imgSeen.has(fallback.imagem_previa)) {
      images.push(fallback.imagem_previa);
    }

    const bestImage = pickMainImageUrl(images);

    return {
      titulo_noticia: title,
      data_publicacao: date || null,
      texto_noticia: texto || null,
      paragrafos_noticia: uniqueParagraphs(paragraphs),
      link_imagens: bestImage ? [bestImage] : [],
      link_noticia: fallback.link_noticia
    };
  }

  function buildFastNews(item) {
    return {
      titulo_noticia: item.titulo_previo || null,
      data_publicacao: item.data_previa || null,
      texto_noticia: null,
      paragrafos_noticia: [],
      link_imagens: item.imagem_previa ? [item.imagem_previa] : [],
      link_noticia: item.link_noticia
    };
  }

  function normalizeRequiredImageList(value) {
    const main = pickMainImageUrl(value);
    return main ? [main] : [];
  }

  function normalizeRequiredParagraphs(item) {
    const initial = Array.isArray(item && item.paragrafos_noticia) ? item.paragrafos_noticia : [];
    let merged = uniqueParagraphs(initial);

    if (!merged.length) {
      const rawText = item && item.texto_noticia ? String(item.texto_noticia) : '';
      merged = uniqueParagraphs(splitParagraphText(rawText));
    }

    return merged;
  }

  function toNumberedParagraphObject(paragraphs) {
    const out = {};
    (Array.isArray(paragraphs) ? paragraphs : []).forEach((paragraph, index) => {
      out[String(index + 1)] = paragraph;
    });
    return out;
  }

  function toRequiredNoticiasPayload(items) {
    const out = [];

    (Array.isArray(items) ? items : []).forEach((item) => {
      const titulo = sanitizeSpaces(item && item.titulo_noticia ? item.titulo_noticia : '');
      const conteudo = toNumberedParagraphObject(normalizeRequiredParagraphs(item));
      const dataPublicacao = sanitizeSpaces(item && item.data_publicacao ? item.data_publicacao : '');
      const imagens = normalizeRequiredImageList(item && item.link_imagens ? item.link_imagens : []);

      if (!titulo && !Object.keys(conteudo).length && !dataPublicacao && !imagens.length) return;

      out.push({
        'id:': String(out.length + 1),
        titulo,
        conteudo,
        'data de Publicação': dataPublicacao,
        urlDasImagens: imagens
      });
    });

    return out;
  }

  function baixarJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function sanitizeFilename(value) {
    const raw = String(value || '');
    if (!raw) return '';
    try {
      return raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
    } catch {
      return raw
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
    }
  }

  function inferImageExtension(url, contentType) {
    const mime = String(contentType || '').toLowerCase();
    if (mime.includes('image/jpeg')) return 'jpg';
    if (mime.includes('image/png')) return 'png';
    if (mime.includes('image/webp')) return 'webp';
    if (mime.includes('image/gif')) return 'gif';
    if (mime.includes('image/svg+xml')) return 'svg';
    if (mime.includes('image/avif')) return 'avif';

    const src = sanitizeSpaces(url || '');
    const extMatch = src.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/);
    if (extMatch) return extMatch[1].toLowerCase();
    return 'jpg';
  }

  function buildImageDownloadName(noticia, index, imageUrl, contentType) {
    const title = sanitizeSpaces(noticia && noticia.titulo_noticia ? noticia.titulo_noticia : 'noticia');
    const titleStart = title.slice(0, 42);
    const safeTitle = sanitizeFilename(titleStart) || 'noticia';
    const order = String(index + 1).padStart(3, '0');
    const extension = inferImageExtension(imageUrl, contentType);
    return order + '_' + safeTitle + '.' + extension;
  }

  function triggerDownloadFromBlob(blob, filename) {
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  async function baixarImagensNoticias() {
    const payload = toRequiredNoticiasPayload(state.noticias);
    if (!payload.length) {
      alert('[EXTRACTRON] Nao ha noticias para baixar imagens.');
      return { total: 0, baixadas: 0, falhas: 0 };
    }

    let baixadas = 0;
    let falhas = 0;
    setStatus('Baixando imagens das noticias...');
    updateUI();

    for (let i = 0; i < payload.length; i++) {
      const item = payload[i];
      const imageUrl = Array.isArray(item.urlDasImagens) && item.urlDasImagens.length ? item.urlDasImagens[0] : '';
      if (!imageUrl) continue;

      const originalNews = state.noticias.find((news) => sanitizeSpaces(news && news.titulo_noticia) === sanitizeSpaces(item.titulo)) || null;

      try {
        const response = await fetch(imageUrl, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store'
        });

        if (!response.ok) throw new Error('HTTP ' + response.status);

        const filename = buildImageDownloadName(originalNews || { titulo_noticia: item.titulo }, i, imageUrl, response.headers.get('content-type'));
        const blob = await response.blob();
        triggerDownloadFromBlob(blob, filename);
        baixadas += 1;
      } catch (error) {
        falhas += 1;
        state.falhas.push({ link_noticia: imageUrl, erro: 'Falha ao baixar imagem: ' + error.message });
      }

      if (opts.delayMs > 0) await sleep(Math.min(opts.delayMs, 250));
    }

    setStatus('Imagens baixadas: ' + baixadas + ' | Falhas: ' + falhas + '.');
    updateUI();
    return { total: payload.length, baixadas, falhas };
  }

  function setStatus(text) {
    state.statusText = sanitizeSpaces(text) || 'Pronto.';
    if (ui.status) ui.status.textContent = state.statusText;
  }

  function getEstimatedTime() {
    if (!state.running || state.processed.length === 0) return null;
    const withDuration = state.processed.filter((it) => Number.isFinite(it.duration) && it.duration > 0);
    if (!withDuration.length) return null;

    const totalDuration = withDuration.reduce((sum, it) => sum + it.duration, 0);
    const avgDuration = totalDuration / withDuration.length;
    const pending = state.queue.reduce((acc, it) => acc + (state.selectedKeys.has(it.key) ? 1 : 0), 0) + runningSet.size;
    if (pending <= 0) return 0;
    return Math.ceil((pending * avgDuration) / 1000);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return hrs + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    return mins + ':' + String(secs).padStart(2, '0');
  }

  function getSelectedQueueCount() {
    return state.queue.reduce((acc, it) => acc + (state.selectedKeys.has(it.key) ? 1 : 0), 0);
  }

  function getProgressPercent() {
    if (state.running) {
      const total = state.processed.length + state.falhas.length + state.queue.length + runningSet.size;
      const done = state.processed.length + state.falhas.length;
      return total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
    }
    return Math.max(0, Math.min(100, Math.round(state.progressPercent)));
  }

  function setProgress(value) {
    state.progressPercent = Math.max(0, Math.min(100, Math.round(value)));
  }

  function ensureItemId(item) {
    if (!item) return 0;
    if (Number.isFinite(item.itemId) && item.itemId > 0) return item.itemId;
    const key = item.key;
    if (key && state.itemIdByKey.has(key)) {
      item.itemId = state.itemIdByKey.get(key);
      return item.itemId;
    }

    const id = state.nextItemId++;
    item.itemId = id;
    if (key) state.itemIdByKey.set(key, id);
    return id;
  }

  function createQueueItem(linkData) {
    const link = sanitizeSpaces(linkData.link_noticia || '');
    let key = link ? String(link).split('#')[0] : '';
    if (!key) {
      key = 'api://' + slugify((linkData.titulo_previo || 'noticia') + '-' + (linkData.data_previa || 'sem-data'));
    }

    const title = sanitizeSpaces(linkData.titulo_previo || '');
    let fallbackText = title;
    if (!fallbackText) {
      try {
        if (!link || !/^https?:/i.test(link)) throw new Error('Sem URL HTTP para fallback.');
        const parsed = new URL(link);
        fallbackText = sanitizeSpaces(parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname);
      } catch {
        fallbackText = link || 'noticia';
      }
    }

    const item = {
      key,
      text: fallbackText,
      titleName: title,
      link_noticia: link,
      titulo_previo: linkData.titulo_previo || null,
      data_previa: linkData.data_previa || null,
      imagem_previa: linkData.imagem_previa || null,
      origem_pagina: linkData.origem_pagina || null,
      api_noticia: linkData.api_noticia || null,
      fileType: inferNewsTypeFromUrl(link),
      retries: 0,
      duration: null,
      itemId: null
    };

    ensureItemId(item);
    return item;
  }

  function fillQueueFromLinks(links) {
    let added = 0;
    let skipped = 0;

    for (const linkData of links) {
      const item = createQueueItem(linkData);
      if (!item.key) {
        skipped += 1;
        continue;
      }

      if (opts.dedupe && (state.doneKeys.has(item.key) || state.queuedKeys.has(item.key))) {
        skipped += 1;
        continue;
      }

      state.queue.push(item);
      state.queuedKeys.add(item.key);
      state.selectedKeys.add(item.key);
      added += 1;
    }

    return { added, skipped };
  }

  function pullNext() {
    if (!state.queue.length) return null;
    const skipped = [];
    const initialLength = state.queue.length;

    for (let i = 0; i < initialLength; i++) {
      const candidate = state.queue.shift();
      if (!candidate) break;

      if (state.selectedKeys.has(candidate.key)) {
        state.selectedKeys.delete(candidate.key);
        state.queuedKeys.delete(candidate.key);
        return candidate;
      }

      skipped.push(candidate);
    }

    if (skipped.length) state.queue.unshift(...skipped);
    return null;
  }

  async function collectLinksFromPageAndIframes(pageUrl) {
    const pageResponse = await fetchDocument(pageUrl, opts.corsProxy);
    const links = collectCardLinks(pageResponse.doc, pageUrl, opts.selectorCustom);
    const iframeSources = detectBlockedFramesAndSources(pageResponse.doc, pageUrl);

    for (const src of iframeSources) {
      if (state.cancelRequested) break;
      try {
        const iframeResponse = await fetchDocument(src, opts.corsProxy);
        const iframeLinks = collectCardLinks(iframeResponse.doc, src, opts.selectorCustom);
        iframeLinks.forEach((it) => links.push(it));
      } catch {
        state.blockedFrames.push(src);
      }
    }

    const dedupe = new Map();
    for (const link of links) {
      if (!dedupe.has(link.link_noticia)) dedupe.set(link.link_noticia, link);
    }

    const pageInfo = parseTotalPages(pageResponse.doc);
    return {
      links: Array.from(dedupe.values()),
      nextPageHint: pageInfo,
      nextPageUrl: findNextPageUrl(pageResponse.doc, pageUrl, pageInfo ? pageInfo.current + 1 : 2)
    };
  }

  async function scan() {
    if (state.running || state.scanning) {
      console.warn('[EXTRACTRON] Ja existe uma execucao em andamento.');
      return { links: [], added: 0, skipped: 0 };
    }

    syncOptsFromUI();

    const autoUrl = inferListingUrlFromLocation();
    if (autoUrl) opts.urlInicial = autoUrl;

    if (!opts.urlInicial) {
      alert('Nao foi possivel detectar a URL de noticias automaticamente. Abra a pagina de noticias e tente novamente.');
      return { links: [], added: 0, skipped: 0 };
    }

    state.cancelRequested = false;
    state.scanning = true;
    state.progressPercent = 0;
    state.paginasVisitadas = 0;
    state.linksEncontrados = 0;
    state.blockedFrames = [];
    setStatus('Escaneando paginas de noticias...');
    updateUI();

    const linksMap = new Map();
    const visitedUrls = new Set();
    let currentUrl = buildStartPageUrl(opts.urlInicial, opts.paginaInicial);
    let expectedPage = opts.paginaInicial;

    try {
      setStatus('Procurando API de noticias automaticamente...');
      updateUI();

      const autoApiResult = await scanFromDetectedApi(currentUrl || opts.urlInicial);
      if (autoApiResult.items.length) {
        const linksFromApi = apiItemsToQueueLinks(autoApiResult.items, opts.urlInicial);
        const result = fillQueueFromLinks(linksFromApi);

        state.apiEndpoint = autoApiResult.endpoint;
        state.linksEncontrados = autoApiResult.items.length;
        setProgress(100);
        setStatus('API detectada: ' + autoApiResult.endpoint + ' | Itens: ' + autoApiResult.items.length + '.');
        updateUI();

        if (opts.verbose) {
          console.log('[EXTRACTRON] API detectada automaticamente:', autoApiResult.endpoint);
          console.log('[EXTRACTRON] Itens coletados via API:', autoApiResult.items.length);
        }

        return {
          links: linksFromApi,
          added: result.added,
          skipped: result.skipped,
          viaApi: true,
          endpoint: autoApiResult.endpoint
        };
      }

      state.apiEndpoint = '';

      for (let p = 0; p < opts.maxPaginas; p++) {
        if (state.cancelRequested) break;
        if (!currentUrl || visitedUrls.has(currentUrl)) break;

        visitedUrls.add(currentUrl);
        state.paginasVisitadas += 1;

        const listProgress = Math.min(55, Math.round(((p + 1) / opts.maxPaginas) * 55));
        setProgress(listProgress);
        setStatus('Lendo pagina ' + (p + 1) + ' de ' + opts.maxPaginas + '...');
        updateUI();

        let pageCollect = null;
        try {
          pageCollect = await collectLinksFromPageAndIframes(currentUrl);
        } catch (error) {
          const fail = {
            url: currentUrl,
            erro: 'Erro ao abrir pagina de listagem: ' + error.message
          };
          state.falhas.push(fail);
          state.errors.push(fail);
          break;
        }

        pageCollect.links.forEach((item) => {
          if (!linksMap.has(item.link_noticia)) linksMap.set(item.link_noticia, item);
        });

        state.linksEncontrados = linksMap.size;
        updateUI();

        expectedPage += 1;
        let nextUrl = pageCollect.nextPageUrl;

        if (!nextUrl && pageCollect.nextPageHint && expectedPage <= pageCollect.nextPageHint.total) {
          try {
            const parsed = new URL(currentUrl);
            parsed.searchParams.set('page', String(expectedPage));
            nextUrl = parsed.href;
          } catch {
            nextUrl = null;
          }
        }

        if (!nextUrl) break;
        currentUrl = nextUrl;
        if (opts.delayMs > 0) await sleep(Math.min(opts.delayMs, 1200));
      }

      if (state.cancelRequested) {
        setStatus('Scan interrompido.');
        setProgress(0);
        return { links: [], added: 0, skipped: 0, interrompido: true };
      }

      const links = Array.from(linksMap.values());
      state.linksEncontrados = links.length;

      if (!links.length) {
        const fail = {
          url: opts.urlInicial,
          erro: 'Nenhum link de noticia encontrado. Ajuste seletor ou revise CORS.'
        };
        state.falhas.push(fail);
        state.errors.push(fail);
        setStatus('Scan concluido sem links.');
        setProgress(100);
        updateUI();
        return { links: [], added: 0, skipped: 0 };
      }

      const result = fillQueueFromLinks(links);
      setProgress(100);
      setStatus('Scan concluido. Adicionados: ' + result.added + ' | Pulados: ' + result.skipped + '.');
      updateUI();

      return { links, added: result.added, skipped: result.skipped };
    } finally {
      state.scanning = false;
      updateUI();
    }
  }

  async function runItem(item) {
    runningSet.add(item.key);
    updateUI();

    const started = Date.now();

    try {
      let noticia = null;

      if (item.api_noticia && (
        item.api_noticia.texto_noticia
        || !item.link_noticia
        || /^api:\/\//i.test(item.link_noticia)
        || !isLikelyNewsDetailUrl(item.link_noticia)
      )) {
        noticia = item.api_noticia;
      } else if (opts.detalharNoticias && item.link_noticia) {
        const detail = await fetchDocument(item.link_noticia, opts.corsProxy);
        noticia = extractNewsFromDetail(detail.doc, item);
      } else {
        noticia = buildFastNews(item);
      }

      item.duration = Date.now() - started;
      state.noticias.push(noticia);
      state.doneKeys.add(item.key);
      state.processed.push({ ...item, result: noticia });
      setStatus('Extraido: ' + sanitizeSpaces(noticia.titulo_noticia || item.text || 'noticia'));
    } catch (error) {
      item.retries = (item.retries || 0) + 1;

      if (!state.cancelRequested && state.running && item.retries <= opts.maxRetries) {
        state.queue.push(item);
        state.queuedKeys.add(item.key);
        state.selectedKeys.add(item.key);
      } else {
        const fail = {
          link_noticia: item.link_noticia,
          erro: error.message
        };
        state.falhas.push(fail);
        state.errors.push(fail);
      }
    } finally {
      runningSet.delete(item.key);
      if (opts.delayMs > 0) await sleep(opts.delayMs);
      updateUI();
    }
  }

  function processLoop() {
    if (!state.running) return;

    while (runningSet.size < opts.concurrency && state.queue.length > 0) {
      const next = pullNext();
      if (!next) break;
      runItem(next);
    }

    if (!state.running) return;

    const selectedQueueCount = getSelectedQueueCount();
    if (selectedQueueCount === 0 && runningSet.size === 0) {
      state.running = false;
      setStatus('Nenhum item selecionado na fila.');
      setProgress(100);
      updateUI();
      return;
    }

    if (state.queue.length === 0 && runningSet.size === 0) {
      state.running = false;
      setStatus('Processamento concluido.');
      setProgress(100);
      updateUI();
      return;
    }

    clearTimeout(state.timer);
    state.timer = setTimeout(processLoop, 120);
    updateUI();
  }

  async function start() {
    if (state.running) return;
    syncOptsFromUI();

    if (!state.queue.length) {
      await scan();
    }

    if (!state.queue.length) {
      alert('[EXTRACTRON] Nenhuma noticia na fila. Use scan() primeiro.');
      return;
    }

    if (getSelectedQueueCount() === 0) {
      alert('[EXTRACTRON] Nenhum item selecionado. Use [+] Todos ou selecione no modal de itens.');
      return;
    }

    state.cancelRequested = false;
    state.running = true;
    state.startedAt = new Date();
    setStatus('Processando fila...');
    updateUI();
    processLoop();
  }

  function stop() {
    state.cancelRequested = true;
    state.running = false;
    clearTimeout(state.timer);
    setStatus('Interrompendo...');
    updateUI();
  }

  function clearHistory() {
    state.noticias = [];
    state.falhas = [];
    state.errors = [];
    state.processed = [];
    state.doneKeys.clear();
    setStatus('Historico limpo.');
    setProgress(0);
    updateUI();
  }

  function reset() {
    stop();
    state.queue = [];
    state.processed = [];
    state.noticias = [];
    state.falhas = [];
    state.errors = [];
    state.blockedFrames = [];
    state.paginasVisitadas = 0;
    state.linksEncontrados = 0;
    state.doneKeys.clear();
    state.queuedKeys.clear();
    state.selectedKeys.clear();
    state.itemIdByKey.clear();
    state.nextItemId = 1;
    state.progressPercent = 0;
    state.apiEndpoint = '';
    state.startedAt = null;
    setStatus('Estado resetado.');
    updateUI();
  }

  function selectAll() {
    state.queue.forEach((it) => state.selectedKeys.add(it.key));
    updateUI();
  }

  function deselectAll() {
    state.selectedKeys.clear();
    updateUI();
  }

  function toggleSelect(key) {
    if (!key) return;
    if (state.selectedKeys.has(key)) state.selectedKeys.delete(key);
    else state.selectedKeys.add(key);
    updateUI();
  }

  function itemMatchesNameFilter(item, rules) {
    const id = ensureItemId(item);
    if (rules.exactIds.has(id)) return true;
    if (rules.ranges.some(([a, b]) => id >= a && id <= b)) return true;

    if (!rules.textTerms.length) return false;
    const hay = normalizeLoose((item.text || '') + ' ' + (item.titleName || '') + ' ' + (item.link_noticia || ''));
    return rules.textTerms.some((term) => hay.includes(term));
  }

  function applyQueueNameFilter(mode, raw) {
    const rules = parseFilterRules(raw);
    const hasRules = rules.textTerms.length > 0 || rules.exactIds.size > 0 || rules.ranges.length > 0;
    if (!hasRules) {
      console.warn('[EXTRACTRON] Filtro de nomes/IDs vazio.');
      return;
    }

    const matchingKeys = new Set();
    state.queue.forEach((item) => {
      if (itemMatchesNameFilter(item, rules)) matchingKeys.add(item.key);
    });

    if (mode === 'keep') {
      const nextSelected = new Set();
      state.queue.forEach((item) => {
        if (matchingKeys.has(item.key)) nextSelected.add(item.key);
      });
      state.selectedKeys = nextSelected;
    } else {
      matchingKeys.forEach((key) => state.selectedKeys.delete(key));
    }

    updateUI();
  }

  function applyQueueTypeFilter(mode, raw) {
    const typeTokens = parseTypeFilterTerms(raw);
    if (!typeTokens.length) {
      console.warn('[EXTRACTRON] Nenhum tipo valido no filtro.');
      return;
    }

    const matchingKeys = new Set();
    state.queue.forEach((item) => {
      const itemType = normalizeFileTypeToken(item.fileType) || inferNewsTypeFromUrl(item.link_noticia);
      if (typeTokens.includes(itemType)) matchingKeys.add(item.key);
    });

    if (mode === 'keep') {
      const nextSelected = new Set();
      state.queue.forEach((item) => {
        if (matchingKeys.has(item.key)) nextSelected.add(item.key);
      });
      state.selectedKeys = nextSelected;
    } else {
      matchingKeys.forEach((key) => state.selectedKeys.delete(key));
    }

    updateUI();
  }

  async function expandTable() {
    setStatus('ExpandTable nao se aplica para noticias. Executando scan completo...');
    updateUI();
    return scan();
  }

  function openBlockedFrames() {
    const frames = Array.from(new Set(state.blockedFrames)).filter(Boolean);
    if (!frames.length) {
      console.warn('[EXTRACTRON] Nenhum iframe bloqueado para abrir.');
      return [];
    }

    const opened = [];
    for (const src of frames) {
      try {
        const win = window.open(src, '_blank', 'noopener,noreferrer');
        if (win) opened.push(src);
      } catch {
        // noop
      }
    }

    if (!opened.length) {
      console.warn('[EXTRACTRON] O navegador bloqueou popups. Permita popups e tente novamente.');
    } else {
      console.log('[EXTRACTRON] Iframe(s) aberto(s):', opened.length);
    }

    return opened;
  }

  function syncOptsFromUI() {
    if (!panelEl) return;
    opts.corsProxy = sanitizeSpaces(ui.proxy ? ui.proxy.value : opts.corsProxy);
    opts.paginaInicial = asPositiveInt(ui.pageStart ? ui.pageStart.value : opts.paginaInicial, 1);
    opts.maxPaginas = asPositiveInt(ui.pageMax ? ui.pageMax.value : opts.maxPaginas, 5);
    opts.selectorCustom = sanitizeSpaces(ui.selector ? ui.selector.value : opts.selectorCustom);
    opts.detalharNoticias = Boolean(ui.detail && ui.detail.checked);
    opts.delayMs = asNonNegativeInt(ui.speed ? ui.speed.value : opts.delayMs, 800);
  }

  function fillUI(config = {}) {
    Object.assign(opts, config || {});
    if (!panelEl) return;
    ui.proxy.value = opts.corsProxy || '';
    ui.pageStart.value = String(opts.paginaInicial || 1);
    ui.pageMax.value = String(opts.maxPaginas || 5);
    ui.selector.value = opts.selectorCustom || '';
    ui.detail.checked = Boolean(opts.detalharNoticias);
    ui.speed.value = String(opts.delayMs || 0);
    ui.speedValue.textContent = String(opts.delayMs || 0) + 'ms';
  }

  function toggleTheme() {
    if (!panelEl) return;
    const isLight = panelEl.classList.toggle('light-mode');
    if (ui.theme) ui.theme.textContent = isLight ? 'L' : 'D';
    localStorage.setItem('__xn-theme', isLight ? 'light' : 'dark');
    syncItemsModalTheme();
  }

  function syncItemsModalTheme() {
    if (!panelEl || !modalEl) return;
    modalEl.classList.toggle('light-mode', panelEl.classList.contains('light-mode'));
  }

  function closeItemsModal() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
  }

  function openItemsModal() {
    if (!modalEl) return;
    syncItemsModalTheme();
    renderItemsModalList();
    modalEl.classList.remove('hidden');
  }

  function renderItemsModalList() {
    if (!modalEl) return;

    const listEl = modalEl.querySelector('#__dl-modal-list');
    const summaryEl = modalEl.querySelector('#__dl-modal-summary');
    if (!listEl || !summaryEl) return;

    summaryEl.textContent = 'Itens na fila: ' + state.queue.length + ' | Selecionados: ' + getSelectedQueueCount();
    listEl.innerHTML = '';

    if (state.queue.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '12px';
      empty.style.fontSize = '12px';
      empty.style.opacity = '0.8';
      empty.textContent = 'Nenhum item na fila. Execute [⊙] Escanear para carregar noticias.';
      listEl.appendChild(empty);
      return;
    }

    state.queue.forEach((item) => {
      const isSelected = state.selectedKeys.has(item.key);
      const isProcessing = runningSet.has(item.key);
      const type = normalizeFileTypeToken(item.fileType) || inferNewsTypeFromUrl(item.link_noticia);
      item.fileType = type;
      const displayId = String(ensureItemId(item)).padStart(4, '0');

      const row = document.createElement('div');
      row.className = 'download-item' + (isProcessing ? ' processing' : '');
      row.innerHTML =
        '<input type="checkbox" class="download-checkbox" ' + (isSelected ? 'checked' : '') + '>' +
        '<span class="download-id">ID ' + displayId + '</span>' +
        '<span class="download-type">' + type + '</span>' +
        '<span class="download-name" title="' + (item.text || '') + '">' + (item.text || '(sem nome)') + '</span>' +
        '<span class="download-icon">' + (isSelected ? '[x]' : '[ ]') + '</span>';

      const checkbox = row.querySelector('.download-checkbox');
      if (checkbox) checkbox.onchange = () => toggleSelect(item.key);

      listEl.appendChild(row);
    });
  }

  function updateUI() {
    if (!panelEl) return;

    const selectedQueueCount = getSelectedQueueCount();
    ui.statQueue.textContent = String(state.queue.length);
    ui.statActive.textContent = String(runningSet.size);
    ui.statProcessed.textContent = String(state.processed.length);
    ui.statSelected.textContent = String(selectedQueueCount);
    ui.statErrors.textContent = String(state.falhas.length);

    const progress = getProgressPercent();
    ui.progressFill.style.width = progress + '%';
    ui.progressPercent.textContent = progress + '%';

    const eta = getEstimatedTime();
    ui.progressTime.textContent = state.running ? 'ETA ' + formatTime(eta) : '--:--';
    ui.status.textContent = state.statusText;

    ui.scan.disabled = state.running || state.scanning;
    ui.start.disabled = state.running || state.scanning || selectedQueueCount === 0;
    ui.stop.disabled = !state.running && !state.scanning;

    ui.openIframes.disabled = state.blockedFrames.length === 0;
    ui.openIframes.textContent = state.blockedFrames.length > 0
      ? '[↗] Abrir Iframe(s) (' + state.blockedFrames.length + ')'
      : '[↗] Abrir Iframe(s)';

    ui.downloadOk.disabled = state.noticias.length === 0;
    ui.downloadImages.disabled = state.noticias.length === 0;
    ui.downloadFail.disabled = state.falhas.length === 0;

    ui.summary.textContent =
      'Fila: ' + state.queue.length +
      ' | Selecionados: ' + selectedQueueCount +
      ' | Processados: ' + state.processed.length +
      ' | Paginas lidas: ' + state.paginasVisitadas +
      ' | Links encontrados: ' + state.linksEncontrados +
      (state.apiEndpoint ? ' | API: ' + state.apiEndpoint : '');

    const uniqueFrames = Array.from(new Set(state.blockedFrames)).filter(Boolean);
    if (uniqueFrames.length) {
      const sample = uniqueFrames.slice(0, 2).join(' | ');
      ui.iframeHint.textContent = 'Iframe bloqueado detectado. Use [↗] para abrir. Exemplo: ' + sample;
    } else {
      ui.iframeHint.textContent = 'Sem iframes bloqueados detectados no ultimo scan.';
    }

    if (modalEl && !modalEl.classList.contains('hidden')) {
      renderItemsModalList();
    }
  }

  function createItemsModal() {
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);

    modalEl = document.createElement('div');
    modalEl.id = '__dl-items-modal';
    modalEl.className = 'hidden';
    modalEl.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Itens e filtros">
        <div class="modal-header">
          <span>[LISTA] Itens da Fila e Filtros</span>
          <button class="btn" id="btn-modal-close" style="flex:0 0 auto; min-width:40px; padding:6px 10px;">X</button>
        </div>
        <div class="modal-body">
          <textarea id="__dl-filter-input" placeholder="Digite nomes, IDs, faixas de ID ou tipos (pdf, html, news)..."></textarea>
          <div id="__dl-filter-help">Separadores aceitos: quebra de linha, virgula, ponto e virgula e barra vertical.</div>
          <div id="__dl-modal-actions">
            <button class="btn btn-secondary" id="btn-modal-keep">[+] Manter Nomes</button>
            <button class="btn btn-secondary" id="btn-modal-remove">[-] Remover Nomes</button>
            <button class="btn btn-secondary" id="btn-modal-keep-type">[+] Manter Tipos</button>
            <button class="btn btn-secondary" id="btn-modal-remove-type">[-] Remover Tipos</button>
            <button class="btn btn-secondary" id="btn-modal-select-all">[+] Selecionar Todos</button>
            <button class="btn btn-secondary" id="btn-modal-deselect-all">[-] Desmarcar Todos</button>
            <button class="btn btn-secondary" id="btn-modal-clear-filter">[C] Limpar Campo</button>
          </div>
          <div id="__dl-modal-summary"></div>
          <div id="__dl-modal-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
    syncItemsModalTheme();

    const filterInput = modalEl.querySelector('#__dl-filter-input');

    modalEl.querySelector('#btn-modal-close').onclick = () => closeItemsModal();
    modalEl.querySelector('#btn-modal-clear-filter').onclick = () => {
      if (filterInput) filterInput.value = '';
    };
    modalEl.querySelector('#btn-modal-select-all').onclick = () => selectAll();
    modalEl.querySelector('#btn-modal-deselect-all').onclick = () => deselectAll();
    modalEl.querySelector('#btn-modal-keep').onclick = () => applyQueueNameFilter('keep', filterInput ? filterInput.value : '');
    modalEl.querySelector('#btn-modal-remove').onclick = () => applyQueueNameFilter('remove', filterInput ? filterInput.value : '');
    modalEl.querySelector('#btn-modal-keep-type').onclick = () => applyQueueTypeFilter('keep', filterInput ? filterInput.value : '');
    modalEl.querySelector('#btn-modal-remove-type').onclick = () => applyQueueTypeFilter('remove', filterInput ? filterInput.value : '');

    modalEl.addEventListener('click', (event) => {
      if (event.target === modalEl) closeItemsModal();
    });
  }

  function enableDrag(panel, handle) {
    if (!panel || !handle) return;

    const dragState = { active: false, offsetX: 0, offsetY: 0 };

    const onMove = (event) => {
      if (!dragState.active) return;
      const x = event.clientX - dragState.offsetX;
      const y = event.clientY - dragState.offsetY;

      panel.style.right = '';
      panel.style.left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, x)) + 'px';
      panel.style.top = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, y)) + 'px';
    };

    const onUp = () => {
      dragState.active = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    handle.addEventListener('mousedown', (event) => {
      dragState.active = true;
      dragState.offsetX = event.clientX - panel.getBoundingClientRect().left;
      dragState.offsetY = event.clientY - panel.getBoundingClientRect().top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  const CSS = `
    * { box-sizing: border-box; }

    #__dl-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      width: 470px;
      max-height: 88vh;
      background: #1a1a1a;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: dlSlideIn 0.3s ease;
      color: #ffffff;
      border: 1px solid #333333;
    }

    @keyframes dlSlideIn {
      from { transform: translateX(500px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    #__dl-panel.minimized #__dl-content {
      display: none;
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

    #__dl-header .actions {
      display: flex;
      gap: 4px;
    }

    #__dl-close,
    #__dl-theme-toggle,
    #__dl-min {
      background: transparent;
      border: none;
      color: #888888;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 15px;
      transition: all 0.2s;
    }

    #__dl-close:hover,
    #__dl-theme-toggle:hover,
    #__dl-min:hover {
      color: #ffffff;
      background: #333333;
    }

    #__dl-warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px 12px;
      margin: 0;
      font-size: 11px;
      color: #856404;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    #__dl-warning:hover { opacity: 0.85; }
    #__dl-warning.hidden { display: none !important; }

    #__dl-config {
      display: grid;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid #333333;
      background: #202020;
    }

    #__dl-config .config-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    #__dl-config .config-row-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }

    #__dl-config label {
      display: grid;
      gap: 4px;
      font-size: 10px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #9ca3af;
      font-weight: 600;
    }

    #__dl-config input[type="text"],
    #__dl-config input[type="url"],
    #__dl-config input[type="number"] {
      width: 100%;
      background: #101010;
      border: 1px solid #333333;
      border-radius: 4px;
      color: #f3f4f6;
      padding: 7px 8px;
      font-size: 12px;
      outline: none;
    }

    #__dl-config input:focus {
      border-color: #6b7280;
    }

    #__dl-config .check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      text-transform: none;
      letter-spacing: 0;
      color: #d1d5db;
    }

    #__dl-stats {
      background: #242424;
      padding: 12px;
      font-size: 11px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(86px, 1fr));
      gap: 8px;
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
      letter-spacing: 0.4px;
    }

    .stat-value {
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
    }

    #__dl-progress {
      padding: 12px;
      border-bottom: 1px solid #333333;
    }

    #__dl-status {
      margin-bottom: 8px;
      font-size: 11px;
      color: #d1d5db;
    }

    #__dl-progress-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 11px;
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
      width: 0%;
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
      padding: 9px 10px;
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

    .btn-success {
      background: #198754;
      color: #ffffff;
      border-color: #198754;
    }

    .btn-success:hover:not(:disabled) {
      background: #157347;
      border-color: #157347;
    }

    .btn-warning {
      background: #b45309;
      color: #ffffff;
      border-color: #b45309;
    }

    .btn-warning:hover:not(:disabled) {
      background: #92400e;
      border-color: #92400e;
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    #__dl-list-summary,
    #__dl-iframe-hint {
      padding: 10px 12px;
      border-bottom: 1px solid #333333;
      color: #aaaaaa;
      font-size: 11px;
    }

    #__dl-iframe-hint {
      border-bottom: none;
      color: #f59e0b;
      padding-top: 0;
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
    }

    input[type="range"]::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      border: none;
    }

    #__dl-items-modal {
      position: fixed;
      inset: 0;
      z-index: 1000000;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    #__dl-items-modal.hidden { display: none; }

    #__dl-items-modal .modal-card {
      width: min(920px, 100%);
      max-height: 88vh;
      background: #1a1a1a;
      color: #ffffff;
      border: 1px solid #333333;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    #__dl-items-modal .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid #333333;
      font-size: 13px;
      font-weight: 600;
    }

    #__dl-items-modal .modal-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
    }

    #__dl-filter-input {
      width: 100%;
      min-height: 70px;
      resize: vertical;
      border-radius: 6px;
      border: 1px solid #3a3a3a;
      background: #101010;
      color: #f0f0f0;
      padding: 8px;
      font-size: 12px;
    }

    #__dl-filter-help {
      color: #999999;
      font-size: 10px;
    }

    #__dl-modal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    #__dl-modal-summary {
      font-size: 11px;
      color: #bbbbbb;
    }

    #__dl-modal-list {
      min-height: 160px;
      max-height: 46vh;
      overflow-y: auto;
      padding-right: 4px;
    }

    .download-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 6px;
      background: #242424;
      border: 1px solid #333333;
      transition: all 0.2s;
      gap: 8px;
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

    .download-id {
      min-width: 62px;
      font-size: 10px;
      color: #9ec5fe;
      font-weight: 600;
    }

    .download-type {
      min-width: 46px;
      text-align: center;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 10px;
      background: #1f2937;
      border: 1px solid #374151;
      color: #d1d5db;
    }

    .download-name {
      flex: 1;
      font-size: 11px;
      color: #cccccc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .download-icon {
      font-size: 11px;
      color: #888888;
      min-width: 20px;
      text-align: center;
    }

    #__dl-panel.light-mode {
      background: #f5f5f5;
      color: #1a1a1a;
    }

    #__dl-panel.light-mode #__dl-header {
      background: #ffffff;
      color: #1a1a1a;
      border-bottom-color: #dddddd;
    }

    #__dl-panel.light-mode #__dl-close,
    #__dl-panel.light-mode #__dl-theme-toggle,
    #__dl-panel.light-mode #__dl-min {
      color: #666666;
    }

    #__dl-panel.light-mode #__dl-close:hover,
    #__dl-panel.light-mode #__dl-theme-toggle:hover,
    #__dl-panel.light-mode #__dl-min:hover {
      color: #1a1a1a;
      background: #e8e8e8;
    }

    #__dl-panel.light-mode #__dl-config,
    #__dl-panel.light-mode #__dl-stats {
      background: #ffffff;
      border-bottom-color: #dddddd;
    }

    #__dl-panel.light-mode #__dl-config label {
      color: #6b7280;
    }

    #__dl-panel.light-mode #__dl-config input[type="text"],
    #__dl-panel.light-mode #__dl-config input[type="url"],
    #__dl-panel.light-mode #__dl-config input[type="number"] {
      background: #ffffff;
      color: #111827;
      border-color: #d1d5db;
    }

    #__dl-panel.light-mode .stat-label { color: #666666; }
    #__dl-panel.light-mode .stat-value { color: #1a1a1a; }
    #__dl-panel.light-mode #__dl-progress,
    #__dl-panel.light-mode #__dl-controls,
    #__dl-panel.light-mode #__dl-list-summary {
      border-bottom-color: #dddddd;
    }

    #__dl-panel.light-mode .progress-bar { background: #dddddd; }
    #__dl-panel.light-mode .progress-fill { background: #1a1a1a; }
    #__dl-panel.light-mode .btn {
      border-color: #dddddd;
      background: #ffffff;
      color: #1a1a1a;
    }

    #__dl-panel.light-mode .btn:hover:not(:disabled) {
      border-color: #999999;
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

    #__dl-panel.light-mode #__dl-list-summary {
      color: #6b7280;
      background: #fafafa;
    }

    #__dl-items-modal.light-mode .modal-card {
      background: #ffffff;
      color: #1a1a1a;
      border-color: #dddddd;
    }

    #__dl-items-modal.light-mode .modal-header { border-bottom-color: #dddddd; }

    #__dl-items-modal.light-mode #__dl-filter-input {
      background: #ffffff;
      color: #1a1a1a;
      border-color: #cccccc;
    }

    #__dl-items-modal.light-mode #__dl-filter-help,
    #__dl-items-modal.light-mode #__dl-modal-summary {
      color: #666666;
    }

    #__dl-items-modal.light-mode .download-item {
      background: #f8fafc;
      border-color: #e5e7eb;
    }

    #__dl-items-modal.light-mode .download-name { color: #111827; }
    #__dl-items-modal.light-mode .download-type {
      background: #e5e7eb;
      border-color: #cbd5e1;
      color: #334155;
    }

    @media (max-width: 640px) {
      #__dl-panel {
        width: calc(100% - 16px);
        right: 8px;
        left: 8px;
        max-height: 92vh;
      }

      #__dl-config .config-row,
      #__dl-config .config-row-3 {
        grid-template-columns: 1fr;
      }

      .btn {
        flex: 1 1 48%;
        min-width: 0;
      }

      #__dl-items-modal { padding: 8px; }
      #__dl-items-modal .modal-card { max-height: 92vh; }
      #__dl-modal-list { max-height: 52vh; }
    }
  `;

  function createPanel() {
    const existingPanel = document.getElementById('__dl-panel');
    if (existingPanel) existingPanel.remove();
    const existingStyle = document.getElementById('__extractron-noticias-style');
    if (existingStyle) existingStyle.remove();
    const existingModal = document.getElementById('__dl-items-modal');
    if (existingModal) existingModal.remove();

    styleEl = document.createElement('style');
    styleEl.id = '__extractron-noticias-style';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    panelEl = document.createElement('div');
    panelEl.id = '__dl-panel';
    panelEl.innerHTML = `
      <div id="__dl-header">
        <span>BAIXATRON NOTICIAS</span>
        <div class="actions">
          <button id="__dl-min" title="Minimizar">_</button>
          <button id="__dl-theme-toggle" title="Tema">D</button>
          <button id="__dl-close" title="Fechar">X</button>
        </div>
      </div>

      <div id="__dl-content">
        <div id="__dl-warning">
          CORS e iframes podem bloquear leitura. Se necessario use proxy e o botao [↗] Abrir Iframe(s).
        </div>

        <div id="__dl-config">
          <div class="config-row">
            <label>Proxy CORS (Opcional)
              <input id="xn-proxy" type="text" placeholder="https://proxy/?url={url}">
            </label>
          </div>

          <div class="config-row-3">
            <label>Pagina Inicial
              <input id="xn-page-start" type="number" min="1" value="1">
            </label>
            <label>Max Paginas
              <input id="xn-page-max" type="number" min="1" value="5">
            </label>
            <label>Selector CSS
              <input id="xn-selector" type="text" placeholder="main a[href*='/noticias/']">
            </label>
          </div>

          <label class="check">
            <input id="xn-detail" type="checkbox" checked>
            <span>Abrir detalhe de cada noticia (titulo, data, texto e imagens)</span>
          </label>
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
          <div id="__dl-status">Aguardando acao...</div>
          <div id="__dl-progress-top">
            <span id="progress-percent">0%</span>
            <span id="progress-time">--:--</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="__dl-progress-fill"></div>
          </div>
        </div>

        <div id="__dl-controls">
          <button class="btn btn-primary" id="btn-scan">[⊙] Escanear</button>
          <button class="btn" id="btn-open-iframes">[↗] Abrir Iframe(s)</button>
          <button class="btn" id="btn-open-items-modal">[📋] Itens e Filtros</button>
          <button class="btn btn-primary" id="btn-start">[▶] Iniciar</button>
          <button class="btn" id="btn-stop" disabled>[⏸] Pausar</button>
          <button class="btn" id="btn-select-all">[+] Todos</button>
          <button class="btn" id="btn-deselect-all">[-] Nenhum</button>
          <button class="btn" id="btn-clear-history">[🗑] Limpar Historico</button>
          <button class="btn btn-danger" id="btn-reset">[↻] Reset Total</button>
          <button class="btn btn-success" id="btn-dl-ok" disabled>[⬇] JSON Obrigatorio</button>
          <button class="btn" id="btn-dl-images" disabled>[🖼] Baixar Imagens</button>
          <button class="btn btn-warning" id="btn-dl-fail" disabled>[⬇] JSON Falhas</button>
        </div>

        <div id="__dl-list-summary">Fila atual: 0 item(ns).</div>
        <div id="__dl-iframe-hint">Sem iframes bloqueados detectados no ultimo scan.</div>

        <div class="speed-control">
          <div class="speed-label">
            <span>Velocidade</span>
            <span id="speed-value">800ms</span>
          </div>
          <input type="range" id="speed-slider" min="150" max="3000" step="50" value="800">
        </div>
      </div>
    `;

    document.body.appendChild(panelEl);

    ui.header = panelEl.querySelector('#__dl-header');
    ui.content = panelEl.querySelector('#__dl-content');
    ui.close = panelEl.querySelector('#__dl-close');
    ui.min = panelEl.querySelector('#__dl-min');
    ui.theme = panelEl.querySelector('#__dl-theme-toggle');
    ui.warning = panelEl.querySelector('#__dl-warning');
    ui.proxy = panelEl.querySelector('#xn-proxy');
    ui.pageStart = panelEl.querySelector('#xn-page-start');
    ui.pageMax = panelEl.querySelector('#xn-page-max');
    ui.selector = panelEl.querySelector('#xn-selector');
    ui.detail = panelEl.querySelector('#xn-detail');
    ui.speed = panelEl.querySelector('#speed-slider');
    ui.speedValue = panelEl.querySelector('#speed-value');
    ui.status = panelEl.querySelector('#__dl-status');
    ui.progressFill = panelEl.querySelector('#__dl-progress-fill');
    ui.progressPercent = panelEl.querySelector('#progress-percent');
    ui.progressTime = panelEl.querySelector('#progress-time');
    ui.statQueue = panelEl.querySelector('#stat-queue');
    ui.statActive = panelEl.querySelector('#stat-active');
    ui.statProcessed = panelEl.querySelector('#stat-processed');
    ui.statSelected = panelEl.querySelector('#stat-selected');
    ui.statErrors = panelEl.querySelector('#stat-errors');
    ui.scan = panelEl.querySelector('#btn-scan');
    ui.openIframes = panelEl.querySelector('#btn-open-iframes');
    ui.openItems = panelEl.querySelector('#btn-open-items-modal');
    ui.start = panelEl.querySelector('#btn-start');
    ui.stop = panelEl.querySelector('#btn-stop');
    ui.selectAll = panelEl.querySelector('#btn-select-all');
    ui.deselectAll = panelEl.querySelector('#btn-deselect-all');
    ui.clearHistory = panelEl.querySelector('#btn-clear-history');
    ui.reset = panelEl.querySelector('#btn-reset');
    ui.downloadOk = panelEl.querySelector('#btn-dl-ok');
    ui.downloadImages = panelEl.querySelector('#btn-dl-images');
    ui.downloadFail = panelEl.querySelector('#btn-dl-fail');
    ui.summary = panelEl.querySelector('#__dl-list-summary');
    ui.iframeHint = panelEl.querySelector('#__dl-iframe-hint');

    ui.close.onclick = () => {
      if (state.running || state.scanning) {
        if (!confirm('Existe uma execucao em andamento. Fechar mesmo assim?')) return;
      }
      destroy();
    };

    ui.min.onclick = () => {
      isMinimized = !isMinimized;
      panelEl.classList.toggle('minimized', isMinimized);
      ui.min.textContent = isMinimized ? '[ ]' : '_';
    };

    ui.theme.onclick = () => toggleTheme();
    ui.warning.onclick = () => {
      ui.warning.classList.add('hidden');
      localStorage.setItem('__xn-warning-closed', 'true');
    };

    ui.scan.onclick = () => { scan(); };
    ui.openIframes.onclick = () => { openBlockedFrames(); };
    ui.openItems.onclick = () => { openItemsModal(); };
    ui.start.onclick = () => { start(); };
    ui.stop.onclick = () => { stop(); };
    ui.selectAll.onclick = () => { selectAll(); };
    ui.deselectAll.onclick = () => { deselectAll(); };
    ui.clearHistory.onclick = () => {
      if (confirm('Limpar historico de noticias extraidas e falhas?')) clearHistory();
    };
    ui.reset.onclick = () => {
      if (confirm('Resetar fila, historico e selecoes?')) reset();
    };
    ui.downloadOk.onclick = () => {
      if (!state.noticias.length) return;
      baixarJson('noticia_extraidas.json', toRequiredNoticiasPayload(state.noticias));
    };
    ui.downloadImages.onclick = () => {
      baixarImagensNoticias();
    };
    ui.downloadFail.onclick = () => {
      if (!state.falhas.length) return;
      baixarJson('noticia_extraidas_falhas.json', state.falhas);
    };

    ui.speed.onchange = (event) => {
      const value = asNonNegativeInt(event.target.value, opts.delayMs);
      opts.delayMs = value;
      ui.speedValue.textContent = value + 'ms';
    };

    enableDrag(panelEl, ui.header);
    createItemsModal();

    if (localStorage.getItem('__xn-warning-closed') === 'true') {
      ui.warning.classList.add('hidden');
    }

    const savedTheme = localStorage.getItem('__xn-theme') || 'dark';
    if (savedTheme === 'light') {
      panelEl.classList.add('light-mode');
      ui.theme.textContent = 'L';
    } else {
      ui.theme.textContent = 'D';
    }

    fillUI(opts);
    setStatus('Painel pronto para scan.');
    setProgress(0);
    updateUI();
  }

  function setOptions(newOpts) {
    Object.assign(opts, newOpts || {});
    fillUI(opts);
    updateUI();
  }

  function destroy() {
    stop();

    try {
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    } catch {
      // noop
    }

    if (window.__extractronNoticias && window.__extractronNoticias.__source === SOURCE_TAG) {
      delete window.__extractronNoticias;
    }
    if (window.__dlNoticias && window.__dlNoticias.__source === SOURCE_TAG) {
      delete window.__dlNoticias;
    }
    if (window.__dl && window.__dl.__source === SOURCE_TAG) {
      delete window.__dl;
    }
  }

  createPanel();

  const api = {
    __source: SOURCE_TAG,
    opts,
    state,
    fillUI,
    setOptions,
    scan,
    start,
    stop,
    reset,
    clear: reset,
    clearHistory,
    selectAll,
    deselectAll,
    toggleSelect,
    applyQueueNameFilter,
    applyQueueTypeFilter,
    expandTable,
    openBlockedFrames,
    openItemsModal,
    toggleTheme,
    downloadImages: () => baixarImagensNoticias(),
    downloadOk: () => baixarJson('noticia_extraidas.json', toRequiredNoticiasPayload(state.noticias)),
    downloadFail: () => baixarJson('noticia_extraidas_falhas.json', state.falhas),
    destroy
  };

  window.__extractronNoticias = api;
  window.__dlNoticias = api;
  if (!window.__dl || window.__dl.__source === SOURCE_TAG) {
    window.__dl = api;
  }

  console.log('[EXTRACTRON] BAIXATRON Noticias carregado.');
  console.log('[EXTRACTRON] Comandos: __extractronNoticias.scan(), __extractronNoticias.start(), __extractronNoticias.stop(), __extractronNoticias.reset(), __extractronNoticias.openBlockedFrames()');
  console.log('[EXTRACTRON] Alias: __dlNoticias.* e (se livre) __dl.*');
})();
