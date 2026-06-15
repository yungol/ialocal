<template>
  <div class="flex flex-col h-full">
    <div class="border-b border-neutral-800">
      <div class="px-3 py-2 flex items-center gap-1">
        <button
          v-for="item in quickNav"
          :key="item.id"
          class="material-icons text-sm p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
          :title="item.label"
          @click="$emit('navigate', item.id)"
        >{{ item.icon }}</button>
        <div class="flex-1"></div>
      </div>
      <div class="px-3 pb-2">
        <button
          class="w-full text-left text-[13px] text-neutral-300 hover:text-neutral-100 transition-colors flex items-center gap-2"
          @click="$emit('new-chat')"
        >
          <span class="material-icons text-base">add</span>
          Nuevo chat
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-for="chat in visibleChats" :key="chat.id">
        <button
          class="w-full text-left px-3 py-2 hover:bg-neutral-800/50 transition-colors flex items-center justify-between gap-2 group"
          :class="chat.id === activeId ? 'bg-neutral-800' : ''"
          @click="$emit('select', chat.id)"
        >
          <span class="text-[13px] text-neutral-300 truncate flex-1">
            {{ chat.title || 'Nuevo chat' }}
          </span>
          <span class="text-[10px] text-neutral-600 group-hover:text-neutral-500 flex-shrink-0">
            {{ relativeTime(chat.updatedAt) }}
          </span>
          <button
            class="material-icons text-sm text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            @click.stop="$emit('delete', chat.id)"
          >
            close
          </button>
        </button>
      </div>

      <button
        v-if="chats.length > 5"
        class="w-full text-left px-3 py-2 text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors"
        @click="showAll = true"
      >
        Ver mas...
      </button>
    </div>

    <!-- Full list modal -->
    <div
      v-if="showAll"
      class="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-20"
      @click.self="showAll = false"
    >
      <div class="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl">
        <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <h3 class="text-sm font-medium text-neutral-200">Todos los chats</h3>
          <button class="material-icons text-neutral-500 hover:text-neutral-300 text-lg" @click="showAll = false">close</button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <button
            v-for="chat in chats.slice(0, 50)"
            :key="chat.id"
            class="w-full text-left px-4 py-2.5 hover:bg-neutral-800/50 transition-colors flex items-center justify-between gap-3 group border-b border-neutral-800/50"
            :class="chat.id === activeId ? 'bg-neutral-800' : ''"
            @click="selectAndClose(chat.id)"
          >
            <span class="text-[13px] text-neutral-300 truncate flex-1">
              {{ chat.title || 'Nuevo chat' }}
            </span>
            <span class="text-[10px] text-neutral-600 flex-shrink-0">
              {{ relativeTime(chat.updatedAt) }}
            </span>
            <button
              class="material-icons text-sm text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              @click.stop="deleteAndRefresh(chat.id)"
            >
              close
            </button>
          </button>
          <div v-if="chats.length === 0" class="text-neutral-500 text-sm text-center py-8">
            No hay chats todavia.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { DateTime } from 'luxon';

function relativeTime(ts) {
  const dt = DateTime.fromMillis(ts);
  const now = DateTime.now();
  const diff = now.diff(dt, ['years', 'months', 'days', 'hours', 'minutes']).toObject();

  if (diff.years >= 1) return Math.floor(diff.years) + 'a';
  if (diff.months >= 1) return Math.floor(diff.months) + 'm';
  if (diff.days >= 7) {
    const weeks = Math.floor(diff.days / 7);
    return weeks === 1 ? '1 sem' : weeks + ' sem';
  }
  if (diff.days >= 2) return Math.floor(diff.days) + 'd';
  if (diff.days >= 1) return 'Ayer';
  if (diff.hours >= 1) return 'Hoy';
  if (diff.minutes >= 1) return Math.floor(diff.minutes) + ' min';
  return 'Ahora';
}

export default {
  name: 'ChatList',
  props: {
    chats: { type: Array, default: () => [] },
    activeId: { type: String, default: null },
  },
  emits: ['select', 'new-chat', 'delete', 'navigate'],
  data() {
    return {
      showAll: false,
      quickNav: [
        { id: 'images', label: 'Imagenes', icon: 'image' },
        { id: 'management', label: 'Gestion', icon: 'dns' },
      ],
    };
  },
  computed: {
    visibleChats() {
      return this.chats.slice(0, 5);
    },
  },
  methods: {
    relativeTime,
    selectAndClose(id) {
      this.showAll = false;
      this.$emit('select', id);
    },
    deleteAndRefresh(id) {
      this.$emit('delete', id);
    },
  },
};
</script>
