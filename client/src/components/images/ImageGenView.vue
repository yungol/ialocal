<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-neutral-300">Generador de Imagenes</h2>
      <ImageModelSelector v-model="model" />
    </div>

    <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-5 space-y-4">
      <label class="flex flex-col gap-1">
        <span class="text-neutral-500 text-[11px]">Prompt</span>
        <textarea
          v-model="prompt"
          class="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-[13px] resize-none focus:outline-none focus:border-neutral-500 placeholder-neutral-600"
          rows="3"
          placeholder="Describe la imagen que queres generar..."
        ></textarea>
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-neutral-500 text-[11px]">Negative Prompt</span>
        <input
          v-model="negativePrompt"
          class="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-neutral-500 placeholder-neutral-600"
          placeholder="Lo que NO queres ver..."
        />
      </label>

      <ImageParams
        :steps="steps"
        :guidance="guidance"
        :seed="seed"
        :width="width"
        :height="height"
        @update:steps="steps = $event"
        @update:guidance="guidance = $event"
        @update:seed="seed = $event"
        @update:width="width = $event"
        @update:height="height = $event"
      />

      <div class="flex items-center gap-3">
        <button
          class="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-neutral-200 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors"
          :disabled="generating || !prompt.trim() || !model"
          @click="generate"
        >
          {{ generating ? 'Generando...' : 'Generar Imagen' }}
        </button>
        <span v-if="statusMsg" class="text-xs" :class="statusError ? 'text-red-400' : 'text-amber-500/80'">
          {{ statusMsg }}
        </span>
      </div>
    </div>

    <ImageGallery :images="images" />
  </div>
</template>

<script>
import ImageModelSelector from './ImageModelSelector.vue';
import ImageParams from './ImageParams.vue';
import ImageGallery from './ImageGallery.vue';
import { generateImage } from '../../composables/useImageGen';

export default {
  name: 'ImageGenView',
  components: { ImageModelSelector, ImageParams, ImageGallery },
  data() {
    return {
      model: '',
      prompt: '',
      negativePrompt: '',
      steps: 20,
      guidance: 7.5,
      seed: -1,
      width: 1024,
      height: 1024,
      generating: false,
      statusMsg: '',
      statusError: false,
      images: [],
    };
  },
  methods: {
    async generate() {
      this.generating = true;
      this.statusMsg = 'cargando modelo...';
      this.statusError = false;

      try {
        const result = await generateImage({
          model: this.model,
          prompt: this.prompt,
          negativePrompt: this.negativePrompt,
          steps: this.steps,
          guidance: this.guidance,
          seed: this.seed,
          width: this.width,
          height: this.height,
        });

        const imageData = result.data || [];
        imageData.forEach((img) => {
          this.images.unshift({
            url: img.url || img.b64_json || '',
            prompt: this.prompt,
          });
        });

        this.statusMsg = '';
      } catch (err) {
        this.statusMsg = err.message || 'Error al generar imagen';
        this.statusError = true;
      } finally {
        this.generating = false;
      }
    },
  },
};
</script>
