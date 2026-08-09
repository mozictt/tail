<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { AlbumService, type Album } from "@/services/album.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { Pencil, Trash2, Image as ImageIcon, FolderOpen, Calendar, ArrowRight } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useSlugRoute } from "@/composables/useSlugRoute";



const { showToast } = useToast();
const albumService = AlbumService();
const router = useRouter();
const { slugPath } = useSlugRoute();

const isEdit = ref(false);
const selectedId = ref<string | null>(null);

/* =========================
   STATE
========================= */
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
   FETCH DATA
========================= */
const fetchAlbums = async () => {
  loading.value = true;
  try {
    const data = await albumService.getAlbums();
    items.value = data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    totalItems.value = data.length;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil data album", "error");
  } finally {
    loading.value = false;
  }
};

const filteredItems = computed(() => {
  if (!search.value) return items.value;
  const s = search.value.toLowerCase();
  return items.value.filter(
    (a) =>
      a.name.toLowerCase().includes(s) ||
      (a.description && a.description.toLowerCase().includes(s))
  );
});

const doSearch = () => {
  // handled by computed
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
</script>

<template>
  <div class="space-y-6">
    <HeaderSearch 
      title="Manajemen Album" 
      subtitle="Kelola dan organisasikan galeri Anda ke dalam album" 
      :total="filteredItems.length" 
      v-model:search="search"
      @search="doSearch" 
      @add="openCreateModal" 
    />

    <div class="bg-base-100/50 rounded-3xl min-h-[500px]">
      
      <!-- SKELETON LOADER -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="h-56 bg-base-200 rounded-3xl animate-pulse"></div>
      </div>

      <!-- EMPTY STATE -->
      <div v-else-if="filteredItems.length === 0" class="py-24 text-center bg-base-100 rounded-3xl border border-base-content/5 shadow-sm">
        <div class="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
          <FolderOpen class="w-12 h-12" />
        </div>
        <h3 class="font-bold text-base-content text-xl mb-2">Belum Ada Album</h3>
        <p class="text-base-content/60 text-sm max-w-md mx-auto mb-6">Kelompokkan foto dan video Anda dengan membuat album baru. Sangat mudah dan praktis!</p>
        <button class="btn btn-primary rounded-xl px-8 shadow-lg shadow-primary/25" @click="openCreateModal">
          Buat Album Pertama
        </button>
      </div>

      <!-- ALBUM GRID -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        <div 
          v-for="item in filteredItems" 
          :key="item.id"
          class="group relative bg-base-100 rounded-3xl border border-base-content/5 p-5 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1.5 flex flex-col h-[240px] overflow-hidden"
        >
           <!-- Decorative Background Blur -->
           <div class="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>

           <!-- Actions Top Right -->
           <div class="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
              <button class="w-9 h-9 rounded-full bg-white/80 backdrop-blur border border-base-content/10 shadow-sm text-base-content/70 hover:bg-info hover:text-white hover:border-transparent flex items-center justify-center transition-colors" @click.stop="editAlbum(item)" title="Edit">
                 <Pencil class="w-4 h-4" />
              </button>
              <button class="w-9 h-9 rounded-full bg-white/80 backdrop-blur border border-base-content/10 shadow-sm text-base-content/70 hover:bg-error hover:text-white hover:border-transparent flex items-center justify-center transition-colors" @click.stop="deleteAlbum(item.id!)" title="Hapus">
                 <Trash2 class="w-4 h-4" />
              </button>
           </div>

           <!-- Icon -->
           <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner">
              <FolderOpen class="w-7 h-7" />
           </div>

           <!-- Info -->
           <div class="flex-1 z-10">
              <h3 class="font-bold text-base-content text-[17px] mb-1.5 truncate group-hover:text-primary transition-colors" :title="item.name">{{ item.name }}</h3>
              
              <div class="flex items-center gap-1.5 text-xs text-base-content/50 font-medium mb-3">
                 <Calendar class="w-3.5 h-3.5" />
                 <span>{{ item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' }}</span>
              </div>
              
              <p class="text-sm text-base-content/60 line-clamp-2 leading-relaxed" :title="item.description">{{ item.description || 'Tidak ada deskripsi.' }}</p>
           </div>

           <!-- Footer Button -->
           <button class="mt-4 w-full py-3 rounded-xl bg-base-200/50 hover:bg-primary hover:text-white text-base-content/80 font-bold text-sm transition-all duration-300 flex items-center justify-between px-5 group/btn z-10" @click="viewGallery(item.id!)">
              <span>Buka Galeri</span>
              <ArrowRight class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>

    <!-- MODAL -->
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
