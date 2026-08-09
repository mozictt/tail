<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { RoleService, type Role, type RolePermission, type AccessLevel } from "@/services/role.service";
import { PermissionService } from "@/services/permission.service";
import Select2 from "@/components/ui/Select2.vue";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { 
  Shield, 
  ShieldCheck, 
  Key, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  Lock,
  Copy
} from "lucide-vue-next";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const roleService = RoleService();

/* =========================
   STATE LIST ROLE & PAGINATION
========================= */
const roles = ref<Role[]>([]);
const loading = ref(false);
const search = ref("");
const currentPage = ref(1);
const limit = ref(10);
const totalPages = ref(1);
const totalItems = ref(0);

/* =========================
   STATE MODAL ROLE (CREATE / EDIT)
========================= */
const showRoleModal = ref(false);
const isEdit = ref(false);
const selectedRoleId = ref<number | null>(null);
const submitLoading = ref(false);

const roleForm = ref<{ name: string; description: string }>({
  name: "",
  description: "",
});

const roleErrors = ref<{ name: string }>({
  name: "",
});

/* =========================
   STATE MODAL PERMISSION / HAK AKSES
========================= */
const showPermissionModal = ref(false);
const permissionLoading = ref(false);
const selectedRoleForPermission = ref<Role | null>(null);
const currentPermissions = ref<RolePermission[]>([]);

// State resource options dari API GET /permissions/resources?format=array
const permissionService = PermissionService();
const resourceOptions = ref<string[]>([]);
const resourceLoading = ref(false);

// Form input penambahan permission baru
const newPermission = ref<{ resource: string; accessLevel: AccessLevel }>({
  resource: "Barang",
  accessLevel: "view-akses",
});

/* =========================
   STATE COPY PERMISSIONS
========================= */
const showCopySection = ref(false);
const copySourceRoleId = ref<number | null>(null);
const copyMode = ref<'overwrite' | 'merge'>('overwrite');

const copyModeOptions = [
  { value: "overwrite", label: "Timpa Semua (Overwrite)" },
  { value: "merge", label: "Gabungkan (Merge)" },
];

const sourceRoleOptions = computed(() => {
  return roles.value.filter(r => r.id !== selectedRoleForPermission.value?.id);
});

const fetchResourceOptions = async () => {
  resourceLoading.value = true;
  try {
    const res = await permissionService.getResources('array');
    if (Array.isArray(res) && res.length > 0) {
      resourceOptions.value = res;
    } else {
      resourceOptions.value = [
        "Barang", "User", "Role", "Menu", "Album", "Gallery", "Tenant", "Dashboard"
      ];
    }
  } catch (err) {
    console.error("Gagal mengambil resource options:", err);
    resourceOptions.value = [
      "Barang", "User", "Role", "Menu", "Album", "Gallery", "Tenant", "Dashboard"
    ];
  } finally {
    resourceLoading.value = false;
  }
};

const accessLevelOptions: { value: AccessLevel; label: string; badgeClass: string; description: string }[] = [
  { value: "full-akses", label: "Full Akses", badgeClass: "bg-error/15 text-error border-error/30 font-extrabold", description: "Full Manage" },
  { value: "admin-akses", label: "Admin Akses", badgeClass: "bg-warning/15 text-amber-700 border-amber-300 font-extrabold", description: "CRUD Access" },
  { value: "change-akses", label: "Change Akses", badgeClass: "bg-info/15 text-info border-info/30 font-extrabold", description: "Create/Update" },
  { value: "view-akses", label: "View Akses", badgeClass: "bg-success/15 text-emerald-700 border-emerald-300 font-extrabold", description: "Read Only" },
];

/* =========================
   FETCH ROLES
========================= */
const fetchRoles = async () => {
  loading.value = true;
  try {
    const res: any = await roleService.getRoles({
      page: currentPage.value,
      limit: limit.value,
      search: search.value,
      sortBy: "id",
      sortType: "DESC",
    });

    // Menangani format standar backend NestJS: { success, statusCode, message, meta, data: [...] }
    const listData = res?.data || res;

    if (Array.isArray(listData)) {
      roles.value = listData;
      if (res?.meta) {
        totalItems.value = res.meta.totalItems || listData.length;
        totalPages.value = res.meta.totalPages || 1;
        currentPage.value = res.meta.currentPage || 1;
      } else {
        totalItems.value = listData.length;
        totalPages.value = 1;
      }
    } else if (listData && Array.isArray(listData.data)) {
      roles.value = listData.data;
      if (listData.meta) {
        totalItems.value = listData.meta.totalItems;
        totalPages.value = listData.meta.totalPages;
        currentPage.value = listData.meta.currentPage;
      }
    } else {
      roles.value = [];
    }
  } catch (err: any) {
    console.error("Gagal mengambil data role:", err);
    showToast("Gagal mengambil daftar role", "error");
    roles.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchRoles();
};

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchRoles();
  }
};

/* =========================
   CREATE & EDIT ROLE LOGIC
========================= */
const resetRoleForm = () => {
  roleForm.value = { name: "", description: "" };
  roleErrors.value = { name: "" };
  selectedRoleId.value = null;
  isEdit.value = false;
};

const openCreateModal = () => {
  resetRoleForm();
  showRoleModal.value = true;
};

const openEditModal = (role: Role) => {
  resetRoleForm();
  isEdit.value = true;
  selectedRoleId.value = role.id!;
  roleForm.value = {
    name: role.name,
    description: role.description || "",
  };
  showRoleModal.value = true;
};

const validateRoleForm = (): boolean => {
  let valid = true;
  roleErrors.value.name = "";

  if (!roleForm.value.name.trim()) {
    roleErrors.value.name = "Nama role wajib diisi";
    valid = false;
  } else if (roleForm.value.name.length < 3) {
    roleErrors.value.name = "Nama role minimal 3 karakter";
    valid = false;
  }

  return valid;
};

const submitRole = async () => {
  if (!validateRoleForm()) return;

  submitLoading.value = true;
  try {
    if (isEdit.value && selectedRoleId.value) {
      await roleService.updateRole(selectedRoleId.value, roleForm.value);
      showToast("Role berhasil diperbarui", "success");
    } else {
      await roleService.createRole(roleForm.value);
      showToast("Role baru berhasil dibuat", "success");
    }
    showRoleModal.value = false;
    resetRoleForm();
    fetchRoles();
  } catch (err: any) {
    console.error("Error submit role:", err);
    const msg = err?.data?.message || err?.message || "Gagal menyimpan data role";
    showToast(Array.isArray(msg) ? msg.join(", ") : msg, "error");
  } finally {
    submitLoading.value = false;
  }
};

/* =========================
   DELETE ROLE LOGIC
========================= */
const deleteRole = async (id: number, name: string) => {
  const result = await Swal.fire({
    title: `Hapus Role "${name}"?`,
    text: "Semua pengguna dengan role ini dan hak akses terkait akan terpengaruh.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus Role",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
    customClass: {
      popup: "rounded-3xl border border-base-content/10",
    },
  });

  if (!result.isConfirmed) return;

  try {
    await roleService.deleteRole(id);
    showToast(`Role "${name}" berhasil dihapus`, "success");
    fetchRoles();
  } catch (err: any) {
    console.error("Gagal menghapus role:", err);
    showToast("Gagal menghapus role", "error");
  }
};

/* =========================
   PERMISSION MANAGEMENT LOGIC
========================= */
const openPermissionModal = async (role: Role) => {
  selectedRoleForPermission.value = role;
  permissionLoading.value = true;
  showPermissionModal.value = true;
  currentPermissions.value = [];

  try {
    const res: any = await roleService.getRoleById(role.id!);
    const detailRole = res?.data || res;
    currentPermissions.value = detailRole.permissions || [];
  } catch (err) {
    console.error("Gagal mengambil detail permission:", err);
    showToast("Gagal mengambil daftar permission role", "error");
  } finally {
    permissionLoading.value = false;
  }
};

const handleAddPermission = async () => {
  if (!selectedRoleForPermission.value?.id) return;

  const targetResource = newPermission.value.resource ? newPermission.value.resource.trim() : "";

  if (!targetResource) {
    showToast("Nama resource wajib ditentukan", "error");
    return;
  }

  // Cek apakah resource sudah ada
  const exists = currentPermissions.value.some(
    p => p.resource.toLowerCase() === targetResource.toLowerCase()
  );

  if (exists) {
    showToast(`Permission untuk resource "${targetResource}" sudah ada`, "warning");
    return;
  }

  submitLoading.value = true;
  try {
    const updatedPermissions = [
      ...currentPermissions.value.map(p => ({ resource: p.resource, accessLevel: p.accessLevel })),
      { resource: targetResource, accessLevel: newPermission.value.accessLevel }
    ];

    const res: any = await roleService.updatePermissions({
      role_id: selectedRoleForPermission.value.id,
      permissions: updatedPermissions,
    });

    const resultRole = res?.data || res;
    currentPermissions.value = resultRole.permissions || [];
    showToast(`Hak akses untuk "${targetResource}" berhasil ditambahkan`, "success");
  } catch (err: any) {
    console.error("Gagal memperbarui permissions:", err);
    showToast("Gagal menambahkan hak akses", "error");
  } finally {
    submitLoading.value = false;
  }
};

const handleRemovePermission = async (perm: RolePermission) => {
  if (!selectedRoleForPermission.value?.id) return;

  const result = await Swal.fire({
    title: "Hapus Hak Akses?",
    text: `Apakah Anda yakin ingin menghapus hak akses resource "${perm.resource}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    customClass: {
      confirmButton: "btn btn-error rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (!result.isConfirmed) return;

  submitLoading.value = true;
  try {
    if (perm.id) {
      // Endpoint DELETE /permissions/:id
      await permissionService.deletePermissionById(perm.id);
    } else {
      // Fallback bulk update
      const filteredPermissions = currentPermissions.value
        .filter(p => p.resource !== perm.resource)
        .map(p => ({ resource: p.resource, accessLevel: p.accessLevel }));

      await roleService.updatePermissions({
        role_id: selectedRoleForPermission.value.id,
        permissions: filteredPermissions,
      });
    }

    currentPermissions.value = currentPermissions.value.filter(p => p.resource !== perm.resource);
    showToast(`Hak akses "${perm.resource}" berhasil dihapus`, "success");
    fetchRoles();
  } catch (err: any) {
    console.error("Gagal menghapus permission:", err);
    showToast("Gagal menghapus hak akses", "error");
  } finally {
    submitLoading.value = false;
  }
};

const handleUpdatePermissionLevel = async (perm: RolePermission, newLevel: AccessLevel) => {
  if (!selectedRoleForPermission.value?.id || perm.accessLevel === newLevel) return;

  submitLoading.value = true;
  try {
    if (perm.id) {
      // Endpoint PUT /permissions/:id
      await permissionService.updatePermissionById(perm.id, {
        accessLevel: newLevel,
      });
      perm.accessLevel = newLevel;
    } else {
      // Fallback bulk update
      const updatedPermissions = currentPermissions.value.map(p => ({
        resource: p.resource,
        accessLevel: p.resource === perm.resource ? newLevel : p.accessLevel,
      }));

      const res: any = await roleService.updatePermissions({
        role_id: selectedRoleForPermission.value.id,
        permissions: updatedPermissions,
      });
      const resultRole = res?.data || res;
      currentPermissions.value = resultRole.permissions || [];
    }

    showToast(`Tingkat akses "${perm.resource}" diperbarui ke ${getBadgeInfo(newLevel).label}`, "success");
    fetchRoles();
  } catch (err: any) {
    console.error("Gagal memperbarui permission:", err);
    showToast("Gagal memperbarui tingkat akses", "error");
  } finally {
    submitLoading.value = false;
  }
};

const handleCopyPermissions = async () => {
  if (!selectedRoleForPermission.value?.id || !copySourceRoleId.value) {
    showToast("Pilih role sumber terlebih dahulu", "warning");
    return;
  }

  const sourceRole = roles.value.find(r => r.id === copySourceRoleId.value);

  const confirmResult = await Swal.fire({
    title: "Salin Hak Akses?",
    text: `Apakah Anda yakin ingin menyalin seluruh hak akses dari role "${sourceRole?.name || 'Sumber'}" ke "${selectedRoleForPermission.value.name}" (${copyMode.value === 'overwrite' ? 'Mode Overwrite / Timpa' : 'Mode Merge / Gabung'})?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Salin Sekarang",
    cancelButtonText: "Batal",
    customClass: {
      confirmButton: "btn btn-primary rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (!confirmResult.isConfirmed) return;

  submitLoading.value = true;
  try {
    const res: any = await permissionService.copyPermissions({
      source_role_id: copySourceRoleId.value,
      target_role_id: selectedRoleForPermission.value.id,
      mode: copyMode.value,
    });

    const successMessage = res?.data?.message || (res?.message && res?.message !== "OK" ? res?.message : "") || `Berhasil menyalin hak akses dari role "${sourceRole?.name || 'sumber'}"`;
    showToast(successMessage, "success");

    // Refresh permission list lokal & table utama
    const detailRes: any = await roleService.getRoleById(selectedRoleForPermission.value.id);
    const detailRole = detailRes?.data || detailRes;
    currentPermissions.value = detailRole.permissions || [];
    
    fetchRoles();
    showCopySection.value = false;
  } catch (err: any) {
    console.error("Gagal menyalin permission:", err);
    showToast(err?.data?.message || err?.message || "Gagal menyalin hak akses", "error");
  } finally {
    submitLoading.value = false;
  }
};

const getBadgeInfo = (accessLevel: string) => {
  const found = accessLevelOptions.find(o => o.value === accessLevel);
  return {
    label: found ? found.label : accessLevel,
    badgeClass: found ? found.badgeClass : "bg-base-200 text-base-content border-base-content/10 font-bold"
  };
};

/* =========================
   INITIALIZATION
========================= */
onMounted(() => {
  fetchRoles();
  fetchResourceOptions();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Component -->
    <HeaderSearch 
      title="Manajemen Role & Hak Akses" 
      subtitle="Kelola role otorisasi pengguna dan atur hak akses spesifik per modul aplikasi" 
      :total="totalItems" 
      v-model:search="search"
      @search="handleSearch" 
      @add="openCreateModal" 
    />

    <!-- CONTAINER CARD -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-premium p-6 min-h-[450px]">
      
      <!-- SKELETON LOADER -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="h-44 bg-base-200 rounded-2xl animate-pulse"></div>
      </div>

      <!-- EMPTY STATE -->
      <div v-else-if="roles.length === 0" class="py-20 text-center">
        <div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
          <Shield class="w-10 h-10" />
        </div>
        <h3 class="font-bold text-base-content text-xl mb-1">Belum Ada Role</h3>
        <p class="text-base-content/60 text-sm max-w-md mx-auto mb-6">
          Tambahkan role baru untuk mengelompokkan otorisasi dan hak akses pengguna di aplikasi.
        </p>
        <button class="btn btn-primary rounded-xl px-6 shadow-md shadow-primary/25" @click="openCreateModal">
          <Plus class="w-4 h-4 mr-2" /> Tambah Role Pertama
        </button>
      </div>

      <!-- ROLE TABLE DISPLAY -->
      <div v-else class="space-y-6">
        <div class="overflow-x-auto">
          <table class="table w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr class="text-xs uppercase tracking-wider text-base-content/50 border-b border-base-content/5 pb-3">
                <th class="py-3 px-4">Role & ID</th>
                <th class="py-3 px-4">Deskripsi</th>
                <th class="py-3 px-4 text-center">Hak Akses</th>
                <th class="py-3 px-4">Tanggal Dibuat</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="role in roles" 
                :key="role.id" 
                class="bg-base-200/40 hover:bg-base-200/80 transition-all rounded-2xl group border border-base-content/5"
              >
                <!-- Role Name & ID -->
                <td class="py-4 px-4 rounded-l-2xl">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner shrink-0">
                      <ShieldCheck class="w-5 h-5" />
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-base-content text-base">{{ role.name }}</span>
                        <span class="badge badge-neutral text-[10px] font-semibold">ID: {{ role.id }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Description -->
                <td class="py-4 px-4 max-w-xs">
                  <p class="text-xs text-base-content/70 truncate">
                    {{ role.description || 'Tidak ada deskripsi penjelas.' }}
                  </p>
                </td>

                <!-- Permissions Count -->
                <td class="py-4 px-4 text-center">
                  <span class="badge badge-primary badge-outline text-xs font-semibold px-2.5 py-1 rounded-lg">
                    {{ role.permissions ? role.permissions.length : 0 }} Modul Resource
                  </span>
                </td>

                <!-- Date -->
                <td class="py-4 px-4 text-xs text-base-content/60 font-medium">
                  <div class="flex items-center gap-1.5">
                    <Calendar class="w-3.5 h-3.5 text-base-content/40" />
                    <span>{{ role.createdAt ? new Date(role.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' }}</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="py-4 px-4 text-right rounded-r-2xl">
                  <div class="flex items-center justify-end gap-2">
                    <button 
                      class="btn btn-sm btn-outline btn-primary rounded-xl font-bold px-3 hover:shadow-md transition-all flex items-center gap-1.5"
                      @click="openPermissionModal(role)"
                    >
                      <Key class="w-3.5 h-3.5" />
                      <span>Atur Hak Akses</span>
                    </button>

                    <button 
                      class="w-8 h-8 rounded-lg bg-base-100 border border-base-content/10 text-base-content/70 hover:bg-info hover:text-white transition flex items-center justify-center shadow-xs" 
                      @click="openEditModal(role)" 
                      title="Edit Role"
                    >
                      <Pencil class="w-4 h-4" />
                    </button>

                    <button 
                      class="w-8 h-8 rounded-lg bg-base-100 border border-base-content/10 text-base-content/70 hover:bg-error hover:text-white transition flex items-center justify-center shadow-xs" 
                      @click="deleteRole(role.id!, role.name)" 
                      title="Hapus Role"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINATION CONTROLS -->
        <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-base-content/10">
          <p class="text-xs text-base-content/60 font-medium">
            Menampilkan Halaman <span class="font-bold text-base-content">{{ currentPage }}</span> dari <span class="font-bold text-base-content">{{ totalPages }}</span> (Total {{ totalItems }} Role)
          </p>

          <div class="join">
            <button 
              class="join-item btn btn-sm rounded-l-xl" 
              :disabled="currentPage === 1" 
              @click="changePage(currentPage - 1)"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button 
              v-for="p in totalPages" 
              :key="p" 
              class="join-item btn btn-sm"
              :class="{'btn-primary': p === currentPage}"
              @click="changePage(p)"
            >
              {{ p }}
            </button>
            <button 
              class="join-item btn btn-sm rounded-r-xl" 
              :disabled="currentPage === totalPages" 
              @click="changePage(currentPage + 1)"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- ======================================================== -->
    <!-- MODAL CREATE / EDIT ROLE -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showRoleModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showRoleModal = false)">
        <div class="modal-box max-w-lg bg-base-100 rounded-3xl border border-base-content/10 p-7 shadow-2xl relative text-base-content">
          <button 
            class="absolute top-5 right-5 text-base-content/40 hover:text-error transition" 
            @click="showRoleModal = false"
            :disabled="submitLoading"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 class="font-extrabold text-base-content text-xl tracking-tight mb-6 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield class="w-5 h-5" />
            </div>
            {{ isEdit ? "Edit Data Role" : "Buat Role Baru" }}
          </h3>

          <div class="space-y-4">
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Nama Role <span class="text-error">*</span>
              </label>
              <input 
                v-model="roleForm.name" 
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium" 
                :class="{'border-error': roleErrors.name}" 
                placeholder="Contoh: Manager Operasional" 
              />
              <span v-if="roleErrors.name" class="text-xs text-error font-semibold mt-1 block">
                {{ roleErrors.name }}
              </span>
            </div>

            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Deskripsi <span class="text-base-content/40 font-normal normal-case">(opsional)</span>
              </label>
              <textarea 
                v-model="roleForm.description" 
                class="textarea textarea-bordered w-full rounded-2xl p-3 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all h-28 bg-base-100 resize-none font-medium text-sm leading-relaxed" 
                placeholder="Penjelasan fungsi dan tanggung jawab role ini..." 
              />
            </div>
          </div>

          <div class="modal-action gap-3 mt-6">
            <button class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6" @click="showRoleModal = false" :disabled="submitLoading">
              Batal
            </button>
            <button class="btn btn-primary rounded-2xl font-bold px-7 shadow-lg shadow-primary/30 flex items-center gap-2" @click="submitRole" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              {{ isEdit ? "Simpan Perubahan" : "Buat Role" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODAL ATUR HAK AKSES (PERMISSIONS) -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showPermissionModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showPermissionModal = false)">
        <div class="modal-box max-w-3xl max-h-[85vh] flex flex-col bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content overflow-visible">
          <button 
            class="absolute top-5 right-5 text-base-content/40 hover:text-error transition" 
            @click="showPermissionModal = false"
            :disabled="submitLoading"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Modal Title + Action Copy Toggle -->
          <div class="mb-6 border-b border-base-content/10 pb-4 flex items-center justify-between pr-8">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Key class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-extrabold text-base-content text-xl tracking-tight">
                  Pengaturan Hak Akses Role
                </h3>
                <p class="text-xs font-semibold text-primary">
                  Role: {{ selectedRoleForPermission?.name }}
                </p>
              </div>
            </div>

            <!-- Tombol Toggle Section Copy -->
            <button 
              class="btn btn-outline btn-primary btn-xs rounded-xl font-bold gap-1.5 px-3.5 h-8 flex items-center"
              @click="showCopySection = !showCopySection"
              title="Salin hak akses dari role lain"
            >
              <Copy class="w-3.5 h-3.5 shrink-0" />
              <span class="hidden sm:inline">{{ showCopySection ? 'Tutup Salin' : 'Salin dari Role Lain' }}</span>
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="permissionLoading" class="py-12 text-center space-y-3">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="text-sm font-medium text-base-content/60">Mengambil hak akses role...</p>
          </div>

          <div v-else class="space-y-6 flex-1 overflow-y-auto pr-1">
            <!-- SECTION COPY PERMISSION (REST API POST /permissions/copy) -->
            <div v-if="showCopySection" class="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Copy class="w-4 h-4" />
                  Salin Seluruh Hak Akses dari Role Lain
                </h4>
                <button class="text-xs font-bold text-base-content/50 hover:text-error" @click="showCopySection = false">Tutup</button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <!-- Select Source Role -->
                <div class="md:col-span-5">
                  <label class="block text-[11px] font-bold text-base-content/70 mb-1">Role Sumber (Source Role)</label>
                  <Select2
                    v-model="copySourceRoleId"
                    :options="sourceRoleOptions"
                    label-key="name"
                    value-key="id"
                    placeholder="Pilih role sumber..."
                    :clearable="false"
                  />
                </div>

                <!-- Select Copy Mode (Select2) -->
                <div class="md:col-span-4">
                  <label class="block text-[11px] font-bold text-base-content/70 mb-1.5">Mode Salin</label>
                  <Select2
                    v-model="copyMode"
                    :options="copyModeOptions"
                    label-key="label"
                    value-key="value"
                    placeholder="Pilih mode..."
                    :clearable="false"
                  />
                </div>

                <!-- Submit Button Copy Modern -->
                <div class="md:col-span-3">
                  <button 
                    class="w-full h-[42px] rounded-xl bg-primary hover:bg-primary-focus text-primary-content font-extrabold text-xs shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap px-3 cursor-pointer disabled:opacity-50"
                    @click="handleCopyPermissions"
                    :disabled="submitLoading || !copySourceRoleId"
                  >
                    <div class="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Copy class="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span>Salin Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
            <!-- SECTION 1: FORM TAMBAH PERMISSION MODERN -->
            <div class="bg-gradient-to-r from-primary/5 via-base-200/50 to-primary/5 p-4 rounded-2xl border border-primary/10 shadow-xs space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Sparkles class="w-4 h-4 text-primary animate-pulse" />
                  Tambah Hak Akses Modul / Resource
                </h4>
                <span class="text-[10px] font-semibold text-base-content/50 bg-base-100 px-2 py-0.5 rounded-md border border-base-content/10">
                  Multi-Tenant RBAC
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <!-- Select Resource (Select2 Searchable + Custom Input) -->
                <div class="md:col-span-5">
                  <label class="block text-[11px] font-bold text-base-content/70 mb-1.5">Nama Resource / Modul</label>
                  <Select2
                    v-model="newPermission.resource"
                    :options="resourceOptions"
                    placeholder="Pilih / ketik resource..."
                    search-placeholder="Cari atau ketik resource kustom..."
                    :allow-custom="true"
                  />
                </div>

                <!-- Select Access Level (Select2) -->
                <div class="md:col-span-4">
                  <label class="block text-[11px] font-bold text-base-content/70 mb-1.5">Tingkat Akses (Level)</label>
                  <Select2
                    v-model="newPermission.accessLevel"
                    :options="accessLevelOptions"
                    label-key="label"
                    value-key="value"
                    placeholder="Pilih level..."
                    :clearable="false"
                  />
                </div>

                <!-- Submit Button Modern -->
                <div class="md:col-span-3">
                  <button 
                    class="w-full h-[42px] rounded-xl bg-primary hover:bg-primary-focus text-primary-content font-extrabold text-xs shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap px-4 cursor-pointer disabled:opacity-50"
                    @click="handleAddPermission"
                    :disabled="submitLoading"
                  >
                    <div class="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Plus class="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Tambah Hak Akses</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- SECTION 2: LIST PERMISSIONS SAAT INI -->
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-base-content/80 mb-3 flex items-center justify-between">
                <span>Daftar Hak Akses Terpasang ({{ currentPermissions.length }})</span>
              </h4>

              <div v-if="currentPermissions.length === 0" class="py-8 text-center bg-base-200/30 rounded-2xl border border-dashed border-base-content/15">
                <Lock class="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                <p class="text-xs font-medium text-base-content/60">Belum ada hak akses khusus yang dikonfigurasikan untuk role ini.</p>
              </div>

              <div v-else class="max-h-[220px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                <div 
                  v-for="perm in currentPermissions" 
                  :key="perm.resource" 
                  class="flex items-center justify-between p-3.5 bg-base-100 rounded-2xl border border-base-content/10 hover:border-primary/30 transition-all shadow-xs"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      <CheckCircle2 class="w-5 h-5" />
                    </div>
                    <div>
                      <h5 class="font-bold text-sm text-base-content">{{ perm.resource }}</h5>
                      <p class="text-[11px] text-base-content/50 font-medium">Resource Akses Sistem</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <!-- Dropdown Ubah Level Akses In-line (REST API PUT /permissions/:id) -->
                    <select
                      :value="perm.accessLevel"
                      @change="(e: any) => handleUpdatePermissionLevel(perm, e.target.value)"
                      class="select select-bordered select-xs rounded-xl font-bold text-xs py-0 h-8 bg-base-100 border-base-content/20 focus:border-primary focus:ring-1"
                      :disabled="submitLoading"
                      title="Ubah Tingkat Akses"
                    >
                      <option v-for="opt in accessLevelOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>

                    <!-- Tombol Hapus Hak Akses (REST API DELETE /permissions/:id) -->
                    <button 
                      class="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                      @click="handleRemovePermission(perm)"
                      :disabled="submitLoading"
                      title="Hapus Hak Akses"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-action mt-6">
            <button class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-7" @click="showPermissionModal = false">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
