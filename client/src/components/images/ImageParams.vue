<template>
  <div class="grid grid-cols-2 gap-3">
    <!-- Aspect ratio (click to select, constant pixel density ~768x768) -->
    <div class="col-span-2 flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Relacion de aspecto</span>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="preset in ASPECT_PRESETS"
          :key="preset.key"
          type="button"
          class="flex flex-col items-center gap-0.5 py-2 rounded-md border text-[11px] transition-colors"
          :class="aspect === preset.key
            ? 'bg-indigo-600 border-indigo-500 text-white'
            : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'"
          :title="`${preset.w}x${preset.h}`"
          @click="selectAspect(preset)"
        >
          <span class="material-icons text-[18px]">{{ preset.icon }}</span>
          {{ preset.key }}
        </button>
      </div>
    </div>

    <label class="flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Steps</span>
      <input
        v-model.number="stepsModel"
        type="number"
        min="1"
        max="100"
        class="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500/70"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Guidance</span>
      <input
        v-model.number="guidanceModel"
        type="number"
        min="1"
        max="20"
        step="0.5"
        class="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500/70"
      />
    </label>
    <label class="col-span-2 flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Seed <span class="text-neutral-600">(-1 = aleatorio)</span></span>
      <div class="flex gap-1">
        <input
          v-model.number="seedModel"
          type="number"
          class="w-full min-w-0 bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500/70"
        />
        <button
          type="button"
          title="Nueva variacion (seed aleatorio)"
          class="flex-shrink-0 flex items-center bg-neutral-800 hover:bg-indigo-600 text-neutral-300 hover:text-white border border-neutral-700 rounded-md px-2 transition-colors"
          @click="randomizeSeed"
        >
          <span class="material-icons text-[16px]">casino</span>
        </button>
      </div>
    </label>
  </div>
</template>

<script>
// All presets keep ~589k pixels (same density as 768x768) and stay multiples of 64,
// which diffusion models require for valid latent dimensions.
const ASPECT_PRESETS = [
  { key: '9:16', w: 576, h: 1024, icon: 'crop_portrait' },
  { key: '1:1', w: 768, h: 768, icon: 'crop_square' },
  { key: '16:9', w: 1024, h: 576, icon: 'crop_landscape' },
];

export default {
  name: 'ImageParams',
  props: {
    steps: { type: Number, default: 20 },
    guidance: { type: Number, default: 7.5 },
    seed: { type: Number, default: -1 },
    width: { type: Number, default: 576 },
    height: { type: Number, default: 1024 },
  },
  emits: ['update:steps', 'update:guidance', 'update:seed', 'update:width', 'update:height'],
  data() {
    return { ASPECT_PRESETS };
  },
  computed: {
    stepsModel: {
      get() { return this.steps; },
      set(v) { this.$emit('update:steps', v); },
    },
    guidanceModel: {
      get() { return this.guidance; },
      set(v) { this.$emit('update:guidance', v); },
    },
    seedModel: {
      get() { return this.seed; },
      set(v) { this.$emit('update:seed', v); },
    },
    aspect() {
      const match = ASPECT_PRESETS.find((p) => p.w === this.width && p.h === this.height);
      return match ? match.key : '9:16';
    },
  },
  methods: {
    selectAspect(preset) {
      this.$emit('update:width', preset.w);
      this.$emit('update:height', preset.h);
    },
    randomizeSeed() {
      this.$emit('update:seed', Math.floor(Math.random() * 2_000_000_000));
    },
  },
};
</script>
