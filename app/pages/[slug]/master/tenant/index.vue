<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useTenantMasterStore, type TenantItem } from "@/stores/tenantMaster";
import { TenantService } from "@/services/tenant.service";
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
  AlertTriangle,
  Globe,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  TrendingUp,
  Users,
  Shield,
  MoreVertical,
  ExternalLink,
  KeyRound,
  Wifi,
  WifiOff,
  Hash,
  Mail,
  Info,
  ChevronDown,
  Eye,
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
  addDays,
} = useDate();

/* =========================
   STATE LIST & FILTER
========================= */
const loading = ref(false);
const searchQuery = ref("");
const statusFilter = ref("ALL"); // ALL, ACTIVE, EXPIRING_SOON, EXPIRED, INACTIVE
const viewMode = ref<"grid" | "table">("grid"); // Toggle antara grid card dan table
const activeDropdownId = ref<string | null>(null);

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

const toggleDropdown = (tenantId: string) => {
  activeDropdownId.value = activeDropdownId.value === tenantId ? null : tenantId;
};

// Tutup dropdown saat klik di luar
if (process.client) {
  document.addEventListener("click", () => {
    activeDropdownId.value = null;
  });
}

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

// Helper untuk mendapatkan label status tenant
const getTenantStatus = (tenant: TenantItem) => {
  if (!tenant.isActive) return { label: "Non-Aktif", color: "error", variant: "soft" };
  if (isExpired(tenant.expiredAt)) return { label: "Kadaluarsa", color: "rose", variant: "soft" };
  if (isExpiringSoon(tenant.expiredAt)) return { label: "Hampir Expired", color: "amber", variant: "soft" };
  return { label: "Aktif", color: "emerald", variant: "soft" };
};

// Helper gradient card berdasarkan status
const getCardGradient = (tenant: TenantItem): string => {
  if (tenant.isMaster) return "from-purple-500/8 via-indigo-500/5 to-transparent border-purple-400/20";
  if (!tenant.isActive) return "from-slate-500/5 via-transparent to-transparent border-slate-300/20";
  if (isExpired(tenant.expiredAt)) return "from-rose-500/8 via-red-500/5 to-transparent border-rose-300/20";
  if (isExpiringSoon(tenant.expiredAt)) return "from-amber-500/8 via-orange-500/5 to-transparent border-amber-300/20";
  return "from-emerald-500/5 via-transparent to-transparent border-emerald-300/15";
};

/* =========================
   STATE MODAL EDIT EXPIRED & DETAIL
========================= */
const showEditModal = ref(false);
const submitLoading = ref(false);
const editingTenantId = ref<string | null>(null);
const editingTenantName = ref("");

const editForm = ref({
  name: "",
  email: "",
  expiredAtISO: "",
  isActive: true,
});

const openEditModal = (tenant: TenantItem) => {
  editingTenantId.value = tenant.id;
  editingTenantName.value = tenant.name;
  editForm.value = {
    name: tenant.name,
    email: tenant.email || "",
    expiredAtISO: tenant.expiredAt ? new Date(tenant.expiredAt).toISOString() : "",
    isActive: tenant.isActive,
  };
  showEditModal.value = true;
  activeDropdownId.value = null;
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
  activeDropdownId.value = null;
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
  <div class="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">

    <!-- =============== HEADER =============== -->
    <div class="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 rounded-2xl p-6 sm:p-8 shadow-xl shadow-purple-500/20">
      <!-- BG Pattern -->
      <div class="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.04] pointer-events-none"></div>
      <div class="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
      <div class="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl"></div>

      <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <!-- Left: Title -->
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
              <Crown class="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Manajemen Tenant Master</h1>
              <p class="text-purple-200 text-xs sm:text-sm font-medium mt-0.5">Kelola & monitor seluruh klinik/tenant dari satu panel terpusat</p>
            </div>
          </div>

          <!-- Mode Badge -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold tracking-wide">
              <Crown class="w-3 h-3" /> Master Tenant Mode
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/80 text-[11px] font-semibold">
              <Wifi class="w-3 h-3 text-emerald-300" /> Konteks: Tenant Utama (Pusat)
            </span>
          </div>
        </div>

        <!-- Right: CTA Buttons -->
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            @click="openCloneModal()"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-95"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>Duplikasi Config</span>
          </button>

          <button
            @click="openRegisterModal()"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-purple-700 text-xs font-extrabold hover:bg-purple-50 shadow-lg shadow-purple-900/20 transition-all duration-200 hover:shadow-xl active:scale-95"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Tambah Tenant</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =============== STATISTICS CARDS =============== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- Total -->
      <button
        @click="statusFilter = 'ALL'"
        class="group relative overflow-hidden bg-base-100 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md text-left"
        :class="statusFilter === 'ALL' ? 'border-blue-400/40 shadow-md ring-2 ring-blue-500/20' : 'border-base-content/10'"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/15 transition-colors">
            <Building2 class="w-5 h-5 text-blue-600" />
          </div>
          <span v-if="statusFilter === 'ALL'" class="w-2 h-2 rounded-full bg-blue-500 animate-pulse mt-1.5"></span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-base-content">{{ stats.total }}</div>
        <div class="text-[11px] text-base-content/50 font-semibold mt-0.5">Total Tenant</div>
      </button>

      <!-- Aktif -->
      <button
        @click="statusFilter = 'ACTIVE'"
        class="group relative overflow-hidden bg-base-100 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md text-left"
        :class="statusFilter === 'ACTIVE' ? 'border-emerald-400/40 shadow-md ring-2 ring-emerald-500/20' : 'border-base-content/10'"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="p-2.5 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/15 transition-colors">
            <CheckCircle2 class="w-5 h-5 text-emerald-600" />
          </div>
          <span v-if="statusFilter === 'ACTIVE'" class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5"></span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-emerald-600">{{ stats.active }}</div>
        <div class="text-[11px] text-base-content/50 font-semibold mt-0.5">Tenant Aktif</div>
      </button>

      <!-- Hampir Expired -->
      <button
        @click="statusFilter = 'EXPIRING_SOON'"
        class="group relative overflow-hidden bg-base-100 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md text-left"
        :class="statusFilter === 'EXPIRING_SOON' ? 'border-amber-400/40 shadow-md ring-2 ring-amber-500/20' : 'border-base-content/10'"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="p-2.5 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/15 transition-colors">
            <AlertTriangle class="w-5 h-5 text-amber-600" />
          </div>
          <span v-if="statusFilter === 'EXPIRING_SOON'" class="w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-1.5"></span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-amber-600">{{ stats.expiringSoon }}</div>
        <div class="text-[11px] text-base-content/50 font-semibold mt-0.5">Hampir Expired</div>
      </button>

      <!-- Kadaluarsa -->
      <button
        @click="statusFilter = 'EXPIRED'"
        class="group relative overflow-hidden bg-base-100 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md text-left"
        :class="statusFilter === 'EXPIRED' ? 'border-rose-400/40 shadow-md ring-2 ring-rose-500/20' : 'border-base-content/10'"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="p-2.5 bg-rose-500/10 rounded-xl group-hover:bg-rose-500/15 transition-colors">
            <ShieldAlert class="w-5 h-5 text-rose-600" />
          </div>
          <span v-if="statusFilter === 'EXPIRED'" class="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1.5"></span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-rose-600">{{ stats.expired }}</div>
        <div class="text-[11px] text-base-content/50 font-semibold mt-0.5">Kadaluarsa</div>
      </button>
    </div>

    <!-- =============== FILTER & SEARCH BAR =============== -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3 sm:p-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <!-- Search -->
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            type="text"
            placeholder="Cari tenant, slug, email..."
            class="input input-sm input-bordered w-full pl-10 rounded-xl text-xs bg-base-200/50 border-base-content/10 focus:bg-base-100 focus:border-primary/50 transition-all"
          />
        </div>

        <div class="flex items-center gap-2">
          <!-- Status Filter -->
          <select
            v-model="statusFilter"
            class="select select-sm select-bordered rounded-xl text-xs flex-1 sm:flex-none sm:w-44 border-base-content/10"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif (Normal)</option>
            <option value="EXPIRING_SOON">Hampir Expired</option>
            <option value="EXPIRED">Sudah Kadaluarsa</option>
            <option value="INACTIVE">Non-Aktif</option>
          </select>

          <!-- View Mode Toggle -->
          <div class="flex items-center gap-1 bg-base-200 rounded-xl p-1">
            <button
              @click="viewMode = 'grid'"
              :class="viewMode === 'grid' ? 'bg-base-100 shadow text-primary' : 'text-base-content/40 hover:text-base-content/70'"
              class="p-1.5 rounded-lg transition-all"
              title="Grid View"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button
              @click="viewMode = 'table'"
              :class="viewMode === 'table' ? 'bg-base-100 shadow text-primary' : 'text-base-content/40 hover:text-base-content/70'"
              class="p-1.5 rounded-lg transition-all"
              title="Table View"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
          </div>

          <!-- Refresh -->
          <button
            @click="loadTenants"
            class="btn btn-sm btn-square btn-ghost rounded-xl border border-base-content/10"
            title="Refresh Data"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>

      <!-- Active Filter Chip -->
      <div v-if="statusFilter !== 'ALL'" class="mt-2.5 flex items-center gap-2">
        <span class="text-[11px] text-base-content/50">Filter aktif:</span>
        <button
          @click="statusFilter = 'ALL'"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          {{ statusFilter === 'ACTIVE' ? 'Aktif' : statusFilter === 'EXPIRING_SOON' ? 'Hampir Expired' : statusFilter === 'EXPIRED' ? 'Kadaluarsa' : 'Non-Aktif' }}
          <XCircle class="w-3 h-3" />
        </button>
        <span class="text-[11px] text-base-content/40">{{ filteredTenants.length }} hasil</span>
      </div>
    </div>

    <!-- =============== LOADING STATE =============== -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="bg-base-100 rounded-2xl border border-base-content/10 p-5 space-y-3 animate-pulse">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-base-200 rounded-xl"></div>
            <div class="space-y-1.5">
              <div class="h-3.5 bg-base-200 rounded w-28"></div>
              <div class="h-2.5 bg-base-200 rounded w-20"></div>
            </div>
          </div>
          <div class="h-5 w-14 bg-base-200 rounded-full"></div>
        </div>
        <div class="space-y-1.5 pt-1">
          <div class="h-2.5 bg-base-200 rounded w-full"></div>
          <div class="h-2.5 bg-base-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <!-- =============== EMPTY STATE =============== -->
    <div
      v-else-if="filteredTenants.length === 0"
      class="bg-base-100 border border-base-content/10 rounded-2xl p-12 text-center"
    >
      <div class="w-16 h-16 bg-base-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Building2 class="w-8 h-8 text-base-content/30" />
      </div>
      <h3 class="font-bold text-base-content text-sm mb-1">Tidak ada tenant ditemukan</h3>
      <p class="text-xs text-base-content/50">Coba ubah filter atau kata kunci pencarian Anda</p>
      <button @click="statusFilter = 'ALL'; searchQuery = ''; loadTenants()" class="btn btn-sm btn-ghost mt-4 rounded-xl text-xs">
        Reset Filter
      </button>
    </div>

    <!-- =============== GRID VIEW =============== -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="tenant in filteredTenants"
        :key="tenant.id"
        class="group relative bg-base-100 rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        :class="[
          'bg-gradient-to-br',
          getCardGradient(tenant)
        ]"
      >
        <!-- Card Header -->
        <div class="p-4 sm:p-5">
          <div class="flex items-start justify-between gap-2">
            <!-- Left: Tenant Info -->
            <div class="flex items-center gap-3 min-w-0">
              <!-- Avatar -->
              <div
                class="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm"
                :class="tenant.isMaster ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : 'bg-gradient-to-br from-slate-400/30 to-slate-500/20 text-base-content'"
              >
                <Crown v-if="tenant.isMaster" class="w-5 h-5 text-amber-300" />
                <span v-else class="font-black text-xs uppercase">{{ tenant.name.substring(0, 2) }}</span>
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="font-bold text-sm text-base-content truncate">{{ tenant.name }}</h3>
                  <span v-if="tenant.isMaster" class="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 border border-purple-400/20">
                    <Crown class="w-2.5 h-2.5" /> Master
                  </span>
                </div>
                <div class="flex items-center gap-1 text-[11px] text-base-content/50 font-mono mt-0.5">
                  <Hash class="w-2.5 h-2.5" />
                  <span class="truncate">{{ tenant.slug }}</span>
                </div>
              </div>
            </div>

            <!-- Right: Actions Dropdown -->
            <div class="relative shrink-0" @click.stop>
              <button
                @click="toggleDropdown(tenant.id)"
                class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-base-200 text-base-content/50 hover:text-base-content transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical class="w-4 h-4" />
              </button>

              <!-- Dropdown Menu -->
              <div
                v-if="activeDropdownId === tenant.id"
                class="absolute right-0 top-9 w-48 bg-base-100 rounded-xl shadow-xl border border-base-content/10 p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  @click="openEditModal(tenant)"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-base-200 text-base-content transition-colors"
                >
                  <Pencil class="w-3.5 h-3.5 text-purple-600" />
                  Edit Masa Aktif
                </button>
                <button
                  v-if="!tenant.isMaster"
                  @click="openCloneModal(tenant)"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-base-200 text-base-content transition-colors"
                >
                  <Copy class="w-3.5 h-3.5 text-indigo-600" />
                  Duplikasi Config
                </button>
              </div>
            </div>
          </div>

          <!-- Email -->
          <div v-if="tenant.email" class="flex items-center gap-1.5 mt-3 text-[11px] text-base-content/50">
            <Mail class="w-3 h-3 shrink-0" />
            <span class="truncate">{{ tenant.email }}</span>
          </div>

          <!-- Status Badge -->
          <div class="flex items-center gap-2 mt-3">
            <!-- Active Status -->
            <span
              class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              :class="tenant.isActive
                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-400/20'
                : 'bg-rose-500/10 text-rose-700 border border-rose-400/20'"
            >
              <CheckCircle2 v-if="tenant.isActive" class="w-2.5 h-2.5" />
              <XCircle v-else class="w-2.5 h-2.5" />
              {{ tenant.isActive ? 'Aktif' : 'Non-Aktif' }}
            </span>

            <!-- Tipe Tenant -->
            <span
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              :class="tenant.isMaster
                ? 'bg-purple-500/10 text-purple-700 border border-purple-400/20'
                : 'bg-base-200 text-base-content/60 border border-base-content/10'"
            >
              <Crown v-if="tenant.isMaster" class="w-2.5 h-2.5" />
              <Layers v-else class="w-2.5 h-2.5" />
              {{ tenant.isMaster ? 'Pusat' : 'Tenant Anak' }}
            </span>
          </div>
        </div>

        <!-- Card Footer: Expired Info -->
        <div class="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
          <div class="flex items-center justify-between pt-3 border-t border-base-content/5">
            <!-- Expired Date -->
            <div class="text-[11px] text-base-content/50">
              <div class="font-medium text-base-content/70 mb-0.5">Expired Date</div>
              <div class="flex items-center gap-1 font-mono">
                <Calendar class="w-3 h-3 shrink-0" />
                <span>{{ formatDate(tenant.expiredAt) }}</span>
              </div>
            </div>

            <!-- Days Remaining Badge -->
            <div>
              <template v-if="getDaysRemaining(tenant.expiredAt) !== null">
                <span
                  v-if="(getDaysRemaining(tenant.expiredAt) ?? 0) < 0"
                  class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-rose-500 text-white shadow-sm"
                >
                  <Clock class="w-3 h-3" />
                  Kadaluarsa
                </span>
                <span
                  v-else-if="(getDaysRemaining(tenant.expiredAt) ?? 0) <= 7"
                  class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-500 text-white shadow-sm animate-pulse"
                >
                  <AlertTriangle class="w-3 h-3" />
                  {{ getDaysRemaining(tenant.expiredAt) }}h lagi
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-400/20"
                >
                  <CheckCircle2 class="w-3 h-3" />
                  {{ getDaysRemaining(tenant.expiredAt) }}h lagi
                </span>
              </template>
              <template v-else>
                <span class="text-[11px] text-base-content/40 italic">Tanpa Batas</span>
              </template>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center gap-2 mt-3">
            <button
              @click="openEditModal(tenant)"
              class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-base-200/80 hover:bg-purple-600 hover:text-white text-xs font-semibold transition-all duration-200 text-base-content/70"
            >
              <Pencil class="w-3 h-3" />
              <span>Edit</span>
            </button>

            <button
              v-if="!tenant.isMaster"
              @click="openCloneModal(tenant)"
              class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-semibold transition-all duration-200"
              title="Duplikasi Konfigurasi"
            >
              <Copy class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =============== TABLE VIEW =============== -->
    <div v-else class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table w-full text-left border-collapse">
          <thead>
            <tr class="bg-base-200/60 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
              <th class="py-3.5 px-4">Klinik / Tenant</th>
              <th class="py-3.5 px-4 hidden sm:table-cell">Tipe</th>
              <th class="py-3.5 px-4">Status</th>
              <th class="py-3.5 px-4 hidden md:table-cell">Expired Date</th>
              <th class="py-3.5 px-4 hidden lg:table-cell">Sisa Hari</th>
              <th class="py-3.5 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-base-content/5 text-xs">
            <tr
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              class="hover:bg-base-200/30 transition-colors"
            >
              <!-- Info Tenant -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                    :class="tenant.isMaster ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : 'bg-base-200 text-base-content/60'"
                  >
                    <Crown v-if="tenant.isMaster" class="w-3.5 h-3.5 text-amber-300" />
                    <span v-else class="uppercase">{{ tenant.name.substring(0, 2) }}</span>
                  </div>
                  <div>
                    <div class="font-bold text-sm text-base-content flex items-center gap-1.5 flex-wrap">
                      <span>{{ tenant.name }}</span>
                      <span v-if="tenant.isMaster" class="badge badge-xs badge-secondary font-bold">Master</span>
                    </div>
                    <div class="text-[11px] text-base-content/50 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{{ tenant.slug }}</span>
                      <span v-if="tenant.email" class="hidden sm:inline">&bull; {{ tenant.email }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Tipe Context -->
              <td class="py-3.5 px-4 hidden sm:table-cell">
                <span v-if="tenant.isMaster" class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-300/30">
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
              <td class="py-3.5 px-4 font-mono font-medium hidden md:table-cell">
                <div class="flex items-center gap-1.5">
                  <Calendar class="w-3.5 h-3.5 text-base-content/40" />
                  <span>{{ formatDate(tenant.expiredAt) }}</span>
                </div>
              </td>

              <!-- Sisa Hari -->
              <td class="py-3.5 px-4 hidden lg:table-cell">
                <template v-if="getDaysRemaining(tenant.expiredAt) !== null">
                  <span v-if="(getDaysRemaining(tenant.expiredAt) ?? 0) < 0" class="badge badge-sm badge-error font-bold text-white">
                    Kadaluarsa
                  </span>
                  <span v-else-if="(getDaysRemaining(tenant.expiredAt) ?? 0) <= 7" class="badge badge-sm badge-warning font-bold text-amber-950">
                    Sisa {{ getDaysRemaining(tenant.expiredAt) }} Hari
                  </span>
                  <span v-else class="badge badge-sm bg-emerald-500/10 text-emerald-700 border-emerald-300 font-semibold">
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
                    <span class="hidden sm:inline">Edit</span>
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

      <!-- Table Footer -->
      <div class="px-4 py-3 border-t border-base-content/5 flex items-center justify-between text-[11px] text-base-content/40 bg-base-200/20">
        <span>Menampilkan {{ filteredTenants.length }} dari {{ tenantMasterStore.tenants.length }} tenant</span>
        <span>Terakhir diperbarui: {{ new Date().toLocaleTimeString('id-ID') }}</span>
      </div>
    </div>

    <!-- =============== MODAL EDIT EXPIRED & DETAIL TENANT =============== -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showEditModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9998] animate-in fade-in duration-200"
          @click.self="showEditModal = false"
        >
          <div class="bg-base-100 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-base-content/10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <!-- Modal Header -->
            <div class="px-5 py-4 border-b border-base-content/10 bg-gradient-to-r from-purple-600/10 to-indigo-600/5 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <Pencil class="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 class="font-bold text-sm text-base-content">Edit Masa Berlangganan</h3>
                  <p class="text-[11px] text-base-content/50 truncate max-w-[200px]">{{ editingTenantName }}</p>
                </div>
              </div>
              <button @click="showEditModal = false" class="btn btn-xs btn-circle btn-ghost">✕</button>
            </div>

            <!-- Modal Body -->
            <form @submit.prevent="handleSaveEdit" class="p-5 space-y-4">
              <!-- Expired Date Picker -->
              <div class="space-y-1.5 bg-purple-500/5 p-3.5 rounded-xl border border-purple-400/20">
                <label class="font-bold text-xs text-base-content flex items-center gap-1.5">
                  <Calendar class="w-3.5 h-3.5 text-purple-600" />
                  Tanggal &amp; Jam Kadaluarsa (Expired Date)
                </label>
                <DateTimePicker
                  v-model="editForm.expiredAtISO"
                  :withTime="true"
                  placeholder="Pilih Tanggal & Jam Kadaluarsa..."
                />
              </div>

              <!-- Nama Tenant -->
              <div class="space-y-1.5">
                <label class="font-semibold text-xs text-base-content/70">Nama Tenant / Klinik</label>
                <input
                  v-model="editForm.name"
                  type="text"
                  required
                  class="input input-sm input-bordered w-full rounded-xl"
                />
              </div>

              <!-- Email -->
              <div class="space-y-1.5">
                <label class="font-semibold text-xs text-base-content/70">Email Penanggung Jawab</label>
                <input
                  v-model="editForm.email"
                  type="email"
                  placeholder="email@klinik.com"
                  class="input input-sm input-bordered w-full rounded-xl"
                />
              </div>

              <!-- Toggle Status -->
              <div class="flex items-center justify-between p-3.5 rounded-xl bg-base-200/50 border border-base-content/10">
                <div>
                  <div class="font-semibold text-sm text-base-content">Status Keaktifan Tenant</div>
                  <div class="text-[11px] text-base-content/50 mt-0.5">Jika non-aktif, user tenant ini tidak dapat login</div>
                </div>
                <input
                  v-model="editForm.isActive"
                  type="checkbox"
                  class="toggle toggle-sm toggle-success"
                />
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 pt-1">
                <button type="button" @click="showEditModal = false" class="btn btn-sm btn-ghost flex-1 rounded-xl">
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="submitLoading"
                  class="btn btn-sm flex-[2] rounded-xl bg-purple-600 hover:bg-purple-700 text-white border-none gap-2"
                >
                  <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- =============== MODAL REGISTRASI TENANT BARU =============== -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showRegisterModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9998] animate-in fade-in duration-200"
          @click.self="showRegisterModal = false"
        >
          <div class="bg-base-100 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-base-content/10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <!-- Modal Header -->
            <div class="px-5 py-4 border-b border-base-content/10 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <Plus class="w-5 h-5 text-white" />
                <div>
                  <h3 class="font-bold text-sm text-white">Registrasi Tenant Baru</h3>
                  <p class="text-[11px] text-purple-100">Daftarkan klinik atau tenant baru ke sistem</p>
                </div>
              </div>
              <button @click="showRegisterModal = false" class="btn btn-xs btn-circle btn-ghost text-white hover:bg-white/20">✕</button>
            </div>

            <!-- Modal Body -->
            <form @submit.prevent="handleRegister" class="p-5 space-y-4">
              <div class="space-y-1.5">
                <label class="font-semibold text-xs text-base-content/70">Nama Tenant / Klinik <span class="text-error">*</span></label>
                <input
                  v-model="registerForm.name"
                  @input="autoSlug"
                  type="text"
                  placeholder="Contoh: Klinik Pratama Sehat"
                  required
                  class="input input-sm input-bordered w-full rounded-xl"
                />
              </div>

              <div class="space-y-1.5">
                <label class="font-semibold text-xs text-base-content/70">Slug Identifikasi <span class="text-error">*</span></label>
                <input
                  v-model="registerForm.slug"
                  type="text"
                  placeholder="klinik-pratama-sehat"
                  required
                  class="input input-sm input-bordered w-full rounded-xl font-mono"
                />
                <p class="text-[11px] text-base-content/40">Digunakan sebagai URL unik tenant (auto-generate dari nama)</p>
              </div>

              <div class="space-y-1.5">
                <label class="font-semibold text-xs text-base-content/70">Email Admin</label>
                <input
                  v-model="registerForm.email"
                  type="email"
                  placeholder="admin@kliniksehat.com"
                  class="input input-sm input-bordered w-full rounded-xl"
                />
              </div>

              <div class="p-3 rounded-xl bg-blue-500/5 border border-blue-400/20 flex items-start gap-2 text-[11px] text-blue-700">
                <Info class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Tenant baru akan mendapatkan masa trial <strong>14 hari</strong> sejak tanggal didaftarkan.</span>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button type="button" @click="showRegisterModal = false" class="btn btn-sm btn-ghost flex-1 rounded-xl">
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="registerLoading"
                  class="btn btn-sm flex-[2] rounded-xl bg-purple-600 hover:bg-purple-700 text-white border-none gap-2"
                >
                  <span v-if="registerLoading" class="loading loading-spinner loading-xs"></span>
                  <span>Daftarkan Tenant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- =============== MODAL CLONE CONFIG =============== -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showCloneModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9998] animate-in fade-in duration-200"
          @click.self="showCloneModal = false"
        >
          <div class="bg-base-100 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-base-content/10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <!-- Modal Header -->
            <div class="px-5 py-4 border-b border-base-content/10 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2.5">
                <Copy class="w-5 h-5 text-white" />
                <div>
                  <h3 class="font-bold text-sm text-white">Duplikasi Konfigurasi Tenant</h3>
                  <p class="text-[11px] text-indigo-100">Salin Menu, Role, dan Hak Akses ke Tenant Tujuan</p>
                </div>
              </div>
              <button @click="showCloneModal = false" class="btn btn-xs btn-circle btn-ghost text-white hover:bg-white/20">✕</button>
            </div>

            <!-- Modal Body (Scrollable) -->
            <div class="p-5 space-y-4 overflow-y-auto flex-1">
              <!-- Source Tenant -->
              <div class="space-y-1.5">
                <label class="font-semibold text-xs text-base-content/70">Tenant Asal Acuan (Source)</label>
                <select
                  v-model="cloneForm.sourceTenantId"
                  class="select select-sm select-bordered w-full rounded-xl text-xs"
                >
                  <option value="">👑 Master Tenant (Default Template Pusat)</option>
                  <option v-for="t in tenantMasterStore.tenants" :key="t.id" :value="t.id">
                    {{ t.name }} ({{ t.slug }})
                  </option>
                </select>
              </div>

              <!-- Target Tenant -->
              <div class="space-y-1.5">
                <label class="font-semibold text-xs text-base-content/70">Tenant Tujuan (Target) <span class="text-error">*</span></label>
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

              <!-- Elemen Duplikasi -->
              <div class="space-y-2.5 bg-base-200/50 p-4 rounded-2xl border border-base-content/10">
                <div class="font-bold text-[11px] uppercase tracking-wider text-base-content/50">Elemen yang Diduplikasi</div>

                <label class="flex items-center gap-2.5 cursor-pointer py-1">
                  <input v-model="cloneForm.includeMenus" type="checkbox" class="checkbox checkbox-xs checkbox-primary" />
                  <div>
                    <div class="font-semibold text-xs text-base-content">Struktur Menu Aplikasi</div>
                    <div class="text-[11px] text-base-content/50">Seluruh hierarki menu yang ada</div>
                  </div>
                </label>

                <label class="flex items-center gap-2.5 cursor-pointer py-1">
                  <input v-model="cloneForm.includeRoles" type="checkbox" class="checkbox checkbox-xs checkbox-primary" />
                  <div>
                    <div class="font-semibold text-xs text-base-content">Daftar Role Kustom</div>
                    <div class="text-[11px] text-base-content/50">Semua role yang telah didefinisikan</div>
                  </div>
                </label>

                <label class="flex items-center gap-2.5 cursor-pointer py-1">
                  <input v-model="cloneForm.includePermissions" type="checkbox" class="checkbox checkbox-xs checkbox-primary" />
                  <div>
                    <div class="font-semibold text-xs text-base-content">Permission Hak Akses Role</div>
                    <div class="text-[11px] text-base-content/50">Mapping permission per role</div>
                  </div>
                </label>

                <div class="border-t border-base-content/10 pt-2.5 mt-1">
                  <label class="flex items-center gap-2.5 cursor-pointer py-1">
                    <input v-model="cloneForm.createSuperAdminUser" type="checkbox" class="checkbox checkbox-xs checkbox-secondary" />
                    <div>
                      <div class="font-extrabold text-xs text-purple-600">⚡ Buat Akun User Super Admin Otomatis</div>
                      <div class="text-[11px] text-base-content/50">User dengan hak akses penuh pada tenant tujuan</div>
                    </div>
                  </label>

                  <div v-if="cloneForm.createSuperAdminUser" class="mt-2.5 pl-6 space-y-1.5">
                    <label class="font-bold text-[11px] text-base-content/70">Password Custom <span class="text-base-content/40 font-normal">(opsional)</span></label>
                    <input
                      v-model="cloneForm.customPassword"
                      type="text"
                      placeholder="Default: Password123!"
                      class="input input-xs input-bordered w-full rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-5 py-4 border-t border-base-content/10 bg-base-200/30 flex items-center gap-2 shrink-0">
              <button @click="showCloneModal = false" class="btn btn-sm btn-ghost flex-1 rounded-xl">Batal</button>
              <button
                @click="handleCloneConfig"
                :disabled="cloneLoading || !cloneForm.targetTenantId"
                class="btn btn-sm flex-[2] rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-none font-bold shadow-md gap-2"
              >
                <span v-if="cloneLoading" class="loading loading-spinner loading-xs"></span>
                <span v-else>🚀 Jalankan Duplikasi</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

  </div>
</template>

<style scoped>
.animate-in {
  animation-duration: 200ms;
  animation-fill-mode: both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoom-in-95 {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slide-in-from-bottom-4 {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in { animation-name: fade-in; }
.zoom-in-95 { animation-name: zoom-in-95; }
.slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }
</style>
