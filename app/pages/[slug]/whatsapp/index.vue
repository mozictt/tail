<template>
  <div class="space-y-6 pb-12">
    <!-- BREADCRUMB & HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-base-content/60 mb-1">
          <NuxtLink :to="slugPath('/dashboard')" class="hover:text-primary transition flex items-center gap-1">
            <icons.Home class="w-3.5 h-3.5" />
            Dashboard
          </NuxtLink>
          <span>/</span>
          <span class="text-base-content/90 font-semibold">Integrasi WhatsApp</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight flex items-center gap-2.5">
          <icons.MessageSquare class="w-7 h-7 text-emerald-500" />
          WhatsApp Gateway
        </h1>
        <p class="text-xs sm:text-sm text-base-content/60 mt-0.5">
          Kelola koneksi perangkat WhatsApp dan integrasikan notifikasi otomatis dari sistem.
        </p>
      </div>

      <!-- Action Button -->
      <div class="flex items-center gap-2">
        <button
          @click="checkStatus"
          :disabled="loading"
          class="btn btn-ghost btn-sm gap-2 border border-base-content/10 hover:bg-base-200"
          title="Segarkan Status"
        >
          <icons.RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          <span>Periksa Status</span>
        </button>
      </div>
    </div>

    <!-- MAIN GRID LAYOUT -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- COLUMN 1: DEVICE CONFIG & STATUS -->
      <div class="lg:col-span-1 space-y-6">
        <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 class="font-bold text-base text-base-content flex items-center gap-2 border-b border-base-content/5 pb-3">
            <icons.Settings class="w-4 h-4 text-emerald-500" />
            Konfigurasi Perangkat
          </h3>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-base-content/75 mb-1.5 uppercase tracking-wider">Device ID Sesi</label>
              <div class="join w-full">
                <div class="input input-bordered w-full rounded-l-xl text-sm join-item font-mono flex items-center gap-2 bg-base-200/60 cursor-not-allowed overflow-hidden">
                  <icons.Lock class="w-3.5 h-3.5 text-base-content/30 shrink-0" />
                  <span class="truncate text-base-content/60 select-none">{{ deviceId }}</span>
                </div>
                <button
                  v-if="!isConnected && !isConnecting"
                  @click="startConnection"
                  :disabled="!deviceId || loading"
                  class="btn btn-emerald text-white rounded-r-xl join-item px-5"
                >
                  <icons.Link class="w-4 h-4" />
                  Konek
                </button>
                <button
                  v-else
                  @click="confirmDisconnect"
                  :disabled="loading"
                  class="btn btn-error text-white rounded-r-xl join-item px-5"
                >
                  <icons.Link2 class="w-4 h-4" />
                  Putuskan
                </button>
              </div>
              <p class="text-[10px] text-base-content/50 mt-1.5">
                Gunakan Device ID yang unik (misal nama tenant atau ID khusus) untuk mengisolasi sesi WhatsApp.
              </p>
            </div>

            <!-- STATUS CARD -->
            <div 
              class="rounded-2xl border border-base-content/10 bg-base-200/30"
              style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;"
            >
              <div class="flex items-center justify-between" style="line-height: 1.5;">
                <span class="text-xs font-semibold text-base-content/60">Status Koneksi:</span>
                <span 
                  class="badge gap-1.5 font-bold text-[11px] px-3 py-2.5 border-none"
                  :class="statusBadgeClass"
                  style="height: auto; padding-top: 0.375rem; padding-bottom: 0.375rem;"
                >
                  <span class="w-2 h-2 rounded-full" :class="statusPulseClass"></span>
                  {{ statusText }}
                </span>
              </div>

              <div class="border-t border-base-content/5" style="padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.625rem;">
                <div class="flex items-center justify-between text-xs" style="line-height: 1.5;">
                  <span class="text-base-content/50">Perangkat Aktif:</span>
                  <span class="font-mono font-bold text-base-content bg-base-300/40 px-2 py-0.5 rounded text-[11px]">{{ isConnected ? deviceId : '-' }}</span>
                </div>
                <div class="flex items-center justify-between text-xs" style="line-height: 1.5;">
                  <span class="text-base-content/50">Tipe Gateway:</span>
                  <span class="font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] border border-emerald-500/20">Baileys Socket</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- INFO CARD INTEGRASI -->
        <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-sm space-y-4">
          <h4 class="font-bold text-sm text-base-content flex items-center gap-2">
            <icons.Terminal class="w-4 h-4 text-emerald-500" />
            Integrasi Sistem API
          </h4>
          <p class="text-xs text-base-content/60 leading-relaxed">
            WhatsApp Gateway ini dapat digunakan oleh modul lain di backend untuk mengirimkan notifikasi instan seperti:
          </p>
          <ul class="space-y-2 text-xs text-base-content/75 pl-1">
            <li class="flex items-start gap-2">
              <icons.CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Notifikasi Pendaftaran Pegawai Baru</span>
            </li>
            <li class="flex items-start gap-2">
              <icons.CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>OTP / Kode Verifikasi Keamanan Akun</span>
            </li>
            <li class="flex items-start gap-2">
              <icons.CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Laporan Ringkasan Profil Perusahaan</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- COLUMN 2: QR CODE OR CONNECTED SCREEN -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- CARD QR CODE PAIRING -->
        <div v-if="isConnecting && !isConnected" class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse"></div>
          
          <h3 class="font-bold text-base text-base-content flex items-center gap-2 border-b border-base-content/5 pb-3">
            <icons.QrCode class="w-4 h-4 text-emerald-500" />
            Tautkan Perangkat Anda
          </h3>

          <div class="flex flex-col md:flex-row items-center gap-8 py-4">
            <!-- QR CODE BOX -->
            <div class="relative w-64 h-64 shrink-0 rounded-2xl bg-base-200 border-2 border-emerald-500/20 flex items-center justify-center p-3 shadow-inner group">
              <img
                v-if="qrText"
                :src="`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrText)}&size=240x240&color=059669`"
                alt="WhatsApp QR Code"
                class="w-full h-full object-contain rounded-lg"
              />
              
              <!-- Loader overlay -->
              <div v-if="loadingQr || !qrText" class="absolute inset-0 bg-base-100/90 flex flex-col items-center justify-center rounded-2xl p-4 text-center">
                <span class="loading loading-ring loading-lg text-emerald-500 mb-2"></span>
                <span class="text-xs font-semibold text-base-content/75">Mengambil QR Code...</span>
              </div>
            </div>

            <!-- INSTRUCTIONS -->
            <div class="space-y-4 flex-1">
              <h4 class="font-bold text-sm text-base-content uppercase tracking-wider">Langkah Pairing:</h4>
              <ol class="space-y-3 text-xs text-base-content/70 pl-4 list-decimal leading-relaxed">
                <li>Buka aplikasi <span class="font-bold text-emerald-600">WhatsApp</span> di ponsel Anda.</li>
                <li>Ketuk <span class="font-bold">Menu / Titik Tiga</span> (Android) atau <span class="font-bold">Pengaturan</span> (iPhone).</li>
                <li>Pilih opsi <span class="font-bold">Perangkat Tertaut</span>.</li>
                <li>Ketuk tombol <span class="font-bold text-primary">Tautkan Perangkat</span>.</li>
                <li>Arahkan kamera ponsel Anda ke kode QR di samping untuk memindai.</li>
              </ol>

              <div class="pt-4 border-t border-base-content/5 flex items-center gap-3">
                <span class="text-[11px] text-base-content/50">Auto-reload QR Code aktif (5s)</span>
                <button 
                  @click="fetchQrCode" 
                  :disabled="loadingQr" 
                  class="btn btn-ghost btn-xs text-emerald-500 hover:bg-emerald-50"
                >
                  <icons.RefreshCw class="w-3 h-3" :class="{ 'animate-spin': loadingQr }" />
                  Force Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD STATUS CONNECTED -->
        <div v-else-if="isConnected" class="bg-base-100 border border-base-content/10 rounded-3xl p-8 shadow-sm text-center space-y-6 relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>

          <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
            <icons.CheckCircle class="w-10 h-10" />
          </div>

          <div class="space-y-2">
            <h3 class="text-xl font-bold text-base-content">WhatsApp Terhubung Sukses!</h3>
            <p class="text-xs text-base-content/60 max-w-md mx-auto">
              Perangkat dengan Device ID <span class="font-bold text-emerald-500 font-mono">{{ deviceId }}</span> telah aktif dan siap digunakan untuk pengiriman notifikasi dari backend.
            </p>
          </div>

          <!-- ACTION CONSOLE TABS -->
          <div class="border-t border-base-content/10 pt-6 text-left max-w-xl mx-auto space-y-4">
            <!-- Tab Headers -->
            <div class="flex border-b border-base-content/10 mb-2">
              <button 
                @click="activeTab = 'single'"
                :class="activeTab === 'single' ? 'border-b-2 border-emerald-500 text-emerald-600 font-bold' : 'text-base-content/60 hover:text-base-content'"
                class="pb-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all focus:outline-none"
              >
                <icons.Send class="w-3.5 h-3.5" />
                Pesan Tunggal
              </button>
              <button 
                @click="activeTab = 'broadcast'"
                :class="activeTab === 'broadcast' ? 'border-b-2 border-emerald-500 text-emerald-600 font-bold' : 'text-base-content/60 hover:text-base-content'"
                class="pb-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all focus:outline-none"
              >
                <icons.Users class="w-3.5 h-3.5" />
                Kirim Broadcast
              </button>
            </div>

            <!-- Tab Content: Single Send -->
            <div v-show="activeTab === 'single'" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-1">
                  <label class="block text-[11px] font-bold text-base-content/60 mb-1">Nomor WhatsApp Tujuan</label>
                  <input
                    v-model="testForm.to"
                    type="text"
                    placeholder="Contoh: 628123456789"
                    class="input input-bordered w-full rounded-xl text-xs focus:border-emerald-500"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-base-content/60 mb-1">Isi Pesan Teks (Opsional jika melampirkan file)</label>
                  <input
                    v-model="testForm.text"
                    type="text"
                    placeholder="Ketik pesan / caption media..."
                    class="input input-bordered w-full rounded-xl text-xs focus:border-emerald-500"
                  />
                </div>
              </div>

              <!-- FILE ATTACHMENT SECTION SINGLE -->
              <div>
                <label class="block text-[11px] font-bold text-base-content/60 mb-1">
                  Lampiran Media (Opsional: Foto, Video, atau Dokumen PDF)
                </label>
                <div class="flex items-center gap-3">
                  <input
                    type="file"
                    ref="singleFileInput"
                    @change="handleSingleFileChange"
                    accept="image/*,video/*,application/pdf"
                    class="file-input file-input-bordered file-input-xs file-input-emerald w-full max-w-xs text-xs rounded-xl"
                  />
                  <button
                    v-if="testForm.file"
                    @click="clearSingleFile"
                    type="button"
                    class="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10"
                  >
                    <icons.X class="w-3.5 h-3.5" />
                    <span>Hapus File</span>
                  </button>
                </div>
                <p v-if="testForm.file" class="text-[10px] text-emerald-600 font-semibold mt-1">
                  File terpilih: {{ testForm.file.name }} ({{ (testForm.file.size / 1024 / 1024).toFixed(2) }} MB)
                </p>
              </div>

              <div class="flex justify-end">
                <button
                  @click="sendTestMessage"
                  :disabled="!testForm.to || (!testForm.text && !testForm.file) || sendingMessage"
                  class="btn btn-emerald text-white text-xs px-6 rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
                >
                  <span v-if="sendingMessage" class="loading loading-spinner loading-xs"></span>
                  <span v-else>Kirim Pesan {{ testForm.file ? 'Media' : '' }}</span>
                </button>
              </div>
            </div>

            <!-- Tab Content: Broadcast -->
            <div v-show="activeTab === 'broadcast'" class="space-y-4">
              <div>
                <label class="block text-[11px] font-bold text-base-content/60 mb-1">
                  Daftar Nomor WhatsApp Penerima (Satu nomor per baris atau pisahkan dengan koma)
                </label>
                <textarea
                  v-model="broadcastForm.recipientsRaw"
                  rows="3"
                  placeholder="628123456789&#10;628987654321"
                  class="textarea textarea-bordered w-full rounded-xl text-xs focus:border-emerald-500 font-mono p-3 leading-normal"
                ></textarea>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-base-content/60 mb-1">Isi Pesan Broadcast (Opsional jika melampirkan file)</label>
                <textarea
                  v-model="broadcastForm.text"
                  rows="3"
                  placeholder="Ketik isi pesan broadcast / caption media..."
                  class="textarea textarea-bordered w-full rounded-xl text-xs focus:border-emerald-500 p-3 leading-normal"
                ></textarea>
              </div>

              <!-- FILE ATTACHMENT SECTION BROADCAST -->
              <div>
                <label class="block text-[11px] font-bold text-base-content/60 mb-1">
                  Lampiran Media Broadcast (Opsional: Foto, Video, atau Dokumen PDF)
                </label>
                <div class="flex items-center gap-3">
                  <input
                    type="file"
                    ref="broadcastFileInput"
                    @change="handleBroadcastFileChange"
                    accept="image/*,video/*,application/pdf"
                    class="file-input file-input-bordered file-input-xs file-input-emerald w-full max-w-xs text-xs rounded-xl"
                  />
                  <button
                    v-if="broadcastForm.file"
                    @click="clearBroadcastFile"
                    type="button"
                    class="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10"
                  >
                    <icons.X class="w-3.5 h-3.5" />
                    <span>Hapus File</span>
                  </button>
                </div>
                <p v-if="broadcastForm.file" class="text-[10px] text-emerald-600 font-semibold mt-1">
                  File terpilih: {{ broadcastForm.file.name }} ({{ (broadcastForm.file.size / 1024 / 1024).toFixed(2) }} MB)
                </p>
              </div>

              <div class="alert bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10 rounded-2xl p-4 text-xs flex items-start gap-2.5 leading-relaxed">
                <icons.ShieldAlert class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span class="font-bold">Proteksi Anti-Banned Aktif:</span>
                  Untuk mensimulasikan aktivitas manusia dan menjaga nomor Anda dari pemblokiran pihak WhatsApp, sistem akan menerapkan jeda waktu acak secara otomatis antara <span class="font-bold">0 s/d 5 menit</span> sebelum mengirim ke penerima berikutnya.
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  @click="sendBroadcastMessage"
                  :disabled="!broadcastForm.recipientsRaw || (!broadcastForm.text && !broadcastForm.file) || sendingBroadcast"
                  class="btn btn-emerald text-white text-xs px-6 rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
                >
                  <span v-if="sendingBroadcast" class="loading loading-spinner loading-xs"></span>
                  <span v-else>Mulai Kirim Broadcast {{ broadcastForm.file ? 'Media' : '' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- INITIAL IDLE SCREEN -->
        <div v-else class="bg-base-100 border border-base-content/10 rounded-3xl p-12 shadow-sm text-center space-y-6">
          <div class="w-20 h-20 bg-base-200 text-base-content/30 rounded-full flex items-center justify-center mx-auto border border-base-content/5">
            <icons.Smartphone class="w-10 h-10" />
          </div>
          <div class="space-y-2">
            <h3 class="text-lg font-bold text-base-content">Belum Ada Sesi WhatsApp Aktif</h3>
            <p class="text-xs text-base-content/50 max-w-sm mx-auto">
              Silakan ketik Device ID di samping lalu ketuk tombol <strong>Konek</strong> untuk memulai pairing perangkat WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD RIWAYAT LOG PESAN (FULL WIDTH) -->
    <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-sm space-y-6 mt-6">
      <div class="flex items-center justify-between border-b border-base-content/5 pb-4">
        <h3 class="font-bold text-base text-base-content flex items-center gap-2">
          <icons.History class="w-5 h-5 text-emerald-500" />
          Riwayat Pesan WhatsApp
        </h3>
        <button 
          @click="fetchLogs" 
          :disabled="logsLoading" 
          class="btn btn-ghost btn-xs gap-1 hover:bg-base-200"
        >
          <icons.RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': logsLoading }" />
          <span>Refresh</span>
        </button>
      </div>

      <!-- TAMPILAN JIKA SEDANG LOADING -->
      <div v-if="logsLoading && logs.length === 0" class="flex flex-col items-center justify-center py-12 text-base-content/50">
        <span class="loading loading-spinner loading-md text-emerald-500 mb-2"></span>
        <span class="text-xs">Memuat riwayat log...</span>
      </div>

      <!-- TAMPILAN JIKA DATA KOSONG -->
      <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-12 text-base-content/40 space-y-2">
        <icons.MessageSquareOff class="w-10 h-10 text-base-content/25" />
        <p class="text-xs font-semibold">Tidak ada riwayat pesan</p>
        <p class="text-[10px]">Pesan masuk atau pesan uji coba yang Anda kirim akan tercatat di sini secara otomatis.</p>
      </div>

      <!-- TABEL DATA LOG -->
      <div v-else class="overflow-x-auto">
        <table class="table table-sm w-full text-xs">
          <thead>
            <tr class="border-b border-base-content/10 bg-base-200/40 text-base-content/80">
              <th class="py-2.5 rounded-l-lg font-bold">WAKTU</th>
              <th class="py-2.5 font-bold">ARAH</th>
              <th class="py-2.5 font-bold">DEVICE</th>
              <th class="py-2.5 font-bold">NOMOR WA</th>
              <th class="py-2.5 font-bold">ISI PESAN</th>
              <th class="py-2.5 rounded-r-lg font-bold">MESSAGE ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" class="border-b border-base-content/5 hover:bg-base-200/20 transition-colors">
              <td class="py-3 font-medium whitespace-nowrap text-base-content/70">
                {{ formatDateTime(log.createdAt) }}
              </td>
              <td class="py-3">
                <span 
                  class="badge text-[10px] font-bold border-none px-2.5 py-1"
                  :class="log.direction === 'OUT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'"
                >
                  {{ log.direction === 'OUT' ? 'KELUAR' : 'MASUK' }}
                </span>
              </td>
              <td class="py-3 font-mono text-[11px] text-base-content/80">
                {{ log.deviceId }}
              </td>
              <td class="py-3 font-semibold text-base-content">
                {{ log.phoneNumber }}
              </td>
              <td class="py-3 text-base-content/80 max-w-xs truncate" :title="log.message">
                {{ log.message }}
              </td>
              <td class="py-3 font-mono text-[10px] text-base-content/45">
                {{ log.messageId || '-' }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PAGINATION LOGS -->
        <div class="flex items-center justify-between border-t border-base-content/5 pt-4 mt-2">
          <span class="text-[11px] text-base-content/50">
            Menampilkan {{ logs.length }} dari {{ logsTotalItems }} log
          </span>
          <div class="flex items-center gap-1">
            <button
              @click="changeLogsPage(logsPage - 1)"
              :disabled="logsPage <= 1 || logsLoading"
              class="btn btn-ghost btn-xs border border-base-content/10 hover:bg-base-200"
            >
              <icons.ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <span class="text-[11px] font-bold px-2 py-1 bg-base-200 rounded text-base-content/80">
              Hal {{ logsPage }} / {{ logsTotalPages }}
            </span>
            <button
              @click="changeLogsPage(logsPage + 1)"
              :disabled="logsPage >= logsTotalPages || logsLoading"
              class="btn btn-ghost btn-xs border border-base-content/10 hover:bg-base-200"
            >
              <icons.ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import * as icons from "lucide-vue-next";
import Swal from "sweetalert2";
import { WhatsappService } from "@/services/whatsapp.service";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useAuthStore } from "@/stores/auth";

definePageMeta({
  layout: "admin",
});

const { slugPath } = useSlugRoute();
const waService = WhatsappService();
const authStore = useAuthStore();

// Gunakan tenant_id (UUID permanen) sebagai Device ID sesi WhatsApp.
// Tenant ID tidak berubah meski slug/nama perusahaan diubah oleh admin.
const route = useRoute();
const deviceId = ref(authStore.tenant_id || route.params.slug as string || "main-session");
const isConnected = ref(false);
const isConnecting = ref(false);
const qrText = ref<string | null>(null);
const loading = ref(false);
const loadingQr = ref(false);
const sendingMessage = ref(false);
const sendingBroadcast = ref(false);
const activeTab = ref("single");

const singleFileInput = ref<HTMLInputElement | null>(null);
const broadcastFileInput = ref<HTMLInputElement | null>(null);

const testForm = reactive({
  to: "",
  text: "Halo! Ini adalah pesan uji coba dari sistem Whatsapp Gateway D'Inzi Corp.",
  file: null as File | null,
});

const broadcastForm = reactive({
  recipientsRaw: "",
  text: "",
  delay: 3,
  file: null as File | null,
});

const handleSingleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    testForm.file = target.files[0];
  }
};

const clearSingleFile = () => {
  testForm.file = null;
  if (singleFileInput.value) singleFileInput.value.value = "";
};

const handleBroadcastFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    broadcastForm.file = target.files[0];
  }
};

const clearBroadcastFile = () => {
  broadcastForm.file = null;
  if (broadcastFileInput.value) broadcastFileInput.value.value = "";
};

// Polling interval reference
let qrInterval: any = null;
let statusInterval: any = null;

// ===== COMPUTED STATE =====
const statusText = computed(() => {
  if (isConnected.value) return "Terhubung";
  if (isConnecting.value) return "Menghubungkan";
  return "Terputus";
});

const statusBadgeClass = computed(() => {
  if (isConnected.value) return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
  if (isConnecting.value) return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
  return "bg-slate-500/10 text-slate-600 border border-slate-500/20";
});

const statusPulseClass = computed(() => {
  if (isConnected.value) return "bg-emerald-500 animate-pulse";
  if (isConnecting.value) return "bg-amber-500 animate-ping";
  return "bg-slate-400";
});

// ===== METHODS =====
const checkStatus = async () => {
  loading.value = true;
  try {
    const res = await waService.getDevices();
    const activeDevices = res?.devices || [];
    if (activeDevices.includes(deviceId.value)) {
      isConnected.value = true;
      isConnecting.value = false;
      stopQrPolling();
    } else {
      isConnected.value = false;
    }
  } catch (err) {
    console.error("Gagal memeriksa status WhatsApp:", err);
  } finally {
    loading.value = false;
  }
};

const startConnection = async () => {
  if (!deviceId.value) return;
  loading.value = true;
  isConnecting.value = true;
  qrText.value = null;

  try {
    await waService.initSession(deviceId.value);
    
    // Tunggu sebentar dan ambil QR Code
    setTimeout(async () => {
      await fetchQrCode();
      startQrPolling();
    }, 1500);

    // Jalankan pengecekan status secara berkala untuk mendeteksi kapan user berhasil scan QR
    startStatusPolling();

  } catch (err: any) {
    isConnecting.value = false;
    Swal.fire({
      icon: "error",
      title: "Koneksi Gagal",
      text: err?.data?.message || "Gagal menginisialisasi sesi WhatsApp.",
    });
  } finally {
    loading.value = false;
  }
};

const fetchQrCode = async () => {
  if (!isConnecting.value || isConnected.value) return;
  loadingQr.value = true;
  try {
    const res = await waService.getQrCode(deviceId.value);
    qrText.value = res.qr;
  } catch (err: any) {
    // Jika error, biasanya karena QR Code belum di-generate baileys atau sudah terhubung
    qrText.value = null;
    
    // Cek status sekali lagi, barangkali sudah terhubung
    const statusRes = await waService.getDevices();
    const activeDevices = statusRes?.devices || [];
    if (activeDevices.includes(deviceId.value)) {
      isConnected.value = true;
      isConnecting.value = false;
      stopQrPolling();
      stopStatusPolling();
      Swal.fire({
        icon: "success",
        title: "Terkoneksi",
        text: "WhatsApp berhasil ditautkan secara sukses!",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  } finally {
    loadingQr.value = false;
  }
};

const sendTestMessage = async () => {
  if (!testForm.to || (!testForm.text && !testForm.file)) return;
  sendingMessage.value = true;
  try {
    await waService.sendMessage(deviceId.value, testForm.to, testForm.text, testForm.file);
    Swal.fire({
      icon: "success",
      title: "Pesan Terkirim",
      text: `Pesan ${testForm.file ? 'media' : 'teks'} berhasil dikirimkan ke ${testForm.to} melalui device ${deviceId.value}.`,
      confirmButtonColor: "#10b981",
    });
    testForm.to = "";
    clearSingleFile();
    fetchLogs(); // Refresh log pesan secara instan setelah kirim sukses
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Gagal Kirim",
      text: err?.data?.message || "Gagal mengirimkan pesan WhatsApp.",
    });
  } finally {
    sendingMessage.value = false;
  }
};

const sendBroadcastMessage = async () => {
  if (!broadcastForm.recipientsRaw || (!broadcastForm.text && !broadcastForm.file)) return;

  const recipients = broadcastForm.recipientsRaw
    .split(/[\n,;]/)
    .map((num) => num.trim())
    .filter((num) => num.length > 0);

  if (recipients.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Nomor Kosong",
      text: "Silakan masukkan minimal satu nomor penerima yang valid.",
    });
    return;
  }

  sendingBroadcast.value = true;
  try {
    const res = await waService.sendBroadcast(
      deviceId.value,
      recipients,
      broadcastForm.text,
      broadcastForm.file
    );

    Swal.fire({
      icon: "success",
      title: "Broadcast Dimulai",
      text: res.message || "Proses pengiriman broadcast sedang berjalan di latar belakang.",
      confirmButtonColor: "#10b981",
    });

    broadcastForm.recipientsRaw = "";
    broadcastForm.text = "";
    clearBroadcastFile();

    setTimeout(fetchLogs, 2000);
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Gagal Broadcast",
      text: err?.data?.message || "Terjadi kesalahan saat memulai broadcast.",
    });
  } finally {
    sendingBroadcast.value = false;
  }
};

const confirmDisconnect = () => {
  Swal.fire({
    title: "Putuskan WhatsApp?",
    text: "Anda akan keluar (logout) dari sesi WhatsApp dan harus memindai ulang QR Code untuk terhubung kembali.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Putuskan",
    cancelButtonText: "Batal",
  }).then(async (result) => {
    if (result.isConfirmed) {
      disconnectSession();
    }
  });
};

const disconnectSession = async () => {
  loading.value = true;
  try {
    await waService.logoutSession(deviceId.value);
    isConnected.value = false;
    isConnecting.value = false;
    qrText.value = null;
    stopQrPolling();
    stopStatusPolling();
    Swal.fire({
      icon: "success",
      title: "Terputus",
      text: "Sesi WhatsApp berhasil diputuskan secara permanen.",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Gagal Memutuskan Sesi",
      text: err?.data?.message || "Terjadi kesalahan saat mematikan sesi WhatsApp.",
    });
  } finally {
    loading.value = false;
  }
};

// ===== POLLING HELPERS =====
const startQrPolling = () => {
  stopQrPolling();
  qrInterval = setInterval(fetchQrCode, 5000); // Polling QR Code setiap 5 detik
};

const stopQrPolling = () => {
  if (qrInterval) {
    clearInterval(qrInterval);
    qrInterval = null;
  }
};

const startStatusPolling = () => {
  stopStatusPolling();
  statusInterval = setInterval(async () => {
    try {
      const res = await waService.getDevices();
      const activeDevices = res?.devices || [];
      if (activeDevices.includes(deviceId.value)) {
        isConnected.value = true;
        isConnecting.value = false;
        stopQrPolling();
        stopStatusPolling();
        Swal.fire({
          icon: "success",
          title: "Terkoneksi",
          text: "WhatsApp berhasil ditautkan secara sukses!",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, 3000); // Cek status koneksi setiap 3 detik
};

const stopStatusPolling = () => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
};

// ===== STATE LOGS =====
const logs = ref<any[]>([]);
const logsLoading = ref(false);
const logsPage = ref(1);
const logsLimit = ref(10);
const logsTotalItems = ref(0);
const logsTotalPages = ref(1);

// ===== METHODS LOGS =====
const fetchLogs = async () => {
  logsLoading.value = true;
  try {
    const res = await waService.getMessageLogs(logsPage.value, logsLimit.value);
    logs.value = res?.items || [];
    logsTotalItems.value = res?.meta?.totalItems || 0;
    logsTotalPages.value = res?.meta?.totalPages || 1;
  } catch (err) {
    console.error("Gagal memuat log pesan WhatsApp:", err);
  } finally {
    logsLoading.value = false;
  }
};

const changeLogsPage = (page: number) => {
  if (page < 1 || page > logsTotalPages.value) return;
  logsPage.value = page;
  fetchLogs();
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ===== LIFECYCLE =====
onMounted(() => {
  checkStatus();
  fetchLogs();
});

onUnmounted(() => {
  stopQrPolling();
  stopStatusPolling();
});
</script>

<style scoped>
.btn-emerald {
  background-color: #10b981;
  border-color: #10b981;
  color: #fff;
}
.btn-emerald:hover {
  background-color: #059669;
  border-color: #059669;
}
.btn-emerald:disabled {
  background-color: #10b981/40;
  border-color: #10b981/10;
  color: rgba(255, 255, 255, 0.5);
}
</style>
