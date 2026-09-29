<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as icons from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSlugRoute } from '@/composables/useSlugRoute'
import { useNotificationStore } from '@/stores/notification'
import type { AppNotification } from '@/types/notification'
import { useToast } from '@/composables/useToast'

import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

useHead({ title: 'Notifikasi Chat' })
definePageMeta({ layout: 'admin' })

const router = useRouter()
const { slugPath } = useSlugRoute()
const notifStore = useNotificationStore()
const chatStore = useChatStore()
const authStore = useAuthStore()
const toast = useToast()

const filterTab = ref<'all' | 'unread'>('all')
const filterType = ref<string>('ALL')
const searchQuery = ref('')

const loadData = async () => {
  authStore.syncCookies()
  if (authStore.token) {
    await Promise.all([
      notifStore.fetchNotifications(false),
      notifStore.fetchUnreadCount(),
      chatStore.fetchConversations(),
    ])
  }
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

const handleTabChange = async (tab: 'all' | 'unread') => {
  filterTab.value = tab
  if (notifStore.notifications.length === 0) {
    await loadData()
  }
}

/** Konversi percakapan /chat/conversations menjadi notifikasi tampilan */
const conversationNotifications = computed<AppNotification[]>(() => {
  if (!chatStore.conversations.length) return []

  return chatStore.conversations
    .filter((c) => c.lastMessage || (c.unreadCount ?? 0) > 0)
    .map((c) => {
      const senderName =
        c.lastMessage?.sender?.pegawai?.name ||
        c.lastMessage?.sender?.username ||
        (c.type === 'GROUP' ? c.name : 'Pengguna')
      const isGroup = c.type === 'GROUP' || Boolean(c.name)
      const title = isGroup ? `${senderName} @ ${c.name || 'Grup'}` : senderName

      return {
        id: `conv-${c.id}`,
        userId: Number(authStore.id_user ?? 0),
        tenantId: (c.tenantId as any) ?? null,
        type: isGroup ? ('CHAT_GROUP' as any) : ('CHAT_DIRECT' as any),
        title: title || 'Pesan Percakapan',
        body: c.lastMessage?.content || (c.lastMessage?.attachmentUrl ? '[Lampiran File]' : 'Ada pesan percakapan'),
        actionUrl: `/chat?convId=${c.id}`,
        payload: { conversationId: c.id, messageId: c.lastMessage?.id },
        isRead: (c.unreadCount ?? 0) === 0,
        readAt: null,
        createdAt: c.lastMessage?.createdAt || c.lastActivityAt || new Date().toISOString(),
      }
    })
})

/** Gabungkan riwayat notifikasi DB + percakapan chat aktif */
const allCombinedNotifications = computed<AppNotification[]>(() => {
  const dbNotifs = notifStore.notifications
  const convNotifs = conversationNotifications.value

  const result: AppNotification[] = [...dbNotifs]
  const existingConvIds = new Set(
    dbNotifs.map((n) => n.payload?.conversationId).filter(Boolean),
  )

  for (const convNotif of convNotifs) {
    if (!existingConvIds.has(convNotif.payload?.conversationId)) {
      result.push(convNotif)
    }
  }

  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
})

/** Filtered list berdasarkan pencarian & kategori */
const filteredList = computed(() => {
  let list =
    filterTab.value === 'unread'
      ? allCombinedNotifications.value.filter((n) => !n.isRead)
      : allCombinedNotifications.value

  if (filterType.value !== 'ALL') {
    list = list.filter((n) => String(n.type) === filterType.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
    )
  }

  return list
})

/** Aksi tandai semua dibaca */
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
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Label kategori */
const getKategoriLabel = (type: string) => {
  switch (type) {
    case 'CHAT_THREAD_REPLY': return 'Balasan Thread'
    case 'CHAT_GROUP': return 'Chat Grup'
    case 'CHAT_DIRECT': return 'Pesan Pribadi'
    case 'CHAT_MENTION': return 'Mention'
    case 'WA_INCOMING': return 'WhatsApp'
    case 'DOC_SHARED': return 'Dokumen'
    default: return 'Sistem'
  }
}

/** Warna badge kategori */
const getKategoriColor = (type: string) => {
  switch (type) {
    case 'CHAT_THREAD_REPLY': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200'
    case 'CHAT_GROUP': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200'
    case 'CHAT_DIRECT': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200'
    case 'CHAT_MENTION': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200'
    case 'WA_INCOMING': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
    default: return 'bg-base-200 text-base-content/70 border-base-content/10'
  }
}
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto pb-12">
    <!-- ─── Header Halaman ─────────────────────────────────────────────── -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-100 p-6 rounded-3xl border border-base-content/10 shadow-xs">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <icons.Bell class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-base-content tracking-tight">
              Notifikasi Chat & Balasan
            </h1>
            <span
              v-if="notifStore.unreadCount > 0"
              class="badge badge-error text-white font-bold text-xs"
            >
              {{ notifStore.unreadCount }} Belum Dibaca
            </span>
          </div>
          <p class="text-xs sm:text-sm text-base-content/60 mt-0.5">
            Kelola dan tinjau seluruh pesan masuk, balasan thread, dan notifikasi aktivitas Anda.
          </p>
        </div>
      </div>

      <!-- Action Button Top -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="notifStore.unreadCount > 0"
          @click="handleMarkAllRead"
          class="btn btn-outline btn-primary btn-sm rounded-xl font-bold gap-1.5"
        >
          <icons.CheckCheck class="w-4 h-4" />
          Tandai Semua Dibaca
        </button>
        <button
          @click="router.push(slugPath('/chat'))"
          class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5"
        >
          <icons.MessageSquare class="w-4 h-4" />
          Buka Chat Room
        </button>
      </div>
    </div>

    <!-- ─── Filter Bar & Search ───────────────────────────────────────── -->
    <div class="bg-base-100 p-4 sm:p-5 rounded-2xl border border-base-content/10 shadow-xs space-y-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        <!-- Tab Navigation (Belum Dibaca vs Semua) -->
        <div class="flex bg-base-200/60 p-1 rounded-xl shrink-0">
          <button
            class="px-4 py-1.5 text-xs font-bold rounded-lg transition"
            :class="filterTab === 'unread' ? 'bg-base-100 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-base-content/60 hover:text-base-content'"
            @click="handleTabChange('unread')"
          >
            Belum Dibaca ({{ notifStore.unreadNotifications.length }})
          </button>
          <button
            class="px-4 py-1.5 text-xs font-bold rounded-lg transition"
            :class="filterTab === 'all' ? 'bg-base-100 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-base-content/60 hover:text-base-content'"
            @click="handleTabChange('all')"
          >
            Semua ({{ notifStore.notifications.length }})
          </button>
        </div>

        <!-- Right Filters: Category & Search -->
        <div class="flex flex-col sm:flex-row items-center gap-2.5 flex-1 max-w-lg">
          <!-- Kategori Dropdown -->
          <select
            v-model="filterType"
            class="select select-sm w-full sm:w-44 rounded-xl bg-base-200/60 border-base-content/10 text-xs font-semibold"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="CHAT_DIRECT">Pesan Pribadi</option>
            <option value="CHAT_GROUP">Chat Grup</option>
            <option value="CHAT_THREAD_REPLY">Balasan Thread</option>
            <option value="CHAT_MENTION">Mention</option>
            <option value="WA_INCOMING">WhatsApp</option>
          </select>

          <!-- Input Search -->
          <div class="relative w-full flex-1">
            <icons.Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari kata kunci notifikasi..."
              class="input input-sm w-full rounded-xl pl-9 bg-base-200/60 border-base-content/10 focus:border-primary/40 text-xs"
            />
          </div>
        </div>

      </div>
    </div>

    <!-- ─── Daftar Notifikasi ───────────────────────────────────────────── -->
    <div class="space-y-3">
      <div v-if="notifStore.isLoading" class="p-12 text-center bg-base-100 rounded-3xl border border-base-content/10">
        <span class="loading loading-spinner loading-lg text-primary" />
        <p class="text-xs text-base-content/50 mt-2">Memuat riwayat notifikasi...</p>
      </div>

      <template v-else-if="filteredList.length > 0">
        <div
          v-for="item in filteredList"
          :key="item.id"
          class="bg-base-100 rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4 group hover:shadow-md"
          :class="[
            !item.isRead
              ? 'border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/10'
              : 'border-base-content/10 hover:border-base-content/20',
          ]"
        >
          <!-- Left Content -->
          <div class="flex items-start gap-3.5 flex-1 min-w-0">
            <!-- Icon Avatar / Category -->
            <div
              class="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs group-hover:scale-105 transition"
              :class="getKategoriColor(String(item.type))"
            >
              <icons.MessageSquare v-if="String(item.type).startsWith('CHAT')" class="w-5.5 h-5.5" />
              <icons.PhoneCall v-else-if="String(item.type).startsWith('WA')" class="w-5.5 h-5.5" />
              <icons.FileText v-else-if="String(item.type).startsWith('DOC')" class="w-5.5 h-5.5" />
              <icons.Bell v-else class="w-5.5 h-5.5" />
            </div>

            <!-- Text Preview -->
            <div class="space-y-1 flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <!-- Title -->
                <h3 class="font-bold text-sm text-base-content tracking-tight">
                  {{ item.title }}
                </h3>

                <!-- Badge Kategori -->
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0"
                  :class="getKategoriColor(String(item.type))"
                >
                  {{ getKategoriLabel(String(item.type)) }}
                </span>

                <!-- Unread Indicator Badge -->
                <span
                  v-if="!item.isRead"
                  class="badge badge-primary badge-xs text-[10px] font-bold shrink-0 animate-pulse"
                >
                  Belum Dibaca
                </span>
              </div>

              <!-- Body / Message Content -->
              <div class="bg-base-200/40 rounded-xl p-3 border border-base-content/5 mt-1.5">
                <p class="text-xs text-base-content/80 leading-relaxed break-words font-medium">
                  {{ item.body }}
                </p>
              </div>

              <!-- Timestamp -->
              <p class="text-[10px] text-base-content/40 flex items-center gap-1 pt-0.5">
                <icons.Clock class="w-3 h-3" />
                <span>Diterima pada {{ formatFullDate(item.createdAt) }}</span>
              </p>
            </div>
          </div>

          <!-- Right Action Button -->
          <div class="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-base-content/10">
            <button
              v-if="!item.isRead"
              @click="notifStore.markAsRead(item.id)"
              class="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content rounded-lg"
              title="Tandai sebagai dibaca"
            >
              <icons.Check class="w-3.5 h-3.5" />
              <span class="sm:hidden">Tandai Dibaca</span>
            </button>

            <button
              @click="handleOpenNotif(item)"
              class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 shadow-sm hover:scale-105 transition"
            >
              <span>Buka Chat</span>
              <icons.ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="p-16 text-center bg-base-100 rounded-3xl border border-base-content/10 space-y-3">
        <div class="w-16 h-16 rounded-full bg-base-200/60 flex items-center justify-center mx-auto text-base-content/30">
          <icons.BellOff class="w-8 h-8" />
        </div>
        <div>
          <h3 class="font-bold text-base text-base-content">
            Tidak ada notifikasi {{ filterTab === 'unread' ? 'belum dibaca' : '' }}
          </h3>
          <p class="text-xs text-base-content/50 max-w-sm mx-auto mt-1">
            {{ searchQuery ? 'Tidak ada notifikasi yang cocok dengan kata kunci pencarian Anda.' : 'Seluruh pesan dan notifikasi aktivitas Anda sudah up-to-date!' }}
          </p>
        </div>
        <button
          v-if="filterTab === 'unread' && notifStore.notifications.length > 0"
          @click="handleTabChange('all')"
          class="btn btn-ghost btn-xs text-primary font-bold mt-2"
        >
          Lihat Semua Notifikasi
        </button>
      </div>
    </div>
  </div>
</template>
