<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as icons from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSlugRoute } from '@/composables/useSlugRoute'
import { useNotificationStore } from '@/stores/notification'
import type { AppNotification } from '@/types/notification'
import { useToast } from '@/composables/useToast'

import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

useHead({ title: 'Data Tabel Notifikasi Chat' })
definePageMeta({ layout: 'admin' })

const router = useRouter()
const { slugPath } = useSlugRoute()
const notifStore = useNotificationStore()
const chatStore = useChatStore()
const authStore = useAuthStore()
const toast = useToast()

// State Filters & Pagination Data Tables
const filterTab = ref<'all' | 'unread' | 'read'>('all')
const filterType = ref<string>('ALL')
const searchQuery = ref('')
const itemsPerPage = ref<number>(10)
const currentPage = ref<number>(1)
const isRefreshing = ref<boolean>(false)

// Sorting State
const sortField = ref<'createdAt' | 'isRead' | 'title' | 'type'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Selection State for Bulk Actions
const selectedIds = ref<string[]>([])

const loadData = async () => {
  authStore.syncCookies()
  if (authStore.token) {
    await Promise.all([
      notifStore.fetchNotifications(false, 1, 100),
      notifStore.fetchUnreadCount(),
      chatStore.fetchConversations(),
    ])

    // Load recent messages for each conversation to render all individual notifications
    if (chatStore.conversations.length > 0) {
      await Promise.all(
        chatStore.conversations.map((c) => chatStore.fetchMessages(c.id).catch(() => {})),
      )
    }
  }
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await loadData()
  isRefreshing.value = false
  toast.success('Data notifikasi berhasil diperbarui')
}

onMounted(async () => {
  await loadData()
})

watch(
  () => authStore.token,
  async (token) => {
    if (token) {
      await loadData()
    }
  },
)

// Reset pagination when filter/search changes
watch([filterTab, filterType, searchQuery, itemsPerPage], () => {
  currentPage.value = 1
  selectedIds.value = []
})

/** Konversi pesan percakapan menjadi notifikasi individual (tanpa grouping per percakapan) */
const conversationNotifications = computed<AppNotification[]>(() => {
  if (!chatStore.conversations.length) return []

  const items: AppNotification[] = []
  const currentUserId = Number(authStore.id_user ?? 0)

  for (const c of chatStore.conversations) {
    const isGroup = c.type === 'GROUP' || Boolean(c.name)

    const myParticipant = c.participants?.find((p) => Number(p.userId) === currentUserId)
    const myUsername = (authStore.username || myParticipant?.username || myParticipant?.user?.username || '').toLowerCase()
    const myName = (myParticipant?.user?.pegawai?.name || '').toLowerCase()
    const myNameUnderscore = myName.replace(/\s+/g, '_')

    // Ambil seluruh pesan terdaftar di messagesMap jika ada, atau fallback ke lastMessage
    const messagesList: any[] = []
    if (chatStore.messagesMap[c.id] && chatStore.messagesMap[c.id].length > 0) {
      messagesList.push(...chatStore.messagesMap[c.id])
    } else if (c.lastMessage) {
      messagesList.push(c.lastMessage)
    }

    for (const msg of messagesList) {
      if (!msg || !msg.id) continue

      const senderId = Number(msg.senderId || msg.sender?.id || 0)
      const isSenderSelf = senderId === currentUserId

      const senderName =
        msg.sender?.pegawai?.name ||
        msg.sender?.username ||
        (msg as any).senderUsername ||
        (isGroup ? c.name : 'Pengguna')

      // Deteksi pesan mention untuk pengguna aktif
      let isMentioned = false
      if (!isSenderSelf && msg.content) {
        const contentLower = msg.content.toLowerCase()
        const mentionedIds = (msg as any).mentionedUserIds || []

        if (Array.isArray(mentionedIds) && mentionedIds.map(Number).includes(currentUserId)) {
          isMentioned = true
        } else if (
          contentLower.includes(`@[${currentUserId}]`) ||
          contentLower.includes(`@[${currentUserId}:`)
        ) {
          isMentioned = true
        } else if (myUsername && contentLower.includes(`@${myUsername}`)) {
          isMentioned = true
        } else if (myName && contentLower.includes(`@${myName}`)) {
          isMentioned = true
        } else if (myNameUnderscore && contentLower.includes(`@${myNameUnderscore}`)) {
          isMentioned = true
        }
      }

      // Deteksi dokumen share (lampiran file/gambar/video/audio/dokumen)
      const isDocShared = Boolean(
        msg.attachmentUrl ||
        msg.attachmentName ||
        ['file', 'image', 'video', 'audio', 'doc'].includes(String(msg.type).toLowerCase())
      )

      const isThreadReply = Boolean(msg.parentMessageId)

      const type = isMentioned
        ? 'CHAT_MENTION'
        : isDocShared
        ? 'DOC_SHARED'
        : isThreadReply
        ? 'CHAT_THREAD_REPLY'
        : isGroup
        ? 'CHAT_GROUP'
        : 'CHAT_DIRECT'

      let title = isGroup ? `${senderName} @ ${c.name || 'Grup'}` : senderName
      if (isMentioned) {
        title = `${senderName} menyebut Anda @ ${c.name || 'Grup'}`
      } else if (isDocShared) {
        title = `${senderName} membagikan dokumen ${c.name ? '@ ' + c.name : ''}`
      } else if (isThreadReply) {
        title = `Balasan Thread (${senderName})`
      }

      items.push({
        id: `msg-${msg.id}`,
        userId: currentUserId,
        tenantId: (c.tenantId as any) ?? null,
        type: type as any,
        title: title || 'Pesan Percakapan',
        body: msg.content || (msg.attachmentUrl ? `[Lampiran File] ${msg.attachmentName || ''}` : 'Ada pesan percakapan'),
        actionUrl: `/chat?convId=${c.id}&msgId=${msg.id}`,
        payload: {
          conversationId: c.id,
          messageId: msg.id,
          parentMessageId: msg.parentMessageId || null,
          isMention: isMentioned,
          isDocShared,
          attachmentUrl: msg.attachmentUrl || null,
          attachmentName: msg.attachmentName || null,
        },
        isRead: (c.unreadCount ?? 0) === 0,
        readAt: null,
        createdAt: msg.createdAt || c.lastActivityAt || new Date().toISOString(),
      })
    }
  }

  return items
})

/** Gabungkan riwayat notifikasi DB + percakapan (Deduplikasi berbasis Message ID, Konsisten Sebelum & Sesudah Refresh) */
const allCombinedNotifications = computed<AppNotification[]>(() => {
  const dbNotifs = notifStore.notifications.map((n) => {
    if (n.payload?.isMention && String(n.type) !== 'CHAT_MENTION') {
      return { ...n, type: 'CHAT_MENTION' as any }
    }
    if ((n.payload?.isDocShared || n.payload?.attachmentUrl) && String(n.type) !== 'DOC_SHARED') {
      return { ...n, type: 'DOC_SHARED' as any }
    }
    return n
  })
  const convNotifs = conversationNotifications.value

  const result: AppNotification[] = [...dbNotifs]

  // Deduplikasi menggunakan set ID pesan individual
  const existingMessageIds = new Set<string>()
  for (const n of dbNotifs) {
    if (n.id) existingMessageIds.add(String(n.id))
    if (n.payload?.messageId) existingMessageIds.add(String(n.payload.messageId))
  }

  for (const convNotif of convNotifs) {
    const msgId = String(convNotif.payload?.messageId || convNotif.id)
    if (!existingMessageIds.has(msgId) && !existingMessageIds.has(`msg-${msgId}`)) {
      result.push(convNotif)
      existingMessageIds.add(msgId)
    }
  }

  return result
})

/** Counter statistik */
const countUnread = computed(() => allCombinedNotifications.value.filter((n) => !n.isRead).length)
const countRead = computed(() => allCombinedNotifications.value.filter((n) => n.isRead).length)
const countAll = computed(() => allCombinedNotifications.value.length)

/** Filtered list berdasarkan pencarian & kategori & tab */
const filteredList = computed(() => {
  let list = [...allCombinedNotifications.value]

  if (filterTab.value === 'unread') {
    list = list.filter((n) => !n.isRead)
  } else if (filterTab.value === 'read') {
    list = list.filter((n) => n.isRead)
  }

  if (filterType.value !== 'ALL') {
    list = list.filter((n) => String(n.type).toUpperCase() === filterType.value.toUpperCase())
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        String(n.type).toLowerCase().includes(q),
    )
  }

  return list
})

/** Sorted list berdasarkan sortField & sortOrder */
const sortedList = computed(() => {
  const list = [...filteredList.value]
  list.sort((a, b) => {
    let compA: any
    let compB: any

    if (sortField.value === 'createdAt') {
      compA = new Date(a.createdAt).getTime()
      compB = new Date(b.createdAt).getTime()
    } else if (sortField.value === 'isRead') {
      compA = a.isRead ? 1 : 0
      compB = b.isRead ? 1 : 0
    } else if (sortField.value === 'title') {
      compA = a.title.toLowerCase()
      compB = b.title.toLowerCase()
    } else if (sortField.value === 'type') {
      compA = String(a.type).toLowerCase()
      compB = String(b.type).toLowerCase()
    }

    if (compA < compB) return sortOrder.value === 'asc' ? -1 : 1
    if (compA > compB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
  return list
})

/** Data Paginated Data Tables */
const totalItems = computed(() => sortedList.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value)))

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return sortedList.value.slice(start, start + itemsPerPage.value)
})

const startEntryIndex = computed(() => (totalItems.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1))
const endEntryIndex = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value))

// Header Sort Toggle
const toggleSort = (field: 'createdAt' | 'isRead' | 'title' | 'type') => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

// Bulk Checkbox Selection Logic
const isAllPageSelected = computed(() => {
  if (paginatedList.value.length === 0) return false
  return paginatedList.value.every((item) => selectedIds.value.includes(item.id))
})

const toggleSelectAllPage = () => {
  if (isAllPageSelected.value) {
    const pageIds = new Set(paginatedList.value.map((item) => item.id))
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id))
  } else {
    const newIds = new Set([...selectedIds.value, ...paginatedList.value.map((item) => item.id)])
    selectedIds.value = Array.from(newIds)
  }
}

const toggleSelectItem = (id: string) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((i) => i !== id)
  } else {
    selectedIds.value.push(id)
  }
}

/** Bulk action: Tandai notifikasi terpilih sebagai dibaca */
const handleBulkMarkAsRead = async () => {
  if (selectedIds.value.length === 0) return
  for (const id of selectedIds.value) {
    await notifStore.markAsRead(id)
  }
  toast.success(`${selectedIds.value.length} notifikasi berhasil ditandai sebagai dibaca`)
  selectedIds.value = []
}

/** Tandai semua notifikasi sebagai dibaca */
const handleMarkAllRead = async () => {
  await notifStore.markAllAsRead()
  toast.success('Semua notifikasi berhasil ditandai sebagai dibaca')
}

/** Navigasi presisi ke percakapan (Direct / Group / Thread) */
const handleOpenNotif = async (item: AppNotification) => {
  await notifStore.markAsRead(item.id)

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

/** Format tanggal & waktu lengkap */
const formatFullDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Relative time display */
const formatRelativeTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes}m yang lalu`
  if (diffHours < 24) return `${diffHours}j yang lalu`
  if (diffDays < 7) return `${diffDays}h yang lalu`
  return formatFullDate(dateStr)
}

/** Label kategori */
const getKategoriLabel = (type: string) => {
  switch (type) {
    case 'CHAT_THREAD_REPLY': return 'Balasan Thread'
    case 'CHAT_GROUP': return 'Chat Grup'
    case 'CHAT_DIRECT': return 'Pesan Pribadi'
    case 'CHAT_MENTION': return 'Mention' 
    case 'DOC_SHARED': return 'Dokumen'
    default: return 'Sistem'
  }
}

/** Warna badge kategori */
const getKategoriBadgeStyle = (type: string) => {
  switch (type) {
    case 'CHAT_THREAD_REPLY':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'CHAT_GROUP':
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
    case 'CHAT_DIRECT':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'CHAT_MENTION':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'WA_INCOMING':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'DOC_SHARED':
      return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- ─── Header Halaman ─────────────────────────────────────────────── -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-base-100 p-6 rounded-3xl border border-base-content/10 shadow-xs">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <icons.Bell class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <h1 class="text-xl sm:text-2xl font-bold text-base-content tracking-tight">
              Data Tabel Notifikasi Chat
            </h1>
            <span
              v-if="countUnread > 0"
              class="badge badge-error text-white font-bold text-xs gap-1.5 animate-pulse"
            >
              <icons.BellRing class="w-3 h-3" />
              {{ countUnread }} Belum Dibaca
            </span>
            <span class="badge badge-ghost text-xs font-semibold">
              Total {{ countAll }} Notifikasi
            </span>
          </div>
          <p class="text-xs sm:text-sm text-base-content/60 mt-0.5">
            Tinjau seluruh riwayat notifikasi pesan masuk, balasan thread, dan aktivitas sistem dalam format Data Tables.
          </p>
        </div>
      </div>

      <!-- Action Button Header Top -->
      <div class="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          @click="handleRefresh"
          :disabled="isRefreshing || notifStore.isLoading"
          class="btn btn-ghost btn-sm rounded-xl font-bold gap-1.5 text-base-content/70 hover:text-base-content"
          title="Perbarui Data Notifikasi"
        >
          <icons.RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing || notifStore.isLoading }" />
          <span>Segarkan</span>
        </button>
        <button
          v-if="countUnread > 0"
          @click="handleMarkAllRead"
          class="btn btn-outline btn-primary btn-sm rounded-xl font-bold gap-1.5"
        >
          <icons.CheckCheck class="w-4 h-4" />
          <span>Tandai Semua Dibaca</span>
        </button>
        <button
          @click="router.push(slugPath('/chat'))"
          class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 shadow-sm"
        >
          <icons.MessageSquare class="w-4 h-4" />
          <span>Buka Chat Room</span>
        </button>
      </div>
    </div>

    <!-- ─── Control Bar Data Tables (Filter Tabs, Search & Per Page) ─── -->
    <div class="bg-base-100 p-4 sm:p-5 rounded-2xl border border-base-content/10 shadow-xs space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <!-- Left: Status Filter Tabs (Semua vs Belum Dibaca vs Sudah Dibaca) -->
        <div class="flex bg-base-200/60 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            class="px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
            :class="filterTab === 'all' ? 'bg-base-100 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-base-content/60 hover:text-base-content'"
            @click="filterTab = 'all'"
          >
            <span>Semua</span>
            <span class="badge badge-sm border-none bg-base-300 text-base-content/70 font-semibold">{{ countAll }}</span>
          </button>
          <button
            class="px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
            :class="filterTab === 'unread' ? 'bg-base-100 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-base-content/60 hover:text-base-content'"
            @click="filterTab = 'unread'"
          >
            <span>Belum Dibaca</span>
            <span
              class="badge badge-sm border-none font-bold"
              :class="countUnread > 0 ? 'bg-rose-500 text-white' : 'bg-base-300 text-base-content/60'"
            >
              {{ countUnread }}
            </span>
          </button>
          <button
            class="px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
            :class="filterTab === 'read' ? 'bg-base-100 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-base-content/60 hover:text-base-content'"
            @click="filterTab = 'read'"
          >
            <span>Sudah Dibaca</span>
            <span class="badge badge-sm border-none bg-base-300 text-base-content/60 font-semibold">{{ countRead }}</span>
          </button>
        </div>

        <!-- Right: Category Dropdown & Search & Page Selector -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl justify-end">
          <!-- Kategori Select -->
          <div class="relative min-w-[150px]">
            <select
              v-model="filterType"
              class="select select-sm w-full rounded-xl bg-base-200/60 border-base-content/10 text-xs font-semibold"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="CHAT_DIRECT">Pesan Pribadi</option>
              <option value="CHAT_GROUP">Chat Grup</option>
              <option value="CHAT_THREAD_REPLY">Balasan Thread</option>
              <option value="CHAT_MENTION">Mention</option> 
              <option value="DOC_SHARED">Dokumen</option>
            </select>
          </div>

          <!-- Input Search -->
          <div class="relative flex-1 min-w-[180px]">
            <icons.Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari notifikasi / isi pesan..."
              class="input input-sm w-full rounded-xl pl-9 bg-base-200/60 border-base-content/10 focus:border-primary/40 text-xs"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content text-xs"
            >
              ✕
            </button>
          </div>

          <!-- Items Per Page Selector -->
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-xs text-base-content/50 font-medium hidden md:inline">Tampilkan:</span>
            <select
              v-model.number="itemsPerPage"
              class="select select-sm rounded-xl bg-base-200/60 border-base-content/10 text-xs font-bold"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

      </div>

      <!-- Bulk Selection Toolbar (tampil jika ada item yang dicentang) -->
      <div
        v-if="selectedIds.length > 0"
        class="flex items-center justify-between gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs font-semibold animate-fadeIn"
      >
        <div class="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <icons.CheckSquare class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Terpilih <strong>{{ selectedIds.length }}</strong> notifikasi</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="handleBulkMarkAsRead"
            class="btn btn-xs btn-primary rounded-lg font-bold gap-1"
          >
            <icons.CheckCheck class="w-3.5 h-3.5" />
            Tandai Dibaca
          </button>
          <button
            @click="selectedIds = []"
            class="btn btn-xs btn-ghost rounded-lg text-base-content/60 hover:text-base-content"
          >
            Batal Pilih
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Data Table Container ────────────────────────────────────────── -->
    <div class="bg-base-100 rounded-2xl border border-base-content/10 shadow-xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="notifStore.isLoading" class="p-16 text-center space-y-3">
        <span class="loading loading-spinner loading-lg text-primary" />
        <p class="text-xs text-base-content/50 font-medium">Memuat tabel data notifikasi...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="paginatedList.length === 0" class="p-16 text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-base-200/60 flex items-center justify-center mx-auto text-base-content/30">
          <icons.BellOff class="w-8 h-8" />
        </div>
        <div>
          <h3 class="font-bold text-base text-base-content">
            Tidak ada notifikasi yang ditemukan
          </h3>
          <p class="text-xs text-base-content/50 max-w-sm mx-auto mt-1">
            {{ searchQuery ? 'Tidak ada notifikasi yang sesuai dengan pencarian Anda.' : 'Seluruh pesan dan notifikasi aktivitas Anda sudah up-to-date!' }}
          </p>
        </div>
        <button
          v-if="filterTab !== 'all' || searchQuery || filterType !== 'ALL'"
          @click="filterTab = 'all'; searchQuery = ''; filterType = 'ALL'"
          class="btn btn-ghost btn-xs text-primary font-bold mt-2"
        >
          Reset Filter & Lihat Semua
        </button>
      </div>

      <!-- Data Table View -->
      <div v-else class="overflow-x-auto">
        <table class="table w-full text-xs">
          <thead>
            <tr class="bg-base-200/50 border-b border-base-content/10 text-base-content/70">
              <!-- Select All Checkbox -->
              <th class="py-3.5 pl-4 w-10 text-center">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-primary rounded"
                  :checked="isAllPageSelected"
                  @change="toggleSelectAllPage"
                  title="Pilih semua data pada halaman ini"
                />
              </th>

              <!-- Status Header -->
              <th
                class="py-3.5 font-bold cursor-pointer hover:text-base-content transition select-none w-36"
                @click="toggleSort('isRead')"
              >
                <div class="flex items-center gap-1.5">
                  <span>STATUS</span>
                  <icons.ArrowUpDown v-if="sortField !== 'isRead'" class="w-3.5 h-3.5 opacity-40" />
                  <component :is="sortOrder === 'asc' ? icons.ArrowUp : icons.ArrowDown" v-else class="w-3.5 h-3.5 text-primary" />
                </div>
              </th>

              <!-- Kategori Header -->
              <th
                class="py-3.5 font-bold cursor-pointer hover:text-base-content transition select-none w-36"
                @click="toggleSort('type')"
              >
                <div class="flex items-center gap-1.5">
                  <span>KATEGORI</span>
                  <icons.ArrowUpDown v-if="sortField !== 'type'" class="w-3.5 h-3.5 opacity-40" />
                  <component :is="sortOrder === 'asc' ? icons.ArrowUp : icons.ArrowDown" v-else class="w-3.5 h-3.5 text-primary" />
                </div>
              </th>

              <!-- Judul / Pengirim Header -->
              <th
                class="py-3.5 font-bold cursor-pointer hover:text-base-content transition select-none min-w-[200px]"
                @click="toggleSort('title')"
              >
                <div class="flex items-center gap-1.5">
                  <span>PENGIRIM / JUDUL</span>
                  <icons.ArrowUpDown v-if="sortField !== 'title'" class="w-3.5 h-3.5 opacity-40" />
                  <component :is="sortOrder === 'asc' ? icons.ArrowUp : icons.ArrowDown" v-else class="w-3.5 h-3.5 text-primary" />
                </div>
              </th>

              <!-- Isi Notifikasi -->
              <th class="py-3.5 font-bold min-w-[280px]">
                ISI PESAN NOTIFIKASI
              </th>

              <!-- Waktu Diterima Header -->
              <th
                class="py-3.5 font-bold cursor-pointer hover:text-base-content transition select-none w-44"
                @click="toggleSort('createdAt')"
              >
                <div class="flex items-center gap-1.5">
                  <span>WAKTU DITERIMA</span>
                  <icons.ArrowUpDown v-if="sortField !== 'createdAt'" class="w-3.5 h-3.5 opacity-40" />
                  <component :is="sortOrder === 'asc' ? icons.ArrowUp : icons.ArrowDown" v-else class="w-3.5 h-3.5 text-primary" />
                </div>
              </th>

              <!-- Aksi -->
              <th class="py-3.5 pr-6 font-bold text-right w-36">
                AKSI
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-base-content/5">
            <tr
              v-for="item in paginatedList"
              :key="item.id"
              class="transition-colors duration-150 group"
              :class="[
                !item.isRead
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-l-indigo-600 dark:border-l-indigo-400 font-semibold'
                  : 'bg-base-100 hover:bg-base-200/40 text-base-content/70 border-l-4 border-l-transparent'
              ]"
            >
              <!-- Checkbox Selection -->
              <td class="py-3.5 pl-4 text-center">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-primary rounded"
                  :checked="selectedIds.includes(item.id)"
                  @change="toggleSelectItem(item.id)"
                />
              </td>

              <!-- Status (Belum Dibaca vs Sudah Dibaca - PEMBEDA VISUAL JELAS) -->
              <td class="py-3.5 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <!-- Indicator Badge for UNREAD -->
                  <span
                    v-if="!item.isRead"
                    class="bg-rose-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs animate-pulse"
                  >
                    <icons.BellRing class="w-3 h-3 shrink-0" />
                    Belum Dibaca
                  </span>

                  <!-- Indicator Badge for READ -->
                  <span
                    v-else
                    class="bg-base-200/80 text-base-content/60 font-medium text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 border border-base-content/10"
                  >
                    <icons.CheckCheck class="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    Sudah Dibaca
                  </span>
                </div>
              </td>

              <!-- Kategori Badge -->
              <td class="py-3.5 whitespace-nowrap">
                <span
                  class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1"
                  :class="getKategoriBadgeStyle(String(item.type))"
                >
                  <icons.MessageSquare v-if="String(item.type).startsWith('CHAT')" class="w-3 h-3" />
                  <icons.PhoneCall v-else-if="String(item.type).startsWith('WA')" class="w-3 h-3" />
                  <icons.FileText v-else-if="String(item.type).startsWith('DOC')" class="w-3 h-3" />
                  <icons.Bell v-else class="w-3 h-3" />
                  {{ getKategoriLabel(String(item.type)) }}
                </span>
              </td>

              <!-- Pengirim / Judul -->
              <td class="py-3.5">
                <div class="flex items-center gap-2.5">
                  <!-- Small Icon Avatar -->
                  <div
                    class="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border"
                    :class="[
                      !item.isRead
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-base-200 text-base-content/60 border-base-content/10'
                    ]"
                  >
                    <icons.User v-if="String(item.type) === 'CHAT_DIRECT'" class="w-3.5 h-3.5" />
                    <icons.Users v-else-if="String(item.type) === 'CHAT_GROUP'" class="w-3.5 h-3.5" />
                    <icons.AtSign v-else-if="String(item.type) === 'CHAT_MENTION'" class="w-3.5 h-3.5" />
                    <icons.FileText v-else-if="String(item.type) === 'DOC_SHARED'" class="w-3.5 h-3.5" />
                    <icons.MessageSquare v-else class="w-3.5 h-3.5" />
                  </div>

                  <div class="min-w-0">
                    <span
                      class="truncate block max-w-[220px]"
                      :class="!item.isRead ? 'font-bold text-base-content text-xs' : 'font-medium text-base-content/80 text-xs'"
                      :title="item.title"
                    >
                      {{ item.title }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Isi Pesan Notifikasi -->
              <td class="py-3.5 max-w-md">
                <div
                  class="rounded-xl px-3 py-1.5 border"
                  :class="[
                    !item.isRead
                      ? 'bg-base-100/90 border-indigo-300/40 text-base-content font-medium'
                      : 'bg-base-200/40 border-base-content/5 text-base-content/70'
                  ]"
                >
                  <p class="line-clamp-2 text-xs leading-relaxed break-words">
                    {{ item.body }}
                  </p>
                </div>
              </td>

              <!-- Waktu Diterima -->
              <td class="py-3.5 whitespace-nowrap">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-1 text-xs" :class="!item.isRead ? 'font-bold text-base-content' : 'text-base-content/70'">
                    <icons.Clock class="w-3 h-3 text-base-content/40" />
                    <span>{{ formatFullDate(item.createdAt) }}</span>
                  </div>
                  <span class="text-[10px] text-base-content/40 block pl-4">
                    {{ formatRelativeTime(item.createdAt) }}
                  </span>
                </div>
              </td>

              <!-- Aksi -->
              <td class="py-3.5 pr-6 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Button Tandai Dibaca (jika belum dibaca) -->
                  <button
                    v-if="!item.isRead"
                    @click="notifStore.markAsRead(item.id)"
                    class="btn btn-ghost btn-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg gap-1"
                    title="Tandai sebagai dibaca"
                  >
                    <icons.Check class="w-3.5 h-3.5" />
                    <span class="hidden sm:inline">Tandai Dibaca</span>
                  </button>

                  <!-- Button Buka Chat -->
                  <button
                    @click="handleOpenNotif(item)"
                    class="btn btn-xs rounded-lg font-bold gap-1 transition"
                    :class="[
                      !item.isRead
                        ? 'btn-primary shadow-xs'
                        : 'btn-outline border-base-content/20 text-base-content/80 hover:btn-primary'
                    ]"
                    title="Buka Chat Room"
                  >
                    <span>Buka Chat</span>
                    <icons.ArrowRight class="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ─── Data Tables Footer Pagination ──────────────────────────────── -->
      <div
        v-if="paginatedList.length > 0"
        class="p-4 bg-base-200/40 border-t border-base-content/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
      >
        <!-- Info Entry Range -->
        <div class="text-base-content/60 font-medium">
          Menampilkan <span class="font-bold text-base-content">{{ startEntryIndex }}</span> - <span class="font-bold text-base-content">{{ endEntryIndex }}</span> dari <span class="font-bold text-base-content">{{ totalItems }}</span> notifikasi
        </div>

        <!-- Controls Pagination Buttons -->
        <div class="flex items-center gap-1.5">
          <!-- First Page -->
          <button
            @click="currentPage = 1"
            :disabled="currentPage === 1"
            class="btn btn-ghost btn-xs btn-square rounded-lg"
            title="Halaman Pertama"
          >
            <icons.ChevronsLeft class="w-4 h-4" />
          </button>

          <!-- Prev Page -->
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="btn btn-ghost btn-xs rounded-lg gap-1"
            title="Halaman Sebelumnya"
          >
            <icons.ChevronLeft class="w-4 h-4" />
            <span class="hidden sm:inline">Sebelumnya</span>
          </button>

          <!-- Page Indicator Badge -->
          <div class="px-3 py-1 bg-base-100 rounded-lg border border-base-content/10 font-bold text-xs">
            Halaman {{ currentPage }} / {{ totalPages }}
          </div>

          <!-- Next Page -->
          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="btn btn-ghost btn-xs rounded-lg gap-1"
            title="Halaman Selanjutnya"
          >
            <span class="hidden sm:inline">Selanjutnya</span>
            <icons.ChevronRight class="w-4 h-4" />
          </button>

          <!-- Last Page -->
          <button
            @click="currentPage = totalPages"
            :disabled="currentPage === totalPages"
            class="btn btn-ghost btn-xs btn-square rounded-lg"
            title="Halaman Terakhir"
          >
            <icons.ChevronsRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
