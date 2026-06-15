const express = require('express');
const vram = require('../services/vram');
const llamaSwap = require('../services/llama-swap');

const router = express.Router();
const startTime = Date.now();

router.get('/stats', async (_req, res) => {
  let vramData = null;
  let vramError = null;

  try {
    vramData = await vram.getVRAM();
  } catch (err) {
    vramError = err.message;
  }

  let runningModels = [];
  try {
    runningModels = await llamaSwap.getRunning();
  } catch {
    // keep empty
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    vram: vramData || { error: vramError },
    runningModels: runningModels.running || runningModels,
    uptime,
  });
});

module.exports = router;
