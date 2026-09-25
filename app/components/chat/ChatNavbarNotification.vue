<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as icons from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSlugRoute } from '@/composables/useSlugRoute'
import { useChatStore } from '@/stores/chat'
import { useChatSocket } from '@/composables/useChatSocket'
import { useAuthStore } from '@/stores/auth'
import type { ChatConversation, ChatMessage } from '@/types/chat'

const router = useRouter()
const { slugPath } = useSlugRoute()
const chatStore = useChatStore()
const chatSocket = useChatSocket()
const authStore = useAuthStore()

const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
let socketCleanup: (() => void) | null = null

// State untuk WhatsApp-style Popup Toast
interface ToastData {
  id: string
  conversationId: string
  parentMessageId?: string | null
  title: string
  senderName: string
  content: string
  isThreadReply: boolean
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
    // Abaikan jika browser memblokir autoplay audio
  }
}

// Total unread dari Pinia store
const totalUnread = computed(() => chatStore.totalUnread)

// Percakapan yang memiliki pesan belum dibaca
const unreadConversations = computed(() => {
  return chatStore.conversations.filter((c) => (c.unreadCount ?? 0) > 0)
})

const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value && chatStore.conversations.length === 0) {
    await chatStore.fetchConversations()
  }
}

// Navigasi presisi ke Pesan Biasa (Conversation) atau Thread
const handleClickNotification = (convId: string, threadId?: string | null) => {
  showDropdown.value = false
  activeToast.value = null

  if (threadId) {
    router.push({
      path: slugPath('/chat'),
      query: { convId, threadId },
    })
  } else {
    router.push({
      path: slugPath('/chat'),
      query: { convId },
    })
  }
}

const handleToastClick = () => {
  if (!activeToast.value) return
  handleClickNotification(activeToast.value.conversationId, activeToast.value.parentMessageId)
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

const handleIncomingMessage = (msg: ChatMessage) => {
  // Update store (dengan deduplikasi internal)
  chatStore.appendMessage(msg)

  // Cek apakah pesan berasal dari pengguna aktif (jangan tampilkan toast untuk pesan sendiri)
  const sId = msg.senderId || (msg as any).sender?.id || (msg as any).sender_id
  const isOwnMessage = authStore.id_user && sId != null && Number(sId) === Number(authStore.id_user)

  if (!isOwnMessage) {
    const senderName =
      msg.sender?.pegawai?.name ||
      msg.sender?.username ||
      (msg as any).senderName ||
      'Pengguna'

    const conv = chatStore.conversations.find((c) => String(c.id) === String(msg.conversationId))
    const isGroup = conv?.type === 'GROUP' || Boolean(conv?.name)
    const groupName = conv?.name || 'Grup'
    const isThreadReply = Boolean(msg.parentMessageId)

    // Format judul: jika Grup -> "Nama Pengirim @ Nama Grup", jika Direct -> "Nama Pengirim"
    const displaySender = isGroup ? `${senderName} @ ${groupName}` : senderName

    activeToast.value = {
      id: String(msg.id),
      conversationId: String(msg.conversationId),
      parentMessageId: msg.parentMessageId ? String(msg.parentMessageId) : null,
      title: isThreadReply ? `Balasan Thread (${displaySender})` : displaySender,
      senderName: displaySender,
      content: msg.content || (msg.attachmentUrl ? '[Lampiran File]' : 'Pesan baru diterima'),
      isThreadReply,
    }

    playChimeSound()

    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      activeToast.value = null
    }, 6000)
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  // Inisialisasi koneksi WebSocket global di level navbar (bekerja di halaman manapun seperti /dashboard)
  if (authStore.token) {
    socketCleanup = chatSocket.onNewMessage((msg: ChatMessage) => {
      handleIncomingMessage(msg)
    })

    await chatSocket.connect()

    // Fetch percakapan di awal agar badge langsung ter-sync
    if (chatStore.conversations.length === 0) {
      await chatStore.fetchConversations()
    }
  }
})

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
      title="Notifikasi Chat Internal"
    >
      <icons.MessageSquare class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      
      <!-- Badge Unread Counter -->
      <span
        v-if="totalUnread > 0"
        class="absolute -top-1 -right-1 bg-indigo-600 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-base-100 shadow-sm animate-pulse"
      >
        {{ totalUnread > 99 ? '99+' : totalUnread }}
      </span>
    </button>

    <!-- Dropdown Panel -->
    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-80 md:w-96 bg-base-100 rounded-2xl shadow-xl border border-base-content/10 z-50 overflow-hidden"
    >
      <!-- Header -->
      <div class="p-3.5 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
        <div class="flex items-center gap-2">
          <icons.MessageSquare class="w-4 h-4 text-indigo-600" />
          <h3 class="font-bold text-xs text-base-content">Notifikasi Chat Internal</h3>
        </div>
        <span v-if="totalUnread > 0" class="badge badge-primary badge-xs text-[10px] font-semibold">
          {{ totalUnread }} Baru
        </span>
      </div>

      <!-- List Notifikasi Unread -->
      <div class="max-h-80 overflow-y-auto divide-y divide-base-content/5">
        <div v-if="unreadConversations.length === 0" class="p-6 text-center text-xs text-base-content/50">
          <icons.CheckCircle2 class="w-8 h-8 mx-auto text-base-content/30 mb-2" />
          Semua pesan sudah dibaca
        </div>

        <template v-else>
          <div
            v-for="conv in unreadConversations"
            :key="conv.id"
            @click="handleClickNotification(conv.id)"
            class="p-3 hover:bg-base-200/60 cursor-pointer transition flex gap-3 items-start group"
          >
            <!-- Avatar / Icon -->
            <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
              {{ (conv.name || 'C').charAt(0).toUpperCase() }}
            </div>

            <!-- Content preview -->
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
      </div>

      <!-- Footer Action -->
      <div class="p-2.5 border-t border-base-content/10 text-center bg-base-200/30">
        <button
          @click="showDropdown = false; router.push(slugPath('/chat'));"
          class="text-xs font-bold text-indigo-600 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
        >
          <span>Buka Semua Percakapan</span>
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
            <!-- Avatar Icon -->
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md group-hover:scale-105 transition">
              {{ activeToast.senderName.charAt(0).toUpperCase() }}
            </div>

            <!-- Toast Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <h4 class="text-xs font-bold text-base-content truncate">
                  {{ activeToast.senderName }}
                </h4>
                <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md shrink-0">
                  {{ activeToast.isThreadReply ? 'Balasan Thread' : 'Pesan Baru' }}
                </span>
              </div>

              <p class="text-xs text-base-content/80 line-clamp-2 leading-relaxed mb-2">
                {{ activeToast.content }}
              </p>

              <div class="flex items-center justify-between pt-1.5 border-t border-base-content/10 text-[11px]">
                <span class="font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
                  Buka Chat <icons.ArrowRight class="w-3.5 h-3.5" />
                </span>
                <span class="text-[10px] text-base-content/50">Klik untuk membalas</span>
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
