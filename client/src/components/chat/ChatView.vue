<template>
  <div class="flex flex-col h-full bg-neutral-950">
    <header class="flex items-center justify-between gap-4 px-4 h-14 border-b border-neutral-800/70 flex-shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <button
          class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors flex-shrink-0"
          :aria-label="sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'"
          @click="$emit('toggle-sidebar')"
        >
          <span class="material-icons text-[20px]">{{ sidebarOpen ? 'first_page' : 'last_page' }}</span>
        </button>
        <h2 class="text-[15px] font-semibold text-neutral-100 truncate">{{ title || 'Chat' }}</h2>
        <button
          v-if="messages.length > 0"
          class="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 flex-shrink-0"
          @click="clearCurrentChat"
        >
          <span class="material-icons text-[14px]">cleaning_services</span>
          Limpiar
        </button>
      </div>
      <ModelSelector v-model="model" @select="onModelSelected" @loaded="onModelsLoaded" />
    </header>

    <div v-if="statusMessage" class="mx-auto mt-3 max-w-3xl w-full px-6">
      <div class="bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2 text-xs flex items-center gap-2">
        <span
          v-if="statusType === 'loading'"
          class="material-icons text-[14px] text-amber-500/80 animate-spin"
        >autorenew</span>
        <span :class="statusType === 'loading' ? 'text-amber-500/90' : 'text-red-400'">
          {{ statusMessage }}
        </span>
      </div>
    </div>

    <MessageList :messages="messages" :streaming="streaming" />
    <ChatInput :disabled="streaming" :show-quick-actions="messages.length === 0" :vision="selectedVision" @send="onSend" />
  </div>
</template>

<script>
import ModelSelector from './ModelSelector.vue';
import MessageList from './MessageList.vue';
import ChatInput from './ChatInput.vue';
import { streamChat } from '../../composables/useChat';
import { saveChat, getChat, generateTitle, createChat, getSettings, saveSettings } from '../../composables/useApi';

export default {
  name: 'ChatView',
  components: { ModelSelector, MessageList, ChatInput },
  props: {
    chatId: { type: String, default: null },
    pollTick: { type: Number, default: 0 },
    sidebarOpen: { type: Boolean, default: true },
  },
  emits: ['title-changed', 'chat-created', 'turn-complete', 'toggle-sidebar'],
  computed: {
    // True when the currently selected model is vision-capable (loaded with an
    // mmproj). Drives the image-attach button in ChatInput.
    selectedVision() {
      const m = this.availableModels.find((x) => x.id === this.model);
      return !!(m && m.vision);
    },
  },
  data() {
    return {
      title: '',
      model: '',
      messages: [],
      streaming: false,
      statusMessage: '',
      statusType: 'loading',
      saveTimeout: null,
      // Default model resolution
      defaultModel: '', // persisted user preference (last selected chat model)
      availableModels: [], // models reported by ModelSelector
      modelLocked: false, // true when the current chat has its own saved model
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
          this.modelLocked = false;
          this.model = this.pickDefaultModel();
        }
      },
    },
    pollTick() {
      if (this.chatId && this.messages.length === 0 && this.title === 'Nuevo chat') {
        this.loadChatById(this.chatId);
      }
    },
  },
  async mounted() {
    try {
      const settings = await getSettings();
      this.defaultModel = settings.chatModel || '';
      // A chat without its own model follows the persisted preference
      if (!this.modelLocked) {
        this.model = this.pickDefaultModel();
      }
    } catch {
      // no settings yet, fall back to first available model
    }
  },
  methods: {
    pickDefaultModel() {
      if (this.defaultModel && this.availableModels.some((m) => m.id === this.defaultModel)) {
        return this.defaultModel;
      }
      return this.availableModels[0]?.id || '';
    },
    onModelsLoaded(models) {
      this.availableModels = models;
      if (!this.modelLocked) {
        this.model = this.pickDefaultModel();
      }
    },
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
            this.modelLocked = true;
          } else {
            this.modelLocked = false;
            this.model = this.pickDefaultModel();
          }
        }
        this.statusMessage = '';
      } catch (err) {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          return this.loadChatById(id, retries - 1);
        }
        // Only show the error if the user is still looking at this chat.
        if (this.chatId === id) {
          this.statusMessage = `No se pudo cargar el chat: ${err.message || err}`;
          this.statusType = 'error';
        }
      }
    },
    onModelSelected(modelId) {
      if (!modelId) return;
      // Remember this choice as the global default for future new chats
      this.defaultModel = modelId;
      this.modelLocked = true;
      saveSettings({ chatModel: modelId }).catch((err) => this.reportSaveError(err, this.chatId));
      if (this.chatId) {
        const id = this.chatId;
        saveChat(id, this.messages, modelId).catch((err) => this.reportSaveError(err, id));
      }
    },
    reportSaveError(err, id) {
      // Only surface the failure if the user is still on the chat that failed.
      if (id && this.chatId !== id) return;
      this.statusMessage = `No se pudo guardar: ${err?.message || err}`;
      this.statusType = 'error';
    },
    // Debounced save bound to an explicit target so a chat switch mid-stream
    // can never redirect a save to the wrong chat.
    persist(id, messages, model) {
      if (!id) return;
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        saveChat(id, messages, model).catch((err) => this.reportSaveError(err, id));
      }, 500);
    },
    isDefaultTitle() {
      return !this.title || this.title === 'Nuevo chat' || /^Chat \d+$/.test(this.title);
    },
    maybeGenerateTitle(id, messages, model) {
      if (!this.isDefaultTitle() || !id) return;
      const userMsg = messages.find((m) => m.role === 'user');
      const assistantMsg = messages.find((m) => m.role === 'assistant' && m.content);
      if (!userMsg || !assistantMsg) return;

      generateTitle(userMsg.content, assistantMsg.content, model)
        .then((res) => {
          if (res?.title) {
            // Only reflect the new title in the header if still on this chat.
            if (this.chatId === id) this.title = res.title;
            saveChat(id, undefined, undefined, res.title).catch((err) => this.reportSaveError(err, id));
            this.$emit('title-changed');
          }
        })
        .catch(() => {});
    },
    async clearCurrentChat() {
      if (this.chatId) {
        const id = this.chatId;
        try {
          await saveChat(id, []);
        } catch (err) {
          this.reportSaveError(err, id);
          return;
        }
      }
      this.messages = [];
    },
    // Build the OpenAI-format messages sent upstream. User turns that carry an
    // attached image become multimodal content arrays (text + image_url).
    buildApiMessages(conversation) {
      return conversation
        .filter((m) => (m.content && m.content !== '') || m.image)
        .map((m) => {
          if (m.role === 'user' && m.image) {
            const parts = [];
            if (m.content) parts.push({ type: 'text', text: m.content });
            parts.push({ type: 'image_url', image_url: { url: m.image } });
            return { role: 'user', content: parts };
          }
          return { role: m.role, content: m.content };
        });
    },
    onSend({ content, image }) {
      if (!this.model) {
        this.statusMessage = 'Selecciona un modelo primero.';
        this.statusType = 'error';
        return;
      }

      // Bind the whole turn to the chat that was active when sending. If the
      // user switches chats mid-stream, tokens keep flowing into THIS chat's
      // array and save to THIS chat's file — never the one now on screen.
      const targetId = this.chatId;
      const targetModel = this.model;
      const conversation = this.messages;

      this.statusMessage = '';
      conversation.push({ role: 'user', content, image: image || null });
      conversation.push({ role: 'assistant', content: '', reasoning: '' });

      this.streaming = true;
      this.statusMessage = 'cargando modelo...';
      this.statusType = 'loading';

      // Status/streaming flags belong to the on-screen chat only.
      const onScreen = () => this.chatId === targetId;

      streamChat({
        model: targetModel,
        messages: this.buildApiMessages(conversation),
        onReasoning: (text) => {
          if (onScreen()) this.statusMessage = '';
          const last = conversation[conversation.length - 1];
          if (last && last.role === 'assistant') {
            last.reasoning = (last.reasoning || '') + text;
          }
          this.persist(targetId, conversation, targetModel);
        },
        onToken: (text) => {
          const last = conversation[conversation.length - 1];
          if (last && last.role === 'assistant') {
            last.content += text;
          }
          this.persist(targetId, conversation, targetModel);
        },
        onDone: () => {
          if (onScreen()) {
            this.streaming = false;
            this.statusMessage = '';
          }
          this.persist(targetId, conversation, targetModel);
          this.maybeGenerateTitle(targetId, conversation, targetModel);
          // Refresh the sidebar once the turn is done (updated timestamp, etc.)
          this.$emit('turn-complete');
        },
        onError: (err) => {
          const last = conversation[conversation.length - 1];
          if (last && last.role === 'assistant' && !last.content && !last.reasoning) {
            conversation.pop();
          }
          if (onScreen()) {
            this.streaming = false;
            this.statusMessage = typeof err === 'string' ? err : 'Error de conexion';
            this.statusType = 'error';
          }
          this.persist(targetId, conversation, targetModel);
        },
      });
    },
  },
};
</script>
