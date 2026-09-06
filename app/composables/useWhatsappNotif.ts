import { useState } from '#app';
import { WhatsappService } from '@/services/whatsapp.service';
import { useAuthStore } from '@/stores/auth';

let pollingTimer: any = null;
let isSessionConnected = false;
let lastSessionCheckTime = 0;

export const useWhatsappNotif = () => {
  const unreadCount = useState<number>('waUnreadCount', () => 0);
  const waService = WhatsappService();
  const authStore = useAuthStore();

  const checkSessionConnection = async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastSessionCheckTime < 10000) {
      return isSessionConnected;
    }
    try {
      const deviceId = authStore.tenant_id || "main-session";
      const statusRes = await waService.getDevices();
      const activeDevices = statusRes?.devices || [];
      isSessionConnected = activeDevices.includes(deviceId);
      lastSessionCheckTime = now;
      return isSessionConnected;
    } catch (err) {
      isSessionConnected = false;
      return false;
    }
  };

  const fetchUnread = async () => {
    try {
      const connected = await checkSessionConnection();
      if (!connected) {
        unreadCount.value = 0;
        return;
      }
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
