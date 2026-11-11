<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Stethoscope,
  Users,
  X,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import { PendaftaranService } from "@/services/pendaftaran.service";
import { DokterService } from "@/services/dokter.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatNamaGelarDokter,
  getOptionLabel,
  getSesiPraktikBadgeClass,
  isInpatientLayanan,
  JENIS_DOKTER_OPTIONS,
  JenisDokter,
  JenisLayananPendaftaran,
  JenisPenjamin,
  REGISTRABLE_UNIT_JENIS_TO_LAYANAN,
  SESI_PRAKTIK_OPTIONS,
  SesiPraktik,
  type DokterItem,
  type JadwalDokterTersediaItem,
  type UnitOptionItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    unit?: UnitOptionItem | null;
    tanggal?: string;
    jenisPenjamin?: JenisPenjamin | string;
    selectedDokterId?: number | null;
    selectedJadwalId?: number | null;
  }>(),
  {
    unit: null,
    tanggal: "",
    jenisPenjamin: JenisPenjamin.UMUM,
    selectedDokterId: null,
    selectedJadwalId: null,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select-jadwal", jadwal: JadwalDokterTersediaItem): void;
  (e: "select-dokter", dokter: DokterItem): void;
}>();

const pendaftaranService = PendaftaranService();
const dokterService = DokterService();
const { formatDate } = useDate();
const { showToast } = useToast();

const activeTab = ref<"jadwal" | "dokter">("jadwal");
const searchQuery = ref("");
const sesiFilter = ref<SesiPraktik | "">("");
const jenisDokterFilter = ref<JenisDokter | "">("");
const filterByUnitDokter = ref(true);

const jadwalList = ref<JadwalDokterTersediaItem[]>([]);
const jadwalLoading = ref(false);

const dokterList = ref<DokterItem[]>([]);
const dokterLoading = ref(false);
const dokterPage = ref(1);
const dokterLimit = ref(8);
const dokterTotalItems = ref(0);
const dokterTotalPages = ref(1);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const unitLayanan = computed<JenisLayananPendaftaran | null>(() =>
  props.unit ? REGISTRABLE_UNIT_JENIS_TO_LAYANAN[props.unit.jenisUnit] ?? null : null,
);

const forceJadwalOnly = computed(
  () => unitLayanan.value === JenisLayananPendaftaran.RAWAT_JALAN,
);

const forceDokterOnly = computed(() =>
  Boolean(unitLayanan.value && isInpatientLayanan(unitLayanan.value)),
);

const showTabSwitcher = computed(
  () => Boolean(props.unit) && !forceJadwalOnly.value && !forceDokterOnly.value,
);

const loadSchedules = async () => {
  if (!props.unit?.id) {
    jadwalList.value = [];
    return;
  }
  jadwalLoading.value = true;
  try {
    jadwalList.value = await pendaftaranService.getJadwalDokterTersedia({
      tanggal: props.tanggal || undefined,
      unitId: props.unit.id,
      sesi: sesiFilter.value,
      jenisPenjamin: (props.jenisPenjamin as JenisPenjamin) || undefined,
      search: searchQuery.value.trim(),
    });
  } catch (err: unknown) {
    jadwalList.value = [];
    showToast(extractApiErrorMessage(err, "Gagal memuat jadwal praktik dokter"), "error");
  } finally {
    jadwalLoading.value = false;
  }
};

const loadDokter = async () => {
  if (!props.unit?.id) {
    dokterList.value = [];
    dokterTotalItems.value = 0;
    dokterTotalPages.value = 1;
    return;
  }
  dokterLoading.value = true;
  try {
    const res = await dokterService.getDokter({
      page: dokterPage.value,
      limit: dokterLimit.value,
      search: searchQuery.value.trim(),
      jenisDokter: jenisDokterFilter.value,
      unitId: filterByUnitDokter.value ? props.unit.id : undefined,
      status: "Y",
      sortBy: "kodeDokter",
      sortType: "ASC",
    });
    dokterList.value = res.items;
    dokterTotalItems.value = res.meta.totalItems;
    dokterTotalPages.value = res.meta.totalPages || 1;
    dokterPage.value = res.meta.currentPage || dokterPage.value;
  } catch (err: unknown) {
    dokterList.value = [];
    dokterTotalItems.value = 0;
    dokterTotalPages.value = 1;
    showToast(extractApiErrorMessage(err, "Gagal memuat daftar dokter"), "error");
  } finally {
    dokterLoading.value = false;
  }
};

const refreshActiveTab = () => {
  if (!props.unit?.id) {
    jadwalList.value = [];
    dokterList.value = [];
    dokterTotalItems.value = 0;
    dokterTotalPages.value = 1;
    return;
  }
  if (activeTab.value === "jadwal") {
    loadSchedules();
  } else {
    loadDokter();
  }
};

watch(
  () => props.show,
  (isOpen) => {
    if (!isOpen) return;
    searchQuery.value = "";
    sesiFilter.value = "";
    jenisDokterFilter.value = "";
    filterByUnitDokter.value = true;
    dokterPage.value = 1;
    if (forceDokterOnly.value || unitLayanan.value === JenisLayananPendaftaran.IGD) {
      activeTab.value = "dokter";
    } else {
      activeTab.value = "jadwal";
    }
    refreshActiveTab();
  },
  { immediate: true },
);

watch(
  () => [props.unit?.id, props.tanggal, props.jenisPenjamin],
  () => {
    if (!props.show) return;
    filterByUnitDokter.value = true;
    dokterPage.value = 1;
    if (forceDokterOnly.value || unitLayanan.value === JenisLayananPendaftaran.IGD) {
      activeTab.value = "dokter";
    } else {
      activeTab.value = "jadwal";
    }
    refreshActiveTab();
  },
);

watch(activeTab, () => {
  if (!props.show) return;
  refreshActiveTab();
});

watch(searchQuery, () => {
  if (!props.show) return;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    dokterPage.value = 1;
    refreshActiveTab();
  }, 350);
});

watch([sesiFilter, jenisDokterFilter, filterByUnitDokter], () => {
  if (!props.show) return;
  dokterPage.value = 1;
  refreshActiveTab();
});

const getJadwalDokterName = (item: JadwalDokterTersediaItem): string => {
  const d = item.dokter;
  if (!d) return `Dokter #${item.dokterId}`;
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
};

const getMasterDokterName = (d: DokterItem): string =>
  d.namaTampilan ||
  formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
  d.kodeDokter;

const formatQuotaLabel = (sisa: number | null, total: number): string => {
  if (total === 0 && sisa === null) return "Tanpa batas";
  return `${sisa ?? 0}/${total}`;
};

const pickJadwal = (item: JadwalDokterTersediaItem) => {
  if (item.kuotaInfo.isPenuh) return;
  emit("select-jadwal", item);
  emit("close");
};

const pickDokter = (item: DokterItem) => {
  emit("select-dokter", item);
  emit("close");
};

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="emit('close')"
    >
      <div class="modal-box max-w-4xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-5 sm:p-6 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 mb-4">
          <h3 class="font-extrabold text-lg tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Stethoscope class="w-5 h-5" />
            </div>
            <div>
              <span>
                {{
                  activeTab === "jadwal"
                    ? "Pilih Jadwal Praktik & Dokter"
                    : "Pilih Dokter DPJP / Dokter Jaga"
                }}
              </span>
              <p class="text-xs font-normal text-base-content/60 mt-0.5">
                <template v-if="unit">
                  Unit: <strong>{{ unit.kode }} — {{ unit.nama }}</strong>
                </template>
                <template v-else>Semua unit pelayanan</template>
                <template v-if="activeTab === 'jadwal' && tanggal">
                  • Tanggal: <strong>{{ formatDate(tanggal) }}</strong>
                </template>
              </p>
            </div>
          </h3>

          <div
            v-if="showTabSwitcher"
            class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-base-200/70 border border-base-content/10 shrink-0"
          >
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
              :class="activeTab === 'jadwal' ? 'bg-primary text-primary-content shadow-xs' : 'text-base-content/70'"
              @click="activeTab = 'jadwal'"
            >
              Jadwal Praktik
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
              :class="activeTab === 'dokter' ? 'bg-primary text-primary-content shadow-xs' : 'text-base-content/70'"
              @click="activeTab = 'dokter'"
            >
              Daftar Dokter
            </button>
          </div>
        </div>

        <!-- Search & Filter -->
        <div v-if="unit" class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          <div class="relative sm:col-span-2">
            <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nama dokter, kode dokter, atau spesialisasi..."
              class="input input-bordered w-full pl-10 pr-9 rounded-xl h-11 text-sm bg-base-200/35 focus:bg-base-100"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error"
              @click="searchQuery = ''"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <select
            v-if="activeTab === 'jadwal'"
            v-model="sesiFilter"
            class="select select-bordered w-full rounded-xl h-11 text-sm font-semibold"
          >
            <option value="">Semua Sesi Praktik</option>
            <option v-for="s in SESI_PRAKTIK_OPTIONS" :key="s.value" :value="s.value">
              Sesi {{ s.label }}
            </option>
          </select>

          <select
            v-else
            v-model="jenisDokterFilter"
            class="select select-bordered w-full rounded-xl h-11 text-sm font-semibold"
          >
            <option value="">Semua Jenis Dokter</option>
            <option v-for="jd in JENIS_DOKTER_OPTIONS" :key="jd.value" :value="jd.value">
              {{ jd.label }}
            </option>
          </select>
        </div>

        <!-- Body -->
        <div class="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
          <!-- WAJIB PILIH UNIT TERLEBIH DAHULU -->
          <div
            v-if="!unit"
            class="py-12 px-4 text-center rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1.5"
          >
            <AlertCircle class="w-7 h-7 mx-auto mb-1" />
            <p class="font-bold text-sm">Unit tujuan pelayanan belum dipilih</p>
            <p>
              Silakan pilih Unit / Poliklinik / Bangsal terlebih dahulu agar jadwal praktik dan dokter yang tampil sesuai unit.
            </p>
          </div>

          <!-- TAB JADWAL PRAKTIK -->
          <template v-else-if="activeTab === 'jadwal'">
            <div v-if="jadwalLoading" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="i in 4" :key="i" class="h-28 rounded-2xl bg-base-200 animate-pulse"></div>
            </div>

            <div
              v-else-if="jadwalList.length === 0"
              class="py-12 px-4 text-center rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1"
            >
              <AlertCircle class="w-7 h-7 mx-auto mb-1" />
              <p class="font-bold text-sm">Tidak ada jadwal praktik aktif yang tersedia</p>
              <p>
                Pastikan dokter pada unit <strong>{{ unit.nama }}</strong> sudah memiliki jadwal aktif pada hari kunjungan yang dipilih.
              </p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="item in jadwalList"
                :key="item.id"
                type="button"
                :disabled="item.kuotaInfo.isPenuh"
                class="text-left p-4 rounded-2xl border transition space-y-2"
                :class="
                  item.kuotaInfo.isPenuh
                    ? 'bg-base-200/50 border-base-content/10 opacity-60 cursor-not-allowed'
                    : selectedJadwalId === item.id
                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                      : 'bg-base-100 border-base-content/10 hover:border-primary/40 hover:bg-primary/5'
                "
                @click="pickJadwal(item)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-mono text-xs font-extrabold text-primary inline-flex items-center gap-1">
                      <Clock class="w-3.5 h-3.5" />
                      {{ item.jamMulai }} - {{ item.jamSelesai }}
                    </span>
                    <span
                      v-if="item.sesi"
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                      :class="getSesiPraktikBadgeClass(item.sesi)"
                    >
                      {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, item.sesi) }}
                    </span>
                  </div>

                  <span
                    v-if="item.kuotaInfo.isPenuh"
                    class="badge badge-xs badge-error text-white font-bold"
                  >
                    Penuh
                  </span>
                  <CheckCircle2
                    v-else-if="selectedJadwalId === item.id"
                    class="w-4 h-4 text-primary shrink-0"
                  />
                </div>

                <div>
                  <div class="font-bold text-sm text-base-content truncate">
                    {{ getJadwalDokterName(item) }}
                  </div>
                  <div class="text-[11px] text-base-content/65 flex flex-wrap gap-x-2">
                    <span class="font-semibold text-base-content/80">{{ item.unit?.nama || "-" }}</span>
                    <span v-if="item.dokter?.spesialisasi">• {{ item.dokter.spesialisasi }}</span>
                    <span v-if="item.ruangan" class="inline-flex items-center gap-0.5">
                      • <MapPin class="w-3 h-3" /> {{ item.ruangan }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-2 text-[11px] pt-2 border-t border-base-content/10 text-base-content/70">
                  <span class="inline-flex items-center gap-1">
                    <Users class="w-3.5 h-3.5 text-base-content/45" />
                    <template v-if="item.kuotaInfo.isUnlimited">
                      Kuota Tanpa Batas (Terisi {{ item.kuotaInfo.terpakaiTotal }})
                    </template>
                    <template v-else>
                      JKN <strong class="text-emerald-600">{{ formatQuotaLabel(item.kuotaInfo.sisaKuotaJkn, item.kuotaInfo.kuotaJkn) }}</strong>
                      • Non <strong class="text-sky-600">{{ formatQuotaLabel(item.kuotaInfo.sisaKuotaNonJkn, item.kuotaInfo.kuotaNonJkn) }}</strong>
                    </template>
                  </span>
                  <span v-if="!item.kuotaInfo.isUnlimited" class="font-bold text-base-content">
                    Sisa {{ item.kuotaInfo.sisaKuotaTotal }}/{{ item.kuotaInfo.kuotaTotal }}
                  </span>
                </div>

                <p v-if="item.kuotaInfo.isPenuh && item.kuotaInfo.alasanPenuh" class="text-[10px] text-error font-semibold">
                  {{ item.kuotaInfo.alasanPenuh }}
                </p>
              </button>
            </div>
          </template>

          <!-- TAB DAFTAR DOKTER DPJP -->
          <template v-else>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-base-200/40 border border-base-content/10 text-xs">
              <span class="text-base-content/75">
                <template v-if="filterByUnitDokter">
                  Menampilkan dokter yang memiliki jadwal praktik aktif pada unit
                  <strong class="text-base-content">{{ unit.nama }}</strong>.
                </template>
                <template v-else>
                  Menampilkan seluruh dokter aktif rumah sakit (lintas unit).
                </template>
              </span>
              <label class="inline-flex items-center gap-2 cursor-pointer font-semibold shrink-0">
                <input
                  v-model="filterByUnitDokter"
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-primary"
                />
                <span>Filter sesuai unit</span>
              </label>
            </div>

            <div v-if="dokterLoading" class="space-y-2.5">
              <div v-for="i in 5" :key="i" class="h-16 rounded-xl bg-base-200 animate-pulse"></div>
            </div>

            <div
              v-else-if="dokterList.length === 0"
              class="py-12 px-4 text-center rounded-2xl bg-base-200/25 border border-dashed border-base-content/15 text-xs text-base-content/60 space-y-3"
            >
              <p v-if="filterByUnitDokter">
                Belum ada dokter yang terjadwal pada unit <strong>{{ unit.nama }}</strong>.
              </p>
              <p v-else>
                Dokter aktif tidak ditemukan dengan kata kunci tersebut.
              </p>
              <button
                v-if="filterByUnitDokter"
                type="button"
                class="btn btn-outline btn-primary btn-xs rounded-xl font-bold"
                @click="filterByUnitDokter = false"
              >
                Tampilkan Semua Dokter Aktif (Lintas Unit)
              </button>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                v-for="d in dokterList"
                :key="d.id"
                type="button"
                class="text-left p-3.5 rounded-2xl border transition flex items-start justify-between gap-3"
                :class="
                  selectedDokterId === d.id && !selectedJadwalId
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                    : 'bg-base-100 border-base-content/10 hover:border-primary/40 hover:bg-primary/5'
                "
                @click="pickDokter(d)"
              >
                <div class="min-w-0 space-y-0.5 text-xs">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono font-bold text-primary">{{ d.kodeDokter }}</span>
                    <span class="badge badge-xs badge-ghost font-semibold">
                      {{ getOptionLabel(JENIS_DOKTER_OPTIONS, d.jenisDokter) }}
                    </span>
                  </div>
                  <div class="font-bold text-sm text-base-content truncate">
                    {{ getMasterDokterName(d) }}
                  </div>
                  <div class="text-[11px] text-base-content/60">
                    {{ d.spesialisasi || "Umum / Tanpa Spesialisasi Khusus" }}
                    <span v-if="d.noSip"> • SIP: {{ d.noSip }}</span>
                  </div>
                </div>
                <CheckCircle2
                  v-if="selectedDokterId === d.id && !selectedJadwalId"
                  class="w-4 h-4 text-primary shrink-0 mt-1"
                />
              </button>
            </div>

            <AppPagination
              v-if="dokterTotalItems > 0"
              :current-page="dokterPage"
              :total-pages="dokterTotalPages"
              :total-items="dokterTotalItems"
              :limit="dokterLimit"
              class="mt-3 pt-3 border-t border-base-content/10"
              @page-change="(p) => { dokterPage = p; loadDokter(); }"
            />
          </template>
        </div>

        <div class="flex-none modal-action gap-2 pt-3 mt-2 border-t border-base-content/10 justify-between items-center">
          <span class="text-[11px] text-base-content/60 hidden sm:inline-flex items-center gap-1">
            <CalendarClock class="w-3.5 h-3.5" />
            <template v-if="activeTab === 'jadwal'">
              Jadwal dengan kuota penuh dinonaktifkan secara otomatis.
            </template>
            <template v-else>
              Pilih dokter penanggung jawab (DPJP) / dokter jaga untuk kunjungan ini.
            </template>
          </span>
          <button type="button" class="btn btn-ghost btn-sm rounded-xl ml-auto" @click="emit('close')">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

