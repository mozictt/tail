<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { BarangService } from "@/services/barang.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";

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
const validateForm = () => {
  if (!form.value.nama) {
    showToast("Nama wajib diisi", "warning");
    return false;
  }
  if (form.value.harga <= 0) {
    showToast("Harga harus > 0", "warning");
    return false;
  }
  return true;
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
  { text: "Aksi", value: "aksi" }, // ✅ tambahan
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
      sortBy: serverOptions.value.sortBy, // ✅ tambahan
      sortType: serverOptions.value.sortType, // ✅ tambahan
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
}; 

/* =========================
   INIT
========================= */
const editBarang = (item: any) => {
  getBarangById(item.id);
};
onMounted(fetchBarang);
const getBarangById = async (id: number) => {
  loading.value = true;
  try {
    const res: any = await barangService.getBarangById(id);

    form.value = {
      nama: res.nama,
      harga: res.harga,
      stok: res.stok,
      deskripsi: res.deskripsi,
    };

    selectedId.value = id;
    isEdit.value = true;
    showModal.value = true;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil detail barang", "error");
  } finally {
    loading.value = false;
  }
};
const updateBarang = async () => {
  if (!selectedId.value) return;

  loading.value = true;
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
    loading.value = false;
  }
};
const submitBarang = async () => {
   if (!validateForm()) return;
  return isEdit.value ? updateBarang() : createBarang();
};
const createBarang = async () => {
  loading.value = true;
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
    loading.value = false;
  }
}
const deleteBarang = async (id: number) => {
  const result = await Swal.fire({
    title: "Yakin hapus?",
    text: "Data tidak bisa dikembalikan!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, hapus",
    cancelButtonText: "Batal",
    reverseButtons: true,
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
  <div class="p-6">
    <!-- HEADER -->
    <HeaderSearch title="Data Barang" subtitle="Manajemen barang" :total="totalItems" v-model:search="search"
      @search="doSearch" @add="openCreateModal" />

    <!-- TABLE -->
    <div class="bg-base-100 border rounded-lg shadow-sm p-4 mt-5">
      <!-- HEADER -->
      <div class="px-4 py-3 border-b flex justify-between items-center">
        <h2 class="font-semibold text-lg">Daftar Barang</h2>
      </div>

      <!-- BODY -->
      <div class="p-4">
        <div class="overflow-x-auto">
          <ClientOnly>
            <div class="overflow-x-auto">
              <EasyDataTable :headers="headers" :items="items" :loading="loading" :server-items-length="totalItems"
                v-model:server-options="serverOptions" @update:server-options="updateOptions" buttons-pagination
                border-cell alternating :rows-items="[10, 20, 50, 100]">
                <template #item-harga="{ harga }">
                  <span class="badge badge-success">
                    Rp {{ Number(harga).toLocaleString() }}
                  </span>
                </template>

                <template #item-stok="{ stok }">
                  <span :class="[
                    'badge',
                    stok > 10 ? 'badge-success' : 'badge-warning',
                  ]">
                    {{ stok }}
                  </span>
                </template>
                <template #item-aksi="item">
                  <button class="btn btn-sm btn-warning mr-2" @click="editBarang(item)">
                    Edit
                  </button>
                  <button class="btn btn-sm btn-error" @click="deleteBarang(item.id)">
                    Delete
                  </button>
                </template>
              </EasyDataTable>
            </div>
          </ClientOnly>
        </div>
      </div>
    </div>
    <!-- MODAL -->
    <input type="checkbox" class="modal-toggle" v-model="showModal" />

    <div class="modal">
      <div class="modal-box max-w-3xl">
        <h3 class="font-bold text-lg mb-4">
          {{ isEdit ? "Edit Barang" : "Tambah Barang" }}
        </h3>

        <div class="space-y-3">
          <input v-model="form.nama" class="input input-bordered w-full" placeholder="Nama" />
          <input v-model.number="form.harga" class="input input-bordered w-full" placeholder="Harga" />
          <input v-model.number="form.stok" class="input input-bordered w-full" placeholder="Stok" />
          <textarea v-model="form.deskripsi" class="textarea textarea-bordered w-full" />
        </div>

        <div class="modal-action">
          <button class="btn btn-primary" @click="submitBarang">Simpan</button>
          <button class="btn btn-outline" @click="showModal = false">
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
