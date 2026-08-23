import { useApi } from "@/composables/useApi";

export interface WhatsappDeviceResponse {
  devices: string[];
}

export interface WhatsappQrResponse {
  qr: string;
}

export interface WhatsappSendResponse {
  success: boolean;
  messageId: string;
}

export const WhatsappService = () => {
  const api = useApi();

  /**
   * Inisialisasi sesi baru WhatsApp berdasarkan Device ID
   */
  const initSession = async (deviceId: string): Promise<{ message: string }> => {
    try {
      const res: any = await api("/whatsapp/session/init", {
        method: "POST",
        body: { deviceId },
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal inisialisasi sesi WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengambil QR Code untuk pairing device
   */
  const getQrCode = async (deviceId: string): Promise<WhatsappQrResponse> => {
    try {
      const res: any = await api("/whatsapp/session/qr", {
        method: "GET",
        params: { deviceId },
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mendapatkan QR Code WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mendapatkan daftar semua Device ID yang aktif / terhubung
   */
  const getDevices = async (): Promise<WhatsappDeviceResponse> => {
    try {
      const res: any = await api("/whatsapp/devices", {
        method: "GET",
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengambil daftar device WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengirim pesan teks dan/atau media WhatsApp
   */
  const sendMessage = async (
    deviceId: string,
    to: string,
    text: string,
    file?: File | null,
    quotedMessageId?: string,
    mediaUrl?: string | null
  ): Promise<WhatsappSendResponse> => {
    try {
      let body: any;
      if (file) {
        const formData = new FormData();
        formData.append("deviceId", deviceId);
        formData.append("to", to);
        formData.append("text", text || "");
        formData.append("file", file);
        if (quotedMessageId) formData.append("quotedMessageId", quotedMessageId);
        if (mediaUrl) formData.append("mediaUrl", mediaUrl);
        body = formData;
      } else {
        body = { deviceId, to, text, quotedMessageId, mediaUrl };
      }

      const res: any = await api("/whatsapp/send", {
        method: "POST",
        body,
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengirim pesan WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mematikan / logout sesi WhatsApp secara permanen
   */
  const logoutSession = async (deviceId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res: any = await api(`/whatsapp/session/${deviceId}`, {
        method: "DELETE",
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal logout sesi WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengirim pesan broadcast ke banyak nomor sekaligus (background task)
   */
  const sendBroadcast = async (
    deviceId: string,
    recipients: string[],
    text: string,
    file?: File | null
  ): Promise<{ success: boolean; message: string; totalRecipients: number }> => {
    try {
      let body: any;
      if (file) {
        const formData = new FormData();
        formData.append("deviceId", deviceId);
        recipients.forEach((r) => formData.append("recipients", r));
        formData.append("text", text || "");
        formData.append("file", file);
        body = formData;
      } else {
        body = { deviceId, recipients, text };
      }

      const res: any = await api("/whatsapp/broadcast", {
        method: "POST",
        body,
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengirim broadcast WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengambil riwayat log pesan WhatsApp tenant saat ini
   * dengan dukungan filter opsional: direction, search, deviceId
   */
  const getMessageLogs = async (
    page = 1,
    limit = 20,
    filters: { direction?: 'IN' | 'OUT'; search?: string; deviceId?: string; phoneNumber?: string; chatType?: 'GROUP' | 'PERSONAL' } = {}
  ): Promise<any> => {
    try {
      const res: any = await api("/whatsapp/logs", {
        method: "GET",
        params: {
          page,
          limit,
          ...(filters.direction && { direction: filters.direction }),
          ...(filters.search && { search: filters.search }),
          ...(filters.deviceId && { deviceId: filters.deviceId }),
          ...(filters.phoneNumber && { phoneNumber: filters.phoneNumber }),
          ...(filters.chatType && { chatType: filters.chatType }),
        },
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengambil log pesan WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengambil daftar Master Kontak Pengguna per tenant
   */
  const getContacts = async (
    page = 1,
    limit = 20,
    search?: string
  ): Promise<any> => {
    try {
      const res: any = await api("/whatsapp/contacts", {
        method: "GET",
        params: {
          page,
          limit,
          ...(search && { search: search.trim() }),
        },
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengambil daftar kontak WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Menambah atau memperbarui data Kontak Pengguna
   */
  const saveContact = async (data: {
    phoneNumber: string;
    name?: string;
    pushName?: string;
  }): Promise<any> => {
    try {
      const res: any = await api("/whatsapp/contacts", {
        method: "POST",
        body: data,
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal menyimpan kontak WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Menghapus kontak dari Master Kontak
   */
  const deleteContact = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res: any = await api(`/whatsapp/contacts/${id}`, {
        method: "DELETE",
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal menghapus kontak WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengambil daftar semua grup WhatsApp yang diikuti oleh perangkat
   */
  const getGroups = async (deviceId: string): Promise<any[]> => {
    try {
      const res: any = await api("/whatsapp/groups", {
        method: "GET",
        params: { deviceId },
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengambil daftar grup WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengambil rincian metadata grup WhatsApp
   */
  const getGroupMetadata = async (deviceId: string, groupId: string): Promise<any> => {
    try {
      const res: any = await api(`/whatsapp/groups/${groupId}`, {
        method: "GET",
        params: { deviceId },
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengambil metadata grup WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mereset notifikasi pesan WhatsApp yang belum terbaca
   */
  const markAsRead = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res: any = await api("/whatsapp/read-notifications", {
        method: "PUT",
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mereset notifikasi WhatsApp:", err);
      throw err;
    }
  };

  /**
   * Mengambil jumlah notifikasi pesan WhatsApp yang belum terbaca
   */
  const getUnreadCount = async (): Promise<{ count: number }> => {
    try {
      const res: any = await api("/whatsapp/read-notifications", {
        method: "GET",
      });
      return res.data || res;
    } catch (err: any) {
      console.error("Gagal mengambil jumlah notifikasi WhatsApp:", err);
      return { count: 0 };
    }
  };

  return {
    initSession,
    getQrCode,
    getDevices,
    sendMessage,
    sendBroadcast,
    logoutSession,
    getMessageLogs,
    getContacts,
    saveContact,
    deleteContact,
    getGroups,
    getGroupMetadata,
    markAsRead,
    getUnreadCount,
  };
};
