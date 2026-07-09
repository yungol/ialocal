const express = require('express');
const config = require('../../config/default.json');
const gpu = require('../services/gpu');
const { EDIT_CAPABILITIES } = require('./models');

const router = express.Router();
const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;

// Note on error shape: the client's apiFetch helper reads `JSON.parse(body).error`
// directly as the thrown Error message (a flat string), matching the convention
// already used by routes/images.js (`{ error: 'No image data' }`). Do NOT nest
// this as `{ error: { message } }` here even though transcribe.js uses that shape —
// transcribe.js is consumed via raw fetch() on the client, never through apiFetch,
// so its nested shape is irrelevant to this route.

function resolveSeed(seed) {
  return seed == null || seed < 0 ? Math.floor(Math.random() * 2147483647) : seed;
}

function validateEditRequest(body) {
  const { model, mode, initImage, refImages, maskImage } = body;

  if (!model || !EDIT_CAPABILITIES[model]) {
    return 'Model does not support editing';
  }

  const caps = EDIT_CAPABILITIES[model];

  if (mode === 'img2img') {
    if (!caps.img2img) return 'Model does not support img2img';
    if (!initImage) return 'initImage is required for img2img mode';
  } else if (mode === 'refs') {
    if (!Array.isArray(refImages) || refImages.length === 0) {
      return 'refImages must be a non-empty array for refs mode';
    }
    if (refImages.length > caps.refImages) {
      return `refImages exceeds max of ${caps.refImages} for this model`;
    }
  } else if (mode === 'inpaint') {
    if (!caps.inpaint) return 'Model does not support inpainting';
    if (!initImage) return 'initImage is required for inpaint mode';
    if (!maskImage) return 'maskImage is required for inpaint mode';
  } else {
    return 'Unrecognized or missing mode (expected img2img, refs, or inpaint)';
  }

  return null;
}

// Start an image-editing job (img2img / reference images / inpainting) via
// sd-server's native async API, reached through llama-swap's /upstream
// passthrough. The passthrough loads/swaps the target model automatically.
router.post('/images/edit', async (req, res) => {
  const body = req.body || {};
  const validationError = validateEditRequest(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const {
    model,
    mode,
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    guidance,
    seed,
    strength,
    initImage,
    refImages,
    maskImage,
  } = body;

  // sd-server runs under llama.cpp on the GPU; free ComfyUI's VRAM first.
  try {
    await gpu.requireLlama();
  } catch {
    // best effort; proceed even if the mode switch fails
  }

  const resolvedSeed = resolveSeed(seed);
  const payload = {
    prompt: prompt || '',
    negative_prompt: negativePrompt || '',
    width: width || 576,
    height: height || 1024,
    seed: resolvedSeed,
    batch_count: 1,
    sample_params: {
      sample_steps: steps || 20,
      guidance: { txt_cfg: guidance ?? 1.0 },
    },
    output_format: 'png',
  };

  if (mode === 'img2img' || mode === 'inpaint') {
    payload.init_image = initImage;
    payload.strength = strength != null ? strength : 0.75;
  }
  if (mode === 'refs') {
    payload.ref_images = refImages;
  }
  if (mode === 'inpaint') {
    payload.mask_image = maskImage;
  }

  const url = `${BASE_URL}/upstream/${encodeURIComponent(model)}/sdcpp/v1/img_gen`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();

    if (!upstream.ok) {
      const contentType = upstream.headers.get('content-type') || 'application/json';
      return res.status(upstream.status).type(contentType).send(text);
    }

    let job;
    try {
      job = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'llama-swap upstream returned an invalid job response' });
    }

    // Echo the resolved seed so the client can attach it to saved results,
    // matching the reproducibility metadata of the txt2img path.
    res.status(upstream.status).json({ ...job, jobId: job.id, status: job.status, seed: resolvedSeed });
  } catch (err) {
    res.status(502).json({ error: `llama-swap upstream appears to be down: ${err.message}` });
  }
});

// Poll an edit job's status/result.
router.get('/images/edit/jobs/:model/:id', async (req, res) => {
  const { model, id } = req.params;
  if (!EDIT_CAPABILITIES[model]) {
    return res.status(404).json({ error: 'Unknown or unsupported edit model' });
  }

  const url = `${BASE_URL}/upstream/${encodeURIComponent(model)}/sdcpp/v1/jobs/${encodeURIComponent(id)}`;
  try {
    const upstream = await fetch(url);
    const contentType = upstream.headers.get('content-type') || 'application/json';
    const text = await upstream.text();
    res.status(upstream.status).type(contentType).send(text);
  } catch (err) {
    res.status(502).json({ error: `llama-swap upstream appears to be down: ${err.message}` });
  }
});

// Cancel a running edit job (best-effort from the client's perspective).
router.post('/images/edit/jobs/:model/:id/cancel', async (req, res) => {
  const { model, id } = req.params;
  if (!EDIT_CAPABILITIES[model]) {
    return res.status(404).json({ error: 'Unknown or unsupported edit model' });
  }

  const url = `${BASE_URL}/upstream/${encodeURIComponent(model)}/sdcpp/v1/jobs/${encodeURIComponent(id)}/cancel`;
  try {
    const upstream = await fetch(url, { method: 'POST' });
    const contentType = upstream.headers.get('content-type') || 'application/json';
    const text = await upstream.text();
    res.status(upstream.status).type(contentType).send(text);
  } catch (err) {
    res.status(502).json({ error: `llama-swap upstream appears to be down: ${err.message}` });
  }
});

module.exports = router;
