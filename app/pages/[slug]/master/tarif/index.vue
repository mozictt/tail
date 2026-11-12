<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeDollarSign,
  CheckCircle2,
  Coins,
  FlaskConical,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Scan,
  Search,
  Stethoscope,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import TarifTindakanFormModal from "@/components/master/TarifTindakanFormModal.vue";
import TarifHargaMatrixModal from "@/components/master/TarifHargaMatrixModal.vue";
import { TarifService } from "@/services/tarif.service";
import { UnitService } from "@/services/unit.service";
import { PenjaminService } from "@/services/penjamin.service";
import { KelasService } from "@/services/kelas.service";
import { useCurrency } from "@/composables/useCurrency";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  getJenisTarifBadgeClass,
  getJenisTarifShortLabel,
  JenisTarif,
  type KelasOptionItem,
  type PenjaminOptionItem,
  type TarifTindakanItem,
  type UnitOptionItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Master Data Tarif Tindakan",
});

const tarifService = TarifService();
const unitService = UnitService();
const penjaminService = PenjaminService();
const kelasService = KelasService();
const { formatRupiah } = useCurrency();
const { showToast } = useToast();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/master/tarif";
const RESOURCE_NAME = "Tarif";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

type SortField = "id" | "kode" | "nama" | "jenisTarif" | "createdAt";

const items = ref<TarifTindakanItem[]>([]);
const unitOptions = ref<UnitOptionItem[]>([]);
const penjaminOptions = ref<PenjaminOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);

const loading = ref(false);
const searchQuery = ref("");
const jenisTarifFilter = ref<JenisTarif | "">("");
const unitIdFilter = ref<number | "">("");
const penjaminIdFilter = ref<number | "">("");
const kelasIdFilter = ref<number | "">("");
const statusFilter = ref<MasterStatus | "">("");
const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<SortField>("id");
const sortType = ref<"ASC" | "DESC">("DESC");
const togglingId = ref<number | null>(null);

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    const allowed: SortField[] = ["id", "kode", "nama", "jenisTarif", "createdAt"];
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
      jenisTarifFilter.value ||
      unitIdFilter.value ||
      penjaminIdFilter.value ||
      kelasIdFilter.value ||
      statusFilter.value,
  ),
);

const loadReferenceOptions = async () => {
  const [unitRes, penjaminRes, kelasRes] = await Promise.allSettled([
    unitService.getUnitOptions(),
    penjaminService.getPenjaminOptions(),
    kelasService.getKelasOptions(),
  ]);
  if (unitRes.status === "fulfilled") unitOptions.value = unitRes.value;
  if (penjaminRes.status === "fulfilled") penjaminOptions.value = penjaminRes.value;
  if (kelasRes.status === "fulfilled") kelasOptions.value = kelasRes.value;
};

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await tarifService.getTarif({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim() || undefined,
      jenisTarif: jenisTarifFilter.value || undefined,
      unitId: unitIdFilter.value ? Number(unitIdFilter.value) : undefined,
      penjaminId: penjaminIdFilter.value
        ? Number(penjaminIdFilter.value)
        : undefined,
      kelasId: kelasIdFilter.value ? Number(kelasIdFilter.value) : undefined,
      status: statusFilter.value || undefined,
      sortBy: sortBy.value,
      sortType: sortType.value,
    });
    items.value = res.items;
    totalItems.value = res.meta.totalItems;
    totalPages.value = res.meta.totalPages;
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat daftar master tarif"),
      "error",
    );
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
  }, 350);
});

watch(
  [jenisTarifFilter, unitIdFilter, penjaminIdFilter, kelasIdFilter, statusFilter],
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

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchItems();
};

const handleLimitChange = () => {
  currentPage.value = 1;
  fetchItems();
};

const clearAllFilters = () => {
  if (filterTimer) clearTimeout(filterTimer);
  searchQuery.value = "";
  jenisTarifFilter.value = "";
  unitIdFilter.value = "";
  penjaminIdFilter.value = "";
  kelasIdFilter.value = "";
  statusFilter.value = "";
  currentPage.value = 1;
  fetchItems();
};

const toggleSort = (field: SortField) => {
  if (sortBy.value === field) {
    sortType.value = sortType.value === "ASC" ? "DESC" : "ASC";
  } else {
    sortBy.value = field;
    sortType.value = "ASC";
  }
  currentPage.value = 1;
  fetchItems();
};

const handleToggleStatus = async (item: TarifTindakanItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah status tarif", "error");
    return;
  }
  const nextStatus: MasterStatus = item.status === "Y" ? "N" : "Y";
  togglingId.value = item.id;
  try {
    await tarifService.updateTarif(item.id, { status: nextStatus });
    item.status = nextStatus;
    showToast(
      `Tarif "${item.nama}" ${nextStatus === "Y" ? "diaktifkan" : "dinonaktifkan"}`,
      "success",
    );
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memperbarui status tarif"),
      "error",
    );
  } finally {
    togglingId.value = null;
  }
};

const showFormModal = ref(false);
const editingId = ref<number | null>(null);
const showMatrixModal = ref(false);
const matrixTindakanId = ref<number | null>(null);

const openCreateModal = () => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk menambah tarif", "error");
    return;
  }
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (item: TarifTindakanItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah tarif", "error");
    return;
  }
  editingId.value = item.id;
  showFormModal.value = true;
};

const openMatrixModal = (item: TarifTindakanItem) => {
  matrixTindakanId.value = item.id;
  showMatrixModal.value = true;
};

const handleSavedTindakan = async (saved: TarifTindakanItem) => {
  const wasCreate = !editingId.value;
  await fetchItems();
  // Jika baru dibuat dan belum sempat setting harga, bisa langsung tawarkan atau buka matriks
  if (wasCreate && (saved.daftarHarga?.length ?? 0) === 0) {
    matrixTindakanId.value = saved.id;
    showMatrixModal.value = true;
  }
};

const handleDelete = async (item: TarifTindakanItem) => {
  if (!canDeleteData.value) {
    showToast("Anda tidak memiliki akses untuk menghapus tarif", "error");
    return;
  }

  const confirm = await Swal.fire({
    title: "Hapus Master Tarif?",
    text: `Tindakan "${item.nama}" (${item.kode}) beserta aturan matriks harganya akan dihapus.`,
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
    await tarifService.deleteTarif(item.id);
    showToast(`Master tarif "${item.nama}" berhasil dihapus`, "success");
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await fetchItems();
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menghapus master tarif"),
      "error",
    );
  }
};

const formatRange = (minVal?: number | null, maxVal?: number | null): string => {
  if (minVal === null || minVal === undefined) return "Belum diatur";
  if (maxVal === null || maxVal === undefined || minVal === maxVal) {
    return formatRupiah(minVal);
  }
  return `${formatRupiah(minVal)} – ${formatRupiah(maxVal)}`;
};

const getMetadataBadge = (item: TarifTindakanItem): string | null => {
  const meta = item.atributKhusus;
  if (!meta) return null;
  if (item.jenisTarif === JenisTarif.LABORATORIUM) {
    const parts = [
      meta.spesimen ? `Spesimen: ${meta.spesimen}` : "",
      meta.butuhPuasa ? "Puasa" : "",
      meta.estimasiHasilJam !== undefined
        ? `${meta.estimasiHasilJam} jam`
        : "",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" • ") : null;
  }
  if (item.jenisTarif === JenisTarif.RADIOLOGI) {
    const parts = [
      meta.modalitas || "",
      meta.proyeksi || "",
      meta.butuhKontras ? "Dengan Kontras" : "",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" • ") : null;
  }
  return null;
};

onMounted(() => {
  loadReferenceOptions();
  fetchItems();
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
            <BadgeDollarSign class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Master Data Tarif Tindakan
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Tindakan
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola tarif Biasa, Laboratorium, & Radiologi berdasarkan Unit, Penjamin, & Kelas beserta nominal Jasa Dokter dan Nakes
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
          <span>Tambah Tarif</span>
        </button>
      </div>
    </div>

    <!-- FILTER & CATEGORY TABS -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <!-- Category Quick Tabs -->
      <div class="flex flex-wrap items-center gap-1.5 border-b border-base-content/5 pb-3">
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="
            jenisTarifFilter === ''
              ? 'btn-primary'
              : 'btn-ghost text-base-content/70'
          "
          @click="jenisTarifFilter = ''"
        >
          <Layers class="w-3.5 h-3.5" />
          Semua Kategori
        </button>
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="
            jenisTarifFilter === JenisTarif.BIASA
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300'
              : 'btn-ghost text-base-content/70'
          "
          @click="jenisTarifFilter = JenisTarif.BIASA"
        >
          <Stethoscope class="w-3.5 h-3.5" />
          Tarif Biasa
        </button>
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="
            jenisTarifFilter === JenisTarif.LABORATORIUM
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
              : 'btn-ghost text-base-content/70'
          "
          @click="jenisTarifFilter = JenisTarif.LABORATORIUM"
        >
          <FlaskConical class="w-3.5 h-3.5" />
          Laboratorium
        </button>
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="
            jenisTarifFilter === JenisTarif.RADIOLOGI
              ? 'bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300'
              : 'btn-ghost text-base-content/70'
          "
          @click="jenisTarifFilter = JenisTarif.RADIOLOGI"
        >
          <Scan class="w-3.5 h-3.5" />
          Radiologi
        </button>
      </div>

      <!-- Filter Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div class="relative lg:col-span-2">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kode, nama tindakan, kelompok, ICD-9/LOINC..."
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
          aria-label="Filter Unit"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Unit</option>
          <option v-for="u in unitOptions" :key="u.id" :value="u.id">
            {{ u.nama }}
          </option>
        </select>

        <select
          v-model="penjaminIdFilter"
          aria-label="Filter Penjamin"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Penjamin</option>
          <option v-for="p in penjaminOptions" :key="p.id" :value="p.id">
            {{ p.nama }}
          </option>
        </select>

        <div class="flex gap-2">
          <select
            v-model="kelasIdFilter"
            aria-label="Filter Kelas"
            class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
          >
            <option value="">Semua Kelas</option>
            <option v-for="k in kelasOptions" :key="k.id" :value="k.id">
              {{ k.nama }}
            </option>
          </select>

          <select
            v-model="statusFilter"
            aria-label="Filter Status"
            class="select select-bordered select-sm w-28 rounded-xl text-xs font-semibold"
          >
            <option value="">Status</option>
            <option value="Y">Aktif</option>
            <option value="N">Nonaktif</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-base-content/5">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-ghost btn-xs rounded-lg gap-1 text-base-content/60"
            @click="fetchItems"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
            Muat Ulang
          </button>
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
            aria-label="Urutkan tarif"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="id:DESC">Terbaru (ID ↓)</option>
            <option value="nama:ASC">Nama (A → Z)</option>
            <option value="kode:ASC">Kode (A → Z)</option>
            <option value="jenisTarif:ASC">Kategori (A → Z)</option>
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
        </div>
      </div>
    </div>

    <!-- DATA CONTENT -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm overflow-hidden">
      <div v-if="loading && items.length === 0" class="p-6 space-y-3 animate-pulse">
        <div v-for="i in 5" :key="i" class="h-14 bg-base-200 rounded-xl"></div>
      </div>

      <div v-else-if="items.length === 0" class="p-10 text-center">
        <BadgeDollarSign class="w-12 h-12 mx-auto text-base-content/25 mb-3" />
        <p class="font-bold text-base-content/80">Belum ada data master tarif</p>
        <p class="text-xs text-base-content/50 mt-1">
          Tambahkan tindakan Biasa, Laboratorium, atau Radiologi lalu atur matriks harganya per Unit, Penjamin, & Kelas.
        </p>
      </div>

      <template v-else>
        <!-- DESKTOP TABLE -->
        <div class="hidden md:block overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr class="bg-base-200/60 text-xs uppercase tracking-wider text-base-content/60">
                <th class="py-3.5 px-4 cursor-pointer" @click="toggleSort('kode')">
                  <div class="flex items-center gap-1">
                    Kode
                    <ArrowUp v-if="sortBy === 'kode' && sortType === 'ASC'" class="w-3.5 h-3.5" />
                    <ArrowDown v-else-if="sortBy === 'kode' && sortType === 'DESC'" class="w-3.5 h-3.5" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </div>
                </th>
                <th class="py-3.5 px-4 cursor-pointer" @click="toggleSort('nama')">
                  <div class="flex items-center gap-1">
                    Nama Tindakan / Layanan
                    <ArrowUp v-if="sortBy === 'nama' && sortType === 'ASC'" class="w-3.5 h-3.5" />
                    <ArrowDown v-else-if="sortBy === 'nama' && sortType === 'DESC'" class="w-3.5 h-3.5" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </div>
                </th>
                <th class="py-3.5 px-4">Kategori</th>
                <th class="py-3.5 px-4">Rentang Total Tarif</th>
                <th class="py-3.5 px-4">Jasa Dokter & Nakes</th>
                <th class="py-3.5 px-4 text-center">Status</th>
                <th class="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-base-content/5 text-sm">
              <tr
                v-for="item in items"
                :key="item.id"
                class="hover:bg-base-200/35 transition"
              >
                <td class="py-3.5 px-4 align-top">
                  <span class="font-mono font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    {{ item.kode }}
                  </span>
                  <div v-if="item.kodeEksternal" class="text-[11px] font-mono text-base-content/50 mt-1">
                    Ref: {{ item.kodeEksternal }}
                  </div>
                </td>

                <td class="py-3.5 px-4 align-top">
                  <div class="font-bold text-base-content">{{ item.nama }}</div>
                  <div class="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-base-content/60">
                    <span v-if="item.kelompokTarif" class="badge badge-xs badge-ghost rounded-md">
                      {{ item.kelompokTarif }}
                    </span>
                    <span>• Satuan: {{ item.satuan }}</span>
                  </div>
                  <div
                    v-if="getMetadataBadge(item)"
                    class="text-[11px] text-base-content/60 mt-1"
                  >
                    {{ getMetadataBadge(item) }}
                  </div>
                </td>

                <td class="py-3.5 px-4 align-top">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold"
                    :class="getJenisTarifBadgeClass(item.jenisTarif)"
                  >
                    {{ getJenisTarifShortLabel(item.jenisTarif) }}
                  </span>
                </td>

                <td class="py-3.5 px-4 align-top">
                  <div class="font-extrabold text-primary tabular-nums text-xs sm:text-sm">
                    {{ formatRange(item.tarifTerendah, item.tarifTertinggi) }}
                  </div>
                  <button
                    type="button"
                    class="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                    @click="openMatrixModal(item)"
                  >
                    <Coins class="w-3 h-3" />
                    <span>{{ item.jumlahTarifAktif ?? 0 }} aturan aktif ({{ item.jumlahTarif ?? 0 }} total)</span>
                  </button>
                </td>

                <td class="py-3.5 px-4 align-top text-xs space-y-1">
                  <div class="flex items-center justify-between gap-2 max-w-[230px]">
                    <span class="text-sky-600 dark:text-sky-400 font-semibold">Dokter:</span>
                    <span class="font-bold tabular-nums">
                      {{ formatRange(item.jasaDokterMin, item.jasaDokterMax) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-2 max-w-[230px]">
                    <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Nakes:</span>
                    <span class="font-bold tabular-nums">
                      {{ formatRange(item.jasaNakesMin, item.jasaNakesMax) }}
                    </span>
                  </div>
                </td>

                <td class="py-3.5 px-4 align-top text-center">
                  <button
                    type="button"
                    class="btn btn-xs rounded-full px-3 font-bold gap-1"
                    :class="
                      item.status === 'Y'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                    "
                    :disabled="!canManageData || togglingId === item.id"
                    @click="handleToggleStatus(item)"
                  >
                    <CheckCircle2 v-if="item.status === 'Y'" class="w-3.5 h-3.5" />
                    <XCircle v-else class="w-3.5 h-3.5" />
                    <span>{{ item.status === "Y" ? "Aktif" : "Nonaktif" }}</span>
                  </button>
                </td>

                <td class="py-3.5 px-4 align-top text-right">
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      class="btn btn-xs btn-primary btn-outline rounded-lg font-bold gap-1"
                      title="Atur Matriks Tarif Unit/Penjamin/Kelas & Simulasi"
                      @click="openMatrixModal(item)"
                    >
                      <Coins class="w-3.5 h-3.5" />
                      <span>Atur Harga</span>
                    </button>
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-xs btn-ghost btn-square rounded-lg text-base-content/60 hover:text-primary"
                      title="Edit Tindakan"
                      @click="openEditModal(item)"
                    >
                      <Pencil class="w-4 h-4" />
                    </button>
                    <button
                      v-if="canDeleteData"
                      type="button"
                      class="btn btn-xs btn-ghost btn-square rounded-lg text-base-content/60 hover:text-error"
                      title="Hapus Tindakan"
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
        <div class="md:hidden divide-y divide-base-content/10">
          <div
            v-for="item in items"
            :key="item.id"
            class="p-4 space-y-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 mb-1">
                  <span class="font-mono font-bold text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {{ item.kode }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-md border text-[11px] font-bold"
                    :class="getJenisTarifBadgeClass(item.jenisTarif)"
                  >
                    {{ getJenisTarifShortLabel(item.jenisTarif) }}
                  </span>
                </div>
                <h3 class="font-bold text-sm text-base-content">{{ item.nama }}</h3>
                <p v-if="item.kelompokTarif" class="text-xs text-base-content/60">
                  {{ item.kelompokTarif }} • {{ item.satuan }}
                </p>
              </div>
              <button
                type="button"
                class="btn btn-xs rounded-full px-2.5 font-bold shrink-0"
                :class="
                  item.status === 'Y'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                "
                :disabled="!canManageData || togglingId === item.id"
                @click="handleToggleStatus(item)"
              >
                {{ item.status === "Y" ? "Aktif" : "Nonaktif" }}
              </button>
            </div>

            <div class="bg-base-200/40 rounded-xl p-3 text-xs space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-base-content/60">Total Tarif:</span>
                <strong class="text-primary tabular-nums">
                  {{ formatRange(item.tarifTerendah, item.tarifTertinggi) }}
                </strong>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sky-600 dark:text-sky-400">Jasa Dokter:</span>
                <strong class="tabular-nums">{{ formatRange(item.jasaDokterMin, item.jasaDokterMax) }}</strong>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-emerald-600 dark:text-emerald-400">Jasa Nakes:</span>
                <strong class="tabular-nums">{{ formatRange(item.jasaNakesMin, item.jasaNakesMax) }}</strong>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                class="btn btn-xs btn-primary btn-outline rounded-lg font-bold gap-1 flex-1"
                @click="openMatrixModal(item)"
              >
                <Coins class="w-3.5 h-3.5" />
                Atur Harga ({{ item.jumlahTarifAktif ?? 0 }})
              </button>
              <button
                v-if="canManageData"
                type="button"
                class="btn btn-xs btn-ghost rounded-lg"
                @click="openEditModal(item)"
              >
                <Pencil class="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                v-if="canDeleteData"
                type="button"
                class="btn btn-xs btn-ghost text-error rounded-lg"
                @click="handleDelete(item)"
              >
                <Trash2 class="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- PAGINATION -->
      <div
        v-if="totalPages > 1 || totalItems > 0"
        class="p-4 border-t border-base-content/10 bg-base-200/20"
      >
        <AppPagination
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-items="totalItems"
          :limit="limit"
          @page-change="handlePageChange"
        />
      </div>
    </div>

    <!-- MODALS -->
    <TarifTindakanFormModal
      :show="showFormModal"
      :edit-id="editingId"
      :initial-jenis-tarif="jenisTarifFilter"
      @close="showFormModal = false"
      @saved="handleSavedTindakan"
    />

    <TarifHargaMatrixModal
      :show="showMatrixModal"
      :tindakan-id="matrixTindakanId"
      :can-manage="canManageData"
      :can-delete="canDeleteData"
      @close="showMatrixModal = false"
      @updated="fetchItems"
    />
  </div>
</template>

