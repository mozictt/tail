<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useChatService } from '@/services/chatService'
import { useToast } from '@/composables/useToast'
import type { ChatMessage } from '@/types/chat'
import { MessageType } from '@/types/chat'

const props = defineProps<{
  message: ChatMessage
  isSelf: boolean
  conversationId: string
  showAvatar: boolean
  isHighlighted?: boolean
}>()

const chatStore = useChatStore()
const chatService = useChatService()
const toast = useToast()

const showContextMenu = ref(false)
const isEditing = ref(false)
const editContent = ref('')
const showReactions = ref(false)

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🙏']

/** Waktu pesan */
const timeStr = computed(() => {
  return new Date(props.message.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

/** Cek apakah sudah dibaca semua peserta */
const isReadByAll = computed(() => (props.message.readReceipts ?? []).length > 0)

/** Multi-field reply count parser */
const replyCount = computed(() => {
  const m = props.message as any
  const storeReplies = chatStore.threadMessagesMap[String(props.message.id)] ?? []
  const localCount = storeReplies.length
  const msgReplyCount =
    typeof m?.replyCount === 'number'
      ? m.replyCount
      : typeof m?.reply_count === 'number'
        ? m.reply_count
        : typeof m?.threadsCount === 'number'
          ? m.threadsCount
          : typeof m?.threadCount === 'number'
            ? m.threadCount
            : typeof m?._count?.threads === 'number'
              ? m._count.threads
              : typeof m?._count?.replies === 'number'
                ? m._count.replies
                : typeof m?._count?.threadReplies === 'number'
                  ? m._count.threadReplies
                  : Array.isArray(m?.threads)
                    ? m.threads.length
                    : 0

  return Math.max(localCount, msgReplyCount)
})

/** Helper aman untuk mengambil timestamp millis dari reply message */
const getReplyTimestamp = (r: any): number => {
  const rawDate =
    r.createdAt ||
    r.created_at ||
    r.created_at_time ||
    r.updatedAt ||
    r.updated_at
  if (!rawDate) return 0
  const t = new Date(rawDate).getTime()
  return isNaN(t) ? 0 : t
}

/** Helper untuk mengecek apakah balasan thread dikirim oleh user sendiri */
const isOwnReply = (r: any): boolean => {
  const authStore = useAuthStore()
  const myId = authStore.id_user
  const myUsername = authStore.username

  const actualSenderId =
    r.senderId || (r as any).sender?.id || (r as any).sender_id || (r as any).userId || (r as any).user_id
  if (myId && actualSenderId != null && String(actualSenderId) === String(myId)) return true

  const actualUsername =
    r.senderUsername || (r as any).sender?.username || (r as any).username
  if (myUsername && actualUsername && actualUsername === myUsername) return true

  return false
}

/** Jumlah balasan thread yang belum dibaca */
const unreadThreadCount = computed(() => {
  const pIdStr = String(props.message.id)

  // 1. Jika thread sedang aktif terbuka di panel saat ini -> 0 (terbaca)
  if (String(chatStore.activeThreadMessageId) === pIdStr) return 0

  // 2. Ambil nilai unreadThreadCount dari objek pesan (dikalkulasi dari chat_message_read_receipts oleh backend & store)
  const msgUnread = (props.message as any).unreadThreadCount
  return typeof msgUnread === 'number' ? msgUnread : 0
})

/** Cek apakah ada balasan thread yang belum dibaca */
const hasUnreadThread = computed(() => unreadThreadCount.value > 0)

/** Balasan thread yang sudah dipreload di cache store */
const threadReplies = computed(
  () => chatStore.threadMessagesMap[String(props.message.id)] ?? [],
)

/** Avatar unik dari para replier (maks 3) */
const replierAvatars = computed(() => {
  const seen = new Set<string>()
  const result: { initials: string; color: string }[] = []
  for (const r of threadReplies.value) {
    const rawSender = (r as any).sender || (r as any).user || {}
    const sId = r.senderId || rawSender.id || (r as any).sender_id || (r as any).userId || (r as any).user_id
    const key = String(sId || Math.random())
    if (seen.has(key)) continue
    seen.add(key)

    const name =
      r.senderUsername ||
      rawSender.username ||
      rawSender.pegawai?.name ||
      (r as any).username ||
      (sId ? `User #${sId}` : 'User')

    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-indigo-500 to-blue-600',
    ]
    let hash = 0
    for (const ch of name) { hash = (hash << 5) - hash + ch.charCodeAt(0); hash |= 0 }
    result.push({ initials: name[0]?.toUpperCase() ?? '?', color: colors[Math.abs(hash) % colors.length] })
    if (result.length >= 3) break
  }
  return result
})

/** Waktu balasan terakhir di thread */
const lastReplyTimeStr = computed(() => {
  if (!threadReplies.value.length) return ''
  const last = threadReplies.value[threadReplies.value.length - 1]
  return new Date(last.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
})

/** Grouped reactions — guard terhadap null/undefined dari backend */
const groupedReactions = computed(() => {
  const reactions = props.message.reactions ?? []
  const map: Record<string, { count: number; hasOwn: boolean }> = {}
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, hasOwn: false }
    map[r.emoji].count++
  }
  return Object.entries(map).map(([emoji, data]) => ({ emoji, ...data }))
})

/** Edit pesan */
const startEdit = () => {
  editContent.value = props.message.content ?? ''
  isEditing.value = true
  showContextMenu.value = false
}

const submitEdit = async () => {
  if (!editContent.value.trim()) return
  try {
    const updated = await chatService.updateMessage(props.conversationId, props.message.id, {
      content: editContent.value.trim(),
    })
    chatStore.updateMessage(updated as ChatMessage)
    isEditing.value = false
  } catch {
    toast.error('Gagal mengedit pesan')
  }
}

const cancelEdit = () => {
  isEditing.value = false
}

/** Hapus pesan */
const deleteMsg = async () => {
  showContextMenu.value = false
  try {
    await chatService.deleteMessage(props.conversationId, props.message.id)
    chatStore.deleteMessageLocal(props.conversationId, props.message.id)
  } catch {
    toast.error('Gagal menghapus pesan')
  }
}

/** Toggle reaksi */
const toggleEmoji = async (emoji: string) => {
  showReactions.value = false
  try {
    await chatService.toggleReaction(props.conversationId, props.message.id, emoji)
  } catch {
    toast.error('Gagal menambah reaksi')
  }
}
const senderDisplayName = computed(() => {
  return (
    props.message.senderUsername ||
    (props.message as any).sender?.pegawai?.name ||
    (props.message as any).sender?.username ||
    `User #${props.message.senderId}`
  )
})
</script>

<template>
  <div
    class="flex items-end gap-2 group/msg relative"
    :class="isSelf ? 'flex-row-reverse' : 'flex-row'"
    @mouseleave="showContextMenu = false; showReactions = false"
  >
    <!-- Avatar (untuk pesan orang lain) -->
    <div class="w-8 h-8 flex-shrink-0" :class="isSelf ? 'hidden' : ''">
      <div
        v-if="showAvatar"
        class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
      >
        {{ senderDisplayName[0]?.toUpperCase() ?? '?' }}
      </div>
    </div>

    <!-- Bubble + meta -->
    <div class="flex flex-col max-w-[70%] md:max-w-[60%]" :class="isSelf ? 'items-end' : 'items-start'">
      <!-- Sender name (grup, bukan self) -->
      <span
        v-if="showAvatar && !isSelf"
        class="text-[11px] font-semibold text-primary mb-0.5 ml-1"
      >
        {{ senderDisplayName }}
      </span>

      <!-- Highlight Badge Notification Indicator -->
      <div
        v-if="isHighlighted"
        class="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 shadow-sm animate-bounce"
      >
        <span>📍 Pesan dari Notifikasi</span>
      </div>

      <!-- Reply indicator — hanya tampil di Thread Panel, bukan di Main Chat -->
      <!-- Komentar: Jangan hapus block ini, sudah disabled via v-if="false" -->
      <div v-if="false" class="hidden" />

      <!-- Bubble -->
      <div class="relative">
        <div
          class="rounded-2xl px-3.5 pt-2 pb-2 text-[14.5px] leading-relaxed break-words shadow-sm min-w-[80px] transition-all duration-300"
          :class="[
            isHighlighted
              ? 'ring-4 ring-amber-400 dark:ring-amber-500 bg-amber-100 text-slate-900 dark:bg-amber-950 dark:text-amber-100 shadow-2xl scale-[1.02] animate-pulse'
              : isSelf
              ? 'bg-primary text-primary-content rounded-br-none'
              : 'bg-base-200 text-base-content rounded-bl-none border border-base-content/5',
            message.isDeleted ? 'opacity-60 italic' : '',
          ]"
        >
          <!-- Deleted -->
          <template v-if="message.isDeleted">
            <Icon name="lucide:ban" class="w-3.5 h-3.5 inline mr-1 opacity-60" />
            Pesan dihapus
          </template>

          <!-- Editing mode -->
          <template v-else-if="isEditing">
            <textarea
              v-model="editContent"
              class="w-full bg-transparent outline-none resize-none min-w-[200px]"
              rows="2"
              autofocus
              @keydown.enter.ctrl="submitEdit"
              @keydown.escape="cancelEdit"
            />
            <div class="flex gap-2 mt-2 justify-end">
              <button class="btn btn-ghost btn-xs" @click="cancelEdit">Batal</button>
              <button class="btn btn-primary btn-xs text-primary-content" @click="submitEdit">Simpan</button>
            </div>
          </template>

          <!-- Image -->
          <template v-else-if="message.type === MessageType.IMAGE && message.attachmentUrl">
            <img
              :src="message.attachmentUrl"
              :alt="message.attachmentName ?? 'gambar'"
              class="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition mb-1"
              loading="lazy"
            />
            <span v-if="message.content">{{ message.content }}</span>
          </template>

          <!-- File -->
          <template v-else-if="message.type === MessageType.FILE && message.attachmentUrl">
            <a
              :href="message.attachmentUrl"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 hover:underline mb-1"
            >
              <Icon name="lucide:file" class="w-4 h-4 flex-shrink-0" />
              <span class="truncate max-w-[150px]">{{ message.attachmentName ?? 'File' }}</span>
              <Icon name="lucide:download" class="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            </a>
          </template>

          <!-- Text -->
          <template v-else>
            <span>{{ message.content }}</span>
            <span v-if="message.isEdited" class="text-[10px] opacity-60 ml-1">(diedit)</span>
          </template>

          <!-- Time & read status (Inside Bubble, floated to bottom right) -->
          <div
            class="inline-flex items-center gap-1 float-right mt-3 ml-4 -mb-1"
            :class="isSelf ? 'text-primary-content/80' : 'text-base-content/50'"
          >
            <span class="text-[10px] leading-none">{{ timeStr }}</span>
            <Icon
              v-if="isSelf"
              name="lucide:check-check"
              class="w-3.5 h-3.5 leading-none"
              :class="isReadByAll ? (isSelf ? 'text-info-content' : 'text-info') : 'opacity-70'"
            />
          </div>
          <div class="clear-both"></div>
        </div>

        <!-- Action buttons trigger (hover) -->
        <div
          v-if="!message.isDeleted"
          class="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-all duration-150 z-20 flex items-center gap-1 bg-base-100 shadow-md border border-base-content/20 rounded-full px-2 py-1"
          :class="isSelf ? 'right-full mr-2' : 'left-full ml-2'"
        >
          <!-- Quick Thread Reply button -->
          <button
            class="flex items-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded-full transition"
            title="Balas di Thread"
            @click="chatStore.openThread(message.id, message)"
          >
            <Icon name="lucide:message-square-reply" class="w-4 h-4 text-primary flex-shrink-0" />
            <span class="text-[11px] font-bold text-primary whitespace-nowrap">Balas</span>
          </button>

          <div class="w-px h-3 bg-base-content/20 flex-shrink-0"></div>

          <!-- More options button -->
          <button
            class="p-0.5 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-200 transition flex items-center justify-center"
            title="Opsi Lainnya"
            @click="showContextMenu = !showContextMenu"
          >
            <Icon name="lucide:more-vertical" class="w-4 h-4 text-base-content flex-shrink-0" />
          </button>
        </div>

        <!-- Context menu dropdown -->
        <div
          v-if="showContextMenu"
          class="absolute z-20 bg-base-100 border border-base-content/10 rounded-xl shadow-xl py-1 min-w-[150px]"
          :class="isSelf ? 'right-0 bottom-8' : 'left-0 bottom-8'"
        >
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 transition text-primary font-medium"
            @click="chatStore.openThread(message.id, message); showContextMenu = false"
          >
            <Icon name="lucide:message-square-reply" class="w-4 h-4" />
            Balas di Thread
          </button>
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 transition"
            @click="showReactions = !showReactions; showContextMenu = false"
          >
            <Icon name="lucide:smile" class="w-4 h-4 text-amber-500" />
            Reaksi
          </button>
          <button
            v-if="isSelf"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 transition"
            @click="startEdit"
          >
            <Icon name="lucide:pencil" class="w-4 h-4 text-blue-500" />
            Edit
          </button>
          <button
            v-if="isSelf"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 transition text-error"
            @click="deleteMsg"
          >
            <Icon name="lucide:trash-2" class="w-4 h-4" />
            Hapus
          </button>
        </div>

        <!-- Emoji picker -->
        <div
          v-if="showReactions"
          class="absolute z-20 bg-base-100 border border-base-content/10 rounded-2xl shadow-xl p-2 flex gap-1.5"
          :class="isSelf ? 'right-0 bottom-8' : 'left-0 bottom-8'"
        >
          <button
            v-for="emoji in EMOJI_LIST"
            :key="emoji"
            class="text-xl hover:scale-125 transition-transform duration-100 leading-none"
            @click="toggleEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <!-- ─── Thread Preview (Google Chat Style) ─────────────────────────── -->
      <!--
        Tampil jika pesan ini adalah pesan induk (root) yang punya balasan thread.
        Google Chat style: avatar repliers + teks ringkas + waktu balasan terakhir
      -->
      <button
        v-if="replyCount > 0 || hasUnreadThread"
        class="group/thread mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200 max-w-full"
        :class="[
          hasUnreadThread
            ? 'bg-primary/8 border-primary/25 hover:bg-primary/12'
            : 'bg-base-200/50 border-base-content/10 hover:bg-base-200 hover:border-base-content/20',
        ]"
        @click.stop="chatStore.openThread(message.id, message)"
      >
        <!-- Avatars repliers (maks 3) -->
        <div class="flex -space-x-1.5 flex-shrink-0">
          <div
            v-for="(av, i) in replierAvatars"
            :key="i"
            class="w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-base-100 flex-shrink-0"
            :class="av.color"
          >
            {{ av.initials }}
          </div>
          <div
            v-if="replierAvatars.length === 0"
            class="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-base-content/30 ring-1 ring-base-100"
          >
            <Icon name="lucide:message-circle" class="w-3 h-3" />
          </div>
        </div>

        <!-- Label teks: unread atau total balasan -->
        <span
          class="flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0"
          :class="hasUnreadThread ? 'text-primary' : 'text-base-content/60'"
        >
          <!-- Ada unread -->
          <template v-if="hasUnreadThread">
            <span class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
            <span>{{ unreadThreadCount }} pesan belum dibaca</span>
          </template>
          <!-- Sudah dibaca semua -->
          <template v-else>
            <span>{{ replyCount }} balasan</span>
          </template>
        </span>

        <!-- Waktu balasan terakhir -->
        <span
          v-if="lastReplyTimeStr"
          class="text-[10px] text-base-content/35 flex-shrink-0 ml-0.5"
        >
          · {{ lastReplyTimeStr }}
        </span>

        <!-- Indikator hover -->
        <span
          class="ml-auto text-[10px] font-medium text-primary opacity-0 group-hover/thread:opacity-100 transition-opacity flex-shrink-0"
        >
          Buka
        </span>
        <Icon
          name="lucide:chevron-right"
          class="w-3 h-3 flex-shrink-0 text-base-content/25 group-hover/thread:text-primary transition-colors"
        />
      </button>

      <!-- Reactions -->
      <div v-if="groupedReactions.length > 0" class="flex flex-wrap gap-1 mt-1 px-1">
        <button
          v-for="r in groupedReactions"
          :key="r.emoji"
          class="flex items-center gap-1 text-xs bg-base-200 hover:bg-base-300 border border-base-content/10 rounded-full px-2 py-0.5 transition"
          @click="toggleEmoji(r.emoji)"
        >
          <span>{{ r.emoji }}</span>
          <span class="text-base-content/60">{{ r.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
