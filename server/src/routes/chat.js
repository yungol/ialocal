const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const CHATS_DIR = path.join(__dirname, '..', '..', 'data', 'chats');
const INDEX_PATH = path.join(CHATS_DIR, 'index.json');

// The data directory is gitignored, so it may not exist on a fresh setup.
// Ensure it exists before any read/write happens.
fs.mkdirSync(CHATS_DIR, { recursive: true });

function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function readIndex() {
  const idx = readJSON(INDEX_PATH);
  return idx && Array.isArray(idx) ? idx : [];
}

function writeIndex(idx) {
  writeJSON(INDEX_PATH, idx);
}

function chatPath(id) {
  return path.join(CHATS_DIR, `${id}.json`);
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// List all chats
router.get('/chats', (_req, res) => {
  const index = readIndex();
  res.json(
    index.map((c) => ({
      id: c.id,
      title: c.title,
      model: c.model,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  );
});

// Create a new chat
router.post('/chats', (req, res) => {
  const id = generateId();
  const { title, model } = req.body;
  const now = Date.now();

  const chat = { id, title: title || 'Nuevo chat', model: model || '', createdAt: now, updatedAt: now };
  const index = readIndex();
  index.unshift(chat);
  writeIndex(index);
  writeJSON(chatPath(id), []);

  res.json(chat);
});

// Get chat messages + metadata
router.get('/chats/:id', (req, res) => {
  const { id } = req.params;
  const data = readJSON(chatPath(id));
  if (!data) return res.status(404).json({ error: 'Chat no encontrado' });

  const index = readIndex();
  const entry = index.find((c) => c.id === id);

  res.json({
    messages: data,
    title: entry ? entry.title : '',
    model: entry ? entry.model || '' : '',
  });
});

// Save chat messages + metadata
router.put('/chats/:id', (req, res) => {
  const { id } = req.params;
  const { messages, model, title } = req.body;

  if (!fs.existsSync(chatPath(id))) {
    return res.status(404).json({ error: 'Chat no encontrado' });
  }

  if (messages !== undefined) {
    writeJSON(chatPath(id), messages);
  }

  // Update index metadata
  const index = readIndex();
  const entry = index.find((c) => c.id === id);
  if (entry) {
    entry.updatedAt = Date.now();
    if (model) entry.model = model;
    if (title) entry.title = title;
    writeIndex(index);
  }

  res.json({ ok: true });
});

// Delete a chat
router.delete('/chats/:id', (req, res) => {
  const { id } = req.params;
  const filepath = chatPath(id);

  try {
    fs.unlinkSync(filepath);
  } catch {
    // file not found, fine
  }

  const index = readIndex().filter((c) => c.id !== id);
  writeIndex(index);

  res.json({ ok: true });
});

// Ensure there's always at least one chat
router.get('/chat/current', (_req, res) => {
  const index = readIndex();
  if (index.length === 0) {
    const id = generateId();
    const now = Date.now();
    const chat = { id, title: 'Chat 1', model: '', createdAt: now, updatedAt: now };
    writeIndex([chat]);
    writeJSON(chatPath(id), []);
    return res.json({ chat, messages: [] });
  }

  const entry = index[0];
  const messages = readJSON(chatPath(entry.id)) || [];
  res.json({ chat: entry, messages });
});

module.exports = router;
