<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Baby,
  CheckCircle2,
  CreditCard,
  Eye,
  HeartPulse,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import PasienFormModal from "@/components/master/PasienFormModal.vue";
import PasienDetailModal from "@/components/master/PasienDetailModal.vue";
import { PasienService } from "@/services/pasien.service";
import { PenjaminService } from "@/services/penjamin.service";
import { KelasService } from "@/services/kelas.service";
import { useDate } from "@/composables/useDate";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  calculateAgeLabel,
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  JENIS_PENJAMIN_OPTIONS,
  JenisPenjamin,
  StatusHidup,
  type KelasOptionItem,
  type PasienItem,
  type PenjaminOptionItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Master Data Pasien",
});

const pasienService = PasienService();
const penjaminService = PenjaminService();
const kelasService = KelasService();
const { showToast } = useToast();
const { formatDate } = useDate();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/master/pasien";
const RESOURCE_NAME = "Pasien";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

type SortField = "id" | "noRm" | "createdAt";

const items = ref<PasienItem[]>([]);
const penjaminOptions = ref<PenjaminOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const penjaminIdFilter = ref<number | "">("");
const kelasHakIdFilter = ref<number | "">("");
const jenisPenjaminFilter = ref<JenisPenjamin | "">("");
const bayiFilter = ref<"" | "true" | "false">("");
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
    const allowed: SortField[] = ["id", "noRm", "createdAt"];
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
      penjaminIdFilter.value ||
      kelasHakIdFilter.value ||
      jenisPenjaminFilter.value ||
      bayiFilter.value ||
      statusFilter.value,
  ),
);

const loadFilterOptions = async () => {
  const [penjaminRes, kelasRes] = await Promise.allSettled([
    penjaminService.getPenjaminOptions(),
    kelasService.getKelasOptions(),
  ]);
  penjaminOptions.value =
    penjaminRes.status === "fulfilled" ? penjaminRes.value : [];
  kelasOptions.value = kelasRes.status === "fulfilled" ? kelasRes.value : [];
};

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await pasienService.getPasien({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
      penjaminId: penjaminIdFilter.value ? Number(penjaminIdFilter.value) : undefined,
      kelasHakId: kelasHakIdFilter.value ? Number(kelasHakIdFilter.value) : undefined,
      jenisPenjamin: jenisPenjaminFilter.value,
      isBayiBaruLahir:
        bayiFilter.value === "true"
          ? true
          : bayiFilter.value === "false"
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
  } catch (err: any) {
    items.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
    showToast(extractApiErrorMessage(err, "Gagal memuat data pasien"), "error");
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
    penjaminIdFilter,
    kelasHakIdFilter,
    jenisPenjaminFilter,
    bayiFilter,
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
  penjaminIdFilter.value = "";
  kelasHakIdFilter.value = "";
  jenisPenjaminFilter.value = "";
  bayiFilter.value = "";
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
    sortType.value = field === "noRm" ? "ASC" : "DESC";
  }
  currentPage.value = 1;
  fetchItems();
};

const getRowNumber = (index: number) =>
  (currentPage.value - 1) * limit.value + index + 1;

const getPatientName = (item: PasienItem) =>
  item.penduduk?.namaLengkap || `Pasien #${item.id}`;

const getIdentityLabel = (item: PasienItem) => {
  const p = item.penduduk;
  if (!p) return "-";
  if (p.nik) return `NIK: ${p.nik}`;
  if (p.noIdentitasLain) {
    return `${p.jenisIdentitas || "ID"}: ${p.noIdentitasLain}`;
  }
  if (item.isBayiBaruLahir) return "Belum ber-NIK (Bayi)";
  if (item.isIdentitasTidakDiketahui) return "Tanpa Identitas";
  return "-";
};

/* =========================
   INLINE STATUS TOGGLE & MODALS
========================= */
const handleToggleStatus = async (item: PasienItem) => {
  if (!canManageData.value || togglingId.value === item.id) return;

  const prevStatus: MasterStatus = item.status === "N" ? "N" : "Y";
  const nextStatus: MasterStatus = prevStatus === "Y" ? "N" : "Y";

  togglingId.value = item.id;
  item.status = nextStatus;

  try {
    await pasienService.updatePasien(item.id, { status: nextStatus });
    showToast(
      `Status pasien "${getPatientName(item)}" diubah menjadi ${nextStatus === "Y" ? "Aktif" : "Nonaktif"}`,
      "success",
    );
  } catch (err: any) {
    item.status = prevStatus;
    showToast(
      extractApiErrorMessage(err, "Gagal mengubah status pasien"),
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
    showToast("Anda tidak memiliki akses untuk mendaftarkan pasien", "error");
    return;
  }
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (item: PasienItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah data pasien", "error");
    return;
  }
  editingId.value = item.id;
  showFormModal.value = true;
};

const openDetailModal = (item: PasienItem) => {
  detailId.value = item.id;
  showDetailModal.value = true;
};

const handleDelete = async (item: PasienItem) => {
  if (!canDeleteData.value) {
    showToast("Anda tidak memiliki akses untuk menghapus data pasien", "error");
    return;
  }

  const confirm = await Swal.fire({
    title: "Hapus Data Pasien?",
    text: `Data pasien "${getPatientName(item)}" (No. RM: ${item.noRm}) akan dihapus.`,
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
    await pasienService.deletePasien(item.id);
    showToast(`Data pasien No. RM "${item.noRm}" berhasil dihapus`, "success");
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }
    await fetchItems();
  } catch (err: any) {
    showToast(
      extractApiErrorMessage(err, "Gagal menghapus data pasien"),
      "error",
    );
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
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 flex items-center justify-center shrink-0">
            <HeartPulse class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
                Master Data Pasien
              </h1>
              <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {{ totalItems }} Pasien
              </span>
            </div>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola registrasi pasien, Nomor RM, data kependudukan, penanggung jawab, dan multi-penjamin
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
          <span>Registrasi Pasien</span>
        </button>
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
            placeholder="Cari No. RM, nama, NIK, no. kartu..."
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
          v-model="penjaminIdFilter"
          aria-label="Filter penjamin pasien"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Penjamin</option>
          <option
            v-for="pj in penjaminOptions"
            :key="pj.id"
            :value="pj.id"
          >
            {{ pj.kode }} — {{ pj.nama }}
          </option>
        </select>

        <select
          v-model="kelasHakIdFilter"
          aria-label="Filter kelas hak rawat"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Kelas Hak</option>
          <option
            v-for="kl in kelasOptions"
            :key="kl.id"
            :value="kl.id"
          >
            {{ kl.kode }} — {{ kl.nama }}
          </option>
        </select>

        <select
          v-model="jenisPenjaminFilter"
          aria-label="Filter jenis penjamin pasien"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Jenis Penjamin</option>
          <option
            v-for="opt in JENIS_PENJAMIN_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>

        <select
          v-model="bayiFilter"
          aria-label="Filter kategori bayi baru lahir"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Kategori Pasien</option>
          <option value="true">Bayi Baru Lahir</option>
          <option value="false">Pasien Umum / Dewasa</option>
        </select>

        <select
          v-model="statusFilter"
          aria-label="Filter status aktif pasien"
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
            aria-label="Urutkan pasien"
            class="select select-bordered select-sm rounded-xl text-xs font-semibold flex-1 sm:flex-none"
          >
            <option value="id:DESC">Terbaru (ID ↓)</option>
            <option value="id:ASC">Terlama (ID ↑)</option>
            <option value="noRm:ASC">No. RM (A → Z)</option>
            <option value="noRm:DESC">No. RM (Z → A)</option>
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
          <HeartPulse class="w-8 h-8" />
        </div>
        <h3 class="font-bold text-base text-base-content mb-1">
          {{ hasActiveFilters ? "Data pasien tidak ditemukan" : "Belum ada data pasien" }}
        </h3>
        <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto mb-5">
          {{
            hasActiveFilters
              ? "Coba sesuaikan kata kunci atau filter penjamin/status pencarian."
              : "Daftarkan pasien pertama dengan nomor rekam medis otomatis atau migrasi manual."
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
          Registrasi Pasien
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
                    @click="toggleSort('noRm')"
                  >
                    <span>No. RM & Pasien</span>
                    <ArrowUp v-if="sortBy === 'noRm' && sortType === 'ASC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowDown v-else-if="sortBy === 'noRm' && sortType === 'DESC'" class="w-3.5 h-3.5 text-primary" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                  </button>
                </th>
                <th class="py-3.5 px-4">Penjamin Utama</th>
                <th class="py-3.5 px-4">Kontak & PJ</th>
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
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      {{ item.noRm }}
                    </span>
                    <span
                      v-if="item.isBayiBaruLahir"
                      class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 border border-sky-500/20"
                    >
                      <Baby class="w-3 h-3" /> Bayi
                    </span>
                    <span
                      v-if="item.isIdentitasTidakDiketahui"
                      class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20"
                    >
                      <AlertTriangle class="w-3 h-3" /> Tanpa ID
                    </span>
                    <span
                      v-if="item.penduduk?.statusHidup === StatusHidup.MENINGGAL"
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-700 text-white"
                    >
                      Meninggal
                    </span>
                  </div>

                  <div class="font-bold text-base-content mt-1">
                    {{ getPatientName(item) }}
                  </div>
                  <div class="text-[11px] text-base-content/60 font-mono mt-0.5">
                    {{ getIdentityLabel(item) }}
                    <span v-if="item.penduduk?.jenisKelamin" class="font-sans">
                      • {{ item.penduduk.jenisKelamin === "L" ? "L" : "P" }}
                    </span>
                    <span v-if="item.penduduk?.tanggalLahir" class="font-sans">
                      • {{ formatDate(item.penduduk.tanggalLahir) }}
                      <template v-if="calculateAgeLabel(item.penduduk.tanggalLahir)">
                        ({{ calculateAgeLabel(item.penduduk.tanggalLahir) }})
                      </template>
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs space-y-1">
                  <template v-if="item.penjaminUtama">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        class="text-[11px] font-bold px-2 py-0.5 rounded-md border"
                        :class="getJenisPenjaminBadgeClass(item.penjaminUtama.penjamin?.jenisPenjamin)"
                      >
                        {{ item.penjaminUtama.penjamin?.nama || `Penjamin #${item.penjaminUtama.penjaminId}` }}
                      </span>
                      <span
                        v-if="(item.penjaminList?.length || 0) > 1"
                        class="badge badge-xs badge-ghost font-bold"
                      >
                        +{{ (item.penjaminList?.length || 1) - 1 }} lainnya
                      </span>
                    </div>
                    <div v-if="item.penjaminUtama.noKartu" class="text-[11px] font-mono text-base-content/65 flex items-center gap-1">
                      <CreditCard class="w-3 h-3 text-base-content/40" />
                      {{ item.penjaminUtama.noKartu }}
                    </div>
                    <div
                      v-if="item.penjaminUtama.kelasHak"
                      class="text-[11px] text-base-content/60"
                    >
                      Kelas: <span class="font-semibold text-base-content/80">{{ item.penjaminUtama.kelasHak.nama }}</span>
                    </div>
                  </template>
                  <span v-else class="text-base-content/40">Belum ada penjamin</span>
                </td>
                <td class="py-3.5 px-4 text-xs space-y-1">
                  <div v-if="item.penduduk?.noTelepon" class="flex items-center gap-1 text-base-content/80">
                    <Phone class="w-3 h-3 text-base-content/40" />
                    <span>{{ item.penduduk.noTelepon }}</span>
                  </div>
                  <div v-if="item.namaPj" class="text-[11px] text-base-content/60">
                    PJ: <strong class="text-base-content/80">{{ item.namaPj }}</strong>
                    <span v-if="item.noHpPj"> ({{ item.noHpPj }})</span>
                  </div>
                  <span v-if="!item.penduduk?.noTelepon && !item.namaPj" class="text-base-content/40">-</span>
                </td>
                <td class="py-3.5 px-4">
                  <div v-if="canManageData" class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      class="toggle toggle-success toggle-sm"
                      :checked="item.status === 'Y'"
                      :disabled="togglingId === item.id"
                      :aria-label="`Ubah status ${getPatientName(item)}`"
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
                      title="Detail & Penjamin Pasien"
                      @click="openDetailModal(item)"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary hover:bg-primary/10"
                      title="Edit Pasien"
                      @click="openEditModal(item)"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="canDeleteData"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10"
                      title="Hapus Pasien"
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
                <div class="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                  <span class="text-base-content/50">#{{ getRowNumber(index) }}</span>
                  <span class="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    RM: {{ item.noRm }}
                  </span>
                  <span
                    v-if="item.isBayiBaruLahir"
                    class="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 font-sans font-bold"
                  >
                    Bayi
                  </span>
                </div>
                <h3 class="font-bold text-sm text-base-content mt-1 break-words">
                  {{ getPatientName(item) }}
                </h3>
                <p class="text-[11px] font-mono text-base-content/60">
                  {{ getIdentityLabel(item) }}
                </p>
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
                Penjamin:
                <strong class="text-base-content">
                  {{ item.penjaminUtama?.penjamin?.nama || "-" }}
                </strong>
              </div>
              <div class="truncate font-mono">
                Kartu: {{ item.penjaminUtama?.noKartu || "-" }}
              </div>
              <div
                v-if="item.penjaminUtama?.kelasHak"
                class="truncate col-span-2"
              >
                Kelas Hak:
                <strong class="text-base-content">
                  {{ item.penjaminUtama.kelasHak.nama }}
                </strong>
              </div>
              <div class="truncate">
                HP: <strong class="text-base-content">{{ item.penduduk?.noTelepon || "-" }}</strong>
              </div>
              <div class="truncate">
                PJ: <strong class="text-base-content">{{ item.namaPj || "-" }}</strong>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                class="btn btn-xs btn-outline border-base-content/15 flex-1 rounded-xl gap-1"
                @click="openDetailModal(item)"
              >
                <ShieldCheck class="w-3.5 h-3.5 text-info" />
                Detail & Penjamin
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
          item-unit="Pasien"
          @change-page="handlePageChange"
        />
        <div
          v-else
          class="flex items-center justify-between pt-4 mt-4 border-t border-base-content/10 text-xs text-base-content/60 font-medium"
        >
          <span>
            Menampilkan <strong class="text-base-content">{{ items.length }}</strong> dari
            <strong class="text-base-content">{{ totalItems }}</strong> Pasien
          </span>
          <span>Halaman 1 dari 1</span>
        </div>
      </template>
    </div>

    <PasienFormModal
      :show="showFormModal"
      :edit-id="editingId"
      @close="showFormModal = false"
      @saved="fetchItems"
    />

    <PasienDetailModal
      :show="showDetailModal"
      :pasien-id="detailId"
      :can-manage-penjamin="canManageData"
      @close="showDetailModal = false"
      @penjamin-updated="fetchItems"
    />
  </div>
</template>

