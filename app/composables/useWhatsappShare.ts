import { ref } from 'vue';
import Swal from 'sweetalert2';
import { WhatsappService } from '@/services/whatsapp.service';
import { useGlobalWhatsappChat } from '@/composables/useGlobalWhatsappChat';
import { useAuthStore } from '@/stores/auth';

const isSelectorOpen = ref(false);
const sharePayload = ref<{ fileUrl: string; fileName: string; type: 'gallery' | 'document' } | null>(null);

export const useWhatsappShare = () => {
  const waService = WhatsappService();
  const authStore = useAuthStore();

  const shareFile = async (fileUrl: string, fileName: string, type: 'gallery' | 'document') => {
    try {
      // 1. Validasi Koneksi WA
      const deviceId = authStore.tenant_id || 'main-session';
      const res = await waService.getDevices();
      const isConnected = res.devices?.includes(deviceId);
      
      if (!isConnected) {
        Swal.fire({
          icon: 'warning',
          title: 'WhatsApp Belum Terhubung',
          text: 'Silakan pindai QR code di menu Integrasi WhatsApp sebelum membagikan file.',
          confirmButtonColor: '#059669',
        });
        return;
      }

      // 2. Tampilkan Loading State & Simpan Payload Sementara
      sharePayload.value = { fileUrl, fileName, type };
      isSelectorOpen.value = true;
      
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Gagal memverifikasi status WhatsApp.',
      });
    }
  };

  const closeSelector = () => {
    isSelectorOpen.value = false;
    sharePayload.value = null;
  };

  return {
    isSelectorOpen,
    sharePayload,
    shareFile,
    closeSelector,
  };
};
