<template>
  <div>
    <div v-if="images.length === 0" class="text-neutral-500 text-center py-12 text-sm">
      No hay imagenes generadas todavia.
    </div>
    <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div
        v-for="(img, i) in images"
        :key="i"
        class="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden group relative"
      >
        <img :src="img.url" :alt="'Generada ' + (i + 1)" class="w-full h-auto" />
        <div
          class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center"
        >
          <button
            class="opacity-0 group-hover:opacity-100 bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg text-[11px] transition-opacity"
            @click="downloadImage(img.url, i)"
          >
            Descargar
          </button>
        </div>
        <div class="p-2 text-[11px] text-neutral-500 truncate">
          {{ img.prompt }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageGallery',
  props: {
    images: { type: Array, default: () => [] },
  },
  methods: {
    downloadImage(url, index) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `generada-${index + 1}.png`;
      a.click();
    },
  },
};
</script>
