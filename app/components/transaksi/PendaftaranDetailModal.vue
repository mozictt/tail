<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ArrowRight,
  ArrowRightLeft,
  BedDouble,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  History,
  Printer,
  RotateCcw,
  Stethoscope,
  Ticket,
  UserRound,
  X,
  XCircle,
} from "lucide-vue-next";
import { PendaftaranService } from "@/services/pendaftaran.service";
import { useAuthStore } from "@/stores/auth";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import { getVisitPenjaminList } from "@/utils/pendaftaran-penjamin.util";
import {
  printNomorAntreanVisit,
  printSlipPendaftaranVisit,
} from "@/utils/pendaftaran-print.util";
import { resolvePrintClinicHeader } from "@/utils/print-document.util";
import {
  CARA_KELUAR_PASIEN_OPTIONS,
  CARA_MASUK_PASIEN_OPTIONS,
  formatDurasiMenitLabel,
  formatNamaGelarDokter,
  getJenisLayananBadgeClass,
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  getStatusKunjunganBadgeClass,
  getStatusPenempatanBadgeClass,
  isActiveKunjunganStatus,
  isInpatientLayanan,
  JENIS_KELAMIN_OPTIONS,
  JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
  JENIS_PENJAMIN_OPTIONS,
  JENIS_PERPINDAHAN_UNIT_OPTIONS,
  STATUS_KUNJUNGAN_OPTIONS,
  type PendaftaranDokterSummary,
  type PendaftaranItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    pendaftaranId?: number | null;
    canManage?: boolean;
  }>(),
  {
    pendaftaranId: null,
    canManage: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "edit-penjamin", item: PendaftaranItem): void;
  (e: "mutasi", item: PendaftaranItem): void;
  (e: "selesai", item: PendaftaranItem): void;
  (e: "batal", item: PendaftaranItem): void;
  (e: "batal-ranap", item: PendaftaranItem): void;
}>();

const pendaftaranService = PendaftaranService();
const authStore = useAuthStore();
const companyProfileStore = useCompanyProfileStore();
const { formatDate, formatDateTime } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<PendaftaranItem | null>(null);

const penjaminEntries = computed(() => getVisitPenjaminList(detail.value));

const hasQueueNumber = computed(() =>
  Boolean(
    detail.value?.kodeAntreanSaatIni ||
      (detail.value?.noAntreanSaatIni !== undefined &&
        detail.value?.noAntreanSaatIni !== null),
  ),
);

const handlePrintAntrean = () => {
  if (!detail.value || !hasQueueNumber.value) return;
  const header = resolvePrintClinicHeader(
    companyProfileStore.profile,
    authStore.username,
  );
  if (!printNomorAntreanVisit(detail.value, header)) {
    showToast("Gagal membuka dialog cetak. Periksa izin pop-up browser.", "error");
  }
};

const handlePrintSlip = () => {
  if (!detail.value) return;
  const header = resolvePrintClinicHeader(
    companyProfileStore.profile,
    authStore.username,
  );
  if (!printSlipPendaftaranVisit(detail.value, header)) {
    showToast("Gagal membuka dialog cetak. Periksa izin pop-up browser.", "error");
  }
};

const canAct = computed(() =>
  Boolean(props.canManage && detail.value && isActiveKunjunganStatus(detail.value.statusKunjungan)),
);

const canCancelRanap = computed(() =>
  Boolean(canAct.value && detail.value && isInpatientLayanan(detail.value.jenisLayananSaatIni)),
);

const formatDokter = (d?: PendaftaranDokterSummary | null): string => {
  if (!d) return "-";
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
};

watch(
  () => [props.show, props.pendaftaranId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }
    loading.value = true;
    try {
      detail.value = await pendaftaranService.getPendaftaranById(id);
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, "Gagal memuat detail pendaftaran"), "error");
      emit("close");
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="emit('close')"
    >
      <div class="modal-box max-w-4xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3 pr-8 mb-5">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardList class="w-5 h-5" />
          </div>
          <span>Detail Kunjungan & Riwayat Unit</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-6 animate-pulse">
          <div class="h-20 bg-base-200 rounded-2xl"></div>
          <div class="h-36 bg-base-200 rounded-2xl"></div>
          <div class="h-44 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <!-- Header Status Kunjungan -->
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-base-100 border border-base-content/10 text-primary">
                  {{ detail.noRegistrasi }}
                </span>
                <span
                  v-if="detail.kodeAntreanSaatIni"
                  class="inline-flex items-center gap-1 font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-warning/20 text-base-content border border-warning/50"
                >
                  <Ticket class="w-3.5 h-3.5 text-warning shrink-0" />
                  <span>Antrean: {{ detail.kodeAntreanSaatIni }}</span>
                </span>
                <span
                  class="text-[11px] font-bold px-2.5 py-0.5 rounded-md border"
                  :class="getJenisLayananBadgeClass(detail.jenisLayananSaatIni)"
                >
                  {{ getOptionLabel(JENIS_LAYANAN_PENDAFTARAN_OPTIONS, detail.jenisLayananSaatIni) }}
                </span>
              </div>
              <p class="text-xs text-base-content/65">
                Tgl Kunjungan: <strong class="text-base-content">{{ formatDate(detail.tanggalKunjungan) }}</strong>
                • Waktu Daftar: {{ formatDateTime(detail.waktuDaftar) }}
              </p>
            </div>

            <span
              class="text-xs font-bold px-3 py-1 rounded-lg border w-fit shrink-0"
              :class="getStatusKunjunganBadgeClass(detail.statusKunjungan)"
            >
              {{ getOptionLabel(STATUS_KUNJUNGAN_OPTIONS, detail.statusKunjungan) }}
            </span>
          </div>

          <!-- Grid Pasien & Penjamin -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs space-y-2">
              <div class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <UserRound class="w-3.5 h-3.5" />
                Identitas Pasien
              </div>
              <div>
                <div class="font-extrabold text-sm text-base-content">
                  {{ detail.pasien?.penduduk?.namaLengkap || "-" }}
                </div>
                <div class="font-mono text-base-content/65 mt-0.5">
                  No. RM: <strong>{{ detail.pasien?.noRm || "-" }}</strong>
                  <template v-if="detail.pasien?.penduduk?.nik">
                    • NIK: {{ detail.pasien.penduduk.nik }}
                  </template>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span class="text-base-content/50 block">Jenis Kelamin</span>
                  <span class="font-semibold">
                    {{ getOptionLabel(JENIS_KELAMIN_OPTIONS, detail.pasien?.penduduk?.jenisKelamin) }}
                  </span>
                </div>
                <div>
                  <span class="text-base-content/50 block">No. Telepon</span>
                  <span class="font-semibold">{{ detail.pasien?.penduduk?.noTelepon || "-" }}</span>
                </div>
              </div>
            </div>

            <div class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs space-y-2.5">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <CreditCard class="w-3.5 h-3.5" />
                  Cara Bayar & Penjamin
                </div>
                <span
                  v-if="penjaminEntries.length > 1"
                  class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25"
                >
                  Multi-Penjamin / COB ({{ penjaminEntries.length }})
                </span>
              </div>

              <div class="space-y-2">
                <div
                  v-for="pj in penjaminEntries"
                  :key="`${pj.id}-${pj.urutan}`"
                  class="rounded-xl p-2.5 border space-y-1.5"
                  :class="
                    pj.isUtama && penjaminEntries.length > 1
                      ? 'bg-base-100 border-primary/30'
                      : 'bg-base-100 border-base-content/10'
                  "
                >
                  <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        v-if="penjaminEntries.length > 1"
                        class="text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                        :class="
                          pj.isUtama
                            ? 'bg-primary text-primary-content'
                            : 'bg-base-200 text-base-content/80'
                        "
                      >
                        #{{ pj.urutan }} {{ pj.isUtama ? "Utama" : "COB" }}
                      </span>
                      <span
                        class="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                        :class="getJenisPenjaminBadgeClass(pj.jenisPenjamin)"
                      >
                        {{ getOptionLabel(JENIS_PENJAMIN_OPTIONS, pj.jenisPenjamin) }}
                      </span>
                      <span class="font-bold text-xs text-base-content">
                        {{ pj.namaPenjaminSnapshot }}
                      </span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
                    <div>
                      <span class="text-base-content/50 block">No. Kartu / Polis</span>
                      <span class="font-mono font-semibold">{{ pj.noKartuSnapshot || "-" }}</span>
                    </div>
                    <div>
                      <span class="text-base-content/50 block">Kelas Hak Rawat</span>
                      <span class="font-semibold">{{ pj.kelasHakSnapshot?.nama || "-" }}</span>
                    </div>
                    <div>
                      <span class="text-base-content/50 block">No. SEP</span>
                      <span class="font-mono font-semibold">{{ pj.noSep || "-" }}</span>
                    </div>
                    <div>
                      <span class="text-base-content/50 block">No. Rujukan</span>
                      <span class="font-mono font-semibold">{{ pj.noRujukan || "-" }}</span>
                    </div>
                    <div v-if="pj.keterangan" class="col-span-2">
                      <span class="text-base-content/50 block">Keterangan COB</span>
                      <span class="font-medium text-base-content/80">{{ pj.keterangan }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Penempatan Saat Ini & Anamnesa Loket -->
          <div class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs space-y-3">
            <div class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Stethoscope class="w-3.5 h-3.5" />
              Penempatan Saat Ini & Informasi Masuk
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <span class="text-base-content/50 block">Unit / Poliklinik</span>
                <span class="font-bold">{{ detail.unitSaatIni ? `${detail.unitSaatIni.kode} — ${detail.unitSaatIni.nama}` : "-" }}</span>
              </div>
              <div>
                <span class="text-base-content/50 block">Dokter / DPJP</span>
                <span class="font-bold">{{ formatDokter(detail.dokterSaatIni) }}</span>
              </div>
              <div>
                <span class="text-base-content/50 block">Jadwal Praktik</span>
                <span v-if="detail.jadwalDokterSaatIni" class="font-semibold">
                  {{ detail.jadwalDokterSaatIni.hari }} ({{ detail.jadwalDokterSaatIni.jamMulai }} - {{ detail.jadwalDokterSaatIni.jamSelesai }})
                </span>
                <span v-else class="text-base-content/50">-</span>
              </div>
              <div>
                <span class="text-base-content/50 block">Bed / Kelas Saat Ini</span>
                <span v-if="detail.bedSaatIni" class="font-bold inline-flex items-center gap-1">
                  <BedDouble class="w-3.5 h-3.5 text-primary" />
                  {{ detail.bedSaatIni.kode }} — {{ detail.bedSaatIni.nama }}
                  <template v-if="detail.kelasSaatIni"> ({{ detail.kelasSaatIni.nama }})</template>
                </span>
                <span v-else class="text-base-content/50">-</span>
              </div>
              <div>
                <span class="text-base-content/50 block">Cara Masuk</span>
                <span class="font-semibold">{{ getOptionLabel(CARA_MASUK_PASIEN_OPTIONS, detail.caraMasuk) }}</span>
              </div>
              <div>
                <span class="text-base-content/50 block">Asal Rujukan</span>
                <span class="font-semibold">{{ detail.asalRujukan || "-" }}</span>
              </div>
              <div class="sm:col-span-2">
                <span class="text-base-content/50 block">Keluhan Utama</span>
                <span class="font-semibold whitespace-pre-line">{{ detail.keluhanUtama || "-" }}</span>
              </div>
              <div v-if="detail.catatan" class="sm:col-span-2 lg:col-span-4">
                <span class="text-base-content/50 block">Catatan Petugas</span>
                <span class="font-semibold whitespace-pre-line">{{ detail.catatan }}</span>
              </div>
              <div v-if="detail.waktuKeluar || detail.alasanBatal" class="sm:col-span-2 lg:col-span-4 pt-2 border-t border-base-content/10">
                <span class="text-base-content/50 block">Informasi Keluar / Pembatalan</span>
                <span class="font-semibold">
                  <template v-if="detail.waktuKeluar">{{ formatDateTime(detail.waktuKeluar) }}</template>
                  <template v-if="detail.caraKeluar">
                    • {{ getOptionLabel(CARA_KELUAR_PASIEN_OPTIONS, detail.caraKeluar) }}
                  </template>
                  <template v-if="detail.alasanBatal">
                    • Alasan: <span class="text-error">{{ detail.alasanBatal }}</span>
                  </template>
                </span>
              </div>
            </div>
          </div>

          <!-- Timeline Perpindahan Unit (/history-unit) -->
          <div class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs space-y-3">
            <div class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <History class="w-3.5 h-3.5" />
              Riwayat Penempatan & Mutasi Unit ({{ detail.historyUnit?.length || 0 }})
            </div>

            <div v-if="!detail.historyUnit || detail.historyUnit.length === 0" class="text-base-content/55 italic">
              Belum ada riwayat penempatan unit.
            </div>

            <div v-else class="space-y-2.5">
              <div
                v-for="hist in detail.historyUnit"
                :key="hist.id"
                class="p-3 rounded-xl bg-base-100 border border-base-content/10 space-y-1.5"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono font-bold text-base-content/50">#{{ hist.urutan }}</span>
                    <span class="font-extrabold text-base-content">
                      {{ getOptionLabel(JENIS_PERPINDAHAN_UNIT_OPTIONS, hist.jenisPerpindahan) }}
                    </span>
                    <span
                      v-if="hist.kodeAntrean"
                      class="inline-flex items-center gap-1 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-warning/20 text-base-content border border-warning/50"
                    >
                      <Ticket class="w-3 h-3 text-warning shrink-0" />
                      <span>{{ hist.kodeAntrean }}</span>
                    </span>
                  </div>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                    :class="getStatusPenempatanBadgeClass(hist.statusPenempatan)"
                  >
                    {{ hist.statusPenempatan }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 text-base-content">
                  <template v-if="hist.unitAsal">
                    <span class="font-semibold text-base-content/70">
                      {{ hist.unitAsal.nama }}
                      <template v-if="hist.bedAsal">({{ hist.bedAsal.kode }})</template>
                    </span>
                    <ArrowRight class="w-3.5 h-3.5 text-base-content/40" />
                  </template>
                  <span class="font-bold text-primary">
                    {{ hist.unitTujuan?.nama || "-" }}
                    <template v-if="hist.bedTujuan"> • Bed {{ hist.bedTujuan.kode }}</template>
                    <template v-if="hist.kelasTujuan"> ({{ hist.kelasTujuan.nama }})</template>
                  </span>
                  <span class="text-base-content/65">
                    • DPJP: {{ formatDokter(hist.dokterTujuan) }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-base-content/60">
                  <span class="inline-flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    Masuk: {{ formatDateTime(hist.waktuMasuk) }}
                    <template v-if="hist.waktuKeluar">
                      • Keluar: {{ formatDateTime(hist.waktuKeluar) }}
                    </template>
                    <template v-if="hist.durasiMenit !== undefined">
                      • Durasi: {{ formatDurasiMenitLabel(hist.durasiMenit) }}
                    </template>
                  </span>
                  <span v-if="hist.alasan" class="italic">{{ hist.alasan }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-none modal-action gap-2 pt-4 mt-2 border-t border-base-content/10 flex-wrap justify-between">
          <div v-if="detail" class="flex flex-wrap items-center gap-2">
            <button
              v-if="hasQueueNumber"
              type="button"
              class="btn btn-outline btn-warning btn-sm rounded-xl gap-1.5"
              @click="handlePrintAntrean"
            >
              <Ticket class="w-3.5 h-3.5" />
              Cetak Antrian
            </button>
            <button
              type="button"
              class="btn btn-outline btn-sm rounded-xl gap-1.5"
              @click="handlePrintSlip"
            >
              <Printer class="w-3.5 h-3.5" />
              Cetak Slip
            </button>
            <template v-if="canAct">
              <button
                type="button"
                class="btn btn-outline btn-secondary btn-sm rounded-xl gap-1.5"
                @click="emit('edit-penjamin', detail)"
              >
                <CreditCard class="w-3.5 h-3.5" />
                Ubah Penjamin
              </button>
              <button
                type="button"
                class="btn btn-outline btn-primary btn-sm rounded-xl gap-1.5"
                @click="emit('mutasi', detail)"
              >
                <ArrowRightLeft class="w-3.5 h-3.5" />
                Mutasi
              </button>
              <button
                v-if="canCancelRanap"
                type="button"
                class="btn btn-outline btn-warning btn-sm rounded-xl gap-1.5"
                @click="emit('batal-ranap', detail)"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                Batal Ranap
              </button>
              <button
                type="button"
                class="btn btn-outline btn-success btn-sm rounded-xl gap-1.5"
                @click="emit('selesai', detail)"
              >
                <CheckCircle2 class="w-3.5 h-3.5" />
                Selesai
              </button>
              <button
                type="button"
                class="btn btn-outline btn-error btn-sm rounded-xl gap-1.5"
                @click="emit('batal', detail)"
              >
                <XCircle class="w-3.5 h-3.5" />
                Batalkan
              </button>
            </template>
          </div>
          <button type="button" class="btn btn-primary btn-sm rounded-xl px-5 ml-auto" @click="emit('close')">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

