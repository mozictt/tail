<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useChatSocket } from '@/composables/useChatSocket'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import ConversationList from '@/components/chat/ConversationList.vue'
import MessageArea from '@/components/chat/MessageArea.vue'
import MessageInput from '@/components/chat/MessageInput.vue'
import ThreadPanel from '@/components/chat/ThreadPanel.vue'
import NewConversationModal from '@/components/chat/NewConversationModal.vue'
import ChatMediaLightboxModal from '@/components/chat/ChatMediaLightboxModal.vue'
import type { ChatConversation, SendMessageDto } from '@/types/chat'
import { ConversationType } from '@/types/chat'

useHead({ title: 'Chat' }) 
definePageMeta({
  layout: "admin",
});

// ─── Stores & Composables ────────────────────────────────────────────────────

const chatStore = useChatStore()
const authStore = useAuthStore()
const toast = useToast()
const chatSocket = useChatSocket()

// ─── UI State ─────────────────────────────────────────────────────────────────

const searchQuery = ref('')
const showNewModal = ref(false)
const showMobileList = ref(true) // false = tampilkan chat area di mobile

// ─── Computed ─────────────────────────────────────────────────────────────────

const activeConversation = computed(() => chatStore.activeConversation)

/**
 * Helper: cek apakah participant adalah diri sendiri (multi-field, robust).
 */
const isSelf = (p: any): boolean => {
  const myId = authStore.id_user
  const myUsername = authStore.username
  const pid = String(p.userId ?? p.user?.id ?? p.id)
  if (myId && pid !== 'undefined' && pid !== 'null' && pid === String(myId)) return true
  const pname = p.user?.username || p.username || ''
  if (myUsername && pname && pname === myUsername) return true
  return false
}

/**
 * Participant lawan bicara pada percakapan aktif
 */
const otherParticipant = computed(() =>
  activeConversation.value?.participants?.find((p) => !isSelf(p)) ?? null,
)

const displayTitle = computed(() => {
  const conv = activeConversation.value
  if (!conv) return ''
  if (conv.type === ConversationType.GROUP) return conv.name ?? 'Grup'
  if (!otherParticipant.value) return 'Percakapan'
  const p = otherParticipant.value as any
  return p.user?.pegawai?.name || p.user?.username || p.username || 'Percakapan'
})

const participantCount = computed(() => activeConversation.value?.participants?.length ?? 0)
const isGroupChat = computed(() => activeConversation.value?.type === ConversationType.GROUP)

/** userId lawan bicara untuk cek status online */
const otherUserId = computed(() => {
  const p = otherParticipant.value as any
  return p ? (p.userId ?? p.user?.id ?? p.id ?? 0) : 0
})
const isOtherOnline = computed(() => !!chatStore.onlineUsers[otherUserId.value])

// ─── Select Conversation ──────────────────────────────────────────────────────

const selectConversation = async (conv: ChatConversation) => {
  // Jika sebelumnya ada conversation aktif, leave room dulu
  if (chatStore.activeConversationId && chatStore.activeConversationId !== conv.id) {
    chatSocket.leaveConversation(chatStore.activeConversationId)
  }

  // setActiveConversation sudah memanggil markAllRead ke backend secara async
  await chatStore.setActiveConversation(conv.id)

  // Join room WebSocket
  chatSocket.joinConversation(conv.id)

  // Mobile: pindah ke view chat
  showMobileList.value = false
}

// ─── Send Message (via WebSocket) ─────────────────────────────────────────────

const handleSend = (dto: SendMessageDto) => {
  if (!chatStore.activeConversationId) return
  chatSocket.sendMessage({
    conversationId: chatStore.activeConversationId,
    message: dto,
  })
}

// ─── After New Conversation Created ───────────────────────────────────────────

const onConversationCreated = async (conversationId: string) => {
  showNewModal.value = false
  await chatStore.fetchConversations()
  const conv = chatStore.conversations.find((c) => c.id === conversationId)
  if (conv) selectConversation(conv)
}

// ─── Mobile back ─────────────────────────────────────────────────────────────

const goBackToList = () => {
  showMobileList.value = true
}

// ─── WebSocket Event Handlers ─────────────────────────────────────────────────

let cleanupFns: (() => void)[] = []

const setupSocketListeners = () => {
  cleanupFns = [
    chatSocket.onNewMessage((msg) => {
      chatStore.appendMessage(msg)
    }),
    chatSocket.onMessageUpdated((msg) => {
      chatStore.updateMessage(msg)
    }),
    chatSocket.onMessageDeleted(({ messageId }) => {
      if (chatStore.activeConversationId) {
        chatStore.deleteMessageLocal(chatStore.activeConversationId, messageId)
      }
    }),
    chatSocket.onUserTyping((event) => {
      chatStore.setUserTyping(event)
    }),
    chatSocket.onReadReceipt((event) => {
      if (chatStore.activeConversationId) {
        chatStore.applyReadReceipt(chatStore.activeConversationId, event)
      }
    }),
    chatSocket.onNewReaction((event) => {
      if (chatStore.activeConversationId) {
        chatStore.applyReaction(chatStore.activeConversationId, event)
      }
    }),
    chatSocket.onInitialOnlineUsers((event) => {
      chatStore.setOnlineUsers(event.userIds)
    }),
    chatSocket.onUserOnline((event) => {
      chatStore.setUserOnline(event)
    }),
    chatSocket.onUserOffline((event) => {
      chatStore.setUserOffline(event)
    }),
    // Sinkronisasi badge unread antar tab/device user yang sama
    chatSocket.onConversationRead((event) => {
      chatStore.handleConversationRead(event)
    }),
  ]
}

const route = useRoute()

/**
 * Tangani Deep-Linking dari Query Params URL (misal: /chat?convId=xxx&threadId=yyy&msgId=zzz)
 */
const handleDeepLinking = async () => {
  const convIdStr = route.query.convId ? String(route.query.convId) : null
  const threadIdStr = route.query.threadId ? String(route.query.threadId) : null
  const targetMsgId = (route.query.msgId || route.query.messageId)
    ? String(route.query.msgId || route.query.messageId)
    : null

  if (targetMsgId) {
    chatStore.setHighlightMessage(targetMsgId)
  }

  if (convIdStr) {
    if (chatStore.conversations.length === 0) {
      await chatStore.fetchConversations()
    }

    let conv = chatStore.conversations.find((c) => String(c.id) === convIdStr)

    if (!conv) {
      await chatStore.fetchConversations()
      conv = chatStore.conversations.find((c) => String(c.id) === convIdStr)
    }

    if (conv) {
      await selectConversation(conv)
      if (threadIdStr) {
        await chatStore.openThread(threadIdStr)
      }
    }
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  // 1. Fetch percakapan
  await chatStore.fetchConversations()

  // 2. Daftarkan listeners KE REGISTRY TERLEBIH DAHULU sebelum connect,
  //    agar saat event 'connect' diterima, reattachListeners() bisa bekerja.
  setupSocketListeners()

  // 3. Koneksikan WebSocket (menunggu event 'connect' selesai)
  await chatSocket.connect()

  // 4. Set current user sebagai online secara optimistic (lokal)
  if (authStore.id_user) {
    chatStore.setUserOnline({ userId: Number(authStore.id_user) })
  }

  // 5. Minta daftar user online dari server secara eksplisit.
  //    Diberi sedikit jeda agar socket server sudah siap memproses event.
  setTimeout(() => {
    chatSocket.getOnlineUsers()
  }, 500)

  // 6. Tangani deep-linking jika ada query parameter convId / threadId
  await handleDeepLinking()

  // 7. Mulai heartbeat
  chatSocket.startHeartbeat()

  // 8. Handle reconnect: minta ulang daftar online setelah koneksi kembali.
  //    Penting agar status tidak tetap stale setelah internet sempat putus.
  chatSocket.socket.value?.on('connect', () => {
    setTimeout(() => chatSocket.getOnlineUsers(), 500)
    if (authStore.id_user) {
      chatStore.setUserOnline({ userId: Number(authStore.id_user) })
    }
  })
})

watch(
  () => route.query,
  async () => {
    await handleDeepLinking()
  },
  { deep: true },
)

onUnmounted(() => {
  // Cleanup listener khusus halaman chat (socket & store tetap aktif secara global untuk navbar notification)
  cleanupFns.forEach((fn) => fn())
})
</script>

<template>
  <div class="flex h-full bg-base-200/30 -m-4 md:-m-6 overflow-hidden relative" style="height: calc(100vh - 73px)">

    <!-- ─── Panel Kiri: Inbox ─────────────────────────────────────────── -->
    <aside
      class="flex flex-col bg-base-100 border-r border-base-content/10 transition-all duration-300"
      :class="[
        showMobileList ? 'flex' : 'hidden md:flex',
        'w-full md:w-[320px] lg:w-[360px] flex-shrink-0',
      ]"
    >
      <!-- Header inbox -->
      <div class="px-4 pt-5 pb-3 border-b border-base-content/10">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-base-content">Chat</h2>
            <!-- Unread badge -->
            <span
              v-if="chatStore.totalUnread > 0"
              class="bg-primary text-primary-content text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center"
            >
              {{ chatStore.totalUnread > 99 ? '99+' : chatStore.totalUnread }}
            </span>
            <!-- Connection status -->
            <span
              class="w-2 h-2 rounded-full ml-1"
              :class="chatSocket.isConnected.value ? 'bg-success' : 'bg-error'"
              :title="chatSocket.isConnected.value ? 'Terhubung' : 'Terputus'"
            />
          </div>
          <button
            id="new-conversation-btn"
            class="btn btn-primary btn-sm btn-circle shadow-sm"
            title="Percakapan Baru"
            @click="showNewModal = true"
          >
            <Icon name="lucide:pencil-line" class="w-4 h-4" />
          </button>
        </div>

        <!-- Search -->
        <div class="relative">
          <Icon name="lucide:search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari percakapan..."
            class="input input-sm w-full rounded-xl pl-9 bg-base-200/60 border-base-content/10 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 text-sm"
          />
        </div>
      </div>

      <!-- Conversation list -->
      <div class="flex-1 overflow-hidden py-2">
        <ConversationList
          :search-query="searchQuery"
          @select="selectConversation"
          @new-conversation="showNewModal = true"
        />
      </div>
    </aside>

    <!-- ─── Panel Tengah: Area Chat ──────────────────────────────────── -->
    <main
      class="flex-1 flex flex-col min-w-0"
      :class="showMobileList ? 'hidden md:flex' : 'flex'"
    >
      <!-- Empty state (belum pilih conversation) -->
      <template v-if="!activeConversation">
        <div class="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Icon name="lucide:message-square" class="w-12 h-12 text-primary/40" />
          </div>
          <h3 class="text-xl font-bold text-base-content/60 mb-2">Selamat Datang di Chat</h3>
          <p class="text-sm text-base-content/40 max-w-xs">
            Pilih percakapan dari daftar, atau mulai percakapan baru.
          </p>
          <button
            class="mt-6 btn btn-primary gap-2 rounded-xl"
            @click="showNewModal = true"
          >
            <Icon name="lucide:plus" class="w-5 h-5" />
            Percakapan Baru
          </button>
        </div>
      </template>

      <!-- Active conversation -->
      <template v-else>
        <!-- Header percakapan aktif -->
        <header class="bg-base-100 border-b border-base-content/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <!-- Mobile back button -->
          <button
            class="md:hidden btn btn-ghost btn-sm btn-circle mr-1"
            @click="goBackToList"
          >
            <Icon name="lucide:arrow-left" class="w-5 h-5" />
          </button>

          <!-- Avatar -->
          <div class="relative flex-shrink-0">
            <div
              class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold"
            >
              {{ displayTitle[0]?.toUpperCase() ?? '?' }}
            </div>
            <span
              v-if="!isGroupChat && isOtherOnline"
              class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-base-100"
            />
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-base-content text-sm truncate">{{ displayTitle }}</h3>
            <p class="text-xs text-base-content/50">
              <template v-if="isGroupChat">{{ participantCount }} anggota</template>
              <template v-else>
                <span :class="isOtherOnline ? 'text-success' : ''">
                  {{ isOtherOnline ? 'Online' : 'Offline' }}
                </span>
              </template>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1.5">
            <button class="btn btn-ghost btn-sm btn-circle" title="Info Percakapan">
              <Icon name="lucide:info" class="w-4 h-4" />
            </button>
          </div>
        </header>

        <!-- Messages -->
        <div class="flex-1 overflow-hidden">
          <MessageArea />
        </div>

        <!-- Input -->
        <MessageInput
          :conversation-id="activeConversation.id"
          @send="handleSend"
        />
      </template>
    </main>

    <!-- ─── Panel Kanan: Thread Chat (Side Panel) ────────────────────────── -->
    <Transition name="slide-panel">
      <ThreadPanel v-if="chatStore.activeThreadMessageId" />
    </Transition>

    <!-- ─── Modal Percakapan Baru ──────────────────────────────────────── -->
    <NewConversationModal
      v-if="showNewModal"
      @close="showNewModal = false"
      @created="onConversationCreated"
    />

    <!-- ─── Modal Lightbox Media Fullscreen (Galeri Style) ──────────────── -->
    <ChatMediaLightboxModal />
  </div>
</template>

<style scoped>
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
