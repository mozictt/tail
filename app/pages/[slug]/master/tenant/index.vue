<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useTenantMasterStore, type TenantItem } from "@/stores/tenantMaster";
import { TenantService } from "@/services/tenant.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { 
  Building2, 
  Calendar, 
  Pencil, 
  Plus, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  Copy, 
  RefreshCw,
  Crown,
  Layers,
  Filter,
  UserCheck,
  AlertTriangle
} from "lucide-vue-next";

import DateTimePicker from "@/components/DateTimePicker.vue";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";

definePageMeta({
  layout: "admin",
});

const { showToast } = useToast();
const tenantMasterStore = useTenantMasterStore();
const { 
  formatDate, 
  formatDateTime, 
  formatRelativeTime, 
  getDaysRemaining, 
  isExpired, 
  isExpiringSoon, 
  formatDateForInput, 
  addDays 
} = useDate();

/* =========================
   STATE LIST & FILTER
========================= */
const loading = ref(false);
const searchQuery = ref("");
const statusFilter = ref("ALL"); // ALL, ACTIVE, EXPIRING_SOON, EXPIRED, INACTIVE

onMounted(async () => {
  await loadTenants();
});

const loadTenants = async () => {
  loading.value = true;
  try {
    await tenantMasterStore.fetchTenants(searchQuery.value);
  } catch (err: any) {
    showToast(err?.message || "Gagal memuat data tenant", "error");
  } finally {
    loading.value = false;
  }
};

// Debounce search
let searchTimer: any = null;
const onSearchInput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadTenants();
  }, 400);
};

/* =========================
   HELPERS & COMPUTED
========================= */
const filteredTenants = computed(() => {
  let list = tenantMasterStore.tenants;

  if (statusFilter.value === "ACTIVE") {
    list = list.filter((t) => t.isActive && !isExpired(t.expiredAt) && !isExpiringSoon(t.expiredAt));
  } else if (statusFilter.value === "EXPIRING_SOON") {
    list = list.filter((t) => t.isActive && isExpiringSoon(t.expiredAt));
  } else if (statusFilter.value === "EXPIRED") {
    list = list.filter((t) => isExpired(t.expiredAt));
  } else if (statusFilter.value === "INACTIVE") {
    list = list.filter((t) => !t.isActive);
  }

  return list;
});

// Statistics
const stats = computed(() => {
  const all = tenantMasterStore.tenants;
  const activeCount = all.filter((t) => t.isActive && !isExpired(t.expiredAt)).length;
  const expiringSoonCount = all.filter((t) => t.isActive && isExpiringSoon(t.expiredAt)).length;
  const expiredCount = all.filter((t) => isExpired(t.expiredAt)).length;

  return {
    total: all.length,
    active: activeCount,
    expiringSoon: expiringSoonCount,
    expired: expiredCount,
  };
});

/* =========================
   STATE MODAL EDIT EXPIRED & DETAIL (@vuepic/vue-datepicker)
========================= */
const showEditModal = ref(false);
const submitLoading = ref(false);
const editingTenantId = ref<string | null>(null);

const editForm = ref({
  name: "",
  email: "",
  expiredAtISO: "",
  isActive: true,
});

const openEditModal = (tenant: TenantItem) => {
  editingTenantId.value = tenant.id;
  editForm.value = {
    name: tenant.name,
    email: tenant.email || "",
    expiredAtISO: tenant.expiredAt ? new Date(tenant.expiredAt).toISOString() : "",
    isActive: tenant.isActive,
  };
  showEditModal.value = true;
};

const handleSaveEdit = async () => {
  if (!editingTenantId.value) return;

  submitLoading.value = true;
  try {
    const payload: any = {
      name: editForm.value.name,
      email: editForm.value.email || undefined,
      isActive: editForm.value.isActive,
    };

    if (editForm.value.expiredAtISO) {
      const d = new Date(editForm.value.expiredAtISO);
      payload.expiredAt = !isNaN(d.getTime()) ? d.toISOString() : null;
    } else {
      payload.expiredAt = null;
    }

    await tenantMasterStore.updateTenant(editingTenantId.value, payload);

    showToast("Berhasil memperbarui data & masa berlangganan tenant!", "success");
    showEditModal.value = false;
  } catch (err: any) {
    showToast(err?.data?.message || err?.message || "Gagal memperbarui tenant", "error");
  } finally {
    submitLoading.value = false;
  }
};

/* =========================
   STATE MODAL REGISTRASI TENANT BARU
========================= */
const showRegisterModal = ref(false);
const registerLoading = ref(false);
const registerForm = ref({
  name: "",
  slug: "",
  email: "",
});

const openRegisterModal = () => {
  registerForm.value = { name: "", slug: "", email: "" };
  showRegisterModal.value = true;
};

const autoSlug = () => {
  registerForm.value.slug = registerForm.value.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const handleRegister = async () => {
  if (!registerForm.value.name || !registerForm.value.slug) {
    showToast("Nama dan Slug wajib diisi", "error");
    return;
  }

  registerLoading.value = true;
  try {
    await TenantService().register(registerForm.value);
    showToast("Tenant baru berhasil didaftarkan!", "success");
    showRegisterModal.value = false;
    await loadTenants();
  } catch (err: any) {
    showToast(err?.data?.message || err?.message || "Gagal mendaftarkan tenant baru", "error");
  } finally {
    registerLoading.value = false;
  }
};

/* =========================
   STATE MODAL CLONE CONFIG
========================= */
const showCloneModal = ref(false);
const cloneLoading = ref(false);
const cloneForm = ref({
  sourceTenantId: "",
  targetTenantId: "",
  includeMenus: true,
  includeRoles: true,
  includePermissions: true,
  createSuperAdminUser: true,
  customPassword: "",
});

const openCloneModal = (targetTenant?: TenantItem) => {
  cloneForm.value = {
    sourceTenantId: "",
    targetTenantId: targetTenant ? targetTenant.id : "",
    includeMenus: true,
    includeRoles: true,
    includePermissions: true,
    createSuperAdminUser: true,
    customPassword: "",
  };
  showCloneModal.value = true;
};

const handleCloneConfig = async () => {
  if (!cloneForm.value.targetTenantId) {
    showToast("Pilih Tenant Tujuan untuk duplikasi konfigurasi", "error");
    return;
  }

  cloneLoading.value = true;
  try {
    const res: any = await tenantMasterStore.cloneTenantConfig({
      sourceTenantId: cloneForm.value.sourceTenantId || undefined,
      targetTenantId: cloneForm.value.targetTenantId,
      includeMenus: cloneForm.value.includeMenus,
      includeRoles: cloneForm.value.includeRoles,
      includePermissions: cloneForm.value.includePermissions,
      createSuperAdminUser: cloneForm.value.createSuperAdminUser,
      customPassword: cloneForm.value.customPassword || undefined,
    });

    const userSummary = res?.summary?.createdUser;
    let successMsg = res?.message || "Berhasil menduplikasi konfigurasi!";

    if (userSummary && userSummary.username) {
      Swal.fire({
        icon: "success",
        title: "Duplikasi Konfigurasi Berhasil!",
        html: `
          <div class="text-left text-sm space-y-2 bg-base-200 p-4 rounded-xl border border-base-300">
            <p><strong>Tenant Tujuan:</strong> ${userSummary.tenantName}</p>
            <p><strong>Akun Super Admin:</strong> <code class="bg-base-300 px-1.5 py-0.5 rounded font-mono text-purple-600">${userSummary.username}</code></p>
            <p><strong>Password:</strong> <code class="bg-base-300 px-1.5 py-0.5 rounded font-mono text-emerald-600">${userSummary.password}</code></p>
          </div>
          <p class="text-xs text-base-content/60 mt-3">Simpan informasi kredensial di atas untuk login pertama kali pada tenant tersebut.</p>
        `,
        confirmButtonText: "Mengerti & Tutup",
        confirmButtonColor: "#4f46e5",
      });
    } else {
      showToast(successMsg, "success");
    }

    showCloneModal.value = false;
  } catch (err: any) {
    showToast(err?.data?.message || err?.message || "Gagal menduplikasi konfigurasi", "error");
  } finally {
    cloneLoading.value = false;
  }
};
</script>

<template>
  <div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
    <!-- Header Page -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-content/10 shadow-sm">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="p-2 rounded-xl bg-purple-500/10 text-purple-600">
            <Crown class="w-6 h-6" />
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-base-content">
            Manajemen Tenant Master
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-base-content/60 pl-10">
          Kelola daftar seluruh klinik/tenant, perpanjang masa aktif (*expired date*), dan duplikasi konfigurasi acuan.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          @click="openCloneModal()"
          class="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white gap-2 border-none rounded-xl font-semibold shadow-sm"
        >
          <Copy class="w-4 h-4" />
          <span>Duplikasi Config</span>
        </button>

        <button
          @click="openRegisterModal()"
          class="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white gap-2 border-none rounded-xl font-semibold shadow-sm"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah Tenant Baru</span>
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-base-100 p-4 rounded-2xl border border-base-content/10 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
          <Building2 class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs text-base-content/60 font-medium">Total Tenant</div>
          <div class="text-2xl font-black text-base-content">{{ stats.total }}</div>
        </div>
      </div>

      <div class="bg-base-100 p-4 rounded-2xl border border-base-content/10 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
          <CheckCircle2 class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs text-base-content/60 font-medium">Tenant Aktif</div>
          <div class="text-2xl font-black text-emerald-600">{{ stats.active }}</div>
        </div>
      </div>

      <div class="bg-base-100 p-4 rounded-2xl border border-base-content/10 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
          <AlertTriangle class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs text-base-content/60 font-medium">Hampir Expired (&le; 7 Hari)</div>
          <div class="text-2xl font-black text-amber-600">{{ stats.expiringSoon }}</div>
        </div>
      </div>

      <div class="bg-base-100 p-4 rounded-2xl border border-base-content/10 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
          <ShieldAlert class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs text-base-content/60 font-medium">Kadaluarsa / Non-Aktif</div>
          <div class="text-2xl font-black text-rose-600">{{ stats.expired }}</div>
        </div>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="bg-base-100 p-4 rounded-2xl border border-base-content/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="relative w-full md:w-80">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="Cari tenant, slug, email..."
          class="input input-sm input-bordered w-full pl-9 rounded-xl text-xs"
        />
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto justify-end">
        <Filter class="w-4 h-4 text-base-content/40 hidden sm:block" />
        <select
          v-model="statusFilter"
          class="select select-sm select-bordered rounded-xl text-xs w-full sm:w-auto"
        >
          <option value="ALL">Semua Status Tenant</option>
          <option value="ACTIVE">Aktif (Normal)</option>
          <option value="EXPIRING_SOON">Hampir Expired (&le; 7 Hari)</option>
          <option value="EXPIRED">Masa Berlangganan Habis</option>
          <option value="INACTIVE">Non-Aktif (Disabled)</option>
        </select>

        <button
          @click="loadTenants"
          class="btn btn-sm btn-square btn-ghost rounded-xl"
          title="Refresh Data"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table w-full text-left border-collapse">
          <thead>
            <tr class="bg-base-200/50 text-base-content/70 text-xs font-semibold uppercase tracking-wider">
              <th class="py-3.5 px-4">Klinik / Tenant</th>
              <th class="py-3.5 px-4">Tipe Context</th>
              <th class="py-3.5 px-4">Status</th>
              <th class="py-3.5 px-4">Expired Date</th>
              <th class="py-3.5 px-4">Sisa Hari</th>
              <th class="py-3.5 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-base-content/5 text-xs">
            <tr v-if="loading" class="text-center">
              <td colspan="6" class="py-8 text-base-content/50">
                <span class="loading loading-spinner loading-md"></span>
                <p class="mt-2 text-xs">Memuat data tenant...</p>
              </td>
            </tr>

            <tr v-else-if="filteredTenants.length === 0" class="text-center">
              <td colspan="6" class="py-12 text-base-content/50">
                <Building2 class="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p class="font-medium text-sm">Tidak ada tenant ditemukan.</p>
              </td>
            </tr>

            <tr
              v-else
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              class="hover:bg-base-200/30 transition-colors"
            >
              <!-- Info Tenant -->
              <td class="py-3.5 px-4">
                <div class="font-bold text-sm text-base-content flex items-center gap-1.5">
                  <span>{{ tenant.name }}</span>
                  <span v-if="tenant.isMaster" class="badge badge-xs badge-secondary font-bold">Master</span>
                </div>
                <div class="text-[11px] text-base-content/50 font-mono flex items-center gap-2 mt-0.5">
                  <span>slug: {{ tenant.slug }}</span>
                  <span v-if="tenant.email">&bull; {{ tenant.email }}</span>
                </div>
              </td>

              <!-- Tipe Context -->
              <td class="py-3.5 px-4">
                <span v-if="tenant.isMaster" class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-300">
                  <Crown class="w-3 h-3" /> Pusat
                </span>
                <span v-else class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-base-200 px-2 py-0.5 rounded-full">
                  <Layers class="w-3 h-3" /> Tenant Anak
                </span>
              </td>

              <!-- Status Active -->
              <td class="py-3.5 px-4">
                <span v-if="tenant.isActive" class="badge badge-sm badge-success gap-1 text-white font-medium">
                  <CheckCircle2 class="w-3 h-3" /> Aktif
                </span>
                <span v-else class="badge badge-sm badge-error gap-1 text-white font-medium">
                  <XCircle class="w-3 h-3" /> Non-Aktif
                </span>
              </td>

              <!-- Expired Date -->
              <td class="py-3.5 px-4 font-mono font-medium">
                <div class="flex items-center gap-1.5">
                  <Calendar class="w-3.5 h-3.5 text-base-content/40" />
                  <span>{{ formatDate(tenant.expiredAt) }}</span>
                </div>
              </td>

              <!-- Sisa Hari Badge -->
              <td class="py-3.5 px-4">
                <template v-if="getDaysRemaining(tenant.expiredAt) !== null">
                  <span
                    v-if="(getDaysRemaining(tenant.expiredAt) ?? 0) < 0"
                    class="badge badge-sm badge-error font-bold text-white"
                  >
                    Kadaluarsa ({{ Math.abs(getDaysRemaining(tenant.expiredAt)!) }} hr lalu)
                  </span>
                  <span
                    v-else-if="(getDaysRemaining(tenant.expiredAt) ?? 0) <= 7"
                    class="badge badge-sm badge-warning font-bold text-amber-950"
                  >
                    Sisa {{ getDaysRemaining(tenant.expiredAt) }} Hari
                  </span>
                  <span
                    v-else
                    class="badge badge-sm bg-emerald-500/10 text-emerald-700 border-emerald-300 font-semibold"
                  >
                    Sisa {{ getDaysRemaining(tenant.expiredAt) }} Hari
                  </span>
                </template>
                <template v-else>
                  <span class="text-base-content/40 italic">Tanpa Batas</span>
                </template>
              </td>

              <!-- Aksi -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="openEditModal(tenant)"
                    class="btn btn-xs bg-base-200 hover:bg-purple-600 hover:text-white border-none gap-1 rounded-lg text-xs"
                    title="Edit Masa Aktif & Detail"
                  >
                    <Pencil class="w-3 h-3" />
                    <span>Edit Expired</span>
                  </button>

                  <button
                    v-if="!tenant.isMaster"
                    @click="openCloneModal(tenant)"
                    class="btn btn-xs btn-ghost text-indigo-600 hover:bg-indigo-50 border-none gap-1 rounded-lg text-xs"
                    title="Duplikasi Config ke Tenant ini"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL EDIT EXPIRED & DETAIL TENANT -->
    <dialog class="modal" :class="{ 'modal-open': showEditModal }">
      <div class="modal-box max-w-md rounded-2xl p-6 space-y-4">
        <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
          <Pencil class="w-5 h-5 text-purple-600" />
          <span>Edit Masa Berlangganan Tenant</span>
        </h3>

        <form @submit.prevent="handleSaveEdit" class="space-y-4 text-xs">
          <!-- Expired Date & Time Picker Modern (@vuepic/vue-datepicker) -->
          <div class="space-y-1 bg-purple-500/5 p-3 rounded-xl border border-purple-500/20">
            <div class="flex items-center justify-between mb-1">
              <label class="font-bold text-base-content flex items-center gap-1.5">
                <Calendar class="w-4 h-4 text-purple-600" />
                <span>Tanggal & Jam Kadaluarsa (Expired Date)</span>
              </label>
            </div>

            <DateTimePicker
              v-model="editForm.expiredAtISO"
              :withTime="true"
              placeholder="Pilih Tanggal & Jam Kadaluarsa..."
            />
          </div>

          <!-- Nama Tenant -->
          <div class="space-y-1">
            <label class="font-semibold text-base-content/70">Nama Tenant / Klinik</label>
            <input
              v-model="editForm.name"
              type="text"
              required
              class="input input-sm input-bordered w-full rounded-xl"
            />
          </div>

          <!-- Email Kontak -->
          <div class="space-y-1">
            <label class="font-semibold text-base-content/70">Email Penanggung Jawab</label>
            <input
              v-model="editForm.email"
              type="email"
              placeholder="email@klinik.com"
              class="input input-sm input-bordered w-full rounded-xl"
            />
          </div>

          <!-- Switch Status Aktif -->
          <div class="flex items-center justify-between bg-base-200/50 p-3 rounded-xl border border-base-content/10">
            <div>
              <div class="font-semibold text-base-content">Status Keaktifan Tenant</div>
              <div class="text-[10px] text-base-content/50">Jika non-aktif, user tenant ini tidak dapat login</div>
            </div>
            <input
              v-model="editForm.isActive"
              type="checkbox"
              class="toggle toggle-sm toggle-success"
            />
          </div>

          <!-- Actions -->
          <div class="modal-action pt-2">
            <button
              type="button"
              @click="showEditModal = false"
              class="btn btn-sm btn-ghost rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitLoading"
              class="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 border-none"
            >
              <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- MODAL REGISTRASI TENANT BARU -->
    <dialog class="modal" :class="{ 'modal-open': showRegisterModal }">
      <div class="modal-box max-w-md rounded-2xl p-6 space-y-4">
        <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
          <Plus class="w-5 h-5 text-purple-600" />
          <span>Registrasi Tenant / Klinik Baru</span>
        </h3>

        <form @submit.prevent="handleRegister" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-semibold text-base-content/70">Nama Tenant / Klinik *</label>
            <input
              v-model="registerForm.name"
              @input="autoSlug"
              type="text"
              placeholder="Contoh: Klinik Pratama Sehat"
              required
              class="input input-sm input-bordered w-full rounded-xl"
            />
          </div>

          <div class="space-y-1">
            <label class="font-semibold text-base-content/70">Slug Identifikasi *</label>
            <input
              v-model="registerForm.slug"
              type="text"
              placeholder="klinik-pratama-sehat"
              required
              class="input input-sm input-bordered w-full rounded-xl font-mono"
            />
          </div>

          <div class="space-y-1">
            <label class="font-semibold text-base-content/70">Email Admin</label>
            <input
              v-model="registerForm.email"
              type="email"
              placeholder="admin@kliniksehat.com"
              class="input input-sm input-bordered w-full rounded-xl"
            />
          </div>

          <p class="text-[11px] text-base-content/50 bg-base-200 p-2.5 rounded-xl">
            ℹ️ Tenant baru secara otomatis akan diberikan masa trial **14 hari** sejak tanggal didaftarkan.
          </p>

          <div class="modal-action pt-2">
            <button
              type="button"
              @click="showRegisterModal = false"
              class="btn btn-sm btn-ghost rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="registerLoading"
              class="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 border-none"
            >
              <span v-if="registerLoading" class="loading loading-spinner loading-xs"></span>
              <span>Daftarkan Tenant</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- MODAL CLONE CONFIG -->
    <dialog class="modal" :class="{ 'modal-open': showCloneModal }">
      <div class="modal-box max-w-lg rounded-2xl p-6 space-y-4">
        <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
          <Copy class="w-5 h-5 text-indigo-600" />
          <span>Duplikasi Konfigurasi Tenant</span>
        </h3>

        <form @submit.prevent="handleCloneConfig" class="space-y-4 text-xs">
          <!-- Source Tenant -->
          <div class="space-y-1">
            <label class="font-semibold text-base-content/70">Tenant Asal Acuan (Source)</label>
            <select
              v-model="cloneForm.sourceTenantId"
              class="select select-sm select-bordered w-full rounded-xl text-xs"
            >
              <option value="">👑 Master Tenant (Bawaan Default System)</option>
              <option
                v-for="t in tenantMasterStore.tenants"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name }} ({{ t.slug }})
              </option>
            </select>
          </div>

          <!-- Target Tenant -->
          <div class="space-y-1">
            <label class="font-semibold text-base-content/70">Tenant Tujuan (Target) *</label>
            <select
              v-model="cloneForm.targetTenantId"
              required
              class="select select-sm select-bordered w-full rounded-xl text-xs"
            >
              <option value="" disabled>-- Pilih Tenant Tujuan --</option>
              <option
                v-for="t in tenantMasterStore.tenants.filter(x => !x.isMaster)"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name }} ({{ t.slug }})
              </option>
            </select>
          </div>

          <!-- Checkboxes Options -->
          <div class="space-y-2 bg-base-200/50 p-3 rounded-xl border border-base-content/10">
            <div class="font-semibold text-base-content">Elemen Konfigurasi yang Diduplikasi:</div>
            
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="cloneForm.includeMenus" type="checkbox" class="checkbox checkbox-xs checkbox-primary" />
              <span>Struktur Menu Aplikasi</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="cloneForm.includeRoles" type="checkbox" class="checkbox checkbox-xs checkbox-primary" />
              <span>Role Kustom</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="cloneForm.includePermissions" type="checkbox" class="checkbox checkbox-xs checkbox-primary" />
              <span>Permission Hak Akses Role</span>
            </label>

            <hr class="border-base-content/10 my-2" />

            <label class="flex items-center gap-2 cursor-pointer font-semibold text-purple-700">
              <input v-model="cloneForm.createSuperAdminUser" type="checkbox" class="checkbox checkbox-xs checkbox-secondary" />
              <span>Buat Akun User Super Admin Otomatis</span>
            </label>

            <div v-if="cloneForm.createSuperAdminUser" class="pt-2">
              <label class="font-semibold text-base-content/70">Password Custom (Opsional)</label>
              <input
                v-model="cloneForm.customPassword"
                type="text"
                placeholder="Password123! (Default)"
                class="input input-sm input-bordered w-full rounded-xl font-mono mt-1"
              />
            </div>
          </div>

          <div class="modal-action pt-2">
            <button
              type="button"
              @click="showCloneModal = false"
              class="btn btn-sm btn-ghost rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="cloneLoading"
              class="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 border-none"
            >
              <span v-if="cloneLoading" class="loading loading-spinner loading-xs"></span>
              <span>Jalankan Duplikasi</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>
