const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

// User preferences that persist independently of any chat.
// chatModel  -> last model selected for text chat
// imageModel -> last model selected for image generation
const DEFAULTS = { chatModel: '', imageModel: '' };

function readSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    return { ...DEFAULTS, ...data };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeSettings(settings) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// Get current preferences
router.get('/settings', (_req, res) => {
  res.json(readSettings());
});

// Update preferences (partial merge)
router.put('/settings', (req, res) => {
  const current = readSettings();
  const { chatModel, imageModel } = req.body || {};
  const next = { ...current };
  if (typeof chatModel === 'string') next.chatModel = chatModel;
  if (typeof imageModel === 'string') next.imageModel = imageModel;
  writeSettings(next);
  res.json(next);
});

module.exports = router;
