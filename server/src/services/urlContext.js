// Intercepts chat messages, detects URLs, scrapes their clean content and
// injects it as context before the LLM call.
//
// Scraping cascade (per URL):
//   1. @extractus/article-extractor — local, fast, great for articles.
//   2. Jina AI Reader (https://r.jina.ai) — remote, renders JS, covers SPAs and
//      pages article-extractor cannot parse. Uses JINA_API_KEY when present.

const URL_REGEX = /\bhttps?:\/\/[^\s<>"')]+/gi;
const MAX_URLS = 3;
const PER_URL_CHARS = 6000;
const ARTICLE_TIMEOUT_MS = 8000;
const JINA_TIMEOUT_MS = 20000;

function extractUrls(text) {
  if (typeof text !== 'string' || !text) return [];
  const matches = text.match(URL_REGEX) || [];
  const cleaned = matches.map((u) => u.replace(/[.,;:!?]+$/, ''));
  return [...new Set(cleaned)].slice(0, MAX_URLS);
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = PER_URL_CHARS) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [truncated]`;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('scrape timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Tier 1: local extraction with article-extractor.
async function tryArticleExtractor(url, extractImpl) {
  try {
    let extract = extractImpl;
    if (!extract) {
      // article-extractor v8+ is ESM-only; dynamic import works from CommonJS.
      ({ extract } = await import('@extractus/article-extractor'));
    }
    const article = await withTimeout(extract(url), ARTICLE_TIMEOUT_MS);
    if (!article || !article.content) return null;
    const text = truncate(stripHtml(article.content));
    if (!text) return null;
    return { url, title: article.title || '', text };
  } catch {
    return null;
  }
}

// Jina returns a structured markdown doc with a leading "Title:" line.
function parseJinaMarkdown(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const titleMatch = trimmed.match(/^Title:\s*(.+)$/m);
  return { title: titleMatch ? titleMatch[1].trim() : '', text: truncate(trimmed) };
}

// Tier 2: Jina AI Reader (renders JS, covers SPAs).
async function tryJina(url, fetchImpl = fetch) {
  try {
    const headers = { 'X-Return-Format': 'markdown' };
    if (process.env.JINA_API_KEY) {
      headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    }
    const res = await withTimeout(
      fetchImpl(`https://r.jina.ai/${url}`, { headers }),
      JINA_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const parsed = parseJinaMarkdown(await res.text());
    if (!parsed) return null;
    return { url, title: parsed.title, text: parsed.text };
  } catch {
    return null;
  }
}

async function scrapeUrl(url, { extractImpl, fetchImpl } = {}) {
  const fromArticle = await tryArticleExtractor(url, extractImpl);
  if (fromArticle) return fromArticle;
  const fromJina = await tryJina(url, fetchImpl);
  if (fromJina) return fromJina;
  return { url, error: true };
}

function buildContextBlock(results) {
  if (!results.length) return '';
  const parts = results.map((r) =>
    r.error
      ? `[No se pudo recuperar el contenido de ${r.url}]`
      : `[Fuente: ${r.url}] ${r.title}\n${r.text}`,
  );
  return `\n\n---\nEl usuario incluyó enlaces. A continuación está el contenido recuperado de las páginas; úsalo como contexto para responder. Responde en el mismo idioma en que escribe el usuario.\n\n${parts.join(
    '\n\n',
  )}\n---`;
}

function getMessageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n');
  }
  return '';
}

function appendContext(content, block) {
  if (typeof content === 'string') return content + block;
  if (Array.isArray(content)) return [...content, { type: 'text', text: block }];
  return content;
}

async function enrichChatPayload(payload, { scrape = scrapeUrl } = {}) {
  if (!payload || !Array.isArray(payload.messages)) return payload;

  let idx = -1;
  for (let i = payload.messages.length - 1; i >= 0; i -= 1) {
    if (payload.messages[i] && payload.messages[i].role === 'user') {
      idx = i;
      break;
    }
  }
  if (idx === -1) return payload;

  const msg = payload.messages[idx];
  const urls = extractUrls(getMessageText(msg.content));
  if (!urls.length) return payload;

  const results = await Promise.all(urls.map((u) => scrape(u)));
  const block = buildContextBlock(results);
  if (!block) return payload;

  const messages = payload.messages.slice();
  messages[idx] = { ...msg, content: appendContext(msg.content, block) };
  return { ...payload, messages };
}

module.exports = {
  extractUrls,
  stripHtml,
  parseJinaMarkdown,
  buildContextBlock,
  scrapeUrl,
  enrichChatPayload,
  // Shared helpers reused by other context enrichers (e.g. searchContext).
  truncate,
  withTimeout,
  getMessageText,
  appendContext,
};
