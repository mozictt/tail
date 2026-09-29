import { ref, computed } from 'vue'
import type { Socket } from 'socket.io-client'
import { useChatStore } from '@/stores/chat'
import type {
  ChatMessage,
  WsTypingPayload,
  WsReactPayload,
  WsMarkReadPayload,
  WsSendMessagePayload,
  WsUserTypingEvent,
  WsReadReceiptEvent,
  WsReactionEvent,
  WsPresenceEvent,
  WsInitialOnlineUsersEvent,
  WsConversationReadEvent,
} from '@/types/chat'

/**
 * useChatSocket — Composable WebSocket untuk namespace /chat.
 *
 * Mengelola seluruh siklus koneksi Socket.IO ke backend:
 * - Connect / Disconnect otomatis
 * - Join / Leave room percakapan
 * - Emit events ke server
 * - Registrasi event listeners dari server
 *
 * Token JWT dikirim via query param saat handshake (sesuai ChatGateway backend).
 * Import socket.io-client dilakukan secara dynamic agar tidak SSR error.
 */
// ─── Module Singleton State ──────────────────────────────────────────────────

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const connectionError = ref<string | null>(null)

const listenerRegistry: Record<string, Set<Function>> = {
  new_message: new Set(),
  message_updated: new Set(),
  message_deleted: new Set(),
  user_typing: new Set(),
  read_receipt: new Set(),
  new_reaction: new Set(),
  initial_online_users: new Set(),
  user_online: new Set(),
  user_offline: new Set(),
  conversation_read: new Set(),
  'notification:new': new Set(),
}

export const useChatSocket = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const chatStore = useChatStore()

  const registerListener = (event: string, cb: Function) => {
    if (!listenerRegistry[event]) {
      listenerRegistry[event] = new Set()
    }
    listenerRegistry[event].add(cb)
    if (socket.value) {
      socket.value.off(event, cb as any)
      socket.value.on(event, cb as any)
    }
    console.log(`[ChatSocket] Registered listener for event: ${event}`)

    return () => {
      listenerRegistry[event]?.delete(cb)
      if (socket.value) {
        socket.value.off(event, cb as any)
      }
      console.log(`[ChatSocket] Removed listener for event: ${event}`)
    }
  }

  const reattachListeners = () => {
    if (!socket.value) return
    console.log('[ChatSocket] Reattaching all listeners...')
    for (const [event, cbs] of Object.entries(listenerRegistry)) {
      for (const cb of cbs) {
        socket.value.off(event, cb as any)
        socket.value.on(event, cb as any)
      }
    }
  }

  // CATATAN: Listener presence (initial_online_users, user_online, user_offline)
  // TIDAK didaftarkan di sini untuk menghindari duplikasi.
  // Handler presence didaftarkan secara eksplisit dari chat/index.vue
  // via onInitialOnlineUsers(), onUserOnline(), onUserOffline().

  // ─── Derived base URL untuk WebSocket ─────────────────────────────────────

  /**
   * apiBase adalah '/api/proxy' untuk HTTP, tapi WebSocket perlu URL absolut
   * ke backend langsung.
   */
  const getWsBaseUrl = (): string => {
    if (typeof window === 'undefined') return ''

    let backendUrl = (config.public as any).wsBase || ''

    if (!backendUrl || backendUrl.includes('localhost')) {
      const hostname = window.location.hostname
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
      backendUrl = `${protocol}//${hostname}:4000`
    }

    return backendUrl
  }

  // ─── Connect ─────────────────────────────────────────────────────────────────

  /**
   * Inisialisasi koneksi Socket.IO ke namespace /chat.
   * Harus dipanggil dari client-side (onMounted atau plugin client-only).
   */
  const connect = async (): Promise<void> => {
    if (socket.value?.connected) return
    if (!authStore.token) {
      connectionError.value = 'Tidak ada token autentikasi'
      console.error('[ChatSocket] Tidak ada token autentikasi')
      return
    }

    const { io } = await import('socket.io-client')

    const baseUrl = getWsBaseUrl()
    console.log('[ChatSocket] Connecting to namespace /chat at:', baseUrl)

    return new Promise((resolve) => {
      socket.value = io(`${baseUrl}/chat`, {
        query: { token: authStore.token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      })

      socket.value.on('connect', () => {
        console.log('[ChatSocket] Connected successfully, socket ID:', socket.value?.id)
        isConnected.value = true
        connectionError.value = null
        reattachListeners()

        // Minta daftar user online di awal koneksi
        getOnlineUsers()

        resolve()
      })

      socket.value.on('disconnect', (reason) => {
        console.log('[ChatSocket] Disconnected:', reason)
        isConnected.value = false
      })

      socket.value.on('connect_error', (err) => {
        console.error('[ChatSocket] Connection error:', err.message)
        connectionError.value = err.message
        isConnected.value = false
        resolve()
      })
    })
  }

  // ─── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = () => {
    console.log('[ChatSocket] Disconnecting socket...')
    socket.value?.disconnect()
    socket.value = null
    isConnected.value = false
  }

  // ─── Room Management ──────────────────────────────────────────────────────

  const joinConversation = (conversationId: string) => {
    console.log('[ChatSocket] Joining conversation:', conversationId)
    socket.value?.emit('join_conversation', { conversationId })
  }

  const leaveConversation = (conversationId: string) => {
    console.log('[ChatSocket] Leaving conversation:', conversationId)
    socket.value?.emit('leave_conversation', { conversationId })
  }

  // ─── Emit Events ─────────────────────────────────────────────────────────

  const sendMessage = (payload: WsSendMessagePayload) => {
    console.log('[ChatSocket] Emitting send_message:', payload)
    socket.value?.emit('send_message', payload)
  }

  const startTyping = (payload: WsTypingPayload) => {
    socket.value?.emit('typing_start', payload)
  }

  const stopTyping = (payload: WsTypingPayload) => {
    socket.value?.emit('typing_stop', payload)
  }

  const reactMessage = (payload: WsReactPayload) => {
    socket.value?.emit('react_message', payload)
  }

  const markRead = (payload: WsMarkReadPayload) => {
    socket.value?.emit('mark_read', payload)
  }

  const sendHeartbeat = () => {
    socket.value?.emit('heartbeat')
  }

  const getOnlineUsers = () => {
    socket.value?.emit('get_online_users')
  }

  // ─── Event Listener Helpers ───────────────────────────────────────────────

  const onNewMessage = (cb: (message: ChatMessage) => void) => {
    return registerListener('new_message', cb)
  }

  const onMessageUpdated = (cb: (message: ChatMessage) => void) => {
    return registerListener('message_updated', cb)
  }

  const onMessageDeleted = (cb: (data: { messageId: string }) => void) => {
    return registerListener('message_deleted', cb)
  }

  const onUserTyping = (cb: (data: WsUserTypingEvent) => void) => {
    return registerListener('user_typing', cb)
  }

  const onReadReceipt = (cb: (data: WsReadReceiptEvent) => void) => {
    return registerListener('read_receipt', cb)
  }

  const onNewReaction = (cb: (data: WsReactionEvent) => void) => {
    return registerListener('new_reaction', cb)
  }

  const onInitialOnlineUsers = (cb: (data: WsInitialOnlineUsersEvent) => void) => {
    return registerListener('initial_online_users', cb)
  }

  const onUserOnline = (cb: (data: WsPresenceEvent) => void) => {
    return registerListener('user_online', cb)
  }

  const onUserOffline = (cb: (data: WsPresenceEvent) => void) => {
    return registerListener('user_offline', cb)
  }

  const onConversationRead = (cb: (data: WsConversationReadEvent) => void) => {
    return registerListener('conversation_read', cb)
  }

  const onNotificationNew = (cb: (data: any) => void) => {
    return registerListener('notification:new', cb)
  }

  // ─── Heartbeat ───────────────────────────────────────────────────────────

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  const startHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
      if (isConnected.value) sendHeartbeat()
    }, 30_000)
  }

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  return {
    socket,
    isConnected: computed(() => isConnected.value),
    connectionError: computed(() => connectionError.value),
    // Connection
    connect,
    disconnect,
    // Room
    joinConversation,
    leaveConversation,
    // Emit
    sendMessage,
    startTyping,
    stopTyping,
    reactMessage,
    markRead,
    sendHeartbeat,
    getOnlineUsers,
    // Heartbeat
    startHeartbeat,
    stopHeartbeat,
    // Listeners
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onUserTyping,
    onReadReceipt,
    onNewReaction,
    onInitialOnlineUsers,
    onUserOnline,
    onUserOffline,
    onConversationRead,
    onNotificationNew,
  }
}
