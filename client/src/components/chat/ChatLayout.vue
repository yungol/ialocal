<template>
  <div class="flex h-screen">
    <div class="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col flex-shrink-0">
      <ChatList
        :chats="chats"
        :active-id="chatId"
        @select="onSelectChat"
        @new-chat="onNewChat"
        @delete="onDeleteChat"
        @navigate="$emit('navigate', $event)"
      />
    </div>
    <div class="flex-1 flex flex-col min-w-0">
      <ChatView
        ref="chatView"
        :chat-id="chatId"
        :poll-tick="pollTick"
        @title-changed="onTitleChanged"
        @chat-created="onChatCreated"
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
      pollInterval: null,
      pollTick: 0,
    };
  },
  mounted() {
    this.init();
  },
  beforeUnmount() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  },
  methods: {
    async init() {
      try {
        const current = await loadChat();
        this.chatId = current.chat.id || null;
        await this.loadChatList();
      } catch {
        // server not ready yet, poll will recover
      }
      this.pollInterval = setInterval(() => this.loadChatList(), 5000);
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
        await this.loadChatList();
      } catch {
        // ignore
      }
    },
    async onDeleteChat(id) {
      await deleteChat(id);
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
