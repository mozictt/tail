<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Building,
  CalendarClock,
  CheckCircle2,
  Clock,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
  XCircle,
} from "lucide-vue-next";
import { JadwalDokterService } from "@/services/jadwal-dokter.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatDurasiMenitLabel,
  formatNamaGelarDokter,
  getHariPraktikBadgeClass,
  getJenisUnitBadgeClass,
  getOptionLabel,
  getSesiPraktikBadgeClass,
  HARI_PRAKTIK_OPTIONS,
  hitungDurasiSesiMenit,
  JENIS_UNIT_OPTIONS,
  SESI_PRAKTIK_OPTIONS,
  type JadwalDokterItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    jadwalId?: number | null;
    canManage?: boolean;
  }>(),
  {
    jadwalId: null,
    canManage: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "edit", item: JadwalDokterItem): void;
  (e: "change-status", item: JadwalDokterItem): void;
}>();

const jadwalService = JadwalDokterService();
const { formatDateTime } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<JadwalDokterItem | null>(null);

const namaDokterTampil = computed(() => {
  const d = detail.value?.dokter;
  if (!d) return "-";
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
});

const durasiSesi = computed(() =>
  detail.value
    ? hitungDurasiSesiMenit(detail.value.jamMulai, detail.value.jamSelesai)
    : null,
);

watch(
  () => [props.show, props.jadwalId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }

    loading.value = true;
    try {
      detail.value = await jadwalService.getJadwalDokterById(id);
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, "Gagal memuat detail jadwal dokter"), "error");
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
      <div class="modal-box max-w-2xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
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
            <CalendarClock class="w-5 h-5" />
          </div>
          <span>Detail Jadwal Praktik Dokter</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-4 animate-pulse">
          <div class="h-20 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
          <div class="h-24 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <!-- Header Summary -->
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="text-[11px] font-bold px-2.5 py-0.5 rounded-md border"
                  :class="getHariPraktikBadgeClass(detail.hari)"
                >
                  {{ detail.hariLabel || getOptionLabel(HARI_PRAKTIK_OPTIONS, detail.hari) }}
                </span>
                <span
                  v-if="detail.sesi"
                  class="text-[11px] font-bold px-2 py-0.5 rounded-md border"
                  :class="getSesiPraktikBadgeClass(detail.sesi)"
                >
                  Sesi {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, detail.sesi) }}
                </span>
                <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-base-100 border border-base-content/10 flex items-center gap-1">
                  <Clock class="w-3 h-3 text-primary" />
                  {{ detail.jamMulai }} - {{ detail.jamSelesai }}
                </span>
              </div>
              <h4 class="font-extrabold text-base text-base-content mt-2 truncate">
                {{ namaDokterTampil }}
              </h4>
              <p class="text-xs text-base-content/65 mt-0.5">
                {{ detail.unit?.nama || "-" }}
                <template v-if="detail.ruangan"> • {{ detail.ruangan }}</template>
              </p>
            </div>

            <span
              class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border w-fit shrink-0"
              :class="
                detail.status === 'Y'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
              "
            >
              <CheckCircle2 v-if="detail.status === 'Y'" class="w-3.5 h-3.5" />
              <XCircle v-else class="w-3.5 h-3.5" />
              {{ detail.status === "Y" ? "Aktif" : "Nonaktif" }}
            </span>
          </div>

          <!-- Profil Dokter & Unit -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="space-y-1.5">
              <div class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Stethoscope class="w-3.5 h-3.5" />
                Informasi Dokter
              </div>
              <div>
                <span class="text-base-content/50 block">Nama & Kode</span>
                <span class="font-bold">{{ namaDokterTampil }}</span>
                <span v-if="detail.dokter?.kodeDokter" class="font-mono text-base-content/60 block">
                  Kode: {{ detail.dokter.kodeDokter }}
                </span>
              </div>
              <div>
                <span class="text-base-content/50 block">Spesialisasi</span>
                <span class="font-semibold">{{ detail.dokter?.spesialisasi || "-" }}</span>
              </div>
            </div>

            <div class="space-y-1.5">
              <div class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Building class="w-3.5 h-3.5" />
                Unit / Poliklinik
              </div>
              <div>
                <span class="text-base-content/50 block">Nama Unit</span>
                <span class="font-bold">
                  {{ detail.unit ? `${detail.unit.kode} — ${detail.unit.nama}` : "-" }}
                </span>
              </div>
              <div v-if="detail.unit?.jenisUnit" class="pt-0.5">
                <span
                  class="text-[11px] font-bold px-2 py-0.5 rounded-md border inline-block"
                  :class="getJenisUnitBadgeClass(detail.unit.jenisUnit)"
                >
                  {{ getOptionLabel(JENIS_UNIT_OPTIONS, detail.unit.jenisUnit) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Kuota & Layanan -->
          <div class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs space-y-3">
            <div class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Users class="w-3.5 h-3.5" />
              Kapasitas Kuota & Durasi Layanan
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div class="p-2.5 rounded-xl bg-base-100 border border-base-content/10">
                <span class="text-[11px] text-base-content/55 block">Kuota JKN</span>
                <span class="text-base font-extrabold font-mono text-emerald-600">{{ detail.kuotaJkn }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-base-100 border border-base-content/10">
                <span class="text-[11px] text-base-content/55 block">Kuota Non-JKN</span>
                <span class="text-base font-extrabold font-mono text-sky-600">{{ detail.kuotaNonJkn }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-base-100 border border-base-content/10">
                <span class="text-[11px] text-base-content/55 block">Kuota Total</span>
                <span class="text-base font-extrabold font-mono text-primary">{{ detail.kuotaTotal }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-base-100 border border-base-content/10">
                <span class="text-[11px] text-base-content/55 block">Durasi / Pasien</span>
                <span class="text-sm font-extrabold font-mono text-base-content">
                  {{ detail.durasiPerPasien ? `${detail.durasiPerPasien} mnt` : "-" }}
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-base-content/70">
              <span>Durasi Sesi: <strong class="text-base-content">{{ formatDurasiMenitLabel(durasiSesi) }}</strong></span>
              <span v-if="detail.estimasiSlot !== null && detail.estimasiSlot !== undefined">
                Estimasi Slot Waktu: <strong class="text-base-content">{{ detail.estimasiSlot }} slot</strong>
              </span>
              <span v-if="detail.kodeHariBpjs">
                Kode Hari BPJS HFIS: <strong class="font-mono text-base-content">{{ detail.kodeHariBpjs }}</strong>
              </span>
            </div>
          </div>

          <!-- Integrasi & Keterangan -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <ShieldCheck class="w-3.5 h-3.5" />
              Integrasi & Keterangan
            </div>
            <div>
              <span class="text-base-content/50 block">Kode Jadwal BPJS</span>
              <span class="font-mono font-semibold">{{ detail.kodeJadwalBpjs || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">IHS Schedule ID (SATUSEHAT)</span>
              <span class="font-mono font-semibold break-all">{{ detail.ihsScheduleId || "-" }}</span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Keterangan</span>
              <span class="font-semibold whitespace-pre-line">{{ detail.keterangan || "-" }}</span>
            </div>
          </div>

          <div class="text-[11px] text-base-content/50 px-1">
            Terakhir diperbarui: {{ formatDateTime(detail.updatedAt || detail.createdAt) }}
          </div>
        </div>

        <div class="flex-none modal-action gap-2 pt-4 mt-2 border-t border-base-content/10 flex-wrap">
          <button
            v-if="detail && canManage"
            type="button"
            class="btn btn-outline btn-sm rounded-xl gap-1.5"
            @click="emit('change-status', detail)"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Ubah Status</span>
          </button>
          <button
            v-if="detail && canManage"
            type="button"
            class="btn btn-outline btn-primary btn-sm rounded-xl gap-1.5"
            @click="emit('edit', detail)"
          >
            <Pencil class="w-3.5 h-3.5" />
            <span>Edit Jadwal</span>
          </button>
          <button type="button" class="btn btn-primary btn-sm rounded-xl px-5" @click="emit('close')">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

