<template>
  <div ref="list" class="flex-1 overflow-y-auto px-4 py-4 space-y-5" @click="onListClick">
    <div v-if="messages.length === 0" class="text-neutral-500 text-center mt-32 text-sm">
      Envia un mensaje para empezar.
    </div>

    <div
      v-for="(msg, i) in messages"
      :key="i"
      class="flex w-full"
      :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
    >
      <div class="max-w-[75%] space-y-2">
        <!-- Reasoning section (collapsible) -->
        <div
          v-if="msg.reasoning"
          class="border border-neutral-800 rounded-lg overflow-hidden"
        >
          <button
            class="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-neutral-500 hover:text-neutral-400 transition-colors bg-neutral-900"
            @click="toggleReasoning(i)"
          >
            <span class="material-icons text-sm transition-transform" :class="expanded[i] ? 'rotate-90' : ''">chevron_right</span>
            <span>{{ expanded[i] ? 'Ocultar pensamiento' : 'Ver pensamiento' }}</span>
            <span v-if="!expanded[i] && i === messages.length - 1 && streaming" class="text-amber-500/70 animate-pulse ml-auto text-[10px]">pensando...</span>
          </button>
          <div
            v-if="expanded[i]"
            class="px-3 pb-2.5 pt-2 text-[12px] text-neutral-400 leading-relaxed whitespace-pre-wrap border-t border-neutral-800 max-h-48 overflow-y-auto bg-neutral-900/30"
          >
            {{ msg.reasoning }}
          </div>
        </div>

        <!-- Content bubble -->
        <div
          v-if="msg.content"
          class="rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
          :class="[msg.role === 'user'
            ? 'bg-neutral-800 text-neutral-100'
            : 'text-neutral-200',
            msg.role === 'assistant' ? 'markdown-content' : '']"
          v-html="msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content"
        ></div>

        <!-- Empty streaming -->
        <span
          v-if="i === messages.length - 1 && msg.role === 'assistant' && streaming && !msg.content && !msg.reasoning"
          class="text-neutral-500 text-sm animate-pulse"
        >
          Conectando...
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { renderMarkdown } from '../../composables/useMarkdown';

export default {
  name: 'MessageList',
  props: {
    messages: { type: Array, default: () => [] },
    streaming: { type: Boolean, default: false },
  },
  data() {
    return {
      expanded: {},
    };
  },
  watch: {
    messages: {
      deep: true,
      handler() {
        this.$nextTick(() => {
          const el = this.$refs.list;
          if (el) el.scrollTop = el.scrollHeight;
        });
        const lastIdx = this.messages.length - 1;
        if (this.streaming && this.messages[lastIdx]?.reasoning) {
          this.expanded[lastIdx] = true;
        }
      },
    },
  },
  methods: {
    renderMarkdown,
    toggleReasoning(i) {
      this.expanded[i] = !this.expanded[i];
    },
    async onListClick(event) {
      const btn = event.target.closest('.code-copy-btn');
      if (!btn) return;
      const block = btn.closest('.code-block');
      const codeEl = block?.querySelector('pre code');
      if (!codeEl) return;
      const text = codeEl.innerText;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        this.flashCopied(btn);
      } catch {
        // ignore copy failures silently
      }
    },
    flashCopied(btn) {
      const label = btn.querySelector('.code-copy-label');
      const icon = btn.querySelector('.code-copy-icon');
      const prevLabel = label?.textContent;
      const prevIcon = icon?.textContent;
      btn.classList.add('is-copied');
      if (label) label.textContent = 'Copiado';
      if (icon) icon.textContent = 'check';
      clearTimeout(btn._copyTimer);
      btn._copyTimer = setTimeout(() => {
        btn.classList.remove('is-copied');
        if (label && prevLabel != null) label.textContent = prevLabel;
        if (icon && prevIcon != null) icon.textContent = prevIcon;
      }, 1500);
    },
  },
};
</script>
