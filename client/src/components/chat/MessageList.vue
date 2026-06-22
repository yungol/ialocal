<template>
  <div ref="list" class="flex-1 overflow-y-auto" @click="onListClick">
    <div class="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <!-- Empty state -->
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center text-center mt-28 select-none">
        <div class="w-14 h-14 rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 flex items-center justify-center mb-4">
          <span class="material-icons text-[28px] text-neutral-500">forum</span>
        </div>
        <p class="text-base font-medium text-neutral-300">Empezá una conversacion</p>
        <p class="text-sm text-neutral-600 mt-1">Escribi un mensaje abajo para arrancar.</p>
      </div>

      <!-- USER message -->
      <div v-for="(msg, i) in messages" :key="i">
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[85%] flex flex-col items-end gap-2">
            <img
              v-if="msg.image"
              :src="msg.image"
              alt="imagen adjunta"
              class="max-h-60 w-auto rounded-2xl rounded-br-md border border-neutral-700 object-cover"
            />
            <div
              v-if="msg.content"
              class="rounded-2xl rounded-br-md bg-neutral-800 px-4 py-2.5 text-[15px] leading-7 text-neutral-100 whitespace-pre-wrap"
            >
              {{ msg.content }}
            </div>
          </div>
        </div>

        <!-- ASSISTANT message -->
        <div v-else class="flex gap-3.5">
          <div class="w-7 h-7 rounded-lg bg-neutral-800 ring-1 ring-neutral-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span class="material-icons text-[16px] text-neutral-300">auto_awesome</span>
          </div>
          <div class="min-w-0 flex-1 space-y-2.5">
            <!-- Reasoning section (collapsible) -->
            <div
              v-if="msg.reasoning"
              class="border border-neutral-800 rounded-xl overflow-hidden"
            >
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors bg-neutral-900/60"
                @click="toggleReasoning(i)"
              >
                <span class="material-icons text-base transition-transform" :class="expanded[i] ? 'rotate-90' : ''">chevron_right</span>
                <span>{{ expanded[i] ? 'Ocultar razonamiento' : 'Ver razonamiento' }}</span>
                <span v-if="!expanded[i] && i === messages.length - 1 && streaming" class="text-amber-500/70 animate-pulse ml-auto text-[10px]">pensando...</span>
              </button>
              <div
                v-if="expanded[i]"
                class="px-3.5 pb-3 pt-2.5 text-[13px] text-neutral-400 leading-relaxed whitespace-pre-wrap border-t border-neutral-800 max-h-56 overflow-y-auto bg-neutral-900/30"
              >
                {{ msg.reasoning }}
              </div>
            </div>

            <!-- Content (markdown) -->
            <div
              v-if="msg.content"
              class="markdown-content text-neutral-200"
              v-html="renderMarkdown(msg.content)"
            ></div>

            <!-- Web search sources (collapsible) -->
            <div
              v-if="msg.sources && msg.sources.length"
              class="border border-neutral-800 rounded-xl overflow-hidden"
            >
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors bg-neutral-900/60"
                @click="toggleSources(i)"
              >
                <span class="material-icons text-base transition-transform" :class="sourcesExpanded[i] ? 'rotate-90' : ''">chevron_right</span>
                <span class="material-icons text-[15px]">travel_explore</span>
                <span>{{ msg.sources.length }} {{ msg.sources.length === 1 ? 'fuente' : 'fuentes' }}</span>
              </button>
              <div
                v-if="sourcesExpanded[i]"
                class="px-3.5 pb-3 pt-2.5 border-t border-neutral-800 bg-neutral-900/30 space-y-2"
              >
                <component
                  :is="src.url ? 'a' : 'div'"
                  v-for="(src, si) in msg.sources"
                  :key="si"
                  v-bind="src.url ? { href: src.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
                  class="flex items-start gap-2 text-[13px]"
                  :class="src.url ? 'text-blue-400 hover:text-blue-300 group' : 'text-neutral-400'"
                >
                  <span class="material-icons text-[14px] mt-0.5 flex-shrink-0">{{ src.url ? 'open_in_new' : 'description' }}</span>
                  <span class="min-w-0">
                    <span class="block truncate group-hover:underline">{{ src.title || src.url }}</span>
                    <span v-if="src.url" class="block truncate text-[11px] text-neutral-500">{{ src.url }}</span>
                  </span>
                </component>
              </div>
            </div>

            <!-- Empty streaming -->
            <div
              v-if="i === messages.length - 1 && streaming && !msg.content && !msg.reasoning"
              class="flex items-center gap-1.5 text-neutral-500 text-sm"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" style="animation-delay: 0.2s"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" style="animation-delay: 0.4s"></span>
            </div>
          </div>
        </div>
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
      sourcesExpanded: {},
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
    toggleSources(i) {
      this.sourcesExpanded[i] = !this.sourcesExpanded[i];
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
