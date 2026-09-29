import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useChatService } from '@/services/chatService'
import { useAuthStore } from '@/stores/auth'
import type {
  ChatConversation,
  ChatMessage,
  CreateConversationDto,
  SendMessageDto,
  TypingUser,
  OnlineUsersMap,
  WsUserTypingEvent,
  WsReadReceiptEvent,
  WsReactionEvent,
  WsPresenceEvent,
  WsConversationReadEvent,
} from '@/types/chat'

/**
 * useChatStore — State Management terpusat untuk fitur Chat.
 *
 * Bertanggung jawab atas:
 * - Daftar percakapan (inbox)
 * - Pesan per percakapan (Map<conversationId, ChatMessage[]>)
 * - Status percakapan aktif
 * - Status online/offline user
 * - Typing indicator
 * - Pagination cursor per percakapan
 */
export const useChatStore = defineStore('chat', () => {
  // ─── Services ─────────────────────────────────────────────────────────────

  const chatService = useChatService()
  const authStore = useAuthStore()

  // ─── State ─────────────────────────────────────────────────────────────────

  const conversations = ref<ChatConversation[]>([])
  const activeConversationId = ref<string | null>(null)
  const messagesMap = ref<Record<string, ChatMessage[]>>({})
  const cursorMap = ref<Record<string, string | null>>({})
  const hasMoreMap = ref<Record<string, boolean>>({})
  const typingUsers = ref<TypingUser[]>([])
  const onlineUsers = ref<OnlineUsersMap>({})
  const isLoadingConversations = ref(false)
  const isLoadingMessages = ref(false)
  const isSending = ref(false)
  const socketConnected = ref(false)

  // ─── Thread State ─────────────────────────────────────────────────────────

  const activeThreadMessageId = ref<string | null>(null)
  const activeThreadRootMessage = ref<ChatMessage | null>(null)
  const threadMessagesMap = ref<Record<string, ChatMessage[]>>({})
  const isLoadingThread = ref(false)

  // Highlight message ID (digunakan untuk auto-focus pesan dari notifikasi)
  const highlightedMessageId = ref<string | null>(null)
  let highlightTimer: any = null

  // ─── Lightbox Modal State ──────────────────────────────────────────────────
  const lightboxMedia = ref<{ url: string; name?: string; type: string } | null>(null)

  const openLightboxMedia = (media: { url: string; name?: string; type: string }) => {
    lightboxMedia.value = media
  }

  const closeLightboxMedia = () => {
    lightboxMedia.value = null
  }

  const setHighlightMessage = (msgId: string | null) => {
    highlightedMessageId.value = msgId ? String(msgId) : null
    if (highlightTimer) clearTimeout(highlightTimer)
    if (msgId) {
      highlightTimer = setTimeout(() => {
        highlightedMessageId.value = null
      }, 4500)
    }
  }

  /**
   * Timestamp pembukaan thread per message ID.
   * Persisted di localStorage (per user) agar balasan yang sudah dibaca tetap bertipe sudah dibaca saat reload.
   */
  const openedThreadTimestamps = ref<Record<string, number>>({})

  const loadOpenedThreads = () => {
    if (typeof window === 'undefined') return
    try {
      const uid = authStore.id_user || 'default'
      const rawDefault = localStorage.getItem('chat_thread_read_at_default')
      const parsedDefault = rawDefault ? JSON.parse(rawDefault) : {}
      const rawUser = localStorage.getItem(`chat_thread_read_at_${uid}`)
      const parsedUser = rawUser ? JSON.parse(rawUser) : {}
      openedThreadTimestamps.value = { ...parsedDefault, ...parsedUser }
    } catch {
      openedThreadTimestamps.value = {}
    }
  }

  const saveOpenedThreads = (map: Record<string, number>) => {
    if (typeof window === 'undefined') return
    try {
      const uid = authStore.id_user || 'default'
      localStorage.setItem(`chat_thread_read_at_${uid}`, JSON.stringify(map))
    } catch {
      // Ignore
    }
  }

  // Auto load saat store dibuat
  if (typeof window !== 'undefined') {
    loadOpenedThreads()
  }

  // Watch authStore.id_user agar jika user ID baru terisi (misal setelah async auth load),
  // openedThreadTimestamps otomatis di-load ulang dari localStorage user tersebut.
  watch(
    () => authStore.id_user,
    () => {
      loadOpenedThreads()
    },
    { immediate: true },
  )

  const markThreadOpened = (threadId: string, customTimestamp?: number) => {
    if (!threadId) return
    const pIdStr = String(threadId)
    const storeReplies = threadMessagesMap.value[pIdStr] ?? []

    let maxReplyTime = customTimestamp ?? 0
    for (const r of storeReplies) {
      const rawDate =
        r.createdAt ||
        (r as any).created_at ||
        (r as any).created_at_time ||
        (r as any).updatedAt ||
        (r as any).updated_at
      const t = rawDate ? new Date(rawDate).getTime() : 0
      if (!isNaN(t) && t > maxReplyTime) {
        maxReplyTime = t
      }
    }

    const effectiveTime = Math.max(Date.now(), maxReplyTime + 1000)

    const updated = {
      ...openedThreadTimestamps.value,
      [pIdStr]: effectiveTime,
    }
    openedThreadTimestamps.value = updated
    saveOpenedThreads(updated)
  }

  /**
   * Cek apakah thread sudah pernah dibuka oleh user ini.
   * Return true jika:
   * - Thread sedang aktif terbuka di panel saat ini, ATAU
   * - Thread sudah pernah dibuka sebelumnya (ada di openedThreadTimestamps)
   *
   * Dengan demikian badge unread tidak kembali muncul setelah thread ditutup.
   */
  const isThreadOpened = (threadId: string): boolean => {
    if (!threadId) return false
    const pIdStr = String(threadId)
    // Sedang aktif terbuka
    if (String(activeThreadMessageId.value) === pIdStr) return true
    // Sudah pernah dibuka (ada timestamp)
    return (openedThreadTimestamps.value[pIdStr] ?? 0) > 0
  }

  const getThreadReadTimestamp = (threadId: string): number => {
    if (!threadId) return 0
    return openedThreadTimestamps.value[String(threadId)] ?? 0
  }

  const clearThreadOpened = (threadId: string) => {
    if (!threadId || !openedThreadTimestamps.value[String(threadId)]) return
    const copy = { ...openedThreadTimestamps.value }
    delete copy[String(threadId)]
    openedThreadTimestamps.value = copy
    saveOpenedThreads(copy)
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  const activeConversation = computed(() =>
    conversations.value.find((c) => c.id === activeConversationId.value) ?? null,
  )

  const activeMessages = computed(() =>
    activeConversationId.value ? (messagesMap.value[activeConversationId.value] ?? []) : [],
  )

  const totalUnread = computed(() =>
    conversations.value.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  )

  const typingInActive = computed(() =>
    typingUsers.value.filter((t) => t.conversationId === activeConversationId.value),
  )

  const isUserOnline = (userId: number) => computed(() => !!onlineUsers.value[userId])

  const activeThreadMessage = computed(() => {
    if (!activeThreadMessageId.value) return null
    if (activeThreadRootMessage.value && activeThreadRootMessage.value.id === activeThreadMessageId.value) {
      return activeThreadRootMessage.value
    }
    if (!activeConversationId.value) return null
    const list = messagesMap.value[activeConversationId.value] ?? []
    return list.find((m) => m.id === activeThreadMessageId.value) ?? null
  })

  const activeThreadReplies = computed(() => {
    if (!activeThreadMessageId.value) return []
    return threadMessagesMap.value[activeThreadMessageId.value] ?? []
  })

  // ─── Actions: Conversations ───────────────────────────────────────────────

  const fetchConversations = async () => {
    isLoadingConversations.value = true
    try {
      const rawConversations = await chatService.getConversations()

      // Saring lastMessage: jangan tampilkan thread reply sebagai pesan terakhir di sidebar.
      // Thread reply memiliki parentMessageId yang bukan null.
      conversations.value = rawConversations.map((conv) => ({
        ...conv,
        lastMessage:
          conv.lastMessage?.parentMessageId != null
            ? null
            : conv.lastMessage,
      }))
    } finally {
      isLoadingConversations.value = false
    }
  }

  const createConversation = async (dto: CreateConversationDto): Promise<ChatConversation> => {
    const conv = await chatService.createConversation(dto)
    // Tambahkan ke daftar jika belum ada
    if (!conversations.value.find((c) => c.id === conv.id)) {
      conversations.value.unshift(conv)
    }
    return conv
  }

  const setActiveConversation = async (conversationId: string) => {
    activeConversationId.value = conversationId
    activeThreadMessageId.value = null // Tutup thread panel saat ganti conversation

    // Optimistic update: reset unread di local state segera agar UX responsif
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (conv) conv.unreadCount = 0

    // Load pesan jika belum ada di cache
    if (!messagesMap.value[conversationId]) {
      await fetchMessages(conversationId)
    }

    // Sync ke backend secara async (non-blocking) agar lastReadAt participant diperbarui.
    chatService.markAllRead(conversationId).catch(() => {})
  }

  const markAllReadLocal = async (conversationId: string) => {
    await chatService.markAllRead(conversationId)
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (conv) conv.unreadCount = 0
  }

  /**
   * Dipanggil dari WebSocket event 'conversation_read'.
   * Sinkronisasi status unread antar device/tab milik user yang sama.
   * Misal: user membuka conversation di tab lain → tab ini ikut reset badge.
   */
  const handleConversationRead = (payload: WsConversationReadEvent) => {
    // Hanya update jika event berasal dari user sendiri (multi-device sync)
    if (String(payload.userId) !== String(authStore.id_user)) return

    const conv = conversations.value.find((c) => c.id === payload.conversationId)
    if (conv) conv.unreadCount = 0
  }

  // ─── Actions: Messages ────────────────────────────────────────────────────

  /**
   * Helper: ambil angka replyCount dari backend saja (berbagai naming convention).
   * Tidak membaca local cache — murni dari data server.
   */
  const extractBackendReplyCount = (msg: any): number => {
    if (!msg) return 0
    if (typeof msg.replyCount === 'number') return msg.replyCount
    if (typeof msg.reply_count === 'number') return msg.reply_count
    if (typeof msg.threadsCount === 'number') return msg.threadsCount
    if (typeof msg.threadCount === 'number') return msg.threadCount
    if (typeof msg._count?.threads === 'number') return msg._count.threads
    if (typeof msg._count?.replies === 'number') return msg._count.replies
    if (typeof msg._count?.threadReplies === 'number') return msg._count.threadReplies
    if (Array.isArray(msg.threads)) return msg.threads.length
    return 0
  }

  /**
   * Helper: replyCount terbaik = max(backend, local cache).
   * Dipakai setelah preload thread selesai.
   */
  const getMessageReplyCount = (msg: any): number => {
    const backendCount = extractBackendReplyCount(msg)
    if (!msg?.id) return backendCount
    const localReplies = threadMessagesMap.value[String(msg.id)]
    const localCount = Array.isArray(localReplies) ? localReplies.length : 0
    return Math.max(localCount, backendCount)
  }

  /**
   * Background preload balasan thread — TIDAK memengaruhi UI spinner (isLoadingThread).
   * Dipanggil dari fetchMessages untuk setiap pesan yang replyCount > 0.
   *
   * Menggunakan unreadThreadCount dari server (berbasis message_read_receipts)
   * sebagai sumber kebenaran utama, dengan fallback ke localStorage timestamp.
   */
  const preloadThreadReplies = async (conversationId: string, parentMessageId: string) => {
    const pIdStr = String(parentMessageId)

    try {
      const { replies, unreadThreadCount: serverUnread } = await chatService.getThreadReplies(conversationId, pIdStr)
      const normalizedReplies = replies.map((r) => ({
        ...r,
        replyCount: extractBackendReplyCount(r),
      }))

      threadMessagesMap.value = {
        ...threadMessagesMap.value,
        [pIdStr]: normalizedReplies,
      }

      // Gunakan unreadCount dari server sebagai sumber utama (persisten).
      // Fallback: jika server mengembalikan 0 tapi thread belum pernah dibuka,
      // hitung dari localStorage timestamp sebagai cadangan.
      const isCurrentlyOpen = isThreadOpened(pIdStr)
      let unreadCount = 0

      if (!isCurrentlyOpen) {
        // Server sudah tahu berapa yang belum dibaca — gunakan itu
        unreadCount = serverUnread

        // Jika server bilang 0 tapi ada timestamp localStorage yang lebih lama,
        // cek apakah ada pesan baru setelah timestamp tersebut
        if (unreadCount === 0) {
          const openedAt = getThreadReadTimestamp(pIdStr)
          if (openedAt > 0) {
            // Ada timestamp tapi server bilang 0 — percaya server
            unreadCount = 0
          }
        }
      }

      // Update replyCount & unreadThreadCount pesan induk
      const targetConvId = conversationId || activeConversationId.value || ''
      const rootList = messagesMap.value[targetConvId]
      if (rootList) {
        const idx = rootList.findIndex((m) => String(m.id) === pIdStr)
        if (idx !== -1) {
          const parentMsg = rootList[idx]
          rootList[idx] = {
            ...parentMsg,
            replyCount: Math.max(normalizedReplies.length, extractBackendReplyCount(parentMsg)),
            hasUnreadThread: unreadCount > 0,
            unreadThreadCount: unreadCount,
          }
          // Trigger Vue 3 reactivity dengan mereassign array reference
          messagesMap.value = {
            ...messagesMap.value,
            [targetConvId]: [...rootList],
          }
        }
      }
    } catch {
      // Silent fail — preload tidak kritikal
    }
  }

  /**
   * Fetch histori pesan (cursor-based). Mendukung load-more dengan cursor.
   */
  const fetchMessages = async (conversationId: string, before?: string) => {
    isLoadingMessages.value = true
    try {
      const result = await chatService.getMessages(conversationId, 50, before)

      if (!messagesMap.value[conversationId]) {
        messagesMap.value[conversationId] = []
      }

      const rawData = result.data ?? []

      // ── Pisahkan root messages dan thread replies ────────────────────────
      // ATURAN KETAT: Pesan dengan parentMessageId TIDAK BOLEH masuk messagesMap.
      // Hanya tampil di threadMessagesMap dan Thread Panel.
      const rootMessages: ChatMessage[] = []
      for (const msg of rawData) {
        const rawPId =
          msg.parentMessageId ||
          (msg as any).parent_message_id ||
          (msg as any).parentId ||
          (msg as any).parent_id ||
          (msg as any).parent?.id ||
          null
        const pId = rawPId ? String(rawPId) : null

        if (pId) {
          // Pesan adalah thread reply — simpan ke threadMessagesMap saja
          const existing = threadMessagesMap.value[pId] ?? []
          if (!existing.find((r) => String(r.id) === String(msg.id))) {
            threadMessagesMap.value = {
              ...threadMessagesMap.value,
              [pId]: [...existing, { ...msg, parentMessageId: pId }],
            }
          }
        } else {
          // Pesan adalah root — masuk ke main messages list
          rootMessages.push(msg)
        }
      }

      // Normalisasi root messages
      const normalizedData = rootMessages.map((msg) => {
        const pIdStr = String(msg.id)
        const localReplies = threadMessagesMap.value[pIdStr] ?? []
        const backendCount = extractBackendReplyCount(msg)
        const totalReplyCount = Math.max(localReplies.length, backendCount)

        const isOpened = isThreadOpened(pIdStr)
        const openedAt = getThreadReadTimestamp(pIdStr)
        let unreadCount = isOpened ? 0 : ((msg as any).unreadThreadCount ?? 0)

        if (!isOpened && localReplies.length > 0) {
          const myId = authStore.id_user
          const myUsername = authStore.username
          unreadCount = localReplies.filter((r) => {
            const actualSenderId =
              r.senderId ||
              (r as any).sender?.id ||
              (r as any).sender_id ||
              (r as any).userId ||
              (r as any).user_id
            if (myId && actualSenderId != null && String(actualSenderId) === String(myId)) return false
            const actualUsername =
              r.senderUsername ||
              (r as any).senderUsername ||
              (r as any).sender?.username ||
              (r as any).username
            if (myUsername && actualUsername && actualUsername === myUsername) return false

            if (openedAt > 0) {
              const replyTime = new Date(r.createdAt).getTime()
              if (replyTime <= openedAt) return false
            }
            return true
          }).length
        }

        return {
          ...msg,
          replyCount: totalReplyCount,
          unreadThreadCount: unreadCount,
          hasUnreadThread: unreadCount > 0,
        }
      })

      if (before) {
        messagesMap.value[conversationId].unshift(...normalizedData)
      } else {
        messagesMap.value[conversationId] = normalizedData
      }

      // ── Background preload thread replies ───────────────────────────────
      // Preload balasan thread secara background untuk setiap pesan root,
      // sehingga tidak bergantung hanya pada backend `replyCount` summary.
      Promise.allSettled(
        normalizedData.map((msg) => preloadThreadReplies(conversationId, String(msg.id))),
      )

      cursorMap.value[conversationId] = result.nextCursor
      hasMoreMap.value[conversationId] = result.hasMore
    } finally {
      isLoadingMessages.value = false
    }
  }

  const loadMoreMessages = async (conversationId: string) => {
    const cursor = cursorMap.value[conversationId]
    if (!cursor || !hasMoreMap.value[conversationId]) return
    await fetchMessages(conversationId, cursor)
  }

  // ─── Actions: Thread Chat ───────────────────────────────────────────────────

  /**
   * Ambil balasan thread dari sebuah pesan induk.
   * Fetch eksplisit ini menampilkan spinner di panel thread.
   * unreadThreadCount diambil dari server (berbasis read receipts) — sudah pasti 0
   * karena dipanggil saat user membuka thread panel (semua sudah dianggap terbaca).
   */
  const fetchThreadReplies = async (conversationId: string, parentMessageId: string) => {
    isLoadingThread.value = true
    const pIdStr = String(parentMessageId)
    try {
      const { replies } = await chatService.getThreadReplies(conversationId, pIdStr)
      const normalizedReplies = replies.map((r) => ({
        ...r,
        replyCount: extractBackendReplyCount(r),
        unreadThreadCount: 0,
        hasUnreadThread: false,
      }))

      threadMessagesMap.value = {
        ...threadMessagesMap.value,
        [pIdStr]: normalizedReplies,
      }

      // Update replyCount pesan induk di main messages list
      const targetConvId = conversationId || activeConversationId.value || ''
      const rootList = messagesMap.value[targetConvId]
      if (rootList) {
        const idx = rootList.findIndex((m) => String(m.id) === pIdStr)
        if (idx !== -1) {
          rootList[idx] = {
            ...rootList[idx],
            replyCount: Math.max(normalizedReplies.length, extractBackendReplyCount(rootList[idx])),
            // Reset unread saat thread dibuka eksplisit
            unreadThreadCount: 0,
            hasUnreadThread: false,
          }
          messagesMap.value = {
            ...messagesMap.value,
            [targetConvId]: [...rootList],
          }
        }
      }
    } finally {
      isLoadingThread.value = false
    }
  }

  /**
   * Buka thread panel untuk sebuah pesan.
   * - Set activeThreadMessageId agar panel terbuka
   * - Tandai thread sebagai sudah dibuka (simpan ke localStorage)
   * - Reset badge unread di pesan induk
   * - Fetch balasan dari server, lalu perbarui timestamp read agar mencakup semua balasan
   * - Panggil markMessageRead ke backend untuk semua balasan yang belum dibaca
   *   agar status terbaca persisten di server (tidak kembali setelah refresh)
   */
  const openThread = async (messageId: string, rootMsg?: ChatMessage | null) => {
    const msgIdStr = String(messageId)
    activeThreadMessageId.value = msgIdStr

    // Tandai thread sudah dibuka dengan timestamp awal (sebelum fetch)
    markThreadOpened(msgIdStr)

    if (rootMsg) {
      activeThreadRootMessage.value = rootMsg
      ;(rootMsg as any).hasUnreadThread = false
      ;(rootMsg as any).unreadThreadCount = 0
    } else {
      const list = activeConversationId.value
        ? (messagesMap.value[activeConversationId.value] ?? [])
        : []
      const found = list.find((m) => String(m.id) === msgIdStr)
      if (found) {
        ;(found as any).hasUnreadThread = false
        ;(found as any).unreadThreadCount = 0
        activeThreadRootMessage.value = found
      }
    }

    const convId =
      activeConversationId.value ||
      rootMsg?.conversationId ||
      (activeThreadRootMessage.value as any)?.conversationId ||
      ''

    if (convId) {
      const rootList = messagesMap.value[convId]
      let clearedUnread = 0
      if (rootList) {
        const idx = rootList.findIndex((m) => String(m.id) === msgIdStr)
        if (idx !== -1) {
          clearedUnread = rootList[idx].unreadThreadCount ?? 0
          rootList[idx] = {
            ...rootList[idx],
            hasUnreadThread: false,
            unreadThreadCount: 0,
          }
          messagesMap.value = {
            ...messagesMap.value,
            [convId]: [...rootList],
          }
        }
      }

      const conv = conversations.value.find((c) => String(c.id) === String(convId))
      if (conv && clearedUnread > 0) {
        conv.unreadCount = Math.max(0, (conv.unreadCount ?? 0) - clearedUnread)
      }

      // 1. Panggil markThreadRead ke backend TERLEBIH DAHULU (await persistence)
      // agar DB mencatat read receipt SEBELUM fetchThreadReplies memanggil findThreads
      await chatService.markThreadRead(convId, msgIdStr).catch(() => {})

      // 2. Fetch balasan dari server (sekarang backend findThreads mengembalikan unreadThreadCount: 0)
      await fetchThreadReplies(convId, msgIdStr)

      // 3. Perbarui timestamp lokal setelah fetch selesai
      markThreadOpened(msgIdStr)
    }
  }

  /**
   * Tutup thread panel.
   */
  const closeThread = () => {
    activeThreadMessageId.value = null
    activeThreadRootMessage.value = null
  }

  const processedMessageIds = ref<Set<string>>(new Set())

  /**
   * Tambahkan pesan baru ke akhir list (dipanggil dari WebSocket new_message).
   */
  const appendMessage = (message: ChatMessage) => {
    if (!message || !message.id) return

    const msgId = String(message.id)
    if (processedMessageIds.value.has(msgId)) {
      // Abaikan duplikasi event WebSocket untuk pesan yang sama
      return
    }
    processedMessageIds.value.add(msgId)
    if (processedMessageIds.value.size > 500) {
      const firstVal = processedMessageIds.value.values().next().value
      if (firstVal) processedMessageIds.value.delete(firstVal)
    }

    const rawConvId =
      message.conversationId ||
      (message as any).conversation_id ||
      (message as any).conversationId ||
      (message as any).conversation?.id ||
      activeConversationId.value ||
      ''

    const conversationId = String(rawConvId)

    const rawPId =
      message.parentMessageId ||
      (message as any).parent_message_id ||
      (message as any).parentId ||
      (message as any).parent_id ||
      (message as any).parent?.id ||
      null

    const parentMessageId = rawPId ? String(rawPId) : null

    const normalizedMsg: ChatMessage = {
      ...message,
      conversationId,
      parentMessageId,
      replyCount: extractBackendReplyCount(message),
    }

    if (parentMessageId) {
      // ── Balasan thread ─────────────────────────────────────────────────────
      // ATURAN KETAT: Thread reply TIDAK PERNAH masuk ke messagesMap.
      // Hanya disimpan di threadMessagesMap.
      const currentReplies = threadMessagesMap.value[parentMessageId] ?? []
      const exists = currentReplies.find((m) => String(m.id) === String(normalizedMsg.id))
      if (!exists) {
        threadMessagesMap.value = {
          ...threadMessagesMap.value,
          [parentMessageId]: [...currentReplies, normalizedMsg],
        }
      }

      // ── Update replyCount & unreadThreadCount di pesan induk ──────────────
      const targetConvId = conversationId || activeConversationId.value || ''
      const rootList = messagesMap.value[targetConvId]
      if (rootList) {
        const idx = rootList.findIndex((m) => String(m.id) === parentMessageId)
        if (idx !== -1) {
          const parentMsg = rootList[idx]
          const currentRepliesCount = threadMessagesMap.value[parentMessageId]?.length ?? 0
          const newReplyCount = Math.max((parentMsg.replyCount ?? 0) + 1, currentRepliesCount)

          // Tentukan apakah pesan ini membuat unread baru
          const isThreadCurrentlyOpen = String(activeThreadMessageId.value) === parentMessageId

          const myId = authStore.id_user
          const myUsername = authStore.username
          const sId =
            normalizedMsg.senderId ||
            (normalizedMsg as any).sender?.id ||
            (normalizedMsg as any).sender_id ||
            (normalizedMsg as any).userId ||
            (normalizedMsg as any).user_id
          const sUsername =
            normalizedMsg.senderUsername ||
            (normalizedMsg as any).sender?.username ||
            (normalizedMsg as any).sender?.pegawai?.name ||
            (normalizedMsg as any).username ||
            ''

          let isOwnMessage = false
          if (myId && sId != null && String(sId) === String(myId)) isOwnMessage = true
          if (myUsername && sUsername && sUsername === myUsername) isOwnMessage = true

          const isNewUnread = !isThreadCurrentlyOpen && !isOwnMessage
          const prevUnread = parentMsg.unreadThreadCount ?? 0
          const newUnread = isNewUnread
            ? prevUnread + 1
            : isThreadCurrentlyOpen
              ? 0
              : prevUnread

          if (isNewUnread) {
            clearThreadOpened(parentMessageId)
          }

          // Reassign item dengan spread baru agar Vue 3 mendeteksi perubahan
          const updatedList = [...rootList]
          updatedList[idx] = {
            ...parentMsg,
            replyCount: newReplyCount,
            hasUnreadThread: newUnread > 0,
            unreadThreadCount: newUnread,
          }
          // Re-assign referensi array untuk memicu reactivity Vue 3
          messagesMap.value = {
            ...messagesMap.value,
            [targetConvId]: updatedList,
          }
        }
      }

      // Update unread count percakapan di inbox jika balasan dari orang lain & thread sedang tidak terbuka
      const conv = conversations.value.find((c) => String(c.id) === String(targetConvId))
      if (conv) {
        conv.lastActivityAt = normalizedMsg.createdAt
        const isThreadCurrentlyOpen = String(activeThreadMessageId.value) === parentMessageId
        const myId = authStore.id_user
        const sId =
          normalizedMsg.senderId ||
          (normalizedMsg as any).sender?.id ||
          (normalizedMsg as any).sender_id ||
          (normalizedMsg as any).userId ||
          (normalizedMsg as any).user_id
        const isOwnMessage = myId && sId != null && String(sId) === String(myId)

        if (!isOwnMessage && (!isThreadCurrentlyOpen || targetConvId !== activeConversationId.value)) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1
        }
        sortConversations()
      }
    } else {
      // ── Root message ──────────────────────────────────────────────────────
      if (!messagesMap.value[conversationId]) {
        messagesMap.value[conversationId] = []
      }
      const exists = messagesMap.value[conversationId].find(
        (m) => String(m.id) === String(normalizedMsg.id),
      )
      if (!exists) {
        messagesMap.value[conversationId] = [
          ...messagesMap.value[conversationId],
          normalizedMsg,
        ]
      }

      // Update last message & unread count di sidebar kiri HANYA UNTUK ROOT MESSAGE!
      const conv = conversations.value.find((c) => String(c.id) === String(conversationId))
      if (conv) {
        conv.lastMessage = normalizedMsg
        conv.lastActivityAt = normalizedMsg.createdAt
        const senderId =
          normalizedMsg.senderId ||
          (normalizedMsg as any).sender?.id ||
          (normalizedMsg as any).sender_id
        if (
          conversationId !== activeConversationId.value &&
          Number(senderId) !== Number(authStore.id_user)
        ) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1
        }
      } else {
        // Percakapan belum ada di store -> fetch ulang agar langsung muncul di navbar
        fetchConversations()
      }

      // Urutkan ulang conversations berdasarkan lastActivityAt
      sortConversations()
    }
  }

  /**
   * Update pesan yang diedit (WebSocket message_updated).
   */
  const updateMessage = (updatedMessage: ChatMessage) => {
    const list = messagesMap.value[updatedMessage.conversationId]
    if (!list) return
    const idx = list.findIndex((m) => m.id === updatedMessage.id)
    if (idx !== -1) list[idx] = updatedMessage
  }

  /**
   * Tandai pesan sebagai deleted (WebSocket message_deleted).
   */
  const deleteMessageLocal = (conversationId: string, messageId: string) => {
    const list = messagesMap.value[conversationId]
    if (!list) return
    const idx = list.findIndex((m) => m.id === messageId)
    if (idx !== -1) list[idx].isDeleted = true
  }

  /**
   * Update reactions sebuah pesan (WebSocket new_reaction).
   */
  const applyReaction = (conversationId: string, event: WsReactionEvent) => {
    const list = messagesMap.value[conversationId]
    if (!list) return
    const msg = list.find((m) => m.id === event.messageId)
    if (!msg) return

    // Pastikan array reactions tidak null
    if (!msg.reactions) msg.reactions = []

    if (event.action === 'added') {
      const already = msg.reactions.find(
        (r) => r.emoji === event.emoji && r.userId === event.userId,
      )
      if (!already) {
        msg.reactions.push({
          id: Date.now(),
          emoji: event.emoji,
          userId: event.userId,
          username: '',
          createdAt: new Date().toISOString(),
        })
      }
    } else {
      msg.reactions = msg.reactions.filter(
        (r) => !(r.emoji === event.emoji && r.userId === event.userId),
      )
    }
  }

  /**
   * Tambah read receipt ke pesan (WebSocket read_receipt).
   */
  const applyReadReceipt = (conversationId: string, event: WsReadReceiptEvent) => {
    const list = messagesMap.value[conversationId]
    if (!list) return
    const msg = list.find((m) => m.id === event.messageId)
    if (!msg) return

    // Pastikan array readReceipts tidak null
    if (!msg.readReceipts) msg.readReceipts = []

    const already = msg.readReceipts.find((r) => r.userId === event.userId)
    if (!already) {
      msg.readReceipts.push({ userId: event.userId, readAt: event.readAt })
    }
  }

  // ─── Actions: Typing ─────────────────────────────────────────────────────

  const setUserTyping = (event: WsUserTypingEvent) => {
    if (event.isTyping) {
      const exists = typingUsers.value.find(
        (t) => t.userId === event.userId && t.conversationId === event.conversationId,
      )
      if (!exists) {
        typingUsers.value.push({ userId: event.userId, conversationId: event.conversationId })
      }
    } else {
      typingUsers.value = typingUsers.value.filter(
        (t) => !(t.userId === event.userId && t.conversationId === event.conversationId),
      )
    }
  }

  // ─── Actions: Presence ───────────────────────────────────────────────────

  const setOnlineUsers = (userIds: number[]) => {
    const map: OnlineUsersMap = {}
    if (Array.isArray(userIds)) {
      for (const id of userIds) {
        if (id != null) {
          map[Number(id)] = true
        }
      }
    }
    onlineUsers.value = map
  }

  const setUserOnline = (event: WsPresenceEvent) => {
    if (event?.userId != null) {
      onlineUsers.value = {
        ...onlineUsers.value,
        [Number(event.userId)]: true,
      }
    }
  }

  const setUserOffline = (event: WsPresenceEvent) => {
    if (event?.userId != null) {
      const copy = { ...onlineUsers.value }
      delete copy[Number(event.userId)]
      onlineUsers.value = copy
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const sortConversations = () => {
    conversations.value.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
    )
  }

  const $reset = () => {
    conversations.value = []
    activeConversationId.value = null
    messagesMap.value = {}
    cursorMap.value = {}
    hasMoreMap.value = {}
    typingUsers.value = []
    onlineUsers.value = {}
    activeThreadMessageId.value = null
    activeThreadRootMessage.value = null
    threadMessagesMap.value = {}
    isLoadingThread.value = false
    socketConnected.value = false
    openedThreadTimestamps.value = {}
  }

  return {
    // State
    conversations,
    activeConversationId,
    messagesMap,
    typingUsers,
    onlineUsers,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    socketConnected,
    activeThreadMessageId,
    threadMessagesMap,
    isLoadingThread,
    openedThreadTimestamps,
    highlightedMessageId,
    setHighlightMessage,
    lightboxMedia,
    openLightboxMedia,
    closeLightboxMedia,
    // Getters
    activeConversation,
    activeMessages,
    totalUnread,
    typingInActive,
    isUserOnline,
    hasMoreMap,
    activeThreadMessage,
    activeThreadReplies,
    // Actions
    fetchConversations,
    createConversation,
    setActiveConversation,
    markAllReadLocal,
    handleConversationRead,
    fetchMessages,
    loadMoreMessages,
    fetchThreadReplies,
    openThread,
    closeThread,
    appendMessage,
    updateMessage,
    deleteMessageLocal,
    applyReaction,
    applyReadReceipt,
    setUserTyping,
    setOnlineUsers,
    setUserOnline,
    setUserOffline,
    markThreadOpened,
    isThreadOpened,
    getThreadReadTimestamp,
    clearThreadOpened,
    $reset,
  }
})
