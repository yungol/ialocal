<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-4 pb-3">
      <button
        class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-100 text-sm font-medium transition-colors"
        @click="$emit('new-chat')"
      >
        <span class="material-icons text-[18px]">add</span>
        Nuevo chat
      </button>
    </div>

    <div class="px-4 pb-1.5">
      <span class="text-[11px] font-medium uppercase tracking-wider text-neutral-600">Recientes</span>
    </div>

    <div class="flex-1 overflow-y-auto px-2 pb-3">
      <div v-for="chat in visibleChats" :key="chat.id">
        <button
          class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-neutral-800/60 transition-colors flex items-center justify-between gap-2 group"
          :class="chat.id === activeId ? 'bg-neutral-800/80' : ''"
          @click="$emit('select', chat.id)"
        >
          <span
            class="text-sm truncate flex-1"
            :class="chat.id === activeId ? 'text-neutral-100' : 'text-neutral-400 group-hover:text-neutral-200'"
          >
            {{ chat.title || 'Nuevo chat' }}
          </span>
          <span
            v-if="chat.id !== activeId"
            class="text-[10px] text-neutral-600 group-hover:hidden flex-shrink-0"
          >
            {{ relativeTime(chat.updatedAt) }}
          </span>
          <span
            class="material-icons text-[16px] text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            @click.stop="$emit('delete', chat.id)"
          >
            close
          </span>
        </button>
      </div>

      <button
        v-if="chats.length > 5"
        class="w-full text-left px-2.5 py-2 mt-1 text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors"
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
  emits: ['select', 'new-chat', 'delete'],
  data() {
    return {
      showAll: false,
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
