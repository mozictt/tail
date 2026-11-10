<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Eye,
  IdCard,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import PendudukFormModal from "@/components/master/PendudukFormModal.vue";
import PendudukDetailModal from "@/components/master/PendudukDetailModal.vue";
import { PendudukService } from "@/services/penduduk.service";
import { useDate } from "@/composables/useDate";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  getOptionLabel,
  JENIS_KELAMIN_OPTIONS,
  JenisKelamin,
  type PendudukItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Master Data Penduduk",
});

const pendudukService = PendudukService();
const { showToast } = useToast();
const { formatDate } = useDate();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/master/penduduk";
const RESOURCE_NAME = "Penduduk";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

/* =========================
   LIST, FILTER & PAGINATION STATE
========================= */
type SortField = "id" | "namaLengkap" | "nik" | "createdAt";

const items = ref<PendudukItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const jenisKelaminFilter = ref<JenisKelamin | "">("");
const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<SortField>("id");
const sortType = ref<"ASC" | "DESC">("DESC");

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    const allowed: SortField[] = ["id", "namaLengkap", "nik", "createdAt"];
    sortBy.value = allowed.includes(field as SortField)
      ? (field as SortField)
      : "id";
    sortType.value = order === "ASC" ? "ASC" : "DESC";
    currentPage.value = 1;
    fetchItems();
  },
});

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await pendudukService.getPenduduk({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
      jenisKelamin: jenisKelaminFilter.value,
      sortBy: sortBy.value,
      sortType: sortType.value,
    });

    items.value = res.items;
    totalItems.value = res.meta.totalItems;
    totalPages.value = res.meta.totalPages || 1;
    currentPage.value = res.meta.currentPage || currentPage.value;
  } catch (err: any) {
    items.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
    showToast(extractApiErrorMessage(err, "Gagal memuat data penduduk"), "error");
  } finally {
    loading.value = false;
  }
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchItems();
  }, 400);
});

watch(jenisKelaminFilter, () => {
  currentPage.value = 1;
  fetchItems();
});

const handleImmediateSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  currentPage.value = 1;
  fetchItems();
};

const clearFilters = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchQuery.value = "";
  jenisKelaminFilter.value = "";
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
    sortType.value = field === "namaLengkap" || field === "nik" ? "ASC" : "DESC";
  }
  currentPage.value = 1;
  fetchItems();
};

const getRowNumber = (index: number) => (currentPage.value - 1) * limit.value + index + 1;

/* =========================
   MODALS STATE
========================= */
const showFormModal = ref(false);
const editingId = ref<number | null>(null);

const showDetailModal = ref(false);
const detailId = ref<number | null>(null);

const openCreateModal = () => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk menambah penduduk", "error");
    return;
  }
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (item: PendudukItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah penduduk", "error");
    return;
  }
  editingId.value = item.id;
  showFormModal.value = true;
};

const openDetailModal = (item: PendudukItem) => {
  detailId.value = item.id;
  showDetailModal.value = true;
};

const handleSaved = () => {
  fetchItems();
};

const handleDelete = async (item: PendudukItem) => {
  if (!canDeleteData.value) {
    showToast("Anda tidak memiliki akses untuk menghapus penduduk", "error");
    return;
  }

  const confirm = await Swal.fire({
    title: "Hapus Data Penduduk?",
    text: `Data "${item.namaLengkap}"${item.nik ? ` (NIK ${item.nik})` : ""} akan dihapus.`,
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
    await pendudukService.deletePenduduk(item.id);
    showToast(`Data penduduk "${item.namaLengkap}" berhasil dihapus`, "success");
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await fetchItems();
  } catch (err: any) {
    showToast(extractApiErrorMessage(err, "Gagal menghapus data penduduk"), "error");
  }
};

onMounted(() => {
  fetchItems();
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <!-- HEADER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 flex items-center justify-center shrink-0">
            <IdCard class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Master Data Penduduk
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Data
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola data induk kependudukan terintegrasi untuk pasien, pegawai, dan dokter
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
          <span>Tambah Penduduk</span>
        </button>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div class="relative flex-1 lg:max-w-sm">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari NIK atau nama lengkap..."
            class="input input-bordered input-sm sm:input-md w-full pl-10 pr-9 rounded-xl text-xs sm:text-sm bg-base-200/40 focus:bg-base-100"
            @keyup.enter="handleImmediateSearch"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error p-1 rounded-lg transition"
            @click="searchQuery = ''"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
          <select
            v-model="jenisKelaminFilter"
            aria-label="Filter jenis kelamin"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="">Semua Gender</option>
            <option
              v-for="opt in JENIS_KELAMIN_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>

          <select
            v-model="sortPreset"
            aria-label="Urutkan data"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="id:DESC">Terbaru (ID ↓)</option>
            <option value="id:ASC">Terlama (ID ↑)</option>
            <option value="namaLengkap:ASC">Nama (A → Z)</option>
            <option value="namaLengkap:DESC">Nama (Z → A)</option>
            <option value="nik:ASC">NIK (A → Z)</option>
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
          <IdCard class="w-8 h-8" />
        </div>
        <h3 class="font-bold text-base text-base-content mb-1">
          {{ searchQuery || jenisKelaminFilter ? "Data penduduk tidak ditemukan" : "Belum ada data penduduk" }}
        </h3>
        <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
          {{
            searchQuery || jenisKelaminFilter
              ? "Coba ubah kata kunci NIK/nama atau filter jenis kelamin."
              : "Tambahkan data penduduk pertama untuk digunakan oleh modul pegawai, dokter, maupun pasien."
          }}
        </p>
        <div class="flex items-center justify-center gap-2">
          <button
            v-if="searchQuery || jenisKelaminFilter"
            type="button"
            class="btn btn-ghost btn-sm rounded-xl font-bold"
            @click="clearFilters"
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
            Tambah Penduduk
          </button>
        </div>
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
                    @click="toggleSort('namaLengkap')"
                  >
                    <span>NIK & Nama Lengkap</span>
                    <ArrowUp v-if="sortBy === 'namaLengkap' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'namaLengkap' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">Gender & TTL</th>
                <th class="py-3.5 px-4">Agama & Pekerjaan</th>
                <th class="py-3.5 px-4">Kontak & Wilayah</th>
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
                  <div class="font-bold text-base-content">{{ item.namaLengkap }}</div>
                  <div class="text-xs font-mono text-base-content/60 mt-0.5">
                    NIK: {{ item.nik || "-" }}
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span
                    class="badge badge-xs font-bold py-2 px-2.5"
                    :class="
                      item.jenisKelamin === 'L'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        : 'bg-pink-500/10 text-pink-600 border-pink-500/20'
                    "
                  >
                    {{ getOptionLabel(JENIS_KELAMIN_OPTIONS, item.jenisKelamin) }}
                  </span>
                  <div class="text-xs text-base-content/60 mt-1 flex items-center gap-1">
                    <Calendar class="w-3 h-3 shrink-0" />
                    <span>
                      {{ item.tempatLahir || "-" }}<template v-if="item.tanggalLahir">, {{ formatDate(item.tanggalLahir) }}</template>
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs">
                  <div class="font-semibold text-base-content/80">{{ item.agama?.nama || "-" }}</div>
                  <div class="text-base-content/55 mt-0.5">{{ item.pekerjaan?.nama || "-" }}</div>
                </td>
                <td class="py-3.5 px-4 text-xs">
                  <div v-if="item.noTelepon" class="flex items-center gap-1 text-base-content/80">
                    <Phone class="w-3 h-3 text-base-content/40" />
                    <span>{{ item.noTelepon }}</span>
                  </div>
                  <div v-if="item.kelurahan?.nama" class="flex items-center gap-1 text-base-content/60 mt-0.5">
                    <MapPin class="w-3 h-3 text-primary/70" />
                    <span>{{ item.kelurahan.nama }}</span>
                  </div>
                  <span v-if="!item.noTelepon && !item.kelurahan?.nama" class="text-base-content/40">-</span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-info hover:bg-info/10 gap-1"
                      title="Detail"
                      @click="openDetailModal(item)"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary hover:bg-primary/10 gap-1"
                      title="Edit"
                      @click="openEditModal(item)"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canDeleteData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10 gap-1"
                      title="Hapus"
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
                  #{{ getRowNumber(index) }} • NIK: {{ item.nik || "-" }}
                </div>
                <h3 class="font-bold text-sm text-base-content mt-0.5 break-words">
                  {{ item.namaLengkap }}
                </h3>
              </div>
              <span
                class="badge badge-xs font-bold py-2 px-2 shrink-0"
                :class="
                  item.jenisKelamin === 'L'
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    : 'bg-pink-500/10 text-pink-600 border-pink-500/20'
                "
              >
                {{ item.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan' }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[11px] text-base-content/65 pt-1 border-t border-base-content/10">
              <div>Agama: <strong class="text-base-content">{{ item.agama?.nama || "-" }}</strong></div>
              <div>Pekerjaan: <strong class="text-base-content">{{ item.pekerjaan?.nama || "-" }}</strong></div>
              <div class="truncate">Telp: <strong class="text-base-content">{{ item.noTelepon || "-" }}</strong></div>
              <div class="truncate">Kelurahan: <strong class="text-base-content">{{ item.kelurahan?.nama || "-" }}</strong></div>
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
          item-unit="Penduduk"
          @change-page="handlePageChange"
        />
        <div
          v-else
          class="flex items-center justify-between pt-4 mt-4 border-t border-base-content/10 text-xs text-base-content/60 font-medium"
        >
          <span>
            Menampilkan <strong class="text-base-content">{{ items.length }}</strong> dari
            <strong class="text-base-content">{{ totalItems }}</strong> Penduduk
          </span>
          <span>Halaman 1 dari 1</span>
        </div>
      </template>
    </div>

    <PendudukFormModal
      :show="showFormModal"
      :edit-id="editingId"
      @close="showFormModal = false"
      @saved="handleSaved"
    />

    <PendudukDetailModal
      :show="showDetailModal"
      :penduduk-id="detailId"
      @close="showDetailModal = false"
    />
  </div>
</template>

