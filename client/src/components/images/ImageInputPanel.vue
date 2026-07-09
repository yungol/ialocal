<template>
  <div class="flex flex-col gap-2">
    <span class="text-neutral-500 text-[11px] uppercase tracking-wide">Imagen de entrada</span>

    <div class="grid grid-cols-4 gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
      <button
        type="button"
        class="px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        :class="modeModel === 'none'
          ? 'bg-indigo-600 border border-indigo-500 text-white'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="modeModel = 'none'"
      >
        Texto
      </button>
      <button
        v-if="capabilities.img2img"
        type="button"
        class="px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        :class="modeModel === 'img2img'
          ? 'bg-indigo-600 border border-indigo-500 text-white'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="modeModel = 'img2img'"
      >
        Remix
      </button>
      <button
        v-if="capabilities.refImages"
        type="button"
        class="px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        :class="modeModel === 'refs'
          ? 'bg-indigo-600 border border-indigo-500 text-white'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="modeModel = 'refs'"
      >
        Referencias
      </button>
      <button
        v-if="capabilities.inpaint"
        type="button"
        class="px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        :class="modeModel === 'inpaint'
          ? 'bg-indigo-600 border border-indigo-500 text-white'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="modeModel = 'inpaint'"
      >
        Retocar
      </button>
    </div>

    <!-- Remix (img2img) -->
    <div v-if="modeModel === 'img2img'" class="flex flex-col gap-2">
      <div
        v-if="!initImageModel"
        class="border border-dashed border-neutral-700 hover:border-indigo-500 rounded-lg px-3 py-6 flex flex-col items-center gap-1.5 text-center cursor-pointer transition-colors"
        @click="$refs.initFile.click()"
        @dragover.prevent
        @drop.prevent="onDropInit"
        @paste="onPasteInit"
      >
        <span class="material-icons text-[22px] text-neutral-500">add_photo_alternate</span>
        <span class="text-[11px] text-neutral-500">Arrastra, pega o hace clic para subir una imagen</span>
      </div>
      <div v-else class="relative inline-block">
        <img :src="initImageModel" alt="Imagen base" class="max-h-40 w-auto rounded-lg object-contain border border-neutral-700" />
        <button
          type="button"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-800 ring-1 ring-neutral-600 text-neutral-300 hover:text-white hover:bg-red-600 transition-colors"
          aria-label="Quitar imagen"
          title="Quitar imagen"
          @click="initImageModel = null"
        >
          <span class="material-icons text-[14px]">close</span>
        </button>
      </div>
      <input ref="initFile" type="file" accept="image/*" class="hidden" @change="onFileInit" />

      <div class="flex flex-col gap-1">
        <input
          v-model.number="strengthModel"
          type="range"
          min="0.2"
          max="0.95"
          step="0.05"
          class="w-full accent-indigo-500"
        />
        <div class="flex justify-between text-[11px] text-neutral-500">
          <span>Sutil</span>
          <span>Creativo</span>
        </div>
      </div>
      <p class="text-[11px] text-neutral-500">Usa tu imagen como base y la reinterpreta.</p>
    </div>

    <!-- Referencias -->
    <div v-else-if="modeModel === 'refs'" class="flex flex-col gap-2">
      <div class="grid grid-cols-3 gap-2">
        <div v-for="(ref, i) in refImagesModel" :key="i" class="relative aspect-square">
          <img :src="ref" alt="Referencia" class="w-full h-full object-cover rounded-lg border border-neutral-700" />
          <button
            type="button"
            class="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-800 ring-1 ring-neutral-600 text-neutral-300 hover:text-white hover:bg-red-600 transition-colors"
            aria-label="Quitar referencia"
            title="Quitar referencia"
            @click="removeRef(i)"
          >
            <span class="material-icons text-[14px]">close</span>
          </button>
        </div>
        <button
          v-if="refImagesModel.length < capabilities.refImages"
          type="button"
          class="aspect-square border border-dashed border-neutral-700 hover:border-indigo-500 rounded-lg flex items-center justify-center transition-colors"
          aria-label="Agregar imagen de referencia"
          title="Agregar imagen de referencia"
          @click="$refs.refFile.click()"
          @dragover.prevent
          @drop.prevent="onDropRef"
          @paste="onPasteRef"
        >
          <span class="material-icons text-[22px] text-neutral-500">add</span>
        </button>
      </div>
      <input ref="refFile" type="file" accept="image/*" class="hidden" @change="onFileRef" />
      <p class="text-[11px] text-neutral-500">Integra personas, objetos o estilos de tus fotos en la imagen generada.</p>
    </div>

    <!-- Retocar (inpaint) -->
    <div v-else-if="modeModel === 'inpaint'" class="flex flex-col gap-2">
      <div
        v-if="!initImageModel"
        class="border border-dashed border-neutral-700 hover:border-indigo-500 rounded-lg px-3 py-6 flex flex-col items-center gap-1.5 text-center cursor-pointer transition-colors"
        @click="$refs.inpaintFile.click()"
        @dragover.prevent
        @drop.prevent="onDropInit"
        @paste="onPasteInit"
      >
        <span class="material-icons text-[22px] text-neutral-500">add_photo_alternate</span>
        <span class="text-[11px] text-neutral-500">Arrastra, pega o hace clic para subir una imagen</span>
      </div>
      <div v-else class="relative inline-block">
        <img :src="initImageModel" alt="Imagen base" class="max-h-40 w-auto rounded-lg object-contain border border-neutral-700" />
        <img
          v-if="maskPreview"
          :src="maskPreview"
          alt="Mascara"
          class="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <button
          type="button"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-800 ring-1 ring-neutral-600 text-neutral-300 hover:text-white hover:bg-red-600 transition-colors"
          aria-label="Quitar imagen"
          title="Quitar imagen"
          @click="clearInpaint"
        >
          <span class="material-icons text-[14px]">close</span>
        </button>
      </div>
      <input ref="inpaintFile" type="file" accept="image/*" class="hidden" @change="onFileInit" />

      <button
        v-if="initImageModel"
        type="button"
        class="w-full px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[12px] font-medium transition-colors"
        @click="$emit('edit-mask')"
      >
        Editar mascara
      </button>
      <p class="text-[11px] text-neutral-500">Pinta la zona que quieres regenerar; el resto se conserva.</p>
    </div>
  </div>
</template>

<script>
import { readAndDownscaleImage, extractImageFile, tintMaskRed } from '../../utils/imageInput';

// Mask preview strategy: MaskEditorModal exports a black/white PNG (white =
// area to regenerate) for the API payload. For on-screen preview here we
// re-derive a red/semi-transparent version via tintMaskRed() (a canvas
// recolor pass) whenever maskImage changes, cached in `maskPreview` so it
// isn't recomputed on every render. This keeps the API payload format exactly
// per spec while still giving the user a legible red overlay.
export default {
  name: 'ImageInputPanel',
  props: {
    capabilities: { type: Object, required: true },
    mode: { type: String, default: 'none' },
    initImage: { type: String, default: null },
    refImages: { type: Array, default: () => [] },
    maskImage: { type: String, default: null },
    strength: { type: Number, default: 0.75 },
  },
  emits: [
    'update:mode',
    'update:initImage',
    'update:refImages',
    'update:maskImage',
    'update:strength',
    'edit-mask',
  ],
  data() {
    return {
      maskPreview: null,
    };
  },
  computed: {
    modeModel: {
      get() { return this.mode; },
      set(v) { this.$emit('update:mode', v); },
    },
    initImageModel: {
      get() { return this.initImage; },
      set(v) { this.$emit('update:initImage', v); },
    },
    refImagesModel: {
      get() { return this.refImages; },
      set(v) { this.$emit('update:refImages', v); },
    },
    maskImageModel: {
      get() { return this.maskImage; },
      set(v) { this.$emit('update:maskImage', v); },
    },
    strengthModel: {
      get() { return this.strength; },
      set(v) { this.$emit('update:strength', v); },
    },
  },
  watch: {
    maskImage: {
      immediate: true,
      async handler(val) {
        if (!val) {
          this.maskPreview = null;
          return;
        }
        try {
          this.maskPreview = await tintMaskRed(val);
        } catch {
          this.maskPreview = null;
        }
      },
    },
  },
  methods: {
    async loadFileInto(file, target) {
      if (!file) return;
      try {
        const dataUrl = await readAndDownscaleImage(file);
        if (target === 'init') {
          this.initImageModel = dataUrl;
        } else if (target === 'ref') {
          this.refImagesModel = [...this.refImagesModel, dataUrl];
        }
      } catch {
        // silently ignore unreadable files; user can retry
      }
    },
    onFileInit(e) {
      const file = e.target.files?.[0];
      this.loadFileInto(file, 'init');
      e.target.value = '';
    },
    onFileRef(e) {
      const file = e.target.files?.[0];
      this.loadFileInto(file, 'ref');
      e.target.value = '';
    },
    onDropInit(e) {
      this.loadFileInto(extractImageFile(e), 'init');
    },
    onPasteInit(e) {
      this.loadFileInto(extractImageFile(e), 'init');
    },
    onDropRef(e) {
      this.loadFileInto(extractImageFile(e), 'ref');
    },
    onPasteRef(e) {
      this.loadFileInto(extractImageFile(e), 'ref');
    },
    removeRef(i) {
      this.refImagesModel = this.refImagesModel.filter((_, idx) => idx !== i);
    },
    clearInpaint() {
      this.initImageModel = null;
      this.maskImageModel = null;
    },
  },
};
</script>
