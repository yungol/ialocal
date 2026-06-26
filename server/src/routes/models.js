const express = require('express');
const fs = require('fs');
const llamaSwap = require('../services/llama-swap');

const router = express.Router();

function detectType(modelId) {
  const id = modelId.toLowerCase();
  if (
    id.includes('sd') ||
    id.includes('flux') ||
    id.includes('sdxl') ||
    id.includes('juggernaut') ||
    id.includes('z-image') ||
    id.includes('zimage')
  ) {
    return 'image';
  }
  return 'llm';
}

// Vision-capable LLMs (loaded with an mmproj projector). The chat UI uses this
// flag to show the image-attach button only for these models.
function detectVision(modelId) {
  const id = modelId.toLowerCase();
  return id.includes('vision') || id.includes('-vl') || id.endsWith('vl');
}

function getDiskSize(modelPath) {
  try {
    return fs.statSync(modelPath).size;
  } catch {
    return null;
  }
}

const MODEL_PATHS = {
  'qwen3-8b': '/home/juan/models/Qwen3-8B-Q4_K_M.gguf',
  'qwen-claude-opus': '/home/juan/models/Qwen3.5-9B-Claude-Opus-Q4_K_M.gguf',
  'gemma-4-e4b': '/home/juan/models/gemma-4-E4B-it-Q4_K_M.gguf',
  'flux2-klein': '/home/juan/models/flux-2-klein-4b-Q4_0.gguf',
  'juggernaut-z': '/home/juan/models/juggernautZ-v10-Q6_K.gguf',
  'gemma4-vision': '/home/juan/models/gemma-4-E4B-it-Q4_K_M.gguf',
};

// ComfyUI-based models are not managed by llama-swap; they are injected here.
const COMFY_MODELS = [];

router.get('/models', async (_req, res) => {
  try {
    const data = await llamaSwap.getModels();
    const models = (data.data || []).map((m) => ({
      id: m.id,
      name: m.id,
      type: detectType(m.id),
      vision: detectVision(m.id),
      status: 'unloaded',
      size: getDiskSize(MODEL_PATHS[m.id]),
    }));
    res.json({ models: [...models, ...COMFY_MODELS] });
  } catch {
    const fallback = Object.entries(MODEL_PATHS).map(([id, modelPath]) => ({
      id,
      name: id,
      type: detectType(id),
      vision: detectVision(id),
      status: 'unloaded',
      size: getDiskSize(modelPath),
    }));
    res.json({ models: [...fallback, ...COMFY_MODELS] });
  }
});

router.get('/models/running', async (_req, res) => {
  try {
    const data = await llamaSwap.getRunning();
    res.json({ running: data.running || data });
  } catch {
    res.json({ running: [] });
  }
});

router.post('/models/unload/:id', async (req, res) => {
  const result = await llamaSwap.unloadModel(req.params.id);
  res.json(result);
});

router.post('/models/unload-all', async (_req, res) => {
  const result = await llamaSwap.unloadAll();
  res.json(result);
});

module.exports = router;
