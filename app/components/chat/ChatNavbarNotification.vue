<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as icons from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSlugRoute } from '@/composables/useSlugRoute'
import { useNotificationStore } from '@/stores/notification'
import { useChatStore } from '@/stores/chat'
import { useChatSocket } from '@/composables/useChatSocket'
import { useAuthStore } from '@/stores/auth'
import type { AppNotification } from '@/types/notification'
import type { ChatMessage } from '@/types/chat'

const router = useRouter()
const { slugPath } = useSlugRoute()
const notificationStore = useNotificationStore()
const chatStore = useChatStore()
const chatSocket = useChatSocket()
const authStore = useAuthStore()

const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
let socketCleanup: (() => void) | null = null

// State untuk Toast Notification Popup Real-time
interface ToastData {
  id: string
  title: string
  content: string
  actionUrl?: string | null
  type: string
}

const activeToast = ref<ToastData | null>(null)
let toastTimer: any = null

// Sound Chime Generator menggunakan Web Audio API
const playChimeSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5

    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch (e) {
    // Abaikan jika autoplay diblokir browser
  }
}

// Total unread count gabungan (Pinia Chat Store + Notification Store)
const unreadCount = computed(() => {
  return Math.max(chatStore.totalUnread, notificationStore.unreadCount) || chatStore.totalUnread || notificationStore.unreadCount
})

// Percakapan yang memiliki pesan belum dibaca
const unreadConversations = computed(() => {
  return chatStore.conversations.filter((c) => (c.unreadCount ?? 0) > 0)
})

const activeTab = computed({
  get: () => notificationStore.activeTab,
  set: (val: 'all' | 'unread') => (notificationStore.activeTab = val),
})

const displayedNotifications = computed(() => {
  if (activeTab.value === 'unread') {
    return notificationStore.unreadNotifications
  }
  return notificationStore.notifications
})

/** Toggle dropdown pusat notifikasi */
const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    await notificationStore.fetchNotifications(activeTab.value === 'unread')
    if (chatStore.conversations.length === 0) {
      await chatStore.fetchConversations()
    }
  }
}

/** Format timestamp relatif atau tanggal */
const formatNotifTime = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()

  if (isToday) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Navigasi & tandai dibaca saat notifikasi diklik */
const handleClickNotifItem = async (item: AppNotification) => {
  showDropdown.value = false
  activeToast.value = null

  await notificationStore.markAsRead(item.id)

  let targetUrl = item.actionUrl
  if (!targetUrl && item.payload?.conversationId) {
    const convId = item.payload.conversationId
    const threadId = item.payload.parentMessageId
    const msgId = item.payload.messageId
    targetUrl = `/chat?convId=${convId}`
    if (threadId) targetUrl += `&threadId=${threadId}`
    if (msgId) targetUrl += `&msgId=${msgId}`
  } else if (targetUrl && !targetUrl.includes('msgId=') && item.payload?.messageId) {
    targetUrl += `&msgId=${item.payload.messageId}`
  }

  router.push(slugPath(targetUrl || '/chat'))
}

const handleClickConversation = (convId: string) => {
  showDropdown.value = false
  activeToast.value = null
  router.push(slugPath(`/chat?convId=${convId}`))
}

const handleToastClick = async () => {
  if (!activeToast.value) return
  const toastItem = activeToast.value
  activeToast.value = null

  if (toastItem.id) {
    await notificationStore.markAsRead(toastItem.id)
  }

  router.push(slugPath(toastItem.actionUrl || '/chat'))
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

/** Tangani pesan chat masuk real-time */
const handleIncomingMessage = async (msg: ChatMessage) => {
  chatStore.appendMessage(msg)
  await Promise.all([
    chatStore.fetchConversations(),
    notificationStore.fetchUnreadCount(),
  ])

  const sId = msg.senderId || (msg as any).sender?.id || (msg as any).sender_id
  const isOwnMessage = authStore.id_user && sId != null && Number(sId) === Number(authStore.id_user)

  if (!isOwnMessage) {
    const senderName = msg.sender?.pegawai?.name || msg.sender?.username || (msg as any).senderName || 'Pengguna'
    const conv = chatStore.conversations.find((c) => String(c.id) === String(msg.conversationId))
    const isGroup = conv?.type === 'GROUP' || Boolean(conv?.name)
    const groupName = conv?.name || 'Grup'
    const isThreadReply = Boolean(msg.parentMessageId)
    const displaySender = isGroup ? `${senderName} @ ${groupName}` : senderName

    activeToast.value = {
      id: String(msg.id),
      title: isThreadReply ? `Balasan Thread (${displaySender})` : displaySender,
      content: msg.content || (msg.attachmentUrl ? '[Lampiran File]' : 'Pesan baru diterima'),
      actionUrl: msg.parentMessageId ? `/chat?convId=${msg.conversationId}&threadId=${msg.parentMessageId}` : `/chat?convId=${msg.conversationId}`,
      type: 'CHAT',
    }

    playChimeSound()

    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      activeToast.value = null
    }, 6000)
  }
}

/** Tangani event notifikasi real-time dari backend WebSocket */
const handleIncomingNotification = async (notif: AppNotification) => {
  notificationStore.addRealtimeNotification(notif)
  await notificationStore.fetchUnreadCount()
  playChimeSound()

  activeToast.value = {
    id: String(notif.id),
    title: notif.title || 'Notifikasi Baru',
    content: notif.body || '',
    actionUrl: notif.actionUrl,
    type: String(notif.type),
  }

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    activeToast.value = null
  }, 6000)
}

const setupSocketAndFetch = async () => {
  if (!authStore.token) return
  await notificationStore.fetchUnreadCount()
  await notificationStore.fetchNotifications()
  if (chatStore.conversations.length === 0) {
    await chatStore.fetchConversations()
  }

  if (socketCleanup) socketCleanup()

  const cleanMsg = chatSocket.onNewMessage((msg: ChatMessage) => {
    handleIncomingMessage(msg)
  })
  const cleanNotif = chatSocket.onNotificationNew((notif: AppNotification) => {
    handleIncomingNotification(notif)
  })

  socketCleanup = () => {
    cleanMsg()
    cleanNotif()
  }

  await chatSocket.connect()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  setupSocketAndFetch()
})

watch(
  () => authStore.token,
  (token) => {
    if (token) {
      setupSocketAndFetch()
    }
  }
)

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (socketCleanup) socketCleanup()
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <!-- Icon Button Navbar -->
    <button
      @click="toggleDropdown"
      class="p-2 rounded-xl text-base-content/70 hover:bg-base-200 transition relative flex items-center justify-center"
      title="Pusat Notifikasi"
    >
      <icons.Bell class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />

      <!-- Badge Unread Counter -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-base-100 shadow-sm animate-pulse"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Panel History Notifikasi -->
    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-80 sm:w-96 bg-base-100 rounded-2xl shadow-2xl border border-base-content/10 z-50 overflow-hidden"
    >
      <!-- Header Dropdown -->
      <div class="p-3.5 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
        <div class="flex items-center gap-2">
          <icons.Bell class="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
          <h3 class="font-bold text-xs text-base-content">Pusat Notifikasi</h3>
        </div>
        <button
          v-if="unreadCount > 0"
          @click="notificationStore.markAllAsRead()"
          class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
        >
          <icons.CheckCheck class="w-3.5 h-3.5" />
          <span>Tandai Semua Dibaca</span>
        </button>
      </div>

      <!-- Tab Navigation (Semua vs Belum Dibaca) -->
      <div class="flex border-b border-base-content/10 bg-base-100 text-xs font-semibold">
        <button
          class="flex-1 py-2.5 text-center border-b-2 transition"
          :class="activeTab === 'all' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-base-content/50 hover:text-base-content'"
          @click="activeTab = 'all'; notificationStore.fetchNotifications(false)"
        >
          Semua ({{ displayedNotifications.length + unreadConversations.length }})
        </button>
        <button
          class="flex-1 py-2.5 text-center border-b-2 transition flex items-center justify-center gap-1.5"
          :class="activeTab === 'unread' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-base-content/50 hover:text-base-content'"
          @click="activeTab = 'unread'; notificationStore.fetchNotifications(true)"
        >
          <span>Belum Dibaca</span>
          <span
            v-if="unreadCount > 0"
            class="badge badge-error badge-xs text-[10px] text-white font-bold"
          >
            {{ unreadCount }}
          </span>
        </button>
      </div>

      <!-- List Riwayat Notifikasi / Chat Unread -->
      <div class="max-h-80 overflow-y-auto divide-y divide-base-content/5 scrollbar-thin">
        <div v-if="notificationStore.isLoading" class="p-8 text-center">
          <span class="loading loading-spinner loading-md text-indigo-600" />
        </div>

        <template v-else-if="displayedNotifications.length > 0 || unreadConversations.length > 0">
          <!-- Item dari Notification Store (DB History) -->
          <div
            v-for="item in displayedNotifications"
            :key="item.id"
            @click="handleClickNotifItem(item)"
            class="p-3.5 hover:bg-base-200/60 cursor-pointer transition flex items-start gap-3 relative group"
            :class="!item.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''"
          >
            <!-- Blue Dot Unread Indicator -->
            <div
              v-if="!item.isRead"
              class="w-2 h-2 rounded-full bg-indigo-600 absolute left-2 top-4 shadow-sm"
            />

            <!-- Category Icon -->
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition group-hover:scale-105 ml-1"
              :class="
                String(item.type).startsWith('CHAT')
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : String(item.type).startsWith('WA')
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : String(item.type).startsWith('DOC')
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
              "
            >
              <icons.MessageSquare v-if="String(item.type).startsWith('CHAT')" class="w-4 h-4" />
              <icons.PhoneCall v-else-if="String(item.type).startsWith('WA')" class="w-4 h-4" />
              <icons.FileText v-else-if="String(item.type).startsWith('DOC')" class="w-4 h-4" />
              <icons.Bell v-else class="w-4 h-4" />
            </div>

            <!-- Content preview -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <p
                  class="text-xs font-bold truncate"
                  :class="!item.isRead ? 'text-base-content' : 'text-base-content/80'"
                >
                  {{ item.title }}
                </p>
                <span class="text-[10px] text-base-content/40 shrink-0">
                  {{ formatNotifTime(item.createdAt) }}
                </span>
              </div>
              <p class="text-[11px] text-base-content/70 line-clamp-2 leading-relaxed">
                {{ item.body }}
              </p>
            </div>
          </div>

          <!-- Item Percakapan Chat Unread (jika belum ada di persistent history) -->
          <template v-if="displayedNotifications.length === 0">
            <div
              v-for="conv in unreadConversations"
              :key="conv.id"
              @click="handleClickConversation(conv.id)"
              class="p-3.5 hover:bg-base-200/60 cursor-pointer transition flex items-start gap-3 relative group bg-indigo-50/40 dark:bg-indigo-950/20"
            >
              <div class="w-2 h-2 rounded-full bg-indigo-600 absolute left-2 top-4 shadow-sm" />
              <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition ml-1">
                {{ (conv.name || 'C').charAt(0).toUpperCase() }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <p class="text-xs font-bold text-base-content truncate">{{ conv.name || 'Percakapan' }}</p>
                  <span class="text-[10px] text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md">
                    {{ conv.unreadCount }} Pesan
                  </span>
                </div>
                <p class="text-[11px] text-base-content/60 truncate">
                  <span v-if="conv.lastMessage?.sender?.username" class="font-semibold text-base-content/80">
                    {{ conv.lastMessage.sender.pegawai?.name || conv.lastMessage.sender.username }}:
                  </span>
                  {{ conv.lastMessage?.content || 'Pesan baru diterima' }}
                </p>
              </div>
            </div>
          </template>
        </template>

        <!-- Empty State -->
        <div v-else class="p-8 text-center text-xs text-base-content/40">
          <icons.CheckCircle2 class="w-8 h-8 mx-auto text-base-content/30 mb-2" />
          <p class="font-semibold">Tidak ada notifikasi {{ activeTab === 'unread' ? 'belum dibaca' : '' }}</p>
          <p class="text-[10px] opacity-75 mt-0.5">Semua pesan & aktivitas Anda sudah up to date!</p>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="p-2.5 border-t border-base-content/10 flex items-center justify-between px-4 bg-base-200/30 text-xs font-bold">
        <button
          @click="showDropdown = false; router.push(slugPath('/chat/notifications'))"
          class="text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
        >
          <icons.ListFilter class="w-3.5 h-3.5" />
          <span>Halaman Riwayat Notifikasi</span>
        </button>

        <button
          @click="showDropdown = false; router.push(slugPath('/chat'))"
          class="text-base-content/60 hover:text-base-content cursor-pointer flex items-center gap-1"
        >
          <span>Chat Room</span>
          <icons.ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- WhatsApp-Style Floating Toast Notification Popup -->
    <Teleport to="body">
      <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-y-4 opacity-0 scale-95"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="activeToast"
          class="fixed bottom-6 right-6 z-[99999] max-w-sm w-full bg-base-100 border border-indigo-500/20 shadow-2xl rounded-2xl overflow-hidden p-4 cursor-pointer hover:border-indigo-500/50 transition-all group"
          @click="handleToastClick"
        >
          <div class="flex items-start gap-3">
            <!-- Icon Avatar Toast -->
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md group-hover:scale-105 transition">
              {{ activeToast.title.charAt(0).toUpperCase() }}
            </div>

            <!-- Toast Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <h4 class="text-xs font-bold text-base-content truncate">
                  {{ activeToast.title }}
                </h4>
                <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md shrink-0">
                  Notifikasi Baru
                </span>
              </div>

              <p class="text-xs text-base-content/80 line-clamp-2 leading-relaxed mb-2">
                {{ activeToast.content }}
              </p>

              <div class="flex items-center justify-between pt-1.5 border-t border-base-content/10 text-[11px]">
                <span class="font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
                  Buka Pesan <icons.ArrowRight class="w-3.5 h-3.5" />
                </span>
                <span class="text-[10px] text-base-content/50">Klik untuk melihat</span>
              </div>
            </div>

            <!-- Close Button -->
            <button
              @click.stop="activeToast = null"
              class="text-base-content/40 hover:text-base-content p-1 rounded-lg hover:bg-base-200 transition shrink-0"
              title="Tutup Notifikasi"
            >
              <icons.X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
