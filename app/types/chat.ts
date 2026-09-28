// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  SYSTEM = 'system',
}

export enum ParticipantRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

// ─── Participant ──────────────────────────────────────────────────────────────

/**
 * Struktur ConversationParticipant dari backend.
 * Perhatian: `id` adalah ID record participant (bukan user ID).
 * User ID yang sebenarnya ada di `userId` dan di `user.id`.
 */
export interface ChatParticipant {
  /** ID record participant (bukan user ID) */
  id: number
  /** ID user yang sebenarnya */
  userId: number
  role: ParticipantRole
  joinedAt: string
  lastReadAt: string | null
  isMuted: boolean
  leftAt: string | null
  /** User object yang di-join dari backend */
  user?: {
    id: number
    username: string
    pegawai?: {
      name: string
      photo?: string | null
    } | null
  } | null
  /** Shortcut: tersedia saat backend map manual ke flat object */
  username?: string
}

// ─── Reaction ────────────────────────────────────────────────────────────────

export interface MessageReaction {
  id: number
  emoji: string
  userId: number
  username: string
  createdAt: string
}

// ─── Read Receipt ─────────────────────────────────────────────────────────────

export interface ReadReceipt {
  userId: number
  readAt: string
}

// ─── Contact ─────────────────────────────────────────────────────────────────

/**
 * Representasi kontak chat — hasil dari GET /chat/contacts dan GET /chat/contacts/search.
 * Field `pegawai` di-join oleh backend untuk mendapatkan nama asli.
 */
export interface ChatContact {
  id: number
  /** ID user pemilik kontak (owner) */
  ownerId?: number
  /** ID user yang dijadikan kontak / hasil search */
  contactUserId?: number
  /** Saat search: id user langsung di sini */
  userId?: number
  username: string
  /** Nickname kustom (opsional, bisa null) */
  nickname: string | null
  /** Apakah kontak diblokir */
  isBlocked?: boolean
  /** Data pegawai join (nama, foto) */
  pegawai?: {
    name: string
    photo?: string | null
  } | null
}


// ─── Message ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  conversationId: string
  content: string | null
  type: MessageType
  attachmentUrl: string | null
  attachmentName: string | null
  senderId: number
  senderUsername: string
  parentMessageId: string | null
  replyCount?: number
  /** Jumlah balasan thread yang belum dibaca oleh user ini */
  unreadThreadCount?: number
  /** Flag lama — tetap dipertahankan untuk kompatibilitas */
  hasUnreadThread?: boolean
  parentMessage?: ChatMessage | null
  isEdited: boolean
  isDeleted: boolean
  reactions: MessageReaction[]
  readReceipts: ReadReceipt[]
  createdAt: string
  updatedAt: string
}

// ─── Message Paginated Response ───────────────────────────────────────────────

export interface MessageHistoryResponse {
  data: ChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export interface ChatConversation {
  id: string
  type: ConversationType
  name: string | null
  avatarUrl: string | null
  lastMessage: ChatMessage | null
  lastActivityAt: string
  unreadCount: number
  participants: ChatParticipant[]
  createdAt: string
}

// ─── DTOs (untuk kirim ke API) ────────────────────────────────────────────────

export interface CreateConversationDto {
  type: ConversationType
  name?: string
  participantIds: number[]
}

export interface SendMessageDto {
  content?: string
  type?: MessageType
  parentMessageId?: string
  attachmentUrl?: string
  attachmentName?: string
}

export interface UpdateMessageDto {
  content: string
}

// ─── WebSocket Payloads ───────────────────────────────────────────────────────

export interface WsSendMessagePayload {
  conversationId: string
  message: SendMessageDto
}

export interface WsTypingPayload {
  conversationId: string
}

export interface WsReactPayload {
  conversationId: string
  messageId: string
  emoji: string
}

export interface WsMarkReadPayload {
  conversationId: string
  messageId: string
}

// ─── WebSocket Server Events ──────────────────────────────────────────────────

export interface WsNewMessageEvent {
  /** Pesan baru dari server */
  message: ChatMessage
}

export interface WsUserTypingEvent {
  conversationId: string
  userId: number
  isTyping: boolean
}

export interface WsReadReceiptEvent {
  messageId: string
  userId: number
  readAt: string
}

/**
 * Diterima dari backend saat suatu user menandai conversation sebagai terbaca.
 * Digunakan untuk sinkronisasi status unread antar device/tab yang sama.
 */
export interface WsConversationReadEvent {
  conversationId: string
  userId: number
  readAt: string
}

export interface WsReactionEvent {
  messageId: string
  userId: number
  emoji: string
  action: 'added' | 'removed'
}

export interface WsPresenceEvent {
  userId: number
}

export interface WsInitialOnlineUsersEvent {
  userIds: number[]
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface TypingUser {
  userId: number
  conversationId: string
}

export type OnlineUsersMap = Record<number, boolean>
