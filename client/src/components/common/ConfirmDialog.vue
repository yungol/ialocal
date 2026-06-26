<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      @click="$emit('cancel')"
    >
      <div
        class="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Header -->
        <div class="px-5 py-3.5 border-b border-neutral-800/70 flex items-center gap-2">
          <span class="material-icons text-[18px]" :class="danger ? 'text-red-400' : 'text-indigo-400'">
            {{ danger ? 'warning' : 'help_outline' }}
          </span>
          <h2 class="text-sm font-medium text-neutral-200">{{ title }}</h2>
        </div>

        <!-- Body -->
        <div class="px-5 py-4">
          <p class="text-[13px] text-neutral-400 leading-relaxed">{{ message }}</p>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3.5 border-t border-neutral-800/70 flex items-center justify-end gap-2">
          <button
            class="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg px-3.5 py-1.5 text-[12px] transition-colors"
            @click="$emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-colors text-white"
            :class="danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: 'Confirmar' },
    message: { type: String, default: '' },
    confirmLabel: { type: String, default: 'Confirmar' },
    cancelLabel: { type: String, default: 'Cancelar' },
    danger: { type: Boolean, default: false },
  },
  emits: ['confirm', 'cancel'],
};
</script>
