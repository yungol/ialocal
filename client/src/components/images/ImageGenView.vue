<template>
  <div class="flex h-full">
    <!-- Control panel -->
    <aside
      class="w-[340px] flex-shrink-0 bg-neutral-950 border-r border-neutral-800/70 flex flex-col"
    >
      <div class="px-4 py-3.5 border-b border-neutral-800/70 flex items-center gap-2">
        <span class="material-icons text-[18px] text-indigo-400">auto_awesome</span>
        <h2 class="text-sm font-medium text-neutral-200">Generador de Imagenes</h2>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Modelo</span>
          <ImageModelSelector v-model="model" />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Prompt</span>
          <textarea
            v-model="prompt"
            class="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-[13px] resize-none focus:outline-none focus:border-indigo-500/70 placeholder-neutral-600 transition-colors"
            rows="4"
            placeholder="Describe la imagen que queres generar..."
            @keydown.ctrl.enter="generate"
            @keydown.meta.enter="generate"
          ></textarea>
          <button
            class="self-start flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:border-indigo-500/60 text-neutral-300 px-2.5 py-1.5 text-[12px] transition-colors disabled:opacity-50"
            :disabled="enhancing || generating || !prompt.trim()"
            title="Mejora y traduce tu prompt al ingles con gemma4"
            @click="enhancePrompt"
          >
            <span class="material-icons text-[15px]" :class="enhancing ? 'animate-spin' : ''">
              {{ enhancing ? 'autorenew' : 'auto_fix_high' }}
            </span>
            {{ enhancing ? 'Mejorando...' : 'Mejorar prompt' }}
          </button>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Negative Prompt</span>
          <input
            v-model="negativePrompt"
            class="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-indigo-500/70 placeholder-neutral-600 transition-colors"
            placeholder="Lo que NO queres ver..."
          />
        </label>

        <ImageInputPanel
          v-if="selectedEditCaps"
          :capabilities="selectedEditCaps"
          v-model:mode="editMode"
          v-model:init-image="initImage"
          v-model:ref-images="refImages"
          v-model:mask-image="maskImage"
          v-model:strength="strength"
          @edit-mask="maskEditorOpen = true"
        />

        <template v-if="isComfyModel">
          <div class="flex flex-col gap-1.5">
            <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Formato</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in aspectOptions"
                :key="opt.value"
                class="flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[12px] transition-colors"
                :class="
                  aspect === opt.value
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                "
                :disabled="generating"
                @click="aspect = opt.value"
              >
                <span class="material-icons text-[18px]">{{ opt.icon }}</span>
                {{ opt.label }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
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
        </template>
      </div>

      <div class="px-4 py-3.5 border-t border-neutral-800/70 space-y-2">
        <button
          class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors"
          :disabled="!canGenerate"
          @click="generate"
        >
          <span v-if="generating" class="material-icons text-[18px] animate-spin">autorenew</span>
          <span v-else class="material-icons text-[18px]">auto_awesome</span>
          {{ generating ? 'Generando...' : 'Generar Imagen' }}
        </button>
        <div v-if="statusMsg" class="flex items-center justify-center gap-2">
          <p
            class="text-xs text-center"
            :class="statusError ? 'text-red-400' : 'text-amber-500/80'"
          >
            {{ statusMsg }}
          </p>
          <button
            v-if="activeEditJob"
            type="button"
            class="text-[11px] text-neutral-500 hover:text-red-400 underline transition-colors"
            @click="cancelEdit"
          >
            Cancelar
          </button>
        </div>
        <p v-else class="text-[11px] text-center text-neutral-600">Ctrl/Cmd + Enter para generar</p>
      </div>
    </aside>

    <!-- Gallery -->
    <section class="flex-1 min-w-0 flex flex-col">
      <div class="px-5 py-3.5 border-b border-neutral-800/70 flex items-center justify-between">
        <div
          class="flex items-center gap-0.5 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5"
        >
          <button
            class="px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
            :class="
              galleryMode === 'images'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            "
            @click="galleryMode = 'images'"
          >
            Imagenes
          </button>
          <button
            class="px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
            :class="
              galleryMode === 'videos'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            "
            @click="switchToVideos"
          >
            Videos
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg px-3 py-1.5 text-[12px] transition-colors"
            @click="openVideoModal(null)"
          >
            <span class="material-icons text-[15px] text-indigo-400">movie_filter</span>
            Crear video
          </button>
          <button
            v-if="galleryMode === 'images' && images.length"
            class="flex items-center gap-1 text-neutral-500 hover:text-red-400 text-[11px] transition-colors"
            @click="confirmDeleteAllOpen = true"
          >
            <span class="material-icons text-[14px]">delete_sweep</span>
            Eliminar todas
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-5">
        <ImageGallery
          v-if="galleryMode === 'images'"
          :images="images"
          :generating="generating"
          :has-more="hasMore"
          :loading-more="loadingMore"
          :upscaling-id="upscalingId"
          @delete="onDelete"
          @load-more="loadMore"
          @create-video="openVideoModal"
          @upscale="onUpscale"
        />
        <VideoGallery
          v-else
          :videos="videos"
          :has-more="hasMoreVideos"
          :loading-more="loadingMoreVideos"
          @delete="onDeleteVideo"
          @load-more="loadMoreVideos"
        />
      </div>
    </section>

    <VideoGenModal
      :open="videoModalOpen"
      :source-image="videoSource"
      @close="videoModalOpen = false"
      @created="onVideoCreated"
    />

    <MaskEditorModal
      :open="maskEditorOpen"
      :base-image="initImage"
      :initial-mask="maskImage"
      @close="maskEditorOpen = false"
      @apply="onMaskApplied"
    />

    <ConfirmDialog
      :open="confirmDeleteAllOpen"
      title="Eliminar todas las imágenes"
      message="¿Estás seguro de que querés borrar todas las imágenes? Esta acción es permanente y no se puede deshacer."
      confirm-label="Eliminar todas"
      cancel-label="Cancelar"
      danger
      @confirm="onDeleteAll"
      @cancel="confirmDeleteAllOpen = false"
    />
  </div>
</template>

<script>
import ImageModelSelector from './ImageModelSelector.vue';
import ImageParams from './ImageParams.vue';
import ImageInputPanel from './ImageInputPanel.vue';
import MaskEditorModal from './MaskEditorModal.vue';
import ImageGallery from './ImageGallery.vue';
import VideoGallery from './VideoGallery.vue';
import VideoGenModal from './VideoGenModal.vue';
import ConfirmDialog from '../common/ConfirmDialog.vue';
import {
  generateImage,
  generateComfyImage,
  enhanceImagePrompt,
  upscaleImage,
  getSavedImages,
  deleteImage,
  deleteAllImages,
  getImageModels,
  editImage,
  cancelEditJob,
} from '../../composables/useImageGen';
import { getSavedVideos, deleteVideo } from '../../composables/useVideoGen';

const MODEL_DEFAULTS = {
  'flux2-klein': { steps: 4, guidance: 1.0, width: 576, height: 1024 },
  'juggernaut-z': { steps: 20, guidance: 1, width: 576, height: 1024 },
  sdxl: { steps: 20, guidance: 7.5, width: 576, height: 1024 },
};

const GLOBAL_DEFAULTS = { steps: 20, guidance: 7.5, seed: -1, width: 576, height: 1024 };

const COMFY_MODELS = new Set();

const COMFY_STATUS_LABELS = {
  queued: 'En cola...',
  preparing: 'Liberando VRAM...',
  rendering: 'Generando imagen...',
};

const ASPECT_OPTIONS = [
  { value: 'portrait', label: 'Vertical', icon: 'crop_portrait' },
  { value: 'square', label: 'Cuadrado', icon: 'crop_square' },
  { value: 'landscape', label: 'Horizontal', icon: 'crop_landscape' },
];

export default {
  name: 'ImageGenView',
  components: {
    ImageModelSelector,
    ImageParams,
    ImageInputPanel,
    MaskEditorModal,
    ImageGallery,
    VideoGallery,
    VideoGenModal,
    ConfirmDialog,
  },
  data() {
    return {
      galleryMode: 'images',
      confirmDeleteAllOpen: false,
      videoModalOpen: false,
      videoSource: null,
      videos: [],
      totalVideos: 0,
      videosLoaded: false,
      loadingMoreVideos: false,
      model: '',
      prompt: '',
      negativePrompt: '',
      steps: GLOBAL_DEFAULTS.steps,
      guidance: GLOBAL_DEFAULTS.guidance,
      seed: GLOBAL_DEFAULTS.seed,
      width: GLOBAL_DEFAULTS.width,
      height: GLOBAL_DEFAULTS.height,
      aspect: 'portrait',
      aspectOptions: ASPECT_OPTIONS,
      generating: false,
      enhancing: false,
      statusMsg: '',
      statusError: false,
      images: [],
      totalImages: 0,
      loadingMore: false,
      upscalingId: null,
      availableModels: [],
      editMode: 'none',
      initImage: null,
      refImages: [],
      maskImage: null,
      strength: 0.75,
      activeEditJob: null,
      editCancelled: false,
      maskEditorOpen: false,
    };
  },
  computed: {
    hasMore() {
      return this.images.length < this.totalImages;
    },
    hasMoreVideos() {
      return this.videos.length < this.totalVideos;
    },
    isComfyModel() {
      return COMFY_MODELS.has(this.model);
    },
    selectedEditCaps() {
      return this.availableModels.find((m) => m.id === this.model)?.edit || null;
    },
    // Missing-input guard for the active edit mode, used both to disable the
    // Generate button and to short-circuit generate() before any request.
    editModeBlockedReason() {
      if (!this.selectedEditCaps || this.editMode === 'none') return null;
      if (this.editMode === 'img2img' && !this.initImage) {
        return 'Agrega una imagen para usar Remix';
      }
      if (this.editMode === 'refs' && this.refImages.length === 0) {
        return 'Agrega al menos una imagen de referencia';
      }
      if (this.editMode === 'inpaint' && (!this.initImage || !this.maskImage)) {
        return 'Agrega una imagen base y pinta la mascara para usar Retocar';
      }
      return null;
    },
    canGenerate() {
      return (
        !this.generating &&
        !!this.prompt.trim() &&
        !!this.model &&
        !this.editModeBlockedReason
      );
    },
  },
  watch: {
    model(val) {
      const defs = MODEL_DEFAULTS[val] || GLOBAL_DEFAULTS;
      this.steps = defs.steps;
      this.guidance = defs.guidance;
      this.width = defs.width;
      this.height = defs.height;
    },
    selectedEditCaps(val) {
      if (!val) {
        this.editMode = 'none';
        this.initImage = null;
        this.refImages = [];
        this.maskImage = null;
        this.statusMsg = 'El modo edicion no esta disponible con este modelo.';
        this.statusError = false;
        return;
      }
      // Clamp state to the new model's capabilities: models may differ in
      // supported modes and reference-image limits.
      const modeSupported = {
        none: true,
        img2img: !!val.img2img,
        refs: (val.refImages || 0) > 0,
        inpaint: !!val.inpaint,
      };
      if (!modeSupported[this.editMode]) this.editMode = 'none';
      if (this.refImages.length > (val.refImages || 0)) {
        this.refImages = this.refImages.slice(0, val.refImages || 0);
      }
      if (!val.inpaint) this.maskImage = null;
    },
  },
  async mounted() {
    try {
      const result = await getSavedImages({ limit: 20, offset: 0 });
      this.images = result.images;
      this.totalImages = result.total;
    } catch {
      // ignore
    }
    try {
      this.availableModels = await getImageModels();
    } catch {
      // ignore — edit-mode UI simply won't appear
    }
  },
  methods: {
    openVideoModal(image) {
      this.videoSource = image || null;
      this.videoModalOpen = true;
    },
    async enhancePrompt() {
      if (this.enhancing || this.generating || !this.prompt.trim()) return;
      this.enhancing = true;
      this.statusMsg = '';
      this.statusError = false;
      try {
        this.prompt = await enhanceImagePrompt(this.prompt);
      } catch (err) {
        this.statusMsg = err.message || 'No se pudo mejorar el prompt';
        this.statusError = true;
      } finally {
        this.enhancing = false;
      }
    },
    async switchToVideos() {
      this.galleryMode = 'videos';
      if (!this.videosLoaded) await this.loadVideos();
    },
    async loadVideos() {
      try {
        const result = await getSavedVideos({ limit: 10, offset: 0 });
        this.videos = result.videos;
        this.totalVideos = result.total;
        this.videosLoaded = true;
      } catch {
        // ignore
      }
    },
    async loadMoreVideos() {
      if (this.loadingMoreVideos || !this.hasMoreVideos) return;
      this.loadingMoreVideos = true;
      try {
        const result = await getSavedVideos({ limit: 10, offset: this.videos.length });
        this.videos = [...this.videos, ...result.videos];
        this.totalVideos = result.total;
      } catch {
        // ignore
      } finally {
        this.loadingMoreVideos = false;
      }
    },
    async onDeleteVideo(id) {
      try {
        await deleteVideo(id);
        this.videos = this.videos.filter((v) => v.id !== id);
        this.totalVideos = Math.max(0, this.totalVideos - 1);
      } catch {
        // ignore
      }
    },
    onVideoCreated() {
      // Refresh the video list so a freshly generated video shows up.
      this.videosLoaded = false;
      if (this.galleryMode === 'videos') this.loadVideos();
    },
    async generate() {
      if (this.generating || !this.prompt.trim() || !this.model) return;

      // Pre-flight guard: don't even flip `generating` on if the active edit
      // mode is missing required input images.
      if (this.editModeBlockedReason) {
        this.statusMsg = this.editModeBlockedReason;
        this.statusError = true;
        return;
      }

      this.editCancelled = false;
      this.generating = true;
      this.statusMsg = 'cargando modelo...';
      this.statusError = false;

      try {
        if (this.isComfyModel) {
          const img = await generateComfyImage({
            model: this.model,
            prompt: this.prompt,
            negativePrompt: this.negativePrompt,
            aspect: this.aspect,
            onStatus: (s) => {
              this.statusMsg = COMFY_STATUS_LABELS[s] || 'Generando...';
            },
          });
          this.images.unshift(img);
        } else if (this.editMode !== 'none' && this.selectedEditCaps) {
          const results = await editImage({
            model: this.model,
            mode: this.editMode,
            prompt: this.prompt,
            negativePrompt: this.negativePrompt,
            steps: this.steps,
            guidance: this.guidance,
            seed: this.seed,
            width: this.width,
            height: this.height,
            strength: this.strength,
            initImage: this.initImage,
            refImages: this.refImages,
            maskImage: this.maskImage,
            onJobStart: (jobId) => {
              this.activeEditJob = { model: this.model, jobId };
            },
            onStatus: (s) => {
              this.statusMsg =
                s === 'queued' ? 'En cola...' : s === 'generating' ? 'Generando...' : this.statusMsg;
            },
            shouldCancel: () => this.editCancelled,
          });
          results.forEach((img) => this.images.unshift(img));
        } else {
          const results = await generateImage({
            model: this.model,
            prompt: this.prompt,
            negativePrompt: this.negativePrompt,
            steps: this.steps,
            guidance: this.guidance,
            seed: this.seed,
            width: this.width,
            height: this.height,
          });
          results.forEach((img) => this.images.unshift(img));
        }

        this.statusMsg = '';
      } catch (err) {
        this.statusMsg = err.message || 'Error al generar imagen';
        this.statusError = true;
      } finally {
        this.generating = false;
        this.activeEditJob = null;
      }
    },
    onMaskApplied({ maskImage }) {
      this.maskImage = maskImage;
      this.maskEditorOpen = false;
    },
    async cancelEdit() {
      if (!this.activeEditJob) return;
      this.editCancelled = true;
      await cancelEditJob(this.activeEditJob.model, this.activeEditJob.jobId);
    },
    async onUpscale(img) {
      if (this.upscalingId) return;
      this.upscalingId = img.id;
      try {
        const result = await upscaleImage({ imageId: img.id });
        this.images.unshift(result);
      } catch {
        // ignore — user can retry
      } finally {
        this.upscalingId = null;
      }
    },
    async onDelete(id) {
      try {
        await deleteImage(id);
        this.images = this.images.filter((img) => img.id !== id);
      } catch {
        // ignore
      }
    },
    async onDeleteAll() {
      this.confirmDeleteAllOpen = false;
      try {
        await deleteAllImages();
        this.images = [];
        this.totalImages = 0;
      } catch {
        // ignore
      }
    },
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return;
      this.loadingMore = true;
      try {
        const result = await getSavedImages({ limit: 20, offset: this.images.length });
        this.images = [...this.images, ...result.images];
        this.totalImages = result.total;
      } catch {
        // ignore
      } finally {
        this.loadingMore = false;
      }
    },
  },
};
</script>
