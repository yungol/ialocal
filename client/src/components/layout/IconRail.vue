<template>
  <nav
    class="w-16 bg-neutral-950 h-screen flex flex-col items-center py-4 border-r border-neutral-800/70 flex-shrink-0"
  >
    <!-- Brand mark -->
    <button
      class="w-9 h-9 mb-7 flex items-center justify-center flex-shrink-0 rounded-xl hover:opacity-80 transition-opacity"
      title="HiPanda"
      @click="$emit('navigate', 'chat')"
    >
      <img src="../../assets/pandaV2.png" alt="HiPanda" class="w-9 h-9" />
    </button>

    <div class="flex flex-col gap-2">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="$emit('navigate', item.id)"
        class="group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
        :class="active === item.id
          ? 'bg-neutral-800 text-neutral-100'
          : 'text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-200'"
        :aria-label="item.label"
      >
        <span class="material-icons text-[22px]">{{ item.icon }}</span>

        <!-- Active indicator -->
        <span
          v-if="active === item.id"
          class="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-neutral-100"
        ></span>

        <!-- Hover tooltip -->
        <span
          class="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-100 text-xs font-medium whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50 shadow-xl ring-1 ring-neutral-700/50"
        >
          {{ item.label }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'IconRail',
  props: {
    active: { type: String, default: 'chat' },
  },
  emits: ['navigate'],
  data() {
    return {
      navItems: [
        { id: 'chat', label: 'Chat', icon: 'forum' },
        { id: 'images', label: 'Imagenes', icon: 'image' },
        { id: 'management', label: 'Gestion', icon: 'dns' },
      ],
    };
  },
};
</script>
