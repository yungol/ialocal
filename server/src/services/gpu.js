const config = require('../../config/default.json');
const llamaSwap = require('./llama-swap');
const comfyui = require('./comfyui');
const { getVRAM } = require('./vram');

const SAFE_USED_MB = config.gpu?.safeUsedMb ?? 2500;
const FREE_WAIT_MS = config.gpu?.freeWaitMs ?? 30000;

// On 8GB GPUs llama.cpp and ComfyUI cannot coexist in VRAM. All mode
// switches are serialized through this single promise chain so two requests
// never start/stop the backends concurrently.
let chain = Promise.resolve();

function serialize(fn) {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Best-effort wait until VRAM usage drops below the safe threshold.
async function waitVramBelow(usedMb, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const { used } = await getVRAM();
      if (used <= usedMb) return;
    } catch {
      return; // no nvidia-smi: can't gate, proceed
    }
    await sleep(1000);
  }
}

// Switch the GPU to ComfyUI: unload all llama-swap models, wait for VRAM to
// free, then start ComfyUI and wait until it is ready.
function requireComfy() {
  return serialize(async () => {
    await llamaSwap.unloadAll().catch(() => {});
    await waitVramBelow(SAFE_USED_MB, FREE_WAIT_MS);
    await comfyui.start();
  });
}

// Switch the GPU to llama-swap: stop ComfyUI (frees its VRAM). No-op when
// ComfyUI is already down, so this is cheap on every chat/image request.
function requireLlama() {
  return serialize(async () => {
    await comfyui.stop();
  });
}

module.exports = { requireComfy, requireLlama };
