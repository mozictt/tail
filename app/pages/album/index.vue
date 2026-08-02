<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { AlbumService, type Album } from "@/services/album.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { Pencil, Trash2, Image as ImageIcon } from "lucide-vue-next";
import { useRouter } from "vue-router";

definePageMeta({
  layout: "admin",
});

const { showToast } = useToast();
const albumService = AlbumService();
const router = useRouter();

const isEdit = ref(false);
const selectedId = ref<string | null>(null);

/* =========================
   STATE TABLE
========================= */
const items = ref<Album[]>([]);
const totalItems = ref(0);
const loading = ref(false);
const search = ref("");

const serverOptions = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: "createdAt",
  sortType: "desc",
});

/* =========================
   MODAL & FORM
========================= */
const showModal = ref(false);
const modalLoading = ref(false);
const submitLoading = ref(false);

const form = ref<Partial<Album>>({
  name: "",
  description: "",
  date: "",
});

const formErrors = ref({
  name: "",
  date: "",
});

const validateForm = () => {
  let isValid = true;
  formErrors.value = {
    name: "",
    date: "",
  };

  if (!form.value.name?.trim()) {
    formErrors.value.name = "Nama album wajib diisi";
    isValid = false;
  }
  
  if (!form.value.date) {
    formErrors.value.date = "Tanggal album wajib diisi";
    isValid = false;
  }

  return isValid;
};

/* =========================
   TABLE HEADER
========================= */
const headers = [
  { text: "Nama Album", value: "name", sortable: true },
  { text: "Tanggal", value: "date", sortable: true },
  { text: "Deskripsi", value: "description" },
  { text: "Aksi", value: "aksi" },
];

/* =========================
   FETCH DATA
========================= */
const fetchAlbums = async () => {
  loading.value = true;
  try {
    const data = await albumService.getAlbums();
    // Simulate server side search & pagination on client side since the API doesn't seem to have it based on DTO
    let filteredData = data;
    if (search.value) {
      const s = search.value.toLowerCase();
      filteredData = data.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          (a.description && a.description.toLowerCase().includes(s))
      );
    }
    
    // sorting
    const sortBy = serverOptions.value.sortBy;
    const sortType = serverOptions.value.sortType === "desc" ? -1 : 1;
    filteredData.sort((a: any, b: any) => {
      if (a[sortBy] < b[sortBy]) return -1 * sortType;
      if (a[sortBy] > b[sortBy]) return 1 * sortType;
      return 0;
    });
    
    totalItems.value = filteredData.length;
    
    // pagination
    const start = (serverOptions.value.page - 1) * serverOptions.value.rowsPerPage;
    const end = start + serverOptions.value.rowsPerPage;
    items.value = filteredData.slice(start, end);
    
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil data album", "error");
  } finally {
    loading.value = false;
  }
};

const updateOptions = (options: any) => {
  serverOptions.value = options;
  fetchAlbums();
};

let searchTimeout: any;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    serverOptions.value.page = 1;
    fetchAlbums();
  }, 400);
});

const doSearch = () => {
  serverOptions.value.page = 1;
  fetchAlbums();
};

/* =========================
   RESET FORM
========================= */
const resetForm = () => {
  form.value = {
    name: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
  };
  formErrors.value = {
    name: "",
    date: "",
  };
}; 

/* =========================
   INIT & CRUD
========================= */
onMounted(() => {
  fetchAlbums();
});

const editAlbum = async (item: Album) => {
  if (!item.id) return;
  showModal.value = true;
  modalLoading.value = true;
  try {
    const res = await albumService.getAlbumById(item.id);
    form.value = {
      name: res.name,
      description: res.description || "",
      date: res.date ? new Date(res.date).toISOString().split('T')[0] : "",
    };
    selectedId.value = item.id;
    isEdit.value = true;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil detail album", "error");
    showModal.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const submitAlbum = async () => {
  if (!validateForm()) return;
  
  submitLoading.value = true;
  try {
    const payload = {
      ...form.value,
      // pastikan format ISO
      date: form.value.date ? new Date(form.value.date).toISOString() : undefined
    };

    if (isEdit.value && selectedId.value) {
      await albumService.updateAlbum(selectedId.value, payload);
      showToast("Album berhasil diupdate", "success");
    } else {
      await albumService.createAlbum(payload);
      showToast("Album berhasil ditambahkan", "success");
    }
    showModal.value = false;
    resetForm();
    isEdit.value = false;
    selectedId.value = null;
    fetchAlbums();
  } catch (err) {
    console.error(err);
    showToast("Terjadi kesalahan server", "error");
  } finally {
    submitLoading.value = false;
  }
};

const deleteAlbum = async (id: string) => {
  const result = await Swal.fire({
    title: "Hapus Album?",
    text: "Semua media di dalam album ini juga akan terhapus.",
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
    await albumService.deleteAlbum(id);
    showToast("Album berhasil dihapus", "success");
    fetchAlbums();
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus album", "error");
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

const viewGallery = (id: string) => {
  router.push({ path: '/gallery', query: { albumId: id } });
};

</script>

<template>
  <div class="space-y-6">
    <HeaderSearch 
      title="Manajemen Album" 
      subtitle="Kelola album galeri Anda" 
      :total="totalItems" 
      v-model:search="search"
      @search="doSearch" 
      @add="openCreateModal" 
    />

    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-premium p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold text-base-content text-lg tracking-tight">Daftar Album</h2>
      </div>

      <div class="overflow-x-auto">
        <ClientOnly>
          <EasyDataTable 
            :headers="headers" 
            :items="items" 
            :loading="loading" 
            :server-items-length="totalItems"
            v-model:server-options="serverOptions" 
            @update:server-options="updateOptions" 
            buttons-pagination
            :rows-items="[10, 20, 50, 100]"
          >
            <template #item-name="{ name, id }">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ImageIcon class="w-5 h-5" />
                </div>
                <div class="font-bold text-base-content cursor-pointer hover:text-primary transition" @click="viewGallery(id)">
                  {{ name }}
                </div>
              </div>
            </template>

            <template #item-date="{ date }">
              <span class="font-medium px-3 py-1 bg-base-200 rounded-lg text-xs border border-base-content/5">
                {{ date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-' }}
              </span>
            </template>

            <template #item-description="{ description }">
              <span class="text-base-content/60 text-sm block max-w-sm truncate" :title="description">
                {{ description || 'Tidak ada deskripsi' }}
              </span>
            </template>

            <template #item-aksi="item">
              <div class="flex items-center gap-1">
                <button class="btn btn-sm btn-ghost hover:bg-info/10 text-info hover:text-info rounded-lg p-2 transition flex items-center gap-1.5" @click="viewGallery(item.id)" title="Lihat Galeri">
                  <ImageIcon class="w-4 h-4" />
                  <span class="hidden xl:inline text-xs font-semibold">Galeri</span>
                </button>
                <button class="btn btn-sm btn-ghost hover:bg-primary/10 text-primary hover:text-primary rounded-lg p-2 transition flex items-center gap-1.5" @click="editAlbum(item)" title="Edit">
                  <Pencil class="w-4 h-4" />
                  <span class="hidden lg:inline text-xs font-semibold">Edit</span>
                </button>
                <button class="btn btn-sm btn-ghost hover:bg-error/10 text-error hover:text-error rounded-lg p-2 transition flex items-center gap-1.5" @click="deleteAlbum(item.id)" title="Hapus">
                  <Trash2 class="w-4 h-4" />
                  <span class="hidden lg:inline text-xs font-semibold">Hapus</span>
                </button>
              </div>
            </template>
          </EasyDataTable>
        </ClientOnly>
      </div>
    </div>

    <!-- MODAL -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showModal = false)">
        <div class="modal-box max-w-xl bg-base-100 rounded-2xl border border-base-content/10 p-6 shadow-premium relative text-base-content">
          <button class="absolute top-4 right-4 text-base-content/40 hover:text-base-content/70 transition" @click="showModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 class="font-bold text-base-content text-lg tracking-tight mb-6 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon class="w-4 h-4" />
            </div>
            {{ isEdit ? "Edit Album" : "Tambah Album Baru" }}
          </h3>

          <div v-if="modalLoading" class="space-y-4 animate-pulse">
            <div class="h-10 bg-base-200 rounded-xl w-full"></div>
            <div class="h-10 bg-base-200 rounded-xl w-full"></div>
            <div class="h-28 bg-base-200 rounded-xl w-full"></div>
          </div>

          <div v-else class="space-y-4">
            <div>
              <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Nama Album</label>
              <input v-model="form.name" class="input input-bordered w-full rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-base-100 text-base-content" :class="{'border-error': formErrors.name}" placeholder="Cth: Dokumentasi 2024" />
              <span v-if="formErrors.name" class="text-xs text-error font-medium mt-1 block">{{ formErrors.name }}</span>
            </div>
            
            <div>
              <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Tanggal</label>
              <input v-model="form.date" type="date" class="input input-bordered w-full rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-base-100 text-base-content" :class="{'border-error': formErrors.date}" />
              <span v-if="formErrors.date" class="text-xs text-error font-medium mt-1 block">{{ formErrors.date }}</span>
            </div>

            <div>
              <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Deskripsi <span class="text-base-content/40 font-normal text-[10px] lowercase">(opsional)</span></label>
              <textarea v-model="form.description" class="textarea textarea-bordered w-full rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 h-28 bg-base-100 text-base-content" placeholder="Ceritakan tentang album ini..." />
            </div>
          </div>

          <div class="modal-action gap-2 mt-6" v-if="!modalLoading">
            <button class="btn btn-ghost hover:bg-base-200 rounded-xl font-bold" @click="showModal = false" :disabled="submitLoading">
              Batal
            </button>
            <button class="btn btn-primary rounded-xl font-bold px-6 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 flex items-center gap-2" @click="submitAlbum" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
              {{ isEdit ? "Simpan Perubahan" : "Buat Album" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
