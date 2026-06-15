<template>
  <nav class="w-56 bg-neutral-950 min-h-screen p-3 flex flex-col gap-0.5 border-r border-neutral-800">
    <div class="mb-5 px-2 py-1">
      <h1 class="text-base font-semibold text-neutral-200">AI Server Hub</h1>
    </div>

    <button
      v-for="item in navItems"
      :key="item.id"
      @click="$emit('navigate', item.id)"
      class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors"
      :class="active === item.id
        ? 'bg-neutral-800 text-neutral-100'
        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'"
    >
      <span class="material-icons text-lg">{{ item.icon }}</span>
      <span class="text-[13px]">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script>
export default {
  name: 'NavSidebar',
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
