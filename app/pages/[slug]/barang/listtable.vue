<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { BarangService } from "@/services/barang.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { Pencil, Trash2 } from "lucide-vue-next";

const { showToast } = useToast();
const barangService = BarangService();
const isEdit = ref(false);
const selectedId = ref<number | null>(null);

/* =========================
   STATE TABLE (FIX UTAMA)
========================= */
const serverOptions = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: "id",
  sortType: "desc",
});

const items = ref<any[]>([]);
const totalItems = ref(0);
const loading = ref(false);
const search = ref("");

/* =========================
   MODAL & FORM
========================= */
const showModal = ref(false);
const modalLoading = ref(false);
const submitLoading = ref(false);

interface BarangForm {
  nama: string;
  harga: number;
  stok: number;
  deskripsi: string;
}

const form = ref<BarangForm>({
  nama: "",
  harga: 0,
  stok: 0,
  deskripsi: "",
});

const formErrors = ref({
  nama: "",
  harga: "",
  stok: "",
});

const validateForm = () => {
  let isValid = true;
  formErrors.value = {
    nama: "",
    harga: "",
    stok: "",
  };

  if (!form.value.nama.trim()) {
    formErrors.value.nama = "Nama barang wajib diisi";
    isValid = false;
  }

  if (form.value.harga === undefined || form.value.harga === null || String(form.value.harga) === "") {
    formErrors.value.harga = "Harga barang wajib diisi";
    isValid = false;
  } else if (form.value.harga <= 0) {
    formErrors.value.harga = "Harga harus lebih besar dari Rp 0";
    isValid = false;
  }

  if (form.value.stok === undefined || form.value.stok === null || String(form.value.stok) === "") {
    formErrors.value.stok = "Stok barang wajib diisi";
    isValid = false;
  } else if (form.value.stok < 0) {
    formErrors.value.stok = "Stok tidak boleh bernilai negatif";
    isValid = false;
  }

  return isValid;
};

/* =========================
   TABLE HEADER
========================= */
const headers = [
  { text: "ID", value: "id", sortable: true },
  { text: "Nama", value: "nama", sortable: true },
  { text: "Harga", value: "harga", sortable: true },
  { text: "Stok", value: "stok", sortable: true },
  { text: "Deskripsi", value: "deskripsi" },
  { text: "Aksi", value: "aksi" },
];

/* =========================
   FETCH DATA
========================= */
const fetchBarang = async () => {
  loading.value = true;

  try {
    const data = await barangService.getBarang({
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
      search: search.value,
      sortBy: serverOptions.value.sortBy,
      sortType: serverOptions.value.sortType as "asc" | "desc",
    });

    items.value = data.array;
    totalItems.value = data.totalItems;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil data barang", "error");
  } finally {
    loading.value = false;
  }
};

/* =========================
   TABLE CHANGE HANDLER
========================= */
const updateOptions = (options: any) => {
  serverOptions.value = options;
  fetchBarang();
};

/* =========================
   SEARCH (DEBOUNCE)
========================= */
let searchTimeout: any;

watch(search, () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    serverOptions.value.page = 1;
    fetchBarang();
  }, 400);
});

const doSearch = () => {
  serverOptions.value.page = 1;
  fetchBarang();
};

/* =========================
   RESET FORM
========================= */
const resetForm = () => {
  form.value = {
    nama: "",
    harga: 0,
    stok: 0,
    deskripsi: "",
  };
  formErrors.value = {
    nama: "",
    harga: "",
    stok: "",
  };
}; 

/* =========================
   INIT
========================= */
const editBarang = (item: any) => {
  getBarangById(item.id);
};

onMounted(() => {
  fetchBarang();
});

const getBarangById = async (id: number) => {
  showModal.value = true;
  modalLoading.value = true;
  try {
    const res: any = await barangService.getBarangById(id);

    form.value = {
      nama: res.nama,
      harga: res.harga,
      stok: res.stok,
      deskripsi: res.deskripsi || "",
    };

    selectedId.value = id;
    isEdit.value = true;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil detail barang", "error");
    showModal.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const updateBarang = async () => {
  if (!selectedId.value) return;

  submitLoading.value = true;
  try {
    const res: any = await barangService.updateBarang(
      selectedId.value,
      form.value,
    );

    if (res?.success) {
      showToast("Barang berhasil diupdate", "success");
      showModal.value = false;
      resetForm();
      isEdit.value = false;
      selectedId.value = null;
      fetchBarang();
    } else {
      showToast("Gagal update barang", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Terjadi kesalahan server", "error");
  } finally {
    submitLoading.value = false;
  }
};

const submitBarang = async () => {
  if (!validateForm()) return;
  return isEdit.value ? updateBarang() : createBarang();
};

const createBarang = async () => {
  submitLoading.value = true;
  try {
    const res: any = await barangService.createBarang(form.value);

    if (res?.success) {
      showToast("Barang berhasil ditambahkan", "success");
      showModal.value = false;
      resetForm();
      fetchBarang();
    } else {
      showToast("Gagal menambahkan barang", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Terjadi kesalahan server", "error");
  } finally {
    submitLoading.value = false;
  }
};

const deleteBarang = async (id: number) => {
  const result = await Swal.fire({
    title: "Hapus Barang?",
    text: "Data yang dihapus tidak dapat dikembalikan.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
    customClass: {
      popup: "rounded-2xl border border-slate-100",
    },
  });

  if (!result.isConfirmed) return;

  loading.value = true;

  try {
    const res: any = await barangService.deleteBarang(id);

    if (res?.success) {
      showToast("Barang berhasil dihapus", "success");
      fetchBarang();
    } else {
      showToast("Gagal menghapus barang", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Terjadi kesalahan server", "error");
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  resetForm();
  isEdit.value = false;
  selectedId.value = null;
  showModal.value = true;
};
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <HeaderSearch title="Data Barang" subtitle="Kelola dan monitoring inventori barang Anda" :total="totalItems" v-model:search="search"
      @search="doSearch" @add="openCreateModal" />

    <!-- TABLE WRAPPER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-premium p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold text-base-content text-lg tracking-tight">Daftar Barang</h2>
      </div>

      <div class="overflow-x-auto">
        <ClientOnly>
          <EasyDataTable :headers="headers" :items="items" :loading="loading" :server-items-length="totalItems"
            v-model:server-options="serverOptions" @update:server-options="updateOptions" buttons-pagination
            :rows-items="[10, 20, 50, 100]">
            <!-- Column Customizers -->
            <template #item-id="{ id }">
              <span class="font-semibold text-base-content/40">#{{ id }}</span>
            </template>

            <template #item-nama="{ nama }">
              <span class="font-bold text-base-content">{{ nama }}</span>
            </template>

            <template #item-harga="{ harga }">
              <span class="font-semibold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-lg text-xs">
                Rp {{ Number(harga).toLocaleString() }}
              </span>
            </template>

            <template #item-stok="{ stok }">
              <span class="font-semibold px-2.5 py-1 rounded-lg text-xs" :class="[
                stok > 10 ? 'text-success bg-success/10 border border-success/20' : 'text-warning bg-warning/10 border border-warning/20',
              ]">
                {{ stok }} Pcs
              </span>
            </template>

            <template #item-deskripsi="{ deskripsi }">
              <span class="text-base-content/60 text-xs block max-w-xs truncate" :title="deskripsi">
                {{ deskripsi || '-' }}
              </span>
            </template>

            <template #item-aksi="item">
              <div class="flex items-center gap-1">
                <button class="btn btn-sm btn-ghost hover:bg-primary/10 text-primary hover:text-primary rounded-lg p-2 transition flex items-center gap-1.5" @click="editBarang(item)" title="Edit">
                  <Pencil class="w-4 h-4" />
                  <span class="hidden lg:inline text-xs font-semibold">Edit</span>
                </button>
                <button class="btn btn-sm btn-ghost hover:bg-error/10 text-error hover:text-error rounded-lg p-2 transition flex items-center gap-1.5" @click="deleteBarang(item.id)" title="Hapus">
                  <Trash2 class="w-4 h-4" />
                  <span class="hidden lg:inline text-xs font-semibold">Hapus</span>
                </button>
              </div>
            </template>
          </EasyDataTable>
        </ClientOnly>
      </div>
    </div>

    <!-- MODAL (backdrop-blur-md) -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showModal" />

      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showModal = false)">
        <div class="modal-box max-w-2xl bg-base-100 rounded-2xl border border-base-content/10 p-6 shadow-premium relative text-base-content">
          <!-- Close button x -->
          <button class="absolute top-4 right-4 text-base-content/40 hover:text-base-content/70 transition" @click="showModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 class="font-bold text-base-content text-lg tracking-tight mb-4">
            {{ isEdit ? "Edit Data Barang" : "Tambah Barang Baru" }}
          </h3>

          <!-- Skeleton loader inside Modal -->
          <div v-if="modalLoading" class="space-y-4 py-8 animate-pulse">
            <div class="space-y-1.5">
              <div class="h-3 bg-base-300 rounded w-20"></div>
              <div class="h-10 bg-base-200 rounded-xl w-full"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <div class="h-3 bg-base-300 rounded w-16"></div>
                <div class="h-10 bg-base-200 rounded-xl"></div>
              </div>
              <div class="space-y-1.5">
                <div class="h-3 bg-base-300 rounded w-12"></div>
                <div class="h-10 bg-base-200 rounded-xl"></div>
              </div>
            </div>
            <div class="space-y-1.5">
              <div class="h-3 bg-base-300 rounded w-24"></div>
              <div class="h-28 bg-base-200 rounded-xl w-full"></div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div>
              <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Nama Barang</label>
              <input v-model="form.nama" class="input input-bordered w-full rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-base-100 text-base-content" :class="{'border-error focus:ring-error/20 focus:border-error': formErrors.nama}" placeholder="Masukkan nama barang" />
              <span v-if="formErrors.nama" class="text-xs text-error font-medium mt-1 block">{{ formErrors.nama }}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Harga Barang</label>
                <input v-model.number="form.harga" type="number" class="input input-bordered w-full rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-base-100 text-base-content" :class="{'border-error focus:ring-error/20 focus:border-error': formErrors.harga}" placeholder="Rp 0" />
                <span v-if="formErrors.harga" class="text-xs text-error font-medium mt-1 block">{{ formErrors.harga }}</span>
              </div>
              <div>
                <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Stok</label>
                <input v-model.number="form.stok" type="number" class="input input-bordered w-full rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-base-100 text-base-content" :class="{'border-error focus:ring-error/20 focus:border-error': formErrors.stok}" placeholder="0" />
                <span v-if="formErrors.stok" class="text-xs text-error font-medium mt-1 block">{{ formErrors.stok }}</span>
              </div>
            </div>

            <div>
              <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Deskripsi Barang <span class="text-base-content/40 font-normal text-[10px] lowercase">(opsional)</span></label>
              <textarea v-model="form.deskripsi" class="textarea textarea-bordered w-full rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 h-28 bg-base-100 text-base-content" placeholder="Masukkan deskripsi barang..." />
            </div>
          </div>

          <div class="modal-action gap-2" v-if="!modalLoading">
            <button class="btn btn-ghost hover:bg-base-200 rounded-xl font-bold" @click="showModal = false" :disabled="submitLoading">
              Batal
            </button>
            <button class="btn btn-primary rounded-xl font-bold px-6 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 flex items-center gap-2" @click="submitBarang" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
              {{ isEdit ? "Simpan Data" : "Tambah Data" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

