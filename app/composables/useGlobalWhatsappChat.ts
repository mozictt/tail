  import { ref } from 'vue';

  const showGlobalChat = ref(false);
  const activeChatContact = ref<any>(null);
  const pendingShareFile = ref<File | null>(null);
  const pendingShareUrl = ref<string | null>(null);

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
      mediaUrl?: string
    ) => {
      activeChatContact.value = contact;
      pendingShareFile.value = file || null;
      pendingShareUrl.value = mediaUrl || null;
      showGlobalChat.value = true;
    };

    const closeChat = () => {
      showGlobalChat.value = false;
      activeChatContact.value = null;
      pendingShareFile.value = null;
      pendingShareUrl.value = null;
    };

    return {
      showGlobalChat,
      activeChatContact,
      pendingShareFile,
      pendingShareUrl,
      openChat,
      closeChat,
    };
};
