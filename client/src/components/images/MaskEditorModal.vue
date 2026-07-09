<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      @click="cancel"
    >
      <div class="flex flex-col gap-4 max-w-3xl w-full max-h-full" @click.stop>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-neutral-200">Pintar mascara</h3>
          <button
            class="text-neutral-400 hover:text-white transition-colors"
            aria-label="Cerrar"
            title="Cerrar"
            @click="cancel"
          >
            <span class="material-icons text-[24px]">close</span>
          </button>
        </div>

        <div
          ref="stage"
          class="relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center max-h-[65vh]"
        >
          <img
            ref="baseImg"
            :src="baseImage"
            alt="Imagen base"
            class="max-w-full max-h-[65vh] object-contain select-none pointer-events-none"
            draggable="false"
            @load="onImageLoad"
          />
          <canvas
            v-if="ready"
            ref="canvas"
            class="absolute cursor-crosshair touch-none"
            :style="canvasStyle"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          ></canvas>
        </div>

        <div class="flex flex-wrap items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <div class="flex items-center gap-0.5 bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors"
              :class="tool === 'brush'
                ? 'bg-indigo-600 border border-indigo-500 text-white'
                : 'text-neutral-400 hover:text-neutral-200'"
              title="Pincel"
              aria-label="Herramienta pincel"
              :aria-pressed="tool === 'brush'"
              @click="tool = 'brush'"
            >
              <span class="material-icons text-[16px]">brush</span>
              Pincel
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors"
              :class="tool === 'eraser'
                ? 'bg-indigo-600 border border-indigo-500 text-white'
                : 'text-neutral-400 hover:text-neutral-200'"
              title="Borrador"
              aria-label="Herramienta borrador"
              :aria-pressed="tool === 'eraser'"
              @click="tool = 'eraser'"
            >
              <span class="material-icons text-[16px]">ink_eraser</span>
              Borrador
            </button>
          </div>

          <label class="flex items-center gap-2 text-[12px] text-neutral-400 flex-1 min-w-[140px]">
            Tamano
            <input
              v-model.number="brushSize"
              type="range"
              min="5"
              max="80"
              class="w-full accent-indigo-500"
            />
          </label>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[12px] transition-colors"
            @click="clearCanvas"
          >
            Limpiar
          </button>
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[13px] font-medium transition-colors"
            @click="cancel"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-medium transition-colors"
            @click="apply"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
// Coordinate model: the interactive <canvas> is sized to the base image's
// NATURAL pixel dimensions (canvas.width/height), then scaled down visually
// via CSS (absolute positioning + explicit px width/height matching the
// rendered <img> box). Pointer events report coordinates in CSS pixels
// relative to the canvas element, so we scale them back up by
// (canvas.width / canvas.clientWidth) before drawing — this keeps strokes
// pixel-accurate at export time without any separate replay/redraw step.
export default {
  name: 'MaskEditorModal',
  props: {
    open: { type: Boolean, default: false },
    baseImage: { type: String, default: null },
    initialMask: { type: String, default: null },
  },
  emits: ['close', 'apply'],
  data() {
    return {
      ready: false,
      tool: 'brush',
      brushSize: 30,
      drawing: false,
      lastPoint: null,
      naturalWidth: 0,
      naturalHeight: 0,
      displayWidth: 0,
      displayHeight: 0,
    };
  },
  computed: {
    canvasStyle() {
      return {
        width: `${this.displayWidth}px`,
        height: `${this.displayHeight}px`,
      };
    },
  },
  watch: {
    open(val) {
      if (val) {
        this.ready = false;
      } else {
        this.drawing = false;
      }
    },
  },
  methods: {
    onImageLoad() {
      const img = this.$refs.baseImg;
      if (!img) return;
      this.naturalWidth = img.naturalWidth;
      this.naturalHeight = img.naturalHeight;
      this.displayWidth = img.clientWidth;
      this.displayHeight = img.clientHeight;
      this.ready = true;
      this.$nextTick(() => this.setupCanvas());
    },
    setupCanvas() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      canvas.width = this.naturalWidth;
      canvas.height = this.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (this.initialMask) {
        const img = new Image();
        img.onload = () => {
          // Convert black/white mask -> red/transparent for editable display.
          const tmp = document.createElement('canvas');
          tmp.width = canvas.width;
          tmp.height = canvas.height;
          const tctx = tmp.getContext('2d');
          tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
          const data = tctx.getImageData(0, 0, tmp.width, tmp.height);
          const px = data.data;
          for (let i = 0; i < px.length; i += 4) {
            const luminance = px[i];
            px[i] = 239;
            px[i + 1] = 68;
            px[i + 2] = 68;
            px[i + 3] = luminance > 10 ? Math.round(luminance * 0.45) : 0;
          }
          tctx.putImageData(data, 0, 0);
          ctx.drawImage(tmp, 0, 0);
        };
        img.src = this.initialMask;
      }
    },
    scalePoint(e) {
      const canvas = this.$refs.canvas;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    onPointerDown(e) {
      const canvas = this.$refs.canvas;
      canvas.setPointerCapture(e.pointerId);
      this.drawing = true;
      this.lastPoint = this.scalePoint(e);
      this.strokeTo(this.lastPoint);
    },
    onPointerMove(e) {
      if (!this.drawing) return;
      const point = this.scalePoint(e);
      this.strokeSegment(this.lastPoint, point);
      this.lastPoint = point;
    },
    onPointerUp() {
      this.drawing = false;
      this.lastPoint = null;
    },
    strokeTo(point) {
      this.strokeSegment(point, point);
    },
    strokeSegment(from, to) {
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      // Scale brush size proportionally to natural resolution so the visual
      // stroke width feels consistent regardless of image size.
      const scale = canvas.width / this.displayWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = this.brushSize * scale;

      if (this.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(239,68,68,0.45)';
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    },
    clearCanvas() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    cancel() {
      this.$emit('close');
    },
    apply() {
      const canvas = this.$refs.canvas;
      if (!canvas) {
        this.$emit('close');
        return;
      }

      // Export a black/white mask at natural resolution: any painted pixel
      // (alpha > 0, i.e. still-visible red strokes after erasing) -> white,
      // everything else -> black. Erased areas already have alpha 0 thanks
      // to destination-out compositing during drawing.
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;

      const out = document.createElement('canvas');
      out.width = canvas.width;
      out.height = canvas.height;
      const octx = out.getContext('2d');
      octx.fillStyle = 'black';
      octx.fillRect(0, 0, out.width, out.height);

      const outData = octx.getImageData(0, 0, out.width, out.height);
      const outPx = outData.data;
      for (let i = 0; i < px.length; i += 4) {
        const alpha = px[i + 3];
        const value = alpha > 10 ? 255 : 0;
        outPx[i] = value;
        outPx[i + 1] = value;
        outPx[i + 2] = value;
        outPx[i + 3] = 255;
      }
      octx.putImageData(outData, 0, 0);

      this.$emit('apply', { maskImage: out.toDataURL('image/png') });
    },
  },
};
</script>
