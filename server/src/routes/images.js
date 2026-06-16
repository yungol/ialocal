const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const IMAGES_DIR = path.join(__dirname, '..', '..', 'data', 'images');
const INDEX_PATH = path.join(IMAGES_DIR, 'index.json');

fs.mkdirSync(IMAGES_DIR, { recursive: true });

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

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// List all saved images
router.get('/images', (_req, res) => {
  const index = readIndex();
  res.json({ images: index });
});

// Save a generated image
router.post('/images', (req, res) => {
  const { b64_json, prompt, model } = req.body;

  if (!b64_json) {
    return res.status(400).json({ error: 'No image data' });
  }

  const id = generateId();
  const filename = `${id}.png`;
  const filepath = path.join(IMAGES_DIR, filename);

  const buffer = Buffer.from(b64_json, 'base64');
  fs.writeFileSync(filepath, buffer);

  const now = Date.now();
  const entry = {
    id,
    prompt: prompt || '',
    model: model || '',
    createdAt: now,
  };

  const index = readIndex();
  index.unshift(entry);
  writeIndex(index);

  res.json(entry);
});

// Delete an image
router.delete('/images/:id', (req, res) => {
  const { id } = req.params;
  const filepath = path.join(IMAGES_DIR, `${id}.png`);

  try {
    fs.unlinkSync(filepath);
  } catch {
    // file not found, fine
  }

  const index = readIndex().filter((img) => img.id !== id);
  writeIndex(index);

  res.json({ ok: true });
});

// Delete all images
router.delete('/images', (_req, res) => {
  const index = readIndex();

  index.forEach((img) => {
    try {
      fs.unlinkSync(path.join(IMAGES_DIR, `${img.id}.png`));
    } catch {
      // ignore
    }
  });

  writeIndex([]);
  res.json({ ok: true });
});

module.exports = router;
