<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
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
  FolderOpen 
} from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import { useSlugRoute } from "@/composables/useSlugRoute";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const documentService = DocumentService();
const { slugPath } = useSlugRoute();

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
  { label: "Archive (.zip, .tar, .gz)", value: "zip" },
  { label: "Text/Code (.txt, .json)", value: "txt" },
];

/* =========================
   MODAL & FORM STATE
   ========================= */
const showUploadModal = ref(false);
const submitLoading = ref(false);
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragActive = ref(false);

const form = ref({
  description: "",
});

const formErrors = ref({
  file: "",
  description: "",
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

const formatDate = (dateStr?: string | Date) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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
   FILE HANDLERS & UPLOAD
   ========================= */
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    validateAndSetFile(target.files[0]);
  }
};

const handleFileDrop = (e: DragEvent) => {
  isDragActive.value = false;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
    validateAndSetFile(e.dataTransfer.files[0]);
  }
};

const validateAndSetFile = (file: File) => {
  formErrors.value.file = "";
  
  // Batasi ukuran file 50MB
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    formErrors.value.file = "Ukuran berkas melebihi batas maksimal (50MB)";
    selectedFile.value = null;
    return;
  }

  // Cek ekstensi file yang valid
  const allowedExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'tgz', 'gz', 'txt', 'csv'
  ];
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  if (!allowedExtensions.includes(fileExt)) {
    formErrors.value.file = "Format berkas tidak diizinkan. Gunakan PDF, Word, Excel, ZIP, dll.";
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
};

const removeSelectedFile = () => {
  selectedFile.value = null;
  formErrors.value.file = "";
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

const resetUploadForm = () => {
  selectedFile.value = null;
  form.value.description = "";
  formErrors.value.file = "";
  formErrors.value.description = "";
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

const openUploadModal = () => {
  resetUploadForm();
  showUploadModal.value = true;
};

const uploadDocument = async () => {
  formErrors.value.file = "";
  formErrors.value.description = "";

  if (!selectedFile.value) {
    formErrors.value.file = "Silakan pilih berkas dokumen terlebih dahulu";
    return;
  }

  if (form.value.description.length > 500) {
    formErrors.value.description = "Deskripsi maksimal 500 karakter";
    return;
  }

  submitLoading.value = true;
  try {
    await documentService.uploadDocument(selectedFile.value, form.value.description);
    showToast("Dokumen berhasil diunggah", "success");
    showUploadModal.value = false;
    resetUploadForm();
    fetchDocuments();
  } catch (err: any) {
    console.error("Gagal mengunggah dokumen:", err);
    const errorMsg = err?.data?.message || "Terjadi kesalahan saat mengunggah dokumen";
    showToast(errorMsg, "error");
  } finally {
    submitLoading.value = false;
  }
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

    <!-- MODAL UPLOAD DOKUMEN -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showUploadModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showUploadModal = false)">
        <div class="modal-box max-w-xl bg-base-100 rounded-3xl border border-base-content/10 p-8 shadow-2xl relative text-base-content">
          <button class="absolute top-6 right-6 text-base-content/40 hover:text-error hover:rotate-90 transition-all duration-300" @click="showUploadModal = false" :disabled="submitLoading">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 class="font-extrabold text-base-content text-2xl tracking-tight mb-8 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <UploadCloud class="w-5 h-5" />
            </div>
            <span>Unggah Dokumen Baru</span>
          </h3>

          <div class="space-y-5">
            <!-- File Uploader Area -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">Pilih Berkas Dokumen <span class="text-error">*</span></label>
              
              <input 
                ref="fileInputRef" 
                type="file" 
                class="hidden" 
                @change="handleFileSelect" 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.tar,.tgz,.gz,.txt,.csv"
              />

              <!-- Drag and drop zone -->
              <div 
                v-if="!selectedFile"
                @click="triggerFileInput"
                @dragover.prevent="isDragActive = true"
                @dragleave.prevent="isDragActive = false"
                @drop.prevent="handleFileDrop"
                class="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3"
                :class="isDragActive ? 'border-primary bg-primary/5 scale-98 shadow-inner' : 'border-base-content/20 hover:border-primary/50 hover:bg-base-200/50'"
              >
                <div class="w-12 h-12 rounded-full bg-base-200 text-base-content/50 flex items-center justify-center">
                  <UploadCloud class="w-6 h-6" />
                </div>
                <div>
                  <p class="font-bold text-sm text-base-content">Klik atau seret file ke sini untuk mengunggah</p>
                  <p class="text-xs text-base-content/50 mt-1">PDF, Word, Excel, ZIP, TAR, TXT (Maks. 50MB)</p>
                </div>
              </div>

              <!-- Selected File Preview -->
              <div 
                v-else
                class="border border-base-content/10 rounded-2xl p-4 bg-base-200/40 flex items-center justify-between gap-3 shadow-xs"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div 
                    class="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-bold"
                    :class="getFileIconColorClass(selectedFile.name.split('.').pop() || '')"
                  >
                    <component :is="getFileIcon(selectedFile.name.split('.').pop() || '')" class="w-5 h-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-sm text-base-content truncate" :title="selectedFile.name">
                      {{ selectedFile.name }}
                    </p>
                    <p class="text-xs text-base-content/50 mt-0.5">{{ formatBytes(selectedFile.size) }}</p>
                  </div>
                </div>
                <button 
                  @click="removeSelectedFile" 
                  class="btn btn-ghost btn-sm text-error hover:bg-error/10 rounded-xl font-bold px-3 shrink-0"
                >
                  Hapus
                </button>
              </div>

              <span v-if="formErrors.file" class="text-xs text-error font-semibold mt-1.5 block">
                {{ formErrors.file }}
              </span>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">Deskripsi <span class="text-base-content/40 font-normal normal-case">(opsional)</span></label>
              <textarea 
                v-model="form.description" 
                class="textarea textarea-bordered w-full rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 h-28 bg-base-100 resize-none font-medium text-sm leading-relaxed" 
                placeholder="Berikan keterangan singkat tentang dokumen ini..." 
                :class="{'border-error': formErrors.description}"
                maxlength="500"
              />
              <div class="flex justify-between items-center mt-1">
                <span v-if="formErrors.description" class="text-xs text-error font-semibold block">
                  {{ formErrors.description }}
                </span>
                <span class="text-[10px] text-base-content/40 font-semibold ml-auto">
                  {{ form.description.length }}/500 karakter
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-action gap-3 mt-8">
            <button 
              class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6" 
              @click="showUploadModal = false" 
              :disabled="submitLoading"
            >
              Batal
            </button>
            <button 
              class="btn btn-primary rounded-2xl font-bold px-8 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 flex items-center gap-2" 
              @click="uploadDocument" 
              :disabled="submitLoading"
            >
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              <span>Unggah</span>
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
