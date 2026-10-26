import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_DEFAULTS, GLOBAL_DEFAULTS, getImageModelDefaults } from './imageModelDefaults.js';

test('FLUX3 distilled defaults are 16 steps, CFG 1, and existing portrait dimensions', () => {
  assert.deepEqual(getImageModelDefaults('flux3-klein'), {
    steps: 16,
    guidance: 1,
    width: 576,
    height: 1024,
  });
});

test('all existing model defaults remain unchanged', () => {
  const existing = Object.fromEntries(
    Object.entries(MODEL_DEFAULTS).filter(([id]) => id !== 'flux3-klein'),
  );
  assert.deepEqual(existing, {
    'flux2-klein': { steps: 4, guidance: 1, width: 576, height: 1024 },
    'juggernaut-z': { steps: 20, guidance: 1, width: 576, height: 1024 },
    sdxl: { steps: 20, guidance: 7.5, width: 576, height: 1024 },
  });
  for (const [model, defaults] of Object.entries(existing)) {
    assert.deepEqual(getImageModelDefaults(model), defaults);
  }
});

test('unknown and empty model selection retain global defaults including seed', () => {
  assert.deepEqual(GLOBAL_DEFAULTS, {
    steps: 20,
    guidance: 7.5,
    seed: -1,
    width: 576,
    height: 1024,
  });
  for (const model of ['unknown-model', '']) {
    assert.strictEqual(getImageModelDefaults(model), GLOBAL_DEFAULTS);
  }
});
