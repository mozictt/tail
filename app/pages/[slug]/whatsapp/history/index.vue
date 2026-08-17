<template>
  <div class="space-y-6 pb-12">
    <!-- HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-base-content/60 mb-1">
          <NuxtLink :to="slugPath('/dashboard')" class="hover:text-emerald-500 transition flex items-center gap-1">
            <icons.Home class="w-3.5 h-3.5" />
            Dashboard
          </NuxtLink>
          <span>/</span>
          <NuxtLink :to="slugPath('/whatsapp')" class="hover:text-emerald-500 transition">WhatsApp</NuxtLink>
          <span>/</span>
          <span class="text-base-content/90 font-semibold">Riwayat Pesan</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight flex items-center gap-2.5">
          <icons.History class="w-7 h-7 text-emerald-500" />
          Riwayat Pesan WhatsApp
        </h1>
        <p class="text-xs sm:text-sm text-base-content/60 mt-0.5">
          Kelola, balas, dan kirim ulang pesan WhatsApp masuk maupun keluar milik tenant Anda.
        </p>
      </div>
      <!-- Action Buttons Header -->
      <div class="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
        <!-- Tombol Kirim Pesan Baru -->
        <button
          @click="openNewMessageModal"
          class="btn btn-sm text-white font-bold rounded-xl gap-2 shadow-sm border-none hover:opacity-90 transition cursor-pointer"
          style="background-color: #059669; color: #ffffff !important;"
        >
          <icons.Send class="w-4 h-4 text-white" />
          <span>Kirim Pesan</span>
        </button>

        <!-- Tombol Kirim Broadcast -->
        <button
          @click="openBroadcastModal"
          class="btn btn-sm text-white font-bold rounded-xl gap-2 shadow-sm border-none hover:opacity-90 transition cursor-pointer"
          style="background-color: #8b5cf6; color: #ffffff !important;"
        >
          <icons.Radio class="w-4 h-4 text-white" />
          <span>Kirim Broadcast</span>
        </button>

        <!-- Refresh -->
        <button @click="fetchLogs" :disabled="loading" class="btn btn-ghost btn-sm gap-2 border border-base-content/10 hover:bg-base-200">
          <icons.RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          <span class="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Search -->
        <div class="relative flex-1 min-w-[200px]">
          <icons.Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40 pointer-events-none" />
          <input
            v-model="filterSearch"
            @input="debouncedFetch"
            type="text"
            placeholder="Cari nomor atau isi pesan..."
            class="input input-bordered input-sm w-full pl-9 rounded-xl text-xs focus:border-emerald-500"
          />
        </div>

        <!-- Filter Direction -->
        <div class="flex items-center gap-1.5 bg-base-200/60 rounded-xl p-1">
          <button
            v-for="opt in directionOptions"
            :key="opt.value"
            @click="setDirection(opt.value)"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              filterDirection === opt.value
                ? 'bg-base-100 shadow text-base-content'
                : 'text-base-content/50 hover:text-base-content'
            ]"
          >
            <component :is="opt.icon" class="w-3.5 h-3.5 inline mr-1" />
            {{ opt.label }}
          </button>
        </div>

        <!-- Per Page -->
        <select v-model="logsLimit" @change="fetchLogs" class="select select-bordered select-sm rounded-xl text-xs focus:border-emerald-500">
          <option :value="10">10 / hal</option>
          <option :value="20">20 / hal</option>
          <option :value="50">50 / hal</option>
        </select>
      </div>
    </div>

    <!-- STATS CARDS -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div v-for="stat in statCards" :key="stat.label"
        class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div :class="['p-2.5 rounded-xl', stat.bg]">
          <component :is="stat.icon" :class="['w-5 h-5', stat.color]" />
        </div>
        <div>
          <div class="text-xl font-extrabold text-base-content">{{ stat.value }}</div>
          <div class="text-[11px] text-base-content/50 font-medium">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <div class="bg-base-100 border border-base-content/10 rounded-3xl shadow-sm overflow-hidden">
      <!-- Loading Skeleton -->
      <div v-if="loading && logs.length === 0" class="p-12 flex flex-col items-center gap-3 text-base-content/40">
        <span class="loading loading-spinner loading-md text-emerald-500"></span>
        <span class="text-xs">Memuat riwayat pesan...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && logs.length === 0" class="p-12 flex flex-col items-center gap-3 text-base-content/40">
        <icons.MessageSquareOff class="w-12 h-12 text-base-content/20" />
        <p class="text-sm font-semibold">Tidak ada riwayat pesan</p>
        <p class="text-xs text-center max-w-xs">Coba ubah filter atau kirimkan pesan uji coba dari halaman pengaturan WhatsApp.</p>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto">
        <table class="table table-sm w-full text-xs">
          <thead>
            <tr class="bg-base-200/50 border-b border-base-content/10 text-base-content/70">
              <th class="py-3 pl-5 font-bold">WAKTU</th>
              <th class="py-3 font-bold">ARAH</th>
              <th class="py-3 font-bold">NOMOR WA</th>
              <th class="py-3 font-bold">ISI PESAN</th>
              <th class="py-3 font-bold">DEVICE</th>
              <th class="py-3 pr-5 font-bold text-right">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              class="border-b border-base-content/5 hover:bg-base-200/20 transition-colors"
            >
              <!-- Waktu -->
              <td class="py-3.5 pl-5 whitespace-nowrap text-base-content/60 font-medium">
                {{ formatDateTime(log.createdAt) }}
              </td>

              <!-- Arah -->
              <td class="py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 badge text-[10px] font-bold border-none px-2.5 py-1"
                  :class="log.direction === 'OUT'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-blue-500/10 text-blue-600'"
                >
                  <component :is="log.direction === 'OUT' ? icons.ArrowUpRight : icons.ArrowDownLeft" class="w-3 h-3" />
                  {{ log.direction === 'OUT' ? 'KELUAR' : 'MASUK' }}
                </span>
              </td>

              <!-- Nomor WA -->
              <td class="py-3.5 font-semibold text-base-content">
                {{ formatPhoneNumber(log.phoneNumber) }}
              </td>

              <!-- Isi Pesan -->
              <td class="py-3.5 text-base-content/70 max-w-xs">
                <div class="truncate" :title="log.message">{{ log.message }}</div>
                <div v-if="log.messageId && !log.messageId.startsWith('INVALID')" class="text-[10px] text-base-content/35 font-mono mt-0.5">
                  ID: {{ log.messageId }}
                </div>
                <div v-if="log.messageId && log.messageId.startsWith('INVALID')" class="text-[10px] text-red-400 font-semibold mt-0.5">
                  ✕ Nomor tidak terdaftar di WhatsApp
                </div>
              </td>

              <!-- Device -->
              <td class="py-3.5 font-mono text-[10px] text-base-content/40">
                {{ log.deviceId }}
              </td>

              <!-- Aksi -->
              <td class="py-3.5 pr-5 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Tombol BALAS (khusus pesan MASUK) -->
                  <button
                    v-if="log.direction === 'IN'"
                    @click="openReplyModal(log)"
                    class="btn btn-xs gap-1 bg-blue-500/10 text-blue-600 border-none hover:bg-blue-500/20 rounded-lg"
                    title="Balas pesan ini"
                  >
                    <icons.Reply class="w-3 h-3" />
                    Balas
                  </button>

                  <!-- Tombol KIRIM ULANG (khusus pesan KELUAR) -->
                  <button
                    v-if="log.direction === 'OUT'"
                    @click="openResendModal(log)"
                    class="btn btn-xs gap-1 bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20 rounded-lg"
                    title="Kirim ulang pesan ini"
                  >
                    <icons.RotateCcw class="w-3 h-3" />
                    Kirim Ulang
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PAGINATION -->
        <div class="flex items-center justify-between px-5 py-4 border-t border-base-content/5">
          <span class="text-[11px] text-base-content/50">
            Total <span class="font-bold text-base-content/70">{{ logsTotalItems }}</span> pesan •
            Halaman <span class="font-bold text-base-content/70">{{ logsPage }}</span> dari
            <span class="font-bold text-base-content/70">{{ logsTotalPages }}</span>
          </span>
          <div class="flex items-center gap-1">
            <button
              @click="changePage(logsPage - 1)"
              :disabled="logsPage <= 1 || loading"
              class="btn btn-ghost btn-xs border border-base-content/10 hover:bg-base-200 rounded-lg"
            >
              <icons.ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <template v-for="p in pageNumbers" :key="p">
              <button
                @click="changePage(p)"
                :class="[
                  'btn btn-xs rounded-lg min-w-[30px]',
                  p === logsPage
                    ? 'bg-emerald-500 text-white border-none'
                    : 'btn-ghost border border-base-content/10 hover:bg-base-200'
                ]"
              >{{ p }}</button>
            </template>
            <button
              @click="changePage(logsPage + 1)"
              :disabled="logsPage >= logsTotalPages || loading"
              class="btn btn-ghost btn-xs border border-base-content/10 hover:bg-base-200 rounded-lg"
            >
              <icons.ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DYNAMIC: BALAS / KIRIM ULANG / KIRIM PESAN BARU / BROADCAST -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/40">
              <div class="flex items-center gap-3">
                <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs', modalHeaderStyle.iconBg]">
                  <component :is="modalHeaderStyle.icon" class="w-5 h-5" :class="modalHeaderStyle.iconColor" />
                </div>
                <div>
                  <h3 class="font-bold text-base text-base-content leading-tight">
                    {{ modalHeaderStyle.title }}
                  </h3>
                  <p class="text-xs text-base-content/50 mt-0.5">
                    {{ modalHeaderStyle.subtitle }}
                  </p>
                </div>
              </div>
              <button @click="closeModal" class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-xl">
                <icons.X class="w-4 h-4" />
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-5">
              
              <!-- Mode 1 & 2: Quote / Preview Pesan Referensi (Khusus Reply & Resend) -->
              <div v-if="modalType === 'reply' || modalType === 'resend'" class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/50">
                  Pesan Referensi {{ modalType === 'reply' ? '(Masuk)' : '(Asli)' }}
                </label>
                <div :class="[
                  'relative rounded-2xl p-3.5 border-l-4 bg-base-200/50 text-xs space-y-1.5',
                  modalType === 'reply' ? 'border-l-blue-500 bg-blue-500/5' : 'border-l-emerald-500 bg-emerald-500/5'
                ]">
                  <div class="flex items-center justify-between text-[11px] text-base-content/60">
                    <span class="font-semibold flex items-center gap-1.5 text-base-content/80">
                      <icons.User class="w-3.5 h-3.5" />
                      {{ formatPhoneNumber(selectedLog?.phoneNumber) }}
                    </span>
                    <span class="text-[10px] text-base-content/40">{{ formatDateTime(selectedLog?.createdAt) }}</span>
                  </div>
                  <p class="text-xs text-base-content/80 italic leading-relaxed break-words">
                    "{{ selectedLog?.message }}"
                  </p>
                </div>
              </div>

              <!-- Mode 1 & 2: Field Nomor Tujuan Read-Only (Reply & Resend) -->
              <div v-if="modalType === 'reply' || modalType === 'resend'" class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/50">
                  Nomor Tujuan WhatsApp
                </label>
                <div class="relative flex items-center">
                  <div class="absolute left-3.5 text-base-content/40 pointer-events-none">
                    <icons.Phone class="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    :value="formatPhoneNumber(selectedLog?.phoneNumber)"
                    readonly
                    class="input input-bordered input-sm w-full pl-10 pr-24 rounded-xl text-xs font-semibold bg-base-200/60 cursor-not-allowed text-base-content/70"
                  />
                  <span class="absolute right-3 badge badge-sm bg-base-300 text-base-content/60 text-[10px] border-none font-mono">
                    <icons.Lock class="w-3 h-3 mr-1" />
                    Read-only
                  </span>
                </div>
              </div>

              <!-- Mode 3: Field Input Nomor Tunggal (Khusus New Message) -->
              <div v-if="modalType === 'new_message'" class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/50">
                  Nomor WhatsApp Tujuan
                </label>
                <div class="relative flex items-center">
                  <div class="absolute left-3.5 text-base-content/40 pointer-events-none">
                    <icons.Phone class="w-4 h-4" />
                  </div>
                  <input
                    v-model="modalPhone"
                    type="text"
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    class="input input-bordered input-sm w-full pl-10 rounded-xl text-xs font-semibold focus:border-emerald-500"
                  />
                </div>
                <p class="text-[10px] text-base-content/40">Format nomor otomatis disesuaikan ke format internasional (+62).</p>
              </div>

              <!-- Mode 4: Field Input Daftar Nomor (Khusus Broadcast) -->
              <div v-if="modalType === 'broadcast'" class="space-y-3">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/50">
                      Daftar Nomor Penerima Broadcast
                    </label>
                    <span class="text-[10px] font-mono text-purple-600 font-bold">
                      {{ parsedRecipientCount }} Nomor
                    </span>
                  </div>
                  <textarea
                    v-model="broadcastRecipients"
                    :rows="4"
                    placeholder="Masukkan daftar nomor telepon (satu nomor per baris atau dipisahkan koma)...&#10;Contoh:&#10;08123456789&#10;08987654321"
                    class="textarea textarea-bordered w-full rounded-2xl text-xs focus:border-purple-500 focus:outline-none p-3.5 leading-relaxed bg-base-100 font-mono"
                  ></textarea>
                </div>

                <!-- Delay Antar Pesan -->
                <div class="space-y-1.5">
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/50">
                    Jeda Pengiriman (Fitur Anti-Ban)
                  </label>
                  <select v-model="broadcastDelay" class="select select-bordered select-sm w-full rounded-xl text-xs focus:border-purple-500">
                    <option :value="2000">2 Detik (Cepat)</option>
                    <option :value="3000">3 Detik (Rekomendasi Standar)</option>
                    <option :value="5000">5 Detik (Aman)</option>
                    <option :value="10000">10 Detik (Sangat Aman)</option>
                  </select>
                </div>
              </div>

              <!-- Field Isi Pesan (Berlaku untuk semua mode) -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/50">
                    {{ modalType === 'reply' ? 'Pesan Balasan' : modalType === 'broadcast' ? 'Isi Pesan Broadcast' : 'Isi Pesan WhatsApp' }}
                  </label>
                  <span class="text-[10px] font-mono text-base-content/40">
                    {{ modalMessage.length }} Karakter
                  </span>
                </div>
                <textarea
                  v-model="modalMessage"
                  :rows="4"
                  :placeholder="modalType === 'reply' ? 'Ketik pesan balasan Anda di sini...' : 'Tuliskan isi pesan yang ingin dikirimkan...'"
                  class="textarea textarea-bordered w-full rounded-2xl text-xs focus:border-emerald-500 focus:outline-none p-3.5 leading-relaxed bg-base-100"
                ></textarea>
              </div>

            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-base-content/10 flex items-center justify-end gap-2.5 bg-base-200/30">
              <button @click="closeModal" class="btn btn-ghost btn-sm rounded-xl text-xs font-semibold hover:bg-base-200">
                Batal
              </button>
              <button
                @click="submitModal"
                :disabled="!modalMessage.trim() || sendingModal"
                :style="{
                  backgroundColor: modalSubmitStyle.color,
                  color: '#ffffff',
                }"
                class="px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
              >
                <span v-if="sendingModal" class="loading loading-spinner loading-xs text-white"></span>
                <component v-else :is="modalSubmitStyle.icon" class="w-4 h-4 text-white shrink-0" />
                <span class="text-white font-extrabold tracking-wide text-xs" style="color: #ffffff !important;">
                  {{ modalSubmitStyle.label }}
                </span>
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import * as icons from "lucide-vue-next";
import Swal from "sweetalert2";
import { WhatsappService } from "@/services/whatsapp.service";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useAuthStore } from "@/stores/auth";

definePageMeta({ layout: "admin" });

const { slugPath } = useSlugRoute();
const authStore = useAuthStore();
const waService = WhatsappService();

// Device ID dari tenant aktif
const deviceId = computed(() => authStore.tenant_id || "main-session");

// ===== STATE =====
const logs = ref<any[]>([]);
const loading = ref(false);
const logsPage = ref(1);
const logsLimit = ref(20);
const logsTotalItems = ref(0);
const logsTotalPages = ref(1);
const logsTotalIn = ref(0);
const logsTotalOut = ref(0);

// Filters
const filterDirection = ref<"" | "IN" | "OUT">("");
const filterSearch = ref("");
let debounceTimer: any = null;

// Modal state
const showModal = ref(false);
const modalType = ref<"reply" | "resend" | "new_message" | "broadcast">("reply");
const selectedLog = ref<any>(null);
const modalPhone = ref("");
const broadcastRecipients = ref("");
const broadcastDelay = ref(3000);
const modalMessage = ref("");
const sendingModal = ref(false);

// ===== OPTIONS =====
const directionOptions = [
  { value: "", label: "Semua", icon: icons.List },
  { value: "IN", label: "Masuk", icon: icons.ArrowDownLeft },
  { value: "OUT", label: "Keluar", icon: icons.ArrowUpRight },
];

// ===== COMPUTED =====
const statCards = computed(() => [
  { label: "Total Pesan", value: logsTotalItems.value, icon: icons.MessageSquare, bg: "bg-slate-500/10", color: "text-slate-500" },
  { label: "Pesan Masuk", value: logsTotalIn.value, icon: icons.ArrowDownLeft, bg: "bg-blue-500/10", color: "text-blue-500" },
  { label: "Pesan Keluar", value: logsTotalOut.value, icon: icons.ArrowUpRight, bg: "bg-emerald-500/10", color: "text-emerald-500" },
  { label: "Halaman", value: `${logsPage.value}/${logsTotalPages.value}`, icon: icons.Layers, bg: "bg-purple-500/10", color: "text-purple-500" },
]);

const pageNumbers = computed(() => {
  const total = logsTotalPages.value;
  const current = logsPage.value;
  const pages: number[] = [];
  const range = 2;
  for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) {
    pages.push(i);
  }
  return pages;
});

const parsedRecipientCount = computed(() => {
  if (!broadcastRecipients.value.trim()) return 0;
  return broadcastRecipients.value
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0).length;
});

const modalHeaderStyle = computed(() => {
  switch (modalType.value) {
    case "reply":
      return {
        title: "Balas Pesan Masuk",
        subtitle: "Kirimkan balasan cepat ke pengirim pesan ini.",
        icon: icons.Reply,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-600",
      };
    case "resend":
      return {
        title: "Kirim Ulang Pesan",
        subtitle: "Kirim kembali pesan ini ke nomor penerima.",
        icon: icons.RotateCcw,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600",
      };
    case "new_message":
      return {
        title: "Kirim Pesan WhatsApp Baru",
        subtitle: "Kirimkan pesan WhatsApp tunggal ke nomor tujuan mana pun.",
        icon: icons.Send,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600",
      };
    case "broadcast":
      return {
        title: "Broadcast Pesan Massal",
        subtitle: "Kirimkan pesan otomatis ke banyak nomor WhatsApp sekaligus.",
        icon: icons.Radio,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-600",
      };
  }
});

const modalSubmitStyle = computed(() => {
  switch (modalType.value) {
    case "reply":
      return { label: "Kirim Balasan", color: "#2563eb", icon: icons.Send };
    case "resend":
      return { label: "Kirim Ulang", color: "#059669", icon: icons.RotateCcw };
    case "new_message":
      return { label: "Kirim Pesan", color: "#059669", icon: icons.Send };
    case "broadcast":
      return { label: "Mulai Broadcast", color: "#8b5cf6", icon: icons.Radio };
  }
});

// ===== METHODS =====
const fetchLogs = async () => {
  loading.value = true;
  try {
    const res = await waService.getMessageLogs(logsPage.value, logsLimit.value, {
      direction: filterDirection.value as "IN" | "OUT" | undefined || undefined,
      search: filterSearch.value || undefined,
      deviceId: deviceId.value,
    });
    logs.value = res?.items || [];
    logsTotalItems.value = res?.meta?.totalItems || 0;
    logsTotalPages.value = res?.meta?.totalPages || 1;
  } catch (err) {
    console.error("Gagal memuat riwayat log:", err);
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const [inRes, outRes] = await Promise.all([
      waService.getMessageLogs(1, 1, { direction: "IN", deviceId: deviceId.value }),
      waService.getMessageLogs(1, 1, { direction: "OUT", deviceId: deviceId.value }),
    ]);
    logsTotalIn.value = inRes?.meta?.totalItems || 0;
    logsTotalOut.value = outRes?.meta?.totalItems || 0;
  } catch {}
};

const setDirection = (val: "" | "IN" | "OUT") => {
  filterDirection.value = val;
  logsPage.value = 1;
  fetchLogs();
};

const debouncedFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    logsPage.value = 1;
    fetchLogs();
  }, 500);
};

const changePage = (page: number) => {
  if (page < 1 || page > logsTotalPages.value) return;
  logsPage.value = page;
  fetchLogs();
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return "-";
  return phone.startsWith("62") ? `+${phone}` : phone;
};

// Modal helpers
const openReplyModal = (log: any) => {
  selectedLog.value = log;
  modalType.value = "reply";
  modalMessage.value = "";
  showModal.value = true;
};

const openResendModal = (log: any) => {
  selectedLog.value = log;
  modalType.value = "resend";
  modalMessage.value = log.message?.startsWith("[GAGAL")
    ? log.message.replace(/\[GAGAL[^\]]+\] /, "")
    : log.message;
  showModal.value = true;
};

const openNewMessageModal = () => {
  selectedLog.value = null;
  modalType.value = "new_message";
  modalPhone.value = "";
  modalMessage.value = "";
  showModal.value = true;
};

const openBroadcastModal = () => {
  selectedLog.value = null;
  modalType.value = "broadcast";
  broadcastRecipients.value = "";
  broadcastDelay.value = 3000;
  modalMessage.value = "";
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedLog.value = null;
  modalPhone.value = "";
  broadcastRecipients.value = "";
  modalMessage.value = "";
};

const submitModal = async () => {
  if (!modalMessage.value.trim()) return;
  sendingModal.value = true;

  try {
    if (modalType.value === "new_message") {
      if (!modalPhone.value.trim()) {
        throw new Error("Nomor WhatsApp tujuan wajib diisi.");
      }
      await waService.sendMessage(deviceId.value, modalPhone.value.trim(), modalMessage.value.trim());

      Swal.fire({
        icon: "success",
        title: "Pesan Terkirim",
        text: `Pesan berhasil dikirim ke ${formatPhoneNumber(modalPhone.value.trim())}.`,
        confirmButtonColor: "#059669",
        timer: 2500,
        showConfirmButton: false,
      });
    } else if (modalType.value === "broadcast") {
      const recipientsList = broadcastRecipients.value
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      if (recipientsList.length === 0) {
        throw new Error("Minimal masukkan 1 nomor tujuan broadcast.");
      }

      await waService.sendBroadcast(deviceId.value, recipientsList, modalMessage.value.trim(), broadcastDelay.value);

      Swal.fire({
        icon: "success",
        title: "Broadcast Berhasil Dijadwalkan",
        text: `Proses broadcast pesan ke ${recipientsList.length} penerima berjalan di latar belakang.`,
        confirmButtonColor: "#8b5cf6",
        timer: 3000,
        showConfirmButton: false,
      });
    } else {
      // reply atau resend
      if (!selectedLog.value) return;
      await waService.sendMessage(deviceId.value, selectedLog.value.phoneNumber, modalMessage.value.trim());

      Swal.fire({
        icon: "success",
        title: modalType.value === "reply" ? "Balasan Terkirim" : "Pesan Dikirim Ulang",
        text: `Pesan berhasil dikirimkan ke ${formatPhoneNumber(selectedLog.value.phoneNumber)}.`,
        confirmButtonColor: "#10b981",
        timer: 2500,
        showConfirmButton: false,
      });
    }

    closeModal();
    setTimeout(() => {
      fetchLogs();
      fetchStats();
    }, 1000);
  } catch (err: any) {
    console.error("Gagal mengirim pesan WhatsApp:", err);

    const errorMsg =
      err?.data?.message?.message ||
      err?.data?.message ||
      err?.response?._data?.message ||
      err?.message ||
      "Terjadi kesalahan saat memproses pengiriman pesan.";

    const finalMessage = Array.isArray(errorMsg) ? errorMsg.join(", ") : String(errorMsg);

    Swal.fire({
      icon: "error",
      title: "Gagal Mengirim Pesan",
      text: finalMessage,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Tutup",
    });

    setTimeout(() => {
      fetchLogs();
      fetchStats();
    }, 1000);
  } finally {
    sendingModal.value = false;
  }
};

// ===== LIFECYCLE =====
onMounted(() => {
  fetchLogs();
  fetchStats();
});
</script>

<style scoped>
.animate-scale-up {
  animation: scaleUp 0.2s ease-out;
}
@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
