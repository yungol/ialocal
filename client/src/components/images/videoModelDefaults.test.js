import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_MODELS,
  DEFAULT_VIDEO_MODEL,
  resolveVideoModelId,
  getVideoModel,
} from './videoModelDefaults.js';

test('video presets list exactly the two Wan 2.2 options in selector order', () => {
  assert.deepEqual(
    VIDEO_MODELS.map((preset) => ({ id: preset.id, label: preset.label })),
    [
      { id: 'wan22', label: 'Wan 2.2 14B' },
      { id: 'wan22-hq', label: 'Wan 2.2 14B HQ' },
    ],
  );
});

test('the Wan 2.2 14B preset is the default and the first option', () => {
  assert.equal(DEFAULT_VIDEO_MODEL, 'wan22');
  assert.equal(VIDEO_MODELS[0].id, DEFAULT_VIDEO_MODEL);
  assert.equal(getVideoModel(undefined).id, 'wan22');
  assert.equal(getVideoModel('').id, 'wan22');
});

test('known model ids resolve to their own preset', () => {
  for (const id of ['wan22', 'wan22-hq']) {
    assert.equal(resolveVideoModelId(id), id);
    assert.equal(getVideoModel(id).id, id);
  }
});

test('the removed wan22-5b preset resolves to the default preset', () => {
  assert.equal(resolveVideoModelId('wan22-5b'), DEFAULT_VIDEO_MODEL);
  assert.equal(getVideoModel('wan22-5b').id, DEFAULT_VIDEO_MODEL);
  assert.ok(!VIDEO_MODELS.some((preset) => preset.id === 'wan22-5b'));
});

test('unknown model ids fall back to the default preset instead of throwing', () => {
  for (const id of ['nope', 'wan22-14b', 0, null, undefined]) {
    assert.equal(resolveVideoModelId(id), DEFAULT_VIDEO_MODEL);
    assert.equal(getVideoModel(id).id, DEFAULT_VIDEO_MODEL);
  }
});
