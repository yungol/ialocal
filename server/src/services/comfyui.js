const { spawn, execFile } = require('child_process');
const crypto = require('crypto');
const config = require('../../config/default.json');

const COMFY = config.comfyui;
const BASE_URL = `http://${COMFY.host}:${COMFY.port}`;
const CLIENT_ID = crypto.randomUUID();

// Tracks the process we spawn ourselves. ComfyUI may also be started
// externally by the user; stop() handles both cases.
let child = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Lightweight reachability check. Returns true when the HTTP API answers.
async function ping() {
  try {
    const res = await fetch(`${BASE_URL}/system_stats`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function isRunning() {
  return ping();
}

// Kill any process whose command line matches the configured ComfyUI entry
// point. Covers instances the user started by hand (untracked child).
function pkill(signal) {
  return new Promise((resolve) => {
    execFile('pkill', [signal, '-f', COMFY.processMatch], () => resolve());
  });
}

// Start ComfyUI if it is not already answering, then wait until ready.
async function start() {
  if (await ping()) return;

  child = spawn(COMFY.command, COMFY.args, {
    cwd: COMFY.cwd,
    stdio: 'ignore',
    env: { ...process.env, ...(COMFY.env || {}) },
  });
  child.on('exit', () => {
    child = null;
  });

  const deadline = Date.now() + (COMFY.startTimeoutMs || 180000);
  while (Date.now() < deadline) {
    if (await ping()) return;
    await sleep(1500);
  }
  throw new Error('ComfyUI no respondió dentro del timeout de arranque');
}

// Stop ComfyUI and wait until the port stops answering, freeing its VRAM.
async function stop() {
  if (!child && !(await ping())) return;

  if (child) {
    try {
      child.kill('SIGTERM');
    } catch {
      // already gone
    }
  }
  await pkill('-TERM');

  const deadline = Date.now() + (COMFY.stopTimeoutMs || 30000);
  while (Date.now() < deadline) {
    if (!(await ping())) {
      child = null;
      return;
    }
    await sleep(1000);
  }

  // Graceful stop timed out: force kill.
  await pkill('-KILL');
  child = null;
}

// --- Workflow execution API ---

// Upload an image buffer to ComfyUI's input directory.
// Returns the reference string to use in a LoadImage node.
async function uploadImage(buffer, filename) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/png' }), filename);
  form.append('overwrite', 'true');

  const res = await fetch(`${BASE_URL}/upload/image`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(`ComfyUI upload falló: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

// Queue a workflow (API format) for execution. Returns the prompt id.
async function queuePrompt(workflow) {
  const res = await fetch(`${BASE_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: CLIENT_ID }),
  });
  if (!res.ok) {
    throw new Error(`ComfyUI /prompt falló: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.prompt_id;
}

// Poll /history until the prompt finishes. Resolves with its outputs.
async function waitForOutputs(promptId, { timeoutMs = 1200000, onTick } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/history/${promptId}`);
    if (res.ok) {
      const history = await res.json();
      const entry = history[promptId];
      if (entry) {
        const status = entry.status || {};
        if (status.status_str === 'error') {
          throw new Error('ComfyUI reportó un error ejecutando el workflow');
        }
        if (status.completed || entry.outputs) {
          return entry.outputs || {};
        }
      }
    }
    if (onTick) onTick();
    await sleep(2000);
  }
  throw new Error('Timeout esperando el render del video en ComfyUI');
}

// Find the first produced file in a node-outputs map (videos/gifs/images).
function findOutputFile(outputs) {
  for (const nodeId of Object.keys(outputs)) {
    const out = outputs[nodeId];
    for (const key of ['videos', 'gifs', 'images']) {
      if (Array.isArray(out[key]) && out[key].length > 0) {
        return out[key][0];
      }
    }
  }
  return null;
}

// Download a produced file as a Buffer via /view.
async function fetchFile({ filename, subfolder = '', type = 'output' }) {
  const params = new URLSearchParams({ filename, subfolder, type });
  const res = await fetch(`${BASE_URL}/view?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`ComfyUI /view falló: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

module.exports = {
  isRunning,
  start,
  stop,
  uploadImage,
  queuePrompt,
  waitForOutputs,
  findOutputFile,
  fetchFile,
};
