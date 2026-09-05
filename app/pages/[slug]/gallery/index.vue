<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { GalleryService, type Gallery } from "@/services/gallery.service";
import { AlbumService, type Album } from "@/services/album.service";
import HeaderSearch from "@/components/header-master.vue";
import Select2 from "@/components/ui/Select2.vue";
import SecureMedia from "@/components/SecureMedia.vue";
import Swal from "sweetalert2";
import { Trash2, UploadCloud, Film, Image as ImageIcon, ArrowLeft, FolderOpen, LayoutGrid, Download, Eye, ChevronLeft, ChevronRight, Share2, RotateCcw, CheckCircle2, AlertCircle, Clock, X, RefreshCw } from "lucide-vue-next";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useWhatsappShare } from "@/composables/useWhatsappShare";
import { useAuthStore } from "@/stores/auth";

definePageMeta({
  layout: "admin",
});

const route = useRoute();
const router = useRouter();
const { shareFile } = useWhatsappShare();
const albumIdParam = route.query.albumId as string | undefined;

const { showToast } = useToast();
const pinoLogger = useLogger();
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

// State Paginasi Server-side & Infinite Scroll
const galleriesBatch = ref<Gallery[]>([]);
const currentPage = ref(1);
const limit = ref(24);
const totalServerItems = ref(0);
const totalPages = ref(1);
const loadingMore = ref(false);
const hasMore = ref(true);
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// State Pilihan Massal (Bulk Actions)
const isSelectionMode = ref(false);
const selectedItems = ref<string[]>([]);
const bulkActionLoading = ref(false);

/* =========================
   COMPUTED VIEWS
========================= */
const items = computed(() => {
  if (selectedAlbumId.value) {
    return galleriesBatch.value;
  }
  return allGalleries.value;
});

const totalItems = computed(() => selectedAlbumId.value ? totalServerItems.value : albumCards.value.length);

const albumCards = computed(() => {
  const cards: any[] = [];
  const galleriesByAlbum = new Map<string, Gallery[]>();
  
  const galleriesList = Array.isArray(allGalleries.value) ? allGalleries.value : [];
  galleriesList.forEach(g => {
    const key = g.albumId || 'uncategorized';
    if (!galleriesByAlbum.has(key)) galleriesByAlbum.set(key, []);
    galleriesByAlbum.get(key)!.push(g);
  });

  // Album aseli
  const list = Array.isArray(albumList.value) ? albumList.value : [];
  list.forEach(album => {
    if (search.value && !selectedAlbumId.value && !album.name.toLowerCase().includes(search.value.toLowerCase())) {
      return;
    }
    cards.push({
      id: album.id,
      name: album.name,
      description: album.description || 'Tidak ada deskripsi',
      media: galleriesByAlbum.get(album.id!) || [],
      count: (album as any).mediaCount ?? (galleriesByAlbum.get(album.id!) || []).length
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
export interface UploadFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  progress: number;
  errorMsg?: string;
}

const auth = useAuthStore();
const config = useRuntimeConfig();

const showUploadModal = ref(false);
const uploadLoading = ref(false);
const uploadItems = ref<UploadFileItem[]>([]);
const uploadAlbumId = ref<string | undefined>(albumIdParam);
const isDragging = ref(false);

const MAX_UPLOAD_BATCH_LIMIT = 100; // Limit per upload batch (maksimal 100 file)
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif", "image/heic", "image/heif", "image/avif", "image/pjpeg", "image/x-png",
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/avi", "application/octet-stream"
];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "jfif", "heic", "heif", "avif", "mp4", "webm", "mov", "mkv", "avi"];

const pendingOrFailedUploadsCount = computed(() => {
  return uploadItems.value.filter(item => item.status === 'pending' || item.status === 'failed').length;
});

const failedUploadsCount = computed(() => {
  return uploadItems.value.filter(item => item.status === 'failed').length;
});

const successUploadsCount = computed(() => {
  return uploadItems.value.filter(item => item.status === 'success').length;
});

const totalUploadsCount = computed(() => uploadItems.value.length);

const isAllUploadsSuccess = computed(() => {
  return uploadItems.value.length > 0 && uploadItems.value.every(item => item.status === 'success');
});

const overallUploadProgress = computed(() => {
  if (uploadItems.value.length === 0) return 0;
  const sumProgress = uploadItems.value.reduce((acc, item) => acc + item.progress, 0);
  return Math.round(sumProgress / uploadItems.value.length);
});

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
    if (selectedAlbumId.value && hasMore.value && currentIndex.value >= items.value.length - 3 && !loadingMore.value) {
      fetchGalleriesBatch(false);
    }
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
  if (observer) observer.disconnect();
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
   METHODS & FETCHING
========================= */
const fetchAlbums = async () => {
  try {
    const res = await albumService.getAlbums({ page: 1, limit: 100 });
    albumList.value = res.array || [];
  } catch (err) {
    console.error("Gagal mengambil album", err);
    albumList.value = [];
  }
};

const fetchGalleriesBatch = async (isReset = false) => {
  if (loadingMore.value) return;

  if (isReset) {
    currentPage.value = 1;
    galleriesBatch.value = [];
    hasMore.value = true;
  }

  if (!hasMore.value && !isReset) return;

  if (isReset) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const res = await galleryService.getGalleries({
      page: currentPage.value,
      limit: limit.value,
      albumId: selectedAlbumId.value,
      search: search.value.trim(),
      sortBy: "createdAt",
      sortType: "DESC",
    });

    const newItems = res.array || [];
    totalServerItems.value = res.totalItems || 0;
    totalPages.value = res.totalPages || 1;

    if (isReset) {
      galleriesBatch.value = newItems;
    } else {
      galleriesBatch.value = [...galleriesBatch.value, ...newItems];
    }

    if (currentPage.value >= totalPages.value || newItems.length === 0) {
      hasMore.value = false;
    } else {
      currentPage.value++;
    }
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil data galeri", "error");
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const fetchGalleriesOverview = async () => {
  loading.value = true;
  try {
    const res = await galleryService.getGalleries({ page: 1, limit: 100 });
    const arr = Array.isArray(res?.array) ? res.array : (Array.isArray(res) ? res : []);
    allGalleries.value = arr;
  } catch (err) {
    console.error(err);
    allGalleries.value = [];
    showToast("Gagal mengambil data ringkasan galeri", "error");
  } finally {
    loading.value = false;
  }
};

const selectAlbum = (id?: string) => {
  selectedAlbumId.value = id;
  const query = id ? { albumId: id } : {};
  router.replace({ query });
  search.value = "";
  if (id) {
    fetchGalleriesBatch(true);
  } else {
    fetchGalleriesOverview();
  }
};

watch(() => route.query.albumId, (newId) => {
  const id = newId as string | undefined;
  if (id !== selectedAlbumId.value) {
    selectedAlbumId.value = id;
    if (id) {
      fetchGalleriesBatch(true);
    } else {
      fetchGalleriesOverview();
    }
  }
});

let searchTimeout: any = null;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (selectedAlbumId.value) {
      fetchGalleriesBatch(true);
    }
  }, 400);
});

const doSearch = () => {
  if (selectedAlbumId.value) {
    fetchGalleriesBatch(true);
  }
};

/* =========================
   UPLOAD MEDIA
========================= */
const openUploadModal = () => {
  uploadItems.value = [];
  isDragging.value = false;
  uploadAlbumId.value = selectedAlbumId.value === 'uncategorized' ? undefined : selectedAlbumId.value;
  showUploadModal.value = true;
};

const processIncomingFiles = (incoming: File[]) => {
  const currentCount = uploadItems.value.length;
  let oversizedCount = 0;
  let invalidTypeCount = 0;
  let duplicateCount = 0;
  let limitExceededCount = 0;

  const newItems: UploadFileItem[] = [];

  for (const file of incoming) {
    if (currentCount + newItems.length >= MAX_UPLOAD_BATCH_LIMIT) {
      limitExceededCount++;
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      oversizedCount++;
      continue;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext || '');
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);

    if (!isValidExt && !isValidMime) {
      invalidTypeCount++;
      continue;
    }

    const isDuplicate = uploadItems.value.some(
      (existing) => existing.name === file.name && existing.size === file.size
    );
    if (isDuplicate) {
      duplicateCount++;
      continue;
    }

    newItems.push({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
    });
  }

  if (limitExceededCount > 0) {
    showToast(`Maksimal ${MAX_UPLOAD_BATCH_LIMIT} file per unggahan. ${limitExceededCount} file dilewati.`, "warning");
  }
  if (oversizedCount > 0) {
    showToast(`${oversizedCount} file melebihi batas maksimal 500MB`, "error");
  }
  if (invalidTypeCount > 0) {
    showToast(`${invalidTypeCount} file diabaikan karena format tidak didukung`, "warning");
  }
  if (duplicateCount > 0) {
    showToast(`${duplicateCount} file duplikat dilewati`, "info");
  }

  if (newItems.length > 0) {
    uploadItems.value = [...uploadItems.value, ...newItems];
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    processIncomingFiles(Array.from(target.files));
    target.value = "";
  }
};

const handleFileDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files) {
    processIncomingFiles(Array.from(event.dataTransfer.files));
  }
};

const removeUploadItem = (id: string) => {
  const idx = uploadItems.value.findIndex(item => item.id === id);
  if (idx >= 0) {
    uploadItems.value.splice(idx, 1);
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const refreshGalleries = () => {
  if (selectedAlbumId.value) {
    fetchGalleriesBatch(true);
  } else {
    fetchGalleriesOverview();
  }
};

const uploadSingleItem = (item: UploadFileItem): Promise<boolean> => {
  return new Promise((resolve) => {
    item.status = 'uploading';
    item.progress = 0;
    item.errorMsg = undefined;

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("files", item.file);
    if (uploadAlbumId.value) {
      formData.append("albumId", uploadAlbumId.value);
    }

    // Proteksi Timeout Cerdas: HANYA timeout jika TIDAK ADA PROGRES sama sekali selama 60 detik (Stalled Connection)
    // Selama ada progres data berjalan, timer akan terus di-reset sehingga file besar (hingga 500MB) tidak akan terputus.
    const STALL_TIMEOUT_MS = 60000; // 60 detik tanpa adanya pergerakan progres
    let stallTimer: any = null;

    const resetStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        item.status = 'failed';
        item.errorMsg = "Koneksi terhenti (Tidak ada progres unggahan selama 60 detik)";
        pinoLogger.warn(`[Upload Timeout] Berkas "${item.name}" macet / tidak ada progres selama 60 detik.`, { fileName: item.name });
        xhr.abort();
        resolve(false);
      }, STALL_TIMEOUT_MS);
    };

    const clearStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
    };

    // Jalankan timer awal saat transmisi dimulai
    resetStallTimer();
    pinoLogger.info(`[Upload Process] Memulai unggah berkas "${item.name}"`, { fileName: item.name, fileSize: item.size, type: item.type });

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        item.progress = Math.round((e.loaded * 100) / e.total);
      }
      // Setiap kali ada bytes yang terkirim (ada progres) -> RESET TIMER!
      resetStallTimer();
    });

    xhr.addEventListener("load", () => {
      clearStallTimer();
      if (xhr.status >= 200 && xhr.status < 300) {
        item.status = 'success';
        item.progress = 100;
        pinoLogger.info(`[Upload Success] Berkas "${item.name}" berhasil diunggah.`, { fileName: item.name });
        resolve(true);
      } else {
        item.status = 'failed';
        try {
          const resp = JSON.parse(xhr.responseText);
          const message = resp?.message?.message || resp?.message || "Gagal mengunggah file";
          item.errorMsg = Array.isArray(message) ? message.join(", ") : String(message);
        } catch {
          item.errorMsg = `Gagal mengunggah (HTTP ${xhr.status})`;
        }
        pinoLogger.error(`[Upload Error] Berkas "${item.name}" gagal diunggah (HTTP ${xhr.status})`, {
          fileName: item.name,
          fileSize: item.size,
          status: xhr.status,
          responseText: xhr.responseText,
          errorMsg: item.errorMsg
        });
        resolve(false);
      }
    });

    xhr.addEventListener("error", () => {
      clearStallTimer();
      item.status = 'failed';
      item.errorMsg = "Koneksi terputus / kesalahan jaringan";
      pinoLogger.error(`[Upload Network Error] Kesalahan jaringan / koneksi terputus saat mengunggah "${item.name}".`, { fileName: item.name });
      resolve(false);
    });

    xhr.addEventListener("abort", () => {
      clearStallTimer();
      if (!item.errorMsg) {
        item.errorMsg = "Unggahan dibatalkan";
      }
      pinoLogger.warn(`[Upload Abort] Berkas "${item.name}" dibatalkan oleh pengguna/sistem.`, { fileName: item.name });
      resolve(false);
    });

    const apiUrl = `${config.public.apiBase}/gallery/upload-bulk`;
    xhr.open("POST", apiUrl, true);

    if (auth.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${auth.token}`);
    }

    const targetTenantId = useCookie<string | null>("target_tenant_id").value;
    if (targetTenantId && auth.isMasterTenant) {
      xhr.setRequestHeader("X-Target-Tenant-Id", targetTenantId);
    }

    xhr.send(formData);
  });
};

const submitUpload = async () => {
  const itemsToUpload = uploadItems.value.filter(
    (item) => item.status === 'pending' || item.status === 'failed'
  );

  if (itemsToUpload.length === 0) {
    if (isAllUploadsSuccess.value) {
      showUploadModal.value = false;
      refreshGalleries();
    } else {
      showToast("Pilih minimal 1 file untuk diunggah", "error");
    }
    return;
  }

  uploadLoading.value = true;
  console.log(`[Batch Upload Start] Memulai batch upload untuk ${itemsToUpload.length} berkas.`);

  const CONCURRENCY_LIMIT = 2;
  const queue = [...itemsToUpload];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        await uploadSingleItem(item);
      }
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, itemsToUpload.length) }, () => worker());
  await Promise.all(workers);

  uploadLoading.value = false;

  const updatedFailed = uploadItems.value.filter((i) => i.status === 'failed').length;
  const updatedSuccess = uploadItems.value.filter((i) => i.status === 'success').length;

  console.log(`[Batch Upload Finished] Hasil batch: ${updatedSuccess} Berhasil, ${updatedFailed} Gagal.`);

  if (updatedFailed === 0) {
    showToast(`Berhasil mengunggah ${updatedSuccess} file`, "success");
    refreshGalleries();
  } else {
    showToast(`${updatedSuccess} file berhasil, ${updatedFailed} file gagal diunggah. Silakan klik 'Coba Lagi'`, "warning");
    refreshGalleries();
  }
};

const retrySingleItem = async (item: UploadFileItem) => {
  item.status = 'pending';
  item.progress = 0;
  item.errorMsg = undefined;
  uploadLoading.value = true;
  await uploadSingleItem(item);
  uploadLoading.value = false;

  if (item.status === 'success') {
    showToast(`Berhasil mengunggah ${item.name}`, "success");
    refreshGalleries();
  } else {
    showToast(`Gagal mengunggah ${item.name}: ${item.errorMsg}`, "error");
  }
};

const retryAllFailed = () => {
  uploadItems.value.forEach((item) => {
    if (item.status === 'failed') {
      item.status = 'pending';
      item.progress = 0;
      item.errorMsg = undefined;
    }
  });
  submitUpload();
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
    refreshGalleries();
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

const handleShareMedia = (item: Gallery) => {
  const fileUrl = item.path || item.fileName;
  if (fileUrl && item.originalName) {
    shareFile(fileUrl, item.originalName, 'gallery');
  } else {
    showToast("File tidak valid untuk dibagikan", "error");
  }
};

/* =========================
   BULK ACTIONS (Pilihan Massal)
========================= */
const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value;
  selectedItems.value = [];
};

const toggleSelectItem = (id: string) => {
  const index = selectedItems.value.indexOf(id);
  if (index >= 0) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(id);
  }
};

const isAllSelected = computed(() => {
  const itemIds = items.value.map(item => item.id).filter((id): id is string => !!id);
  if (itemIds.length === 0) return false;
  return itemIds.every(id => selectedItems.value.includes(id));
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = [];
  } else {
    selectedItems.value = items.value.map(item => item.id).filter((id): id is string => !!id);
  }
};

const handleShareBulk = () => {
  if (selectedItems.value.length === 0) return;
  const itemsToShare = items.value.filter(i => i.id && selectedItems.value.includes(i.id));
  const urls = itemsToShare.map(i => i.path || i.fileName).filter(Boolean) as string[];
  const names = itemsToShare.map(i => i.originalName || i.fileName || 'media');
  
  if (urls.length > 0) {
    shareFile(urls, names, 'gallery');
  } else {
    showToast("File tidak valid untuk dibagikan", "error");
  }
};

const handleDeleteBulk = async () => {
  if (selectedItems.value.length === 0) return;
  
  const count = selectedItems.value.length;
  const result = await Swal.fire({
    title: `Hapus ${count} Media Terpilih?`,
    text: `Sebanyak ${count} media terpilih beserta berkas fisiknya akan dihapus permanen.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus Semua",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
    customClass: {
      popup: "rounded-2xl border border-slate-100",
    },
  });

  if (!result.isConfirmed) return;

  bulkActionLoading.value = true;
  try {
    await galleryService.deleteBulk(selectedItems.value);
    showToast(`Berhasil menghapus ${count} media`, "success");
    selectedItems.value = [];
    isSelectionMode.value = false;
    refreshGalleries();
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus media terpilih", "error");
  } finally {
    bulkActionLoading.value = false;
  }
};

const handleDownloadBulk = async () => {
  if (selectedItems.value.length === 0) return;

  const count = selectedItems.value.length;
  bulkActionLoading.value = true;
  showToast(`Mempersiapkan unduhan ${count} file...`, "info");
  
  try {
    const albumNameClean = currentAlbumTitle.value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const zipName = `galeri-${albumNameClean || "media"}-${Date.now()}.zip`;
    await galleryService.downloadBulk(selectedItems.value, zipName);
    showToast("Berkas ZIP berhasil diunduh", "success");
    selectedItems.value = [];
    isSelectionMode.value = false;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengunduh berkas massal", "error");
  } finally {
    bulkActionLoading.value = false;
  }
};

const currentAlbumTitle = computed(() => {
  if (selectedAlbumId.value === 'uncategorized') return 'Tanpa Album (Uncategorized)';
  const list = Array.isArray(albumList.value) ? albumList.value : [];
  const found = list.find(a => a.id === selectedAlbumId.value);
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

const initObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loadingMore.value && selectedAlbumId.value) {
        fetchGalleriesBatch(false);
      }
    },
    { rootMargin: "300px", threshold: 0.05 }
  );

  if (sentinelRef.value) {
    observer.observe(sentinelRef.value);
  }
};

watch(sentinelRef, (newEl) => {
  if (newEl && selectedAlbumId.value) {
    initObserver();
  }
});

onMounted(() => {
  fetchAlbums();
  if (selectedAlbumId.value) {
    fetchGalleriesBatch(true);
  } else {
    fetchGalleriesOverview();
  }
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
                      <SecureMedia :filename="media.path || media.fileName" :type="media.type" class="pointer-events-none opacity-100 transition duration-500 w-full h-full object-cover" />
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
        <!-- Selection Controls & Info Bar -->
        <div v-if="items.length > 0" class="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-base-content/5">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-base-content">
              Daftar Media ({{ totalItems }} Item)
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="toggleSelectionMode" 
              class="btn btn-sm rounded-xl transition animate-fade-in"
              :class="isSelectionMode ? 'btn-active btn-neutral' : 'btn-outline btn-ghost'"
            >
              <LayoutGrid class="w-4 h-4 mr-1.5" />
              <span>{{ isSelectionMode ? 'Batal Pilih' : 'Pilih Massal' }}</span>
            </button>
          </div>
        </div>

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

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
          <div 
            v-for="item in items" 
            :key="item.id" 
            class="group relative aspect-square rounded-xl overflow-hidden bg-base-200 border transition-all duration-300"
            :class="[
              isSelectionMode && selectedItems.includes(item.id!) ? 'ring-4 ring-primary border-primary' : 'border-base-content/5',
              isSelectionMode ? 'cursor-pointer select-none hover:scale-[0.98]' : ''
            ]"
          >
            <!-- Checkbox Overlay for Selection Mode -->
            <div 
              v-if="isSelectionMode" 
              class="absolute top-2 right-2 z-20"
              @click.stop="toggleSelectItem(item.id!)"
            >
              <input 
                type="checkbox" 
                :checked="selectedItems.includes(item.id!)" 
                class="checkbox checkbox-primary checkbox-sm bg-base-100/90 border-slate-300 shadow-sm pointer-events-none"
              />
            </div>

            <!-- Media Preview (Secure Fetch) -->
            <SecureMedia :filename="item.path || item.fileName" :type="item.type" />
            
            <!-- Gradient Overlay (Always visible on mobile, hover on desktop) -->
            <div 
              class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 md:p-3 z-10 cursor-pointer"
              @click="isSelectionMode ? toggleSelectItem(item.id!) : (viewMediaItem = item)"
            >
              
              <div v-if="!isSelectionMode" class="flex justify-between items-end">
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
                    class="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
                    @click.stop="handleShareMedia(item)"
                    title="Bagikan ke WhatsApp"
                  >
                    <Share2 class="w-4 h-4 md:w-4 md:h-4" />
                  </button>
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
              <div v-else class="flex justify-between items-center text-white">
                <span class="text-xs truncate font-medium max-w-[70%]">{{ item.originalName }}</span>
                <span class="text-[10px] bg-primary text-white font-bold px-2 py-0.5 rounded-md" v-if="selectedItems.includes(item.id!)">Terpilih</span>
              </div>
            </div>
            
            <!-- Badge Video -->
            <div v-if="item.type === 'video'" class="absolute top-2 left-2 bg-slate-900/70 backdrop-blur text-white p-1.5 rounded-lg z-10">
              <Film class="w-4 h-4" />
            </div>
          </div>
        </div>

        <!-- Sentinel Infinite Scroll & Fallback Button -->
        <div v-if="selectedAlbumId" ref="sentinelRef" class="py-6 text-center space-y-3">
          <div v-if="loadingMore" class="flex items-center justify-center gap-2 text-primary font-semibold text-xs">
            <span class="loading loading-spinner loading-md"></span>
            <span>Memuat media berikutnya...</span>
          </div>
          <template v-else-if="hasMore">
            <button 
              @click="fetchGalleriesBatch(false)" 
              class="btn btn-outline btn-primary btn-sm rounded-xl px-6 hover:shadow-md transition"
            >
              Muat Lebih Banyak Media (Tersisa {{ totalServerItems - galleriesBatch.length }})
            </button>
          </template>
          <p v-else-if="!hasMore && galleriesBatch.length > 0" class="text-xs text-base-content/40 font-semibold">
            Semua {{ totalServerItems }} media telah ditampilkan.
          </p>
        </div>
      </template>
    </div>

    <!-- UPLOAD MODAL -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showUploadModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!uploadLoading && (showUploadModal = false)">
        <div class="modal-box max-w-2xl bg-base-100 rounded-2xl border border-base-content/10 p-6 shadow-premium relative text-base-content">
          <button class="absolute top-4 right-4 text-base-content/40 hover:text-base-content/70 transition" @click="showUploadModal = false" :disabled="uploadLoading">
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-bold text-base-content text-lg tracking-tight mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud class="w-4 h-4" />
              </div>
              <span>Unggah Media</span>
            </div>
            <span class="text-xs font-semibold text-base-content/60 bg-base-200 px-3 py-1 rounded-full border border-base-content/5">
              {{ uploadItems.length }} / {{ MAX_UPLOAD_BATCH_LIMIT }} File Max
            </span>
          </h3>

          <!-- Overall Progress Card when uploading or finished -->
          <div v-if="uploadItems.length > 0 && (uploadLoading || successUploadsCount > 0 || failedUploadsCount > 0)" class="mb-4 p-3 bg-base-200/70 rounded-xl border border-base-content/5 space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-base-content/80 flex items-center gap-1.5">
                <span v-if="uploadLoading" class="loading loading-spinner loading-xs text-primary"></span>
                <span>Kemajuan Unggah: {{ successUploadsCount }} / {{ totalUploadsCount }} Berhasil</span>
                <span v-if="failedUploadsCount > 0" class="text-error font-bold">({{ failedUploadsCount }} Gagal)</span>
              </span>
              <span class="text-primary font-bold">{{ overallUploadProgress }}%</span>
            </div>
            <progress class="progress progress-primary w-full h-2 rounded-full transition-all duration-300" :value="overallUploadProgress" max="100"></progress>
          </div>

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
                :disabled="uploadLoading"
              />
            </div>

            <!-- Dropzone / Input File -->
            <label 
              v-if="uploadItems.length < MAX_UPLOAD_BATCH_LIMIT"
              class="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200"
              :class="[
                isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-base-content/20 bg-base-200/50 hover:bg-base-200',
                uploadLoading ? 'pointer-events-none opacity-50' : ''
              ]"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
            >
              <div class="flex flex-col items-center justify-center pt-4 pb-4 px-4 text-center">
                <UploadCloud class="w-9 h-9 text-base-content/40 mb-2 transition-transform duration-200" :class="isDragging ? 'scale-110 text-primary' : ''" />
                <p class="mb-1 text-sm text-base-content/70"><span class="font-semibold text-primary">Klik untuk memilih</span> atau seret file ke sini</p>
                <p class="text-xs text-base-content/50">Mendukung Foto (JPG, PNG, WEBP) & Video (MP4, WEBM) maks 500MB (Maks {{ MAX_UPLOAD_BATCH_LIMIT - uploadItems.length }} file lagi)</p>
              </div>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" class="hidden" @change="handleFileSelect" :disabled="uploadLoading" />
            </label>
            
            <div v-else class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs text-amber-600 font-semibold">
              Batas maksimal {{ MAX_UPLOAD_BATCH_LIMIT }} file per unggahan telah tercapai. Hapus beberapa file jika ingin menambah file lain.
            </div>

            <!-- Preview & Status Selected Files -->
            <div v-if="uploadItems.length > 0" class="mt-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-semibold text-base-content/70 uppercase tracking-wider">
                  Daftar Berkas Terpilih ({{ uploadItems.length }})
                </h4>
                <button 
                  v-if="failedUploadsCount > 0 && !uploadLoading" 
                  @click="retryAllFailed"
                  class="btn btn-xs btn-outline btn-warning rounded-lg flex items-center gap-1 font-semibold"
                >
                  <RotateCcw class="w-3 h-3" />
                  Coba Lagi Semua Gagal ({{ failedUploadsCount }})
                </button>
              </div>

              <div class="max-h-56 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                <div 
                  v-for="item in uploadItems" 
                  :key="item.id" 
                  class="flex flex-col p-3 bg-base-200 rounded-xl border transition-all duration-200"
                  :class="[
                    item.status === 'failed' ? 'border-error/40 bg-error/5' : '',
                    item.status === 'success' ? 'border-success/30 bg-success/5' : '',
                    item.status === 'uploading' ? 'border-primary/40 bg-primary/5' : 'border-base-content/5'
                  ]"
                >
                  <div class="flex items-center justify-between gap-3 overflow-hidden">
                    <div class="flex items-center gap-3 overflow-hidden flex-1">
                      <div class="w-10 h-10 rounded-lg bg-base-100 flex items-center justify-center flex-shrink-0 border border-base-content/5 shadow-xs">
                        <Film v-if="item.type.startsWith('video/')" class="w-5 h-5 text-primary" />
                        <ImageIcon v-else class="w-5 h-5 text-primary" />
                      </div>
                      <div class="overflow-hidden flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <p class="text-xs font-semibold text-base-content truncate" :title="item.name">{{ item.name }}</p>
                          <span class="text-[10px] text-base-content/50 flex-shrink-0">({{ formatSize(item.size) }})</span>
                        </div>

                        <!-- Error Message if Failed -->
                        <p v-if="item.status === 'failed'" class="text-[11px] text-error mt-0.5 font-medium flex items-center gap-1">
                          <AlertCircle class="w-3 h-3 shrink-0" />
                          <span class="truncate">{{ item.errorMsg || 'Gagal mengunggah file' }}</span>
                        </p>
                      </div>
                    </div>

                    <!-- Status Badge & Action -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <!-- Pending -->
                      <span v-if="item.status === 'pending'" class="badge badge-sm badge-ghost gap-1 text-[10px] font-semibold text-base-content/60">
                        <Clock class="w-3 h-3" /> Menunggu
                      </span>

                      <!-- Uploading -->
                      <span v-else-if="item.status === 'uploading'" class="badge badge-sm badge-primary gap-1 text-[10px] font-bold text-white animate-pulse">
                        <span class="loading loading-spinner loading-xs"></span> {{ item.progress }}%
                      </span>

                      <!-- Success -->
                      <span v-else-if="item.status === 'success'" class="badge badge-sm badge-success text-white gap-1 text-[10px] font-bold">
                        <CheckCircle2 class="w-3.5 h-3.5" /> Berhasil
                      </span>

                      <!-- Failed Action -->
                      <template v-else-if="item.status === 'failed'">
                        <button 
                          @click="retrySingleItem(item)" 
                          class="btn btn-xs btn-warning rounded-lg flex items-center gap-1 text-white font-bold"
                          :disabled="uploadLoading"
                          title="Coba lagi file ini"
                        >
                          <RotateCcw class="w-3 h-3" />
                          <span class="hidden sm:inline">Coba Lagi</span>
                        </button>
                      </template>

                      <!-- Remove Button -->
                      <button 
                        v-if="item.status !== 'uploading'" 
                        class="btn btn-xs btn-ghost btn-circle text-base-content/40 hover:text-error transition" 
                        @click="removeUploadItem(item.id)"
                        title="Hapus dari daftar"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <!-- Per-File Progress Bar -->
                  <div v-if="item.status === 'uploading'" class="w-full mt-2">
                    <progress class="progress progress-primary w-full h-1.5 rounded-full" :value="item.progress" max="100"></progress>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-action gap-2 mt-6">
            <button 
              class="btn btn-ghost hover:bg-base-200 rounded-xl font-bold text-xs" 
              @click="showUploadModal = false" 
              :disabled="uploadLoading"
            >
              {{ isAllUploadsSuccess ? 'Tutup' : 'Batal' }}
            </button>

            <!-- All Success Finished Button -->
            <button 
              v-if="isAllUploadsSuccess" 
              class="btn btn-success text-white rounded-xl font-bold px-6 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-xs"
              @click="showUploadModal = false"
            >
              <CheckCircle2 class="w-4 h-4" />
              Selesai (Semua Berhasil)
            </button>

            <!-- Retry All Failed Button if failed items exist -->
            <button 
              v-else-if="failedUploadsCount > 0 && !uploadLoading" 
              class="btn btn-warning text-white rounded-xl font-bold px-6 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-xs"
              @click="retryAllFailed"
            >
              <RotateCcw class="w-4 h-4" />
              Coba Lagi ({{ failedUploadsCount }} File Gagal)
            </button>

            <!-- Submit Upload Button -->
            <button 
              v-else 
              class="btn btn-primary rounded-xl font-bold px-6 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-xs" 
              @click="submitUpload" 
              :disabled="uploadLoading || uploadItems.length === 0 || pendingOrFailedUploadsCount === 0"
            >
              <span v-if="uploadLoading" class="loading loading-spinner loading-xs"></span>
              {{ uploadLoading ? `Mengunggah (${successUploadsCount}/${totalUploadsCount})...` : `Unggah Sekarang (${pendingOrFailedUploadsCount} File)` }}
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
                  class="btn btn-sm md:btn-md btn-circle btn-ghost text-white hover:bg-emerald-500 hover:text-white"
                  @click="handleShareMedia(viewMediaItem)"
                  title="Bagikan ke WhatsApp"
                >
                  <Share2 class="w-5 h-5" />
               </button>
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
               <SecureMedia :filename="viewMediaItem.path || viewMediaItem.fileName" :type="viewMediaItem.type" fit="contain" class="w-full h-full max-h-[85vh] rounded-lg overflow-hidden bg-transparent" />
             </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Sticky Floating Action Bar for Bulk Selection -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-20 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-20 opacity-0"
      >
        <div 
          v-if="isSelectionMode && selectedAlbumId" 
          class="fixed bottom-6 inset-x-4 md:left-auto md:right-6 md:w-[480px] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-[80] text-white flex flex-col gap-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <input 
                type="checkbox" 
                :checked="isAllSelected" 
                @change="toggleSelectAll"
                class="checkbox checkbox-primary checkbox-sm border-white/30 bg-slate-850"
                id="select-all-bulk"
              />
              <label for="select-all-bulk" class="text-sm font-semibold cursor-pointer select-none">
                Pilih Semua ({{ items.length }} Media)
              </label>
            </div>
            <span class="text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full font-bold">
              {{ selectedItems.length }} Terpilih
            </span>
          </div>

          <div class="flex items-center gap-2 mt-2">
            <button 
              @click="handleShareBulk" 
              class="btn flex-1 btn-sm rounded-xl font-bold flex items-center justify-center gap-1.5 px-2 text-white border-none shadow-md hover:brightness-110 active:scale-95 transition-all"
              style="background-color: #059669;"
              :disabled="selectedItems.length === 0 || bulkActionLoading"
            >
              <span v-if="bulkActionLoading" class="loading loading-spinner loading-xs"></span>
              <Share2 v-else class="w-4 h-4" />
              <span class="text-xs">Kirim WA</span>
            </button>
            <button 
              @click="handleDownloadBulk" 
              class="btn flex-1 btn-primary btn-sm rounded-xl font-bold flex items-center justify-center gap-1.5 px-2 text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
              :disabled="selectedItems.length === 0 || bulkActionLoading"
            >
              <span v-if="bulkActionLoading" class="loading loading-spinner loading-xs"></span>
              <Download v-else class="w-4 h-4" />
              <span class="text-xs">Unduh</span>
            </button>
            <button 
              @click="handleDeleteBulk" 
              class="btn flex-1 btn-error btn-sm rounded-xl font-bold flex items-center justify-center gap-1.5 px-2 text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
              :disabled="selectedItems.length === 0 || bulkActionLoading"
            >
              <span v-if="bulkActionLoading" class="loading loading-spinner loading-xs"></span>
              <Trash2 v-else class="w-4 h-4" />
              <span class="text-xs">Hapus</span>
            </button>
          </div>
          
          <div class="text-[10px] text-white/50 text-center">
            Pilih foto/video lalu pilih tindakan massal di atas.
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
