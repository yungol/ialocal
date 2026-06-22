<template>
  <div class="px-6 pb-5 pt-2 flex-shrink-0">
    <div class="max-w-3xl mx-auto">
      <!-- Quick action chips -->
      <div v-if="!disabled && showQuickActions" class="flex gap-2 mb-3">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700/70 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors text-[13px]"
          @click="setPrefill('Tradúceme el siguiente texto al español: ')"
        >
          <span class="material-icons text-[16px]">translate</span>
          Traducir
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700/70 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors text-[13px]"
          @click="setPrefill('Corrige ortografía y gramática. Solo devuelve el texto corregido, sin saludos ni comentarios. Del siguiente texto: ')"
        >
          <span class="material-icons text-[16px]">spellcheck</span>
          Corregir texto
        </button>
      </div>
      <div
        class="bg-neutral-900 border border-neutral-700/70 rounded-2xl px-3 py-2 transition-colors focus-within:border-neutral-500"
      >
        <!-- Attached image preview -->
        <div v-if="image" class="relative inline-block mb-2">
          <img :src="image" alt="adjunto" class="h-20 w-auto rounded-lg border border-neutral-700 object-cover" />
          <button
            class="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-800 ring-1 ring-neutral-600 text-neutral-300 hover:text-white hover:bg-red-600 transition-colors"
            title="Quitar imagen"
            @click="clearImage"
          >
            <span class="material-icons text-[14px]">close</span>
          </button>
        </div>

        <div class="flex items-end gap-2">
          <button
            class="flex items-center justify-center w-9 h-9 rounded-xl transition-colors flex-shrink-0"
            :class="webSearch
              ? 'text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/40'
              : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'"
            :disabled="disabled"
            :title="webSearch ? 'Búsqueda en internet activada' : 'Buscar en internet'"
            :aria-pressed="webSearch"
            @click="webSearch = !webSearch"
          >
            <span class="material-icons text-[20px]">travel_explore</span>
          </button>
          <button
            v-if="vision"
            class="flex items-center justify-center w-9 h-9 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors flex-shrink-0"
            :disabled="disabled"
            title="Adjuntar imagen"
            @click="$refs.file.click()"
          >
            <span class="material-icons text-[20px]">add_photo_alternate</span>
          </button>
          <input ref="file" type="file" accept="image/*" class="hidden" @change="onFile" />

          <textarea
            ref="input"
            v-model="text"
            class="flex-1 bg-transparent text-neutral-100 text-[15px] leading-7 resize-none focus:outline-none placeholder-neutral-500 py-1.5 px-1.5 max-h-40"
            rows="1"
            :placeholder="vision ? 'Escribi un mensaje o adjunta una imagen...' : 'Escribi un mensaje...'"
            :disabled="disabled"
            @input="autoGrow"
            @keydown.enter.exact.prevent="send"
          ></textarea>
          <button
            class="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-100 text-neutral-900 hover:bg-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            :disabled="disabled || (!text.trim() && !image)"
            @click="send"
            aria-label="Enviar"
          >
            <span class="material-icons text-[20px]">arrow_upward</span>
          </button>
        </div>
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
    showQuickActions: { type: Boolean, default: false },
    vision: { type: Boolean, default: false },
  },
  emits: ['send'],
  data() {
    return {
      text: '',
      image: '',
      webSearch: false,
    };
  },
  watch: {
    // If the user switches to a non-vision model, drop any pending image.
    vision(val) {
      if (!val) this.clearImage();
    },
  },
  methods: {
    onFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.image = reader.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    clearImage() {
      this.image = '';
    },
    autoGrow() {
      const el = this.$refs.input;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    },
    setPrefill(value) {
      this.text = value;
      this.$nextTick(() => {
        this.autoGrow();
        const el = this.$refs.input;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    },
    send() {
      const content = this.text.trim();
      if ((!content && !this.image) || this.disabled) return;
      this.$emit('send', { content, image: this.image || null, webSearch: this.webSearch });
      this.text = '';
      this.image = '';
      this.$nextTick(() => {
        const el = this.$refs.input;
        if (el) el.style.height = 'auto';
      });
    },
  },
};
</script>
