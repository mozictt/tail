<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { GalleryService, type Gallery } from "@/services/gallery.service";
import { AlbumService, type Album } from "@/services/album.service";
import HeaderSearch from "@/components/header-master.vue";
import Select2 from "@/components/ui/Select2.vue";
import SecureMedia from "@/components/SecureMedia.vue";
import Swal from "sweetalert2";
import { Trash2, UploadCloud, Film, Image as ImageIcon, ArrowLeft, FolderOpen, LayoutGrid, Download, Eye, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useSlugRoute } from "@/composables/useSlugRoute";



const route = useRoute();
const router = useRouter();
const albumIdParam = route.query.albumId as string | undefined;

const { showToast } = useToast();
const galleryService = GalleryService();
const albumService = AlbumService();
const { slugPath } = useSlugRoute();

/* =========================
   STATE
========================= */
const allGalleries = ref<Gallery[]>([]);
const albumList = ref<Album[]>([]);
const loading = ref(false);
const search = ref("");
const selectedAlbumId = ref<string | undefined>(albumIdParam);

/* =========================
   COMPUTED VIEWS
========================= */
const items = computed(() => {
  let filtered = allGalleries.value;
  
  if (selectedAlbumId.value) {
    const isUncategorized = selectedAlbumId.value === 'uncategorized';
    filtered = filtered.filter(g => isUncategorized ? !g.albumId : g.albumId === selectedAlbumId.value);
  }
  
  if (search.value && selectedAlbumId.value) {
    // Search media by name if inside album
    const s = search.value.toLowerCase();
    filtered = filtered.filter(g => g.originalName.toLowerCase().includes(s));
  }
  
  return filtered;
});

const totalItems = computed(() => selectedAlbumId.value ? items.value.length : albumCards.value.length);

const albumCards = computed(() => {
  const cards: any[] = [];
  const galleriesByAlbum = new Map<string, Gallery[]>();
  
  allGalleries.value.forEach(g => {
    const key = g.albumId || 'uncategorized';
    if (!galleriesByAlbum.has(key)) galleriesByAlbum.set(key, []);
    galleriesByAlbum.get(key)!.push(g);
  });

  // Album aseli
  albumList.value.forEach(album => {
    if (search.value && !selectedAlbumId.value && !album.name.toLowerCase().includes(search.value.toLowerCase())) {
      return;
    }
    cards.push({
      id: album.id,
      name: album.name,
      description: album.description || 'Tidak ada deskripsi',
      media: galleriesByAlbum.get(album.id!) || [],
      count: (galleriesByAlbum.get(album.id!) || []).length
    });
  });

  // Uncategorized Album
  if (galleriesByAlbum.has('uncategorized')) {
    const uncategorizedMedia = galleriesByAlbum.get('uncategorized')!;
    const name = 'Tanpa Album (Uncategorized)';
    if (!search.value || selectedAlbumId.value || name.toLowerCase().includes(search.value.toLowerCase())) {
      cards.push({
        id: 'uncategorized',
        name: name,
        description: 'Media yang diunggah tanpa memilih album tertentu.',
        media: uncategorizedMedia,
        count: uncategorizedMedia.length,
        isUncategorized: true
      });
    }
  }

  return cards;
});

/* =========================
   MODAL & UPLOAD FORM
========================= */
const showUploadModal = ref(false);
const uploadLoading = ref(false);
const selectedFiles = ref<File[]>([]);
const uploadAlbumId = ref<string | undefined>(albumIdParam);

/* =========================
   LIGHTBOX & DOWNLOAD
========================= */
const viewMediaItem = ref<Gallery | null>(null);
const downloadLoadingId = ref<string | null>(null);

const currentIndex = computed(() => {
  if (!viewMediaItem.value) return -1;
  return items.value.findIndex(item => item.id === viewMediaItem.value?.id);
});

const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < items.value.length - 1);
const hasPrev = computed(() => currentIndex.value > 0);

const nextMedia = () => {
  if (hasNext.value) {
    viewMediaItem.value = items.value[currentIndex.value + 1];
  }
};

const prevMedia = () => {
  if (hasPrev.value) {
    viewMediaItem.value = items.value[currentIndex.value - 1];
  }
};

/* Keyboard Navigation */
const handleKeyDown = (e: KeyboardEvent) => {
  if (!viewMediaItem.value) return;
  if (e.key === "Escape") {
    viewMediaItem.value = null;
    return;
  }
  // Jika media yang aktif adalah video, serahkan kontrol panah kiri/kanan ke video player
  if (viewMediaItem.value.type === 'video') return;

  if (e.key === "ArrowRight") {
    nextMedia();
  } else if (e.key === "ArrowLeft") {
    prevMedia();
  }
};

/* Touch Swipe Navigation for Mobile */
let touchStartX = 0;
let touchEndX = 0;

const handleTouchStart = (e: TouchEvent) => {
  touchStartX = e.changedTouches[0].screenX;
};

const handleTouchEnd = (e: TouchEvent) => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchEndX - touchStartX;
  const minSwipeDistance = 40;
  if (diff < -minSwipeDistance) {
    nextMedia();
  } else if (diff > minSwipeDistance) {
    prevMedia();
  }
};

watch(viewMediaItem, (newItem) => {
  if (newItem) {
    window.addEventListener("keydown", handleKeyDown);
  } else {
    window.removeEventListener("keydown", handleKeyDown);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

const handleDownload = async (item: Gallery) => {
  downloadLoadingId.value = item.id!;
  try {
    await galleryService.downloadMedia(item.fileName, item.originalName);
    showToast("File berhasil diunduh", "success");
  } catch (err) {
    showToast("Gagal mengunduh file", "error");
  } finally {
    downloadLoadingId.value = null;
  }
};

/* =========================
   METHODS
========================= */
const fetchAlbums = async () => {
  try {
    albumList.value = await albumService.getAlbums();
  } catch (err) {
    console.error("Gagal mengambil album", err);
  }
};

const fetchGalleries = async () => {
  loading.value = true;
  try {
    const data = await galleryService.getGalleries();
    data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    allGalleries.value = data;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil data galeri", "error");
  } finally {
    loading.value = false;
  }
};

const selectAlbum = (id?: string) => {
  selectedAlbumId.value = id;
  const query = id ? { albumId: id } : {};
  router.replace({ query });
  search.value = ""; // clear search on navigation
};

watch(() => route.query.albumId, (newId) => {
  selectedAlbumId.value = newId as string | undefined;
});

const doSearch = () => {
  // Handled by computed
};

/* =========================
   UPLOAD MEDIA
========================= */
const openUploadModal = () => {
  selectedFiles.value = [];
  uploadAlbumId.value = selectedAlbumId.value === 'uncategorized' ? undefined : selectedAlbumId.value;
  showUploadModal.value = true;
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    selectedFiles.value = Array.from(target.files);
  }
};

const removeSelectedFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const submitUpload = async () => {
  if (selectedFiles.value.length === 0) {
    showToast("Pilih minimal satu file", "error");
    return;
  }
  uploadLoading.value = true;
  try {
    await galleryService.uploadBulk(selectedFiles.value, uploadAlbumId.value);
    showToast(`Berhasil mengunggah ${selectedFiles.value.length} file`, "success");
    showUploadModal.value = false;
    selectedFiles.value = [];
    fetchGalleries(); // Refresh all media
  } catch (err) {
    console.error(err);
    showToast("Gagal mengunggah file. Pastikan ukuran file sesuai dan tipe file valid.", "error");
  } finally {
    uploadLoading.value = false;
  }
};

/* =========================
   DELETE MEDIA
========================= */
const deleteMedia = async (id: string) => {
  const result = await Swal.fire({
    title: "Hapus Media?",
    text: "Media yang dihapus tidak dapat dikembalikan.",
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

  try {
    await galleryService.deleteGallery(id);
    showToast("Media berhasil dihapus", "success");
    fetchGalleries();
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus media", "error");
  }
};

const deleteMediaFromLightbox = async (id: string) => {
  viewMediaItem.value = null;
  setTimeout(() => {
    deleteMedia(id);
  }, 300); // wait for lightbox transition
};

const currentAlbumTitle = computed(() => {
  if (selectedAlbumId.value === 'uncategorized') return 'Tanpa Album (Uncategorized)';
  const found = albumList.value.find(a => a.id === selectedAlbumId.value);
  return found ? found.name : 'Galeri Media';
});

const getStackStyle = (index: number) => {
  const styles = [
    { zIndex: 30, transform: 'scale(1) rotate(0deg) translateY(0px) translateX(0px)', opacity: 1 },
    { zIndex: 20, transform: 'scale(0.95) rotate(10deg) translateY(4px) translateX(12px)', opacity: 0.85 },
    { zIndex: 10, transform: 'scale(0.9) rotate(-10deg) translateY(8px) translateX(-12px)', opacity: 0.7 },
  ];
  return styles[index] || { display: 'none' };
};

onMounted(() => {
  fetchAlbums();
  fetchGalleries();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <div v-if="selectedAlbumId" class="mb-4">
        <button @click="selectAlbum(undefined)" class="btn btn-sm btn-ghost hover:bg-base-200 text-base-content/70 flex w-fit items-center gap-2 rounded-lg transition">
          <ArrowLeft class="w-4 h-4" />
          <span>Kembali ke Kumpulan Album</span>
        </button>
      </div>

      <HeaderSearch 
        :title="selectedAlbumId ? currentAlbumTitle : 'Kumpulan Album Galeri'" 
        :subtitle="selectedAlbumId ? 'Kelola media foto dan video di dalam album ini' : 'Pilih album untuk melihat atau mengelola isinya'" 
        :total="totalItems" 
        v-model:search="search"
        @search="doSearch" 
        @add="openUploadModal" 
      />
    </div>

    <!-- MAIN GRID CONTAINER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-premium p-6 min-h-[500px]">
      
      <!-- SKELETON LOADER -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="h-64 bg-base-200 rounded-2xl animate-pulse"></div>
      </div>

      <!-- VIEW: ALBUMS LIST -->
      <template v-else-if="!selectedAlbumId">
        <div v-if="albumCards.length === 0" class="py-16 text-center">
          <div class="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4 text-base-content/30">
            <FolderOpen class="w-10 h-10" />
          </div>
          <h3 class="font-bold text-base-content mb-1">Belum Ada Album</h3>
          <p class="text-base-content/60 text-sm">Buat album baru terlebih dahulu atau unggah media tanpa album.</p>
          <div class="flex items-center justify-center gap-3 mt-4">
             <NuxtLink :to="slugPath('/album')" class="btn btn-outline btn-primary btn-sm rounded-lg px-6">Kelola Album</NuxtLink>
             <button class="btn btn-primary btn-sm rounded-lg px-6" @click="openUploadModal">Unggah Media</button>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <div 
            v-for="album in albumCards" 
            :key="album.id" 
            @click="selectAlbum(album.id)"
            class="cursor-pointer group relative bg-base-200/50 rounded-2xl border border-base-content/5 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 flex flex-col h-[280px]"
          >
            <!-- Polaroid Stack 3 Latest -->
            <div class="h-48 w-full bg-base-200/40 relative flex items-center justify-center overflow-hidden">
                <template v-if="album.media.length > 0">
                  <div 
                    v-for="(media, idx) in album.media.slice(0, 3)" 
                    :key="media.id" 
                    class="absolute w-32 h-32 bg-white rounded-2xl shadow-lg border border-slate-200/60 p-1.5 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:shadow-xl" 
                    :style="getStackStyle(idx)"
                  >
                    <!-- Inner Image Container -->
                    <div class="relative w-full h-full rounded-xl overflow-hidden bg-slate-100">
                      <SecureMedia :filename="media.fileName" :type="media.type" class="pointer-events-none opacity-100 transition duration-500 w-full h-full object-cover" />
                      <!-- Icon Overlay if it's a video -->
                      <div v-if="media.type === 'video'" class="absolute inset-0 flex items-center justify-center bg-black/20">
                         <Film class="w-6 h-6 text-white/80 drop-shadow-md" />
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="flex items-center justify-center text-base-content/20 bg-base-200 w-32 h-32 rounded-2xl border-2 border-base-content/10 border-dashed">
                  <ImageIcon class="w-10 h-10" />
                </div>

                <!-- Overlay Count if > 5 -->
                <div v-if="album.count > 5" class="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg z-50">
                   +{{ album.count - 5 }}
                </div>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-between bg-base-100 group-hover:bg-primary/[0.02] transition-colors">
              <div>
                <h3 class="font-bold text-base-content text-[15px] mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
                  <FolderOpen v-if="album.isUncategorized" class="w-4 h-4 text-warning" />
                  <LayoutGrid v-else class="w-4 h-4 text-primary" />
                  <span class="truncate">{{ album.name }}</span>
                </h3>
                <p class="text-xs text-base-content/60 line-clamp-2 leading-relaxed">{{ album.description }}</p>
              </div>
              <div class="flex items-center justify-between mt-3">
                <div class="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                   <ImageIcon class="w-3.5 h-3.5" />
                   {{ album.count }} Foto/Video
                </div>
                <div class="text-[10px] font-medium text-base-content/40 group-hover:text-primary/60 transition-colors">
                  Lihat Album &rarr;
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- VIEW: MEDIA GRID -->
      <template v-else>
        <div v-if="items.length === 0" class="py-16 text-center">
          <div class="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4 text-base-content/30">
            <ImageIcon class="w-10 h-10" />
          </div>
          <h3 class="font-bold text-base-content mb-1">Album Kosong</h3>
          <p class="text-base-content/60 text-sm">Belum ada media di dalam album ini.</p>
          <button class="btn btn-primary btn-sm mt-4 rounded-lg px-6" @click="openUploadModal">
            Unggah Media ke Album Ini
          </button>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          <div 
            v-for="item in items" 
            :key="item.id" 
            class="group relative aspect-square rounded-xl overflow-hidden bg-base-200 border border-base-content/5 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <!-- Media Preview (Secure Fetch) -->
            <SecureMedia :filename="item.fileName" :type="item.type" />
            
            <!-- Gradient Overlay (Always visible on mobile, hover on desktop) -->
            <div 
              class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 md:p-3 z-10 cursor-pointer"
              @click="viewMediaItem = item"
            >
              
              <div class="flex justify-between items-end">
                <div class="overflow-hidden">
                  <p class="text-white text-xs font-medium truncate" :title="item.originalName">{{ item.originalName }}</p>
                  <div class="flex items-center gap-1.5 mt-1 text-white/70 text-[10px]">
                    <Film v-if="item.type === 'video'" class="w-3 h-3" />
                    <ImageIcon v-else class="w-3 h-3" />
                    <span>{{ formatSize(item.size) }}</span>
                  </div>
                </div>
                
                <div class="flex items-center gap-1.5 md:gap-2">
                  <button 
                    class="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-base-100/20 hover:bg-base-100 text-white hover:text-base-content flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
                    @click.stop="handleDownload(item)"
                    title="Unduh Asli"
                  >
                    <Download v-if="downloadLoadingId !== item.id" class="w-4 h-4 md:w-4 md:h-4" />
                    <span v-else class="loading loading-spinner loading-xs text-white"></span>
                  </button>
                  <button 
                    class="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-error/90 hover:bg-error text-white flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
                    @click.stop="deleteMedia(item.id!)"
                    title="Hapus"
                  >
                    <Trash2 class="w-4 h-4 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Badge Video -->
            <div v-if="item.type === 'video'" class="absolute top-2 left-2 bg-slate-900/70 backdrop-blur text-white p-1.5 rounded-lg z-10">
              <Film class="w-4 h-4" />
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- UPLOAD MODAL -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showUploadModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!uploadLoading && (showUploadModal = false)">
        <div class="modal-box max-w-2xl bg-base-100 rounded-2xl border border-base-content/10 p-6 shadow-premium relative text-base-content">
          <button class="absolute top-4 right-4 text-base-content/40 hover:text-base-content/70 transition" @click="showUploadModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 class="font-bold text-base-content text-lg tracking-tight mb-6 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UploadCloud class="w-4 h-4" />
            </div>
            Unggah Media
          </h3>

          <div class="space-y-4">
            <!-- Pilih Album Dropdown (Select2 Modern) -->
            <div class="z-50 relative">
              <label class="block text-base-content/80 text-xs font-semibold uppercase tracking-wider mb-1.5">Pilih Album <span class="text-base-content/40 font-normal text-[10px] lowercase">(opsional)</span></label>
              <Select2 
                v-model="uploadAlbumId" 
                :options="albumList" 
                label-key="name" 
                value-key="id" 
                placeholder="Cari dan pilih album..."
                :show-default-option="true"
                default-option-text="-- Tanpa Album (Uncategorized) --"
              />
            </div>

            <!-- Dropzone / Input File -->
            <label class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-base-content/20 rounded-2xl cursor-pointer bg-base-200/50 hover:bg-base-200 transition">
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud class="w-10 h-10 text-base-content/40 mb-3" />
                <p class="mb-2 text-sm text-base-content/70"><span class="font-semibold text-primary">Klik untuk memilih</span> atau seret file ke sini</p>
                <p class="text-xs text-base-content/50">Mendukung Foto (JPG, PNG, WEBP) & Video (MP4, WEBM) maks 500MB</p>
              </div>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" class="hidden" @change="handleFileSelect" />
            </label>

            <!-- Preview Selected Files -->
            <div v-if="selectedFiles.length > 0" class="mt-4">
              <h4 class="text-xs font-semibold text-base-content/70 uppercase tracking-wider mb-2">File Terpilih ({{ selectedFiles.length }})</h4>
              <div class="max-h-48 overflow-y-auto pr-2 space-y-2">
                <div v-for="(file, index) in selectedFiles" :key="index" class="flex items-center justify-between p-3 bg-base-200 rounded-xl border border-base-content/5">
                  <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-10 h-10 rounded-lg bg-base-100 flex items-center justify-center flex-shrink-0">
                      <Film v-if="file.type.startsWith('video/')" class="w-5 h-5 text-primary" />
                      <ImageIcon v-else class="w-5 h-5 text-primary" />
                    </div>
                    <div class="overflow-hidden">
                      <p class="text-sm font-medium text-base-content truncate" :title="file.name">{{ file.name }}</p>
                      <p class="text-xs text-base-content/50">{{ formatSize(file.size) }}</p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle text-error hover:bg-error/10 flex-shrink-0" @click="removeSelectedFile(index)">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-action gap-2 mt-6">
            <button class="btn btn-ghost hover:bg-base-200 rounded-xl font-bold" @click="showUploadModal = false" :disabled="uploadLoading">
              Batal
            </button>
            <button class="btn btn-primary rounded-xl font-bold px-6 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 flex items-center gap-2" @click="submitUpload" :disabled="uploadLoading || selectedFiles.length === 0">
              <span v-if="uploadLoading" class="loading loading-spinner loading-xs"></span>
              {{ uploadLoading ? 'Mengunggah...' : 'Unggah Sekarang' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- LIGHTBOX MODAL -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div 
          v-if="viewMediaItem" 
          class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4 md:p-8" 
          @click.self="viewMediaItem = null"
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
        >
          
          <!-- Top Bar -->
          <div class="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between px-4 md:px-6 pointer-events-none z-50">
             <div class="text-white pointer-events-auto max-w-[50%] md:max-w-[60%]">
                <div class="flex items-center gap-2">
                  <p class="font-medium truncate text-sm md:text-base">{{ viewMediaItem.originalName }}</p>
                  <span v-if="currentIndex >= 0" class="text-xs bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-mono flex-shrink-0">
                    {{ currentIndex + 1 }} / {{ items.length }}
                  </span>
                </div>
                <p class="text-xs text-white/60 hidden sm:block">{{ formatSize(viewMediaItem.size) }}</p>
             </div>
             
             <div class="flex items-center gap-1.5 md:gap-3 pointer-events-auto">
               <button 
                  class="btn btn-sm md:btn-md btn-circle btn-ghost text-white hover:bg-error hover:text-white"
                  @click="deleteMediaFromLightbox(viewMediaItem.id!)"
                  title="Hapus"
                >
                  <Trash2 class="w-5 h-5" />
               </button>
               <button 
                  class="btn btn-sm md:btn-md btn-circle btn-ghost text-white hover:bg-white/20"
                  @click="handleDownload(viewMediaItem)"
                  title="Unduh Asli"
                >
                  <Download v-if="downloadLoadingId !== viewMediaItem.id" class="w-5 h-5" />
                  <span v-else class="loading loading-spinner loading-xs"></span>
               </button>
               <button class="btn btn-sm md:btn-md btn-circle btn-ghost text-white hover:bg-white/20 hover:text-error" @click="viewMediaItem = null" title="Tutup (Esc)">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
               </button>
             </div>
          </div>

          <!-- Navigation Buttons: Previous & Next -->
          <button 
            v-if="hasPrev"
            @click="prevMedia"
            class="fixed left-2 md:left-6 top-1/2 -translate-y-1/2 z-[60] p-2.5 md:p-3.5 rounded-full bg-slate-900/70 hover:bg-slate-800 backdrop-blur-md border border-white/10 text-white shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 group focus:outline-none"
            title="Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft class="w-6 h-6 md:w-8 md:h-8 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <button 
            v-if="hasNext"
            @click="nextMedia"
            class="fixed right-2 md:right-6 top-1/2 -translate-y-1/2 z-[60] p-2.5 md:p-3.5 rounded-full bg-slate-900/70 hover:bg-slate-800 backdrop-blur-md border border-white/10 text-white shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 group focus:outline-none"
            title="Berikutnya (Panah Kanan)"
          >
            <ChevronRight class="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <!-- Media Container -->
          <div class="relative w-full h-full max-w-5xl max-h-full flex items-center justify-center bg-transparent px-8 md:px-16 z-20">
             <div class="w-full h-full flex items-center justify-center drop-shadow-2xl">
               <SecureMedia :filename="viewMediaItem.fileName" :type="viewMediaItem.type" fit="contain" class="w-full h-full max-h-[85vh] rounded-lg overflow-hidden bg-transparent" />
             </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
