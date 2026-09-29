<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import MessageBubble from './MessageBubble.vue'

const chatStore = useChatStore()
const authStore = useAuthStore()

const scrollContainer = ref<HTMLElement | null>(null)
const isAtBottom = ref(true)
const isLoadingMore = ref(false)

const messages = computed(() => {
  // Hanya tampilkan root messages (tanpa parentMessageId)
  // Thread replies tampil di ThreadPanel, bukan di main chat
  const all = chatStore.activeMessages
  return all.filter((m) => {
    const pId =
      m.parentMessageId ||
      (m as any).parent_message_id ||
      (m as any).parentId ||
      (m as any).parent_id ||
      (m as any).parent?.id
    return !pId
  })
})
const conversationId = computed(() => chatStore.activeConversationId)
const typingUsers = computed(() => chatStore.typingInActive)

/** Scroll ke bawah */
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (!scrollContainer.value) return
    scrollContainer.value.scrollTo({
      top: scrollContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  })
}

/** Deteksi apakah scroll di posisi bawah */
const onScroll = async () => {
  if (!scrollContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < 50

  // Load more saat scroll ke atas mendekati top
  if (scrollTop < 100 && !isLoadingMore.value) {
    if (conversationId.value && chatStore.hasMoreMap[conversationId.value]) {
      const prevHeight = scrollContainer.value.scrollHeight
      isLoadingMore.value = true
      await chatStore.loadMoreMessages(conversationId.value)
      isLoadingMore.value = false
      // Pertahankan posisi scroll setelah prepend pesan
      nextTick(() => {
        if (!scrollContainer.value) return
        const newHeight = scrollContainer.value.scrollHeight
        scrollContainer.value.scrollTop = newHeight - prevHeight
      })
    }
  }
}

// Auto scroll ke target highlight message jika ada
const scrollToHighlight = () => {
  const targetId = chatStore.highlightedMessageId
  if (!targetId) return
  nextTick(() => {
    setTimeout(() => {
      const el = document.getElementById(`msg-${targetId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 150)
  })
}

watch(
  () => chatStore.highlightedMessageId,
  (val) => {
    if (val) scrollToHighlight()
  },
  { immediate: true },
)

// Auto scroll ke bawah saat ada pesan baru (hanya jika user di posisi bawah)
watch(
  () => messages.value.length,
  (newLen, oldLen) => {
    if (newLen > oldLen && isAtBottom.value) {
      scrollToBottom(true)
    }
    if (chatStore.highlightedMessageId) {
      scrollToHighlight()
    }
  },
)

// Scroll ke bawah saat ganti conversation
watch(conversationId, () => {
  isAtBottom.value = true
  if (chatStore.highlightedMessageId) {
    scrollToHighlight()
  } else {
    nextTick(() => scrollToBottom())
  }
})

onMounted(() => {
  if (chatStore.highlightedMessageId) {
    scrollToHighlight()
  } else {
    scrollToBottom()
  }
})

/** Format tanggal untuk divider */
const formatDateDivider = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hari ini'
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Tentukan apakah perlu tampil date divider antara 2 pesan */
const needDateDivider = (idx: number) => {
  if (idx === 0) return true
  const curr = new Date(messages.value[idx].createdAt)
  const prev = new Date(messages.value[idx - 1].createdAt)
  return curr.toDateString() !== prev.toDateString()
}

/** Cek apakah pesan milik user sendiri */
const isSelf = (senderId: number, senderUsername?: string) => {
  if (authStore.id_user && String(senderId) === String(authStore.id_user)) return true
  if (authStore.username && senderUsername && senderUsername === authStore.username) return true
  return false
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- Load more indicator -->
    <div
      v-if="isLoadingMore"
      class="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-base-100/90 backdrop-blur-sm border border-base-content/10 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg"
    >
      <span class="loading loading-spinner loading-xs text-primary" />
      <span class="text-xs text-base-content/60">Memuat pesan lama...</span>
    </div>

    <!-- Messages scroll area -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin"
      @scroll="onScroll"
    >
      <!-- Empty state -->
      <div
        v-if="messages.length === 0 && !chatStore.isLoadingMessages"
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon name="lucide:message-circle" class="w-9 h-9 text-primary/50" />
        </div>
        <p class="font-semibold text-base-content/60">Belum ada pesan</p>
        <p class="text-sm text-base-content/40 mt-1">Mulai percakapan dengan mengirim pesan 👇</p>
      </div>

      <!-- Loading skeleton -->
      <div v-if="chatStore.isLoadingMessages" class="space-y-3">
        <div v-for="i in 6" :key="i" class="flex gap-3 animate-pulse" :class="i % 2 === 0 ? 'justify-end' : ''">
          <div v-if="i % 2 !== 0" class="w-8 h-8 rounded-full bg-base-300 flex-shrink-0" />
          <div class="space-y-1 max-w-[60%]">
            <div class="h-10 rounded-2xl bg-base-300 w-48" />
            <div class="h-2.5 rounded bg-base-300 w-16" :class="i % 2 === 0 ? 'ml-auto' : ''" />
          </div>
        </div>
      </div>

      <!-- Messages -->
      <template v-else>
        <template v-for="(msg, idx) in messages" :key="msg.id">
          <!-- Date divider -->
          <div v-if="needDateDivider(idx)" class="flex items-center gap-3 my-4">
            <div class="flex-1 h-px bg-base-content/10" />
            <span class="text-xs text-base-content/40 bg-base-100 px-3 py-1 rounded-full border border-base-content/10">
              {{ formatDateDivider(msg.createdAt) }}
            </span>
            <div class="flex-1 h-px bg-base-content/10" />
          </div>

          <MessageBubble
            :id="'msg-' + msg.id"
            :message="msg"
            :is-self="isSelf(msg.senderId, msg.senderUsername)"
            :conversation-id="conversationId!"
            :show-avatar="!isSelf(msg.senderId, msg.senderUsername) && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId)"
            :is-highlighted="String(chatStore.highlightedMessageId) === String(msg.id)"
          />
        </template>
      </template>

      <!-- Typing indicator -->
      <div
        v-if="typingUsers.length > 0"
        class="flex items-end gap-2 mt-2"
      >
        <div class="w-8 h-8 rounded-full bg-base-300 flex-shrink-0 flex items-center justify-center">
          <Icon name="lucide:user" class="w-4 h-4 text-base-content/40" />
        </div>
        <div class="bg-base-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-base-content/40 animate-bounce" style="animation-delay: 0ms" />
          <span class="w-2 h-2 rounded-full bg-base-content/40 animate-bounce" style="animation-delay: 150ms" />
          <span class="w-2 h-2 rounded-full bg-base-content/40 animate-bounce" style="animation-delay: 300ms" />
        </div>
      </div>
    </div>

    <!-- Scroll to bottom button -->
    <Transition name="fade">
      <button
        v-if="!isAtBottom && messages.length > 0"
        class="absolute bottom-4 right-4 btn btn-circle btn-sm btn-primary shadow-lg"
        @click="scrollToBottom(true)"
      >
        <Icon name="lucide:chevron-down" class="w-4 h-4" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.15);
  border-radius: 2px;
}
</style>
