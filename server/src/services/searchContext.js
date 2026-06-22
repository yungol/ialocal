// Opt-in web search context. When a chat payload carries `web_search: true`,
// runs a web search for the last user message and injects the top results as
// context before the LLM call. Gated by the flag — does nothing without it.
//
// Engine: Jina Search (https://s.jina.ai) — a single call searches the web and
// returns the top results already read as content. Reuses JINA_API_KEY when
// present. Independent from urlContext.js (URL scraping), which still runs
// automatically whenever the user pastes a link.

const {
  truncate,
  withTimeout,
  getMessageText,
  appendContext,
} = require('./urlContext');

// s.jina.ai reads several full pages per query; latency is variable. The timeout
// is only a safety net against a hung connection — we'd rather wait than drop
// results, so it's generous. The frontend shows "searching the web" meanwhile.
const JINA_SEARCH_TIMEOUT_MS = 60000;
const MAX_RESULTS = 3;
// Per-result cap kept smaller than URL scraping (PER_URL_CHARS): several search
// results stack up, so we trade depth for a leaner context window.
const PER_RESULT_CHARS = 2500;

function buildSearchBlock(results) {
  if (!results.length) return '';
  const parts = results.map(
    (r, i) => `[${i + 1}] ${r.title || 'Sin título'} (${r.url})\n${r.content}`,
  );
  return `\n\n---\nResultados de búsqueda web para la consulta del usuario. Úsalos como contexto actualizado para responder y cita las fuentes cuando sea relevante. Responde en el mismo idioma en que escribe el usuario.\n\n${parts.join(
    '\n\n',
  )}\n---`;
}

async function searchWeb(query, fetchImpl) {
  // X-Engine: direct skips full browser rendering — noticeably faster while
  // still returning page content for the top results.
  const headers = { Accept: 'application/json', 'X-Engine': 'direct' };
  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  }
  const url = `https://s.jina.ai/?q=${encodeURIComponent(query)}`;
  const res = await withTimeout(fetchImpl(url, { headers }), JINA_SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  let parsed;
  try {
    parsed = JSON.parse(await res.text());
  } catch {
    return [];
  }

  const data = Array.isArray(parsed && parsed.data) ? parsed.data : [];
  return data
    .filter((r) => r && r.url)
    .slice(0, MAX_RESULTS)
    .map((r) => ({
      title: r.title || '',
      url: r.url,
      content: truncate(r.content || r.description || '', PER_RESULT_CHARS),
    }));
}

function stripFlag(payload) {
  if (!payload || typeof payload !== 'object' || !('web_search' in payload)) {
    return payload;
  }
  const { web_search, ...rest } = payload;
  return rest;
}

// Returns { payload, sources } where `sources` is [{ title, url }] for the UI.
// Sources are empty whenever no search ran or it yielded nothing.
async function enrichWithSearch(payload, { fetchImpl = fetch } = {}) {
  const noResult = (p) => ({ payload: stripFlag(p), sources: [] });
  if (!payload || !payload.web_search) return noResult(payload);

  try {
    if (!Array.isArray(payload.messages)) return noResult(payload);

    let idx = -1;
    for (let i = payload.messages.length - 1; i >= 0; i -= 1) {
      if (payload.messages[i] && payload.messages[i].role === 'user') {
        idx = i;
        break;
      }
    }
    if (idx === -1) return noResult(payload);

    const msg = payload.messages[idx];
    const query = getMessageText(msg.content).trim();
    if (!query) return noResult(payload);

    const results = await searchWeb(query, fetchImpl);
    const block = buildSearchBlock(results);
    if (!block) return noResult(payload);

    const messages = payload.messages.slice();
    messages[idx] = { ...msg, content: appendContext(msg.content, block) };
    const sources = results.map((r) => ({ title: r.title, url: r.url }));
    return { payload: stripFlag({ ...payload, messages }), sources };
  } catch {
    // graceful degradation: never break the chat
    return noResult(payload);
  }
}

module.exports = {
  buildSearchBlock,
  searchWeb,
  enrichWithSearch,
};
