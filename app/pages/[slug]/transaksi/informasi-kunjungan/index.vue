<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPlus,
  CreditCard,
  Eye,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Ticket,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import PendaftaranDetailModal from "@/components/transaksi/PendaftaranDetailModal.vue";
import PendaftaranEditPenjaminModal from "@/components/transaksi/PendaftaranEditPenjaminModal.vue";
import PendaftaranMutasiModal from "@/components/transaksi/PendaftaranMutasiModal.vue";
import PendaftaranActionModal, {
  type PendaftaranActionMode,
} from "@/components/transaksi/PendaftaranActionModal.vue";
import { getVisitPenjaminList } from "@/utils/pendaftaran-penjamin.util";
import { PendaftaranService } from "@/services/pendaftaran.service";
import { UnitService } from "@/services/unit.service";
import { DokterService } from "@/services/dokter.service";
import { PenjaminService } from "@/services/penjamin.service";
import { useDate } from "@/composables/useDate";
import { usePermission } from "@/composables/usePermission";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  calculateAgeLabel,
  formatNamaGelarDokter,
  getJenisLayananBadgeClass,
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  getStatusKunjunganBadgeClass,
  isActiveKunjunganStatus,
  isInpatientLayanan,
  JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
  JENIS_PENJAMIN_OPTIONS,
  JenisLayananPendaftaran,
  JenisPenjamin,
  REGISTRABLE_UNIT_JENIS_TO_LAYANAN,
  STATUS_KUNJUNGAN_OPTIONS,
  StatusKunjungan,
  type DokterItem,
  type PendaftaranItem,
  type PendaftaranSortField,
  type PenjaminOptionItem,
  type UnitOptionItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Informasi Kunjungan Pasien",
});

const pendaftaranService = PendaftaranService();
const unitService = UnitService();
const dokterService = DokterService();
const penjaminService = PenjaminService();
const { formatDate, formatDateForInput, formatDateTime } = useDate();
const { slugPath } = useSlugRoute();
const { showToast } = useToast();
const { canWrite } = usePermission();

const ROUTE_PATH = "/transaksi/informasi-kunjungan";
const RESOURCE_NAME = "Pendaftaran";

const canManageData = computed(
  () =>
    canWrite(ROUTE_PATH, RESOURCE_NAME) ||
    canWrite("/transaksi/pendaftaran", "Informasi Kunjungan"),
);

const items = ref<PendaftaranItem[]>([]);
const unitOptions = ref<UnitOptionItem[]>([]);
const dokterOptions = ref<DokterItem[]>([]);
const penjaminOptions = ref<PenjaminOptionItem[]>([]);
const loading = ref(false);

const todayStr = formatDateForInput(new Date());
const searchQuery = ref("");
const tanggalDari = ref(todayStr);
const tanggalSampai = ref(todayStr);
const jenisLayananFilter = ref<JenisLayananPendaftaran | "">("");
const unitIdFilter = ref<number | "">("");
const dokterIdFilter = ref<number | "">("");
const penjaminIdFilter = ref<number | "">("");
const jenisPenjaminFilter = ref<JenisPenjamin | "">("");
const statusKunjunganFilter = ref<StatusKunjungan | "">("");
const aktifSaja = ref(false);

const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<PendaftaranSortField>("id");
const sortType = ref<"ASC" | "DESC">("DESC");

const registrableUnitOptions = computed(() =>
  unitOptions.value.filter((u) => Boolean(REGISTRABLE_UNIT_JENIS_TO_LAYANAN[u.jenisUnit])),
);

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    const allowed: PendaftaranSortField[] = [
      "id",
      "noRegistrasi",
      "tanggalKunjungan",
      "waktuDaftar",
      "createdAt",
    ];
    sortBy.value = allowed.includes(field as PendaftaranSortField)
      ? (field as PendaftaranSortField)
      : "id";
    sortType.value = order === "ASC" ? "ASC" : "DESC";
    currentPage.value = 1;
    fetchItems();
  },
});

const hasActiveFilters = computed(() =>
  Boolean(
    searchQuery.value.trim() ||
      tanggalDari.value ||
      tanggalSampai.value ||
      jenisLayananFilter.value ||
      unitIdFilter.value ||
      dokterIdFilter.value ||
      penjaminIdFilter.value ||
      jenisPenjaminFilter.value ||
      statusKunjunganFilter.value ||
      aktifSaja.value,
  ),
);

const loadFilterOptions = async () => {
  const [unitRes, dokterRes, penjaminRes] = await Promise.allSettled([
    unitService.getUnitOptions(),
    dokterService.getDokter({
      page: 1,
      limit: 100,
      status: "Y",
      sortBy: "kodeDokter",
      sortType: "ASC",
    }),
    penjaminService.getPenjaminOptions(),
  ]);
  if (unitRes.status === "fulfilled") unitOptions.value = unitRes.value;
  if (dokterRes.status === "fulfilled") dokterOptions.value = dokterRes.value.items;
  if (penjaminRes.status === "fulfilled") penjaminOptions.value = penjaminRes.value;
};

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await pendaftaranService.getPendaftaran({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
      tanggalDari: tanggalDari.value,
      tanggalSampai: tanggalSampai.value,
      jenisLayanan: jenisLayananFilter.value,
      unitId: unitIdFilter.value ? Number(unitIdFilter.value) : undefined,
      dokterId: dokterIdFilter.value ? Number(dokterIdFilter.value) : undefined,
      penjaminId: penjaminIdFilter.value ? Number(penjaminIdFilter.value) : undefined,
      jenisPenjamin: jenisPenjaminFilter.value,
      statusKunjungan: statusKunjunganFilter.value,
      aktifSaja: aktifSaja.value ? true : "",
      sortBy: sortBy.value,
      sortType: sortType.value,
    });
    items.value = res.items;
    totalItems.value = res.meta.totalItems;
    totalPages.value = res.meta.totalPages || 1;
    currentPage.value = res.meta.currentPage || currentPage.value;
  } catch (err: unknown) {
    items.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
    showToast(extractApiErrorMessage(err, "Gagal memuat informasi kunjungan"), "error");
  } finally {
    loading.value = false;
  }
};

let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchItems();
  }, 400);
});

watch(
  [
    tanggalDari,
    tanggalSampai,
    jenisLayananFilter,
    unitIdFilter,
    dokterIdFilter,
    penjaminIdFilter,
    jenisPenjaminFilter,
    statusKunjunganFilter,
    aktifSaja,
  ],
  () => {
    currentPage.value = 1;
    fetchItems();
  },
);

const handleImmediateSearch = () => {
  if (filterTimer) clearTimeout(filterTimer);
  currentPage.value = 1;
  fetchItems();
};

const clearAllFilters = () => {
  if (filterTimer) clearTimeout(filterTimer);
  searchQuery.value = "";
  tanggalDari.value = "";
  tanggalSampai.value = "";
  jenisLayananFilter.value = "";
  unitIdFilter.value = "";
  dokterIdFilter.value = "";
  penjaminIdFilter.value = "";
  jenisPenjaminFilter.value = "";
  statusKunjunganFilter.value = "";
  aktifSaja.value = false;
  currentPage.value = 1;
  fetchItems();
};

const handleLimitChange = () => {
  currentPage.value = 1;
  fetchItems();
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchItems();
};

const toggleSort = (field: PendaftaranSortField) => {
  if (sortBy.value === field) {
    sortType.value = sortType.value === "ASC" ? "DESC" : "ASC";
  } else {
    sortBy.value = field;
    sortType.value = field === "noRegistrasi" ? "ASC" : "DESC";
  }
  currentPage.value = 1;
  fetchItems();
};

const getRowNumber = (index: number) =>
  (currentPage.value - 1) * limit.value + index + 1;

const getDokterName = (item: PendaftaranItem): string => {
  const d = item.dokterSaatIni;
  if (!d) return "-";
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
};

const getDokterOptionLabel = (d: DokterItem): string =>
  `${d.kodeDokter} — ${
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  }`;

// Modals Detail, Penjamin, Mutasi, Aksi
const showDetailModal = ref(false);
const detailId = ref<number | null>(null);
const showEditPenjaminModal = ref(false);
const editPenjaminTarget = ref<PendaftaranItem | null>(null);
const showMutasiModal = ref(false);
const mutasiTarget = ref<PendaftaranItem | null>(null);
const showActionModal = ref(false);
const actionMode = ref<PendaftaranActionMode>("selesai");
const actionTarget = ref<PendaftaranItem | null>(null);

const getSecondaryPenjaminSummary = (item: PendaftaranItem): string => {
  const entries = getVisitPenjaminList(item);
  if (entries.length <= 1) return "";
  return entries
    .slice(1)
    .map((e) => e.namaPenjaminSnapshot)
    .join(", ");
};

const getExtraPenjaminCount = (item: PendaftaranItem): number => {
  const entries = getVisitPenjaminList(item);
  return Math.max(0, entries.length - 1);
};

const openDetailModal = (item: PendaftaranItem) => {
  detailId.value = item.id;
  showDetailModal.value = true;
};

const openEditPenjaminModal = (item: PendaftaranItem) => {
  if (!canManageData.value || !isActiveKunjunganStatus(item.statusKunjungan)) return;
  showDetailModal.value = false;
  editPenjaminTarget.value = item;
  showEditPenjaminModal.value = true;
};

const openMutasiModal = (item: PendaftaranItem) => {
  if (!canManageData.value || !isActiveKunjunganStatus(item.statusKunjungan)) return;
  showDetailModal.value = false;
  mutasiTarget.value = item;
  showMutasiModal.value = true;
};

const openActionModal = (item: PendaftaranItem, mode: PendaftaranActionMode) => {
  if (!canManageData.value || !isActiveKunjunganStatus(item.statusKunjungan)) return;
  showDetailModal.value = false;
  actionTarget.value = item;
  actionMode.value = mode;
  showActionModal.value = true;
};

const handleUpdated = async () => {
  await fetchItems();
};

onMounted(async () => {
  await Promise.all([loadFilterOptions(), fetchItems()]);
});

onUnmounted(() => {
  if (filterTimer) clearTimeout(filterTimer);
});
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <!-- HEADER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-primary/10 text-primary border-primary/20 flex items-center justify-center shrink-0">
            <ClipboardCheck class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Informasi Kunjungan & Antrean Pasien
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Kunjungan
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Pemantauan kunjungan Rawat Jalan, IGD, dan Rawat Inap, antrean poliklinik, mutasi unit/bed, serta pemulangan pasien
            </p>
          </div>
        </div>

       
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div class="relative sm:col-span-2 lg:col-span-1">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari No. Reg, No. RM, nama, NIK, SEP..."
            class="input input-bordered input-sm w-full pl-10 pr-8 rounded-xl text-xs bg-base-200/40 focus:bg-base-100"
            @keyup.enter="handleImmediateSearch"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error p-1"
            @click="searchQuery = ''"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <FlatpickrDate
          v-model="tanggalDari"
          size="sm"
          placeholder="Tanggal mulai..."
        />

        <FlatpickrDate
          v-model="tanggalSampai"
          size="sm"
          placeholder="Tanggal sampai..."
        />

        <select
          v-model="jenisLayananFilter"
          aria-label="Filter jenis layanan"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Jenis Layanan</option>
          <option v-for="l in JENIS_LAYANAN_PENDAFTARAN_OPTIONS" :key="l.value" :value="l.value">
            {{ l.label }}
          </option>
        </select>

        <select
          v-model="unitIdFilter"
          aria-label="Filter unit saat ini"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Unit / Poli</option>
          <option v-for="u in registrableUnitOptions" :key="u.id" :value="u.id">
            {{ u.kode }} — {{ u.nama }}
          </option>
        </select>

        <select
          v-model="dokterIdFilter"
          aria-label="Filter dokter saat ini"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Dokter DPJP</option>
          <option v-for="d in dokterOptions" :key="d.id" :value="d.id">
            {{ getDokterOptionLabel(d) }}
          </option>
        </select>

        <select
          v-model="penjaminIdFilter"
          aria-label="Filter master penjamin"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Penjamin</option>
          <option v-for="p in penjaminOptions" :key="p.id" :value="p.id">
            {{ p.kode }} — {{ p.nama }}
          </option>
        </select>

        <select
          v-model="statusKunjunganFilter"
          aria-label="Filter status kunjungan"
          :disabled="aktifSaja"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status Kunjungan</option>
          <option v-for="s in STATUS_KUNJUNGAN_OPTIONS" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-base-content/5">
        <div class="flex flex-wrap items-center gap-3">
          <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              v-model="aktifSaja"
              type="checkbox"
              class="checkbox checkbox-xs checkbox-primary"
            />
            Hanya kunjungan aktif
          </label>

          <select
            v-model="jenisPenjaminFilter"
            aria-label="Filter jenis penjamin"
            class="select select-bordered select-xs rounded-lg text-xs font-semibold"
          >
            <option value="">Semua Tipe Bayar</option>
            <option v-for="jp in JENIS_PENJAMIN_OPTIONS" :key="jp.value" :value="jp.value">
              {{ jp.label }}
            </option>
          </select>

          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn btn-ghost btn-xs rounded-lg text-error font-bold"
            @click="clearAllFilters"
          >
            Reset / Semua Tanggal
          </button>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            v-model="sortPreset"
            aria-label="Urutkan pendaftaran"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="id:DESC">Terbaru (ID ↓)</option>
            <option value="waktuDaftar:DESC">Waktu Daftar Terbaru</option>
            <option value="tanggalKunjungan:DESC">Tanggal Kunjungan (Terbaru)</option>
            <option value="noRegistrasi:ASC">No. Registrasi (A → Z)</option>
          </select>

          <select
            v-model.number="limit"
            aria-label="Jumlah per halaman"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold w-24"
            @change="handleLimitChange"
          >
            <option :value="10">10 / hal</option>
            <option :value="20">20 / hal</option>
            <option :value="50">50 / hal</option>
          </select>

          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square rounded-xl border border-base-content/10"
            :disabled="loading"
            title="Muat Ulang"
            @click="fetchItems"
          >
            <RefreshCw class="w-4 h-4 text-base-content/70" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </div>

    <!-- CONTENT -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm p-4 sm:p-6">
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-16 bg-base-200/70 rounded-xl animate-pulse"></div>
      </div>

      <div
        v-else-if="items.length === 0"
        class="py-14 px-4 text-center bg-base-200/20 rounded-2xl border border-dashed border-base-content/15"
      >
        <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <ClipboardCheck class="w-8 h-8" />
        </div>
        <h3 class="font-bold text-base text-base-content mb-1">
          {{ hasActiveFilters ? "Data kunjungan tidak ditemukan" : "Belum ada informasi kunjungan" }}
        </h3>
        <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
          {{
            hasActiveFilters
              ? "Coba ubah rentang tanggal kunjungan atau reset filter pencarian."
              : "Mulai daftarkan kunjungan pasien melalui menu Pendaftaran."
          }}
        </p>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="btn btn-ghost btn-sm rounded-xl font-bold"
          @click="clearAllFilters"
        >
          Reset Filter & Tanggal
        </button>
        <NuxtLink
          v-else-if="canManageData"
          :to="slugPath('/transaksi/pendaftaran')"
          class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5"
        >
          <Plus class="w-4 h-4" />
          Buka Menu Pendaftaran
        </NuxtLink>
      </div>

      <template v-else>
        <!-- DESKTOP TABLE -->
        <div class="hidden md:block overflow-x-auto">
          <table class="table w-full text-left border-collapse">
            <thead>
              <tr class="bg-base-200/50 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
                <th class="py-3.5 px-4 w-12 rounded-l-xl">No</th>
                <th class="py-3.5 px-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-primary transition"
                    @click="toggleSort('noRegistrasi')"
                  >
                    <span>No. Reg & Waktu</span>
                    <ArrowUp v-if="sortBy === 'noRegistrasi' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'noRegistrasi' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">Pasien & No. RM</th>
                <th class="py-3.5 px-4">Layanan, Unit & DPJP</th>
                <th class="py-3.5 px-4">Penjamin</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4 text-right rounded-r-xl">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-base-content/5 text-sm">
              <tr
                v-for="(item, index) in items"
                :key="item.id"
                class="hover:bg-base-200/35 transition-colors"
              >
                <td class="py-3.5 px-4 text-xs font-semibold text-base-content/50">
                  {{ getRowNumber(index) }}
                </td>
                <td class="py-3.5 px-4 text-xs space-y-1">
                  <div class="font-mono font-extrabold text-primary">{{ item.noRegistrasi }}</div>
                  <div class="text-[11px] text-base-content/65">
                    {{ formatDate(item.tanggalKunjungan) }}
                  </div>
                  <div
                    v-if="item.kodeAntreanSaatIni"
                    class="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-warning/20 text-base-content border border-warning/50"
                  >
                    <Ticket class="w-3 h-3 text-warning shrink-0" />
                    <span>Antrean: {{ item.kodeAntreanSaatIni }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <div class="font-bold text-base-content">
                    {{ item.pasien?.penduduk?.namaLengkap || "-" }}
                  </div>
                  <div class="text-[11px] text-base-content/60 font-mono mt-0.5">
                    RM: {{ item.pasien?.noRm || "-" }}
                    <span v-if="item.pasien?.penduduk?.tanggalLahir" class="font-sans">
                      • {{ calculateAgeLabel(item.pasien.penduduk.tanggalLahir) }}
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs space-y-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                      class="text-[10px] font-bold px-2 py-0.5 rounded border"
                      :class="getJenisLayananBadgeClass(item.jenisLayananSaatIni)"
                    >
                      {{ getOptionLabel(JENIS_LAYANAN_PENDAFTARAN_OPTIONS, item.jenisLayananSaatIni) }}
                    </span>
                    <span class="font-bold text-base-content">{{ item.unitSaatIni?.nama || "-" }}</span>
                  </div>
                  <div class="text-[11px] text-base-content/65">
                    {{ getDokterName(item) }}
                    <span
                      v-if="item.bedSaatIni"
                      class="inline-flex items-center gap-1 ml-1 font-mono text-primary font-semibold"
                    >
                      • <BedDouble class="w-3 h-3" /> {{ item.bedSaatIni.kode }}
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs space-y-1">
                  <div class="flex items-center gap-1 flex-wrap">
                    <span
                      class="text-[10px] font-bold px-2 py-0.5 rounded border inline-block"
                      :class="getJenisPenjaminBadgeClass(item.jenisPenjamin)"
                    >
                      {{ item.namaPenjaminSnapshot }}
                    </span>
                    <span
                      v-if="getExtraPenjaminCount(item) > 0"
                      class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25"
                      :title="`COB: ${getSecondaryPenjaminSummary(item)}`"
                    >
                      +{{ getExtraPenjaminCount(item) }} COB
                    </span>
                  </div>
                  <div
                    v-if="getSecondaryPenjaminSummary(item)"
                    class="text-[10px] text-base-content/65 truncate max-w-[200px]"
                    :title="getSecondaryPenjaminSummary(item)"
                  >
                    + {{ getSecondaryPenjaminSummary(item) }}
                  </div>
                  <div v-if="item.noKartuSnapshot || item.noSep" class="text-[11px] font-mono text-base-content/60">
                    <span v-if="item.noKartuSnapshot">{{ item.noKartuSnapshot }}</span>
                    <span v-if="item.noSep" class="block">SEP: {{ item.noSep }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span
                    class="text-[11px] font-bold px-2.5 py-1 rounded-lg border inline-block"
                    :class="getStatusKunjunganBadgeClass(item.statusKunjungan)"
                  >
                    {{ getOptionLabel(STATUS_KUNJUNGAN_OPTIONS, item.statusKunjungan) }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-square rounded-lg text-info hover:bg-info/10"
                      title="Detail & Riwayat Unit"
                      @click="openDetailModal(item)"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <template v-if="canManageData && isActiveKunjunganStatus(item.statusKunjungan)">
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-secondary hover:bg-secondary/10"
                        title="Ubah Penjamin / Asuransi (COB)"
                        @click="openEditPenjaminModal(item)"
                      >
                        <CreditCard class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-primary hover:bg-primary/10"
                        title="Mutasi Unit / Bed / DPJP"
                        @click="openMutasiModal(item)"
                      >
                        <ArrowRightLeft class="w-4 h-4" />
                      </button>
                      <button
                        v-if="isInpatientLayanan(item.jenisLayananSaatIni)"
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-warning hover:bg-warning/10"
                        title="Batal Rawat Inap"
                        @click="openActionModal(item, 'batal-ranap')"
                      >
                        <RotateCcw class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-success hover:bg-success/10"
                        title="Selesaikan / Pulangkan"
                        @click="openActionModal(item, 'selesai')"
                      >
                        <CheckCircle2 class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-error hover:bg-error/10"
                        title="Batalkan Kunjungan"
                        @click="openActionModal(item, 'batal')"
                      >
                        <XCircle class="w-4 h-4" />
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE CARDS -->
        <div class="md:hidden space-y-3">
          <div
            v-for="item in items"
            :key="item.id"
            class="p-4 rounded-2xl border border-base-content/10 bg-base-200/25 space-y-2.5"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-mono text-xs font-extrabold text-primary">{{ item.noRegistrasi }}</span>
                  <span
                    v-if="item.kodeAntreanSaatIni"
                    class="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-warning/20 text-base-content border border-warning/50"
                  >
                    <Ticket class="w-3 h-3 text-warning shrink-0" />
                    <span>{{ item.kodeAntreanSaatIni }}</span>
                  </span>
                </div>
                <h4 class="font-bold text-sm text-base-content truncate mt-1">
                  {{ item.pasien?.penduduk?.namaLengkap || "-" }}
                </h4>
                <p class="text-[11px] font-mono text-base-content/60">
                  RM: {{ item.pasien?.noRm || "-" }} • {{ formatDateTime(item.waktuDaftar) }}
                </p>
              </div>

              <span
                class="text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0"
                :class="getStatusKunjunganBadgeClass(item.statusKunjungan)"
              >
                {{ getOptionLabel(STATUS_KUNJUNGAN_OPTIONS, item.statusKunjungan) }}
              </span>
            </div>

            <div class="text-xs space-y-1 pt-2 border-t border-base-content/10">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded border"
                  :class="getJenisLayananBadgeClass(item.jenisLayananSaatIni)"
                >
                  {{ getOptionLabel(JENIS_LAYANAN_PENDAFTARAN_OPTIONS, item.jenisLayananSaatIni) }}
                </span>
                <span class="font-semibold text-base-content">{{ item.unitSaatIni?.nama || "-" }}</span>
              </div>
              <div class="text-[11px] text-base-content/70 flex items-center justify-between gap-2 flex-wrap">
                <span>DPJP: <strong class="text-base-content">{{ getDokterName(item) }}</strong></span>
                <div class="flex items-center gap-1 flex-wrap">
                  <span
                    class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                    :class="getJenisPenjaminBadgeClass(item.jenisPenjamin)"
                  >
                    {{ item.namaPenjaminSnapshot }}
                  </span>
                  <span
                    v-if="getExtraPenjaminCount(item) > 0"
                    class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25"
                  >
                    +{{ getExtraPenjaminCount(item) }} COB
                  </span>
                </div>
              </div>
              <div v-if="getSecondaryPenjaminSummary(item)" class="text-[10px] text-base-content/60">
                COB: {{ getSecondaryPenjaminSummary(item) }}
              </div>
              <div v-if="item.bedSaatIni" class="text-[11px] font-mono text-primary font-semibold">
                Bed: {{ item.bedSaatIni.kode }} ({{ item.bedSaatIni.nama }})
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                class="btn btn-xs btn-ghost flex-1 rounded-xl border border-base-content/10 gap-1"
                @click="openDetailModal(item)"
              >
                <Eye class="w-3.5 h-3.5" />
                Detail
              </button>
              <template v-if="canManageData && isActiveKunjunganStatus(item.statusKunjungan)">
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-secondary rounded-xl gap-1"
                  @click="openEditPenjaminModal(item)"
                >
                  <CreditCard class="w-3.5 h-3.5" />
                  Penjamin
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-primary rounded-xl gap-1"
                  @click="openMutasiModal(item)"
                >
                  <ArrowRightLeft class="w-3.5 h-3.5" />
                  Mutasi
                </button>
                <button
                  v-if="isInpatientLayanan(item.jenisLayananSaatIni)"
                  type="button"
                  class="btn btn-xs btn-outline btn-warning rounded-xl gap-1"
                  @click="openActionModal(item, 'batal-ranap')"
                >
                  Batal Ranap
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-success rounded-xl gap-1"
                  @click="openActionModal(item, 'selesai')"
                >
                  Selesai
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded-xl px-2"
                  aria-label="Batalkan kunjungan"
                  @click="openActionModal(item, 'batal')"
                >
                  <XCircle class="w-3.5 h-3.5" />
                </button>
              </template>
            </div>
          </div>
        </div>

        <AppPagination
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-items="totalItems"
          :limit="limit"
          class="mt-6"
          @page-change="handlePageChange"
        />
      </template>
    </div>

    <!-- MODALS -->
    <PendaftaranDetailModal
      :show="showDetailModal"
      :pendaftaran-id="detailId"
      :can-manage="canManageData"
      @close="showDetailModal = false"
      @edit-penjamin="openEditPenjaminModal"
      @mutasi="openMutasiModal"
      @batal-ranap="openActionModal($event, 'batal-ranap')"
      @selesai="openActionModal($event, 'selesai')"
      @batal="openActionModal($event, 'batal')"
    />

    <PendaftaranEditPenjaminModal
      :show="showEditPenjaminModal"
      :pendaftaran="editPenjaminTarget"
      @close="showEditPenjaminModal = false"
      @updated="handleUpdated"
    />

    <PendaftaranMutasiModal
      :show="showMutasiModal"
      :pendaftaran="mutasiTarget"
      @close="showMutasiModal = false"
      @updated="handleUpdated"
    />

    <PendaftaranActionModal
      :show="showActionModal"
      :mode="actionMode"
      :pendaftaran="actionTarget"
      @close="showActionModal = false"
      @updated="handleUpdated"
    />
  </div>
</template>

