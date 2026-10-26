<template>
  <div class="p-4 max-w-6xl mx-auto space-y-8 pb-16">
    <header>
      <h2 class="text-sm font-medium text-neutral-300">Explicacion: modelos locales con plastilina</h2>
      <p class="text-xs text-neutral-500 mt-1 max-w-3xl">
        La gran pregunta del video: ¿preferis un modelo que tarda mucho pero da la mejor respuesta de una
        (Bonsai 27B, mucho razonamiento) o uno rapido y "medianamente bueno" con el que iteras vos
        (Qwen3.6-35B-A3B)? Para entenderlo hay que entender como se reparte un modelo entre VRAM y RAM.
      </p>
    </header>

    <section>
      <h3 class="text-xs font-semibold text-neutral-200 uppercase tracking-wider mb-3">1. Los conceptos</h3>
      <div class="grid gap-3 md:grid-cols-2">
        <article
          v-for="c in concepts"
          :key="c.title"
          class="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="material-icons text-[18px] text-amber-400">{{ c.icon }}</span>
            <h4 class="text-sm font-medium text-neutral-100">{{ c.title }}</h4>
          </div>
          <p class="text-xs text-neutral-300 leading-relaxed">{{ c.clay }}</p>
          <p class="text-[11px] text-neutral-500 leading-relaxed mt-2 border-t border-neutral-800 pt-2">
            <span class="text-neutral-400 font-medium">En serio:</span> {{ c.real }}
          </p>
        </article>
      </div>
    </section>

    <section>
      <h3 class="text-xs font-semibold text-neutral-200 uppercase tracking-wider mb-1">2. Simulador: ¿entra en mi PC?</h3>
      <p class="text-xs text-neutral-500 mb-3">
        Mueve las perillas y mira como se llena la mesa (VRAM) y la estanteria (RAM). Arranca con la config del video.
      </p>
      <ConfigSimulator />
    </section>

    <section>
      <h3 class="text-xs font-semibold text-neutral-200 uppercase tracking-wider mb-1">3. La ruleta: como elige cada palabra</h3>
      <p class="text-xs text-neutral-500 mb-3">temp, top-p, top-k y min-p del .bat, en vivo.</p>
      <SamplingPlayground />
    </section>

    <section>
      <h3 class="text-xs font-semibold text-neutral-200 uppercase tracking-wider mb-3">4. El .bat del video, linea por linea</h3>
      <div class="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        <div v-for="f in flags" :key="f.flag" class="grid md:grid-cols-[16rem_1fr] gap-1 md:gap-4 px-4 py-2.5">
          <code class="text-[11px] text-sky-300 break-all">{{ f.flag }}</code>
          <span class="text-xs text-neutral-300">{{ f.what }}</span>
        </div>
      </div>
    </section>

    <section>
      <h3 class="text-xs font-semibold text-neutral-200 uppercase tracking-wider mb-3">5. Lo que dijo el video, revisado</h3>
      <div class="grid gap-3 md:grid-cols-2">
        <article v-for="f in factChecks" :key="f.claim" class="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p class="text-xs text-neutral-200 italic">{{ f.claim }}</p>
          <span class="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-amber-300">
            {{ f.verdict }}
          </span>
          <p class="text-[11px] text-neutral-400 mt-2 leading-relaxed">{{ f.why }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import ConfigSimulator from './ConfigSimulator.vue';
import SamplingPlayground from './SamplingPlayground.vue';
import { CONCEPTS, FLAGS, FACT_CHECKS } from './explanationData';

export default {
  name: 'ExplanationView',
  components: { ConfigSimulator, SamplingPlayground },
  data() {
    return {
      concepts: CONCEPTS,
      flags: FLAGS,
      factChecks: FACT_CHECKS,
    };
  },
};
</script>
