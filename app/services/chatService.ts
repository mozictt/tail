import type {
  ChatConversation,
  CreateConversationDto,
  SendMessageDto,
  UpdateMessageDto,
  MessageHistoryResponse,
  ChatParticipant,
  ChatContact,
} from '@/types/chat'

/**
 * ChatService — meng-encapsulate semua REST API call ke backend chat.
 * Menggunakan $api yang di-provide dari plugin api.ts (useApi composable).
 *
 * ⚠️ Backend menggunakan ResponseInterceptor yang membungkus semua response:
 *    { success: true, statusCode: 200, message: "OK", data: <payload> }
 *
 * Helper `extract()` dipakai untuk mengekstrak `.data` secara konsisten.
 */
export const useChatService = () => {
  const { $api } = useNuxtApp()

  /**
   * Ekstrak payload `.data` dari response interceptor backend.
   * Jika response sudah berupa array/object langsung, kembalikan apa adanya.
   */
  const extract = <T>(res: any): T => {
    if (res && typeof res === 'object' && 'data' in res) {
      return res.data as T
    }
    return res as T
  }

  // ─── Conversations ──────────────────────────────────────────────────────────

  /**
   * Ambil semua percakapan milik user yang login, diurutkan berdasarkan
   * aktivitas terakhir (inbox view).
   */
  const getConversations = async (): Promise<ChatConversation[]> => {
    const res = await $api('/chat/conversations')
    return extract<ChatConversation[]>(res) ?? []
  }

  /**
   * Buat percakapan baru — direct (2 orang) atau group (banyak orang).
   */
  const createConversation = async (dto: CreateConversationDto): Promise<ChatConversation> => {
    const res = await $api('/chat/conversations', { method: 'POST', body: dto })
    return extract<ChatConversation>(res)
  }

  /**
   * Ambil detail percakapan beserta daftar peserta.
   */
  const getConversation = async (id: string): Promise<ChatConversation> => {
    const res = await $api(`/chat/conversations/${id}`)
    return extract<ChatConversation>(res)
  }

  /**
   * Tandai semua pesan dalam percakapan sebagai terbaca (204 No Content).
   */
  const markAllRead = async (conversationId: string): Promise<void> => {
    await $api(`/chat/conversations/${conversationId}/read`, { method: 'POST' })
  }

  /**
   * Ambil daftar peserta dari sebuah percakapan.
   */
  const getParticipants = async (conversationId: string): Promise<ChatParticipant[]> => {
    const res = await $api(`/chat/conversations/${conversationId}/participants`)
    return extract<ChatParticipant[]>(res) ?? []
  }

  /**
   * Tambah anggota ke percakapan grup (hanya admin).
   */
  const addParticipant = async (conversationId: string, userId: number): Promise<ChatConversation> => {
    const res = await $api(`/chat/conversations/${conversationId}/participants/${userId}`, {
      method: 'POST',
    })
    return extract<ChatConversation>(res)
  }

  /**
   * Keluarkan anggota dari percakapan grup.
   */
  const removeParticipant = async (conversationId: string, userId: number): Promise<void> => {
    await $api(`/chat/conversations/${conversationId}/participants/${userId}`, {
      method: 'DELETE',
    })
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  /**
   * Ambil histori pesan menggunakan cursor-based pagination.
   */
  const getMessages = async (
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<MessageHistoryResponse> => {
    const query: Record<string, any> = { limit }
    if (before) query.before = before

    const res = await $api(`/chat/conversations/${conversationId}/messages`, { query })
    return extract<MessageHistoryResponse>(res)
  }

  /**
   * Ambil balasan thread dari sebuah pesan induk.
   * Backend sekarang mengembalikan { replies: ChatMessage[], unreadThreadCount: number }
   * untuk mendukung status terbaca yang persisten di server.
   */
  const getThreadReplies = async (
    conversationId: string,
    messageId: string,
  ): Promise<{ replies: ChatMessage[]; unreadThreadCount: number }> => {
    const res = await $api(`/chat/conversations/${conversationId}/messages/${messageId}/threads`)
    const extracted = extract<any>(res)

    // Handle response baru: { replies, unreadThreadCount }
    if (extracted && typeof extracted === 'object' && 'replies' in extracted) {
      return {
        replies: (extracted.replies as ChatMessage[]) ?? [],
        unreadThreadCount: extracted.unreadThreadCount ?? 0,
      }
    }

    // Backward compat: jika backend masih mengembalikan array langsung
    const replies = Array.isArray(extracted) ? (extracted as ChatMessage[]) : []
    return { replies, unreadThreadCount: 0 }
  }

  /**
   * Kirim pesan baru ke percakapan (REST fallback).
   */
  const sendMessage = async (conversationId: string, dto: SendMessageDto) => {
    const res = await $api(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: dto,
    })
    return extract(res)
  }

  /**
   * Edit konten pesan.
   */
  const updateMessage = async (conversationId: string, messageId: string, dto: UpdateMessageDto) => {
    const res = await $api(`/chat/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      body: dto,
    })
    return extract(res)
  }

  /**
   * Hapus pesan.
   */
  const deleteMessage = async (conversationId: string, messageId: string): Promise<void> => {
    await $api(`/chat/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Toggle reaksi emoji pada pesan.
   */
  const toggleReaction = async (conversationId: string, messageId: string, emoji: string) => {
    const res = await $api(`/chat/conversations/${conversationId}/messages/${messageId}/reactions`, {
      method: 'POST',
      query: { emoji },
    })
    return extract(res)
  }

  /**
   * Tandai pesan individual sebagai terbaca.
   */
  const markMessageRead = async (conversationId: string, messageId: string): Promise<void> => {
    await $api(`/chat/conversations/${conversationId}/messages/${messageId}/read`, {
      method: 'POST',
    })
  }

  /**
   * Tandai SEMUA balasan thread dari sebuah pesan induk sebagai terbaca (batch).
   * Satu request ke backend menggantikan N request individual.
   * Dipanggil saat user membuka Thread Panel.
   * Endpoint: POST /chat/conversations/:id/messages/:msgId/threads/read
   */
  const markThreadRead = async (conversationId: string, parentMessageId: string): Promise<void> => {
    await $api(
      `/chat/conversations/${conversationId}/messages/${parentMessageId}/threads/read`,
      { method: 'POST' },
    )
  }

  // ─── Contacts ───────────────────────────────────────────────────────────────

  /**
   * Ambil semua kontak milik user yang sedang login.
   * Endpoint: GET /chat/contacts
   */
  const getContacts = async (): Promise<ChatContact[]> => {
    const res = await $api('/chat/contacts')
    return extract<ChatContact[]>(res) ?? []
  }

  /**
   * Cari user untuk ditambahkan sebagai kontak (bukan dari kontak yang sudah ada).
   * Endpoint: GET /chat/contacts/search?q=<query>
   */
  const searchUsers = async (q: string): Promise<ChatContact[]> => {
    const res = await $api('/chat/contacts/search', { query: { q } })
    return extract<ChatContact[]>(res) ?? []
  }

  /**
   * Tambah kontak baru.
   */
  const addContact = async (contactUserId: number, nickname?: string): Promise<ChatContact> => {
    const res = await $api('/chat/contacts', {
      method: 'POST',
      body: { contactUserId, nickname },
    })
    return extract<ChatContact>(res)
  }

  /**
   * Hapus kontak.
   */
  const removeContact = async (contactId: number): Promise<void> => {
    await $api(`/chat/contacts/${contactId}`, { method: 'DELETE' })
  }

  return {
    // Conversations
    getConversations,
    createConversation,
    getConversation,
    markAllRead,
    getParticipants,
    addParticipant,
    removeParticipant,
    // Messages
    getMessages,
    getThreadReplies,
    sendMessage,
    updateMessage,
    deleteMessage,
    toggleReaction,
    markMessageRead,
    markThreadRead,
    // Contacts
    getContacts,
    searchUsers,
    addContact,
    removeContact,
  }
}

export type ChatServiceType = ReturnType<typeof useChatService>
