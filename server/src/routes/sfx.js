const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const comfyui = require('../services/comfyui');
const gpu = require('../services/gpu');

const router = express.Router();
const SFX_DIR = path.join(__dirname, '..', '..', 'data', 'sfx');
const INDEX_PATH = path.join(SFX_DIR, 'index.json');
const TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'templates',
  'sfx-stable-audio.json',
);

fs.mkdirSync(SFX_DIR, { recursive: true });

// Node ids in templates/sfx-stable-audio.json.
const NODE = {
  positivePrompt: '2',
  negativePrompt: '3',
  latent: '4',
  sampler: '5',
};

// Stable Audio Open generates up to ~47s per clip.
const MIN_SECONDS = 1;
const MAX_SECONDS = 47;
const DEFAULT_SECONDS = 10;

// In-memory job store, same approach as the video route: single-user local app,
// and finished clips are persisted to disk with an index that survives restarts.
const jobs = new Map();

function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function readIndex() {
  const idx = readJSON(INDEX_PATH);
  return idx && Array.isArray(idx) ? idx : [];
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function clampSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_SECONDS;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds));
}

function buildWorkflow({ prompt, negative, seconds, seed, steps, cfg }) {
  const wf = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf-8'));
  wf[NODE.positivePrompt].inputs.text = prompt;
  wf[NODE.negativePrompt].inputs.text = negative;
  wf[NODE.latent].inputs.seconds = seconds;
  wf[NODE.sampler].inputs.seed = seed;
  wf[NODE.sampler].inputs.steps = steps;
  wf[NODE.sampler].inputs.cfg = cfg;
  return wf;
}

// Runs the full pipeline for a job. Never throws; records errors on the job.
async function runJob(job, params) {
  try {
    job.status = 'preparing';
    // Stable Audio runs on the GPU through ComfyUI, so unlike the Kokoro TTS
    // route this one must take the GPU away from the llama.cpp backends.
    await gpu.requireComfy();

    const workflow = buildWorkflow(params);

    job.status = 'rendering';
    const promptId = await comfyui.queuePrompt(workflow);
    job.promptId = promptId;

    const outputs = await comfyui.waitForOutputs(promptId, { timeoutMs: 600000 });
    const file = comfyui.findOutputFile(outputs);
    if (!file) {
      throw new Error('El workflow no produjo ningún audio');
    }

    const buffer = await comfyui.fetchFile(file);
    const ext = path.extname(file.filename) || '.mp3';
    const sfxId = generateId();
    fs.writeFileSync(path.join(SFX_DIR, `${sfxId}${ext}`), buffer);

    const entry = {
      id: sfxId,
      file: `${sfxId}${ext}`,
      prompt: job.prompt,
      seconds: params.seconds,
      seed: params.seed,
      createdAt: Date.now(),
    };
    const index = readIndex();
    index.unshift(entry);
    writeJSON(INDEX_PATH, index);

    job.status = 'done';
    job.sfx = entry;
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
  }
}

// Start a sound-effect generation job. Returns immediately with a job id.
router.post('/sfx', (req, res) => {
  const { prompt, negative, seconds, seed, steps, cfg } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Falta el prompt' });
  }

  const params = {
    prompt: prompt.trim(),
    negative: (negative || '').trim(),
    seconds: clampSeconds(seconds),
    seed: Number.isFinite(Number(seed))
      ? Number(seed)
      : Math.floor(Math.random() * 1e15),
    steps: Math.min(200, Math.max(1, parseInt(steps, 10) || 50)),
    cfg: Number.isFinite(Number(cfg)) ? Number(cfg) : 5.0,
  };

  const job = {
    id: generateId(),
    status: 'queued',
    prompt: params.prompt,
    createdAt: Date.now(),
    sfx: null,
    error: null,
  };
  jobs.set(job.id, job);

  // Fire and forget; the client polls GET /sfx/job/:id.
  runJob(job, params);

  res.json({ jobId: job.id, status: job.status });
});

// Poll a job's status/result.
router.get('/sfx/job/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job no encontrado' });

  res.json({
    jobId: job.id,
    status: job.status,
    prompt: job.prompt,
    error: job.error,
    sfx: job.sfx,
  });
});

// List saved sound effects (paginated).
router.get('/sfx', (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const index = readIndex();
  res.json({ sfx: index.slice(offset, offset + limit), total: index.length });
});

// Delete a saved sound effect.
router.delete('/sfx/:id', (req, res) => {
  const index = readIndex();
  const entry = index.find((s) => s.id === req.params.id);
  if (entry) {
    try {
      fs.unlinkSync(path.join(SFX_DIR, entry.file));
    } catch {
      // already gone
    }
  }
  writeJSON(
    INDEX_PATH,
    index.filter((s) => s.id !== req.params.id),
  );
  res.json({ ok: true });
});

module.exports = router;
