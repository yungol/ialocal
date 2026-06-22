const express = require('express');
const config = require('../../config/default.json');
const { enrichChatPayload } = require('../services/urlContext');

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

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    let payload = req.body;
    if (
      req.method === 'POST' &&
      req.originalUrl.endsWith('/chat/completions') &&
      typeof req.body === 'object'
    ) {
      try {
        payload = await enrichChatPayload(req.body);
      } catch {
        payload = req.body; // graceful degradation: never break the chat
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
