import { ref } from 'vue';

const showGlobalChat = ref(false);
const activeChatContact = ref<any>(null);

export const useGlobalWhatsappChat = () => {
  const openChat = (contact: {
    phoneNumber: string;
    name?: string;
    pushName?: string;
    isGroup?: boolean;
    chatType?: 'PERSONAL' | 'GROUP';
  }) => {
    activeChatContact.value = contact;
    showGlobalChat.value = true;
  };

  const closeChat = () => {
    showGlobalChat.value = false;
    activeChatContact.value = null;
  };

  return {
    showGlobalChat,
    activeChatContact,
    openChat,
    closeChat,
  };
};
