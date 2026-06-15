const express = require('express');
const fs = require('fs');
const llamaSwap = require('../services/llama-swap');

const router = express.Router();

function detectType(modelId) {
  if (modelId.includes('sd') || modelId.includes('flux') || modelId.includes('sdxl')) return 'image';
  return 'llm';
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
};

router.get('/models', async (_req, res) => {
  try {
    const data = await llamaSwap.getModels();
    const models = (data.data || []).map((m) => ({
      id: m.id,
      name: m.id,
      type: detectType(m.id),
      status: 'unloaded',
      size: getDiskSize(MODEL_PATHS[m.id]),
    }));
    res.json({ models });
  } catch {
    const fallback = Object.entries(MODEL_PATHS).map(([id, modelPath]) => ({
      id,
      name: id,
      type: detectType(id),
      status: 'unloaded',
      size: getDiskSize(modelPath),
    }));
    res.json({ models: fallback });
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
