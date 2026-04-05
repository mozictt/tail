<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { useApi } from "@/composables/useApi";

const { showToast } = useToast();
const api = useApi();

const loading = ref(false);
const items = ref([]);
const page = ref(1);
const limit = ref(10);
const totalItems = ref(0);
const search = ref("");

const headers = [
  { text: "ID", value: "id", sortable: true },
  { text: "Nama", value: "nama", sortable: true },
  { text: "Harga", value: "harga", sortable: true },
  { text: "Stok", value: "stok", sortable: true },
  { text: "Deskripsi", value: "deskripsi" }
];
 

const fetchData = async () => {
  try {
    loading.value = true;

    const res: any = await api("/barang", {
      params: { page: page.value, limit: limit.value, search: search.value },
    });
    console.log("Fetch barang response:");
    // update UI langsung
    items.value = res.data.array;
    totalItems.value = res.data.totalItems;
  } catch (err) {
    console.log("Fetch barang error:");
  } finally {
    loading.value = false;
  }
};

const serverOptions = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: "id",
  sortType: "desc"
});

const updateOptions = (options: any) => {
  page.value = options.page;
  limit.value = options.rowsPerPage;
  fetchData();
};

onMounted(fetchData);
const doSearch = () => { page.value = 1; fetchData(); };
watch(search, () => { page.value = 1; fetchData(); });

const showModal = ref(false);
const form = ref({ nama: "", harga: 0, stok: 0, deskripsi: "" });

const submitBarang = async () => {
  try {
    loading.value = true;
    const res: any = await api("/barang", { method: "POST", body: form.value });
    if (res.success) {
      showToast("Barang berhasil ditambahkan", "success");
      showModal.value = false;
      form.value = { nama: "", harga: 0, stok: 0, deskripsi: "" };
      fetchData();
    }
  } catch (err) {
    showToast("Gagal menambahkan barang", "error");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="p-6 space-y-6">

    <!-- HEADER -->
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold text-primary">Data Barang</h1>
        <p class="text-sm opacity-70">Manajemen daftar barang</p>
      </div>

      <button class="btn btn-primary btn-sm md:btn-md bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white" @click="showModal = true">
        + Tambah Barang
      </button>
    </div>

    <!-- CARD -->
    <div class="card bg-base-100 border border-gray-200 rounded-lg">

      <div class="card-body space-y-4">

        <!-- SEARCH -->
        <div class="flex flex-col md:flex-row justify-between items-center gap-3">
          <div class="form-control w-full max-w-xs">
            <div class="input-group">
              <input v-model="search" @keyup.enter="doSearch" type="text" placeholder="Cari barang..." class="input input-bordered w-full" />
              <button class="btn btn-square btn-primary bg-gradient-to-r from-green-400 to-teal-500 hover:from-teal-500 hover:to-green-400 text-white" @click="doSearch">🔍</button>
            </div>
          </div>
          <div class="text-sm opacity-60">Total: {{ totalItems }} data</div>
        </div>

        <!-- DATATABLE -->
        <div class="overflow-x-auto rounded-lg">
          <ClientOnly>
            <EasyDataTable
              class="table table-zebra table-hover border border-gray-200 rounded-lg"
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
                <span class="badge badge-success badge-outline">Rp {{ Number(harga).toLocaleString() }}</span>
              </template>

              <template #item-stok="{ stok }">
                <span :class="['badge', stok > 10 ? 'badge-success' : 'badge-warning']">{{ stok }}</span>
              </template>
            </EasyDataTable>
          </ClientOnly>
        </div>

      </div>
    </div>
  </div>

  <!-- MODAL -->
  <input type="checkbox" class="modal-toggle" v-model="showModal" />
  <div class="modal">
    <div class="modal-box w-full max-w-lg rounded-lg border border-gray-200">
      <h3 class="font-bold text-lg mb-4">Tambah Barang</h3>

      <div class="space-y-3">
        <input v-model="form.nama" type="text" placeholder="Nama Barang" class="input input-bordered w-full" />
        <input v-model.number="form.harga" type="number" placeholder="Harga" class="input input-bordered w-full" />
        <input v-model.number="form.stok" type="number" placeholder="Stok" class="input input-bordered w-full" />
        <textarea v-model="form.deskripsi" placeholder="Deskripsi" class="textarea textarea-bordered w-full"></textarea>
      </div>

      <div class="modal-action">
        <button class="btn btn-primary bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white" @click="submitBarang">Simpan</button>
        <button class="btn btn-outline" @click="showModal = false">Batal</button>
      </div>
    </div>
  </div>
</template>