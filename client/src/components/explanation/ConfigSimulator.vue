<template>
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
    <div class="grid gap-5 lg:grid-cols-2">
      <!-- Controls -->
      <div class="space-y-4 text-xs">
        <label class="block">
          <span class="text-neutral-400">Modelo</span>
          <select v-model="modelId" :class="inputClass" class="mt-1" @change="onModelChange">
            <option v-for="(m, id) in models" :key="id" :value="id">{{ m.name }}</option>
          </select>
        </label>

        <label class="block">
          <span class="text-neutral-400">Cuantizacion (que tanto aplastamos las bolitas)</span>
          <select v-model="quant" :class="inputClass" class="mt-1">
            <option v-for="(q, name) in model.quants" :key="name" :value="name">
              {{ name }} — {{ q.file.toFixed(2) }} GiB
            </option>
          </select>
        </label>

        <label class="block">
          <div class="flex justify-between text-neutral-400">
            <span>Ventana de contexto (--ctx-size)</span>
            <span class="text-neutral-200 font-mono">{{ ctx.toLocaleString('es') }}</span>
          </div>
          <input v-model.number="ctxIndex" type="range" min="0" :max="ctxSteps.length - 1" class="w-full mt-1" />
        </label>

        <div>
          <span class="text-neutral-400">KV cache (letra de la libreta)</span>
          <div class="flex gap-1.5 mt-1">
            <button
              v-for="(t, key) in kvTypes"
              :key="key"
              :class="[chipClass, kvType === key ? chipOnClass : chipOffClass]"
              @click="kvType = key"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- MoE offload -->
        <div v-if="model.moe">
          <span class="text-neutral-400">Expertos en RAM</span>
          <div class="flex gap-1.5 mt-1">
            <button :class="[chipClass, moeMode === 'all' ? chipOnClass : chipOffClass]" @click="moeMode = 'all'">
              --cpu-moe (todos)
            </button>
            <button :class="[chipClass, moeMode === 'n' ? chipOnClass : chipOffClass]" @click="moeMode = 'n'">
              --n-cpu-moe N
            </button>
            <button :class="[chipClass, moeMode === 'none' ? chipOnClass : chipOffClass]" @click="moeMode = 'none'">
              ninguno (todo GPU)
            </button>
          </div>
          <label v-if="moeMode === 'n'" class="block mt-2">
            <div class="flex justify-between text-neutral-400">
              <span>Capas con expertos en RAM</span>
              <span class="text-neutral-200 font-mono">{{ nCpuMoe }} / {{ model.layers }}</span>
            </div>
            <input v-model.number="nCpuMoe" type="range" min="0" :max="model.layers" class="w-full mt-1" />
          </label>
        </div>

        <!-- Dense offload -->
        <label v-else class="block">
          <div class="flex justify-between text-neutral-400">
            <span>Capas en GPU (--n-gpu-layers)</span>
            <span class="text-neutral-200 font-mono">{{ nGpuLayers }} / {{ model.layers }}</span>
          </div>
          <input v-model.number="nGpuLayers" type="range" min="0" :max="model.layers" class="w-full mt-1" />
        </label>

        <div v-if="model.mtpGiB > 0">
          <label class="flex items-center gap-2 text-neutral-300">
            <input v-model="mtp" type="checkbox" />
            MTP (--spec-type draft-mtp)
          </label>
          <label v-if="mtp" class="block mt-2">
            <div class="flex justify-between text-neutral-400">
              <span>Tokens que adivina (--spec-draft-n-max)</span>
              <span class="text-neutral-200 font-mono">{{ mtpN }}</span>
            </div>
            <input v-model.number="mtpN" type="range" min="1" max="6" class="w-full mt-1" />
          </label>
        </div>
        <p v-else class="text-neutral-500">Este GGUF no trae capa MTP.</p>

        <div v-if="model.mmprojGiB > 0">
          <span class="text-neutral-400">Vision (mmproj)</span>
          <div class="flex gap-1.5 mt-1">
            <button :class="[chipClass, mmproj === 'off' ? chipOnClass : chipOffClass]" @click="mmproj = 'off'">sin vision</button>
            <button :class="[chipClass, mmproj === 'gpu' ? chipOnClass : chipOffClass]" @click="mmproj = 'gpu'">en GPU</button>
            <button :class="[chipClass, mmproj === 'cpu' ? chipOnClass : chipOffClass]" @click="mmproj = 'cpu'">en CPU</button>
          </div>
        </div>

        <label class="block">
          <div class="flex justify-between text-neutral-400">
            <span>Usuarios simultaneos (--parallel)</span>
            <span class="text-neutral-200 font-mono">{{ parallel }}</span>
          </div>
          <input v-model.number="parallel" type="range" min="1" max="4" class="w-full mt-1" />
        </label>

        <button :class="[chipClass, chipOffClass]" @click="applyVideoPreset">Cargar la config del video</button>
      </div>

      <!-- Results -->
      <div class="space-y-4">
        <MemoryBar title="VRAM (la mesa) — RTX 3070" :total="gpuTotal" :segments="vramSegments" />
        <MemoryBar title="RAM (la estanteria)" :total="ramTotal" :segments="ramSegments" />

        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg bg-neutral-950 border border-neutral-800 p-3">
            <div class="text-[11px] text-neutral-500">Velocidad estimada</div>
            <div class="text-2xl font-semibold text-neutral-100">
              {{ fits ? speed.tps.toFixed(0) : '—' }}
              <span class="text-xs font-normal text-neutral-500">tok/s</span>
            </div>
            <div v-if="fits && mtp && model.mtpGiB > 0" class="text-[11px] text-emerald-400">
              x{{ speed.mtpGain.toFixed(2) }} gracias a MTP
            </div>
          </div>
          <div class="rounded-lg bg-neutral-950 border border-neutral-800 p-3">
            <div class="text-[11px] text-neutral-500">Leido por token</div>
            <div class="text-sm text-neutral-200 mt-1">
              GPU {{ speed.gpuGiB.toFixed(2) }} GiB
            </div>
            <div class="text-sm text-neutral-200">
              RAM {{ speed.cpuGiB.toFixed(2) }} GiB
            </div>
          </div>
        </div>

        <ul class="space-y-1.5 text-xs">
          <li
            v-for="(w, i) in warnings"
            :key="i"
            class="rounded-lg px-3 py-2"
            :class="{
              'bg-red-950/50 text-red-300 border border-red-900/60': w.level === 'error',
              'bg-amber-950/40 text-amber-300 border border-amber-900/50': w.level === 'warn',
              'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50': w.level === 'ok',
            }"
          >
            {{ w.text }}
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-5">
      <div class="text-[11px] text-neutral-500 mb-1">Comando equivalente para llama-swap en este servidor</div>
      <pre class="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-[11px] text-neutral-300 whitespace-pre-wrap break-all">{{ command }}</pre>
    </div>

    <p class="mt-3 text-[11px] text-neutral-500">
      Estimacion didactica: tamanos reales de los GGUF, pero la velocidad sale de un modelo simple
      (bytes leidos por token / ancho de banda). No incluye el procesado del prompt ni que la generacion
      se frena a medida que se llena el contexto.
    </p>
  </div>
</template>

<script>
import MemoryBar from './MemoryBar.vue';
import {
  GPU_TOTAL_GIB,
  RAM_TOTAL_GIB,
  GPU_BANDWIDTH_GBS,
  RAM_BANDWIDTH_GBS,
  KV_TYPES,
  MODELS,
} from './explanationData';

const GIB = 1024 ** 3;
const CUDA_CONTEXT_GIB = 0.3;
const COMPUTE_BUFFER_GIB = 0.5;
const DESKTOP_GIB = 0.25;
const OS_RAM_GIB = 4;
const RECURRENT_STATE_GIB_PER_LAYER = 0.002; // linear-attention state per slot
const MTP_ACCEPT_RATE = 0.75;

export default {
  name: 'ConfigSimulator',
  components: { MemoryBar },
  data() {
    return {
      models: MODELS,
      kvTypes: KV_TYPES,
      gpuTotal: GPU_TOTAL_GIB,
      ramTotal: RAM_TOTAL_GIB,
      ctxSteps: [4096, 8192, 16384, 32768, 65536, 98304, 131072, 196608, 262144],
      inputClass: 'w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200',
      chipClass: 'px-2.5 py-1 rounded-lg border transition-colors text-[11px]',
      chipOnClass: 'bg-neutral-100 text-neutral-900 border-neutral-100',
      chipOffClass: 'border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500',
      modelId: 'qwen36-35b-a3b',
      quant: 'MXFP4_MOE',
      ctxIndex: 6,
      kvType: 'q8_0',
      moeMode: 'all',
      nCpuMoe: 36,
      nGpuLayers: 99,
      mtp: true,
      mtpN: 2,
      mmproj: 'cpu',
      parallel: 1,
    };
  },
  computed: {
    model() {
      return this.models[this.modelId];
    },
    ctx() {
      return this.ctxSteps[this.ctxIndex];
    },
    mtpOn() {
      return this.mtp && this.model.mtpGiB > 0;
    },
    kvGiB() {
      const m = this.model;
      const bytesPerToken = m.kvHeads * m.headDim * 2 * KV_TYPES[this.kvType].bytes;
      const layers = m.kvLayers + (this.mtpOn ? 1 : 0);
      return (this.ctx * layers * bytesPerToken) / GIB;
    },
    recurrentGiB() {
      const m = this.model;
      return (m.layers - m.kvLayers) * RECURRENT_STATE_GIB_PER_LAYER * this.parallel;
    },
    weights() {
      const m = this.model;
      const q = m.quants[this.quant];
      if (m.moe) {
        const expertGiB = q.file - q.nonExpert - m.mtpGiB;
        const perLayer = expertGiB / m.layers;
        const cpuLayers = this.cpuExpertLayers;
        return {
          gpu: q.nonExpert + (m.layers - cpuLayers) * perLayer + (this.mtpOn ? m.mtpGiB : 0),
          cpu: cpuLayers * perLayer,
          perLayer,
        };
      }
      const perLayer = q.file / m.layers;
      const gpuLayers = Math.min(this.nGpuLayers, m.layers);
      return { gpu: gpuLayers * perLayer, cpu: (m.layers - gpuLayers) * perLayer, perLayer };
    },
    cpuExpertLayers() {
      if (!this.model.moe) return 0;
      if (this.moeMode === 'all') return this.model.layers;
      if (this.moeMode === 'none') return 0;
      return Math.min(this.nCpuMoe, this.model.layers);
    },
    mmprojGpuGiB() {
      return this.mmproj === 'gpu' ? this.model.mmprojGiB + 0.2 : 0;
    },
    vramSegments() {
      return [
        { label: 'Pesos', value: this.weights.gpu, color: 'bg-sky-500' },
        { label: 'KV cache', value: this.kvGiB + this.recurrentGiB, color: 'bg-violet-500' },
        { label: 'Vision', value: this.mmprojGpuGiB, color: 'bg-pink-500' },
        { label: 'Buffers CUDA', value: CUDA_CONTEXT_GIB + COMPUTE_BUFFER_GIB, color: 'bg-neutral-500' },
        { label: 'Escritorio', value: DESKTOP_GIB, color: 'bg-neutral-700' },
      ];
    },
    vramUsed() {
      return this.vramSegments.reduce((sum, s) => sum + s.value, 0);
    },
    ramSegments() {
      return [
        { label: 'Sistema y otros', value: OS_RAM_GIB, color: 'bg-neutral-600' },
        { label: 'Pesos (expertos/capas)', value: this.weights.cpu, color: 'bg-amber-500' },
        { label: 'Vision', value: this.mmproj === 'cpu' ? this.model.mmprojGiB : 0, color: 'bg-pink-500' },
      ];
    },
    ramUsed() {
      return this.ramSegments.reduce((sum, s) => sum + s.value, 0);
    },
    fits() {
      return this.vramUsed <= this.gpuTotal && this.ramUsed <= this.ramTotal;
    },
    speed() {
      const m = this.model;
      const frac = m.moe ? m.expertsUsed / m.experts : 1;
      let gpuGiB;
      let cpuGiB;
      if (m.moe) {
        const q = m.quants[this.quant];
        gpuGiB = q.nonExpert * 0.9 + (m.layers - this.cpuExpertLayers) * this.weights.perLayer * frac;
        cpuGiB = this.cpuExpertLayers * this.weights.perLayer * frac;
      } else {
        gpuGiB = this.weights.gpu;
        cpuGiB = this.weights.cpu;
      }
      const tGpu = (gpuGiB * GIB) / (GPU_BANDWIDTH_GBS * 0.7e9);
      const tCpu = (cpuGiB * GIB) / (RAM_BANDWIDTH_GBS * 0.6e9);
      const overhead = 0.002 + (cpuGiB > 0 ? 0.003 : 0);
      const baseTps = 1 / ((tGpu + tCpu) / m.efficiency + overhead);

      let mtpGain = 1;
      if (this.mtpOn) {
        // Expected tokens per step: 1 + a + a^2 + ... + a^n.
        let tokensPerStep = 0;
        for (let i = 0; i <= this.mtpN; i++) tokensPerStep += MTP_ACCEPT_RATE ** i;
        // Verifying n extra tokens costs more when experts live in RAM:
        // each drafted token can route to different experts.
        const cpuShare = tCpu / (tGpu + tCpu || 1);
        const stepCost = 1 + this.mtpN * (0.12 + 0.3 * cpuShare);
        mtpGain = tokensPerStep / stepCost;
      }
      return { tps: baseTps * mtpGain, mtpGain, gpuGiB, cpuGiB };
    },
    recommendedNCpuMoe() {
      if (!this.model.moe) return null;
      const free = this.gpuTotal - 0.35 - (this.vramUsed - this.weights.gpu);
      const q = this.model.quants[this.quant];
      const base = q.nonExpert + (this.mtpOn ? this.model.mtpGiB : 0);
      const gpuLayers = Math.floor((free - base) / this.weights.perLayer);
      if (gpuLayers < 0) return null;
      return Math.max(0, this.model.layers - gpuLayers);
    },
    warnings() {
      const list = [];
      const vramFree = this.gpuTotal - this.vramUsed;
      if (this.vramUsed > this.gpuTotal) {
        list.push({ level: 'error', text: `No entra en la mesa: faltan ${(-vramFree).toFixed(2)} GiB de VRAM. llama.cpp falla al cargar (OOM).` });
      } else if (vramFree < 0.35) {
        list.push({ level: 'warn', text: `Al limite: quedan ${vramFree.toFixed(2)} GiB. Puede romper a mitad de sesion cuando crezcan los buffers.` });
      } else {
        list.push({ level: 'ok', text: `Entra en VRAM con ${vramFree.toFixed(2)} GiB de margen.` });
      }
      if (this.ramUsed > this.ramTotal) {
        list.push({ level: 'error', text: 'No entra en la estanteria: la RAM se llena y el sistema empieza a usar swap (lentisimo).' });
      } else if (this.ramUsed > this.ramTotal - 4) {
        list.push({ level: 'warn', text: 'La RAM queda justa: ComfyUI u otros procesos pueden competir por ella.' });
      }
      if (this.model.moe && this.moeMode !== 'none' && this.recommendedNCpuMoe !== null
        && this.recommendedNCpuMoe < this.cpuExpertLayers && this.vramUsed <= this.gpuTotal) {
        list.push({ level: 'warn', text: `Te sobra mesa: con --n-cpu-moe ${this.recommendedNCpuMoe} subis expertos a la GPU y ganas velocidad.` });
      }
      if (!this.model.moe && this.weights.cpu > 0) {
        list.push({ level: 'warn', text: 'Modelo denso con capas en RAM: TODAS las capas se leen en cada token, asi que la RAM frena todo. Por eso offloadear un denso duele mucho mas que un MoE.' });
      }
      if (this.parallel > 1) {
        list.push({ level: 'warn', text: `Con --parallel ${this.parallel} la libreta se reparte: cada conversacion tiene ${Math.floor(this.ctx / this.parallel).toLocaleString('es')} tokens.` });
      }
      if (this.mtpOn && this.mtpN > 3) {
        list.push({ level: 'warn', text: 'Adivinar muchos tokens rinde menos: cada uno tiene menos chance de acertar y verificar cuesta mas. Por eso el video usa 2.' });
      }
      return list;
    },
    command() {
      const m = this.model;
      const parts = [
        '/home/juan/bin/llama-cuda/llama-server --port ${PORT}',
        `--model /home/juan/models/${this.fileName}`,
      ];
      if (this.mmproj !== 'off' && m.mmprojGiB > 0) {
        parts.push('--mmproj /home/juan/models/Qwen3.6-35B-A3B-mmproj-BF16.gguf');
        if (this.mmproj === 'cpu') parts.push('--no-mmproj-offload --image-min-tokens 1024');
        else parts.push('--image-min-tokens 1024');
      }
      parts.push('--fit off');
      if (m.moe) {
        parts.push('--n-gpu-layers 99');
        if (this.moeMode === 'all') parts.push('--cpu-moe');
        if (this.moeMode === 'n') parts.push(`--n-cpu-moe ${this.nCpuMoe}`);
      } else {
        parts.push(`--n-gpu-layers ${Math.min(this.nGpuLayers, m.layers)}`);
      }
      if (this.mtpOn) parts.push(`--spec-type draft-mtp --spec-draft-n-max ${this.mtpN}`);
      parts.push(
        `-c ${this.ctx} -fa on -np ${this.parallel}`,
        `--cache-type-k ${this.kvType} --cache-type-v ${this.kvType}`,
        '--jinja --reasoning on',
        '--temp 0.6 --top-p 0.95 --top-k 20 --min-p 0.0 --presence-penalty 0.0',
        '--host 127.0.0.1',
      );
      return parts.join(' \\\n  ');
    },
    fileName() {
      if (this.modelId === 'qwen36-35b-a3b') return `Qwen3.6-35B-A3B-MTP-${this.quant}.gguf`;
      if (this.modelId === 'bonsai') return 'Ternary-Bonsai-2-27B-PTQ1_0.gguf';
      return 'Qwen3.5-9B-Claude-Opus-Q4_K_M.gguf';
    },
  },
  methods: {
    onModelChange() {
      this.quant = this.model.defaultQuant;
      this.nGpuLayers = this.model.layers;
      if (!this.model.mtpGiB) this.mtp = false;
    },
    applyVideoPreset() {
      this.modelId = 'qwen36-35b-a3b';
      this.quant = 'MXFP4_MOE';
      this.ctxIndex = this.ctxSteps.indexOf(131072);
      this.kvType = 'q8_0';
      this.moeMode = 'all';
      this.mtp = true;
      this.mtpN = 2;
      this.mmproj = 'cpu';
      this.parallel = 1;
    },
  },
};
</script>
