const express = require('express');
const config = require('../../config/default.json');

const router = express.Router();
const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;
const UPSTREAM = `${BASE_URL}/upstream/kokoro`;

// OpenAI-compatible text-to-speech. External agents point their OpenAI SDK
// base_url at this server and call audio.speech.create({ model, voice, input }).
//
// Unlike the image and chat routes, this one deliberately does NOT call
// gpu.requireLlama(): Kokoro runs on CPU and llama-swap keeps it in a
// non-exclusive group, so generating narration must not stop ComfyUI or evict
// whichever GPU model is loaded.
async function forward(req, res, path) {
  try {
    const upstream = await fetch(`${UPSTREAM}${path}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const contentType =
      upstream.headers.get('content-type') || 'application/octet-stream';

    // Audio is binary: buffer it rather than decoding as text, which would
    // corrupt the payload.
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).type(contentType).send(buffer);
  } catch (err) {
    res
      .status(502)
      .json({ error: { message: `kokoro upstream failed: ${err.message}` } });
  }
}

router.post('/audio/speech', (req, res) =>
  forward(req, res, '/v1/audio/speech'),
);

router.get('/voices', (req, res) => forward(req, res, '/v1/voices'));

module.exports = router;
