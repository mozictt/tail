<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  ListFilter,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import JadwalDokterFormModal from "@/components/master/JadwalDokterFormModal.vue";
import JadwalDokterDetailModal from "@/components/master/JadwalDokterDetailModal.vue";
import JadwalDokterStatusModal from "@/components/master/JadwalDokterStatusModal.vue";
import JadwalDokterWeeklyBoard from "@/components/master/JadwalDokterWeeklyBoard.vue";
import { JadwalDokterService } from "@/services/jadwal-dokter.service";
import { DokterService } from "@/services/dokter.service";
import { UnitService } from "@/services/unit.service";
import { useDate } from "@/composables/useDate";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  formatNamaGelarDokter,
  getHariPraktikBadgeClass,
  getOptionLabel,
  getSesiPraktikBadgeClass,
  HARI_PRAKTIK_OPTIONS,
  HariPraktik,
  SESI_PRAKTIK_OPTIONS,
  SesiPraktik,
  type DokterItem,
  type JadwalDokterItem,
  type JadwalDokterSortField,
  type JadwalDokterWeeklyGroup,
  type UnitOptionItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Master Jadwal Dokter",
});

const jadwalService = JadwalDokterService();
const dokterService = DokterService();
const unitService = UnitService();
const { formatDateForInput } = useDate();
const { showToast } = useToast();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/master/jadwal-dokter";
const RESOURCE_NAME = "Jadwal Dokter";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

const activeView = ref<"list" | "weekly">("list");
const items = ref<JadwalDokterItem[]>([]);
const weeklyGroups = ref<JadwalDokterWeeklyGroup[]>([]);
const dokterOptions = ref<DokterItem[]>([]);
const unitOptions = ref<UnitOptionItem[]>([]);

const loading = ref(false);
const weeklyLoading = ref(false);
const togglingId = ref<number | null>(null);

const searchQuery = ref("");
const dokterIdFilter = ref<number | "">("");
const unitIdFilter = ref<number | "">("");
const hariFilter = ref<HariPraktik | "">("");
const sesiFilter = ref<SesiPraktik | "">("");
const statusFilter = ref<MasterStatus | "">("");

const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<JadwalDokterSortField>("id");
const sortType = ref<"ASC" | "DESC">("DESC");

// Panel Cek Jadwal Aktif per Tanggal (/master/jadwal-dokter/options)
const showDateChecker = ref(false);
const selectedCheckDate = ref(formatDateForInput(new Date()));
const dateCheckItems = ref<JadwalDokterItem[]>([]);
const dateCheckLoading = ref(false);

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    const allowed: JadwalDokterSortField[] = [
      "id",
      "hari",
      "jamMulai",
      "jamSelesai",
      "kuotaTotal",
      "createdAt",
    ];
    sortBy.value = allowed.includes(field as JadwalDokterSortField)
      ? (field as JadwalDokterSortField)
      : "id";
    sortType.value = order === "ASC" ? "ASC" : "DESC";
    currentPage.value = 1;
    fetchItems();
  },
});

const hasActiveFilters = computed(() =>
  Boolean(
    searchQuery.value.trim() ||
      dokterIdFilter.value ||
      unitIdFilter.value ||
      hariFilter.value ||
      sesiFilter.value ||
      statusFilter.value,
  ),
);

const loadFilterOptions = async () => {
  const [dokterRes, unitRes] = await Promise.allSettled([
    dokterService.getDokter({
      page: 1,
      limit: 100,
      status: "Y",
      sortBy: "kodeDokter",
      sortType: "ASC",
    }),
    unitService.getUnitOptions(),
  ]);
  if (dokterRes.status === "fulfilled") dokterOptions.value = dokterRes.value.items;
  if (unitRes.status === "fulfilled") unitOptions.value = unitRes.value;
};

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await jadwalService.getJadwalDokter({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
      dokterId: dokterIdFilter.value ? Number(dokterIdFilter.value) : undefined,
      unitId: unitIdFilter.value ? Number(unitIdFilter.value) : undefined,
      hari: hariFilter.value,
      sesi: sesiFilter.value,
      status: statusFilter.value,
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
    showToast(extractApiErrorMessage(err, "Gagal memuat jadwal dokter"), "error");
  } finally {
    loading.value = false;
  }
};

const fetchWeeklySchedule = async () => {
  weeklyLoading.value = true;
  try {
    weeklyGroups.value = await jadwalService.getJadwalDokterMingguan({
      search: searchQuery.value.trim(),
      dokterId: dokterIdFilter.value ? Number(dokterIdFilter.value) : undefined,
      unitId: unitIdFilter.value ? Number(unitIdFilter.value) : undefined,
      sesi: sesiFilter.value,
    });
  } catch (err: unknown) {
    weeklyGroups.value = [];
    showToast(extractApiErrorMessage(err, "Gagal memuat rekap mingguan"), "error");
  } finally {
    weeklyLoading.value = false;
  }
};

const fetchDateOptions = async () => {
  if (!showDateChecker.value || !selectedCheckDate.value) return;
  dateCheckLoading.value = true;
  try {
    dateCheckItems.value = await jadwalService.getJadwalDokterOptions({
      tanggal: selectedCheckDate.value,
      dokterId: dokterIdFilter.value ? Number(dokterIdFilter.value) : undefined,
      unitId: unitIdFilter.value ? Number(unitIdFilter.value) : undefined,
      sesi: sesiFilter.value,
      search: searchQuery.value.trim(),
    });
  } catch (err: unknown) {
    dateCheckItems.value = [];
    showToast(extractApiErrorMessage(err, "Gagal memeriksa jadwal tanggal"), "error");
  } finally {
    dateCheckLoading.value = false;
  }
};

const refreshActiveView = async () => {
  const tasks: Promise<void>[] = [
    activeView.value === "weekly" ? fetchWeeklySchedule() : fetchItems(),
  ];
  if (showDateChecker.value) tasks.push(fetchDateOptions());
  await Promise.all(tasks);
};

let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    currentPage.value = 1;
    refreshActiveView();
  }, 400);
});

watch(
  [dokterIdFilter, unitIdFilter, hariFilter, sesiFilter, statusFilter],
  () => {
    currentPage.value = 1;
    refreshActiveView();
  },
);

watch(activeView, () => {
  refreshActiveView();
});

watch([showDateChecker, selectedCheckDate], ([isShown]) => {
  if (isShown) fetchDateOptions();
});

const handleImmediateSearch = () => {
  if (filterTimer) clearTimeout(filterTimer);
  currentPage.value = 1;
  refreshActiveView();
};

const clearAllFilters = () => {
  if (filterTimer) clearTimeout(filterTimer);
  searchQuery.value = "";
  dokterIdFilter.value = "";
  unitIdFilter.value = "";
  hariFilter.value = "";
  sesiFilter.value = "";
  statusFilter.value = "";
  currentPage.value = 1;
  refreshActiveView();
};

const handleLimitChange = () => {
  currentPage.value = 1;
  fetchItems();
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchItems();
};

const toggleSort = (field: JadwalDokterSortField) => {
  if (sortBy.value === field) {
    sortType.value = sortType.value === "ASC" ? "DESC" : "ASC";
  } else {
    sortBy.value = field;
    sortType.value = field === "id" || field === "createdAt" ? "DESC" : "ASC";
  }
  currentPage.value = 1;
  fetchItems();
};

const getRowNumber = (index: number) =>
  (currentPage.value - 1) * limit.value + index + 1;

const getDokterDisplayName = (item: JadwalDokterItem): string => {
  const d = item.dokter;
  if (!d) return `Dokter #${item.dokterId}`;
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
};

const getDokterOptionText = (d: DokterItem): string => {
  const nama =
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter;
  return `${d.kodeDokter} — ${nama}`;
};

const handleToggleStatus = async (item: JadwalDokterItem) => {
  if (!canManageData.value || togglingId.value === item.id) return;

  const prevStatus: MasterStatus = item.status === "N" ? "N" : "Y";
  const nextStatus: MasterStatus = prevStatus === "Y" ? "N" : "Y";

  togglingId.value = item.id;
  item.status = nextStatus;

  try {
    await jadwalService.updateStatusJadwalDokter(item.id, { status: nextStatus });
    showToast(
      `Jadwal ${getOptionLabel(HARI_PRAKTIK_OPTIONS, item.hari)} (${item.jamMulai}) diubah menjadi ${nextStatus === "Y" ? "Aktif" : "Nonaktif"}`,
      "success",
    );
    if (showDateChecker.value) fetchDateOptions();
  } catch (err: unknown) {
    item.status = prevStatus;
    showToast(extractApiErrorMessage(err, "Gagal mengubah status jadwal"), "error");
  } finally {
    togglingId.value = null;
  }
};

// Modals
const showFormModal = ref(false);
const editingId = ref<number | null>(null);
const showDetailModal = ref(false);
const detailId = ref<number | null>(null);
const showStatusModal = ref(false);
const statusTarget = ref<JadwalDokterItem | null>(null);

const openCreateModal = () => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk menambah jadwal dokter", "error");
    return;
  }
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (item: JadwalDokterItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah jadwal dokter", "error");
    return;
  }
  showDetailModal.value = false;
  editingId.value = item.id;
  showFormModal.value = true;
};

const openDetailModal = (item: JadwalDokterItem) => {
  detailId.value = item.id;
  showDetailModal.value = true;
};

const openStatusModal = (item: JadwalDokterItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah status jadwal", "error");
    return;
  }
  showDetailModal.value = false;
  statusTarget.value = item;
  showStatusModal.value = true;
};

const handleDelete = async (item: JadwalDokterItem) => {
  if (!canDeleteData.value) {
    showToast("Anda tidak memiliki akses untuk menghapus jadwal dokter", "error");
    return;
  }

  const hariText = item.hariLabel || getOptionLabel(HARI_PRAKTIK_OPTIONS, item.hari);
  const confirm = await Swal.fire({
    title: "Hapus Jadwal Dokter?",
    text: `Jadwal ${getDokterDisplayName(item)} hari ${hariText} (${item.jamMulai} - ${item.jamSelesai}) akan dihapus permanen.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    customClass: {
      popup: "rounded-3xl border border-base-content/10",
      confirmButton: "btn btn-error text-white rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (!confirm.isConfirmed) return;

  try {
    await jadwalService.deleteJadwalDokter(item.id);
    showToast("Jadwal dokter berhasil dihapus", "success");
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await refreshActiveView();
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, "Gagal menghapus jadwal dokter"), "error");
  }
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
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-primary/10 text-primary border-primary/20 flex items-center justify-center shrink-0">
            <CalendarClock class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Master Jadwal Praktik Dokter
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Jadwal
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola jadwal praktik poliklinik/unit, kuota JKN & Non-JKN, durasi layanan, serta rekap mingguan bebas bentrok
            </p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <!-- Switcher Mode Tampilan -->
          <div class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-base-200/70 border border-base-content/10">
            <button
              type="button"
              class="btn btn-sm rounded-lg border-0 gap-1.5 font-bold"
              :class="activeView === 'list' ? 'btn-primary shadow-xs' : 'btn-ghost text-base-content/70'"
              @click="activeView = 'list'"
            >
              <ListFilter class="w-3.5 h-3.5" />
              <span>Daftar</span>
            </button>
            <button
              type="button"
              class="btn btn-sm rounded-lg border-0 gap-1.5 font-bold"
              :class="activeView === 'weekly' ? 'btn-primary shadow-xs' : 'btn-ghost text-base-content/70'"
              @click="activeView = 'weekly'"
            >
              <CalendarDays class="w-3.5 h-3.5" />
              <span>Mingguan</span>
            </button>
          </div>

          <button
            v-if="canManageData"
            type="button"
            class="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/25 hover:shadow-lg transition gap-2 w-full sm:w-auto"
            @click="openCreateModal"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>
    </div>

    <!-- PANEL CEK JADWAL PER TANGGAL (/master/jadwal-dokter/options) -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-xs space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs">
          <CalendarCheck2 class="w-4 h-4 text-primary shrink-0" />
          <span class="font-extrabold text-base-content/80">
            Simulasi Jadwal Aktif per Tanggal Kunjungan
          </span>
          <span class="hidden sm:inline text-base-content/55">
            (memeriksa jadwal dokter & poli yang tersedia pada tanggal terpilih)
          </span>
        </div>

        <button
          type="button"
          class="btn btn-ghost btn-xs rounded-lg font-bold gap-1 text-primary"
          @click="showDateChecker = !showDateChecker"
        >
          <span>{{ showDateChecker ? "Tutup Simulasi" : "Cek Berdasarkan Tanggal" }}</span>
          <ChevronUp v-if="showDateChecker" class="w-3.5 h-3.5" />
          <ChevronDown v-else class="w-3.5 h-3.5" />
        </button>
      </div>

      <div v-if="showDateChecker" class="pt-3 border-t border-base-content/10 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div class="w-full sm:w-64">
            <label class="block text-[11px] font-bold text-base-content/70 mb-1">
              Pilih Tanggal Kunjungan
            </label>
            <FlatpickrDate
              v-model="selectedCheckDate"
              size="sm"
              :clearable="false"
              placeholder="Pilih tanggal..."
            />
          </div>
          <div class="text-xs text-base-content/65 pb-1.5">
            Ditemukan <strong class="text-primary">{{ dateCheckItems.length }}</strong> jadwal praktik aktif
            <span v-if="dokterIdFilter || unitIdFilter || sesiFilter">(mengikuti filter dokter/unit/sesi aktif)</span>.
          </div>
        </div>

        <div v-if="dateCheckLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-base-200 animate-pulse"></div>
        </div>

        <div
          v-else-if="dateCheckItems.length === 0"
          class="p-4 rounded-xl bg-base-200/35 border border-dashed border-base-content/15 text-xs text-base-content/60 text-center"
        >
          Tidak ada jadwal praktik aktif pada tanggal tersebut.
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <button
            v-for="opt in dateCheckItems"
            :key="opt.id"
            type="button"
            class="text-left p-3 rounded-xl bg-base-200/30 hover:bg-primary/5 border border-base-content/10 hover:border-primary/30 transition space-y-1"
            @click="openDetailModal(opt)"
          >
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="font-mono font-extrabold text-primary">
                {{ opt.jamMulai }} - {{ opt.jamSelesai }}
              </span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-base-100 border border-base-content/10">
                Kuota: {{ opt.kuotaTotal }}
              </span>
            </div>
            <div class="font-bold text-xs text-base-content truncate">
              {{ getDokterDisplayName(opt) }}
            </div>
            <div class="text-[11px] text-base-content/65 truncate">
              {{ opt.unit?.nama || "-" }}
              <template v-if="opt.ruangan"> • {{ opt.ruangan }}</template>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <div class="relative sm:col-span-2 lg:col-span-1">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari dokter, unit, ruangan, BPJS..."
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

        <select
          v-model="dokterIdFilter"
          aria-label="Filter dokter"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Dokter</option>
          <option v-for="d in dokterOptions" :key="d.id" :value="d.id">
            {{ getDokterOptionText(d) }}
          </option>
        </select>

        <select
          v-model="unitIdFilter"
          aria-label="Filter unit poliklinik"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Unit / Poli</option>
          <option v-for="u in unitOptions" :key="u.id" :value="u.id">
            {{ u.kode }} — {{ u.nama }}
          </option>
        </select>

        <select
          v-model="hariFilter"
          aria-label="Filter hari praktik"
          :disabled="activeView === 'weekly'"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Hari</option>
          <option v-for="h in HARI_PRAKTIK_OPTIONS" :key="h.value" :value="h.value">
            {{ h.label }}
          </option>
        </select>

        <select
          v-model="sesiFilter"
          aria-label="Filter sesi praktik"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Sesi</option>
          <option v-for="s in SESI_PRAKTIK_OPTIONS" :key="s.value" :value="s.value">
            Sesi {{ s.label }}
          </option>
        </select>

        <select
          v-model="statusFilter"
          aria-label="Filter status jadwal"
          :disabled="activeView === 'weekly'"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status</option>
          <option value="Y">Aktif (Y)</option>
          <option value="N">Nonaktif (N)</option>
        </select>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-base-content/5">
        <div>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn btn-ghost btn-xs rounded-lg text-error font-bold"
            @click="clearAllFilters"
          >
            Reset Filter
          </button>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            v-if="activeView === 'list'"
            v-model="sortPreset"
            aria-label="Urutkan jadwal"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="id:DESC">Terbaru (ID ↓)</option>
            <option value="hari:ASC">Hari (Senin → Minggu)</option>
            <option value="jamMulai:ASC">Jam Mulai (Pagi → Malam)</option>
            <option value="kuotaTotal:DESC">Kuota Terbanyak</option>
          </select>

          <select
            v-if="activeView === 'list'"
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
            :disabled="loading || weeklyLoading"
            title="Muat Ulang"
            @click="refreshActiveView"
          >
            <RefreshCw
              class="w-4 h-4 text-base-content/70"
              :class="{ 'animate-spin': loading || weeklyLoading }"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- CONTENT -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm p-4 sm:p-6">
      <!-- VIEW: REKAP MINGGUAN -->
      <JadwalDokterWeeklyBoard
        v-if="activeView === 'weekly'"
        :groups="weeklyGroups"
        :loading="weeklyLoading"
        :can-manage="canManageData"
        @view="openDetailModal"
        @edit="openEditModal"
      />

      <!-- VIEW: DAFTAR JADWAL TERPAGINASI -->
      <template v-else>
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-16 bg-base-200/70 rounded-xl animate-pulse"></div>
        </div>

        <div
          v-else-if="items.length === 0"
          class="py-14 px-4 text-center bg-base-200/20 rounded-2xl border border-dashed border-base-content/15"
        >
          <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <CalendarClock class="w-8 h-8" />
          </div>
          <h3 class="font-bold text-base text-base-content mb-1">
            {{ hasActiveFilters ? "Jadwal dokter tidak ditemukan" : "Belum ada jadwal dokter" }}
          </h3>
          <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
            {{
              hasActiveFilters
                ? "Coba sesuaikan kata kunci atau filter pencarian."
                : "Tambahkan jadwal praktik per hari atau multi-hari untuk dokter dan poliklinik Anda."
            }}
          </p>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn btn-ghost btn-sm rounded-xl font-bold"
            @click="clearAllFilters"
          >
            Reset Filter
          </button>
          <button
            v-else-if="canManageData"
            type="button"
            class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5"
            @click="openCreateModal"
          >
            <Plus class="w-4 h-4" />
            Tambah Jadwal
          </button>
        </div>

        <template v-else>
          <!-- DESKTOP TABLE -->
          <div class="hidden md:block overflow-x-auto">
            <table class="table w-full text-left border-collapse">
              <thead>
                <tr class="bg-base-200/50 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
                  <th class="py-3.5 px-4 w-14 rounded-l-xl">No</th>
                  <th class="py-3.5 px-4">Dokter & Spesialisasi</th>
                  <th class="py-3.5 px-4">Unit / Ruangan</th>
                  <th class="py-3.5 px-4">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 hover:text-primary transition"
                      @click="toggleSort('hari')"
                    >
                      <span>Hari & Jam</span>
                      <ArrowUp v-if="sortBy === 'hari' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                      <ArrowDown v-else-if="sortBy === 'hari' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                      <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                    </button>
                  </th>
                  <th class="py-3.5 px-4">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 hover:text-primary transition"
                      @click="toggleSort('kuotaTotal')"
                    >
                      <span>Kuota</span>
                      <ArrowUp v-if="sortBy === 'kuotaTotal' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                      <ArrowDown v-else-if="sortBy === 'kuotaTotal' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                      <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                    </button>
                  </th>
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
                  <td class="py-3.5 px-4">
                    <div class="font-bold text-base-content">{{ getDokterDisplayName(item) }}</div>
                    <div class="text-[11px] text-base-content/60 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span class="font-mono">{{ item.dokter?.kodeDokter || "-" }}</span>
                      <span v-if="item.dokter?.spesialisasi">• {{ item.dokter.spesialisasi }}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-xs space-y-0.5">
                    <div class="font-semibold text-base-content">{{ item.unit?.nama || "-" }}</div>
                    <div class="text-[11px] text-base-content/60">
                      <span class="font-mono">{{ item.unit?.kode || "-" }}</span>
                      <span v-if="item.ruangan"> • {{ item.ruangan }}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-xs space-y-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        class="text-[11px] font-bold px-2 py-0.5 rounded-md border"
                        :class="getHariPraktikBadgeClass(item.hari)"
                      >
                        {{ item.hariLabel || getOptionLabel(HARI_PRAKTIK_OPTIONS, item.hari) }}
                      </span>
                      <span
                        v-if="item.sesi"
                        class="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
                        :class="getSesiPraktikBadgeClass(item.sesi)"
                      >
                        {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, item.sesi) }}
                      </span>
                    </div>
                    <div class="font-mono font-bold text-base-content flex items-center gap-1">
                      <Clock class="w-3 h-3 text-primary" />
                      {{ item.jamMulai }} - {{ item.jamSelesai }}
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-xs space-y-0.5">
                    <div class="font-bold text-base-content">
                      Total: <span class="font-mono text-primary">{{ item.kuotaTotal }}</span>
                    </div>
                    <div class="text-[11px] text-base-content/65">
                      JKN <strong class="text-emerald-600">{{ item.kuotaJkn }}</strong> •
                      Non <strong class="text-sky-600">{{ item.kuotaNonJkn }}</strong>
                      <template v-if="item.durasiPerPasien">
                        • {{ item.durasiPerPasien }}m
                      </template>
                    </div>
                  </td>
                  <td class="py-3.5 px-4">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition"
                      :class="[
                        item.status === 'Y'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20',
                        canManageData ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-80',
                      ]"
                      :disabled="!canManageData || togglingId === item.id"
                      @click="handleToggleStatus(item)"
                    >
                      <span v-if="togglingId === item.id" class="loading loading-spinner loading-xs"></span>
                      <CheckCircle2 v-else-if="item.status === 'Y'" class="w-3.5 h-3.5" />
                      <XCircle v-else class="w-3.5 h-3.5" />
                      <span>{{ item.status === "Y" ? "Aktif" : "Nonaktif" }}</span>
                    </button>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="inline-flex items-center gap-1">
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-info hover:bg-info/10"
                        title="Lihat Detail"
                        @click="openDetailModal(item)"
                      >
                        <Eye class="w-4 h-4" />
                      </button>
                      <button
                        v-if="canManageData"
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-primary hover:bg-primary/10"
                        title="Ubah Status & Catatan"
                        @click="openStatusModal(item)"
                      >
                        <RefreshCw class="w-4 h-4" />
                      </button>
                      <button
                        v-if="canManageData"
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-warning hover:bg-warning/10"
                        title="Edit Jadwal"
                        @click="openEditModal(item)"
                      >
                        <Pencil class="w-4 h-4" />
                      </button>
                      <button
                        v-if="canDeleteData"
                        type="button"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-error hover:bg-error/10"
                        title="Hapus Jadwal"
                        @click="handleDelete(item)"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
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
                    <span
                      class="text-[11px] font-bold px-2 py-0.5 rounded-md border"
                      :class="getHariPraktikBadgeClass(item.hari)"
                    >
                      {{ item.hariLabel || getOptionLabel(HARI_PRAKTIK_OPTIONS, item.hari) }}
                    </span>
                    <span
                      v-if="item.sesi"
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
                      :class="getSesiPraktikBadgeClass(item.sesi)"
                    >
                      {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, item.sesi) }}
                    </span>
                    <span class="font-mono text-xs font-extrabold text-primary">
                      {{ item.jamMulai }} - {{ item.jamSelesai }}
                    </span>
                  </div>
                  <h4 class="font-bold text-sm text-base-content truncate mt-1.5">
                    {{ getDokterDisplayName(item) }}
                  </h4>
                  <p class="text-[11px] text-base-content/65 truncate">
                    {{ item.unit?.nama || "-" }}
                    <template v-if="item.ruangan"> • {{ item.ruangan }}</template>
                  </p>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border shrink-0"
                  :class="
                    item.status === 'Y'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  "
                  :disabled="!canManageData || togglingId === item.id"
                  @click="handleToggleStatus(item)"
                >
                  {{ item.status === "Y" ? "Aktif" : "Nonaktif" }}
                </button>
              </div>

              <div class="grid grid-cols-3 gap-1.5 text-[11px] text-base-content/70 pt-2 border-t border-base-content/10">
                <div>JKN: <strong class="text-emerald-600">{{ item.kuotaJkn }}</strong></div>
                <div>Non-JKN: <strong class="text-sky-600">{{ item.kuotaNonJkn }}</strong></div>
                <div class="text-right">Total: <strong class="text-base-content">{{ item.kuotaTotal }}</strong></div>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost flex-1 rounded-xl border border-base-content/10 gap-1"
                  @click="openDetailModal(item)"
                >
                  <Eye class="w-3.5 h-3.5" />
                  Detail
                </button>
                <button
                  v-if="canManageData"
                  type="button"
                  class="btn btn-xs btn-ghost rounded-xl border border-base-content/10 gap-1 text-primary"
                  @click="openStatusModal(item)"
                >
                  <RefreshCw class="w-3.5 h-3.5" />
                  Status
                </button>
                <button
                  v-if="canManageData"
                  type="button"
                  class="btn btn-xs btn-outline btn-warning rounded-xl gap-1"
                  @click="openEditModal(item)"
                >
                  <Pencil class="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  v-if="canDeleteData"
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded-xl px-2.5"
                  aria-label="Hapus jadwal"
                  @click="handleDelete(item)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
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
      </template>
    </div>

    <!-- MODALS -->
    <JadwalDokterFormModal
      :show="showFormModal"
      :edit-id="editingId"
      :preset-dokter-id="dokterIdFilter ? Number(dokterIdFilter) : null"
      :preset-unit-id="unitIdFilter ? Number(unitIdFilter) : null"
      :preset-hari="hariFilter || null"
      @close="showFormModal = false"
      @saved="refreshActiveView"
    />

    <JadwalDokterDetailModal
      :show="showDetailModal"
      :jadwal-id="detailId"
      :can-manage="canManageData"
      @close="showDetailModal = false"
      @edit="openEditModal"
      @change-status="openStatusModal"
    />

    <JadwalDokterStatusModal
      :show="showStatusModal"
      :jadwal="statusTarget"
      @close="showStatusModal = false"
      @updated="refreshActiveView"
    />
  </div>
</template>

