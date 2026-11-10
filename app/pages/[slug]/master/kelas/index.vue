<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import KelasFormModal from "@/components/master/KelasFormModal.vue";
import KelasDetailModal from "@/components/master/KelasDetailModal.vue";
import { KelasService } from "@/services/kelas.service";
import { useCurrency } from "@/composables/useCurrency";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import type { KelasItem } from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Master Data Kelas",
});

const kelasService = KelasService();
const { formatRupiah } = useCurrency();
const { showToast } = useToast();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/master/kelas";
const RESOURCE_NAME = "Kelas";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

type SortField = "id" | "kode" | "nama" | "urutan" | "createdAt";

const items = ref<KelasItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const statusFilter = ref<MasterStatus | "">("");
const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<SortField>("urutan");
const sortType = ref<"ASC" | "DESC">("ASC");
const togglingId = ref<number | null>(null);

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    const allowed: SortField[] = ["id", "kode", "nama", "urutan", "createdAt"];
    sortBy.value = allowed.includes(field as SortField)
      ? (field as SortField)
      : "urutan";
    sortType.value = order === "DESC" ? "DESC" : "ASC";
    currentPage.value = 1;
    fetchItems();
  },
});

const hasActiveFilters = computed(() =>
  Boolean(searchQuery.value.trim() || statusFilter.value),
);

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await kelasService.getKelas({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
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
    showToast(extractApiErrorMessage(err, "Gagal memuat data kelas"), "error");
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

watch(statusFilter, () => {
  currentPage.value = 1;
  fetchItems();
});

const handleImmediateSearch = () => {
  if (filterTimer) clearTimeout(filterTimer);
  currentPage.value = 1;
  fetchItems();
};

const clearAllFilters = () => {
  if (filterTimer) clearTimeout(filterTimer);
  searchQuery.value = "";
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

const handleToggleStatus = async (item: KelasItem) => {
  if (!canManageData.value || togglingId.value === item.id) return;

  const prevStatus: MasterStatus = item.status === "N" ? "N" : "Y";
  const nextStatus: MasterStatus = prevStatus === "Y" ? "N" : "Y";

  togglingId.value = item.id;
  item.status = nextStatus;

  try {
    await kelasService.updateKelas(item.id, { status: nextStatus });
    showToast(
      `Status kelas "${item.nama}" diubah menjadi ${nextStatus === "Y" ? "Aktif" : "Nonaktif"}`,
      "success",
    );
  } catch (err: unknown) {
    item.status = prevStatus;
    showToast(
      extractApiErrorMessage(err, "Gagal mengubah status kelas"),
      "error",
    );
  } finally {
    togglingId.value = null;
  }
};

const showFormModal = ref(false);
const editingId = ref<number | null>(null);
const showDetailModal = ref(false);
const detailId = ref<number | null>(null);

const openCreateModal = () => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk menambah kelas", "error");
    return;
  }
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (item: KelasItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah kelas", "error");
    return;
  }
  editingId.value = item.id;
  showFormModal.value = true;
};

const openDetailModal = (item: KelasItem) => {
  detailId.value = item.id;
  showDetailModal.value = true;
};

const handleDelete = async (item: KelasItem) => {
  if (!canDeleteData.value) {
    showToast("Anda tidak memiliki akses untuk menghapus kelas", "error");
    return;
  }

  const confirm = await Swal.fire({
    title: "Hapus Master Kelas?",
    text: `Data kelas "${item.nama}" (${item.kode}) akan dihapus.`,
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
    await kelasService.deleteKelas(item.id);
    showToast(`Kelas "${item.nama}" berhasil dihapus`, "success");
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await fetchItems();
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, "Gagal menghapus data kelas"), "error");
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
            <Layers class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Master Data Kelas
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Kelas
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola kelas perawatan, tarif akomodasi kamar dasar, dan pemetaan kode BPJS Aplicare
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
          <span>Tambah Kelas</span>
        </button>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kode, nama kelas, atau kode BPJS Aplicare..."
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
          v-model="statusFilter"
          aria-label="Filter status aktif kelas"
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
            v-model="sortPreset"
            aria-label="Urutkan kelas"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="urutan:ASC">Urutan Tingkatan (↑)</option>
            <option value="urutan:DESC">Urutan Tingkatan (↓)</option>
            <option value="nama:ASC">Nama (A → Z)</option>
            <option value="kode:ASC">Kode (A → Z)</option>
            <option value="id:DESC">Terbaru (ID ↓)</option>
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
          <Layers class="w-8 h-8" />
        </div>
        <h3 class="font-bold text-base text-base-content mb-1">
          {{ hasActiveFilters ? "Data kelas tidak ditemukan" : "Belum ada data kelas" }}
        </h3>
        <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
          {{
            hasActiveFilters
              ? "Coba sesuaikan kata kunci atau filter status pencarian."
              : "Tambahkan kelas perawatan seperti VVIP, VIP, Kelas 1, Kelas 2, Kelas 3, atau ICU."
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
          Tambah Kelas
        </button>
      </div>

      <template v-else>
        <!-- DESKTOP TABLE -->
        <div class="hidden md:block overflow-x-auto">
          <table class="table w-full text-left border-collapse">
            <thead>
              <tr class="bg-base-200/50 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
                <th class="py-3.5 px-4 w-14 rounded-l-xl">No</th>
                <th class="py-3.5 px-4 w-24">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-primary transition"
                    @click="toggleSort('urutan')"
                  >
                    <span>Urutan</span>
                    <ArrowUp v-if="sortBy === 'urutan' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'urutan' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-primary transition"
                    @click="toggleSort('nama')"
                  >
                    <span>Kelas & Kode</span>
                    <ArrowUp v-if="sortBy === 'nama' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'nama' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">Tarif Akomodasi & Aplicare</th>
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
                  <span class="badge badge-sm badge-ghost font-mono font-bold">
                    #{{ item.urutan }}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <div class="font-bold text-base-content">{{ item.nama }}</div>
                  <div class="flex flex-wrap items-center gap-2 text-[11px] text-base-content/60 mt-0.5">
                    <span class="font-mono px-1.5 py-0.5 rounded bg-base-200 font-bold text-base-content/80">
                      {{ item.kode }}
                    </span>
                    <span v-if="item.keterangan" class="truncate max-w-xs">
                      • {{ item.keterangan }}
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs space-y-1">
                  <div class="font-bold text-base-content">
                    {{
                      item.tarifAkomodasi !== null && item.tarifAkomodasi !== undefined
                        ? `${formatRupiah(item.tarifAkomodasi)} / hari`
                        : "-"
                    }}
                  </div>
                  <div v-if="item.kodeBpjsAplicare" class="text-[11px] font-mono text-base-content/60">
                    Aplicare: {{ item.kodeBpjsAplicare }}
                  </div>
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
                      title="Detail Kelas"
                      @click="openDetailModal(item)"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary hover:bg-primary/10"
                      title="Edit Kelas"
                      @click="openEditModal(item)"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canDeleteData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10"
                      title="Hapus Kelas"
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
                  #{{ getRowNumber(index) }} • {{ item.kode }} • Urutan {{ item.urutan }}
                </div>
                <h3 class="font-bold text-sm text-base-content mt-0.5 break-words">
                  {{ item.nama }}
                </h3>
              </div>

              <span
                class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0"
                :class="
                  item.status === 'Y'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                "
              >
                {{ item.status === "Y" ? "Aktif" : "Nonaktif" }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 text-[11px] text-base-content/65 pt-2 border-t border-base-content/10">
              <div class="truncate">
                Tarif:
                <strong class="text-base-content">
                  {{
                    item.tarifAkomodasi !== null && item.tarifAkomodasi !== undefined
                      ? formatRupiah(item.tarifAkomodasi)
                      : "-"
                  }}
                </strong>
              </div>
              <div class="truncate font-mono">
                Aplicare: {{ item.kodeBpjsAplicare || "-" }}
              </div>
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
          item-unit="Kelas"
          @change-page="handlePageChange"
        />
        <div
          v-else
          class="flex items-center justify-between pt-4 mt-4 border-t border-base-content/10 text-xs text-base-content/60 font-medium"
        >
          <span>
            Menampilkan <strong class="text-base-content">{{ items.length }}</strong> dari
            <strong class="text-base-content">{{ totalItems }}</strong> Kelas
          </span>
          <span>Halaman 1 dari 1</span>
        </div>
      </template>
    </div>

    <KelasFormModal
      :show="showFormModal"
      :edit-id="editingId"
      @close="showFormModal = false"
      @saved="fetchItems"
    />

    <KelasDetailModal
      :show="showDetailModal"
      :kelas-id="detailId"
      @close="showDetailModal = false"
    />
  </div>
</template>

