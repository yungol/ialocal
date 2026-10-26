export const MODEL_DEFAULTS = {
  'flux2-klein': { steps: 4, guidance: 1.0, width: 576, height: 1024 },
  'juggernaut-z': { steps: 20, guidance: 1, width: 576, height: 1024 },
  sdxl: { steps: 20, guidance: 7.5, width: 576, height: 1024 },
  'flux3-klein': { steps: 16, guidance: 1, width: 576, height: 1024 },
};

export const GLOBAL_DEFAULTS = { steps: 20, guidance: 7.5, seed: -1, width: 576, height: 1024 };

export function getImageModelDefaults(model) {
  return MODEL_DEFAULTS[model] || GLOBAL_DEFAULTS;
}
