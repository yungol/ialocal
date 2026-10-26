const express = require('express');
const vram = require('../services/vram');
const llamaSwap = require('../services/llama-swap');

const router = express.Router();
const startTime = Date.now();

// Per-slot activity for the models that are currently loaded. Deliberately
// driven off the /running list rather than the configured model list: asking
// llama-swap for /upstream/<model>/slots loads that model if it is not already
// resident, so polling every configured model would thrash a single 8GB card.
//
// n_decoded is reported per task and restarts at zero on the next one, so the
// payload carries taskId and a server-side sampledAt. A client differencing
// decoded between two polls must discard the sample when taskId changes,
// otherwise it reads a token-rate spike or a negative rate at every boundary.
async function collectActivity(runningModels) {
  const ready = runningModels.filter((m) => m.state === 'ready' && m.model);

  const results = await Promise.all(
    ready.map(async (m) => {
      try {
        const slots = await llamaSwap.getSlots(m.model);
        return (Array.isArray(slots) ? slots : []).map((s) => ({
          model: m.model,
          slot: s.id,
          processing: Boolean(s.is_processing),
          taskId: s.id_task ?? null,
          ctxUsed: s.n_prompt_tokens ?? 0,
          ctxTotal: s.n_ctx ?? 0,
          promptProcessed: s.n_prompt_tokens_processed ?? 0,
          promptCached: s.n_prompt_tokens_cache ?? 0,
          decoded: s.next_token?.[0]?.n_decoded ?? s.next_token?.n_decoded ?? 0,
        }));
      } catch {
        // A model can finish unloading between /running and this call; treat a
        // failed probe as "no activity" rather than failing the whole response.
        return [];
      }
    }),
  );

  return results.flat();
}

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
    const data = await llamaSwap.getRunning();
    runningModels = data.running || data;
  } catch {
    // keep empty
  }

  let activity = [];
  try {
    activity = await collectActivity(runningModels);
  } catch {
    // keep empty
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    vram: vramData || { error: vramError },
    runningModels,
    activity,
    sampledAt: Date.now(),
    uptime,
  });
});

module.exports = router;
