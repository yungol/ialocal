<template>
  <div class="flex h-full">
    <aside
      class="bg-neutral-950 border-r border-neutral-800/70 flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden"
      :class="sidebarOpen ? 'w-72' : 'w-0 border-r-0'"
    >
      <ChatList
        :chats="chats"
        :active-id="chatId"
        @select="onSelectChat"
        @new-chat="onNewChat"
        @delete="onDeleteChat"
      />
    </aside>
    <div class="flex-1 flex flex-col min-w-0">
      <div
        v-if="error"
        class="mx-auto mt-3 max-w-3xl w-full px-6"
      >
        <div class="bg-red-950/40 border border-red-800/60 rounded-lg px-3.5 py-2 text-xs flex items-center justify-between gap-2">
          <span class="text-red-400">{{ error }}</span>
          <button class="material-icons text-[14px] text-red-400/70 hover:text-red-300" @click="error = ''">close</button>
        </div>
      </div>
      <ChatView
        ref="chatView"
        :chat-id="chatId"
        :poll-tick="pollTick"
        :sidebar-open="sidebarOpen"
        @toggle-sidebar="sidebarOpen = !sidebarOpen"
        @title-changed="onTitleChanged"
        @chat-created="onChatCreated"
        @turn-complete="loadChatList"
      />
    </div>
  </div>
</template>

<script>
import ChatList from './ChatList.vue';
import ChatView from './ChatView.vue';
import { loadChat, deleteChat, listChats, createChat } from '../../composables/useApi';

export default {
  name: 'ChatLayout',
  components: { ChatList, ChatView },
  data() {
    return {
      chatId: null,
      chats: [],
      pollTick: 0,
      error: '',
      sidebarOpen: true,
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      try {
        const current = await loadChat();
        this.chatId = current.chat.id || null;
        await this.loadChatList();
      } catch {
        // server not ready yet; loadChatById retries on its own
      }
    },
    async loadChatList() {
      try {
        this.chats = await listChats();
        if (!this.chatId && this.chats.length > 0) {
          this.chatId = this.chats[0].id;
        }
      } catch {
        // ignore
      }
      this.pollTick++;
    },
    onSelectChat(id) {
      this.chatId = id;
    },
    async onNewChat() {
      try {
        const chat = await createChat();
        this.chatId = chat.id;
        this.error = '';
        await this.loadChatList();
      } catch (err) {
        this.error = `No se pudo crear el chat: ${err.message || err}`;
      }
    },
    async onDeleteChat(id) {
      try {
        await deleteChat(id);
        this.error = '';
      } catch (err) {
        this.error = `No se pudo borrar el chat: ${err.message || err}`;
        return;
      }
      this.loadChatList();
      if (this.chatId === id) {
        this.onNewChat();
      }
    },
    onTitleChanged() {
      this.loadChatList();
    },
    onChatCreated(newId) {
      this.chatId = newId;
      this.loadChatList();
    },
  },
};
</script>
