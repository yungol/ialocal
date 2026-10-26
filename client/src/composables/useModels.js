import { apiFetch, getModels, getRunningModels, getStats, unloadModel, unloadAll } from './useApi';

const POLL_INTERVAL_MS = 5000;

function createModelStore() {
  let models = [];
  let running = [];
  let stats = null;
  let activity = [];
  let listeners = [];
  let intervalId = null;

  // Previous decode counters, keyed by model and slot, so a token rate can be
  // derived from the difference between two polls. llama-server reports
  // n_decoded per task and restarts it at zero on the next one, so a sample is
  // only comparable when taskId is unchanged; otherwise the rate is reported as
  // null rather than as the spike or negative value the raw difference gives.
  // The resulting figure is an average over the poll interval, not an instant
  // rate, so it reads lower than the per-request timings for a short answer
  // that only occupied part of the window.
  let previous = new Map();

  function notify() {
    listeners.forEach((fn) => fn({ models, running, stats, activity }));
  }

  function deriveActivity(raw, sampledAt) {
    const next = new Map();

    const derived = (raw || []).map((a) => {
      const key = `${a.model}:${a.slot}`;
      const prev = previous.get(key);
      next.set(key, { decoded: a.decoded, taskId: a.taskId, sampledAt });

      let tokensPerSecond = null;
      if (prev && prev.taskId === a.taskId && a.decoded > prev.decoded) {
        const elapsed = (sampledAt - prev.sampledAt) / 1000;
        if (elapsed > 0) {
          tokensPerSecond = (a.decoded - prev.decoded) / elapsed;
        }
      }

      const ctxPercent = a.ctxTotal > 0 ? Math.round((a.ctxUsed / a.ctxTotal) * 100) : 0;

      return { ...a, tokensPerSecond, ctxPercent };
    });

    previous = next;
    return derived;
  }

  async function fetchAll() {
    try {
      const [modelsData, runningData, statsData] = await Promise.all([
        getModels(),
        getRunningModels(),
        getStats(),
      ]);
      models = modelsData.models || [];
      running = runningData.running || [];
      stats = statsData;
      activity = deriveActivity(statsData.activity, statsData.sampledAt || Date.now());
      notify();
    } catch {
      // keep stale data
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }

  function startPolling(intervalMs = POLL_INTERVAL_MS) {
    fetchAll();
    intervalId = setInterval(fetchAll, intervalMs);
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    previous = new Map();
  }

  async function load(id) {
    await apiFetch(`/api/models/${id}/load`, { method: 'POST' });
    await fetchAll();
  }

  async function unload(id) {
    await unloadModel(id);
    await fetchAll();
  }

  async function unloadAllModels() {
    await unloadAll();
    await fetchAll();
  }

  return { subscribe, startPolling, stopPolling, load, unload, unloadAll: unloadAllModels, fetchAll };
}

const store = createModelStore();

export { store };
