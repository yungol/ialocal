<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      @click="close"
    >
      <div
        class="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Header -->
        <div class="px-5 py-3.5 border-b border-neutral-800/70 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-icons text-[18px] text-indigo-400">movie</span>
            <h2 class="text-sm font-medium text-neutral-200">Generar Video (Wan 2.2)</h2>
          </div>
          <button class="text-neutral-500 hover:text-white transition-colors" @click="close">
            <span class="material-icons text-[22px]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          <!-- Source image -->
          <div class="lg:w-[44%] flex-shrink-0 p-5 border-b lg:border-b-0 lg:border-r border-neutral-800/70">
            <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Imagen de origen</span>

            <div v-if="resultVideo" class="mt-2 rounded-xl overflow-hidden bg-black border border-neutral-800">
              <video :src="resultVideo.url" controls autoplay loop class="w-full h-auto block"></video>
            </div>

            <div
              v-else-if="imageUrl"
              class="mt-2 relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 group"
            >
              <img :src="imageUrl" alt="origen" class="w-full h-auto block" @load="onImageLoad" />
              <button
                v-if="!sourceImage"
                class="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-neutral-200 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Quitar"
                @click="clearUpload"
              >
                <span class="material-icons text-[16px]">close</span>
              </button>
            </div>

            <label
              v-else
              class="mt-2 flex flex-col items-center justify-center gap-2 h-56 rounded-xl border-2 border-dashed border-neutral-800 hover:border-indigo-500/60 cursor-pointer transition-colors text-center px-4"
            >
              <span class="material-icons text-[32px] text-neutral-700">upload_file</span>
              <span class="text-[13px] text-neutral-400">Subi una imagen</span>
              <span class="text-[11px] text-neutral-600">PNG o JPG</span>
              <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
            </label>
          </div>

          <!-- Controls -->
          <div class="flex-1 p-5 flex flex-col gap-4 min-w-0">
            <label class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Prompt (movimiento)</span>
                <span v-if="suggesting" class="flex items-center gap-1 text-[11px] text-indigo-400">
                  <span class="material-icons text-[13px] animate-spin">autorenew</span>
                  Mirando la imagen...
                </span>
              </div>

              <!-- Vision-driven prompt suggestions -->
              <div v-if="imageUrl && !resultVideo" class="flex gap-2">
                <button
                  class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:border-indigo-500/60 text-neutral-300 px-2.5 py-2 text-[12px] transition-colors disabled:opacity-50"
                  :disabled="suggesting || generating"
                  title="Genera un prompt de saludo a la camara con gemma4-vision"
                  @click="suggestPrompt('greeting')"
                >
                  <span class="material-icons text-[16px]">waving_hand</span>
                  Generar saludo
                </button>
                <button
                  class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:border-indigo-500/60 text-neutral-300 px-2.5 py-2 text-[12px] transition-colors disabled:opacity-50"
                  :disabled="suggesting || generating"
                  title="Genera un prompt de movimiento con gemma4-vision"
                  @click="suggestPrompt('motion')"
                >
                  <span class="material-icons text-[16px]">animation</span>
                  Generar movimiento
                </button>
              </div>

              <textarea
                v-model="prompt"
                class="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-[13px] resize-none focus:outline-none focus:border-indigo-500/70 placeholder-neutral-600 transition-colors"
                rows="4"
                placeholder="Describe el movimiento, o usa los botones de arriba para que gemma4-vision lo sugiera..."
                :disabled="generating"
              ></textarea>
              <button
                v-if="imageUrl && !resultVideo"
                class="self-start flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:border-indigo-500/60 text-neutral-300 px-2.5 py-1.5 text-[12px] transition-colors disabled:opacity-50"
                :disabled="suggesting || generating || !prompt.trim()"
                title="Convierte tu texto en un prompt de video en ingles basado en la imagen"
                @click="enhanceMyPrompt"
              >
                <span class="material-icons text-[15px]" :class="suggesting ? 'animate-spin' : ''">
                  {{ suggesting ? 'autorenew' : 'auto_fix_high' }}
                </span>
                Mejorar prompt
              </button>
            </label>

            <div class="flex flex-col gap-1.5">
              <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Formato</span>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in aspectOptions"
                  :key="opt.value"
                  class="flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[12px] transition-colors"
                  :class="aspect === opt.value
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'"
                  :disabled="generating"
                  @click="aspect = opt.value"
                >
                  <span class="material-icons text-[18px]">{{ opt.icon }}</span>
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <button
              class="mt-auto w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors"
              :disabled="!canGenerate"
              @click="generate"
            >
              <span v-if="generating" class="material-icons text-[18px] animate-spin">autorenew</span>
              <span v-else class="material-icons text-[18px]">movie_filter</span>
              {{ generating ? statusLabel : (resultVideo ? 'Generar otro' : 'Generar Video') }}
            </button>

            <p v-if="error" class="text-xs text-center text-red-400">{{ error }}</p>
            <p v-else-if="generating" class="text-[11px] text-center text-amber-500/80">
              Esto puede tardar varios minutos. No cierres la ventana.
            </p>
            <p v-else-if="resultVideo" class="text-[11px] text-center text-neutral-500">
              Video guardado. <a :href="resultVideo.url" :download="`${resultVideo.id}.mp4`" class="text-indigo-400 hover:underline">Descargar</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { createVideo, pollVideoJob, generateVideoPrompt } from '../../composables/useVideoGen';

const STATUS_LABELS = {
  queued: 'En cola...',
  preparing: 'Liberando VRAM...',
  rendering: 'Renderizando...',
};

export default {
  name: 'VideoGenModal',
  props: {
    open: { type: Boolean, default: false },
    // When opened from the gallery: { id, url, prompt }. Null for upload mode.
    sourceImage: { type: Object, default: null },
  },
  emits: ['close', 'created'],
  data() {
    return {
      prompt: '',
      aspect: 'square',
      uploadedDataUrl: '',
      generating: false,
      suggesting: false,
      status: '',
      error: '',
      resultVideo: null,
      aspectOptions: [
        { value: 'horizontal', label: 'Horizontal', icon: 'crop_landscape' },
        { value: 'square', label: 'Cuadrado', icon: 'crop_square' },
        { value: 'vertical', label: 'Vertical', icon: 'crop_portrait' },
      ],
    };
  },
  computed: {
    imageUrl() {
      return this.sourceImage ? this.sourceImage.url : this.uploadedDataUrl;
    },
    canGenerate() {
      return !this.generating && !!this.prompt.trim() && !!this.imageUrl;
    },
    statusLabel() {
      return STATUS_LABELS[this.status] || 'Generando...';
    },
  },
  watch: {
    open(val) {
      document.body.style.overflow = val ? 'hidden' : '';
      if (val) this.reset();
    },
  },
  methods: {
    reset() {
      this.prompt = '';
      this.aspect = 'square';
      this.uploadedDataUrl = '';
      this.generating = false;
      this.suggesting = false;
      this.status = '';
      this.error = '';
      this.resultVideo = null;
    },
    // Ask gemma4-vision for an English prompt based on the loaded image.
    async suggestPrompt(kind) {
      if (this.suggesting || this.generating || !this.imageUrl) return;
      this.suggesting = true;
      this.error = '';
      try {
        const source = this.sourceImage
          ? { imageId: this.sourceImage.id }
          : { image: this.uploadedDataUrl };
        const prompt = await generateVideoPrompt({ kind, ...source });
        this.prompt = prompt;
      } catch (err) {
        this.error = err.message || 'No se pudo generar el prompt';
      } finally {
        this.suggesting = false;
      }
    },
    // Take the user's own text and turn it into a polished English video prompt
    // that executes exactly that action, grounded in the image.
    async enhanceMyPrompt() {
      if (this.suggesting || this.generating || !this.imageUrl || !this.prompt.trim()) return;
      this.suggesting = true;
      this.error = '';
      try {
        const source = this.sourceImage
          ? { imageId: this.sourceImage.id }
          : { image: this.uploadedDataUrl };
        this.prompt = await generateVideoPrompt({
          kind: 'custom',
          text: this.prompt,
          ...source,
        });
      } catch (err) {
        this.error = err.message || 'No se pudo mejorar el prompt';
      } finally {
        this.suggesting = false;
      }
    },
    close() {
      if (this.generating) return; // don't lose an in-flight job by accident
      this.$emit('close');
    },
    onFileChange(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.uploadedDataUrl = reader.result;
      };
      reader.readAsDataURL(file);
    },
    clearUpload() {
      this.uploadedDataUrl = '';
    },
    onImageLoad(e) {
      // Auto-pick aspect from the source image once, before generating.
      if (this.generating || this.resultVideo) return;
      const { naturalWidth: w, naturalHeight: h } = e.target;
      if (!w || !h) return;
      const ratio = w / h;
      if (ratio > 1.15) this.aspect = 'horizontal';
      else if (ratio < 0.87) this.aspect = 'vertical';
      else this.aspect = 'square';
    },
    async generate() {
      if (!this.canGenerate) return;
      this.generating = true;
      this.error = '';
      this.resultVideo = null;
      this.status = 'queued';

      try {
        const source = this.sourceImage
          ? { imageId: this.sourceImage.id }
          : { image: this.uploadedDataUrl };

        const jobId = await createVideo({
          prompt: this.prompt.trim(),
          aspect: this.aspect,
          ...source,
        });

        const video = await pollVideoJob(jobId, {
          onStatus: (s) => {
            this.status = s;
          },
        });

        this.resultVideo = { id: video.id, url: `/videos/${video.file}` };
        this.$emit('created', this.resultVideo);
      } catch (err) {
        this.error = err.message || 'Error al generar el video';
      } finally {
        this.generating = false;
      }
    },
  },
};
</script>
