<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  Eye,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import PegawaiFormModal from "@/components/master/PegawaiFormModal.vue";
import PegawaiDetailModal from "@/components/master/PegawaiDetailModal.vue";
import { PegawaiService, type PegawaiItem } from "@/services/pegawai.service";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  getOptionLabel,
  STATUS_AKTIF_PEGAWAI_OPTIONS,
  STATUS_KEPEGAWAIAN_OPTIONS,
  StatusAktifPegawai,
  type StatusKepegawaian,
} from "@/types/simrs";

const pegawaiService = PegawaiService();
const { showToast } = useToast();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/pegawai";
const RESOURCE_NAME = "Pegawai";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

type SortField =
  | "createdAt"
  | "nip"
  | "name"
  | "position"
  | "statusKepegawaian"
  | "statusAktif";

const items = ref<PegawaiItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const positionFilter = ref("");
const unitKerjaFilter = ref("");
const statusKepegawaianFilter = ref<StatusKepegawaian | "">("");
const statusAktifFilter = ref<StatusAktifPegawai | "">("");
const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<SortField>("createdAt");
const sortType = ref<"ASC" | "DESC">("DESC");

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    const allowed: SortField[] = [
      "createdAt",
      "nip",
      "name",
      "position",
      "statusKepegawaian",
      "statusAktif",
    ];
    sortBy.value = allowed.includes(field as SortField)
      ? (field as SortField)
      : "createdAt";
    sortType.value = order === "ASC" ? "ASC" : "DESC";
    currentPage.value = 1;
    fetchItems();
  },
});

const hasActiveFilters = computed(() =>
  Boolean(
    searchQuery.value.trim() ||
      positionFilter.value.trim() ||
      unitKerjaFilter.value.trim() ||
      statusKepegawaianFilter.value ||
      statusAktifFilter.value,
  ),
);

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await pegawaiService.getPegawai({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
      position: positionFilter.value.trim(),
      unitKerja: unitKerjaFilter.value.trim(),
      statusKepegawaian: statusKepegawaianFilter.value,
      statusAktif: statusAktifFilter.value,
      sortBy: sortBy.value,
      sortType: sortType.value,
    });

    items.value = res.array ?? [];
    totalItems.value = res.totalItems ?? items.value.length;
    totalPages.value = res.totalPages || 1;
    currentPage.value = res.currentPage || currentPage.value;
  } catch (err: any) {
    items.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
    showToast(extractApiErrorMessage(err, "Gagal memuat data pegawai"), "error");
  } finally {
    loading.value = false;
  }
};

let filterTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleFilterFetch = () => {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchItems();
  }, 400);
};

watch([searchQuery, positionFilter, unitKerjaFilter], scheduleFilterFetch);

watch([statusKepegawaianFilter, statusAktifFilter], () => {
  currentPage.value = 1;
  fetchItems();
});

const clearAllFilters = () => {
  if (filterTimer) clearTimeout(filterTimer);
  searchQuery.value = "";
  positionFilter.value = "";
  unitKerjaFilter.value = "";
  statusKepegawaianFilter.value = "";
  statusAktifFilter.value = "";
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
    sortType.value = field === "createdAt" ? "DESC" : "ASC";
  }
  currentPage.value = 1;
  fetchItems();
};

const getRowNumber = (index: number) => (currentPage.value - 1) * limit.value + index + 1;

const getStatusAktifBadgeClass = (status?: StatusAktifPegawai | string) => {
  switch (status) {
    case StatusAktifPegawai.AKTIF:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case StatusAktifPegawai.CUTI:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case StatusAktifPegawai.PENSIUN:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20";
    default:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  }
};

/* =========================
   MODALS
========================= */
const showFormModal = ref(false);
const editingId = ref<number | null>(null);
const showDetailModal = ref(false);
const detailId = ref<number | null>(null);

const openCreateModal = () => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk menambah pegawai", "error");
    return;
  }
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (item: PegawaiItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah pegawai", "error");
    return;
  }
  editingId.value = item.id;
  showFormModal.value = true;
};

const openDetailModal = (item: PegawaiItem) => {
  detailId.value = item.id;
  showDetailModal.value = true;
};

const handleDelete = async (item: PegawaiItem) => {
  if (!canDeleteData.value) {
    showToast("Anda tidak memiliki akses untuk menghapus pegawai", "error");
    return;
  }

  const confirm = await Swal.fire({
    title: "Hapus Pegawai?",
    text: `Data pegawai "${item.name}" (NIP ${item.nip}) akan dihapus.`,
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
    await pegawaiService.deletePegawai(item.id);
    showToast(`Data pegawai "${item.name}" berhasil dihapus`, "success");
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await fetchItems();
  } catch (err: any) {
    showToast(extractApiErrorMessage(err, "Gagal menghapus data pegawai"), "error");
  }
};

onMounted(() => {
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
          <div class="w-12 h-12 rounded-2xl border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 flex items-center justify-center shrink-0">
            <Users class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Manajemen Data Pegawai
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Pegawai
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola profil kepegawaian, unit kerja, status aktif, dan tautan data penduduk
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
          <span>Tambah Pegawai</span>
        </button>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari NIP atau nama pegawai..."
            class="input input-bordered input-sm w-full pl-10 pr-8 rounded-xl text-xs bg-base-200/40 focus:bg-base-100"
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

        <input
          v-model="unitKerjaFilter"
          type="text"
          placeholder="Filter unit kerja..."
          class="input input-bordered input-sm w-full rounded-xl text-xs bg-base-200/40 focus:bg-base-100"
        />

        <select
          v-model="statusKepegawaianFilter"
          aria-label="Filter status kepegawaian"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status Kepegawaian</option>
          <option
            v-for="opt in STATUS_KEPEGAWAIAN_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>

        <select
          v-model="statusAktifFilter"
          aria-label="Filter status aktif"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status Aktif</option>
          <option
            v-for="opt in STATUS_AKTIF_PEGAWAI_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-base-content/5">
        <div class="flex items-center gap-2 flex-1 min-w-[200px] sm:flex-none">
          <input
            v-model="positionFilter"
            type="text"
            placeholder="Filter jabatan (eksak)..."
            class="input input-bordered input-sm rounded-xl text-xs w-full sm:w-52 bg-base-200/40 focus:bg-base-100"
          />
          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn btn-ghost btn-xs rounded-lg text-error font-bold"
            @click="clearAllFilters"
          >
            Reset
          </button>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            v-model="sortPreset"
            aria-label="Urutkan pegawai"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="createdAt:DESC">Terbaru</option>
            <option value="name:ASC">Nama (A → Z)</option>
            <option value="name:DESC">Nama (Z → A)</option>
            <option value="nip:ASC">NIP (A → Z)</option>
            <option value="statusAktif:ASC">Status Aktif</option>
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
          <Users class="w-8 h-8" />
        </div>
        <h3 class="font-bold text-base text-base-content mb-1">
          {{ hasActiveFilters ? "Pegawai tidak ditemukan" : "Belum ada data pegawai" }}
        </h3>
        <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
          {{
            hasActiveFilters
              ? "Coba sesuaikan kata kunci atau filter pencarian."
              : "Tambahkan data pegawai pertama untuk mengelola SDM dan akun pengguna."
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
          Tambah Pegawai
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
                    @click="toggleSort('name')"
                  >
                    <span>Pegawai & NIP</span>
                    <ArrowUp v-if="sortBy === 'name' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'name' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">Jabatan & Unit Kerja</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4">Kontak</th>
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
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-primary/20">
                      <SecureAvatar
                        :avatar-path="item.avatar || undefined"
                        :name="item.name"
                        img-class="w-full h-full object-cover"
                        fallback-class="w-full h-full bg-primary/10 text-primary font-black flex items-center justify-center uppercase text-xs"
                      />
                    </div>
                    <div class="min-w-0">
                      <div class="font-bold text-base-content truncate">{{ item.name }}</div>
                      <div class="flex flex-wrap items-center gap-2 text-[11px] text-base-content/55 font-mono">
                        <span>NIP: {{ item.nip }}</span>
                        <span
                          v-if="item.penduduk"
                          class="inline-flex items-center gap-0.5 text-primary font-sans font-semibold"
                        >
                          <IdCard class="w-3 h-3" />
                          {{ item.penduduk.nik || item.penduduk.namaLengkap }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs">
                  <div class="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                    <Briefcase class="w-3.5 h-3.5" />
                    <span>{{ item.position || "-" }}</span>
                  </div>
                  <div v-if="item.unitKerja" class="flex items-center gap-1 text-base-content/60 mt-0.5">
                    <Building2 class="w-3 h-3" />
                    <span>{{ item.unitKerja }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-lg border font-bold text-[11px]"
                    :class="getStatusAktifBadgeClass(item.statusAktif)"
                  >
                    {{ getOptionLabel(STATUS_AKTIF_PEGAWAI_OPTIONS, item.statusAktif, "Aktif") }}
                  </span>
                  <div v-if="item.statusKepegawaian" class="text-[11px] text-base-content/60 mt-1 font-medium">
                    {{ getOptionLabel(STATUS_KEPEGAWAIAN_OPTIONS, item.statusKepegawaian) }}
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs">
                  <div v-if="item.email" class="flex items-center gap-1 text-base-content/75">
                    <Mail class="w-3 h-3 text-base-content/40" />
                    <span class="truncate max-w-[180px]">{{ item.email }}</span>
                  </div>
                  <div v-if="item.phoneNumber" class="flex items-center gap-1 text-base-content/75 mt-0.5">
                    <Phone class="w-3 h-3 text-base-content/40" />
                    <span>{{ item.phoneNumber }}</span>
                  </div>
                  <div v-if="item.kelurahan?.nama" class="flex items-center gap-1 text-primary/80 mt-0.5 font-medium">
                    <MapPin class="w-3 h-3" />
                    <span>{{ item.kelurahan.nama }}</span>
                  </div>
                  <span
                    v-if="!item.email && !item.phoneNumber && !item.kelurahan?.nama"
                    class="text-base-content/40"
                  >-</span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-info hover:bg-info/10"
                      title="Detail Pegawai"
                      @click="openDetailModal(item)"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary hover:bg-primary/10"
                      title="Edit Pegawai"
                      @click="openEditModal(item)"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canDeleteData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10"
                      title="Hapus Pegawai"
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
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-primary/20">
                  <SecureAvatar
                    :avatar-path="item.avatar || undefined"
                    :name="item.name"
                    img-class="w-full h-full object-cover"
                    fallback-class="w-full h-full bg-primary/10 text-primary font-black flex items-center justify-center uppercase text-xs"
                  />
                </div>
                <div class="min-w-0">
                  <div class="text-[11px] font-mono text-base-content/50">
                    #{{ getRowNumber(index) }} • NIP: {{ item.nip }}
                  </div>
                  <h3 class="font-bold text-sm text-base-content truncate">{{ item.name }}</h3>
                </div>
              </div>

              <span
                class="inline-flex items-center px-2 py-0.5 rounded-lg border font-bold text-[10px] shrink-0"
                :class="getStatusAktifBadgeClass(item.statusAktif)"
              >
                {{ getOptionLabel(STATUS_AKTIF_PEGAWAI_OPTIONS, item.statusAktif, "Aktif") }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 text-[11px] text-base-content/65 pt-2 border-t border-base-content/10">
              <div class="truncate">Jabatan: <strong class="text-base-content">{{ item.position || "-" }}</strong></div>
              <div class="truncate">Unit: <strong class="text-base-content">{{ item.unitKerja || "-" }}</strong></div>
              <div class="truncate">Kepegawaian: <strong class="text-base-content">{{ getOptionLabel(STATUS_KEPEGAWAIAN_OPTIONS, item.statusKepegawaian) }}</strong></div>
              <div class="truncate">Telp: <strong class="text-base-content">{{ item.phoneNumber || "-" }}</strong></div>
            </div>

            <div class="flex items-center gap-2 pt-1">
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
          item-unit="Pegawai"
          @change-page="handlePageChange"
        />
        <div
          v-else
          class="flex items-center justify-between pt-4 mt-4 border-t border-base-content/10 text-xs text-base-content/60 font-medium"
        >
          <span>
            Menampilkan <strong class="text-base-content">{{ items.length }}</strong> dari
            <strong class="text-base-content">{{ totalItems }}</strong> Pegawai
          </span>
          <span>Halaman 1 dari 1</span>
        </div>
      </template>
    </div>

    <PegawaiFormModal
      :show="showFormModal"
      :edit-id="editingId"
      @close="showFormModal = false"
      @saved="fetchItems"
    />

    <PegawaiDetailModal
      :show="showDetailModal"
      :pegawai-id="detailId"
      @close="showDetailModal = false"
    />
  </div>
</template>

