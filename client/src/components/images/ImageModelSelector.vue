<template>
  <div class="flex items-center gap-2">
    <span class="text-neutral-500 text-xs">Modelo</span>
    <select
      v-model="selected"
      class="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-neutral-500"
      @change="$emit('select', selected)"
    >
      <option value="" disabled>Seleccionar...</option>
      <option v-for="m in models" :key="m.id" :value="m.id">
        {{ m.name }}
      </option>
    </select>
    <span class="material-icons text-base animate-spin text-neutral-500" v-if="loading">autorenew</span>
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
