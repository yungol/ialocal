const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const comfyui = require('../services/comfyui');
const gpu = require('../services/gpu');

const router = express.Router();
const IMAGES_DIR = path.join(__dirname, '..', '..', 'data', 'images');
const INDEX_PATH = path.join(IMAGES_DIR, 'index.json');
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');
const UPSCALE_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'upscale-seedvr2.json');

fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Output dimensions per aspect. All values are multiples of 64 (SDXL requirement).
const DIMENSIONS = {
  portrait:  { width: 768,  height: 1344 },
  square:    { width: 1024, height: 1024 },
  landscape: { width: 1344, height: 768  },
};

// Node ids shared by all comfy-image templates (API format).
const NODE = {
  positivePrompt: '3',
  negativePrompt: '4',
  latentImage:    '6',
  ksampler:       '5',
};

const MODEL_CONFIG = {};

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

function buildWorkflow({ model, prompt, negativePrompt, dims }) {
  const config = MODEL_CONFIG[model];
  const templatePath = path.join(TEMPLATES_DIR, config.template);
  const wf = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
  wf[NODE.positivePrompt].inputs.text = prompt;
  wf[NODE.negativePrompt].inputs.text = negativePrompt || config.defaultNegative;
  wf[NODE.latentImage].inputs.width = dims.width;
  wf[NODE.latentImage].inputs.height = dims.height;
  wf[NODE.ksampler].inputs.seed = Math.floor(Math.random() * 2147483647);
  return wf;
}

async function runJob(job, { prompt, negativePrompt, dims }) {
  try {
    job.status = 'preparing';
    await gpu.requireComfy();

    const workflow = buildWorkflow({ model: job.model, prompt, negativePrompt, dims });

    job.status = 'rendering';
    const promptId = await comfyui.queuePrompt(workflow);
    job.promptId = promptId;

    const outputs = await comfyui.waitForOutputs(promptId, { timeoutMs: 600000 });
    const file = comfyui.findOutputFile(outputs);
    if (!file) {
      throw new Error('El workflow no produjo ninguna imagen');
    }

    const buffer = await comfyui.fetchFile(file);
    const imageId = generateId();
    fs.writeFileSync(path.join(IMAGES_DIR, `${imageId}.png`), buffer);

    const entry = {
      id: imageId,
      prompt: job.prompt,
      model: job.model,
      createdAt: Date.now(),
    };
    const index = readIndex();
    index.unshift(entry);
    writeJSON(INDEX_PATH, index);

    job.status = 'done';
    job.image = entry;
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
  }
}

router.post('/comfy-image', (req, res) => {
  const { prompt, negativePrompt, aspect, model } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Falta el prompt' });
  }

  if (!MODEL_CONFIG[model]) {
    return res.status(400).json({ error: `Modelo no soportado: ${model}` });
  }

  const dims = DIMENSIONS[aspect] || DIMENSIONS.portrait;

  const job = {
    id: generateId(),
    status: 'queued',
    model,
    prompt: prompt.trim(),
    aspect: aspect && DIMENSIONS[aspect] ? aspect : 'portrait',
    createdAt: Date.now(),
    image: null,
    error: null,
  };
  jobs.set(job.id, job);

  runJob(job, { prompt: job.prompt, negativePrompt: negativePrompt || '', dims });

  res.json({ jobId: job.id, status: job.status });
});

router.get('/comfy-image/job/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job no encontrado' });

  res.json({
    jobId: job.id,
    status: job.status,
    error: job.error,
    image: job.image,
  });
});

// --- Upscale routes ---

async function runUpscaleJob(job) {
  try {
    job.status = 'preparing';
    await gpu.requireComfy();

    const srcPath = path.join(IMAGES_DIR, `${job.sourceId}.png`);
    const buffer = fs.readFileSync(srcPath);
    const imageRef = await comfyui.uploadImage(buffer, `upscale_${job.id}.png`);

    const wf = JSON.parse(fs.readFileSync(UPSCALE_TEMPLATE_PATH, 'utf-8'));
    wf['16'].inputs.image = imageRef;
    wf['10'].inputs.seed = Math.floor(Math.random() * 2147483647);

    job.status = 'rendering';
    const promptId = await comfyui.queuePrompt(wf);
    job.promptId = promptId;

    const outputs = await comfyui.waitForOutputs(promptId, { timeoutMs: 600000 });
    const file = comfyui.findOutputFile(outputs);
    if (!file) throw new Error('El workflow no produjo ninguna imagen');

    const outBuffer = await comfyui.fetchFile(file);
    const imageId = generateId();
    fs.writeFileSync(path.join(IMAGES_DIR, `${imageId}.png`), outBuffer);

    const index = readIndex();
    const src = index.find((e) => e.id === job.sourceId);
    const entry = {
      id: imageId,
      prompt: src ? `[Upscale] ${src.prompt}` : '[Upscale]',
      model: 'upscale-seedvr2',
      createdAt: Date.now(),
    };
    index.unshift(entry);
    writeJSON(INDEX_PATH, index);

    job.status = 'done';
    job.image = entry;
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
  }
}

router.post('/upscale', (req, res) => {
  const { imageId } = req.body;

  if (!imageId) return res.status(400).json({ error: 'Falta imageId' });

  const srcPath = path.join(IMAGES_DIR, `${imageId}.png`);
  if (!fs.existsSync(srcPath)) {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }

  const job = {
    id: generateId(),
    status: 'queued',
    sourceId: imageId,
    createdAt: Date.now(),
    image: null,
    error: null,
  };
  jobs.set(job.id, job);

  runUpscaleJob(job);

  res.json({ jobId: job.id, status: job.status });
});

router.get('/upscale/job/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job no encontrado' });

  res.json({
    jobId: job.id,
    status: job.status,
    error: job.error,
    image: job.image,
  });
});

module.exports = router;
