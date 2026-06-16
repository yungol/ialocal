<template>
  <div class="px-6 pb-5 pt-2 flex-shrink-0">
    <div class="max-w-3xl mx-auto">
      <div
        class="flex items-end gap-2 bg-neutral-900 border border-neutral-700/70 rounded-2xl px-3 py-2 transition-colors focus-within:border-neutral-500"
      >
        <textarea
          ref="input"
          v-model="text"
          class="flex-1 bg-transparent text-neutral-100 text-[15px] leading-7 resize-none focus:outline-none placeholder-neutral-500 py-1.5 px-1.5 max-h-40"
          rows="1"
          placeholder="Escribi un mensaje..."
          :disabled="disabled"
          @input="autoGrow"
          @keydown.enter.exact.prevent="send"
        ></textarea>
        <button
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-100 text-neutral-900 hover:bg-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          :disabled="disabled || !text.trim()"
          @click="send"
          aria-label="Enviar"
        >
          <span class="material-icons text-[20px]">arrow_upward</span>
        </button>
      </div>
      <p class="text-center text-[11px] text-neutral-600 mt-2">
        Enter para enviar &middot; Shift + Enter para nueva linea
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatInput',
  props: {
    disabled: { type: Boolean, default: false },
  },
  emits: ['send'],
  data() {
    return {
      text: '',
    };
  },
  methods: {
    autoGrow() {
      const el = this.$refs.input;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    },
    send() {
      const content = this.text.trim();
      if (!content || this.disabled) return;
      this.$emit('send', content);
      this.text = '';
      this.$nextTick(() => {
        const el = this.$refs.input;
        if (el) el.style.height = 'auto';
      });
    },
  },
};
</script>
