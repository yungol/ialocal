<template>
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
    <h3 class="text-[12px] font-medium text-neutral-400 mb-3">VRAM</h3>
    <div class="flex items-center gap-4">
      <div class="w-20 h-20 flex-shrink-0">
        <canvas ref="chart"></canvas>
      </div>
      <div>
        <div class="text-neutral-200 font-mono text-base">
          {{ used }} <span class="text-neutral-600 text-xs">/ {{ total }} GB</span>
        </div>
        <div class="text-neutral-600 text-[11px] mt-1">
          {{ free }} GB libre
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip);

export default {
  name: 'VramBar',
  props: {
    used: { type: Number, default: 0 },
    total: { type: Number, default: 8 },
    free: { type: Number, default: 8 },
  },
  data() {
    return {
      chart: null,
    };
  },
  watch: {
    used() {
      this.updateChart();
    },
    total() {
      this.updateChart();
    },
  },
  mounted() {
    this.createChart();
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  },
  methods: {
    createChart() {
      const ctx = this.$refs.chart.getContext('2d');
      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [
            {
              data: [this.used, Math.max(0, this.total - this.used)],
              backgroundColor: ['#525252', '#262626'],
              borderColor: ['#404040', '#1a1a1a'],
              borderWidth: 3,
            },
          ],
        },
        options: {
          cutout: '70%',
          plugins: { tooltip: { enabled: false } },
          events: [],
        },
      });
    },
    updateChart() {
      if (this.chart) {
        this.chart.data.datasets[0].data = [this.used, Math.max(0, this.total - this.used)];
        this.chart.update();
      }
    },
  },
};
</script>
