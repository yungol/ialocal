<template>
  <div class="flex items-center gap-2 flex-shrink-0">
    <span class="material-icons text-[16px] text-neutral-500">memory</span>
    <select
      v-model="selected"
      class="bg-neutral-900 text-neutral-200 border border-neutral-700/70 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-neutral-500 hover:border-neutral-600 transition-colors cursor-pointer"
      @change="$emit('select', selected)"
    >
      <option value="" disabled>Seleccionar modelo...</option>
      <option v-for="m in models" :key="m.id" :value="m.id">
        {{ m.name }}
      </option>
    </select>
    <span class="material-icons text-base animate-spin text-neutral-500" v-if="loading">autorenew</span>
  </div>
</template>

<script>
import { getChatModels } from '../../composables/useChat';

export default {
  name: 'ModelSelector',
  props: {
    modelValue: { type: String, default: '' },
  },
  emits: ['select', 'update:modelValue', 'loaded'],
  data() {
    return {
      models: [],
      loading: false,
    };
  },
  computed: {
    selected: {
      get() {
        return this.modelValue;
      },
      set(val) {
        this.$emit('update:modelValue', val);
      },
    },
  },
  async mounted() {
    this.loading = true;
    try {
      this.models = await getChatModels();
    } catch {
      this.models = [];
    } finally {
      this.loading = false;
      // Let the parent decide the default (persisted preference vs. fallback)
      this.$emit('loaded', this.models);
    }
  },
};
</script>
