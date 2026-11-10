  <script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Database,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import { MasterDataService } from "@/services/master-data.service";
import { useDate } from "@/composables/useDate";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import { MASTER_DATA_CONFIGS } from "@/utils/master-data.config";
import type {
  MasterDataType,
  MasterIconName,
  MasterReferenceItem,
  MasterSortField,
  MasterSortOrder,
  MasterStatus,
} from "@/types/master-data";

const props = defineProps<{
  type: MasterDataType;
}>();

const config = computed(() => MASTER_DATA_CONFIGS[props.type]);
const service = MasterDataService();
const client = computed(() => service.forType(props.type));

const { showToast } = useToast();
const { formatDateTime } = useDate();
const { canWrite, canDelete } = usePermission();

const ICON_MAP: Record<MasterIconName, any> = {
  BookOpen,
  Briefcase,
  GraduationCap,
  Users,
};

const getModuleIcon = (iconName: MasterIconName) => ICON_MAP[iconName] || Database;

/* =========================
   RBAC PERMISSIONS
========================= */
const canManageData = computed(() =>
  canWrite(config.value.routePath, config.value.permissionResource),
);

const canDeleteData = computed(() =>
  canDelete(config.value.routePath, config.value.permissionResource),
);

/* =========================
   LIST, FILTER & PAGINATION STATE
========================= */
const items = ref<MasterReferenceItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const currentPage = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const sortBy = ref<MasterSortField>("id");
const sortType = ref<MasterSortOrder>("desc");
const togglingId = ref<number | null>(null);

const sortPreset = computed({
  get: () => `${sortBy.value}:${sortType.value}`,
  set: (value: string) => {
    const [field, order] = value.split(":");
    sortBy.value = field === "nama" ? "nama" : "id";
    sortType.value = order === "asc" ? "asc" : "desc";
    currentPage.value = 1;
    fetchItems();
  },
});

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await client.value.getAll({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
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
    showToast(
      extractApiErrorMessage(err, `Gagal memuat data ${config.value.label}`),
      "error",
    );
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

const handleImmediateSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  currentPage.value = 1;
  fetchItems();
};

const clearSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchQuery.value = "";
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

const toggleSort = (field: MasterSortField) => {
  if (sortBy.value === field) {
    sortType.value = sortType.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortType.value = field === "nama" ? "asc" : "desc";
  }
  currentPage.value = 1;
  fetchItems();
};

const getRowNumber = (index: number) => (currentPage.value - 1) * limit.value + index + 1;

/* =========================
   CREATE / EDIT MODAL STATE
========================= */
const showModal = ref(false);
const isEdit = ref(false);
const selectedId = ref<number | null>(null);
const modalLoading = ref(false);
const submitLoading = ref(false);

const form = ref<{ nama: string; status: MasterStatus }>({
  nama: "",
  status: "Y",
});

const formErrors = ref<{ nama?: string }>({});

const resetForm = () => {
  form.value = {
    nama: "",
    status: "Y",
  };
  formErrors.value = {};
  selectedId.value = null;
  isEdit.value = false;
};

const closeModal = () => {
  if (submitLoading.value) return;
  showModal.value = false;
  resetForm();
};

const openCreateModal = () => {
  if (!canManageData.value) {
    showToast(`Anda tidak memiliki akses untuk menambah ${config.value.label}`, "error");
    return;
  }
  resetForm();
  showModal.value = true;
};

const openEditModal = async (item: MasterReferenceItem) => {
  if (!canManageData.value) {
    showToast(`Anda tidak memiliki akses untuk mengubah ${config.value.label}`, "error");
    return;
  }

  resetForm();
  isEdit.value = true;
  selectedId.value = item.id;
  form.value = {
    nama: item.nama,
    status: item.status === "N" ? "N" : "Y",
  };
  showModal.value = true;
  modalLoading.value = true;

  try {
    const detail = await client.value.getById(item.id);
    if (detail) {
      form.value = {
        nama: detail.nama ?? item.nama,
        status: detail.status === "N" ? "N" : "Y",
      };
    }
  } catch (err: any) {
    showToast(
      extractApiErrorMessage(err, `Gagal mengambil detail ${config.value.label}`),
      "warning",
    );
  } finally {
    modalLoading.value = false;
  }
};

const validateForm = (): boolean => {
  formErrors.value = {};
  const trimmedName = form.value.nama.trim();

  if (!trimmedName) {
    formErrors.value.nama = `Nama ${config.value.label} wajib diisi`;
    return false;
  }

  if (trimmedName.length > 100) {
    formErrors.value.nama = `Nama ${config.value.label} maksimal 100 karakter`;
    return false;
  }

  return true;
};

const submitForm = async () => {
  if (!canManageData.value) return;
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const payload = {
      nama: form.value.nama.trim(),
      status: form.value.status,
    };

    if (isEdit.value && selectedId.value !== null) {
      await client.value.update(selectedId.value, payload);
      showToast(`${config.value.label} "${payload.nama}" berhasil diperbarui`, "success");
    } else {
      await client.value.create(payload);
      showToast(`${config.value.label} "${payload.nama}" berhasil ditambahkan`, "success");
    }

    showModal.value = false;
    resetForm();
    await fetchItems();
  } catch (err: any) {
    const message = extractApiErrorMessage(
      err,
      `Gagal menyimpan data ${config.value.label}`,
    );
    if (err?.status === 409 || err?.statusCode === 409) {
      formErrors.value.nama = message;
    }
    showToast(message, "error");
  } finally {
    submitLoading.value = false;
  }
};

/* =========================
   INLINE STATUS TOGGLE & DELETE
========================= */
const handleToggleStatus = async (item: MasterReferenceItem) => {
  if (!canManageData.value || togglingId.value === item.id) return;

  const previousStatus: MasterStatus = item.status === "N" ? "N" : "Y";
  const nextStatus: MasterStatus = previousStatus === "Y" ? "N" : "Y";

  togglingId.value = item.id;
  item.status = nextStatus;

  try {
    const updated = await client.value.update(item.id, { status: nextStatus });
    if (updated?.updatedAt) {
      item.updatedAt = updated.updatedAt;
    }
    showToast(
      `Status ${config.value.label} "${item.nama}" diubah menjadi ${nextStatus === "Y" ? "Aktif" : "Nonaktif"}`,
      "success",
    );
  } catch (err: any) {
    item.status = previousStatus;
    showToast(
      extractApiErrorMessage(err, `Gagal mengubah status ${config.value.label}`),
      "error",
    );
  } finally {
    togglingId.value = null;
  }
};

const handleDelete = async (item: MasterReferenceItem) => {
  if (!canDeleteData.value) {
    showToast(`Anda tidak memiliki akses untuk menghapus ${config.value.label}`, "error");
    return;
  }

  const confirm = await Swal.fire({
    title: `Hapus ${config.value.label}?`,
    text: `Data "${item.nama}" akan dihapus dari daftar ${config.value.label.toLowerCase()}.`,
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
    await client.value.remove(item.id);
    showToast(`${config.value.label} "${item.nama}" berhasil dihapus`, "success");

    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await fetchItems();
  } catch (err: any) {
    showToast(
      extractApiErrorMessage(err, `Gagal menghapus ${config.value.label}`),
      "error",
    );
  }
};

/* =========================
   LIFECYCLE & SHORTCUTS
========================= */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && showModal.value && !submitLoading.value) {
    closeModal();
  }
};

onMounted(() => {
  fetchItems();
  if (process.client) {
    window.addEventListener("keydown", onKeydown);
  }
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
  if (process.client) {
    window.removeEventListener("keydown", onKeydown);
  }
});
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <!-- HEADER SECTION -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div
            class="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs"
            :class="config.badgeColorClass"
          >
            <component :is="getModuleIcon(config.iconName)" class="w-6 h-6" />
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                {{ config.title }}
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Data
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              {{ config.subtitle }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            v-if="canManageData"
            type="button"
            class="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 gap-2 w-full sm:w-auto"
            @click="openCreateModal"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>Tambah {{ config.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- FILTER & TOOLBAR -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 shadow-xs">
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 md:max-w-sm">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Cari nama ${config.label.toLowerCase()}...`"
            class="input input-bordered input-sm sm:input-md w-full pl-10 pr-9 rounded-xl text-xs sm:text-sm bg-base-200/40 focus:bg-base-100"
            @keyup.enter="handleImmediateSearch"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error p-1 rounded-lg transition"
            title="Hapus pencarian"
            @click="clearSearch"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Sort, Limit & Refresh Controls -->
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
          <select
            v-model="sortPreset"
            aria-label="Urutkan data"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="id:desc">Terbaru (ID ↓)</option>
            <option value="id:asc">Terlama (ID ↑)</option>
            <option value="nama:asc">Nama (A → Z)</option>
            <option value="nama:desc">Nama (Z → A)</option>
          </select>

          <select
            v-model.number="limit"
            aria-label="Jumlah baris per halaman"
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
            title="Muat Ulang Data"
            @click="fetchItems"
          >
            <RefreshCw class="w-4 h-4 text-base-content/70" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </div>

    <!-- DATA CONTENT -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm p-4 sm:p-6">
      <!-- LOADING SKELETON -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-14 bg-base-200/70 rounded-xl animate-pulse"></div>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-else-if="items.length === 0"
        class="py-14 px-4 text-center bg-base-200/20 rounded-2xl border border-dashed border-base-content/15"
      >
        <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <component :is="getModuleIcon(config.iconName)" class="w-8 h-8" />
        </div>
        <h3 class="font-bold text-base text-base-content mb-1">
          {{ searchQuery.trim() ? `Data ${config.label} tidak ditemukan` : `Belum ada data ${config.label}` }}
        </h3>
        <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
          {{
            searchQuery.trim()
              ? `Tidak ditemukan ${config.label.toLowerCase()} dengan kata kunci "${searchQuery.trim()}".`
              : `Tambahkan data ${config.label.toLowerCase()} pertama untuk mulai melengkapi master referensi.`
          }}
        </p>

        <div class="flex items-center justify-center gap-2 flex-wrap">
          <button
            v-if="searchQuery.trim()"
            type="button"
            class="btn btn-ghost btn-sm rounded-xl font-bold"
            @click="clearSearch"
          >
            Reset Pencarian
          </button>
          <button
            v-if="canManageData && !searchQuery.trim()"
            type="button"
            class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5"
            @click="openCreateModal"
          >
            <Plus class="w-4 h-4" />
            Tambah {{ config.label }}
          </button>
        </div>
      </div>

      <template v-else>
        <!-- DESKTOP TABLE VIEW -->
        <div class="hidden md:block overflow-x-auto">
          <table class="table w-full text-left border-collapse">
            <thead>
              <tr class="bg-base-200/50 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
                <th class="py-3.5 px-4 w-16 rounded-l-xl">No</th>
                <th class="py-3.5 px-4 w-24">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-primary transition"
                    @click="toggleSort('id')"
                  >
                    <span>ID</span>
                    <ArrowUp v-if="sortBy === 'id' && sortType === 'asc'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'id' && sortType === 'desc'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-primary transition"
                    @click="toggleSort('nama')"
                  >
                    <span>Nama {{ config.label }}</span>
                    <ArrowUp v-if="sortBy === 'nama' && sortType === 'asc'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'nama' && sortType === 'desc'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4">Diperbarui</th>
                <th
                  v-if="canManageData || canDeleteData"
                  class="py-3.5 px-4 text-right rounded-r-xl"
                >
                  Aksi
                </th>
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
                <td class="py-3.5 px-4 font-mono text-xs font-bold text-base-content/60">
                  #{{ item.id }}
                </td>
                <td class="py-3.5 px-4">
                  <span class="font-bold text-base-content">{{ item.nama }}</span>
                </td>
                <td class="py-3.5 px-4">
                  <div v-if="canManageData" class="flex items-center gap-2.5">
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
                      <span v-if="togglingId === item.id" class="loading loading-spinner loading-xs"></span>
                      <CheckCircle2 v-else-if="item.status === 'Y'" class="w-3 h-3" />
                      <XCircle v-else class="w-3 h-3" />
                      {{ item.status === 'Y' ? 'Aktif' : 'Nonaktif' }}
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
                    {{ item.status === 'Y' ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-xs text-base-content/60">
                  <div class="inline-flex items-center gap-1.5">
                    <Calendar class="w-3.5 h-3.5 text-base-content/40" />
                    <span>{{ formatDateTime(item.updatedAt || item.createdAt) }}</span>
                  </div>
                </td>
                <td v-if="canManageData || canDeleteData" class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-1.5">
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary hover:bg-primary/10 gap-1"
                      title="Edit"
                      @click="openEditModal(item)"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      v-if="canDeleteData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10 gap-1"
                      title="Hapus"
                      @click="handleDelete(item)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE CARD LIST VIEW -->
        <div class="md:hidden space-y-3">
          <div
            v-for="(item, index) in items"
            :key="item.id"
            class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 space-y-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 text-[11px] text-base-content/50 font-mono">
                  <span class="font-bold">#{{ getRowNumber(index) }}</span>
                  <span>•</span>
                  <span>ID {{ item.id }}</span>
                </div>
                <h3 class="font-bold text-sm text-base-content mt-0.5 break-words">
                  {{ item.nama }}
                </h3>
              </div>

              <span
                class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0"
                :class="
                  item.status === 'Y'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                "
              >
                <CheckCircle2 v-if="item.status === 'Y'" class="w-3 h-3" />
                <XCircle v-else class="w-3 h-3" />
                {{ item.status === 'Y' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-2 pt-2 border-t border-base-content/10">
              <div class="text-[11px] text-base-content/55 flex items-center gap-1">
                <Calendar class="w-3 h-3 shrink-0" />
                <span>{{ formatDateTime(item.updatedAt || item.createdAt) }}</span>
              </div>

              <div v-if="canManageData" class="flex items-center gap-2">
                <span class="text-[11px] font-semibold text-base-content/60">Status</span>
                <input
                  type="checkbox"
                  class="toggle toggle-success toggle-xs"
                  :checked="item.status === 'Y'"
                  :disabled="togglingId === item.id"
                  :aria-label="`Ubah status ${item.nama}`"
                  @change="handleToggleStatus(item)"
                />
              </div>
            </div>

            <div v-if="canManageData || canDeleteData" class="flex items-center gap-2 pt-1">
              <button
                v-if="canManageData"
                type="button"
                class="btn btn-sm btn-outline border-base-content/15 flex-1 rounded-xl gap-1.5 text-xs"
                @click="openEditModal(item)"
              >
                <Pencil class="w-3.5 h-3.5 text-primary" />
                <span>Edit</span>
              </button>
              <button
                v-if="canDeleteData"
                type="button"
                class="btn btn-sm btn-outline border-error/30 text-error hover:bg-error hover:text-white flex-1 rounded-xl gap-1.5 text-xs"
                @click="handleDelete(item)"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>

        <!-- PAGINATION & SUMMARY -->
        <AppPagination
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-items="totalItems"
          :limit="limit"
          :item-unit="config.label"
          @change-page="handlePageChange"
        />
        <div
          v-else
          class="flex items-center justify-between pt-4 mt-4 border-t border-base-content/10 text-xs text-base-content/60 font-medium"
        >
          <span>
            Menampilkan <strong class="text-base-content">{{ items.length }}</strong> dari
            <strong class="text-base-content">{{ totalItems }}</strong> {{ config.label }}
          </span>
          <span>Halaman 1 dari 1</span>
        </div>
      </template>
    </div>

    <!-- MODAL CREATE / EDIT -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" :checked="showModal" />
      <div
        v-if="showModal"
        class="modal modal-open backdrop-blur-md bg-slate-950/40"
        @click.self="closeModal"
      >
        <div class="modal-box max-w-md w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error"
            :disabled="submitLoading"
            aria-label="Tutup modal"
            @click="closeModal"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3 pr-8 mb-5">
            <div
              class="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0"
              :class="config.badgeColorClass"
            >
              <component :is="getModuleIcon(config.iconName)" class="w-5 h-5" />
            </div>
            <span>{{ isEdit ? `Edit ${config.label}` : `Tambah ${config.label} Baru` }}</span>
          </h3>

          <div v-if="modalLoading" class="space-y-4 py-4 animate-pulse">
            <div class="h-11 bg-base-200 rounded-2xl w-full"></div>
            <div class="h-11 bg-base-200 rounded-2xl w-full"></div>
          </div>

          <form v-else class="space-y-4" @submit.prevent="submitForm">
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Nama {{ config.label }} <span class="text-error">*</span>
              </label>
              <input
                v-model="form.nama"
                type="text"
                maxlength="100"
                autofocus
                :placeholder="config.placeholderExample"
                class="input input-bordered w-full rounded-2xl h-12 text-sm font-medium bg-base-100"
                :class="{ 'border-error': formErrors.nama }"
                @input="formErrors.nama = undefined"
              />
              <span v-if="formErrors.nama" class="text-xs text-error font-semibold mt-1.5 block">
                {{ formErrors.nama }}
              </span>
            </div>

            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">
                Status Data
              </label>
              <div class="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all"
                  :class="
                    form.status === 'Y'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-base-200/40 border-base-content/10 text-base-content/60 hover:bg-base-200'
                  "
                  @click="form.status = 'Y'"
                >
                  <CheckCircle2 class="w-4 h-4" />
                  <span>Aktif (Y)</span>
                </button>

                <button
                  type="button"
                  class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all"
                  :class="
                    form.status === 'N'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 shadow-xs'
                      : 'bg-base-200/40 border-base-content/10 text-base-content/60 hover:bg-base-200'
                  "
                  @click="form.status = 'N'"
                >
                  <XCircle class="w-4 h-4" />
                  <span>Nonaktif (N)</span>
                </button>
              </div>
            </div>

            <div class="modal-action gap-2 pt-2">
              <button
                type="button"
                class="btn btn-ghost rounded-2xl font-bold px-5"
                :disabled="submitLoading"
                @click="closeModal"
              >
                Batal
              </button>
              <button
                type="submit"
                class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
                :disabled="submitLoading"
              >
                <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
                <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Data" }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

