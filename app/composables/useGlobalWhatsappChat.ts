  import { ref } from 'vue';

  const showGlobalChat = ref(false);
  const activeChatContact = ref<any>(null);
  const pendingShareFile = ref<File | null>(null);
  const pendingShareUrls = ref<string[]>([]);

  export const useGlobalWhatsappChat = () => {
    const openChat = (
      contact: {
        phoneNumber: string;
        name?: string;
        pushName?: string;
        isGroup?: boolean;
        chatType?: 'PERSONAL' | 'GROUP';
      },
      file?: File,
      mediaUrl?: string | string[]
    ) => {
      activeChatContact.value = contact;
      pendingShareFile.value = file || null;
      if (Array.isArray(mediaUrl)) {
        pendingShareUrls.value = mediaUrl;
      } else if (mediaUrl) {
        pendingShareUrls.value = [mediaUrl];
      } else {
        pendingShareUrls.value = [];
      }
      showGlobalChat.value = true;
    };

    const closeChat = () => {
      showGlobalChat.value = false;
      activeChatContact.value = null;
      pendingShareFile.value = null;
      pendingShareUrls.value = [];
    };

    return {
      showGlobalChat,
      activeChatContact,
      pendingShareFile,
      pendingShareUrls,
      openChat,
      closeChat,
    };
};
