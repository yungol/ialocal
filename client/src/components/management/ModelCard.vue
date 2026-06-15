<template>
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
    <div class="flex items-center gap-3 min-w-0">
      <span class="material-icons text-neutral-500 text-lg">{{ model.type === 'image' ? 'image' : 'smart_toy' }}</span>
      <div class="min-w-0">
        <div class="text-neutral-200 text-[13px] font-medium truncate">{{ model.name }}</div>
        <div class="flex items-center gap-2 mt-1">
          <span
            class="px-1.5 py-0.5 rounded text-[11px] font-medium"
            :class="statusClass"
          >
            {{ statusLabel }}
          </span>
          <span class="text-neutral-600 text-[11px]">
            {{ model.type.toUpperCase() }}
          </span>
          <span v-if="model.size" class="text-neutral-600 text-[11px]">
            {{ formatSize(model.size) }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-shrink-0">
      <button
        v-if="model.status !== 'loaded' && model.status !== 'running'"
        class="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-neutral-200 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors"
        :disabled="loading"
        @click="$emit('load', model.id)"
      >
        Cargar
      </button>
      <button
        v-if="model.status === 'loaded' || model.status === 'running'"
        class="border border-neutral-700 hover:border-neutral-500 disabled:opacity-50 text-neutral-400 hover:text-neutral-200 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors"
        :disabled="loading"
        @click="$emit('unload', model.id)"
      >
        Descargar
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModelCard',
  props: {
    model: { type: Object, required: true },
    loading: { type: Boolean, default: false },
  },
  emits: ['load', 'unload'],
  computed: {
    statusClass() {
      switch (this.model.status) {
        case 'loaded':
        case 'running':
          return 'bg-emerald-900/40 text-emerald-400';
        case 'unloaded':
          return 'bg-neutral-800 text-neutral-400';
        default:
          return 'bg-amber-900/40 text-amber-400';
      }
    },
    statusLabel() {
      switch (this.model.status) {
        case 'loaded':
        case 'running':
          return 'Cargado';
        case 'unloaded':
          return 'Descargado';
        default:
          return this.model.status;
      }
    },
  },
  methods: {
    formatSize(bytes) {
      if (!bytes) return '';
      const gb = bytes / (1024 * 1024 * 1024);
      return gb >= 1 ? gb.toFixed(1) + ' GB' : (bytes / (1024 * 1024)).toFixed(0) + ' MB';
    },
  },
};
</script>
