<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import * as icons from "lucide-vue-next";
import SecureMedia from "@/components/SecureMedia.vue";
import { WhatsappService } from "@/services/whatsapp.service";
import { useAuthStore } from "@/stores/auth";
import { useGlobalWhatsappChat } from "@/composables/useGlobalWhatsappChat";
import Swal from "sweetalert2";

const { showGlobalChat, activeChatContact, closeChat, pendingShareFile, pendingShareUrls } = useGlobalWhatsappChat();
const chatReplyUrls = ref<string[]>([]);
const waService = WhatsappService();
const authStore = useAuthStore();
const deviceId = computed(() => authStore.tenant_id || "main-session");

// STATE
const chatLogs = ref<any[]>([]);
const chatLogsLoading = ref(false);
const chatReplyText = ref("");
const chatReplyFile = ref<File | null>(null);
const sendingChatReply = ref(false);
const replyingToMessage = ref<any>(null);
const chatContainerRef = ref<HTMLElement | null>(null);
const chatFileInput = ref<HTMLInputElement | null>(null);
let chatPollTimer: any = null;

const sortedChatLogs = computed(() => {
  return [...chatLogs.value].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
});

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return "-";
  const clean = phone.replace(/@.*$/, '');
  return clean.startsWith("62") ? `+${clean}` : clean;
};

const formatDateTime = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const isImageOrVideo = (url?: string) => {
  if (!url) return false;
  return Boolean(url.match(/\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)$/i));
};

const getMediaType = (url?: string): 'photo' | 'video' => {
  if (!url) return 'photo';
  return url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'photo';
};

const parseGroupSender = (message: string) => {
  if (!message) return { sender: null, cleanText: '' };
  const match = message.match(/^\[([^\]]+)\]:\s*(.*)/s) || message.match(/^\[~([^\]]+)\]\s*(.*)/s);
  if (match) return { sender: match[1].trim(), cleanText: match[2].trim() };
  return { sender: null, cleanText: message };
};

const formatMessageText = (text: string) => {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
    
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return escaped.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline decoration-1 underline-offset-2 hover:opacity-80 transition font-bold" @click.stop>${url}</a>`;
  });
};

const getMessageSenderLabel = (msg: any) => {
  if (msg.direction === 'OUT') return 'Anda';
  return parseGroupSender(msg.message).sender || activeChatContact.value?.name || activeChatContact.value?.pushName || 'Pelanggan';
};

const getQuotedMessage = (quotedId: string) => {
  return chatLogs.value.find((m: any) => m.messageId === quotedId);
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
};

const scrollToQuotedMessage = (quotedId: string) => {
  const el = document.getElementById(`wa-msg-${quotedId}`);
  if (el && chatContainerRef.value) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('wa-highlight-flash');
    setTimeout(() => {
      el.classList.remove('wa-highlight-flash');
    }, 2000);
  }
};

const setReplyTarget = (msg: any) => {
  replyingToMessage.value = msg;
};

const cancelReplyTarget = () => {
  replyingToMessage.value = null;
};

const handleChatFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    if (file.size > 15 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "Ukuran File Terlalu Besar", text: "Batas maksimal 15MB." });
      chatFileInput.value!.value = "";
      return;
    }
    chatReplyFile.value = file;
  }
};

const clearChatReplyFile = () => {
  chatReplyFile.value = null;
  chatReplyUrls.value = [];
  if (chatFileInput.value) chatFileInput.value.value = "";
};

const fetchContactChatLogs = async (isSilent = false) => {
  if (!activeChatContact.value) return;
  if (!isSilent) chatLogsLoading.value = true;
  try {
    const rawPhone = activeChatContact.value.phoneNumber || '';
    const cleanPhone = rawPhone.trim().replace(/^[\s+]+/, '');
    const chatType = activeChatContact.value.chatType || (
      (rawPhone.endsWith('@g.us') || rawPhone.includes('@g.us') || activeChatContact.value.isGroup) ? 'GROUP' : 'PERSONAL'
    );
    const res = await waService.getMessageLogs(1, 100, {
      phoneNumber: cleanPhone,
      chatType,
    });
    const newItems = res?.items || [];
    const prevCount = chatLogs.value.length;
    chatLogs.value = newItems;
    if (!isSilent || newItems.length !== prevCount) {
      scrollToBottom();
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (!isSilent) chatLogsLoading.value = false;
  }
};

const submitChatReply = async () => {
  if (!activeChatContact.value) return;
  if (!chatReplyText.value.trim() && !chatReplyFile.value && chatReplyUrls.value.length === 0) return;

  sendingChatReply.value = true;
  try {
    const targetPhone = activeChatContact.value.phoneNumber;
    
    let sendMsg = chatReplyText.value;
    
    if (chatReplyUrls.value.length > 0) {
      for (const url of chatReplyUrls.value) {
        await waService.sendMessage(
          deviceId.value,
          targetPhone,
          sendMsg,
          undefined,
          replyingToMessage.value?.messageId,
          url
        );
        sendMsg = ""; // Hanya lampirkan caption di media pertama
        replyingToMessage.value = null; // Hanya kutip pesan di media pertama
      }
    } else {
      await waService.sendMessage(
        deviceId.value,
        targetPhone,
        sendMsg,
        chatReplyFile.value || undefined,
        replyingToMessage.value?.messageId,
        undefined
      );
    }
    
    chatReplyText.value = "";
    clearChatReplyFile();
    cancelReplyTarget();
    await fetchContactChatLogs(true);
    setTimeout(scrollToBottom, 300);
  } catch (err: any) {
    Swal.fire({ icon: "error", title: "Gagal Kirim", text: err.message || "Pastikan perangkat terhubung ke WhatsApp." });
  } finally {
    sendingChatReply.value = false;
  }
};

watch(showGlobalChat, (val) => {
  if (val) {
    chatLogs.value = [];
    chatReplyText.value = "";
    
    // Gunakan file pending jika ada (dari share fitur), jika tidak reset
    if (pendingShareFile.value) {
      chatReplyFile.value = pendingShareFile.value;
    } else if (pendingShareUrls.value && pendingShareUrls.value.length > 0) {
      chatReplyUrls.value = [...pendingShareUrls.value];
    } else {
      clearChatReplyFile();
    }
    
    cancelReplyTarget();
    fetchContactChatLogs();
    chatPollTimer = setInterval(() => fetchContactChatLogs(true), 3000);
  } else {
    clearInterval(chatPollTimer);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showGlobalChat" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
          
          <div class="px-6 py-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border"
                :class="(activeChatContact?.chatType === 'GROUP' || activeChatContact?.isGroup || activeChatContact?.phoneNumber?.endsWith('@g.us')) ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-purple-500/10 text-purple-600 border-purple-500/30'">
                <icons.Users v-if="activeChatContact?.chatType === 'GROUP' || activeChatContact?.isGroup || activeChatContact?.phoneNumber?.endsWith('@g.us')" class="w-5 h-5" />
                <icons.User v-else class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-bold text-base text-base-content leading-tight flex items-center gap-2">
                  <span>{{ activeChatContact?.name || activeChatContact?.pushName || 'Tanpa Nama' }}</span>
                  <span class="badge badge-xs font-bold text-[10px] px-2 uppercase"
                    :class="(activeChatContact?.chatType === 'GROUP' || activeChatContact?.isGroup || activeChatContact?.phoneNumber?.endsWith('@g.us')) ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' : 'bg-purple-500/20 text-purple-600 border-purple-500/30'">
                    {{ (activeChatContact?.chatType === 'GROUP' || activeChatContact?.isGroup || activeChatContact?.phoneNumber?.endsWith('@g.us')) ? '👥 GRUP WHATSAPP' : '👤 PESAN PRIBADI' }}
                  </span>
                </h3>
                <p class="text-[11px] text-base-content/50 mt-0.5 flex items-center gap-1.5 font-mono">
                  <span>{{ formatPhoneNumber(activeChatContact?.phoneNumber) }}</span>
                  <span>•</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Chat Sync</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button @click="fetchContactChatLogs(false)" :disabled="chatLogsLoading" class="btn btn-ghost btn-xs gap-1 border border-base-content/10 hover:bg-base-200 rounded-lg">
                <icons.RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': chatLogsLoading }" />
                <span>Refresh</span>
              </button>
              <button @click="closeChat" class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-xl">
                <icons.X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref="chatContainerRef" class="flex-1 p-6 overflow-y-auto space-y-4 bg-base-200/20">
            <div v-if="chatLogsLoading && chatLogs.length === 0" class="flex flex-col items-center justify-center py-12 text-base-content/40">
              <span class="loading loading-spinner loading-md text-emerald-500 mb-2"></span>
              <span class="text-xs font-semibold">Memuat riwayat chat...</span>
            </div>
            <div v-else-if="!chatLogsLoading && chatLogs.length === 0" class="flex flex-col items-center justify-center py-12 text-base-content/40 text-center space-y-2">
              <icons.MessageSquareOff class="w-10 h-10 text-base-content/20" />
              <p class="text-xs font-bold">Belum ada riwayat percakapan dengan kontak ini</p>
            </div>
            <template v-else>
              <div v-for="msg in sortedChatLogs" :key="msg.id" :id="'wa-msg-' + msg.messageId" class="flex flex-col scroll-mt-4" :class="msg.direction === 'OUT' ? 'items-end' : 'items-start'">
                <div class="max-w-[80%] rounded-2xl p-3.5 shadow-xs text-xs space-y-1 relative group transition-all" :class="msg.direction === 'OUT' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-base-100 border border-base-content/15 text-base-content rounded-bl-none shadow-sm'">
                  <div class="flex items-center justify-between text-[10px] opacity-80 gap-4 mb-1">
                    <span class="font-bold uppercase tracking-wider flex items-center gap-1">
                      <component :is="msg.direction === 'OUT' ? icons.ArrowUpRight : icons.ArrowDownLeft" class="w-3 h-3" />
                      {{ getMessageSenderLabel(msg) }}
                    </span>
                    <div class="flex items-center gap-2">
                      <span>{{ formatDateTime(msg.createdAt) }}</span>
                      <button @click="setReplyTarget(msg)" class="hover:underline flex items-center gap-0.5 opacity-90 hover:opacity-100 font-semibold cursor-pointer text-emerald-500 dark:text-emerald-300">
                        <icons.Reply class="w-3 h-3" /> Balas
                      </button>
                    </div>
                  </div>
                  <div v-if="msg.quotedMessageId && getQuotedMessage(msg.quotedMessageId)" @click="scrollToQuotedMessage(msg.quotedMessageId)" class="rounded-xl p-2.5 cursor-pointer border-l-[3px] transition-all hover:opacity-80 mb-1" :class="msg.direction === 'OUT' ? 'bg-emerald-700/50 border-white/50 hover:bg-emerald-700/70' : 'bg-base-200/80 border-emerald-500 hover:bg-base-200'">
                    <div class="text-[10px] font-bold flex items-center gap-1 mb-0.5" :class="msg.direction === 'OUT' ? 'text-emerald-200' : 'text-emerald-600'">
                      <icons.Reply class="w-3 h-3" />
                      <span v-if="getQuotedMessage(msg.quotedMessageId)?.direction === 'OUT'">Anda</span>
                      <span v-else>{{ parseGroupSender(getQuotedMessage(msg.quotedMessageId)?.message || '').sender || activeChatContact?.name || 'Pelanggan' }}</span>
                    </div>
                    <p class="text-[11px] line-clamp-2 leading-snug" :class="msg.direction === 'OUT' ? 'text-white/80' : 'text-base-content/70'">{{ parseGroupSender(getQuotedMessage(msg.quotedMessageId)?.message || '').cleanText }}</p>
                  </div>
                  <div v-if="msg.mediaUrl" class="my-1.5 overflow-hidden rounded-xl border border-base-content/10 bg-black/5">
                    <div v-if="isImageOrVideo(msg.mediaUrl)" class="max-h-56 h-48 w-full relative">
                      <SecureMedia :filename="msg.mediaUrl" :type="getMediaType(msg.mediaUrl)" />
                    </div>
                    <div v-else 
                      class="p-3 flex items-center justify-between gap-2 text-xs font-semibold transition-colors"
                      :class="msg.direction === 'OUT' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600'"
                    >
                      <div class="flex items-center gap-1.5 truncate">
                        <icons.FileText class="w-4 h-4 shrink-0" /> 
                        <span class="truncate font-mono" :title="msg.mediaUrl.split('/').pop()">{{ msg.mediaUrl.split('/').pop() }}</span>
                      </div>
                      <a :href="`${$config.public.apiBase}${msg.mediaUrl.startsWith('/') ? '' : '/'}${msg.mediaUrl}?token=${authStore.token}`" target="_blank" class="btn btn-xs btn-circle btn-ghost shrink-0 border" 
                        :class="msg.direction === 'OUT' ? 'text-white border-white/30 hover:bg-white/20' : 'text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10'" 
                        title="Unduh File">
                        <icons.Download class="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <div v-if="parseGroupSender(msg.message).sender" class="text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 mb-1.5 border" :class="msg.direction === 'OUT' ? 'bg-white/20 text-white border-white/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'">
                      <icons.User class="w-3 h-3" /> {{ parseGroupSender(msg.message).sender }}
                    </div>
                    <p class="whitespace-pre-wrap leading-relaxed break-words font-sans" v-html="formatMessageText(parseGroupSender(msg.message).cleanText)"></p>
                  </div>
                  <div v-if="msg.direction === 'OUT'" class="flex items-center justify-end text-[9px] opacity-80 gap-1 pt-0.5">
                    <span v-if="msg.messageId && !msg.messageId.startsWith('INVALID')" class="font-mono">Terkirim ✓</span>
                    <span v-else-if="msg.messageId && msg.messageId.startsWith('INVALID')" class="text-red-200 font-bold">Gagal</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="p-4 border-t border-base-content/10 bg-base-100 space-y-3">
            <div v-if="activeChatContact?.phoneNumber?.endsWith('@g.us') || activeChatContact?.phoneNumber?.includes('-')" class="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
              <icons.Users class="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Percakapan Grup WhatsApp. Balasan yang Anda kirim di sini akan terkirim ke seluruh anggota grup.</span>
            </div>
            <div v-if="replyingToMessage" class="flex items-center justify-between bg-emerald-500/10 border-l-4 border-emerald-500 p-2.5 rounded-r-xl text-xs">
              <div class="truncate space-y-0.5">
                <div class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <icons.Reply class="w-3.5 h-3.5" />
                  <span>Membalas Pesan {{ replyingToMessage.direction === 'OUT' ? 'Anda' : (parseGroupSender(replyingToMessage.message).sender || 'Pelanggan') }}</span>
                </div>
                <div class="text-xs text-base-content/80 truncate font-mono">"{{ parseGroupSender(replyingToMessage.message).cleanText || replyingToMessage.message }}"</div>
              </div>
              <button @click="cancelReplyTarget" class="text-base-content/40 hover:text-base-content p-1 rounded-lg">
                <icons.X class="w-3.5 h-3.5" />
              </button>
            </div>
            <div v-if="chatReplyFile || chatReplyUrls.length > 0" class="flex items-center justify-between bg-emerald-500/10 text-emerald-600 p-2 rounded-xl text-xs font-semibold">
              <span v-if="chatReplyFile" class="truncate">File: {{ chatReplyFile.name }} ({{ (chatReplyFile.size / 1024 / 1024).toFixed(2) }} MB)</span>
              <span v-else class="truncate">Membagikan {{ chatReplyUrls.length > 1 ? chatReplyUrls.length + ' File Media' : 'File: ' + chatReplyUrls[0].split('/').pop() }}</span>
              <button @click="clearChatReplyFile" class="text-error hover:bg-error/10 p-1 rounded">
                <icons.X class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="flex items-center gap-2">
              <label class="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-emerald-500 cursor-pointer" title="Lampirkan File Media">
                <icons.Paperclip class="w-4 h-4" />
                <input type="file" ref="chatFileInput" @change="handleChatFileChange" accept="image/*,video/*,application/pdf" class="hidden" />
              </label>
              <input v-model="chatReplyText" @keyup.enter="submitChatReply" type="text" :placeholder="(activeChatContact?.phoneNumber?.endsWith('@g.us') || activeChatContact?.phoneNumber?.includes('-')) ? 'Ketik balasan ke GRUP WhatsApp ini...' : 'Ketik balasan pesan pribadi...'" class="input input-bordered input-sm flex-1 rounded-xl text-xs focus:border-emerald-500" />
              <button @click="submitChatReply" :disabled="(!chatReplyText.trim() && !chatReplyFile && chatReplyUrls.length === 0) || sendingChatReply" class="btn btn-emerald btn-sm text-white rounded-xl gap-1 px-4 border-none shadow-md" style="background-color: #059669">
                <span v-if="sendingChatReply" class="loading loading-spinner loading-xs"></span>
                <icons.Send v-else class="w-4 h-4" />
                <span class="hidden sm:inline font-bold">Kirim</span>
              </button>
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
.wa-highlight-flash {
  animation: highlightFlash 2s ease-out;
}
@keyframes highlightFlash {
  0% { background-color: rgba(234, 179, 8, 0.35); box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.25); }
  100% { background-color: transparent; box-shadow: none; }
}
</style>
