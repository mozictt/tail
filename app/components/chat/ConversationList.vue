<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import type { ChatConversation } from '@/types/chat'
import ConversationItem from './ConversationItem.vue'

const props = defineProps<{
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'select', conversation: ChatConversation): void
  (e: 'new-conversation'): void
}>()

const chatStore = useChatStore()

const authStore = useAuthStore()

/**
 * Resolve userId dari participant (bukan id record)
 */
const getParticipantUserId = (p: any): number => p.userId ?? p.user?.id ?? p.id

/**
 * Ambil nama tampilan participant (handle nested struktur backend)
 */
const getParticipantName = (p: any): string =>
  p.user?.pegawai?.name || p.user?.username || p.username || ''

const filtered = computed(() => {
  const q = props.searchQuery.toLowerCase().trim()
  if (!q) return chatStore.conversations
  return chatStore.conversations.filter((c) => {
    // Untuk grup: pakai nama grup
    if (c.name) return c.name.toLowerCase().includes(q)
    // Untuk direct: pakai nama peserta
    const names = (c.participants ?? []).map((p) => getParticipantName(p)).join(' ')
    return names.toLowerCase().includes(q)
  })
})

/**
 * Cek apakah participant adalah diri sendiri (multi-field, robust).
 */
const isSelf = (p: any): boolean => {
  const myId = authStore.id_user
  const myUsername = authStore.username
  // Cek via userId
  const pid = String(p.userId ?? p.user?.id ?? p.id)
  if (myId && pid !== 'undefined' && pid !== 'null' && pid === String(myId)) return true
  // Fallback via username
  const pname = p.user?.username || p.username || ''
  if (myUsername && pname && pname === myUsername) return true
  return false
}

/**
 * Cek apakah participant lawan bicara dalam percakapan online.
 */
const getOtherUserId = (conv: ChatConversation): number => {
  const other = conv.participants?.find((p) => !isSelf(p))
  return other ? (other.userId ?? (other as any).user?.id ?? other.id ?? 0) : 0
}

const handleSelect = (conv: ChatConversation) => {
  emit('select', conv)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Loading skeleton -->
    <div v-if="chatStore.isLoadingConversations" class="p-3 space-y-2">
      <div
        v-for="i in 5"
        :key="i"
        class="flex items-center gap-3 p-2 rounded-xl animate-pulse"
      >
        <div class="w-11 h-11 rounded-full bg-base-300 flex-shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-base-300 rounded w-2/3" />
          <div class="h-2.5 bg-base-300 rounded w-full" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filtered.length === 0"
      class="flex flex-col items-center justify-center flex-1 p-6 text-center"
    >
      <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mb-4">
        <Icon name="lucide:message-square-off" class="w-7 h-7 text-base-content/30" />
      </div>
      <p class="text-sm font-medium text-base-content/50">
        {{ searchQuery ? 'Percakapan tidak ditemukan' : 'Belum ada percakapan' }}
      </p>
      <button
        v-if="!searchQuery"
        class="mt-4 btn btn-primary btn-sm gap-2"
        @click="$emit('new-conversation')"
      >
        <Icon name="lucide:plus" class="w-4 h-4" />
        Mulai Chat Baru
      </button>
    </div>

    <!-- Conversation list -->
    <div v-else class="overflow-y-auto flex-1 scrollbar-thin">
      <ConversationItem
        v-for="conv in filtered"
        :key="conv.id"
        :conversation="conv"
        :is-active="chatStore.activeConversationId === conv.id"
        :is-online="!!chatStore.onlineUsers[getOtherUserId(conv)]"
        @click="handleSelect(conv)"
      />
    </div>
  </div>
</template>
