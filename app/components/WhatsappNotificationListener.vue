<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import * as icons from "lucide-vue-next";
import { WhatsappService } from "@/services/whatsapp.service";
import { useAuthStore } from "@/stores/auth";

const waService = WhatsappService();
const authStore = useAuthStore();
const deviceId = computed(() => authStore.tenant_id || "main-session");

let isSessionConnected = false;
let lastSessionCheckTime = 0;

/**
 * Pengecekan status koneksi sesi WhatsApp per tenant
 */
const checkSessionConnection = async (): Promise<boolean> => {
  const now = Date.now();
  // Cache status koneksi selama 10 detik agar efisien dan tidak membebani server
  if (now - lastSessionCheckTime < 10000) {
    return isSessionConnected;
  }
  try {
    const statusRes = await waService.getDevices();
    const activeDevices = statusRes?.devices || [];
    isSessionConnected = activeDevices.includes(deviceId.value);
    lastSessionCheckTime = now;
    return isSessionConnected;
  } catch (err) {
    isSessionConnected = false;
    return false;
  }
};

interface NotificationPayload {
  isGroup: boolean;
  groupName?: string;
  contactName?: string;
  senderName?: string;
  text: string;
  phoneNumber: string;
}

const toastNotification = ref<NotificationPayload | null>(null);

let toastTimer: any = null;
let globalMsgPollTimer: any = null;
const seenMessageIds = new Set<string>();
let isFirstPoll = true;

// Cache Master Kontak untuk resolusi nama pengirim & nama grup
const contactCache = ref<Map<string, any>>(new Map());

const fetchContactsCache = async () => {
  try {
    const res = await waService.getContacts(1, 200);
    const items = res?.items || [];
    const map = new Map<string, any>();
    items.forEach((c: any) => {
      if (c.phoneNumber) map.set(c.phoneNumber, c);
    });
    contactCache.value = map;
  } catch (err) {}
};

const findContactInCache = (rawPhone: string) => {
  if (!rawPhone) return null;
  if (contactCache.value.has(rawPhone)) return contactCache.value.get(rawPhone);

  const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
  if (!cleanDigits) return null;

  for (const [phone, contact] of contactCache.value.entries()) {
    const cDigits = phone.replace(/[^0-9]/g, '');
    if (cDigits && (cDigits === cleanDigits || (cleanDigits.length >= 8 && cDigits.endsWith(cleanDigits.slice(-8))))) {
      return contact;
    }
  }
  return null;
};

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return "-";
  const clean = phone.replace(/@.*$/, '');
  return clean.startsWith("62") ? `+${clean}` : clean;
};

/**
 * Sound Chime Generator dengan Web Audio API
 */
const playNotificationSound = (isGroup: boolean) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    if (isGroup) {
      // Sound Chime khusus Grup: Frekuensi Dual Step (D5 -> F#5 -> A5)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(739.99, ctx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.2);
    } else {
      // Sound Chime Pesan Mandiri (D5 -> A5)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    }

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
};

/**
 * Trigger Notifikasi Masuk
 */
const triggerIncomingNotification = (msg: any) => {
  const rawNum = msg.phoneNumber || '';
  // Hanya grup jika nomor mengandung @g.us atau ID format grup WhatsApp
  const isGroup = Boolean(
    rawNum.endsWith("@g.us") ||
    (rawNum.includes("-") && !rawNum.startsWith("62") && !rawNum.startsWith("08"))
  );

  playNotificationSound(isGroup);

  let rawText = msg.message || "";
  let senderName: string | undefined = undefined;

  if (isGroup) {
    const match = rawText.match(/^\[([^\]]+)\]:\s*(.*)/s) || rawText.match(/^\[~([^\]]+)\]\s*(.*)/s);
    if (match) {
      senderName = match[1].trim();
      rawText = match[2].trim();
    } else if (msg.participantJid) {
      const numOnly = msg.participantJid.split("@")[0];
      const matchedParticipant = findContactInCache(numOnly);
      senderName = matchedParticipant?.name || formatPhoneNumber(numOnly);
    }
  }

  // Penanganan jika pesan kosong atau berupa lampiran media
  let cleanMessageText = rawText;
  if (!cleanMessageText && msg.mediaUrl) {
    cleanMessageText = "📷 [Lampiran Media / Gambar / Dokumen]";
  } else if (!cleanMessageText) {
    cleanMessageText = "Pesan baru masuk";
  }

  const matchedContact = findContactInCache(rawNum);
  const groupName = isGroup ? (matchedContact?.name || "Grup WhatsApp") : undefined;
  const contactName = !isGroup ? (matchedContact?.name || matchedContact?.pushName || formatPhoneNumber(rawNum)) : undefined;

  toastNotification.value = {
    isGroup,
    groupName,
    contactName,
    senderName,
    text: cleanMessageText,
    phoneNumber: rawNum,
  };

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastNotification.value = null;
  }, 7500);

  // Desktop Native Notification
  if ("Notification" in window && Notification.permission === "granted") {
    const notifTitle = isGroup
      ? `👥 [Grup] ${groupName}${senderName ? ` (${senderName})` : ''}`
      : `👤 [Mandiri] ${contactName}`;

    try {
      new Notification(notifTitle, {
        body: cleanMessageText,
        icon: "/favicon.ico",
        tag: msg.messageId || String(Date.now()),
      });
    } catch (e) {}
  }
};

const checkNewIncomingMessages = async () => {
  try {
    // Jalankan request getMessageLogs hanya ketika sesi WhatsApp terhubung (konek)
    const isConnected = await checkSessionConnection();
    if (!isConnected) {
      return;
    }

    const res = await waService.getMessageLogs(1, 15, { direction: "IN" });
    const latestLogs = res?.items || [];

    if (isFirstPoll) {
      latestLogs.forEach((m: any) => {
        if (m.messageId) seenMessageIds.add(m.messageId);
        seenMessageIds.add(String(m.id));
      });
      isFirstPoll = false;
      return;
    }

    const incomingNew = latestLogs
      .filter((m: any) => {
        const idKey = m.messageId || String(m.id);
        return m.direction === "IN" && !seenMessageIds.has(idKey);
      })
      .reverse();

    for (const msg of incomingNew) {
      const idKey = msg.messageId || String(msg.id);
      seenMessageIds.add(idKey);
      triggerIncomingNotification(msg);
    }
  } catch (err) {}
};

onMounted(() => {
  fetchContactsCache();
  checkNewIncomingMessages();
  globalMsgPollTimer = setInterval(checkNewIncomingMessages, 4000);
});

onUnmounted(() => {
  clearInterval(globalMsgPollTimer);
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="toastNotification"
        class="fixed bottom-5 right-5 z-[99999] max-w-md w-full bg-slate-900 text-white border-2 rounded-2xl shadow-2xl p-4 transition-all duration-300 transform animate-scale-up"
        :class="toastNotification.isGroup ? 'border-amber-500 shadow-amber-500/20' : 'border-emerald-500 shadow-emerald-500/20'"
      >
        <div class="flex items-start gap-3.5">
          <!-- ICON BADGE MODULAR -->
          <div
            class="p-2.5 rounded-2xl shrink-0 flex items-center justify-center border"
            :class="toastNotification.isGroup ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'"
          >
            <icons.UsersRound v-if="toastNotification.isGroup" class="w-6 h-6 animate-bounce text-amber-400" />
            <icons.UserCheck v-else class="w-6 h-6 animate-bounce text-emerald-400" />
          </div>

          <div class="flex-1 min-w-0">
            <!-- TYPE BADGE HEADER -->
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5"
                :class="toastNotification.isGroup ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
              >
                <span class="w-2 h-2 rounded-full" :class="toastNotification.isGroup ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-ping'"></span>
                {{ toastNotification.isGroup ? '👥 Pesan Grup WhatsApp' : '👤 Pesan Mandiri' }}
              </span>
              <button @click="toastNotification = null" class="text-slate-400 hover:text-white text-xs p-1 cursor-pointer transition">
                <icons.X class="w-4 h-4" />
              </button>
            </div>

            <!-- TITLE / NAME -->
            <h4 class="font-extrabold text-sm text-white mt-2 truncate leading-snug">
              {{ toastNotification.isGroup ? toastNotification.groupName : toastNotification.contactName }}
            </h4>

            <!-- SENDER DETAIL FOR GROUP OR PERSONAL PHONE -->
            <p v-if="toastNotification.isGroup && toastNotification.senderName" class="text-[11px] font-bold text-amber-400 truncate mt-0.5">
              Oleh: {{ toastNotification.senderName }}
            </p>
            <p v-else-if="!toastNotification.isGroup" class="text-[11px] font-medium text-slate-400 truncate mt-0.5">
              {{ formatPhoneNumber(toastNotification.phoneNumber) }}
            </p>

            <!-- MESSAGE PREVIEW -->
            <div class="mt-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <p class="text-xs text-slate-100 line-clamp-3 break-words font-medium leading-relaxed">
                {{ toastNotification.text }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.animate-scale-up {
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
</style>
