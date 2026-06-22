const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildSearchBlock, enrichWithSearch } = require('./searchContext');

test('buildSearchBlock returns empty string when no results', () => {
  assert.equal(buildSearchBlock([]), '');
});

test('buildSearchBlock formats numbered results with title, url and content', () => {
  const block = buildSearchBlock([
    { title: 'First', url: 'https://a.com', content: 'alpha body' },
    { title: 'Second', url: 'https://b.com', content: 'beta body' },
  ]);
  assert.match(block, /\[1\] First \(https:\/\/a\.com\)/);
  assert.match(block, /alpha body/);
  assert.match(block, /\[2\] Second \(https:\/\/b\.com\)/);
  assert.match(block, /beta body/);
});

test('enrichWithSearch is a no-op and never fetches when web_search is absent', async () => {
  const payload = {
    messages: [{ role: 'user', content: 'hola sin busqueda' }],
  };
  const { payload: out, sources } = await enrichWithSearch(payload, {
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    },
  });
  assert.equal(out.messages[0].content, 'hola sin busqueda');
  assert.deepEqual(sources, []);
});

test('enrichWithSearch strips the web_search flag from the returned payload', async () => {
  const payload = {
    web_search: true,
    messages: [{ role: 'user', content: 'noticias de hoy' }],
  };
  const { payload: out } = await enrichWithSearch(payload, {
    fetchImpl: async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({ data: [{ title: 'T', url: 'https://x.com', content: 'body' }] }),
    }),
  });
  assert.ok(!('web_search' in out));
});

test('enrichWithSearch queries s.jina.ai and injects results into last user message', async () => {
  let calledUrl = '';
  const payload = {
    web_search: true,
    messages: [
      { role: 'user', content: 'viejo' },
      { role: 'assistant', content: 'respuesta' },
      { role: 'user', content: 'precio del dolar hoy' },
    ],
  };
  const { payload: out } = await enrichWithSearch(payload, {
    fetchImpl: async (url) => {
      calledUrl = url;
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [{ title: 'Dolar', url: 'https://news.com', content: 'cotizacion actual' }],
          }),
      };
    },
  });
  assert.match(calledUrl, /^https:\/\/s\.jina\.ai\//);
  assert.match(calledUrl, /precio%20del%20dolar%20hoy/);
  assert.match(out.messages[2].content, /precio del dolar hoy/);
  assert.match(out.messages[2].content, /\[1\] Dolar \(https:\/\/news\.com\)/);
  assert.match(out.messages[2].content, /cotizacion actual/);
  assert.equal(out.messages[0].content, 'viejo');
});

test('enrichWithSearch returns sources as [{title, url}] without content', async () => {
  const payload = {
    web_search: true,
    messages: [{ role: 'user', content: 'q' }],
  };
  const { sources } = await enrichWithSearch(payload, {
    fetchImpl: async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: [
            { title: 'One', url: 'https://one.com', content: 'body one' },
            { title: 'Two', url: 'https://two.com', content: 'body two' },
          ],
        }),
    }),
  });
  assert.deepEqual(sources, [
    { title: 'One', url: 'https://one.com' },
    { title: 'Two', url: 'https://two.com' },
  ]);
});

test('enrichWithSearch injects into multimodal array content', async () => {
  const payload = {
    web_search: true,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'que pasa en el mundo' },
          { type: 'image_url', image_url: { url: 'data:...' } },
        ],
      },
    ],
  };
  const { payload: out } = await enrichWithSearch(payload, {
    fetchImpl: async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({ data: [{ title: 'World', url: 'https://w.com', content: 'news' }] }),
    }),
  });
  const parts = out.messages[0].content;
  assert.ok(Array.isArray(parts));
  const injected = parts[parts.length - 1];
  assert.equal(injected.type, 'text');
  assert.match(injected.text, /\[1\] World \(https:\/\/w\.com\)/);
  assert.ok(parts.some((p) => p.type === 'image_url'));
});

test('enrichWithSearch sends Authorization when JINA_API_KEY is set', async () => {
  const prev = process.env.JINA_API_KEY;
  process.env.JINA_API_KEY = 'secret-key';
  let seenHeaders = null;
  try {
    await enrichWithSearch(
      { web_search: true, messages: [{ role: 'user', content: 'q' }] },
      {
        fetchImpl: async (_url, opts) => {
          seenHeaders = opts.headers;
          return { ok: true, text: async () => JSON.stringify({ data: [] }) };
        },
      },
    );
  } finally {
    if (prev === undefined) delete process.env.JINA_API_KEY;
    else process.env.JINA_API_KEY = prev;
  }
  assert.equal(seenHeaders.Authorization, 'Bearer secret-key');
});

test('enrichWithSearch does not send Authorization when JINA_API_KEY is unset', async () => {
  const prev = process.env.JINA_API_KEY;
  delete process.env.JINA_API_KEY;
  let seenHeaders = null;
  try {
    await enrichWithSearch(
      { web_search: true, messages: [{ role: 'user', content: 'q' }] },
      {
        fetchImpl: async (_url, opts) => {
          seenHeaders = opts.headers;
          return { ok: true, text: async () => JSON.stringify({ data: [] }) };
        },
      },
    );
  } finally {
    if (prev !== undefined) process.env.JINA_API_KEY = prev;
  }
  assert.equal(seenHeaders.Authorization, undefined);
});

test('enrichWithSearch returns payload (flag stripped) and empty sources when fetch fails', async () => {
  const payload = {
    web_search: true,
    messages: [{ role: 'user', content: 'algo actual' }],
  };
  const { payload: out, sources } = await enrichWithSearch(payload, {
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(out.messages[0].content, 'algo actual');
  assert.ok(!('web_search' in out));
  assert.deepEqual(sources, []);
});

test('enrichWithSearch returns payload when response is not ok', async () => {
  const payload = {
    web_search: true,
    messages: [{ role: 'user', content: 'algo' }],
  };
  const { payload: out, sources } = await enrichWithSearch(payload, {
    fetchImpl: async () => ({ ok: false, text: async () => '' }),
  });
  assert.equal(out.messages[0].content, 'algo');
  assert.ok(!('web_search' in out));
  assert.deepEqual(sources, []);
});

test('enrichWithSearch returns payload when JSON is invalid', async () => {
  const payload = {
    web_search: true,
    messages: [{ role: 'user', content: 'algo' }],
  };
  const { payload: out, sources } = await enrichWithSearch(payload, {
    fetchImpl: async () => ({ ok: true, text: async () => 'not json at all' }),
  });
  assert.equal(out.messages[0].content, 'algo');
  assert.ok(!('web_search' in out));
  assert.deepEqual(sources, []);
});
