const express = require('express');
const config = require('../../config/default.json');
const gpu = require('../services/gpu');

const router = express.Router();
const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;

// OpenAI-compatible speech-to-text. External agents point their OpenAI SDK
// base_url at this server and call audio.transcriptions.create({ model, file }).
// The multipart/form-data body is streamed straight through to whisper-server's
// /inference endpoint via llama-swap's upstream route, which loads/swaps the
// model on demand (and unloads it after its TTL, freeing VRAM).
router.post('/audio/transcriptions', async (req, res) => {
  // whisper-server runs under llama.cpp on the GPU; free ComfyUI's VRAM first.
  try {
    await gpu.requireLlama();
  } catch {
    // best effort; proceed even if the mode switch fails
  }

  const url = `${BASE_URL}/upstream/whisper/inference`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': req.headers['content-type'] || '' },
      body: req,
      duplex: 'half',
    });
    const contentType =
      upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();
    res.status(upstream.status).type(contentType).send(body);
  } catch (err) {
    res
      .status(502)
      .json({ error: { message: `whisper upstream failed: ${err.message}` } });
  }
});

module.exports = router;
