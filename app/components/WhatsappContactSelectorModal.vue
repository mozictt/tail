<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import * as icons from 'lucide-vue-next';
import { useWhatsappShare } from '@/composables/useWhatsappShare';
import { useGlobalWhatsappChat } from '@/composables/useGlobalWhatsappChat';
import { WhatsappService } from '@/services/whatsapp.service';
import { useAuthStore } from '@/stores/auth';
import { useRuntimeConfig } from '#imports';
import Swal from 'sweetalert2';

const { isSelectorOpen, sharePayload, closeSelector } = useWhatsappShare();
const { openChat } = useGlobalWhatsappChat();
const waService = WhatsappService();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const searchQuery = ref('');
const contacts = ref<any[]>([]);
const groups = ref<any[]>([]);
const loading = ref(false);
const activeTab = ref<'contacts' | 'groups'>('contacts');

const fetchContactsAndGroups = async () => {
  loading.value = true;
  const deviceId = authStore.tenant_id || "main-session";
  
  // Ambil kontak
  try {
    const contactRes = await waService.getContacts(1, 1000);
    contacts.value = contactRes?.items || contactRes?.data?.items || [];
  } catch (err) {
    console.error('Gagal mengambil data kontak', err);
  }

  // Ambil grup
  try {
    const groupRes = await waService.getGroups(deviceId);
    groups.value = groupRes || [];
  } catch (err) {
    console.error('Gagal mengambil data grup', err);
  }
  
  loading.value = false;
};

watch(isSelectorOpen, (val) => {
  if (val) {
    searchQuery.value = '';
    activeTab.value = 'contacts';
    fetchContactsAndGroups();
  }
});

const filteredContacts = computed(() => {
  if (!searchQuery.value) return contacts.value;
  const q = searchQuery.value.toLowerCase();
  return contacts.value.filter((c: any) => 
    (c.name && c.name.toLowerCase().includes(q)) || 
    (c.pushName && c.pushName.toLowerCase().includes(q)) || 
    (c.phoneNumber && c.phoneNumber.includes(q))
  );
});

const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value;
  const q = searchQuery.value.toLowerCase();
  return groups.value.filter((g: any) => 
    (g.subject && g.subject.toLowerCase().includes(q))
  );
});

const getAvatarInitial = (name?: string) => {
  if (!name) return "K";
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return clean ? clean[0] : "K";
};

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return "-";
  const clean = phone.replace(/@.*$/, '');
  return clean.startsWith("62") ? `+${clean}` : clean;
};

// Proses pemilihan kontak
const selectContact = async (contact: any, isGroup = false) => {
  if (!sharePayload.value) return;

  const payload = sharePayload.value;
  closeSelector(); // Tutup modal selector

  try {

    // Buka Global Chat Modal dengan mediaUrl terlampir
    if (isGroup) {
      openChat({
        phoneNumber: contact.id,
        name: contact.subject,
        isGroup: true,
        chatType: 'GROUP'
      }, undefined, payload.fileUrl);
    } else {
      openChat({
        phoneNumber: contact.phoneNumber,
        name: contact.name || contact.pushName || contact.phoneNumber,
        isGroup: false,
        chatType: 'PERSONAL'
      }, undefined, payload.fileUrl);
    }

  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menyiapkan File',
      text: 'Tidak dapat memproses file yang akan dibagikan.'
    });
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isSelectorOpen" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
            <div>
              <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
                <icons.Share2 class="w-5 h-5 text-emerald-500" />
                Kirim ke WhatsApp
              </h3>
              <p class="text-xs text-base-content/60 mt-0.5 truncate max-w-[300px]">
                Membagikan: <span class="font-bold text-emerald-600">{{ sharePayload?.fileName }}</span>
              </p>
            </div>
            <button @click="closeSelector" class="btn btn-sm btn-ghost btn-circle text-base-content/50 hover:text-base-content">
              <icons.X class="w-5 h-5" />
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex items-center p-2 border-b border-base-content/10 gap-2 bg-base-100/50">
            <button @click="activeTab = 'contacts'" class="flex-1 btn btn-sm rounded-xl font-bold transition-all border-none" :class="activeTab === 'contacts' ? 'bg-emerald-500 text-white shadow-md' : 'btn-ghost text-base-content/50 hover:bg-base-200'">
              <icons.User class="w-4 h-4" />
              Kontak Personal
            </button>
            <button @click="activeTab = 'groups'" class="flex-1 btn btn-sm rounded-xl font-bold transition-all border-none" :class="activeTab === 'groups' ? 'bg-amber-500 text-white shadow-md' : 'btn-ghost text-base-content/50 hover:bg-base-200'">
              <icons.Users class="w-4 h-4" />
              Grup WhatsApp
            </button>
          </div>

          <!-- Search & List -->
          <div class="flex-1 flex flex-col min-h-0 bg-base-200/30">
            <div class="p-4 pb-2">
              <div class="relative">
                <icons.Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                <input v-model="searchQuery" type="text" placeholder="Cari nama atau nomor..." class="input input-sm input-bordered w-full pl-9 rounded-xl focus:border-emerald-500" />
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-2">
              <div v-if="loading" class="flex flex-col items-center py-10">
                <span class="loading loading-spinner loading-md text-emerald-500"></span>
                <span class="text-xs text-base-content/50 mt-2 font-medium">Memuat kontak...</span>
              </div>
              
              <!-- Tab Contacts -->
              <template v-else-if="activeTab === 'contacts'">
                <div v-if="filteredContacts.length === 0" class="text-center py-10 text-base-content/40 text-xs">
                  Tidak ada kontak ditemukan.
                </div>
                <div v-else class="space-y-1">
                  <div v-for="contact in filteredContacts" :key="contact.phoneNumber" @click="selectContact(contact, false)" class="flex items-center justify-between p-3 rounded-xl hover:bg-base-100 border border-transparent hover:border-base-content/10 transition cursor-pointer group">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-500/20 shrink-0">
                        {{ getAvatarInitial(contact.name || contact.pushName) }}
                      </div>
                      <div>
                        <p class="text-sm font-bold text-base-content group-hover:text-emerald-600 transition-colors">{{ contact.name || contact.pushName || 'Tanpa Nama' }}</p>
                        <p class="text-xs text-base-content/50 font-mono">{{ formatPhoneNumber(contact.phoneNumber) }}</p>
                      </div>
                    </div>
                    <icons.Send class="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </div>
              </template>

              <!-- Tab Groups -->
              <template v-else>
                <div v-if="filteredGroups.length === 0" class="text-center py-10 text-base-content/40 text-xs">
                  Tidak ada grup ditemukan.
                </div>
                <div v-else class="space-y-1">
                  <div v-for="group in filteredGroups" :key="group.id" @click="selectContact(group, true)" class="flex items-center justify-between p-3 rounded-xl hover:bg-base-100 border border-transparent hover:border-base-content/10 transition cursor-pointer group">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shrink-0">
                        <icons.Users class="w-5 h-5" />
                      </div>
                      <div class="truncate">
                        <p class="text-sm font-bold text-base-content group-hover:text-amber-600 transition-colors truncate">{{ group.subject }}</p>
                        <p class="text-xs text-base-content/50 font-mono truncate">{{ group.id }}</p>
                      </div>
                    </div>
                    <icons.Send class="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 shrink-0" />
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.animate-scale-up {
  animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
