const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  VIDEO_MODELS,
  DEFAULT_VIDEO_MODEL,
  resolveVideoModelId,
  getDimensions,
  buildWorkflow,
} = require('./video');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

function readTemplate(file) {
  return JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8'));
}

function nodesOf(workflow, classType) {
  return Object.values(workflow).filter((node) => node.class_type === classType);
}

test('video presets expose exactly the two Wan 2.2 14B models with wan22 as default', () => {
  assert.equal(DEFAULT_VIDEO_MODEL, 'wan22');
  assert.deepEqual(
    VIDEO_MODELS.map((preset) => preset.id),
    ['wan22', 'wan22-hq'],
  );
  assert.deepEqual(
    VIDEO_MODELS.map((preset) => preset.template),
    ['video-wan22.json', 'video-wan22-hq.json'],
  );
});

test('every preset template exists and parses as an API-format workflow', () => {
  for (const preset of VIDEO_MODELS) {
    const workflow = readTemplate(preset.template);
    assert.ok(workflow && typeof workflow === 'object');
    for (const [id, node] of Object.entries(workflow)) {
      assert.equal(typeof node.class_type, 'string', `${preset.id} node ${id}`);
      assert.equal(typeof node.inputs, 'object', `${preset.id} node ${id}`);
    }
  }
});

test('unknown, empty and absent model ids fall back to the default preset', () => {
  for (const model of [undefined, null, '', 'nope', 'wan22-unknown']) {
    assert.equal(resolveVideoModelId(model), 'wan22');
  }
  for (const known of ['wan22', 'wan22-hq']) {
    assert.equal(resolveVideoModelId(known), known);
  }
});

test('the removed wan22-5b preset now resolves to the default preset', () => {
  assert.equal(resolveVideoModelId('wan22-5b'), 'wan22');
  assert.equal(resolveVideoModelId('wan22-5b'), DEFAULT_VIDEO_MODEL);
  assert.ok(!VIDEO_MODELS.some((preset) => preset.id === 'wan22-5b'));
});

test('Wan 14B aspect dimensions stay exactly as before', () => {
  assert.deepEqual(getDimensions('wan22', 'square'), { width: 528, height: 528 });
  assert.deepEqual(getDimensions('wan22', 'horizontal'), { width: 640, height: 320 });
  assert.deepEqual(getDimensions('wan22', 'vertical'), { width: 320, height: 640 });
  assert.deepEqual(getDimensions('wan22-hq', 'square'), { width: 528, height: 528 });
  assert.deepEqual(getDimensions('wan22-hq', 'horizontal'), { width: 640, height: 320 });
  assert.deepEqual(getDimensions('wan22-hq', 'vertical'), { width: 320, height: 640 });
  // Unknown aspect and unknown model both degrade instead of throwing.
  assert.deepEqual(getDimensions('nope', 'diagonal'), { width: 528, height: 528 });
  assert.deepEqual(getDimensions('wan22', 'diagonal'), { width: 528, height: 528 });
  // Object prototype keys are not valid aspects or presets.
  assert.deepEqual(getDimensions('wan22', 'toString'), { width: 528, height: 528 });
  assert.deepEqual(getDimensions('toString', 'square'), { width: 528, height: 528 });
});

test('default Wan 14B workflow keeps its graph, frames and fps', () => {
  const workflow = buildWorkflow({
    prompt: 'a prompt',
    dims: { width: 640, height: 320 },
    imageRef: 'source.png',
  });

  assert.equal(workflow['97'].inputs.image, 'source.png');
  assert.equal(workflow['129:93'].inputs.text, 'a prompt');
  assert.equal(workflow['129:98'].inputs.width, 640);
  assert.equal(workflow['129:98'].inputs.height, 320);
  assert.equal(workflow['129:98'].inputs.length, 93);
  assert.equal(workflow['129:94'].inputs.fps, 16);
  assert.equal(workflow['129:90'].inputs.vae_name, 'wan_2.1_vae.safetensors');
  assert.equal(typeof workflow['129:86'].inputs.noise_seed, 'number');
  assert.deepEqual(
    nodesOf(workflow, 'LoraLoaderModelOnly')
      .map((node) => node.inputs.lora_name)
      .sort(),
    [
      'wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors',
      'wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors',
    ],
  );
});

test('unknown model still builds the unchanged default workflow', () => {
  const workflow = buildWorkflow({
    model: 'does-not-exist',
    prompt: 'a prompt',
    dims: { width: 528, height: 528 },
    imageRef: 'source.png',
  });
  assert.equal(workflow['129:98'].inputs.length, 93);
  assert.equal(workflow['129:94'].inputs.fps, 16);
  assert.equal(workflow['129:90'].inputs.vae_name, 'wan_2.1_vae.safetensors');
});

test('HQ template is the default graph with only the two rank-64 LoRA names changed', () => {
  const base = readTemplate('video-wan22.json');
  const hq = readTemplate('video-wan22-hq.json');

  assert.deepEqual(Object.keys(hq).sort(), Object.keys(base).sort());

  assert.deepEqual(
    nodesOf(hq, 'LoraLoaderModelOnly')
      .map((node) => node.inputs.lora_name)
      .sort(),
    [
      'wan2.2_i2v_A14b_high_noise_lora_rank64_lightx2v_4step_1022.safetensors',
      'wan2.2_i2v_A14b_low_noise_lora_rank64_lightx2v_4step_1022.safetensors',
    ],
  );

  const withoutLoraNames = (workflow) =>
    JSON.parse(JSON.stringify(workflow, (key, value) => (key === 'lora_name' ? '<lora>' : value)));
  assert.deepEqual(withoutLoraNames(hq), withoutLoraNames(base));
});

test('HQ workflow patches the same nodes as the default preset', () => {
  const workflow = buildWorkflow({
    model: 'wan22-hq',
    prompt: 'hq prompt',
    dims: { width: 640, height: 320 },
    imageRef: 'source.png',
  });

  assert.equal(workflow['97'].inputs.image, 'source.png');
  assert.equal(workflow['129:93'].inputs.text, 'hq prompt');
  assert.equal(workflow['129:98'].inputs.width, 640);
  assert.equal(workflow['129:98'].inputs.height, 320);
  assert.equal(workflow['129:98'].inputs.length, 93);
  assert.equal(workflow['129:94'].inputs.fps, 16);
});

