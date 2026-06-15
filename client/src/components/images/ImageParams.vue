<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <label class="flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Steps</span>
      <input
        v-model.number="values.steps"
        type="number"
        min="1"
        max="100"
        class="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-neutral-500"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Guidance</span>
      <input
        v-model.number="values.guidance"
        type="number"
        min="1"
        max="20"
        step="0.5"
        class="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-neutral-500"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Seed (-1 = random)</span>
      <input
        v-model.number="values.seed"
        type="number"
        class="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-neutral-500"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-neutral-500 text-[11px]">Tamano</span>
      <select
        v-model="values.size"
        class="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-neutral-500"
      >
        <option value="512x512">512x512</option>
        <option value="768x768">768x768</option>
        <option value="1024x1024">1024x1024</option>
      </select>
    </label>
  </div>
</template>

<script>
export default {
  name: 'ImageParams',
  props: {
    steps: { type: Number, default: 20 },
    guidance: { type: Number, default: 7.5 },
    seed: { type: Number, default: -1 },
    width: { type: Number, default: 1024 },
    height: { type: Number, default: 1024 },
  },
  emits: ['update:steps', 'update:guidance', 'update:seed', 'update:width', 'update:height'],
  computed: {
    values: {
      get() {
        const sizeKey = `${this.width}x${this.height}`;
        return {
          steps: this.steps,
          guidance: this.guidance,
          seed: this.seed,
          size: ['512x512', '768x768', '1024x1024'].includes(sizeKey) ? sizeKey : '1024x1024',
        };
      },
      set(val) {
        this.$emit('update:steps', val.steps);
        this.$emit('update:guidance', val.guidance);
        this.$emit('update:seed', val.seed);
        const [w, h] = (val.size || '1024x1024').split('x').map(Number);
        this.$emit('update:width', w);
        this.$emit('update:height', h);
      },
    },
  },
};
</script>
