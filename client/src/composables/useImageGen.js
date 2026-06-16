import { apiFetch } from './useApi';

async function generateImage({
  model,
  prompt,
  negativePrompt,
  steps,
  guidance,
  seed,
  width,
  height,
}) {
  // sd-server's OpenAI route only reads prompt/n/size/output_format from the JSON
  // body. seed, steps, cfg and negative_prompt are ignored there, so they must be
  // smuggled in via a <sd_cpp_extra_args> tag inside the prompt — the server parses
  // it and strips it from the text before generation.
  // Resolve seed < 0 to a concrete value client-side so every run produces a new
  // variation AND the exact seed is known (returned below for reproducibility).
  const resolvedSeed =
    seed == null || seed < 0 ? Math.floor(Math.random() * 2147483647) : seed;

  const extraArgs = {
    seed: resolvedSeed,
    negative_prompt: negativePrompt || '',
    sample_params: {
      sample_steps: steps || 20,
      guidance: { txt_cfg: guidance ?? 1.0 },
    },
  };

  const response = await fetch('/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `${prompt} <sd_cpp_extra_args>${JSON.stringify(extraArgs)}</sd_cpp_extra_args>`,
      // sd-server honors `size` ("WxH") over HTTP; width/height are ignored
      size: `${width || 512}x${height || 512}`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let msg = `Error ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.error?.message || msg;
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const imageData = data.data || [];
  const results = [];

  for (const img of imageData) {
    if (img.b64_json) {
      const saved = await apiFetch('/api/images', {
        method: 'POST',
        body: JSON.stringify({ b64_json: img.b64_json, prompt, model }),
      });
      results.push({
        id: saved.id,
        url: `/images/${saved.id}.png`,
        prompt,
        seed: resolvedSeed,
        createdAt: saved.createdAt,
      });
    }
  }

  return results;
}

async function getImageModels() {
  const data = await apiFetch('/api/models');
  return (data.models || []).filter((m) => m.type === 'image');
}

async function getSavedImages() {
  const data = await apiFetch('/api/images');
  return (data.images || []).map((img) => ({
    id: img.id,
    url: `/images/${img.id}.png`,
    prompt: img.prompt,
    createdAt: img.createdAt,
  }));
}

async function deleteImage(id) {
  const { deleteImage: del } = await import('./useApi');
  return del(id);
}

async function deleteAllImages() {
  const { deleteAllImages: delAll } = await import('./useApi');
  return delAll();
}

export { generateImage, getImageModels, getSavedImages, deleteImage, deleteAllImages };
