<template>
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
    <p class="text-xs text-neutral-400 mb-3">
      Frase: <span class="text-neutral-200">"El gato se subio al ..."</span> — el modelo da una probabilidad a cada
      palabra posible. Los filtros sacan palabras de la ruleta y la temperatura cambia el tamano de cada porcion.
    </p>

    <div class="grid gap-5 lg:grid-cols-2">
      <div class="space-y-3 text-xs">
        <label v-for="s in sliders" :key="s.key" class="block">
          <div class="flex justify-between text-neutral-400">
            <span>{{ s.label }}</span>
            <span class="font-mono text-neutral-200">{{ $data[s.key] }}</span>
          </div>
          <input v-model.number="$data[s.key]" type="range" :min="s.min" :max="s.max" :step="s.step" class="w-full" />
          <div class="text-[10px] text-neutral-500">{{ s.hint }}</div>
        </label>
        <div class="flex gap-2 pt-1">
          <button
            class="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-900 text-[11px] font-medium hover:bg-white"
            @click="spin"
          >
            Girar la ruleta
          </button>
          <button
            class="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 hover:text-neutral-200 text-[11px]"
            @click="setVideoValues"
          >
            Valores del video
          </button>
        </div>
        <div v-if="picked" class="text-sm text-neutral-300">
          El gato se subio al <span class="text-emerald-400 font-semibold">{{ picked }}</span>
        </div>
      </div>

      <div class="space-y-1">
        <div v-for="t in result" :key="t.word" class="flex items-center gap-2 text-[11px]">
          <span class="w-16 text-right" :class="t.alive ? 'text-neutral-200' : 'text-neutral-600 line-through'">
            {{ t.word }}
          </span>
          <div class="flex-1 h-3.5 bg-neutral-950 rounded overflow-hidden">
            <div
              class="h-full transition-all duration-300"
              :class="t.word === picked ? 'bg-emerald-400' : t.alive ? 'bg-sky-500' : 'bg-neutral-800'"
              :style="{ width: (t.alive ? t.p : t.raw) * 100 + '%' }"
            ></div>
          </div>
          <span class="w-12 font-mono text-neutral-500">{{ t.alive ? (t.p * 100).toFixed(1) + '%' : t.reason }}</span>
        </div>
        <p class="text-[10px] text-neutral-500 pt-2">
          Orden real de llama.cpp: top-k → top-p → min-p → temperatura. Los filtros miran las probabilidades
          originales y la temperatura se aplica al final sobre las que sobrevivieron.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
// Toy next-token logits for the sentence "El gato se subio al ...".
const LOGITS = [
  ['techo', 3.2],
  ['arbol', 2.9],
  ['sofa', 2.4],
  ['tejado', 2.2],
  ['auto', 1.3],
  ['piano', 0.8],
  ['muro', 0.5],
  ['cohete', -0.6],
  ['platano', -1.4],
  ['volcan', -2.0],
];

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export default {
  name: 'SamplingPlayground',
  data() {
    return {
      temp: 0.6,
      topK: 20,
      topP: 0.95,
      minP: 0,
      picked: null,
      sliders: [
        { key: 'temp', label: 'Temperatura (--temp)', min: 0.05, max: 2, step: 0.05, hint: 'Baja = siempre lo obvio. Alta = se anima a palabras raras.' },
        { key: 'topK', label: 'Top-K (--top-k)', min: 1, max: 20, step: 1, hint: 'Solo las K mas probables entran a la ruleta.' },
        { key: 'topP', label: 'Top-P (--top-p)', min: 0.05, max: 1, step: 0.05, hint: 'Entran las mas probables hasta sumar P.' },
        { key: 'minP', label: 'Min-P (--min-p)', min: 0, max: 0.5, step: 0.01, hint: 'Fuera las que tengan menos de P x la probabilidad de la mejor.' },
      ],
    };
  },
  computed: {
    result() {
      const raw = softmax(LOGITS.map(([, l]) => l));
      const tokens = LOGITS.map(([word, logit], i) => ({ word, logit, raw: raw[i], alive: true, reason: '' }));

      tokens.forEach((t, i) => {
        if (i >= this.topK) Object.assign(t, { alive: false, reason: 'top-k' });
      });
      let cumulative = 0;
      tokens.forEach((t) => {
        if (!t.alive) return;
        if (cumulative >= this.topP) Object.assign(t, { alive: false, reason: 'top-p' });
        cumulative += t.raw;
      });
      const best = tokens[0].raw;
      tokens.forEach((t) => {
        if (t.alive && t.raw < this.minP * best) Object.assign(t, { alive: false, reason: 'min-p' });
      });

      const alive = tokens.filter((t) => t.alive);
      const tempered = softmax(alive.map((t) => t.logit / this.temp));
      alive.forEach((t, i) => {
        t.p = tempered[i];
      });
      return tokens;
    },
  },
  watch: {
    result() {
      this.picked = null;
    },
  },
  methods: {
    spin() {
      const alive = this.result.filter((t) => t.alive);
      let r = Math.random();
      for (const t of alive) {
        r -= t.p;
        if (r <= 0) {
          this.picked = t.word;
          return;
        }
      }
      this.picked = alive[alive.length - 1].word;
    },
    setVideoValues() {
      Object.assign(this, { temp: 0.6, topK: 20, topP: 0.95, minP: 0 });
    },
  },
};
</script>
