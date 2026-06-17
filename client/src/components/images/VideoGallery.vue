<template>
  <div ref="container" class="h-full">
    <!-- Empty state -->
    <div
      v-if="videos.length === 0"
      class="h-full min-h-[60vh] flex flex-col items-center justify-center text-center"
    >
      <div class="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
        <span class="material-icons text-[32px] text-neutral-700">movie</span>
      </div>
      <p class="text-neutral-400 text-sm font-medium">Todavia no hay videos</p>
      <p class="text-neutral-600 text-xs mt-1">Genera uno desde una imagen con "Crear video".</p>
    </div>

    <div v-else>
      <!-- Masonry columns: balances by aspect so no vertical space is wasted -->
      <div class="flex gap-4 items-start">
        <div
          v-for="(col, ci) in columns"
          :key="ci"
          class="flex-1 flex flex-col gap-4 min-w-0"
        >
          <figure
            v-for="video in col"
            :key="video.id"
            class="rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative group"
          >
            <video
              :src="video.url"
              class="w-full h-auto block bg-black"
              controls
              loop
              preload="metadata"
            ></video>

            <div class="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                :href="video.url"
                :download="`${video.id}.mp4`"
                class="bg-black/50 backdrop-blur hover:bg-black/70 text-neutral-200 rounded-lg p-1.5 transition-colors"
                title="Descargar"
              >
                <span class="material-icons text-[16px]">download</span>
              </a>
              <button
                class="bg-black/50 backdrop-blur hover:bg-red-600 text-neutral-200 rounded-lg p-1.5 transition-colors"
                title="Eliminar"
                @click="$emit('delete', video.id)"
              >
                <span class="material-icons text-[16px]">delete</span>
              </button>
            </div>

            <figcaption v-if="video.prompt" class="px-3 py-2 text-[11px] text-neutral-400">
              <p
                class="leading-relaxed whitespace-pre-wrap"
                :class="expanded[video.id] ? '' : 'line-clamp-2'"
              >
                {{ video.prompt }}
              </p>
              <button
                v-if="video.prompt.length > 80"
                class="mt-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                @click="toggle(video.id)"
              >
                {{ expanded[video.id] ? 'Ver menos' : 'Ver mas' }}
              </button>
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
          {{ loadingMore ? 'Cargando...' : 'Cargar mas videos' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// Approximate height/width ratio per known aspect, used to balance the masonry
// columns. Caption adds a little fixed height, but this is close enough.
const ASPECT_RATIO = {
  square: 1.0,
  horizontal: 0.5,
  vertical: 2.0,
};

export default {
  name: 'VideoGallery',
  props: {
    videos: { type: Array, default: () => [] },
    hasMore: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
  },
  emits: ['delete', 'load-more'],
  data() {
    return {
      columnCount: 3,
      expanded: {},
    };
  },
  computed: {
    columns() {
      const cols = Array.from({ length: this.columnCount }, () => []);
      const heights = Array(this.columnCount).fill(0);
      for (const video of this.videos) {
        const ratio = ASPECT_RATIO[video.aspect] ?? 0.56;
        let shortest = 0;
        for (let i = 1; i < this.columnCount; i++) {
          if (heights[i] < heights[shortest]) shortest = i;
        }
        cols[shortest].push(video);
        heights[shortest] += ratio + 0.2; // +0.2 ≈ caption/controls overhead
      }
      return cols;
    },
  },
  mounted() {
    this.ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w < 700) this.columnCount = 1;
      else if (w < 1100) this.columnCount = 2;
      else if (w < 1600) this.columnCount = 3;
      else this.columnCount = 4;
    });
    if (this.$refs.container) this.ro.observe(this.$refs.container);
  },
  beforeUnmount() {
    this.ro?.disconnect();
  },
  methods: {
    toggle(id) {
      this.expanded = { ...this.expanded, [id]: !this.expanded[id] };
    },
  },
};
</script>
