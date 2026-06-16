<template>
  <div class="relative">
    <select
      v-model="selected"
      class="w-full bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-[13px] appearance-none focus:outline-none focus:border-indigo-500/70 transition-colors"
      @change="$emit('select', selected)"
    >
      <option value="" disabled>Seleccionar...</option>
      <option v-for="m in models" :key="m.id" :value="m.id">
        {{ m.name }}
      </option>
    </select>
    <span
      class="material-icons text-[18px] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
      :class="loading ? 'animate-spin text-indigo-400' : 'text-neutral-500'"
    >
      {{ loading ? 'autorenew' : 'expand_more' }}
    </span>
  </div>
</template>

<script>
import { getImageModels } from '../../composables/useImageGen';

export default {
  name: 'ImageModelSelector',
  props: {
    modelValue: { type: String, default: '' },
  },
  emits: ['select', 'update:modelValue'],
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
      this.models = await getImageModels();
      if (this.models.length > 0 && !this.modelValue) {
        this.selected = this.models[0].id;
        this.$emit('select', this.models[0].id);
      }
    } catch {
      this.models = [];
    } finally {
      this.loading = false;
    }
  },
};
</script>
