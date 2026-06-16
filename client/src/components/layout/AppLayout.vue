<template>
  <div class="flex bg-neutral-950 h-screen overflow-hidden">
    <IconRail :active="activeView" @navigate="onNavigate" />
    <main
      :class="activeView === 'chat' || activeView === 'images'
        ? 'flex-1 min-w-0 overflow-hidden'
        : 'flex-1 min-w-0 overflow-auto'"
    >
      <ChatLayout v-if="activeView === 'chat'" />
      <ImageGenView v-else-if="activeView === 'images'" />
      <ManagementView v-else-if="activeView === 'management'" />
    </main>
  </div>
</template>

<script>
import IconRail from './IconRail.vue';
import ChatLayout from '../chat/ChatLayout.vue';
import ImageGenView from '../images/ImageGenView.vue';
import ManagementView from '../management/ManagementView.vue';

export default {
  name: 'AppLayout',
  components: { IconRail, ChatLayout, ImageGenView, ManagementView },
  data() {
    return {
      activeView: 'chat',
    };
  },
  methods: {
    onNavigate(view) {
      this.activeView = view;
    },
  },
};
</script>
