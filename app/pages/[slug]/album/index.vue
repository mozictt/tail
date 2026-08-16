<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { AlbumService, type Album } from "@/services/album.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { Pencil, Trash2, FolderOpen, Calendar, ArrowRight, Images, Plus, RefreshCw } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useSlugRoute } from "@/composables/useSlugRoute";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const albumService = AlbumService();
const router = useRouter();
const { slugPath } = useSlugRoute();

const isEdit = ref(false);
const selectedId = ref<string | null>(null);

/* =========================
   STATE & DATA TABLE OPTIONS
========================= */
const headers = [
  { text: "NAMA ALBUM", value: "name", sortable: true },
  { text: "DESKRIPSI", value: "description", sortable: false },
  { text: "TANGGAL KEGIATAN", value: "date", sortable: true },
  { text: "TANGGAL DIBUAT", value: "createdAt", sortable: true },
  { text: "AKSI", value: "aksi", sortable: false },
];

const serverOptions = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: "createdAt",
  sortType: "desc",
});

const items = ref<Album[]>([]);
const totalItems = ref(0);
const loading = ref(false);
const search = ref("");

/* =========================
   MODAL & FORM
========================= */
const showModal = ref(false);
const modalLoading = ref(false);
const submitLoading = ref(false);

const form = ref<Partial<Album>>({
  name: "",
  description: "",
  date: new Date().toISOString().split('T')[0],
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
   FETCH DATA ALBUMS
========================= */
const fetchAlbums = async () => {
  loading.value = true;
  try {
    const res = await albumService.getAlbums({
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
      search: search.value.trim(),
      sortBy: serverOptions.value.sortBy || "createdAt",
      sortType: (serverOptions.value.sortType || "desc").toUpperCase(),
    });

    items.value = res.array || [];
    totalItems.value = res.totalItems || 0;
  } catch (err) {
    console.error("Gagal mengambil data album:", err);
    showToast("Gagal mengambil data album", "error");
  } finally {
    loading.value = false;
  }
};

const updateOptions = (options: any) => {
  serverOptions.value = options;
  fetchAlbums();
};

const handleSearch = () => {
  serverOptions.value.page = 1;
  fetchAlbums();
};

let searchTimeout: any = null;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    serverOptions.value.page = 1;
    fetchAlbums();
  }, 400);
});

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
    text: "Semua media di dalam album ini juga akan terhapus secara permanen.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
    customClass: {
      popup: "rounded-3xl border border-slate-100",
    },
  });

  if (!result.isConfirmed) return;

  try {
    await albumService.deleteAlbum(id);
    showToast("Album berhasil dihapus", "success");
    fetchAlbums();
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus album", "error");
  }
};

const openCreateModal = () => {
  resetForm();
  isEdit.value = false;
  selectedId.value = null;
  showModal.value = true;
};

const viewGallery = (id: string) => {
  router.push({ path: slugPath('/gallery'), query: { albumId: id } });
};

const formatDate = (dateStr?: string | Date) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <HeaderSearch 
      title="Manajemen Album" 
      subtitle="Kelola dan organisasikan galeri Anda ke dalam album" 
      :total="totalItems" 
      v-model:search="search"
      @search="handleSearch" 
      @add="openCreateModal" 
    />

    <!-- CONTROL & SUMMARY BAR -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-base-100 p-4 rounded-3xl border border-base-content/10 shadow-xs">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
          <FolderOpen class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-extrabold text-sm text-base-content">Daftar Data Album</h3>
          <p class="text-xs text-base-content/60">Tabel data album galeri perusahaan</p>
        </div>
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <span class="text-xs font-bold text-base-content/60">
          Total: <span class="text-base-content font-extrabold">{{ totalItems }} Album</span>
        </span>

        <button 
          class="btn btn-ghost btn-sm btn-square rounded-xl hover:bg-base-200"
          @click="fetchAlbums"
          :disabled="loading"
          title="Refresh Data"
        >
          <RefreshCw class="w-4 h-4 text-base-content/70" :class="{'animate-spin': loading}" />
        </button>
      </div>
    </div>

    <!-- DATA TABLE SECTION -->
    <div class="bg-base-100 border border-base-content/10 rounded-3xl shadow-sm p-6 overflow-hidden">
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
            :rows-items="[10, 20, 50]"
            table-class-name="customize-easy-table"
          >
            <!-- Column Nama Album Customizer -->
            <template #item-name="{ name, id }">
              <div class="flex items-center gap-3 py-1.5">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-primary font-black flex items-center justify-center shrink-0 shadow-xs">
                  <FolderOpen class="w-5 h-5" />
                </div>
                <div>
                  <h4 class="font-extrabold text-sm text-base-content tracking-tight hover:text-primary transition-colors cursor-pointer" @click="viewGallery(id)">
                    {{ name }}
                  </h4>
                  <span class="text-[10px] font-mono font-semibold text-base-content/40">ID: {{ id ? id.substring(0, 8) + '...' : '-' }}</span>
                </div>
              </div>
            </template>

            <!-- Column Deskripsi Customizer -->
            <template #item-description="{ description }">
              <span class="text-xs text-base-content/70 block max-w-xs truncate" :title="description || 'Tidak ada deskripsi'">
                {{ description || '-' }}
              </span>
            </template>

            <!-- Column Tanggal Kegiatan Customizer -->
            <template #item-date="{ date }">
              <div class="flex items-center gap-1.5 text-xs font-semibold text-base-content/80">
                <Calendar class="w-3.5 h-3.5 text-primary/70" />
                <span>{{ formatDate(date) }}</span>
              </div>
            </template>

            <!-- Column Tanggal Dibuat Customizer -->
            <template #item-createdAt="{ createdAt }">
              <div class="flex items-center gap-1.5 text-xs font-semibold text-base-content/60">
                <span>{{ formatDate(createdAt) }}</span>
              </div>
            </template>

            <!-- Column Action Customizer -->
            <template #item-aksi="item">
              <div class="flex items-center justify-end gap-2">
                <button 
                  class="btn btn-sm btn-outline btn-primary rounded-xl font-bold px-3 hover:shadow-md transition-all flex items-center gap-1.5 text-xs"
                  @click="viewGallery(item.id)"
                  title="Buka Galeri Album"
                >
                  <Images class="w-3.5 h-3.5" />
                  <span>Galeri</span>
                </button>

                <button 
                  class="w-8 h-8 rounded-xl bg-base-200/60 border border-base-content/10 text-base-content/70 hover:bg-info hover:text-white hover:border-transparent transition flex items-center justify-center shadow-xs" 
                  @click="editAlbum(item)" 
                  title="Edit Album"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>

                <button 
                  class="w-8 h-8 rounded-xl bg-base-200/60 border border-base-content/10 text-base-content/70 hover:bg-error hover:text-white hover:border-transparent transition flex items-center justify-center shadow-xs" 
                  @click="deleteAlbum(item.id)" 
                  title="Hapus Album"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </template>
          </EasyDataTable>
        </ClientOnly>
      </div>
    </div>

    <!-- MODAL CREATE / EDIT ALBUM -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showModal = false)">
        <div class="modal-box max-w-xl bg-base-100 rounded-3xl border border-base-content/10 p-8 shadow-2xl relative text-base-content">
          <button class="absolute top-6 right-6 text-base-content/40 hover:text-error hover:rotate-90 transition-all duration-300" @click="showModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 class="font-extrabold text-base-content text-2xl tracking-tight mb-8 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderOpen class="w-5 h-5" />
            </div>
            {{ isEdit ? "Edit Album" : "Tambah Album Baru" }}
          </h3>

          <div v-if="modalLoading" class="space-y-5 animate-pulse">
            <div class="h-12 bg-base-200 rounded-2xl w-full"></div>
            <div class="h-12 bg-base-200 rounded-2xl w-full"></div>
            <div class="h-32 bg-base-200 rounded-2xl w-full"></div>
          </div>

          <div v-else class="space-y-5">
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">Nama Album <span class="text-error">*</span></label>
              <input v-model="form.name" class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 font-medium" :class="{'border-error': formErrors.name}" placeholder="Cth: Dokumentasi 2024" />
              <span v-if="formErrors.name" class="text-xs text-error font-semibold mt-1.5 block">{{ formErrors.name }}</span>
            </div>
            
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">Tanggal Kegiatan <span class="text-error">*</span></label>
              <input v-model="form.date" type="date" class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 font-medium" :class="{'border-error': formErrors.date}" />
              <span v-if="formErrors.date" class="text-xs text-error font-semibold mt-1.5 block">{{ formErrors.date }}</span>
            </div>

            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">Deskripsi <span class="text-base-content/40 font-normal normal-case">(opsional)</span></label>
              <textarea v-model="form.description" class="textarea textarea-bordered w-full rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 h-32 bg-base-100 resize-none font-medium text-sm leading-relaxed" placeholder="Ceritakan detail tentang album ini..." />
            </div>
          </div>

          <div class="modal-action gap-3 mt-8" v-if="!modalLoading">
            <button class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6" @click="showModal = false" :disabled="submitLoading">
              Batal
            </button>
            <button class="btn btn-primary rounded-2xl font-bold px-8 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 flex items-center gap-2" @click="submitAlbum" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              {{ isEdit ? "Simpan Perubahan" : "Buat Album" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.customize-easy-table {
  --easy-table-border: 1px solid rgba(156, 163, 175, 0.15);
  --easy-table-row-border: 1px solid rgba(156, 163, 175, 0.1);

  --easy-table-header-font-size: 11px;
  --easy-table-header-height: 48px;
  --easy-table-header-font-color: rgba(156, 163, 175, 0.9);
  --easy-table-header-background-color: transparent;

  --easy-table-body-row-height: 64px;
  --easy-table-body-row-font-size: 13px;
  --easy-table-body-row-background-color: transparent;
  --easy-table-body-row-hover-background-color: rgba(156, 163, 175, 0.05);

  --easy-table-footer-background-color: transparent;
  --easy-table-footer-font-color: rgba(156, 163, 175, 0.8);
  --easy-table-footer-font-size: 12px;
  --easy-table-footer-padding: 12px 16px;
  --easy-table-footer-height: 52px;
}
</style>


