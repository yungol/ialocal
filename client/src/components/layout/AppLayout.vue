<template>
  <div class="flex bg-neutral-950 min-h-screen">
    <NavSidebar v-if="activeView !== 'chat'" :active="activeView" @navigate="onNavigate" />
    <main :class="activeView === 'chat' ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto'">
      <ChatLayout v-if="activeView === 'chat'" @navigate="onNavigate" />
      <ImageGenView v-else-if="activeView === 'images'" />
      <ManagementView v-else-if="activeView === 'management'" />
    </main>
  </div>
</template>

<script>
import NavSidebar from './NavSidebar.vue';
import ChatLayout from '../chat/ChatLayout.vue';
import ImageGenView from '../images/ImageGenView.vue';
import ManagementView from '../management/ManagementView.vue';

export default {
  name: 'AppLayout',
  components: { NavSidebar, ChatLayout, ImageGenView, ManagementView },
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
