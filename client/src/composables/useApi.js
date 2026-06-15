const API_BASE = '';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    let message;
    try {
      message = JSON.parse(body).error || body;
    } catch {
      message = body;
    }
    throw new Error(message || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function getModels() {
  return apiFetch('/api/models');
}

function getRunningModels() {
  return apiFetch('/api/models/running');
}

function loadModel(id) {
  return apiFetch(`/api/models/${id}/load`, { method: 'POST' });
}

function unloadModel(id) {
  return apiFetch(`/api/models/${id}/unload`, { method: 'POST' });
}

function unloadAll() {
  return apiFetch('/api/models/unload-all', { method: 'POST' });
}

function getStats() {
  return apiFetch('/api/stats');
}

function loadChat() {
  return apiFetch('/api/chat/current');
}

function saveChat(id, messages, model, title) {
  const body = {};
  if (messages !== undefined) body.messages = messages;
  if (model !== undefined) body.model = model;
  if (title !== undefined) body.title = title;
  return apiFetch(`/api/chats/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function deleteChat(id) {
  return apiFetch(`/api/chats/${id}`, { method: 'DELETE' });
}

function createChat(title, model) {
  return apiFetch('/api/chats', {
    method: 'POST',
    body: JSON.stringify({ title, model }),
  });
}

function generateTitle(message, response, model) {
  return apiFetch('/api/generate-title', {
    method: 'POST',
    body: JSON.stringify({ message, response, model }),
  });
}

function listChats() {
  return apiFetch('/api/chats');
}

function getChat(id) {
  return apiFetch(`/api/chats/${id}`);
}

export {
  apiFetch,
  getModels,
  getRunningModels,
  loadModel,
  unloadModel,
  unloadAll,
  getStats,
  loadChat,
  saveChat,
  deleteChat,
  createChat,
  generateTitle,
  listChats,
  getChat,
};
