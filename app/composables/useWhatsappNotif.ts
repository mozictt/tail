import { useState } from '#app';
import { WhatsappService } from '@/services/whatsapp.service';

let pollingTimer: any = null;

export const useWhatsappNotif = () => {
  const unreadCount = useState<number>('waUnreadCount', () => 0);
  const waService = WhatsappService();

  const fetchUnread = async () => {
    try {
      const res = await waService.getUnreadCount();
      unreadCount.value = res.count || 0;
    } catch (e) {
      console.error('Failed to fetch unread count', e);
    }
  };

  const startPolling = () => {
    if (!pollingTimer && import.meta.client) {
      fetchUnread();
      pollingTimer = setInterval(fetchUnread, 10000); // Polling setiap 10 detik
    }
  };

  const stopPolling = () => {
    if (pollingTimer && import.meta.client) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };

  const clearUnread = async () => {
    try {
      await waService.markAsRead();
      unreadCount.value = 0;
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  };

  return {
    unreadCount,
    fetchUnread,
    startPolling,
    stopPolling,
    clearUnread
  };
};
