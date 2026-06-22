const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  extractUrls,
  parseJinaMarkdown,
  buildContextBlock,
  scrapeUrl,
  enrichChatPayload,
} = require('./urlContext');

test('extractUrls returns empty array for text without urls', () => {
  assert.deepEqual(extractUrls('hola, esto no tiene links'), []);
  assert.deepEqual(extractUrls(''), []);
  assert.deepEqual(extractUrls(undefined), []);
});

test('extractUrls detects a single url and trims trailing punctuation', () => {
  assert.deepEqual(extractUrls('mirá esto https://example.com/post.'), [
    'https://example.com/post',
  ]);
});

test('extractUrls detects multiple urls and dedupes', () => {
  const text =
    'uno https://a.com dos http://b.com/x y de nuevo https://a.com';
  assert.deepEqual(extractUrls(text), ['https://a.com', 'http://b.com/x']);
});

test('extractUrls caps the number of urls at 3', () => {
  const text = 'https://a.com https://b.com https://c.com https://d.com';
  assert.equal(extractUrls(text).length, 3);
});

test('buildContextBlock returns empty string when no results', () => {
  assert.equal(buildContextBlock([]), '');
});

test('buildContextBlock formats ok and error results', () => {
  const block = buildContextBlock([
    { url: 'https://a.com', title: 'Title A', text: 'clean text' },
    { url: 'https://b.com', error: true },
  ]);
  assert.match(block, /\[Source: https:\/\/a\.com\] Title A/);
  assert.match(block, /clean text/);
  assert.match(block, /\[Could not retrieve content from https:\/\/b\.com\]/);
});

test('parseJinaMarkdown extracts title and text', () => {
  const raw = 'Title: My Page\n\nMarkdown Content:\nhello world';
  const parsed = parseJinaMarkdown(raw);
  assert.equal(parsed.title, 'My Page');
  assert.match(parsed.text, /hello world/);
});

test('parseJinaMarkdown returns null on empty input', () => {
  assert.equal(parseJinaMarkdown(''), null);
  assert.equal(parseJinaMarkdown(undefined), null);
});

test('scrapeUrl uses article-extractor when it returns content', async () => {
  const result = await scrapeUrl('https://a.com', {
    extractImpl: async () => ({ title: 'Article', content: '<p>local body</p>' }),
    fetchImpl: async () => {
      throw new Error('jina should not be called');
    },
  });
  assert.equal(result.title, 'Article');
  assert.match(result.text, /local body/);
});

test('scrapeUrl falls back to Jina when article-extractor is blank', async () => {
  const result = await scrapeUrl('https://spa.com', {
    extractImpl: async () => ({ content: '' }),
    fetchImpl: async () => ({
      ok: true,
      text: async () => 'Title: SPA Page\n\nrendered content',
    }),
  });
  assert.equal(result.title, 'SPA Page');
  assert.match(result.text, /rendered content/);
});

test('scrapeUrl returns error when both tiers fail', async () => {
  const result = await scrapeUrl('https://dead.com', {
    extractImpl: async () => null,
    fetchImpl: async () => ({ ok: false }),
  });
  assert.equal(result.error, true);
  assert.equal(result.url, 'https://dead.com');
});

test('enrichChatPayload leaves payload untouched when no urls', async () => {
  const payload = {
    messages: [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'sin links aca' },
    ],
  };
  const result = await enrichChatPayload(payload, {
    scrape: async () => {
      throw new Error('should not be called');
    },
  });
  assert.equal(result.messages[1].content, 'sin links aca');
});

test('enrichChatPayload injects scraped context into last user message', async () => {
  const payload = {
    messages: [
      { role: 'user', content: 'viejo' },
      { role: 'assistant', content: 'respuesta' },
      { role: 'user', content: 'resumime https://a.com' },
    ],
  };
  const result = await enrichChatPayload(payload, {
    scrape: async (url) => ({ url, title: 'T', text: 'body' }),
  });
  assert.match(result.messages[2].content, /resumime https:\/\/a\.com/);
  assert.match(result.messages[2].content, /\[Source: https:\/\/a\.com\] T/);
  assert.match(result.messages[2].content, /body/);
  // earlier messages stay intact
  assert.equal(result.messages[0].content, 'viejo');
});

test('enrichChatPayload handles multimodal array content', async () => {
  const payload = {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'mirá https://a.com' },
          { type: 'image_url', image_url: { url: 'data:...' } },
        ],
      },
    ],
  };
  const result = await enrichChatPayload(payload, {
    scrape: async (url) => ({ url, title: 'T', text: 'body' }),
  });
  const parts = result.messages[0].content;
  assert.ok(Array.isArray(parts));
  const injected = parts[parts.length - 1];
  assert.equal(injected.type, 'text');
  assert.match(injected.text, /\[Source: https:\/\/a\.com\]/);
  // image part preserved
  assert.ok(parts.some((p) => p.type === 'image_url'));
});

test('enrichChatPayload injects error note when scraping fails', async () => {
  const payload = {
    messages: [{ role: 'user', content: 'leé https://broken.tld' }],
  };
  const result = await enrichChatPayload(payload, {
    scrape: async (url) => ({ url, error: true }),
  });
  assert.match(
    result.messages[0].content,
    /\[Could not retrieve content from https:\/\/broken\.tld\]/,
  );
});
