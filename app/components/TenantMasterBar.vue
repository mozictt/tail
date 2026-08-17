<template>
  <div
    v-if="(auth.isMasterTenant && auth.role === 'Super Admin') || masterStore.targetTenantId"
    class="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md border-b border-purple-500/20 backdrop-blur-sm relative z-40"
  >
    <!-- Left Indicator -->
    <div class="flex items-center gap-2.5">
      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 tracking-wider uppercase">
        👑 Master Tenant Mode
      </span>
      <div v-if="masterStore.targetTenantId" class="flex items-center gap-1.5 font-semibold text-emerald-300">
        <span>Menargetkan Tenant:</span>
        <span class="bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200 font-bold border border-emerald-400/30">
          {{ masterStore.targetTenantName || masterStore.targetTenantId }}
        </span>
      </div>
      <div v-else class="text-slate-300">
        <span>Konteks Mode:</span> <strong class="text-white">Tenant Utama (Pusat)</strong>
      </div>
    </div>

    <!-- Right Actions -->
    <div class="flex items-center gap-2">
      <!-- Clone Config Button -->
      <button
        @click="openCloneModal"
        class="btn btn-xs bg-indigo-600/80 hover:bg-indigo-600 border-none text-white gap-1.5 rounded-lg font-bold"
        title="Duplikasi Menu, Role, dan Permission ke Tenant Baru"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        <span>Duplikasi Config</span>
      </button>

      <!-- Tenant Selector Dropdown -->
      <div class="relative">
        <button
          @click="toggleDropdown"
          class="btn btn-xs bg-purple-600/80 hover:bg-purple-600 border-none text-white gap-1.5 rounded-lg font-bold"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
          </svg>
          <span>{{ masterStore.targetTenantId ? 'Ganti Target Tenant' : 'Pilih Target Tenant' }}</span>
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="showDropdown"
          class="absolute right-0 mt-2 w-72 bg-base-100 text-base-content rounded-2xl shadow-2xl border border-base-content/10 p-3 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div class="font-bold text-[11px] uppercase tracking-wider text-base-content/50 px-1">
            Pilih Tenant yang Dikelola
          </div>

          <div class="relative">
            <input
              v-model="searchQuery"
              @input="onSearch"
              type="text"
              placeholder="Cari tenant..."
              class="input input-xs input-bordered w-full rounded-xl text-xs"
            />
          </div>

          <div class="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
            <!-- Reset Option -->
            <button
              @click="selectTenant(null)"
              class="w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between hover:bg-base-200 transition-colors"
              :class="{ 'bg-purple-500/10 font-bold text-purple-600': !masterStore.targetTenantId }"
            >
              <span>🏠 Kembali ke Tenant Utama</span>
              <span v-if="!masterStore.targetTenantId" class="text-purple-600">✓</span>
            </button>

            <div v-if="masterStore.loading" class="text-center py-3 text-xs text-base-content/40">
              Memuat daftar tenant...
            </div>

            <div v-else-if="masterStore.tenants.length === 0" class="text-center py-3 text-xs text-base-content/40 italic">
              Tenant tidak ditemukan.
            </div>

            <!-- List Tenants -->
            <button
              v-for="t in masterStore.tenants"
              :key="t.id"
              @click="selectTenant(t)"
              class="w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between hover:bg-base-200 transition-colors"
              :class="{ 'bg-emerald-500/10 font-bold text-emerald-600': masterStore.targetTenantId === t.id }"
            >
              <div class="truncate">
                <div class="font-semibold">{{ t.name }}</div>
                <div class="text-[10px] text-base-content/50 font-mono">{{ t.slug }}</div>
              </div>
              <span v-if="t.isMaster" class="badge badge-xs badge-secondary">Master</span>
              <span v-else-if="masterStore.targetTenantId === t.id" class="text-emerald-600 font-bold">✓</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Clear Target Button -->
      <button
        v-if="masterStore.targetTenantId"
        @click="clearTarget"
        class="btn btn-xs btn-ghost text-red-300 hover:text-white hover:bg-red-500/30 gap-1 rounded-lg"
        title="Reset target tenant kembali ke Master Tenant"
      >
        <span>Reset Target</span>
      </button>
    </div>

    <!-- Modal Duplikasi Config Tenant -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showCloneModal"
          class="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200"
          @click.self="showCloneModal = false"
        >
          <div class="bg-base-100 text-base-content rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-base-content/10 overflow-hidden my-auto">
            <!-- Header Modal (Fixed Top) -->
            <div class="p-4 sm:p-5 border-b border-base-content/10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">📋</span>
                <div>
                  <h3 class="font-bold text-sm">Duplikasi Konfigurasi Tenant</h3>
                  <p class="text-[11px] text-purple-100 opacity-80">Salin Menu, Role, dan Hak Akses ke Tenant Tujuan</p>
                </div>
              </div>
              <button @click="showCloneModal = false" class="btn btn-xs btn-circle btn-ghost text-white hover:bg-white/20">✕</button>
            </div>

            <!-- Body Form Modal (Scrollable Content) -->
            <div class="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              <!-- Asal Tenant (Source) -->
              <div class="form-control">
                <label class="label font-bold text-xs">Tenant Asal (Source Template)</label>
                <select v-model="cloneForm.sourceTenantId" class="select select-sm select-bordered w-full rounded-xl text-xs">
                  <option value="">👑 Master Tenant (Default Template Pusat)</option>
                  <option v-for="t in masterStore.tenants" :key="t.id" :value="t.id">
                    {{ t.name }} ({{ t.slug }})
                  </option>
                </select>
                <span class="text-[10px] text-base-content/50 mt-1">Pilih tenant yang struktur menu & role-nya akan dijadikan acuan.</span>
              </div>

              <!-- Target Tenant -->
              <div class="form-control">
                <label class="label font-bold text-xs">Tenant Tujuan (Target Tenant) <span class="text-red-500">*</span></label>
                <select v-model="cloneForm.targetTenantId" class="select select-sm select-bordered w-full rounded-xl text-xs">
                  <option value="" disabled>-- Pilih Tenant Tujuan --</option>
                  <option v-for="t in targetTenants" :key="t.id" :value="t.id">
                    {{ t.name }} ({{ t.slug }})
                  </option>
                </select>
              </div>

              <!-- Checkbox Options -->
              <div class="bg-base-200/50 p-3.5 rounded-2xl space-y-2.5 border border-base-content/5">
                <div class="font-bold text-[11px] uppercase tracking-wider text-base-content/60 mb-1">Elemen yang Diduplikasi</div>
                
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="cloneForm.includeMenus" type="checkbox" class="checkbox checkbox-xs checkbox-primary rounded" />
                  <span class="font-semibold">Duplikasi Struktur Menu</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="cloneForm.includeRoles" type="checkbox" class="checkbox checkbox-xs checkbox-primary rounded" />
                  <span class="font-semibold">Duplikasi Daftar Role (Semua Role)</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="cloneForm.includePermissions" type="checkbox" class="checkbox checkbox-xs checkbox-primary rounded" />
                  <span class="font-semibold">Duplikasi Hak Akses (Permissions)</span>
                </label>
              </div>
            </div>

            <!-- Footer Actions (Fixed Bottom) -->
            <div class="p-4 bg-base-200/40 border-t border-base-content/10 flex items-center justify-end gap-2 shrink-0">
              <button @click="showCloneModal = false" class="btn btn-sm btn-ghost rounded-xl">Batal</button>
              <button
                @click="submitCloneConfig"
                :disabled="cloningLoading || !cloneForm.targetTenantId"
                class="btn btn-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md"
              >
                <span v-if="cloningLoading" class="loading loading-spinner loading-xs"></span>
                <span v-else>🚀 Mulai Duplikasi</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useTenantMasterStore, type TenantItem } from "@/stores/tenantMaster";
import Swal from "sweetalert2";

const auth = useAuthStore();
const masterStore = useTenantMasterStore();

const targetTenants = computed(() => {
  return masterStore.tenants.filter((t) => !t.isMaster && !(t as any).is_master);
});

const showDropdown = ref(false);
const searchQuery = ref("");
let searchTimer: any = null;

const showCloneModal = ref(false);
const cloningLoading = ref(false);

const cloneForm = reactive({
  sourceTenantId: "",
  targetTenantId: "",
  includeMenus: true,
  includeRoles: true,
  includePermissions: true,
});

const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value && masterStore.tenants.length === 0) {
    await masterStore.fetchTenants();
  }
};

const openCloneModal = async () => {
  if (masterStore.tenants.length === 0) {
    await masterStore.fetchTenants();
  }
  showCloneModal.value = true;
};

const submitCloneConfig = async () => {
  if (!cloneForm.targetTenantId) {
    Swal.fire({
      icon: "warning",
      title: "Target Tenant Wajib Dipilih",
      text: "Silakan pilih tenant tujuan yang akan menerima duplikasi konfigurasi.",
    });
    return;
  }

  try {
    cloningLoading.value = true;
    const res: any = await masterStore.cloneTenantConfig({
      sourceTenantId: cloneForm.sourceTenantId || undefined,
      targetTenantId: cloneForm.targetTenantId,
      includeMenus: cloneForm.includeMenus,
      includeRoles: cloneForm.includeRoles,
      includePermissions: cloneForm.includePermissions,
    });

    showCloneModal.value = false;
    const resultData = res?.data || res;
    const summary = resultData?.summary || {};

    Swal.fire({
      icon: "success",
      title: "Duplikasi Konfigurasi Berhasil!",
      html: `
        <div class="text-left text-xs space-y-1.5">
          <p>${resultData?.message || 'Konfigurasi berhasil disalin.'}</p>
          <div class="bg-base-200 p-2.5 rounded-xl font-mono text-[11px] space-y-1">
            <div>• Menu Diduplikasi: <b>${summary?.clonedMenusCount ?? 0}</b></div>
            <div>• Role Diduplikasi: <b>${summary?.clonedRolesCount ?? 0}</b></div>
            <div>• Hak Akses (Permissions): <b>${summary?.clonedPermissionsCount ?? 0}</b></div>
          </div>
        </div>
      `,
      confirmButtonText: "OK",
    });
  } catch (err: any) {
    console.error("Gagal menduplikasi konfigurasi tenant:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal Duplikasi Config",
      text: err?.data?.message || err?.message || "Terjadi kesalahan saat menduplikasi konfigurasi.",
    });
  } finally {
    cloningLoading.value = false;
  }
};

const onSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    masterStore.fetchTenants(searchQuery.value);
  }, 300);
};

const route = useRoute();

const selectTenant = (tenant: TenantItem | null) => {
  masterStore.setTargetTenant(tenant);
  showDropdown.value = false;

  const currentPath = route.path;
  const currentSlug = (route.params.slug as string) || "";

  if (tenant && tenant.slug) {
    if (currentSlug && currentPath.includes(`/${currentSlug}`)) {
      const newPath = currentPath.replace(`/${currentSlug}`, `/${tenant.slug}`);
      window.location.href = newPath;
    } else {
      window.location.href = `/${tenant.slug}/dashboard`;
    }
  } else {
    const masterSlug = auth.slug || "pos";
    if (currentSlug && currentPath.includes(`/${currentSlug}`)) {
      const newPath = currentPath.replace(`/${currentSlug}`, `/${masterSlug}`);
      window.location.href = newPath;
    } else {
      window.location.href = `/${masterSlug}/dashboard`;
    }
  }
};

const clearTarget = () => {
  masterStore.clearTargetTenant();
  const currentPath = route.path;
  const currentSlug = (route.params.slug as string) || "";
  const masterSlug = auth.slug || "pos";

  if (currentSlug && currentPath.includes(`/${currentSlug}`)) {
    const newPath = currentPath.replace(`/${currentSlug}`, `/${masterSlug}`);
    window.location.href = newPath;
  } else {
    window.location.href = `/${masterSlug}/dashboard`;
  }
};

onMounted(() => {
  if ((auth.isMasterTenant && auth.role === "Super Admin") || masterStore.targetTenantId) {
    masterStore.fetchTenants();
  }
});
</script>
