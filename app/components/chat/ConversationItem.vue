<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ChatConversation, ChatParticipant } from '@/types/chat'
import { ConversationType } from '@/types/chat'

const props = defineProps<{
  conversation: ChatConversation
  isActive: boolean
  isOnline?: boolean
}>()

const authStore = useAuthStore()

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ambil display name dari participant.
 * Backend mengembalikan struktur nested: participant.user.username / pegawai.name
 * Fallback ke participant.username jika ada (flat mapping).
 */
const getParticipantName = (p: ChatParticipant): string =>
  p.user?.pegawai?.name || p.user?.username || p.username || `User #${p.userId}`

/**
 * Ambil user ID yang sebenarnya dari participant.
 * Gunakan userId (kolom FK), bukan id (PK record participant).
 */
const getParticipantUserId = (p: ChatParticipant): number =>
  p.userId ?? p.user?.id ?? p.id

/**
 * Cek apakah participant adalah diri sendiri.
 * Multi-field comparison untuk menghindari mismatch tipe (string vs number).
 * Fallback ke username jika ID tidak cocok.
 */
const isSelf = (p: ChatParticipant): boolean => {
  const myId = authStore.id_user
  const myUsername = authStore.username

  // Bandingkan via userId & user.id (konversi ke string agar aman)
  const participantUserId = String(getParticipantUserId(p))
  if (myId && participantUserId !== 'undefined' && participantUserId !== 'null') {
    if (participantUserId === String(myId)) return true
  }

  // Fallback: bandingkan via username (selalu string, tidak ada ambiguitas tipe)
  const participantUsername = p.user?.username || p.username || ''
  if (myUsername && participantUsername) {
    if (participantUsername === myUsername) return true
  }

  return false
}

// ─── Computed ─────────────────────────────────────────────────────────────────

/** Participant lawan bicara (bukan diri sendiri) */
const otherParticipant = computed(() => {
  return props.conversation.participants?.find((p) => !isSelf(p)) ?? null
})

/** Nama tampilan percakapan */
const displayName = computed(() => {
  if (props.conversation.type === ConversationType.GROUP) {
    return props.conversation.name ?? 'Grup Tanpa Nama'
  }
  if (!otherParticipant.value) return 'Percakapan'
  return getParticipantName(otherParticipant.value)
})

/** Inisial avatar */
const avatarInitials = computed(() =>
  displayName.value
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join(''),
)

/** Warna avatar dari hash nama */
const avatarColor = computed(() => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-sky-500 to-cyan-600',
    'from-green-500 to-emerald-600',
  ]
  let hash = 0
  for (const ch of displayName.value) {
    hash = (hash << 5) - hash + ch.charCodeAt(0)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
})

/** Preview pesan terakhir */
const lastMessagePreview = computed(() => {
  const msg = props.conversation.lastMessage
  if (!msg) return 'Belum ada pesan'
  if (msg.isDeleted) return '🚫 Pesan dihapus'
  if (msg.type === 'image') return '📷 Gambar'
  if (msg.type === 'file') return `📎 ${msg.attachmentName ?? 'File'}`
  if (msg.type === 'audio') return '🎵 Audio'
  return msg.content ?? ''
})

/** Format waktu relatif */
const relativeTime = computed(() => {
  const ts = props.conversation.lastActivityAt
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} mnt`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hr`
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
})
</script>

<template>
  <div
    class="flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl cursor-pointer transition-all duration-150 group"
    :class="[
      isActive
        ? 'bg-primary/10 border border-primary/20'
        : 'hover:bg-base-200/60 border border-transparent',
    ]"
  >
    <!-- Avatar -->
    <div class="relative flex-shrink-0">
      <div
        v-if="conversation.avatarUrl"
        class="w-11 h-11 rounded-full overflow-hidden ring-2"
        :class="isActive ? 'ring-primary/30' : 'ring-base-content/10'"
      >
        <img :src="conversation.avatarUrl" :alt="displayName" class="w-full h-full object-cover" />
      </div>
      <div
        v-else
        class="w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold ring-2"
        :class="[avatarColor, isActive ? 'ring-primary/30' : 'ring-base-content/10']"
      >
        {{ avatarInitials }}
      </div>

      <!-- Online indicator (direct chat) -->
      <span
        v-if="isOnline && conversation.type !== ConversationType.GROUP"
        class="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full ring-2 ring-base-100"
      />
      <!-- Group icon -->
      <span
        v-else-if="conversation.type === ConversationType.GROUP"
        class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full ring-2 ring-base-100 flex items-center justify-center"
      >
        <Icon name="lucide:users" class="w-2.5 h-2.5 text-white" />
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-1">
        <span
          class="text-sm font-semibold truncate"
          :class="isActive ? 'text-primary' : 'text-base-content'"
        >
          {{ displayName }}
        </span>
        <span class="text-[10px] text-base-content/40 flex-shrink-0">
          {{ relativeTime }}
        </span>
      </div>
      <div class="flex items-center justify-between gap-1 mt-0.5">
        <p class="text-xs text-base-content/50 truncate">
          {{ lastMessagePreview }}
        </p>
        <!-- Unread badge -->
        <span
          v-if="conversation.unreadCount > 0"
          class="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-primary-content text-[10px] font-bold rounded-full flex items-center justify-center px-1"
        >
          {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
        </span>
      </div>
    </div>
  </div>
</template>
