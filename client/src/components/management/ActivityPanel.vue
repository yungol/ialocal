<template>
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[12px] font-medium text-neutral-400">Actividad</h3>
      <span
        class="text-[10px] font-medium px-2 py-0.5 rounded-full"
        :class="anyProcessing
          ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
          : 'bg-neutral-800 text-neutral-500 border border-neutral-700'"
      >
        {{ anyProcessing ? 'generando' : 'en reposo' }}
      </span>
    </div>

    <div v-if="activity.length === 0" class="text-neutral-600 text-[11px]">
      Ningun modelo cargado.
    </div>

    <div v-else class="space-y-4">
      <div v-for="a in activity" :key="`${a.model}:${a.slot}`">
        <div class="flex items-baseline justify-between mb-2">
          <span class="text-neutral-300 text-xs font-medium">{{ a.model }}</span>
          <span class="text-neutral-200 font-mono text-base">
            {{ a.tokensPerSecond === null ? '--' : a.tokensPerSecond.toFixed(1) }}
            <span class="text-neutral-600 text-[10px]">tok/s</span>
          </span>
        </div>

        <div class="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-neutral-500 transition-all duration-500"
            :style="{ width: `${a.ctxPercent}%` }"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] text-neutral-600 mt-1">
          <span>contexto {{ a.ctxUsed.toLocaleString() }} / {{ a.ctxTotal.toLocaleString() }}</span>
          <span>{{ a.ctxPercent }}%</span>
        </div>

        <div v-if="a.processing" class="text-[10px] text-neutral-500 mt-1.5">
          {{ describe(a) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActivityPanel',
  props: {
    activity: { type: Array, default: () => [] },
  },
  computed: {
    anyProcessing() {
      return this.activity.some((a) => a.processing);
    },
  },
  methods: {
    // A slot reports prompt progress while it reads the request and decode
    // progress once it starts answering, so the two phases are named apart:
    // a long prompt can hold the slot for a while with no tokens produced yet,
    // which otherwise looks like the model has stalled.
    describe(a) {
      if (a.promptProcessed > 0 && a.decoded === 0) {
        const cached = a.promptCached > 0 ? ` (${a.promptCached.toLocaleString()} en cache)` : '';
        return `leyendo prompt: ${a.promptProcessed.toLocaleString()} tokens${cached}`;
      }
      if (a.decoded > 0) {
        return `generando: ${a.decoded.toLocaleString()} tokens`;
      }
      return 'preparando';
    },
  },
};
</script>
