<template>
  <div class="border-t border-neutral-800 p-3">
    <div class="flex gap-2 items-end">
      <textarea
        v-model="text"
        class="flex-1 bg-neutral-900 text-neutral-100 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-[13px] resize-none focus:outline-none focus:border-neutral-500 placeholder-neutral-600"
        rows="2"
        placeholder="Escribi un mensaje..."
        :disabled="disabled"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button
        class="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors"
        :disabled="disabled || !text.trim()"
        @click="send"
      >
        <span class="material-icons text-lg">send</span>
      </button>
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
    send() {
      const content = this.text.trim();
      if (!content || this.disabled) return;
      this.$emit('send', content);
      this.text = '';
    },
  },
};
</script>
