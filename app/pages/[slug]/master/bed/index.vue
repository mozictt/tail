<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BedDouble,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import BedFormModal from "@/components/master/BedFormModal.vue";
import BedStatusModal from "@/components/master/BedStatusModal.vue";
import BedDetailModal from "@/components/master/BedDetailModal.vue";
import { BedService } from "@/services/bed.service";
import { UnitService } from "@/services/unit.service";
import { KelasService } from "@/services/kelas.service";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  getOptionLabel,
  getStatusKetersediaanBedBadgeClass,
  STATUS_KETERSEDIAAN_BED_OPTIONS,
  StatusKetersediaanBed,
  type BedItem,
  type BedSummaryItem,
  type KelasOptionItem,
  type UnitOptionItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Master Data Bed",
});

const bedService = BedService();
const unitService = UnitService();
const kelasService = KelasService();
const { showToast } = useToast();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/master/bed";
const RESOURCE_NAME = "Bed";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

type SortField =
  | "id"
  | "kode"
  | "nama"
  | "namaKamar"
  | "statusKetersediaan"
  | "createdAt";

const items = ref<BedItem[]>([]);
const summaryRows = ref<BedSummaryItem[]>([]);
const unitOptions = ref<UnitOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);
const showSummaryBreakdown = ref(false);
const loading = ref(false);
const searchQuery = ref("");
const unitIdFilter = ref<number | "">("");
const kelasIdFilter = ref<number | "">("");
const statusKetersediaanFilter = ref<StatusKetersediaanBed | "">("");
const isolasiFilter = ref<"" | "true" | "false">("");
const statusFilter = ref<MasterStatus | "">("");
const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<SortField>("id");
const sortType = ref<"ASC" | "DESC">("DESC");
const togglingId = ref<number | null>(null);

const summaryTotals = computed(() =>
  summaryRows.value.reduce(
    (acc, row) => ({
      totalBed: acc.totalBed + row.totalBed,
      kosong: acc.kosong + row.kosong,
      terisi: acc.terisi + row.terisi,
      booking: acc.booking + row.booking,
      pembersihan: acc.pembersihan + row.pembersihan,
      perbaikan: acc.perbaikan + row.perbaikan,
    }),
    {
      totalBed: 0,
      kosong: 0,
      terisi: 0,
      booking: 0,
      pembersihan: 0,
      perbaikan: 0,
    },
  ),
);

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    const allowed: SortField[] = [
      "id",
      "kode",
      "nama",
      "namaKamar",
      "statusKetersediaan",
      "createdAt",
    ];
    sortBy.value = allowed.includes(field as SortField)
      ? (field as SortField)
      : "id";
    sortType.value = order === "ASC" ? "ASC" : "DESC";
    currentPage.value = 1;
    fetchItems();
  },
});

const hasActiveFilters = computed(() =>
  Boolean(
    searchQuery.value.trim() ||
      unitIdFilter.value ||
      kelasIdFilter.value ||
      statusKetersediaanFilter.value ||
      isolasiFilter.value ||
      statusFilter.value,
  ),
);

const loadFilterOptions = async () => {
  const [unitRes, kelasRes] = await Promise.allSettled([
    unitService.getUnitOptions({ isTersediaBed: true }),
    kelasService.getKelasOptions(),
  ]);
  if (unitRes.status === "fulfilled") unitOptions.value = unitRes.value;
  if (kelasRes.status === "fulfilled") kelasOptions.value = kelasRes.value;
};

const fetchSummary = async () => {
  try {
    summaryRows.value = await bedService.getBedSummary();
  } catch {
    summaryRows.value = [];
  }
};

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await bedService.getBed({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
      unitId: unitIdFilter.value ? Number(unitIdFilter.value) : undefined,
      kelasId: kelasIdFilter.value ? Number(kelasIdFilter.value) : undefined,
      statusKetersediaan: statusKetersediaanFilter.value,
      isIsolasi:
        isolasiFilter.value === "true"
          ? true
          : isolasiFilter.value === "false"
            ? false
            : "",
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
    showToast(extractApiErrorMessage(err, "Gagal memuat data bed"), "error");
  } finally {
    loading.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([fetchItems(), fetchSummary()]);
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
    unitIdFilter,
    kelasIdFilter,
    statusKetersediaanFilter,
    isolasiFilter,
    statusFilter,
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
  unitIdFilter.value = "";
  kelasIdFilter.value = "";
  statusKetersediaanFilter.value = "";
  isolasiFilter.value = "";
  statusFilter.value = "";
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

const toggleSort = (field: SortField) => {
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

const handleToggleStatus = async (item: BedItem) => {
  if (!canManageData.value || togglingId.value === item.id) return;

  const prevStatus: MasterStatus = item.status === "N" ? "N" : "Y";
  const nextStatus: MasterStatus = prevStatus === "Y" ? "N" : "Y";

  togglingId.value = item.id;
  item.status = nextStatus;

  try {
    await bedService.updateBed(item.id, { status: nextStatus });
    showToast(
      `Status master bed "${item.nama}" diubah menjadi ${nextStatus === "Y" ? "Aktif" : "Nonaktif"}`,
      "success",
    );
    await fetchSummary();
  } catch (err: unknown) {
    item.status = prevStatus;
    showToast(extractApiErrorMessage(err, "Gagal mengubah status bed"), "error");
  } finally {
    togglingId.value = null;
  }
};

const showFormModal = ref(false);
const editingId = ref<number | null>(null);
const showDetailModal = ref(false);
const detailId = ref<number | null>(null);
const showStatusModal = ref(false);
const statusBedTarget = ref<BedItem | null>(null);

const openCreateModal = () => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk menambah bed", "error");
    return;
  }
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (item: BedItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah bed", "error");
    return;
  }
  editingId.value = item.id;
  showFormModal.value = true;
};

const openDetailModal = (item: BedItem) => {
  detailId.value = item.id;
  showDetailModal.value = true;
};

const openStatusModal = (item: BedItem) => {
  if (!canManageData.value) return;
  showDetailModal.value = false;
  statusBedTarget.value = item;
  showStatusModal.value = true;
};

const handleDelete = async (item: BedItem) => {
  if (!canDeleteData.value) {
    showToast("Anda tidak memiliki akses untuk menghapus bed", "error");
    return;
  }

  const confirm = await Swal.fire({
    title: "Hapus Master Bed?",
    text: `Data bed "${item.nama}" (${item.kode}) akan dihapus.`,
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
    await bedService.deleteBed(item.id);
    showToast(`Bed "${item.nama}" berhasil dihapus`, "success");
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await refreshAll();
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, "Gagal menghapus data bed"), "error");
  }
};

onMounted(async () => {
  await Promise.all([loadFilterOptions(), fetchItems(), fetchSummary()]);
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
          <div class="w-12 h-12 rounded-2xl border bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 flex items-center justify-center shrink-0">
            <BedDouble class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Master Data Bed (Tempat Tidur)
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Bed
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola daftar tempat tidur per unit/bangsal, kelas perawatan, kamar isolasi, dan status ketersediaan
            </p>
          </div>
        </div>

        <button
          v-if="canManageData"
          type="button"
          class="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/25 hover:shadow-lg transition gap-2 w-full sm:w-auto shrink-0"
          @click="openCreateModal"
        >
          <Plus class="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Bed</span>
        </button>
      </div>
    </div>

    <!-- SUMMARY AVAILABILITY PANEL (/master/bed/summary) -->
    <div
      v-if="summaryRows.length > 0"
      class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-xs space-y-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-extrabold uppercase tracking-wider text-base-content/60 mr-1">
            Ringkasan Bed Aktif:
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-base-200 font-bold text-base-content">
            Total: {{ summaryTotals.totalBed }}
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
            Kosong: {{ summaryTotals.kosong }}
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold">
            Terisi: {{ summaryTotals.terisi }}
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
            Booking: {{ summaryTotals.booking }}
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20 font-bold">
            Pembersihan: {{ summaryTotals.pembersihan }}
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/25 font-bold">
            Perbaikan: {{ summaryTotals.perbaikan }}
          </span>
        </div>

        <button
          type="button"
          class="btn btn-ghost btn-xs rounded-lg font-bold gap-1 text-primary"
          @click="showSummaryBreakdown = !showSummaryBreakdown"
        >
          <span>{{ showSummaryBreakdown ? "Sembunyikan Rincian" : "Rincian per Unit & Kelas" }}</span>
          <ChevronUp v-if="showSummaryBreakdown" class="w-3.5 h-3.5" />
          <ChevronDown v-else class="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        v-if="showSummaryBreakdown"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-base-content/10"
      >
        <div
          v-for="row in summaryRows"
          :key="`${row.unitId}-${row.kelasId}`"
          class="p-3 rounded-xl bg-base-200/35 border border-base-content/10 text-xs space-y-1.5"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-base-content truncate">{{ row.unitNama }}</span>
            <span class="badge badge-xs badge-primary badge-outline font-bold shrink-0">
              {{ row.kelasNama }}
            </span>
          </div>
          <div class="flex flex-wrap gap-2 text-[11px] text-base-content/70">
            <span>Total: <strong class="text-base-content">{{ row.totalBed }}</strong></span>
            <span class="text-emerald-600">Kosong: <strong>{{ row.kosong }}</strong></span>
            <span class="text-rose-600">Terisi: <strong>{{ row.terisi }}</strong></span>
            <span v-if="row.booking > 0" class="text-amber-600">Booking: <strong>{{ row.booking }}</strong></span>
            <span v-if="row.pembersihan > 0" class="text-sky-600">Bersih: <strong>{{ row.pembersihan }}</strong></span>
            <span v-if="row.perbaikan > 0">Perbaikan: <strong>{{ row.perbaikan }}</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
        <div class="relative sm:col-span-2 lg:col-span-1">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kode, nama bed, kamar, unit..."
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
          v-model="unitIdFilter"
          aria-label="Filter unit bed"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Unit</option>
          <option v-for="u in unitOptions" :key="u.id" :value="u.id">
            {{ u.kode }} — {{ u.nama }}
          </option>
        </select>

        <select
          v-model="kelasIdFilter"
          aria-label="Filter kelas bed"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Kelas</option>
          <option v-for="k in kelasOptions" :key="k.id" :value="k.id">
            {{ k.kode }} — {{ k.nama }}
          </option>
        </select>

        <select
          v-model="statusKetersediaanFilter"
          aria-label="Filter status ketersediaan bed"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Ketersediaan</option>
          <option
            v-for="opt in STATUS_KETERSEDIAAN_BED_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>

        <select
          v-model="isolasiFilter"
          aria-label="Filter bed isolasi"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Ruang</option>
          <option value="true">Khusus Isolasi</option>
          <option value="false">Non-Isolasi</option>
        </select>

        <select
          v-model="statusFilter"
          aria-label="Filter status aktif master bed"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status Master</option>
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
            v-model="sortPreset"
            aria-label="Urutkan bed"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="id:DESC">Terbaru (ID ↓)</option>
            <option value="kode:ASC">Kode Bed (A → Z)</option>
            <option value="nama:ASC">Nama Bed (A → Z)</option>
            <option value="namaKamar:ASC">Nama Kamar (A → Z)</option>
            <option value="statusKetersediaan:ASC">Status Ketersediaan</option>
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
            @click="refreshAll"
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
          <BedDouble class="w-8 h-8" />
        </div>
        <h3 class="font-bold text-base text-base-content mb-1">
          {{ hasActiveFilters ? "Data bed tidak ditemukan" : "Belum ada data bed" }}
        </h3>
        <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
          {{
            hasActiveFilters
              ? "Coba sesuaikan kata kunci atau filter pencarian."
              : "Tambahkan tempat tidur untuk unit rawat inap, IGD, ICU, atau ruang tindakan."
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
          Tambah Bed
        </button>
      </div>

      <template v-else>
        <!-- DESKTOP TABLE -->
        <div class="hidden md:block overflow-x-auto">
          <table class="table w-full text-left border-collapse">
            <thead>
              <tr class="bg-base-200/50 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
                <th class="py-3.5 px-4 w-14 rounded-l-xl">No</th>
                <th class="py-3.5 px-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-primary transition"
                    @click="toggleSort('nama')"
                  >
                    <span>Bed & Kode</span>
                    <ArrowUp v-if="sortBy === 'nama' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'nama' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">Unit, Kamar & Kelas</th>
                <th class="py-3.5 px-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-primary transition"
                    @click="toggleSort('statusKetersediaan')"
                  >
                    <span>Ketersediaan</span>
                    <ArrowUp v-if="sortBy === 'statusKetersediaan' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'statusKetersediaan' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
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
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-base-content">{{ item.nama }}</span>
                    <span
                      v-if="item.isIsolasi"
                      class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20"
                    >
                      <ShieldAlert class="w-3 h-3" /> Isolasi
                    </span>
                  </div>
                  <div class="text-[11px] font-mono text-base-content/60 mt-0.5">
                    {{ item.kode }}
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs space-y-1">
                  <div class="font-semibold text-base-content">
                    {{ item.unit?.nama || "-" }}
                    <span v-if="item.namaKamar" class="text-base-content/65 font-normal">
                      • {{ item.namaKamar }}
                    </span>
                  </div>
                  <div>
                    <span class="badge badge-xs badge-primary badge-outline font-bold py-2 px-2">
                      {{ item.kelas?.nama || "-" }}
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs">
                  <button
                    v-if="canManageData"
                    type="button"
                    class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border hover:opacity-80 transition cursor-pointer"
                    :class="getStatusKetersediaanBedBadgeClass(item.statusKetersediaan)"
                    title="Klik untuk ubah status ketersediaan"
                    @click="openStatusModal(item)"
                  >
                    <span>{{ getOptionLabel(STATUS_KETERSEDIAAN_BED_OPTIONS, item.statusKetersediaan) }}</span>
                    <RefreshCw class="w-3 h-3 opacity-60" />
                  </button>
                  <span
                    v-else
                    class="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-lg border"
                    :class="getStatusKetersediaanBedBadgeClass(item.statusKetersediaan)"
                  >
                    {{ getOptionLabel(STATUS_KETERSEDIAAN_BED_OPTIONS, item.statusKetersediaan) }}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <div v-if="canManageData" class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      class="toggle toggle-success toggle-sm"
                      :checked="item.status === 'Y'"
                      :disabled="togglingId === item.id"
                      :aria-label="`Ubah status ${item.nama}`"
                      @change="handleToggleStatus(item)"
                    />
                    <span
                      class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border"
                      :class="
                        item.status === 'Y'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      "
                    >
                      {{ item.status === "Y" ? "Aktif" : "Nonaktif" }}
                    </span>
                  </div>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border"
                    :class="
                      item.status === 'Y'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    "
                  >
                    <CheckCircle2 v-if="item.status === 'Y'" class="w-3 h-3" />
                    <XCircle v-else class="w-3 h-3" />
                    {{ item.status === "Y" ? "Aktif" : "Nonaktif" }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-info hover:bg-info/10"
                      title="Detail Bed"
                      @click="openDetailModal(item)"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary hover:bg-primary/10"
                      title="Edit Bed"
                      @click="openEditModal(item)"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canDeleteData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10"
                      title="Hapus Bed"
                      @click="handleDelete(item)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
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
            v-for="(item, index) in items"
            :key="item.id"
            class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 space-y-2.5"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[11px] font-mono text-base-content/50">
                  #{{ getRowNumber(index) }} • {{ item.kode }}
                </div>
                <h3 class="font-bold text-sm text-base-content mt-0.5 break-words">
                  {{ item.nama }}
                </h3>
              </div>

              <span
                class="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0"
                :class="getStatusKetersediaanBedBadgeClass(item.statusKetersediaan)"
              >
                {{ item.statusKetersediaan }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 text-[11px] text-base-content/65 pt-2 border-t border-base-content/10">
              <div class="truncate">Unit: <strong class="text-base-content">{{ item.unit?.nama || "-" }}</strong></div>
              <div class="truncate">Kelas: <strong class="text-base-content">{{ item.kelas?.nama || "-" }}</strong></div>
              <div class="truncate">Kamar: {{ item.namaKamar || "-" }}</div>
              <div class="truncate">Isolasi: {{ item.isIsolasi ? "Ya" : "Tidak" }}</div>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                v-if="canManageData"
                type="button"
                class="btn btn-xs btn-outline border-primary/30 text-primary rounded-xl gap-1"
                @click="openStatusModal(item)"
              >
                <RefreshCw class="w-3 h-3" />
                Status
              </button>
              <button
                type="button"
                class="btn btn-xs btn-outline border-base-content/15 flex-1 rounded-xl gap-1"
                @click="openDetailModal(item)"
              >
                <Eye class="w-3.5 h-3.5 text-info" />
                Detail
              </button>
              <button
                v-if="canManageData"
                type="button"
                class="btn btn-xs btn-outline border-base-content/15 flex-1 rounded-xl gap-1"
                @click="openEditModal(item)"
              >
                <Pencil class="w-3.5 h-3.5 text-primary" />
                Edit
              </button>
              <button
                v-if="canDeleteData"
                type="button"
                class="btn btn-xs btn-outline border-error/30 text-error flex-1 rounded-xl gap-1"
                @click="handleDelete(item)"
              >
                <Trash2 class="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </div>

        <AppPagination
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-items="totalItems"
          :limit="limit"
          item-unit="Bed"
          @change-page="handlePageChange"
        />
        <div
          v-else
          class="flex items-center justify-between pt-4 mt-4 border-t border-base-content/10 text-xs text-base-content/60 font-medium"
        >
          <span>
            Menampilkan <strong class="text-base-content">{{ items.length }}</strong> dari
            <strong class="text-base-content">{{ totalItems }}</strong> Bed
          </span>
          <span>Halaman 1 dari 1</span>
        </div>
      </template>
    </div>

    <BedFormModal
      :show="showFormModal"
      :edit-id="editingId"
      @close="showFormModal = false"
      @saved="refreshAll"
    />

    <BedStatusModal
      :show="showStatusModal"
      :bed="statusBedTarget"
      @close="showStatusModal = false"
      @updated="refreshAll"
    />

    <BedDetailModal
      :show="showDetailModal"
      :bed-id="detailId"
      :can-manage-status="canManageData"
      @close="showDetailModal = false"
      @change-status="openStatusModal"
    />
  </div>
</template>

