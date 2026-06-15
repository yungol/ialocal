<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-medium text-neutral-300">{{ title || 'Chat' }}</h2>
        <button
          v-if="messages.length > 0"
          class="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
          @click="clearCurrentChat"
        >
          Limpiar
        </button>
      </div>
      <ModelSelector v-model="model" @select="onModelSelected" />
    </div>

    <div v-if="statusMessage" class="mx-4 mt-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs">
      <span :class="statusType === 'loading' ? 'text-amber-500/80' : 'text-red-400'">
        {{ statusMessage }}
      </span>
    </div>

    <MessageList :messages="messages" :streaming="streaming" />
    <ChatInput :disabled="streaming" @send="onSend" />
  </div>
</template>

<script>
import ModelSelector from './ModelSelector.vue';
import MessageList from './MessageList.vue';
import ChatInput from './ChatInput.vue';
import { streamChat } from '../../composables/useChat';
import { saveChat, getChat, generateTitle, createChat } from '../../composables/useApi';

export default {
  name: 'ChatView',
  components: { ModelSelector, MessageList, ChatInput },
  props: {
    chatId: { type: String, default: null },
    pollTick: { type: Number, default: 0 },
  },
  emits: ['title-changed', 'chat-created'],
  data() {
    return {
      title: '',
      model: '',
      messages: [],
      streaming: false,
      statusMessage: '',
      statusType: 'loading',
      saveTimeout: null,
    };
  },
  watch: {
    chatId: {
      immediate: true,
      handler(newId) {
        if (newId) {
          this.loadChatById(newId);
        } else {
          this.messages = [];
          this.title = 'Nuevo chat';
          this.model = '';
        }
      },
    },
    pollTick() {
      if (this.chatId && this.messages.length === 0 && this.title === 'Nuevo chat') {
        this.loadChatById(this.chatId);
      }
    },
  },
  methods: {
    async newChat() {
      try {
        const chat = await createChat();
        this.$emit('chat-created', chat.id);
      } catch {
        // ignore
      }
    },
    async loadChatById(id, retries = 2) {
      try {
        const data = await getChat(id);
        if (data && data.messages) {
          this.messages = data.messages;
          this.title = data.title || '';
          if (data.model) {
            this.model = data.model;
          }
        }
      } catch {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          return this.loadChatById(id, retries - 1);
        }
      }
    },
    onModelSelected(modelId) {
      if (this.chatId && modelId) {
        saveChat(this.chatId, this.messages, modelId).catch(() => {});
      }
    },
    scheduleSave() {
      if (!this.chatId) return;
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        saveChat(this.chatId, this.messages, this.model).catch(() => {});
      }, 500);
    },
    isDefaultTitle() {
      return !this.title || this.title === 'Nuevo chat' || /^Chat \d+$/.test(this.title);
    },
    maybeGenerateTitle() {
      if (!this.isDefaultTitle() || !this.chatId) return;
      const userMsg = this.messages.find((m) => m.role === 'user');
      const assistantMsg = this.messages.find((m) => m.role === 'assistant' && m.content);
      if (!userMsg || !assistantMsg) return;

      generateTitle(userMsg.content, assistantMsg.content, this.model)
        .then((res) => {
          if (res?.title) {
            this.title = res.title;
            saveChat(this.chatId, undefined, undefined, res.title).catch(() => {});
            this.$emit('title-changed');
          }
        })
        .catch(() => {});
    },
    async clearCurrentChat() {
      if (this.chatId) {
        try {
          await saveChat(this.chatId, []);
        } catch {
          // ignore
        }
      }
      this.messages = [];
    },
    onSend(content) {
      if (!this.model) {
        this.statusMessage = 'Selecciona un modelo primero.';
        this.statusType = 'error';
        return;
      }

      this.statusMessage = '';
      this.messages.push({ role: 'user', content });
      this.messages.push({ role: 'assistant', content: '', reasoning: '' });

      this.streaming = true;
      this.statusMessage = 'cargando modelo...';
      this.statusType = 'loading';

      streamChat({
        model: this.model,
        messages: this.messages.filter((m) => m.content !== ''),
        onReasoning: (text) => {
          this.statusMessage = '';
          const last = this.messages[this.messages.length - 1];
          if (last && last.role === 'assistant') {
            last.reasoning = (last.reasoning || '') + text;
          }
          this.scheduleSave();
        },
        onToken: (text) => {
          const last = this.messages[this.messages.length - 1];
          if (last && last.role === 'assistant') {
            last.content += text;
          }
          this.scheduleSave();
        },
        onDone: () => {
          this.streaming = false;
          this.statusMessage = '';
          this.scheduleSave();
          this.maybeGenerateTitle();
        },
        onError: (err) => {
          this.streaming = false;
          const last = this.messages[this.messages.length - 1];
          if (last && last.role === 'assistant' && !last.content && !last.reasoning) {
            this.messages.pop();
          }
          this.statusMessage = typeof err === 'string' ? err : 'Error de conexion';
          this.statusType = 'error';
          this.scheduleSave();
        },
      });
    },
  },
};
</script>
