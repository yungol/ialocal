import { apiFetch, getModels, getRunningModels, getStats, unloadModel, unloadAll } from './useApi';

function createModelStore() {
  let models = [];
  let running = [];
  let stats = null;
  let listeners = [];
  let intervalId = null;

  function notify() {
    listeners.forEach((fn) => fn({ models, running, stats }));
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

  function startPolling(intervalMs = 5000) {
    fetchAll();
    intervalId = setInterval(fetchAll, intervalMs);
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
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
