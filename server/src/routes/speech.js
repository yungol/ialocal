const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../../config/default.json');
const gpu = require('../services/gpu');

const router = express.Router();
const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;

// OpenAI-compatible text-to-speech. External agents point their OpenAI SDK
// base_url at this server and call audio.speech.create({ model, voice, input }).
//
// Three engines, routed by the `model` field, with different GPU behavior:
//
// - "kokoro" (default when model is absent/unknown): CPU-only, 82M params.
//   Does NOT call gpu.requireLlama() -- llama-swap keeps it in a
//   non-exclusive group, so narration must not stop ComfyUI or evict
//   whichever GPU model is loaded.
// - "orpheus": a 3B GGUF on the GPU. Names its speaker in the prompt, which
//   means it re-invents the voice on every generation -- a script split into
//   chunks comes back in several voices. Kept for comparison; prefer
//   chatterbox for anything longer than a line.
// - "chatterbox": clones a speaker from a reference clip and conditions every
//   chunk on the same embedding, so the voice stays fixed across a whole
//   script. Its `voice` values are filenames in the server's voices
//   directory, not a fixed catalogue.
//
// Both GPU engines call gpu.requireLlama() before forwarding, same as the
// chat/image routes, because loading them fails if ComfyUI is holding VRAM.
// That is the key difference from Kokoro -- do not remove it.
const ENGINES = {
  kokoro: `${BASE_URL}/upstream/kokoro`,
  orpheus: `${BASE_URL}/upstream/orpheus`,
  chatterbox: `${BASE_URL}/upstream/chatterbox`,
};
const GPU_ENGINES = new Set(['orpheus', 'chatterbox']);
const DEFAULT_ENGINE = 'kokoro';

// Orpheus voices are listed from this table instead of from the engine.
// Reaching the engine would make llama-swap start it, and starting Orpheus
// means loading a 3.3GB GGUF onto the GPU and evicting whatever was there --
// far too expensive for a metadata call. The names are fixed by the
// checkpoint, so they are safe to state here; the engine still serves its own
// /v1/voices for anyone calling it directly.
const ORPHEUS_VOICES = [
  { id: 'javi', language: 'es', description: 'male, warm' },
  { id: 'sergio', language: 'es', description: 'male, professional' },
  { id: 'maria', language: 'es', description: 'female, friendly' },
];

// Chatterbox has no catalogue: each reference clip in this directory is a
// voice, named after the file. Kept in sync with CHATTERBOX_VOICES in
// /home/juan/bin/chatterbox-tts/server.py.
const CHATTERBOX_VOICES_DIR =
  process.env.CHATTERBOX_VOICES || '/home/juan/models/chatterbox-voices';
const CHATTERBOX_VOICE_SUFFIXES = new Set([
  '.wav',
  '.flac',
  '.mp3',
  '.ogg',
  '.m4a',
]);

function resolveEngine(model) {
  const key = (model || '').toLowerCase();
  return ENGINES[key] ? key : DEFAULT_ENGINE;
}

async function forward(req, res, path, upstreamBase) {
  try {
    const upstream = await fetch(`${upstreamBase}${path}`, {
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
      .json({ error: { message: `${upstreamBase} upstream failed: ${err.message}` } });
  }
}

router.post('/audio/speech', async (req, res) => {
  const engine = resolveEngine(req.body && req.body.model);
  if (GPU_ENGINES.has(engine)) {
    try {
      await gpu.requireLlama();
    } catch {
      // best effort; let the request proceed, mirroring the /v1 chat/image
      // gate in index.js
    }
  }
  return forward(req, res, '/v1/audio/speech', ENGINES[engine]);
});

// Voices from every engine, each tagged with `engine` so a caller can pick one
// and pass it straight back into /audio/speech's `model` and `voice` fields.
// Only Kokoro is queried over HTTP, and a failure there still returns the
// other engines' entries rather than failing the whole call.
router.get('/voices', async (req, res) => {
  const voices = ORPHEUS_VOICES.map((voice) => ({ engine: 'orpheus', ...voice }));

  // Chatterbox voices are reference clips on disk, so they are read from the
  // filesystem rather than from the engine. Asking the engine would make
  // llama-swap load it onto the GPU just to list filenames.
  try {
    for (const entry of fs.readdirSync(CHATTERBOX_VOICES_DIR)) {
      const ext = path.extname(entry).toLowerCase();
      if (CHATTERBOX_VOICE_SUFFIXES.has(ext)) {
        voices.push({
          engine: 'chatterbox',
          id: path.basename(entry, ext).toLowerCase(),
          language: 'es',
        });
      }
    }
  } catch {
    // Directory missing or unreadable; the other engines are still listable.
  }

  try {
    const upstream = await fetch(`${ENGINES.kokoro}/v1/voices`);
    if (upstream.ok) {
      const body = await upstream.json();
      for (const voice of body.voices || []) {
        voices.push({ engine: 'kokoro', ...voice });
      }
    }
  } catch {
    // Kokoro is down; the Orpheus list is still useful on its own.
  }

  res.json({ voices });
});

module.exports = router;
