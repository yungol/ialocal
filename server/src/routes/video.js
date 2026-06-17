const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/default.json');
const comfyui = require('../services/comfyui');
const gpu = require('../services/gpu');

const router = express.Router();
const LLAMA_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;
const VISION_MODEL = 'gemma4-vision';
const VIDEOS_DIR = path.join(__dirname, '..', '..', 'data', 'videos');
const IMAGES_DIR = path.join(__dirname, '..', '..', 'data', 'images');
const INDEX_PATH = path.join(VIDEOS_DIR, 'index.json');
const TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'templates',
  'video-wan22.json',
);

fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// Output dimensions per aspect. Wan needs multiples of 16; the workflow's
// ResizeImageMaskNode pre-scales the input, these set the latent size.
const DIMENSIONS = {
  // square at 640 has double the pixels of the other presets and OOMs on 8GB,
  // so it is capped lower. All values stay multiples of 16 (Wan requirement).
  square: { width: 528, height: 528 },
  horizontal: { width: 640, height: 320 },
  vertical: { width: 320, height: 640 },
};

// Node ids in templates/video-wan22.json (exported API format).
const NODE = {
  loadImage: '97',
  positivePrompt: '129:93',
  wanI2V: '129:98',
  sampler: '129:86',
};

// In-memory job store. Single-user local app, so this is enough; finished
// videos are persisted to disk and survive restarts via the index.
const jobs = new Map();

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

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function decodeImage(input) {
  // Accepts a raw base64 string or a data URL.
  const base64 = input.includes(',') ? input.split(',')[1] : input;
  return Buffer.from(base64, 'base64');
}

function buildWorkflow({ prompt, dims, imageRef }) {
  const wf = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf-8'));
  wf[NODE.loadImage].inputs.image = imageRef;
  wf[NODE.positivePrompt].inputs.text = prompt;
  wf[NODE.wanI2V].inputs.width = dims.width;
  wf[NODE.wanI2V].inputs.height = dims.height;
  wf[NODE.sampler].inputs.noise_seed = Math.floor(Math.random() * 1e15);
  return wf;
}

// Runs the full pipeline for a job. Never throws; records errors on the job.
async function runJob(job, { prompt, dims, imageBuffer }) {
  try {
    job.status = 'preparing';
    await gpu.requireComfy();

    const filename = `${job.id}.png`;
    const imageRef = await comfyui.uploadImage(imageBuffer, filename);

    const workflow = buildWorkflow({ prompt, dims, imageRef });

    job.status = 'rendering';
    const promptId = await comfyui.queuePrompt(workflow);
    job.promptId = promptId;

    const outputs = await comfyui.waitForOutputs(promptId);
    const file = comfyui.findOutputFile(outputs);
    if (!file) {
      throw new Error('El workflow no produjo ningún video');
    }

    const buffer = await comfyui.fetchFile(file);
    const ext = path.extname(file.filename) || '.mp4';
    const videoId = generateId();
    fs.writeFileSync(path.join(VIDEOS_DIR, `${videoId}${ext}`), buffer);

    const entry = {
      id: videoId,
      file: `${videoId}${ext}`,
      prompt: job.prompt,
      aspect: job.aspect,
      createdAt: Date.now(),
    };
    const index = readIndex();
    index.unshift(entry);
    writeJSON(INDEX_PATH, index);

    job.status = 'done';
    job.video = entry;
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
  }
}

// Start a video generation job. Returns immediately with a job id to poll.
router.post('/video', (req, res) => {
  const { prompt, image, imageId, aspect } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Falta el prompt' });
  }

  const dims = DIMENSIONS[aspect] || DIMENSIONS.square;

  // Source image: either a previously generated image (by id) or an upload.
  let imageBuffer;
  if (imageId) {
    try {
      imageBuffer = fs.readFileSync(path.join(IMAGES_DIR, `${imageId}.png`));
    } catch {
      return res.status(400).json({ error: 'Imagen de origen no encontrada' });
    }
  } else if (image) {
    try {
      imageBuffer = decodeImage(image);
    } catch {
      return res.status(400).json({ error: 'Imagen inválida' });
    }
  } else {
    return res.status(400).json({ error: 'Falta la imagen de origen' });
  }

  const job = {
    id: generateId(),
    status: 'queued',
    prompt: prompt.trim(),
    aspect: aspect && DIMENSIONS[aspect] ? aspect : 'square',
    createdAt: Date.now(),
    video: null,
    error: null,
  };
  jobs.set(job.id, job);

  // Fire and forget; the client polls GET /video/job/:id.
  runJob(job, { prompt: job.prompt, dims, imageBuffer });

  res.json({ jobId: job.id, status: job.status });
});

// Poll a job's status/result.
router.get('/video/job/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job no encontrado' });

  res.json({
    jobId: job.id,
    status: job.status,
    prompt: job.prompt,
    aspect: job.aspect,
    error: job.error,
    video: job.video,
  });
});

// List saved videos (paginated).
router.get('/videos', (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const index = readIndex();
  res.json({ videos: index.slice(offset, offset + limit), total: index.length });
});

// Delete a saved video.
router.delete('/videos/:id', (req, res) => {
  const index = readIndex();
  const entry = index.find((v) => v.id === req.params.id);
  if (entry) {
    try {
      fs.unlinkSync(path.join(VIDEOS_DIR, entry.file));
    } catch {
      // already gone
    }
  }
  writeJSON(
    INDEX_PATH,
    index.filter((v) => v.id !== req.params.id),
  );
  res.json({ ok: true });
});

// Vision-driven prompt suggestions. The model looks at the source image and
// returns an English image-to-video prompt; it does NOT render anything.
// Shared framing: the image is the FIRST FRAME the video grows from, the target
// is an AI image-to-video model, and the clip lasts ~6 seconds.
const PROMPT_CONTEXT =
  'This image is the FIRST FRAME of a short video. Write instructions for an AI image-to-video generation model that will animate this exact frame into a clip lasting about 6 seconds. The animation must start from this frame and keep the character, style and setting fully consistent with it. Output ONE concise English prompt describing the motion that unfolds over those 6 seconds.';

const PROMPT_INSTRUCTIONS = {
  greeting: `${PROMPT_CONTEXT} The main character/subject should wave and greet directly at the camera in a natural, friendly way — describe the gesture, facial expression, subtle body motion and a fitting camera behavior.`,
  motion: `${PROMPT_CONTEXT} Describe an interesting, dynamic yet natural motion for the main subject of the scene, including a fitting camera behavior.`,
};

function imageToDataUrl({ image, imageId }) {
  if (imageId) {
    const buffer = fs.readFileSync(path.join(IMAGES_DIR, `${imageId}.png`));
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
  if (image) {
    return image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
  }
  return null;
}

// Generate an English video prompt from an image using the vision model.
router.post('/video/prompt', async (req, res) => {
  const { image, imageId, kind, text } = req.body;

  let instruction;
  if (kind === 'custom') {
    const action = (text || '').trim();
    if (!action) {
      return res.status(400).json({ error: 'Falta el texto a mejorar' });
    }
    instruction = `${PROMPT_CONTEXT} The user wants this to happen in the video: "${action}". Turn that into a clear English prompt that makes the AI video model execute exactly that action across the 6 seconds, adding only the motion, timing and visual detail needed for it to look natural and well executed. Stay faithful to the user's intent and to the image — do not invent unrelated actions.`;
  } else {
    instruction = PROMPT_INSTRUCTIONS[kind] || PROMPT_INSTRUCTIONS.motion;
  }

  let dataUrl;
  try {
    dataUrl = imageToDataUrl({ image, imageId });
  } catch {
    return res.status(400).json({ error: 'Imagen de origen no encontrada' });
  }
  if (!dataUrl) {
    return res.status(400).json({ error: 'Falta la imagen de origen' });
  }

  try {
    // The vision model runs through llama-swap; make sure ComfyUI isn't holding VRAM.
    await gpu.requireLlama();

    const upstream = await fetch(`${LLAMA_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a prompt engineer for image-to-video generation. Always answer in English. Output ONLY the final prompt text — no preamble, no quotes, no explanations, no labels.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: instruction },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        // No token cap — like the chat. The model may "think" (that goes to
        // reasoning_content) and then write the prompt into content. Capping it
        // truncates before content is ever produced.
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      return res
        .status(502)
        .json({ error: `Modelo de vision fallo: ${body.slice(0, 200)}` });
    }

    const data = await upstream.json();
    const prompt = (data.choices?.[0]?.message?.content || '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .trim();

    if (!prompt) {
      return res.status(502).json({ error: 'El modelo no devolvio un prompt' });
    }
    res.json({ prompt });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error generando el prompt' });
  }
});

module.exports = router;
