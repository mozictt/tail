export enum NotificationType {
  CHAT_DIRECT = 'CHAT_DIRECT',
  CHAT_GROUP = 'CHAT_GROUP',
  CHAT_THREAD_REPLY = 'CHAT_THREAD_REPLY',
  CHAT_MENTION = 'CHAT_MENTION',
  WA_INCOMING = 'WA_INCOMING',
  WA_SESSION_DISCONNECT = 'WA_SESSION_DISCONNECT',
  DOC_SHARED = 'DOC_SHARED',
  DOC_EXPIRING = 'DOC_EXPIRING',
  SYS_ANNOUNCEMENT = 'SYS_ANNOUNCEMENT',
}

export interface AppNotification {
  id: string;
  userId: number;
  tenantId?: number | null;
  type: NotificationType | string;
  title: string;
  body: string;
  actionUrl?: string | null;
  payload?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationResponse {
  items: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
