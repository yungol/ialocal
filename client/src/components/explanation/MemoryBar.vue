<template>
  <div>
    <div class="flex justify-between text-[11px] mb-1">
      <span class="text-neutral-400">{{ title }}</span>
      <span :class="used > total ? 'text-red-400' : 'text-neutral-300'" class="font-mono">
        {{ used.toFixed(2) }} / {{ total }} GiB
      </span>
    </div>
    <div
      class="relative h-5 rounded-md bg-neutral-950 border overflow-hidden flex"
      :class="used > total ? 'border-red-700' : 'border-neutral-800'"
    >
      <div
        v-for="s in visibleSegments"
        :key="s.label"
        :class="s.color"
        :style="{ width: (s.value / scale) * 100 + '%' }"
        :title="`${s.label}: ${s.value.toFixed(2)} GiB`"
        class="h-full border-r border-neutral-950/40 transition-all duration-300"
      ></div>
      <!-- Physical limit marker when overflowing -->
      <div
        v-if="used > total"
        class="absolute top-0 bottom-0 w-0.5 bg-red-500"
        :style="{ left: (total / scale) * 100 + '%' }"
      ></div>
    </div>
    <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
      <span v-for="s in visibleSegments" :key="s.label" class="flex items-center gap-1 text-[10px] text-neutral-500">
        <span class="w-2 h-2 rounded-sm" :class="s.color"></span>
        {{ s.label }} {{ s.value.toFixed(2) }}
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MemoryBar',
  props: {
    title: { type: String, required: true },
    total: { type: Number, required: true },
    segments: { type: Array, required: true },
  },
  computed: {
    visibleSegments() {
      return this.segments.filter((s) => s.value > 0.005);
    },
    used() {
      return this.segments.reduce((sum, s) => sum + s.value, 0);
    },
    scale() {
      return Math.max(this.total, this.used);
    },
  },
};
</script>
