<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { DocumentService, type Document } from "@/services/document.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { 
  FileText, 
  FileSpreadsheet, 
  FileArchive, 
  FileCode, 
  File, 
  UploadCloud, 
  Download, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Calendar, 
  User, 
  FolderOpen,
  Share2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  X
} from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useWhatsappShare } from "@/composables/useWhatsappShare";
import { useAuthStore } from "@/stores/auth";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const pinoLogger = useLogger();
const documentService = DocumentService();
const { slugPath } = useSlugRoute();
const { shareFile } = useWhatsappShare();
const auth = useAuthStore();
const config = useRuntimeConfig();

/* =========================
   TYPES & INTERFACES
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
  description?: string;
}

/* =========================
   STATE & DATA TABLE OPTIONS
   ========================= */
const headers = [
  { text: "NAMA DOKUMEN", value: "originalName", sortable: true },
  { text: "DESKRIPSI", value: "description", sortable: false },
  { text: "UKURAN", value: "size", sortable: true },
  { text: "FORMAT", value: "extension", sortable: true },
  { text: "PENGUNGGAH", value: "uploadedBy", sortable: false },
  { text: "TANGGAL UNGGAH", value: "createdAt", sortable: true },
  { text: "AKSI", value: "aksi", sortable: false },
];

const serverOptions = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: "createdAt",
  sortType: "desc",
});

const items = ref<Document[]>([]);
const totalItems = ref(0);
const loading = ref(false);
const search = ref("");
const selectedExtension = ref("");

// Ekstensi yang didukung untuk filter
const extensionOptions = [
  { label: "Semua Format", value: "" },
  { label: "PDF Document (.pdf)", value: "pdf" },
  { label: "Word Document (.doc, .docx)", value: "docx" },
  { label: "Excel Spreadsheet (.xls, .xlsx, .csv)", value: "xlsx" },
  { label: "Archive (.zip, .tar, .gz, .rar)", value: "zip" },
  { label: "Text/Code (.txt, .json, .xml)", value: "txt" },
];

/* =========================
   MODAL & MULTI-FILE UPLOAD STATE
   ========================= */
const showUploadModal = ref(false);
const uploadLoading = ref(false);
const uploadItems = ref<UploadFileItem[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragActive = ref(false);

const MAX_UPLOAD_BATCH_LIMIT = 10; // Limit per upload batch (maksimal 10 file)
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // Limit per file (500 MB)
const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "zip", "tar", "tgz", "gz", "rar", "txt", "csv", "json", "xml"
];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-tar",
  "application/x-gtar",
  "application/x-gzip",
  "application/gzip",
  "text/plain",
  "text/csv",
  "application/json",
  "application/octet-stream"
];

/* COMPUTED UPLOAD STATS */
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
   HELPERS & FORMATTERS
   ========================= */
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatDateOnly = (dateStr?: string | Date) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatTimeOnly = (dateStr?: string | Date) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  }) + " WIB";
};

const getFileIcon = (ext: string) => {
  const cleanExt = (ext || '').toLowerCase();
  if (cleanExt === 'pdf') return FileText;
  if (['doc', 'docx'].includes(cleanExt)) return FileText;
  if (['xls', 'xlsx', 'csv'].includes(cleanExt)) return FileSpreadsheet;
  if (['zip', 'tar', 'tgz', 'gz', 'rar'].includes(cleanExt)) return FileArchive;
  if (['txt', 'json', 'xml', 'js', 'ts'].includes(cleanExt)) return FileCode;
  return File;
};

const getFileIconColorClass = (ext: string) => {
  const cleanExt = (ext || '').toLowerCase();
  if (cleanExt === 'pdf') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  if (['doc', 'docx'].includes(cleanExt)) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  if (['xls', 'xlsx', 'csv'].includes(cleanExt)) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (['zip', 'tar', 'tgz', 'gz', 'rar'].includes(cleanExt)) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (['txt', 'json', 'xml', 'js', 'ts'].includes(cleanExt)) return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
  return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
};

/* =========================
   FETCH DATA
   ========================= */
const fetchDocuments = async () => {
  loading.value = true;
  try {
    const res = await documentService.getDocuments({
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
      search: search.value.trim(),
      extension: selectedExtension.value || undefined,
      sortBy: serverOptions.value.sortBy || "createdAt",
      sortType: (serverOptions.value.sortType || "desc").toUpperCase(),
    });

    items.value = res.array || [];
    totalItems.value = res.totalItems || 0;
  } catch (err) {
    console.error("Gagal mengambil data dokumen:", err);
    showToast("Gagal mengambil data dokumen", "error");
  } finally {
    loading.value = false;
  }
};

const updateOptions = (options: any) => {
  serverOptions.value = options;
  fetchDocuments();
};

const handleSearch = () => {
  serverOptions.value.page = 1;
  fetchDocuments();
};

const handleFilterChange = () => {
  serverOptions.value.page = 1;
  fetchDocuments();
};

let searchTimeout: any = null;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    serverOptions.value.page = 1;
    fetchDocuments();
  }, 400);
});

/* =========================
   MULTI-FILE HANDLERS & UPLOAD
   ========================= */
const openUploadModal = () => {
  uploadItems.value = [];
  isDragActive.value = false;
  showUploadModal.value = true;
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
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
      description: "",
    });
  }

  if (limitExceededCount > 0) {
    showToast(`Maksimal ${MAX_UPLOAD_BATCH_LIMIT} berkas per unggahan. ${limitExceededCount} berkas dilewati.`, "warning");
  }
  if (oversizedCount > 0) {
    showToast(`${oversizedCount} berkas melebihi batas maksimal 500MB`, "error");
  }
  if (invalidTypeCount > 0) {
    showToast(`${invalidTypeCount} berkas diabaikan karena format tidak didukung`, "warning");
  }
  if (duplicateCount > 0) {
    showToast(`${duplicateCount} berkas duplikat dilewati`, "info");
  }

  if (newItems.length > 0) {
    uploadItems.value = [...uploadItems.value, ...newItems];
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    processIncomingFiles(Array.from(target.files));
    target.value = "";
  }
};

const handleFileDrop = (e: DragEvent) => {
  isDragActive.value = false;
  if (e.dataTransfer?.files) {
    processIncomingFiles(Array.from(e.dataTransfer.files));
  }
};

const removeUploadItem = (id: string) => {
  const idx = uploadItems.value.findIndex(item => item.id === id);
  if (idx >= 0) {
    uploadItems.value.splice(idx, 1);
  }
};

const uploadSingleItem = (item: UploadFileItem): Promise<boolean> => {
  return new Promise((resolve) => {
    item.status = 'uploading';
    item.progress = 0;
    item.errorMsg = undefined;

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", item.file);
    if (item.description) {
      formData.append("description", item.description);
    }

    // Proteksi Timeout Cerdas: HANYA timeout jika TIDAK ADA PROGRES sama sekali selama 60 detik (Stalled Connection)
    // Selama ada progres data berjalan, timer akan terus di-reset sehingga file besar (hingga 500MB) tidak akan terputus.
    const STALL_TIMEOUT_MS = 60000;
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

    resetStallTimer();
    pinoLogger.info(`[Upload Process] Memulai unggah berkas "${item.name}"`, { fileName: item.name, fileSize: item.size, type: item.type });

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        item.progress = Math.round((e.loaded * 100) / e.total);
      }
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
          const message = resp?.message?.message || resp?.message || "Gagal mengunggah berkas";
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
      pinoLogger.error(`[Upload Network Error] Kesalahan jaringan saat mengunggah "${item.name}".`, { fileName: item.name });
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

    const apiUrl = `${config.public.apiBase}/documents/upload`;
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
      fetchDocuments();
    } else {
      showToast("Pilih minimal 1 berkas dokumen untuk diunggah", "error");
    }
    return;
  }

  uploadLoading.value = true;

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

  if (updatedFailed === 0) {
    showToast(`Berhasil mengunggah ${updatedSuccess} dokumen`, "success");
    fetchDocuments();
  } else {
    showToast(`${updatedSuccess} dokumen berhasil, ${updatedFailed} dokumen gagal diunggah. Silakan klik 'Coba Lagi'`, "warning");
    fetchDocuments();
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
    fetchDocuments();
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
   ACTIONS (DOWNLOAD & DELETE)
   ========================= */
const downloadDoc = async (item: Document) => {
  try {
    await documentService.downloadDocument(item.path, item.originalName);
    showToast("Dokumen berhasil diunduh", "success");
  } catch (err) {
    console.error(err);
    showToast("Gagal mengunduh dokumen", "error");
  }
};

const handleShareMedia = (item: Document) => {
  if (item.path && item.originalName) {
    shareFile(item.path, item.originalName, 'document');
  } else {
    showToast("File tidak valid untuk dibagikan", "error");
  }
};

const deleteDoc = async (id: string) => {
  const result = await Swal.fire({
    title: "Hapus Dokumen?",
    text: "Dokumen ini akan dihapus secara permanen dari server penyimpanan.",
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
    await documentService.deleteDocument(id);
    showToast("Dokumen berhasil dihapus", "success");
    fetchDocuments();
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus dokumen", "error");
  }
};

onMounted(() => {
  fetchDocuments();
});
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <HeaderSearch 
      title="Manajemen Dokumen" 
      subtitle="Kelola, unggah, dan unduh berkas dokumen perusahaan dengan aman" 
      :total="totalItems" 
      v-model:search="search"
      @search="handleSearch" 
      @add="openUploadModal" 
    >
      <template #actions>
        <button 
          class="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 self-start sm:self-auto flex items-center gap-2" 
          @click="openUploadModal"
        >
          <Plus class="w-4 h-4" />
          <span>Unggah Dokumen</span>
        </button>
      </template>
    </HeaderSearch>

    <!-- CONTROL, FILTER & SUMMARY BAR -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-base-100 p-4 rounded-3xl border border-base-content/10 shadow-xs">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
          <FolderOpen class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-extrabold text-sm text-base-content">Daftar Dokumen</h3>
          <p class="text-xs text-base-content/60">Tabel data berkas dokumen terunggah</p>
        </div>
      </div>

      <!-- Filter Extension & Refresh -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
        <div class="relative w-full sm:w-60">
          <select 
            v-model="selectedExtension" 
            @change="handleFilterChange" 
            class="select select-bordered w-full rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-base-200/50 focus:bg-base-100 font-medium"
          >
            <option v-for="opt in extensionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
          <span class="text-xs font-bold text-base-content/60 shrink-0">
            Total: <span class="text-base-content font-extrabold">{{ totalItems }} Dokumen</span>
          </span>

          <button 
            class="btn btn-ghost btn-sm btn-square rounded-xl hover:bg-base-200"
            @click="fetchDocuments"
            :disabled="loading"
            title="Refresh Data"
          >
            <RefreshCw class="w-4 h-4 text-base-content/70" :class="{'animate-spin': loading}" />
          </button>
        </div>
      </div>
    </div>

    <!-- DATA TABLE SECTION -->
    <div class="bg-base-200/50 border border-base-content/10 rounded-3xl p-6 overflow-hidden shadow-inner">
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
            <!-- Column Nama Dokumen -->
            <template #item-originalName="{ originalName, extension, id }">
              <div class="flex items-center gap-3.5 py-1 max-w-xs sm:max-w-md">
                <div 
                  class="w-11 h-11 rounded-2xl border font-black flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 hover:scale-105"
                  :class="getFileIconColorClass(extension)"
                >
                  <component :is="getFileIcon(extension)" class="w-5.5 h-5.5" />
                </div>
                <div class="min-w-0">
                  <h4 class="font-extrabold text-[14px] text-base-content tracking-tight truncate hover:text-primary transition duration-150 cursor-pointer" :title="originalName">
                    {{ originalName }}
                  </h4>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-base-200/50 text-base-content/40 border border-base-content/5">ID: {{ id ? id.substring(0, 8) : '-' }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Column Deskripsi -->
            <template #item-description="{ description }">
              <span class="text-xs text-base-content/60 italic font-medium leading-relaxed max-w-xs line-clamp-2" :title="description || 'Tidak ada deskripsi'">
                {{ description || '-' }}
              </span>
            </template>

            <!-- Column Ukuran -->
            <template #item-size="{ size }">
              <span class="badge badge-outline border-base-content/10 px-2.5 py-2.5 text-xs text-base-content/75 font-semibold font-mono bg-base-100 shadow-3xs">
                {{ formatBytes(size) }}
              </span>
            </template>

            <!-- Column Format -->
            <template #item-extension="{ extension }">
              <span 
                class="badge badge-sm font-mono font-black uppercase px-2.5 py-2.5 rounded-xl border shadow-3xs"
                :class="getFileIconColorClass(extension)"
              >
                {{ extension }}
              </span>
            </template>

            <!-- Column Pengunggah -->
            <template #item-uploadedBy="{ uploadedBy }">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-2xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center text-[11px] font-extrabold uppercase shrink-0 shadow-xs">
                  {{ uploadedBy?.username?.substring(0, 2) || 'S' }}
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-extrabold text-base-content/85 truncate max-w-[100px]">{{ uploadedBy?.username || 'Sistem' }}</span>
                  <span class="text-[9px] font-semibold text-base-content/45 uppercase tracking-wider">Pengunggah</span>
                </div>
              </div>
            </template>

            <!-- Column Tanggal Unggah -->
            <template #item-createdAt="{ createdAt }">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-2xl bg-base-100 border border-base-content/5 text-base-content/50 flex items-center justify-center shrink-0 shadow-3xs">
                  <Calendar class="w-4 h-4 text-base-content/40" />
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-base-content/75">{{ formatDateOnly(createdAt) }}</span>
                  <span class="text-[10px] font-medium text-base-content/45">{{ formatTimeOnly(createdAt) }}</span>
                </div>
              </div>
            </template>

            <!-- Column Action -->
            <template #item-aksi="item">
              <div class="flex items-center justify-end gap-2">
                <button 
                  class="btn btn-sm btn-ghost hover:bg-primary/10 text-primary border border-primary/15 hover:border-primary/25 rounded-2xl font-bold px-3 transition-all duration-300 flex items-center gap-1.5 text-xs shadow-xs"
                  @click="downloadDoc(item)"
                  title="Unduh Dokumen"
                >
                  <Download class="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>

                <button 
                  class="btn btn-sm btn-ghost hover:bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 hover:border-emerald-500/25 rounded-2xl font-bold px-3 transition-all duration-300 flex items-center gap-1.5 text-xs shadow-xs"
                  @click="handleShareMedia(item)"
                  title="Bagikan ke WhatsApp"
                >
                  <Share2 class="w-3.5 h-3.5" />
                  <span class="hidden sm:inline">Kirim WA</span>
                </button>

                <button 
                  class="w-8 h-8 rounded-2xl bg-base-100 border border-base-content/5 text-base-content/40 hover:bg-error/15 hover:text-error hover:border-error/25 transition-all duration-300 flex items-center justify-center shrink-0 shadow-xs" 
                  @click="deleteDoc(item.id)" 
                  title="Hapus Dokumen"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </template>
          </EasyDataTable>
        </ClientOnly>
      </div>
    </div>

    <!-- MODAL MULTI-FILE UPLOAD DOKUMEN -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showUploadModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!uploadLoading && (showUploadModal = false)">
        <div class="modal-box max-w-3xl bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-8 shadow-2xl relative text-base-content max-h-[90vh] flex flex-col">
          <!-- Close Modal Button -->
          <button 
            class="absolute top-6 right-6 text-base-content/40 hover:text-error hover:rotate-90 transition-all duration-300 cursor-pointer" 
            @click="showUploadModal = false" 
            :disabled="uploadLoading"
          >
            <X class="w-6 h-6" />
          </button>

          <!-- Modal Title -->
          <h3 class="font-extrabold text-base-content text-xl sm:text-2xl tracking-tight mb-2 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UploadCloud class="w-5 h-5" />
            </div>
            <span>Unggah Dokumen (Maks. 500MB / File)</span>
          </h3>
          <p class="text-xs text-base-content/60 mb-6">Pilih satu atau banyak berkas dokumen sekaligus. Format yang didukung: PDF, Word, Excel, PowerPoint, ZIP, TAR, GZ, TXT, CSV, dll.</p>

          <div class="space-y-5 overflow-y-auto pr-1 flex-1 scrollbar-thin">
            <!-- File Drop & Picker Area -->
            <div>
              <input 
                ref="fileInputRef" 
                type="file" 
                multiple
                class="hidden" 
                @change="handleFileSelect" 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.tar,.tgz,.gz,.rar,.txt,.csv,.json,.xml"
              />

              <div 
                @click="triggerFileInput"
                @dragover.prevent="isDragActive = true"
                @dragleave.prevent="isDragActive = false"
                @drop.prevent="handleFileDrop"
                class="border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
                :class="isDragActive ? 'border-primary bg-primary/5 scale-[0.99] shadow-inner' : 'border-base-content/20 hover:border-primary/50 hover:bg-base-200/50'"
              >
                <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud class="w-6 h-6" />
                </div>
                <div>
                  <p class="font-bold text-sm text-base-content">Klik atau seret berkas ke sini (Maks. 10 file)</p>
                  <p class="text-xs text-base-content/50 mt-1">Dapat memilih hingga 10 file sekaligus • Maksimal 500 MB per file</p>
                </div>
              </div>
            </div>

            <!-- Overall Upload Progress Summary (Jika Ada Antrean File) -->
            <div v-if="uploadItems.length > 0" class="bg-base-200/50 rounded-2xl p-4 border border-base-content/10 space-y-3">
              <div class="flex items-center justify-between text-xs font-extrabold">
                <span class="text-base-content flex items-center gap-2">
                  <span>Progres Unggahan Massal</span>
                  <span class="badge badge-sm badge-neutral font-mono font-bold">{{ successUploadsCount }}/{{ totalUploadsCount }} Berhasil</span>
                </span>
                <span class="font-mono text-primary font-black">{{ overallUploadProgress }}%</span>
              </div>
              
              <!-- Multi-file progress bar -->
              <div class="w-full bg-base-300 rounded-full h-2.5 overflow-hidden">
                <div 
                  class="bg-primary h-2.5 rounded-full transition-all duration-300"
                  :style="{ width: `${overallUploadProgress}%` }"
                ></div>
              </div>

              <!-- Summary Status Badges & Quick Action -->
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                <div class="flex items-center gap-3 font-semibold">
                  <span v-if="successUploadsCount > 0" class="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 class="w-3.5 h-3.5" /> {{ successUploadsCount }} Sukses
                  </span>
                  <span v-if="failedUploadsCount > 0" class="text-error flex items-center gap-1 font-bold">
                    <AlertCircle class="w-3.5 h-3.5" /> {{ failedUploadsCount }} Gagal
                  </span>
                  <span v-if="pendingOrFailedUploadsCount > 0" class="text-amber-600 flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5" /> {{ pendingOrFailedUploadsCount }} Antrean
                  </span>
                </div>

                <button 
                  v-if="failedUploadsCount > 0 && !uploadLoading"
                  @click="retryAllFailed"
                  class="btn btn-xs btn-error btn-outline rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                >
                  <RotateCcw class="w-3 h-3" />
                  <span>Coba Lagi Semua yang Gagal</span>
                </button>
              </div>
            </div>

            <!-- Queue File Items List -->
            <div v-if="uploadItems.length > 0" class="space-y-3">
              <div class="flex items-center justify-between text-xs font-bold text-base-content/70 px-1">
                <span>Daftar Berkas Antrean ({{ uploadItems.length }})</span>
                <button 
                  v-if="!uploadLoading"
                  @click="uploadItems = []"
                  class="text-error hover:underline text-[11px]"
                >
                  Bersihkan Antrean
                </button>
              </div>

              <div class="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin divide-y divide-base-content/5">
                <div 
                  v-for="item in uploadItems" 
                  :key="item.id"
                  class="pt-2.5 first:pt-0"
                >
                  <div class="flex items-start justify-between gap-3 p-3 bg-base-100 rounded-2xl border border-base-content/10 shadow-3xs">
                    <!-- Icon File -->
                    <div 
                      class="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-bold mt-0.5"
                      :class="getFileIconColorClass(item.name.split('.').pop() || '')"
                    >
                      <component :is="getFileIcon(item.name.split('.').pop() || '')" class="w-5 h-5" />
                    </div>

                    <!-- File Details & Status -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <p class="font-extrabold text-xs text-base-content truncate" :title="item.name">
                          {{ item.name }}
                        </p>
                        <!-- Status Badge -->
                        <span 
                          class="badge badge-xs font-bold uppercase text-[9px] px-2 py-1 shrink-0"
                          :class="{
                            'badge-warning': item.status === 'pending',
                            'badge-info animate-pulse': item.status === 'uploading',
                            'badge-success text-white': item.status === 'success',
                            'badge-error text-white': item.status === 'failed'
                          }"
                        >
                          <span v-if="item.status === 'pending'">Menunggu</span>
                          <span v-else-if="item.status === 'uploading'">Mengunggah {{ item.progress }}%</span>
                          <span v-else-if="item.status === 'success'">Selesai</span>
                          <span v-else-if="item.status === 'failed'">Gagal</span>
                        </span>
                      </div>

                      <p class="text-[11px] font-mono text-base-content/50 mt-0.5">
                        Ukuran: {{ formatBytes(item.size) }}
                      </p>

                      <!-- Input Deskripsi Opsional Per File -->
                      <div class="mt-2" v-if="item.status === 'pending'">
                        <input 
                          v-model="item.description"
                          type="text"
                          placeholder="Deskripsi singkat (opsional)..."
                          class="input input-xs input-bordered w-full rounded-lg text-[11px]"
                          maxlength="255"
                        />
                      </div>

                      <!-- Individual Item Progress Bar -->
                      <div v-if="item.status === 'uploading' || item.status === 'success'" class="w-full bg-base-200 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div 
                          class="h-1.5 rounded-full transition-all duration-200"
                          :class="item.status === 'success' ? 'bg-emerald-500' : 'bg-primary'"
                          :style="{ width: `${item.progress}%` }"
                        ></div>
                      </div>

                      <!-- Error Alert Box jika gagal -->
                      <div v-if="item.status === 'failed' && item.errorMsg" class="mt-2 p-2 rounded-xl bg-error/10 border border-error/20 text-error text-[11px] font-medium flex items-center justify-between gap-2">
                        <span class="truncate">{{ item.errorMsg }}</span>
                        <button 
                          @click="retrySingleItem(item)"
                          class="btn btn-xs btn-error text-white rounded-lg px-2 shrink-0 font-bold flex items-center gap-1"
                          :disabled="uploadLoading"
                        >
                          <RotateCcw class="w-3 h-3" />
                          <span>Coba Lagi</span>
                        </button>
                      </div>
                    </div>

                    <!-- Remove Item Button -->
                    <button 
                      v-if="item.status !== 'uploading' && !uploadLoading"
                      @click="removeUploadItem(item.id)"
                      class="text-base-content/40 hover:text-error p-1 transition-colors rounded-lg shrink-0 mt-0.5"
                      title="Hapus dari antrean"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-action gap-3 mt-6 pt-4 border-t border-base-content/10">
            <button 
              class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6 text-xs" 
              @click="showUploadModal = false" 
              :disabled="uploadLoading"
            >
              {{ isAllUploadsSuccess ? 'Tutup' : 'Batal' }}
            </button>

            <button 
              v-if="failedUploadsCount > 0"
              class="btn btn-warning rounded-2xl font-bold px-6 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-xs" 
              @click="retryAllFailed"
              :disabled="uploadLoading"
            >
              <RotateCcw class="w-4 h-4" />
              <span>Coba Lagi Semua yang Gagal</span>
            </button>

            <button 
              class="btn btn-primary rounded-2xl font-bold px-8 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 flex items-center gap-2 text-xs" 
              @click="submitUpload" 
              :disabled="uploadLoading || uploadItems.length === 0"
            >
              <span v-if="uploadLoading" class="loading loading-spinner loading-xs"></span>
              <span>{{ isAllUploadsSuccess ? 'Selesai' : (uploadLoading ? 'Mengunggah...' : `Unggah ${uploadItems.length} Berkas`) }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.customize-easy-table {
  --easy-table-border: none;
  --easy-table-row-border: none;

  --easy-table-header-font-size: 11px;
  --easy-table-header-height: 48px;
  --easy-table-header-font-color: var(--fallback-bc, oklch(var(--bc) / 0.8));
  --easy-table-header-background-color: transparent;

  --easy-table-body-row-height: 72px;
  --easy-table-body-row-font-size: 13px;
  --easy-table-body-row-background-color: transparent;
  --easy-table-body-row-hover-background-color: transparent;

  --easy-table-footer-background-color: transparent;
  --easy-table-footer-font-color: var(--fallback-bc, oklch(var(--bc) / 0.7));
  --easy-table-footer-font-size: 12px;
  --easy-table-footer-padding: 12px 16px;
  --easy-table-footer-height: 52px;
}

/* Use collapse layout to merge borders cleanly */
.customize-easy-table .easy-data-table__table {
  border-collapse: collapse !important;
  background-color: transparent !important;
  width: 100% !important;
}

/* Header Row Styling - Solid & High Contrast */
.customize-easy-table thead th {
  background-color: var(--fallback-b2, oklch(var(--b2) / 1)) !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  border-top: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.12)) !important;
  border-bottom: 2px solid var(--fallback-bc, oklch(var(--bc) / 0.15)) !important;
  padding: 14px 16px !important;
}

/* Vertical boundaries between header columns */
.customize-easy-table thead th:not(:last-child) {
  border-right: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.15)) !important;
}

/* Body Rows Styling */
.customize-easy-table .easy-data-table__body tr {
  background-color: var(--fallback-b1, oklch(var(--b1) / 1)) !important;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Row Hover Highlight */
.customize-easy-table .easy-data-table__body tr:hover {
  background-color: var(--fallback-b2, oklch(var(--b2) / 0.3)) !important;
}

/* Clear cell padding and horizontal dividing borders */
.customize-easy-table .easy-data-table__body td {
  border-bottom: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.12)) !important;
  padding: 14px 16px !important;
}

/* Vertical boundaries between body columns */
.customize-easy-table .easy-data-table__body td:not(:last-child) {
  border-right: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.12)) !important;
}

/* Outer borders for the table body to give it a neat card-like wrapper */
.customize-easy-table .easy-data-table__body td:first-child {
  border-left: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.12)) !important;
}

.customize-easy-table .easy-data-table__body td:last-child {
  border-right: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.12)) !important;
}

/* Customize Pagination Buttons */
.customize-easy-table .buttons-pagination .button.active {
  background-color: var(--fallback-p, oklch(var(--p) / 1)) !important;
  color: var(--fallback-pc, oklch(var(--pc) / 1)) !important;
  border-radius: 10px !important;
}

.customize-easy-table .buttons-pagination .button {
  border-radius: 10px !important;
  border: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.1)) !important;
  margin: 0 2px !important;
  transition: all 0.2s;
}

.customize-easy-table .buttons-pagination .button:hover:not(.active) {
  background-color: var(--fallback-b2, oklch(var(--b2) / 0.5)) !important;
}
</style>
