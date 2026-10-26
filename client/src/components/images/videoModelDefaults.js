// Wan 2.2 presets offered by the "Crear video" modal. `model` is optional in
// the POST /api/video payload; the server resolves unknown ids to `wan22`.
export const DEFAULT_VIDEO_MODEL = 'wan22';

export const VIDEO_MODELS = [
  { id: 'wan22', label: 'Wan 2.2 14B', icon: 'movie' },
  { id: 'wan22-hq', label: 'Wan 2.2 14B HQ', icon: 'high_quality' },
];

export function resolveVideoModelId(model) {
  return VIDEO_MODELS.some((preset) => preset.id === model) ? model : DEFAULT_VIDEO_MODEL;
}

export function getVideoModel(model) {
  const id = resolveVideoModelId(model);
  return VIDEO_MODELS.find((preset) => preset.id === id) || VIDEO_MODELS[0];
}
