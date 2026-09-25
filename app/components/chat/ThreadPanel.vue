<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useChatService } from '@/services/chatService'
import { useToast } from '@/composables/useToast'
import { MessageType } from '@/types/chat'
import { useChatSocket } from '@/composables/useChatSocket'

const chatStore = useChatStore()
const authStore = useAuthStore()
const chatService = useChatService()
const chatSocket = useChatSocket()
const toast = useToast()

const replyContent = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)

const activeMessage = computed(() => chatStore.activeThreadMessage)
const replies = computed(() => chatStore.activeThreadReplies)
const conversationId = computed(() => chatStore.activeConversationId)

/** Sender name untuk parent message */
const parentSenderName = computed(() => {
  if (!activeMessage.value) return '?'
  const m = activeMessage.value as any
  return m.senderUsername || m.sender?.pegawai?.name || m.sender?.username || `User #${m.senderId}`
})

/** Format waktu singkat */
const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

/** Format tanggal untuk divider */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hari ini'
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
}

/** Kelompokkan balasan berdasarkan tanggal */
const groupedReplies = computed(() => {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  for (const reply of replies.value) {
    const dateKey = new Date(reply.createdAt).toDateString()
    const existing = groups.find((g) => g.date === dateKey)
    if (existing) {
      existing.messages.push(reply)
    } else {
      groups.push({ date: dateKey, messages: [reply] })
    }
  }
  return groups
})

/** Auto-resize textarea */
const autoResize = () => {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = Math.min(textarea.value.scrollHeight, 120) + 'px'
}

/** Scroll ke bawah daftar reply */
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (!scrollContainer.value) return
    scrollContainer.value.scrollTo({
      top: scrollContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  })
}

/** Kirim balasan thread */
const sendReply = async () => {
  const text = replyContent.value.trim()
  if (!text || !conversationId.value || !activeMessage.value || isSubmitting.value) return

  const dto: SendMessageDto = {
    content: text,
    type: MessageType.TEXT,
    parentMessageId: activeMessage.value.id,
  }

  isSubmitting.value = true
  const sentText = replyContent.value
  replyContent.value = ''

  try {
    if (chatSocket.isConnected.value) {
      chatSocket.sendMessage({
        conversationId: conversationId.value,
        message: dto,
      })
    } else {
      const savedMsg = await chatService.sendMessage(conversationId.value, dto)
      if (savedMsg) {
        chatStore.appendMessage(savedMsg as ChatMessage)
      }
    }
    nextTick(() => {
      if (textarea.value) textarea.value.style.height = 'auto'
      scrollToBottom(true)
    })
  } catch (err: any) {
    replyContent.value = sentText
    toast.error(err?.data?.message || 'Gagal mengirim balasan thread')
  } finally {
    isSubmitting.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendReply()
  }
}

/** Cek apakah reply milik user sendiri */
const isSelf = (reply: any): boolean => {
  const myId = authStore.id_user
  const myUsername = authStore.username
  const sId = reply.senderId || reply.sender?.id
  if (myId && sId != null && String(sId) === String(myId)) return true
  const sUsername = reply.senderUsername || reply.sender?.username || ''
  if (myUsername && sUsername && sUsername === myUsername) return true
  return false
}

/** Nama pengirim dari reply */
const getSenderName = (reply: any): string =>
  reply.senderUsername ||
  reply.sender?.pegawai?.name ||
  reply.sender?.username ||
  `User #${reply.senderId}`

/** Warna avatar deterministik berdasarkan nama */
const getAvatarColor = (name: string) => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-green-500 to-emerald-600',
    'from-sky-500 to-blue-600',
  ]
  let hash = 0
  for (const ch of name) { hash = (hash << 5) - hash + ch.charCodeAt(0); hash |= 0 }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Tampilkan header sender jika berbeda dari pesan sebelumnya
 * atau jika jeda waktu > 5 menit.
 */
const showSenderHeader = (reply: any, idx: number, list: any[]): boolean => {
  if (idx === 0) return true
  const prev = list[idx - 1]
  const prevSId = prev.senderId || prev.sender?.id
  const currSId = reply.senderId || reply.sender?.id
  if (String(prevSId) !== String(currSId)) return true
  const gap = new Date(reply.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return gap > 5 * 60 * 1000
}

// Auto scroll saat ada reply baru
watch(() => replies.value.length, () => scrollToBottom(true))
onMounted(() => scrollToBottom())
</script>

<template>
  <!-- Thread Panel — Google Chat Overlay Style -->
  <div class="absolute inset-0 z-30 flex">
    <!-- Backdrop — klik untuk tutup -->
    <div
      class="absolute inset-0 bg-base-300/10 backdrop-blur-[1px]"
      @click="chatStore.closeThread()"
    />

    <!-- Panel -->
    <div class="relative ml-auto flex flex-col w-full max-w-[360px] md:max-w-[400px] h-full bg-base-100 shadow-2xl border-l border-base-content/10 z-10">

      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3.5 border-b border-base-content/10 bg-base-100/95 backdrop-blur-sm flex-shrink-0">
        <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <Icon name="lucide:message-square-reply" class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-sm text-base-content">Thread</h3>
          <p class="text-[11px] text-base-content/50">
            {{ replies.length > 0 ? `${replies.length} balasan` : 'Belum ada balasan' }}
          </p>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content flex-shrink-0"
          title="Tutup Thread"
          @click="chatStore.closeThread()"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto scrollbar-thin">

        <!-- Pesan Induk -->
        <div
          v-if="activeMessage"
          class="mx-3 mt-4 mb-1 rounded-2xl border border-base-content/8 bg-base-200/40"
        >
          <div class="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
            <div
              class="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              :class="getAvatarColor(parentSenderName)"
            >
              {{ parentSenderName[0]?.toUpperCase() ?? '?' }}
            </div>
            <div class="flex items-baseline gap-1.5 min-w-0">
              <span class="text-xs font-bold text-base-content truncate">{{ parentSenderName }}</span>
              <span class="text-[10px] text-base-content/35 flex-shrink-0">
                {{ formatTime(activeMessage.createdAt) }}
              </span>
            </div>
          </div>
          <p class="text-sm text-base-content/80 leading-relaxed break-words px-3.5 pb-3 mt-0.5">
            {{ activeMessage.content }}
          </p>
        </div>

        <!-- Divider -->
        <div v-if="replies.length > 0" class="flex items-center gap-2 px-4 mt-4 mb-2">
          <div class="h-px flex-1 bg-base-content/10" />
          <span class="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider whitespace-nowrap">
            {{ replies.length }} Balasan
          </span>
          <div class="h-px flex-1 bg-base-content/10" />
        </div>

        <!-- Loading -->
        <div v-if="chatStore.isLoadingThread" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-md text-primary" />
        </div>

        <!-- Empty -->
        <div
          v-else-if="replies.length === 0 && !chatStore.isLoadingThread"
          class="flex flex-col items-center justify-center py-10 px-6 text-center"
        >
          <div class="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-3 text-primary/40">
            <Icon name="lucide:messages-square" class="w-6 h-6" />
          </div>
          <p class="text-sm font-semibold text-base-content/50">Belum ada balasan</p>
          <p class="text-[11px] text-base-content/35 mt-1">Jadilah yang pertama membalas!</p>
        </div>

        <!-- Replies -->
        <template v-else>
          <template v-for="group in groupedReplies" :key="group.date">
            <div v-if="groupedReplies.length > 1" class="flex items-center gap-2 px-4 my-3">
              <div class="h-px flex-1 bg-base-content/8" />
              <span class="text-[10px] font-medium text-base-content/35 whitespace-nowrap">
                {{ formatDate(group.messages[0]!.createdAt) }}
              </span>
              <div class="h-px flex-1 bg-base-content/8" />
            </div>

            <div
              v-for="(reply, idx) in group.messages"
              :key="reply.id"
              class="group/reply px-4 hover:bg-base-200/30 transition-colors"
            >
              <!-- Sender header -->
              <div
                v-if="showSenderHeader(reply, idx, group.messages)"
                class="flex items-center gap-2 mt-3 mb-0.5"
              >
                <div
                  class="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  :class="getAvatarColor(getSenderName(reply))"
                >
                  {{ getSenderName(reply)[0]?.toUpperCase() ?? '?' }}
                </div>
                <span
                  class="text-xs font-bold"
                  :class="isSelf(reply) ? 'text-primary' : 'text-base-content'"
                >
                  {{ isSelf(reply) ? 'Anda' : getSenderName(reply) }}
                </span>
                <span class="text-[10px] text-base-content/35">
                  {{ formatTime(reply.createdAt) }}
                </span>
              </div>

              <!-- Content -->
              <div
                class="text-sm text-base-content/85 leading-relaxed break-words pb-0.5"
                :class="showSenderHeader(reply, idx, group.messages) ? 'ml-9' : 'ml-9 mt-0.5'"
              >
                <template v-if="reply.isDeleted">
                  <span class="italic text-base-content/40 text-xs">
                    <Icon name="lucide:ban" class="w-3 h-3 inline mr-0.5 opacity-50" />
                    Pesan dihapus
                  </span>
                </template>
                <template v-else-if="reply.type === 'IMAGE' && reply.attachmentUrl">
                  <img
                    :src="reply.attachmentUrl"
                    :alt="reply.attachmentName ?? 'gambar'"
                    class="max-w-[200px] rounded-lg mt-1 cursor-pointer hover:opacity-90 transition"
                    loading="lazy"
                  />
                  <p v-if="reply.content" class="mt-1">{{ reply.content }}</p>
                </template>
                <template v-else>
                  <span>{{ reply.content }}</span>
                  <span v-if="reply.isEdited" class="text-[10px] opacity-40 ml-1">(diedit)</span>
                </template>
                <span
                  v-if="!showSenderHeader(reply, idx, group.messages)"
                  class="text-[10px] text-base-content/30 ml-2 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                >
                  {{ formatTime(reply.createdAt) }}
                </span>
              </div>
            </div>
          </template>
          <div class="h-4" />
        </template>
      </div>

      <!-- Footer / Input -->
      <div class="px-3 py-3 border-t border-base-content/10 bg-base-100 flex-shrink-0">
        <div class="flex items-center gap-1.5 mb-2 px-1">
          <Icon name="lucide:corner-down-right" class="w-3 h-3 text-primary/50 flex-shrink-0" />
          <span class="text-[10px] text-base-content/45 truncate">
            Balas thread
            <span v-if="activeMessage" class="font-semibold text-base-content/60">
              {{ parentSenderName }}
            </span>
          </span>
        </div>
        <div class="flex items-end gap-2 bg-base-200/50 border border-base-content/10 rounded-2xl px-3.5 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            ref="textarea"
            v-model="replyContent"
            placeholder="Ketik balasan... (Enter untuk kirim)"
            rows="1"
            class="flex-1 bg-transparent outline-none resize-none text-sm text-base-content placeholder:text-base-content/35 leading-relaxed max-h-[120px] overflow-y-auto scrollbar-thin"
            @keydown="onKeydown"
            @input="autoResize"
          />
          <button
            class="btn btn-primary btn-sm btn-circle flex-shrink-0 transition-all duration-150"
            :class="replyContent.trim() && !isSubmitting ? 'opacity-100 scale-100' : 'opacity-40 scale-95'"
            :disabled="!replyContent.trim() || isSubmitting"
            title="Kirim Balasan (Enter)"
            @click="sendReply"
          >
            <span v-if="isSubmitting" class="loading loading-spinner loading-xs" />
            <Icon v-else name="lucide:send" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.12);
  border-radius: 2px;
}
</style>
