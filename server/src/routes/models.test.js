const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const llamaSwap = require('../services/llama-swap');
const router = require('./models');

const listModels = router.stack.find((layer) => layer.route?.path === '/models').route.stack[0]
  .handle;
const existingPaths = {
  'qwen3-8b': '/home/juan/models/Qwen3-8B-Q4_K_M.gguf',
  'qwen-claude-opus': '/home/juan/models/Qwen3.5-9B-Claude-Opus-Q4_K_M.gguf',
  bonsai: '/home/juan/models/Ternary-Bonsai-2-27B-PTQ1_0.gguf',
  'qwen36-35b-a3b-vision': '/home/juan/models/Qwen3.6-35B-A3B-MTP-MXFP4_MOE.gguf',
  'gemma-4-e4b': '/home/juan/models/gemma-4-E4B-it-Q4_K_M.gguf',
  'flux2-klein': '/home/juan/models/flux-2-klein-4b-Q4_0.gguf',
  'juggernaut-z': '/home/juan/models/juggernautZ-v10-Q6_K.gguf',
  'gemma4-vision': '/home/juan/models/gemma-4-E4B-it-Q4_K_M.gguf',
  whisper: '/home/juan/models/ggml-large-v3-turbo.bin',
};
const flux3Path = '/home/juan/models/flux3-klein/flux3-image-klein-Q4_0.gguf';
const flux3Size = 3514023104;

async function catalog() {
  let body;
  await listModels({}, { json: (value) => (body = value) });
  return body.models;
}

test('upstream catalog classifies FLUX3 as txt2img-only and reads its exact size path', async (t) => {
  t.mock.method(llamaSwap, 'getModels', async () => ({
    data: [{ id: 'flux3-klein' }, { id: 'flux2-klein' }, { id: 'custom-llm' }],
  }));
  const paths = [];
  t.mock.method(fs, 'statSync', (path) => {
    paths.push(path);
    if (path === flux3Path) return { size: flux3Size };
    throw new Error('not installed');
  });
  const models = await catalog();
  assert.deepEqual(models[0], {
    id: 'flux3-klein',
    name: 'flux3-klein',
    type: 'image',
    vision: false,
    status: 'unloaded',
    size: flux3Size,
    edit: null,
  });
  assert.equal(paths[0], flux3Path);
  assert.deepEqual(
    models.map((model) => model.id),
    ['flux3-klein', 'flux2-klein', 'custom-llm'],
  );
  assert.deepEqual(models[1].edit, { img2img: true, inpaint: true, refImages: 3 });
  assert.equal(models[2].type, 'llm');
  assert.equal(models[2].size, null);
  assert.equal(models[2].edit, null);
});

test('fallback appends FLUX3 while preserving every existing catalog row and size path', async (t) => {
  t.mock.method(llamaSwap, 'getModels', async () => {
    throw new Error('offline');
  });
  const paths = [];
  t.mock.method(fs, 'statSync', (path) => {
    paths.push(path);
    return { size: path === flux3Path ? flux3Size : 123 };
  });
  const models = await catalog();
  const ids = Object.keys(existingPaths);
  assert.deepEqual(
    models.map((model) => model.id),
    [...ids, 'flux3-klein'],
  );
  assert.deepEqual(paths, [...Object.values(existingPaths), flux3Path]);
  assert.deepEqual(
    models.slice(0, ids.length),
    ids.map((id) => ({
      id,
      name: id,
      type:
        id === 'whisper' ? 'stt' : ['flux2-klein', 'juggernaut-z'].includes(id) ? 'image' : 'llm',
      vision: ['qwen36-35b-a3b-vision', 'gemma4-vision'].includes(id),
      status: 'unloaded',
      size: 123,
      edit: id === 'flux2-klein' ? { img2img: true, inpaint: true, refImages: 3 } : null,
    })),
  );
  assert.equal(models.at(-1).edit, null);
});

test('upstream stays authoritative and missing FLUX3 assets report null size', async (t) => {
  const getModels = t.mock.method(llamaSwap, 'getModels', async () => ({ data: [] }));
  t.mock.method(fs, 'statSync', () => {
    throw new Error('missing');
  });
  assert.deepEqual(await catalog(), []);
  getModels.mock.mockImplementation(async () => ({ data: [{ id: 'flux3-klein' }] }));
  const models = await catalog();
  assert.equal(models[0].type, 'image');
  assert.equal(models[0].size, null);
  assert.equal(models[0].edit, null);
});
