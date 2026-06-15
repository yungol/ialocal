<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-neutral-300">Gestion de Modelos</h2>
      <button
        class="border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 text-neutral-400 hover:text-neutral-200 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors"
        :disabled="actionLoading"
        @click="onUnloadAll"
      >
        Liberar todo
      </button>
    </div>

    <VramBar
      v-if="vram"
      :used="vram.used"
      :total="vram.total"
      :free="vram.free"
      class="mb-5"
    />
    <div v-else class="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-5 text-neutral-500 text-xs">
      VRAM no disponible
    </div>

    <div class="space-y-2.5">
      <ModelCard
        v-for="m in models"
        :key="m.id"
        :model="m"
        :loading="actionLoading"
        @load="onLoad"
        @unload="onUnload"
      />
    </div>

    <div v-if="models.length === 0" class="text-neutral-500 text-center py-12 text-sm">
      No se encontraron modelos configurados.
    </div>
  </div>
</template>

<script>
import ModelCard from './ModelCard.vue';
import VramBar from './VramBar.vue';
import { store } from '../../composables/useModels';

export default {
  name: 'ManagementView',
  components: { ModelCard, VramBar },
  data() {
    return {
      models: [],
      vram: null,
      actionLoading: false,
      unsubscribe: null,
    };
  },
  mounted() {
    this.unsubscribe = store.subscribe((state) => {
      this.models = state.models;
      if (state.stats && state.stats.vram) {
        const v = state.stats.vram;
        this.vram = {
          used: v.used / 1024,
          total: v.total / 1024,
          free: v.free / 1024,
        };
      }
    });
    store.startPolling();
  },
  beforeUnmount() {
    store.stopPolling();
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    async onLoad(id) {
      this.actionLoading = true;
      try {
        await store.load(id);
      } finally {
        this.actionLoading = false;
      }
    },
    async onUnload(id) {
      this.actionLoading = true;
      try {
        await store.unload(id);
      } finally {
        this.actionLoading = false;
      }
    },
    async onUnloadAll() {
      this.actionLoading = true;
      try {
        await store.unloadAll();
      } finally {
        this.actionLoading = false;
      }
    },
  },
};
</script>
