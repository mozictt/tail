import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import type { AppNotification, NotificationResponse } from '@/types/notification'

export const useNotificationStore = defineStore('notification', () => {
  const api = useApi()

  const notifications = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const total = ref(0)
  const isLoading = ref(false)
  const activeTab = ref<'all' | 'unread'>('all')

  /** Notifikasi yang belum dibaca */
  const unreadNotifications = computed(() =>
    notifications.value.filter((n) => !n.isRead),
  )

  /** Fetch riwayat notifikasi dari backend */
  const fetchNotifications = async (unreadOnly = false) => {
    isLoading.value = true
    try {
      const res = await api.get<any>('/notifications', {
        params: { unreadOnly },
      })
      const data = res?.data ?? res
      if (data) {
        notifications.value = data.items ?? (Array.isArray(data) ? data : [])
        unreadCount.value = data.unreadCount ?? 0
        total.value = data.total ?? 0
      }
    } catch (e) {
      // Ignore error silently
    } finally {
      isLoading.value = false
    }
  }

  /** Fetch hanya unread count */
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get<any>('/notifications/unread-count')
      const data = res?.data ?? res
      if (data && typeof data.unreadCount === 'number') {
        unreadCount.value = data.unreadCount
      }
    } catch (e) {
      // Ignore
    }
  }

  /** Tandai satu notifikasi spesifik sebagai dibaca */
  const markAsRead = async (id: string) => {
    const target = notifications.value.find((n) => String(n.id) === String(id))
    if (target && !target.isRead) {
      target.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch (e) {
      // Fallback revert if error
    }
  }

  /** Tandai semua notifikasi sebagai dibaca */
  const markAllAsRead = async () => {
    notifications.value.forEach((n) => {
      n.isRead = true
    })
    unreadCount.value = 0
    try {
      await api.patch('/notifications/read-all')
    } catch (e) {
      // Re-fetch count if error
      await fetchUnreadCount()
    }
  }

  /** Tambahkan notifikasi real-time baru dari WebSocket */
  const addRealtimeNotification = (notif: AppNotification) => {
    // Deduplikasi
    const exists = notifications.value.some((n) => String(n.id) === String(notif.id))
    if (!exists) {
      notifications.value.unshift(notif)
      if (!notif.isRead) {
        unreadCount.value++
      }
    }
  }

  return {
    notifications,
    unreadCount,
    total,
    isLoading,
    activeTab,
    unreadNotifications,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    addRealtimeNotification,
  }
})
