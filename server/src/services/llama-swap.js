const config = require('../../config/default.json');

const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`llama-swap error ${res.status}: ${body}`);
  }

  return res;
}

function getModels() {
  return request('/v1/models').then((res) => res.json());
}

function getRunning() {
  return request('/running').then((res) => res.json());
}

function unloadModel(name) {
  return request(`/api/models/unload/${name}`, { method: 'POST' }).then((res) =>
    res.json(),
  );
}

function unloadAll() {
  return request('/api/models/unload', { method: 'POST' }).then((res) =>
    res.json(),
  );
}

module.exports = { getModels, getRunning, unloadModel, unloadAll };
