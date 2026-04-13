<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { BarangService } from "@/services/barang.service";

const { showToast } = useToast();
const barangService = BarangService();

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

const form = ref({
  nama: "",
  harga: 0,
  stok: 0,
  deskripsi: "",
});

/* =========================
   TABLE HEADER
========================= */
const headers = [
  { text: "ID", value: "id", sortable: true },
  { text: "Nama", value: "nama", sortable: true },
  { text: "Harga", value: "harga", sortable: true },
  { text: "Stok", value: "stok", sortable: true },
  { text: "Deskripsi", value: "deskripsi" },
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
   CREATE
========================= */
const submitBarang = async () => {
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
};

/* =========================
   INIT
========================= */
onMounted(fetchBarang);
</script>

<template>
  <div class="p-6 space-y-6">

    <!-- HEADER -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Data Barang</h1>
        <p class="text-sm opacity-60">Manajemen barang</p>
      </div>

      <button class="btn btn-primary" @click="showModal = true">
        + Tambah Barang
      </button>
    </div>

    <!-- SEARCH -->
    <div class="flex justify-between items-center">
      <div class="flex gap-2">
        <input
          v-model="search"
          @keyup.enter="doSearch"
          class="input input-bordered"
          placeholder="Cari barang..."
        />
        <button class="btn btn-primary" @click="doSearch">
          Search
        </button>
      </div>

      <div class="text-sm opacity-60">
        Total: {{ totalItems }}
      </div>
    </div>

    <!-- TABLE -->
    <ClientOnly>
      <EasyDataTable
        :headers="headers"
        :items="items"
        :loading="loading"
        :server-items-length="totalItems"
        v-model:server-options="serverOptions"
        @update:server-options="updateOptions"
        buttons-pagination
        border-cell
        alternating
        :rows-items="[10, 20, 50, 100]"
      >
        <template #item-harga="{ harga }">
          <span class="badge badge-success">
            Rp {{ Number(harga).toLocaleString() }}
          </span>
        </template>

        <template #item-stok="{ stok }">
          <span :class="['badge', stok > 10 ? 'badge-success' : 'badge-warning']">
            {{ stok }}
          </span>
        </template>
      </EasyDataTable>
    </ClientOnly>

    <!-- MODAL -->
    <input type="checkbox" class="modal-toggle" v-model="showModal" />

    <div class="modal">
      <div class="modal-box">

        <h3 class="font-bold text-lg mb-4">Tambah Barang</h3>

        <div class="space-y-3">
          <input v-model="form.nama" class="input input-bordered w-full" placeholder="Nama" />
          <input v-model.number="form.harga" class="input input-bordered w-full" placeholder="Harga" />
          <input v-model.number="form.stok" class="input input-bordered w-full" placeholder="Stok" />
          <textarea v-model="form.deskripsi" class="textarea textarea-bordered w-full" />
        </div>

        <div class="modal-action">
          <button class="btn btn-primary" @click="submitBarang">
            Simpan
          </button>
          <button class="btn btn-outline" @click="showModal = false">
            Batal
          </button>
        </div>

      </div>
    </div>

  </div>
</template>