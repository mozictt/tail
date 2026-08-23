<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as icons from "lucide-vue-next";
import { WhatsappService } from '@/services/whatsapp.service';
import { useWhatsappNotif } from '@/composables/useWhatsappNotif';
import { useRouter, useRoute } from 'vue-router';
import { useSlugRoute } from '@/composables/useSlugRoute';

const { unreadCount, startPolling, stopPolling, clearUnread } = useWhatsappNotif();
const waService = WhatsappService();
const router = useRouter();
const route = useRoute();
const { slugPath } = useSlugRoute();

const showDropdown = ref(false);
const unreadMessages = ref<any[]>([]);
const loading = ref(false);

const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    if (unreadCount.value > 0) {
      loading.value = true;
      try {
        const limit = Math.min(unreadCount.value, 50);
        const res = await waService.getMessageLogs(1, limit, { direction: 'IN' });
        unreadMessages.value = res.items || [];
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    } else {
      unreadMessages.value = [];
    }
  }
};

const markAllAsRead = () => {
  clearUnread();
  showDropdown.value = false;
};

const openMessage = (msg: any) => {
  markAllAsRead();
  router.push({ path: slugPath('/whatsapp/contacts'), query: { phone: msg.phoneNumber } });
};

// Click outside directive logic to close dropdown
const dropdownRef = ref<HTMLElement | null>(null);
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  startPolling();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  stopPolling();
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <button @click="toggleDropdown" class="btn btn-ghost btn-sm btn-circle relative hover:bg-base-200 transition-colors flex items-center justify-center" title="Notifikasi WhatsApp">
      <!-- WhatsApp SVG Icon -->
      <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-emerald-500">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
      </svg>
      <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 badge badge-sm badge-error text-white font-bold border-none shadow-sm px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px]">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>
    
    <div v-if="showDropdown" class="absolute right-0 mt-2 w-80 sm:w-96 bg-base-100 border border-base-content/10 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[70vh]">
      <div class="px-4 py-3 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
        <h3 class="font-bold text-sm text-base-content flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-emerald-500">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          Pesan Belum Dibaca
        </h3>
        <button v-if="unreadCount > 0" @click="markAllAsRead" class="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer">
          Tandai Dibaca
        </button>
      </div>
      
      <div class="overflow-y-auto flex-1 bg-base-100 scrollbar-thin">
        <div v-if="loading" class="py-8 flex justify-center">
          <span class="loading loading-spinner loading-md text-emerald-500"></span>
        </div>
        <div v-else-if="unreadMessages.length === 0" class="py-8 text-center text-xs text-base-content/50 font-medium">
          Tidak ada pesan baru.
        </div>
        <div v-else class="divide-y divide-base-content/5">
          <div 
            v-for="msg in unreadMessages" 
            :key="msg.id"
            @click="openMessage(msg)"
            class="p-3 hover:bg-base-200 cursor-pointer transition-colors flex gap-3 items-start group"
          >
             <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                 :class="msg.chatType === 'GROUP' ? 'bg-amber-500/10 text-amber-600' : 'bg-purple-500/10 text-purple-600'">
               <icons.Users v-if="msg.chatType === 'GROUP'" class="w-3.5 h-3.5" />
               <icons.User v-else class="w-3.5 h-3.5" />
             </div>
             <div class="flex-1 min-w-0">
               <div class="flex justify-between items-center mb-0.5">
                 <span class="font-bold text-xs text-base-content truncate group-hover:text-emerald-600 transition-colors">{{ msg.phoneNumber }}</span>
                 <span class="text-[9px] text-base-content/40 font-medium ml-2 shrink-0">{{ new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}</span>
               </div>
               <p class="text-[11px] text-base-content/70 line-clamp-2 leading-snug">
                 <span v-if="msg.mediaUrl" class="text-emerald-500 mr-1 font-bold inline-flex items-center gap-0.5">
                   <icons.Image class="w-3 h-3" />
                 </span>
                 {{ msg.message }}
               </p>
             </div>
          </div>
        </div>
      </div>
      
      <div class="p-2 border-t border-base-content/10 bg-base-200/30 text-center">
         <button @click="() => { showDropdown = false; router.push(slugPath('/whatsapp/contacts')); }" class="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">
           Buka Master Kontak
         </button>
      </div>
    </div>
  </div>
</template>
