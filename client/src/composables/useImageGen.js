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
  const response = await fetch('/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      negative_prompt: negativePrompt || '',
      steps: steps || 20,
      guidance_scale: guidance || 7.5,
      seed: seed || -1,
      width: width || 1024,
      height: height || 1024,
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

  return response.json();
}

async function getImageModels() {
  const data = await apiFetch('/api/models');
  return (data.models || []).filter((m) => m.type === 'image');
}

export { generateImage, getImageModels };
