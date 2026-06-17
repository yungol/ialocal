<template>
  <div ref="container" class="h-full">
    <!-- Empty state -->
    <div
      v-if="images.length === 0 && !generating"
      class="h-full min-h-[60vh] flex flex-col items-center justify-center text-center"
    >
      <div class="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
        <span class="material-icons text-[32px] text-neutral-700">image</span>
      </div>
      <p class="text-neutral-400 text-sm font-medium">Todavia no hay imagenes</p>
      <p class="text-neutral-600 text-xs mt-1">Escribi un prompt y genera tu primera imagen.</p>
    </div>

    <div v-else>
      <!-- Generating skeleton -->
      <div
        v-if="generating"
        class="mb-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center gap-3 animate-pulse py-12"
      >
        <span class="material-icons text-[28px] text-indigo-400/80 animate-spin">autorenew</span>
        <span class="text-[11px] text-neutral-500">Generando...</span>
      </div>

      <!-- Masonry columns -->
      <div class="flex gap-4 items-start">
        <div
          v-for="(col, ci) in columns"
          :key="ci"
          class="flex-1 flex flex-col gap-4 min-w-0"
        >
          <figure
            v-for="img in col"
            :key="img.id"
            class="rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative group cursor-zoom-in transition-all hover:border-neutral-700 hover:ring-1 hover:ring-indigo-500/30"
            @click="openLightbox(img)"
          >
            <img
              :src="img.url"
              :alt="img.prompt"
              class="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
            />

            <!-- Hover overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div class="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                class="bg-black/50 backdrop-blur hover:bg-black/70 text-neutral-200 rounded-lg p-1.5 transition-colors"
                title="Descargar"
                @click.stop="downloadImage(img)"
              >
                <span class="material-icons text-[16px]">download</span>
              </button>
              <button
                class="bg-black/50 backdrop-blur hover:bg-red-600 text-neutral-200 rounded-lg p-1.5 transition-colors"
                title="Eliminar"
                @click.stop="$emit('delete', img.id)"
              >
                <span class="material-icons text-[16px]">delete</span>
              </button>
            </div>

            <figcaption class="absolute bottom-0 inset-x-0 p-3 text-[11px] text-neutral-200 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {{ img.prompt }}
            </figcaption>
          </figure>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="flex justify-center mt-4">
        <button
          class="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg px-5 py-3 text-[13px] font-medium transition-colors disabled:opacity-50"
          :disabled="loadingMore"
          @click="$emit('load-more')"
        >
          <span v-if="loadingMore" class="material-icons text-[18px] animate-spin">autorenew</span>
          <span v-else class="material-icons text-[18px]">expand_more</span>
          {{ loadingMore ? 'Cargando...' : 'Cargar mas imagenes' }}
        </button>
      </div>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="lightbox"
        class="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        @click="closeLightbox"
      >
        <button
          class="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
          @click="closeLightbox"
        >
          <span class="material-icons text-[28px]">close</span>
        </button>

        <div class="flex flex-col lg:flex-row gap-4 max-w-6xl w-full max-h-full" @click.stop>
          <div class="flex-1 min-h-0 flex items-center justify-center">
            <img :src="lightbox.url" :alt="lightbox.prompt" class="max-w-full max-h-[80vh] rounded-xl object-contain" />
          </div>

          <div class="lg:w-72 flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto">
            <div>
              <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Prompt</span>
              <p class="text-neutral-200 text-[13px] mt-1 leading-relaxed">{{ lightbox.prompt }}</p>
            </div>
            <button
              class="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
              @click="createVideoFromLightbox"
            >
              <span class="material-icons text-[16px]">movie_filter</span>
              Crear video
            </button>
            <div class="flex gap-2 mt-auto pt-2">
              <button
                class="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-3 py-2 text-[13px] transition-colors"
                @click="downloadImage(lightbox)"
              >
                <span class="material-icons text-[16px]">download</span>
                Descargar
              </button>
              <button
                class="flex items-center justify-center bg-neutral-800 hover:bg-red-600 text-neutral-200 rounded-lg px-3 py-2 transition-colors"
                title="Eliminar"
                @click="deleteFromLightbox"
              >
                <span class="material-icons text-[16px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: 'ImageGallery',
  props: {
    images: { type: Array, default: () => [] },
    generating: { type: Boolean, default: false },
    hasMore: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
  },
  emits: ['delete', 'load-more', 'create-video'],
  data() {
    return {
      lightbox: null,
      columnCount: 3,
      imageRatios: {},
    };
  },
  computed: {
    columns() {
      const cols = Array.from({ length: this.columnCount }, () => []);
      const heights = Array(this.columnCount).fill(0);
      for (const img of this.images) {
        const ratio = this.imageRatios[img.id] || 1.0;
        let shortest = 0;
        for (let i = 1; i < this.columnCount; i++) {
          if (heights[i] < heights[shortest]) shortest = i;
        }
        cols[shortest].push(img);
        heights[shortest] += ratio;
      }
      return cols;
    },
  },
  watch: {
    lightbox(val) {
      document.body.style.overflow = val ? 'hidden' : '';
    },
    images: {
      immediate: true,
      handler(imgs) {
        const ids = new Set(imgs.map((i) => i.id));
        for (const id of Object.keys(this.imageRatios)) {
          if (!ids.has(id)) {
            const next = { ...this.imageRatios };
            delete next[id];
            this.imageRatios = next;
          }
        }
        for (const img of imgs) {
          if (this.imageRatios[img.id] != null) continue;
          const preload = new Image();
          preload.onload = () => {
            this.imageRatios = {
              ...this.imageRatios,
              [img.id]: preload.naturalHeight / preload.naturalWidth,
            };
          };
          preload.src = img.url;
        }
      },
    },
  },
  mounted() {
    window.addEventListener('keydown', this.onKeydown);
    this.ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w < 640) this.columnCount = 2;
      else if (w < 1024) this.columnCount = 3;
      else if (w < 1536) this.columnCount = 4;
      else this.columnCount = 5;
    });
    if (this.$refs.container) this.ro.observe(this.$refs.container);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown);
    document.body.style.overflow = '';
    this.ro?.disconnect();
  },
  methods: {
    openLightbox(img) {
      this.lightbox = img;
    },
    closeLightbox() {
      this.lightbox = null;
    },
    deleteFromLightbox() {
      const id = this.lightbox.id;
      this.closeLightbox();
      this.$emit('delete', id);
    },
    createVideoFromLightbox() {
      const img = this.lightbox;
      this.closeLightbox();
      this.$emit('create-video', img);
    },
    onKeydown(e) {
      if (e.key === 'Escape') this.closeLightbox();
    },
    downloadImage(img) {
      const a = document.createElement('a');
      a.href = img.url;
      a.download = `${img.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  },
};
</script>
