const express = require('express');
const config = require('../../config/default.json');
const { enrichChatPayload } = require('../services/urlContext');
const { enrichWithSearch } = require('../services/searchContext');

const router = express.Router();
const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;

router.use(async (req, res) => {
  const url = `${BASE_URL}${req.originalUrl}`;

  const headers = {};
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (req.headers.accept) {
    headers.Accept = req.headers.accept;
  }

  const fetchOptions = {
    method: req.method,
    headers,
  };

  // Web search sources surfaced to the client via a custom SSE event.
  let searchSources = [];

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    let payload = req.body;
    if (
      req.method === 'POST' &&
      req.originalUrl.endsWith('/chat/completions') &&
      typeof req.body === 'object'
    ) {
      try {
        payload = await enrichChatPayload(req.body); // URL scraping (auto)
        const searched = await enrichWithSearch(payload); // web search (gated)
        payload = searched.payload;
        searchSources = searched.sources;
      } catch {
        payload = req.body; // graceful degradation: never break the chat
      }
      // Safety net: the flag must never reach llama-swap.
      if (payload && typeof payload === 'object' && 'web_search' in payload) {
        delete payload.web_search;
      }
    }
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    fetchOptions.body = body;
  }

  const upstream = await fetch(url, fetchOptions);

  if (upstream.headers.get('content-type')?.includes('text/event-stream')) {
    res.writeHead(upstream.status, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Emit web search sources first so the client can attach them to the turn.
    if (searchSources.length) {
      res.write(`data: ${JSON.stringify({ sources: searchSources })}\n\n`);
    }

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
    return;
  }

  const body = await upstream.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }

  res.status(upstream.status).json(parsed);
});

module.exports = router;
