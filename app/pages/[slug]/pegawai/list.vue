<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { PegawaiService, type PegawaiItem } from "@/services/pegawai.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  Briefcase, 
  Mail, 
  Phone, 
  MapPin,
  RefreshCw,
  Info
} from "lucide-vue-next";
import UiAutocompleteWilayah from "@/components/ui/AutocompleteWilayah.vue";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const pegawaiService = PegawaiService();

/* =========================
   STATE DATA TABLE & SERVER OPTIONS
========================= */
const headers = [
  { text: "NAMA & NIP", value: "name", sortable: true },
  { text: "JABATAN", value: "position", sortable: true },
  { text: "KONTAK", value: "kontak", sortable: false },
  { text: "TANGGAL DIBUAT", value: "createdAt", sortable: true },
  { text: "AKSI", value: "aksi", sortable: false },
];

const serverOptions = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: "id",
  sortType: "desc",
});

const pegawaiList = ref<PegawaiItem[]>([]);
const totalItems = ref(0);
const loading = ref(false);
const searchQuery = ref("");
const positionFilter = ref("");

/* =========================
   FETCH PEGAWAI DATA
========================= */
const fetchPegawai = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
      search: searchQuery.value.trim(),
      sortBy: serverOptions.value.sortBy,
      sortType: serverOptions.value.sortType.toUpperCase(),
    };

    if (positionFilter.value) {
      params.position = positionFilter.value.trim();
    }

    const res = await pegawaiService.getPegawai(params);
    
    let rawData: PegawaiItem[] = [];
    let count = 0;

    if (res?.array && Array.isArray(res.array)) {
      rawData = res.array;
      count = res.totalItems ?? res.array.length;
    } else if ((res as any)?.data?.items && Array.isArray((res as any).data.items)) {
      rawData = (res as any).data.items;
      count = (res as any).data.meta?.totalItems ?? rawData.length;
    } else if (Array.isArray(res)) {
      rawData = res;
      count = res.length;
    }

    pegawaiList.value = rawData;
    totalItems.value = count;
  } catch (err: any) {
    console.error("Gagal mengambil data pegawai:", err);
    showToast("Gagal memuat data pegawai", "error");
  } finally {
    loading.value = false;
  }
};

const updateOptions = (options: any) => {
  serverOptions.value = options;
  fetchPegawai();
};

/* =========================
   WATCHERS (SEARCH & FILTER)
========================= */
let searchTimeout: any = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    serverOptions.value.page = 1;
    fetchPegawai();
  }, 400);
});

watch(positionFilter, () => {
  serverOptions.value.page = 1;
  fetchPegawai();
});

/* =========================
   MODAL CREATE / EDIT PEGAWAI
========================= */
const showModal = ref(false);
const isEdit = ref(false);
const selectedId = ref<number | null>(null);
const submitLoading = ref(false);

const form = ref<{
  nip: string;
  name: string;
  email: string;
  phoneNumber: string;
  position: string;
  bio: string;
  address: string;
  idKelurahan: string;
}>({
  nip: "",
  name: "",
  email: "",
  phoneNumber: "",
  position: "",
  bio: "",
  address: "",
  idKelurahan: "",
});

const initialWilayahLabel = ref("");

const errors = ref<{
  nip?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
}>({});

const resetForm = () => {
  form.value = {
    nip: "",
    name: "",
    email: "",
    phoneNumber: "",
    position: "",
    bio: "",
    address: "",
  };
  errors.value = {};
  selectedId.value = null;
  isEdit.value = false;
  initialWilayahLabel.value = "";
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const openEditModal = (pegawai: PegawaiItem) => {
  resetForm();
  isEdit.value = true;
  selectedId.value = pegawai.id;
  form.value = {
    nip: pegawai.nip,
    name: pegawai.name,
    email: pegawai.email || "",
    phoneNumber: pegawai.phoneNumber || "",
    position: pegawai.position || "",
    bio: pegawai.bio || "",
    address: pegawai.address || "",
    idKelurahan: pegawai.idKelurahan || "",
  };
  if (pegawai.kelurahan) {
    const k = pegawai.kelurahan;
    initialWilayahLabel.value = `${k.nama}, ${k.kecamatan?.nama || ""}, ${k.kecamatan?.kabupaten?.nama || ""}, ${k.kecamatan?.kabupaten?.provinsi?.nama || ""}`;
  } else {
    initialWilayahLabel.value = "";
  }
  showModal.value = true;
};

const handleWilayahSelect = (item: any) => {
  form.value.idKelurahan = item.id;
};

const handleWilayahClear = () => {
  form.value.idKelurahan = "";
};

const validateForm = () => {
  errors.value = {};
  let isValid = true;

  if (!form.value.nip.trim()) {
    errors.value.nip = "NIP wajib diisi";
    isValid = false;
  } else if (!/^\d+$/.test(form.value.nip.trim())) {
    errors.value.nip = "NIP hanya boleh berisi angka";
    isValid = false;
  }

  if (!form.value.name.trim()) {
    errors.value.name = "Nama pegawai wajib diisi";
    isValid = false;
  }

  if (form.value.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.value.email.trim())) {
      errors.value.email = "Format email tidak valid";
      isValid = false;
    }
  }

  if (!form.value.position.trim()) {
    errors.value.position = "Jabatan wajib diisi";
    isValid = false;
  }

  return isValid;
};

const submitForm = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const payload = {
      nip: form.value.nip.trim(),
      name: form.value.name.trim(),
      email: form.value.email.trim() || undefined,
      phoneNumber: form.value.phoneNumber.trim() || undefined,
      position: form.value.position.trim() || undefined,
      bio: form.value.bio.trim() || undefined,
      address: form.value.address.trim() || undefined,
      idKelurahan: form.value.idKelurahan || undefined,
    };

    if (isEdit.value && selectedId.value) {
      await pegawaiService.updatePegawai(selectedId.value, payload);
      showToast(`Data pegawai "${form.value.name}" berhasil diperbarui`, "success");
    } else {
      await pegawaiService.createPegawai(payload);
      showToast(`Pegawai baru "${form.value.name}" berhasil ditambahkan`, "success");
    }

    showModal.value = false;
    fetchPegawai();
  } catch (err: any) {
    console.error("Gagal menyimpan pegawai:", err);
    showToast(err?.data?.message || err?.message || "Gagal menyimpan data pegawai", "error");
  } finally {
    submitLoading.value = false;
  }
};

/* =========================
   DELETE PEGAWAI LOGIC
========================= */
const handleDeletePegawai = async (pegawai: PegawaiItem) => {
  const confirmResult = await Swal.fire({
    title: "Hapus Pegawai?",
    text: `Apakah Anda yakin ingin menghapus data pegawai "${pegawai.name}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    customClass: {
      confirmButton: "btn btn-error rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (!confirmResult.isConfirmed) return;

  try {
    await pegawaiService.deletePegawai(pegawai.id);
    showToast(`Data pegawai "${pegawai.name}" berhasil dihapus`, "success");
    fetchPegawai();
  } catch (err: any) {
    console.error("Gagal menghapus pegawai:", err);
    showToast("Gagal menghapus data pegawai", "error");
  }
};

/* =========================
   HELPER FORMATTING & STYLES
========================= */
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

onMounted(() => {
  fetchPegawai();
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    <!-- ======================================================== -->
    <!-- HEADER SECTION -->
    <!-- ======================================================== -->
    <HeaderSearch 
      title="Manajemen Pegawai" 
      subtitle="Kelola dan pantau data profil pegawai serta integrasinya dengan otorisasi pengguna" 
      v-model="searchQuery" 
      @add="openCreateModal"
    >
      <template #actions>
        <button 
          class="btn btn-primary rounded-2xl font-extrabold px-5 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-200 active:scale-[0.98] flex items-center gap-2"
          @click="openCreateModal"
        >
          <div class="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Plus class="w-4 h-4 stroke-[3]" />
          </div>
          <span>Tambah Pegawai</span>
        </button>
      </template>
    </HeaderSearch>

    <!-- ======================================================== -->
    <!-- CONTROL BAR -->
    <!-- ======================================================== -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-base-100 p-4 rounded-3xl border border-base-content/10 shadow-xs">
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <label class="text-xs font-bold text-base-content/60 uppercase">Filter Jabatan:</label>
        <input 
          v-model="positionFilter" 
          type="text" 
          placeholder="Cari berdasarkan jabatan..." 
          class="input input-bordered input-sm rounded-xl"
        />
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <span class="text-xs font-bold text-base-content/60">
          Total: <span class="text-base-content font-extrabold">{{ totalItems }} Pegawai</span>
        </span>

        <button 
          class="btn btn-ghost btn-sm btn-square rounded-xl hover:bg-base-200"
          @click="fetchPegawai"
          :disabled="loading"
          title="Refresh Data"
        >
          <RefreshCw class="w-4 h-4 text-base-content/70" :class="{'animate-spin': loading}" />
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- DATA TABLE SECTION (vue3-easy-data-table) -->
    <!-- ======================================================== -->
    <div class="bg-base-100 border border-base-content/10 rounded-3xl shadow-sm p-6 overflow-hidden">
      <div class="overflow-x-auto">
        <ClientOnly>
          <EasyDataTable 
            :headers="headers" 
            :items="pegawaiList" 
            :loading="loading" 
            :server-items-length="totalItems"
            v-model:server-options="serverOptions" 
            @update:server-options="updateOptions" 
            buttons-pagination
            :rows-items="[10, 20, 50]"
            table-class-name="customize-easy-table"
          >
            <!-- Column Nama & NIP Customizer -->
            <template #item-name="item">
              <div class="flex items-center gap-3 py-1">
                <div class="w-9 h-9 rounded-2xl overflow-hidden shrink-0 border border-primary/20">
                  <SecureAvatar
                    :avatar-path="item.avatar"
                    :name="item.name"
                    img-class="w-full h-full object-cover"
                    fallback-class="w-full h-full bg-primary/10 text-primary font-black flex items-center justify-center uppercase text-xs"
                  />
                </div>
                <div>
                  <h4 class="font-extrabold text-sm text-base-content tracking-tight">
                    {{ item.name }}
                  </h4>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span class="text-[10px] font-semibold text-base-content/50">NIP: {{ item.nip }}</span>
                    <span v-if="item.kelurahan" class="text-[10px] text-primary/80 font-bold flex items-center gap-0.5">
                      <MapPin class="w-3 h-3" />
                      {{ item.kelurahan.nama }}, {{ item.kelurahan.kecamatan?.nama || '' }}
                    </span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Column Jabatan -->
            <template #item-position="{ position }">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                <Briefcase class="w-3.5 h-3.5" />
                <span>{{ position || '-' }}</span>
              </span>
            </template>

            <!-- Column Kontak -->
            <template #item-kontak="{ email, phoneNumber }">
              <div class="space-y-0.5">
                <div v-if="email" class="flex items-center gap-1.5 text-xs text-base-content/70">
                  <Mail class="w-3.5 h-3.5 text-base-content/40" />
                  <span>{{ email }}</span>
                </div>
                <div v-if="phoneNumber" class="flex items-center gap-1.5 text-xs text-base-content/70">
                  <Phone class="w-3.5 h-3.5 text-base-content/40" />
                  <span>{{ phoneNumber }}</span>
                </div>
                <span v-if="!email && !phoneNumber" class="text-xs text-base-content/40">-</span>
              </div>
            </template>

            <!-- Column Date Customizer -->
            <template #item-createdAt="{ createdAt }">
              <div class="flex items-center gap-1.5 text-xs font-semibold text-base-content/70">
                <Calendar class="w-3.5 h-3.5 text-base-content/40" />
                <span>{{ formatDate(createdAt) }}</span>
              </div>
            </template>

            <!-- Column Action Customizer -->
            <template #item-aksi="item">
              <div class="flex items-center justify-end gap-1.5">
                <button 
                  class="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-primary hover:bg-primary/10 rounded-xl"
                  @click="openEditModal(item)"
                  title="Edit Pegawai"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>

                <button 
                  class="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-error hover:bg-error/10 rounded-xl"
                  @click="handleDeletePegawai(item)"
                  title="Hapus Pegawai"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </template>
          </EasyDataTable>
        </ClientOnly>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL CREATE / EDIT PEGAWAI -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showModal = false)">
        <div class="modal-box max-w-lg bg-base-100 rounded-3xl border border-base-content/10 p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden">
          <!-- Header (flex-none) -->
          <div class="flex-none pr-8">
            <button 
              class="absolute top-5 right-5 text-base-content/40 hover:text-error transition" 
              @click="showModal = false"
              :disabled="submitLoading"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 class="font-extrabold text-base-content text-xl tracking-tight mb-6 flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Users class="w-5 h-5" />
              </div>
              {{ isEdit ? "Edit Data Pegawai" : "Tambah Pegawai Baru" }}
            </h3>
          </div>

          <!-- Body (flex-1) -->
          <div class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            <!-- NIP Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Nomor Induk Pegawai (NIP) <span class="text-error">*</span>
              </label>
              <input 
                v-model="form.nip" 
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium text-sm" 
                :class="{'border-error': errors.nip}" 
                placeholder="Contoh: 199208122019031002" 
                :disabled="isEdit"
              />
              <span v-if="errors.nip" class="text-xs text-error font-semibold mt-1 block">
                {{ errors.nip }}
              </span>
            </div>

            <!-- Nama Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Nama Lengkap Pegawai <span class="text-error">*</span>
              </label>
              <input 
                v-model="form.name" 
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium text-sm" 
                :class="{'border-error': errors.name}" 
                placeholder="Contoh: Dr. Budi Santoso" 
              />
              <span v-if="errors.name" class="text-xs text-error font-semibold mt-1 block">
                {{ errors.name }}
              </span>
            </div>

            <!-- Jabatan Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Jabatan / Posisi Kerja <span class="text-error">*</span>
              </label>
              <input 
                v-model="form.position" 
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium text-sm" 
                :class="{'border-error': errors.position}" 
                placeholder="Contoh: Staff Keuangan / Senior Developer" 
              />
              <span v-if="errors.position" class="text-xs text-error font-semibold mt-1 block">
                {{ errors.position }}
              </span>
            </div>

            <!-- Email Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Alamat Email <span class="text-base-content/40 font-normal normal-case">(opsional)</span>
              </label>
              <input 
                v-model="form.email" 
                type="email"
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium text-sm" 
                :class="{'border-error': errors.email}" 
                placeholder="Contoh: budi.santoso@company.com" 
              />
              <span v-if="errors.email" class="text-xs text-error font-semibold mt-1 block">
                {{ errors.email }}
              </span>
            </div>

            <!-- Phone Number Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Nomor Telepon / WhatsApp <span class="text-base-content/40 font-normal normal-case">(opsional)</span>
              </label>
              <input 
                v-model="form.phoneNumber" 
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium text-sm" 
                placeholder="Contoh: 081234567890" 
              />
            </div>

            <!-- Bio Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Bio / Informasi Singkat <span class="text-base-content/40 font-normal normal-case">(opsional)</span>
              </label>
              <textarea 
                v-model="form.bio" 
                class="textarea textarea-bordered w-full rounded-2xl p-3 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all h-24 bg-base-100 resize-none font-medium text-sm" 
                placeholder="Deskripsi singkat mengenai keahlian atau latar belakang pegawai..." 
              />
            </div>

            <!-- Wilayah Input -->
            <div>
              <UiAutocompleteWilayah
                v-model="form.idKelurahan"
                :initial-label="initialWilayahLabel"
                label="Wilayah Administratif (Kelurahan/Kecamatan/Kota)"
                placeholder="Cari kelurahan tempat tinggal..."
                @select="handleWilayahSelect"
                @clear="handleWilayahClear"
              />
            </div>

            <!-- Address Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Alamat Tinggal <span class="text-base-content/40 font-normal normal-case">(opsional)</span>
              </label>
              <textarea 
                v-model="form.address" 
                class="textarea textarea-bordered w-full rounded-2xl p-3 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all h-24 bg-base-100 resize-none font-medium text-sm" 
                placeholder="Alamat lengkap tempat tinggal pegawai saat ini..." 
              />
            </div>
          </div>

          <!-- Footer (flex-none) -->
          <div class="flex-none modal-action gap-3 mt-6">
            <button class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6" @click="showModal = false" :disabled="submitLoading">
              Batal
            </button>
            <button class="btn btn-primary rounded-2xl font-bold px-7 shadow-lg shadow-primary/30 flex items-center gap-2" @click="submitForm" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              {{ isEdit ? "Simpan Perubahan" : "Simpan" }}
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

  --easy-table-body-row-height: 58px;
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
