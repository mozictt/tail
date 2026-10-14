<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { RoleService, type Role, type RolePermission, type AccessLevel } from "@/services/role.service";
import { PermissionService } from "@/services/permission.service";
import { MenuService, type MenuItem } from "@/services/menu.service";
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
  Copy,
  Settings,
  ChevronDown,
  Layers,
  Folder,
  CheckSquare,
  Square,
} from "lucide-vue-next";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const roleService = RoleService();
const menuService = MenuService();
const permissionService = PermissionService();

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
const permissionSaving = ref(false);
const selectedRoleForPermission = ref<Role | null>(null);

// State menu tree dengan info permission terintegrasi
const menuTreeWithPerms = ref<MenuItemWithPerm[]>([]);

// Tab aktif: 'menu' = checklist menu, 'custom' = resource kustom
const activeTab = ref<'menu' | 'custom'>('menu');

// State permission kustom (resource yang tidak ada di menu manapun)
const customPermissions = ref<RolePermission[]>([]);
const resourceOptions = ref<string[]>([]);

// Form penambahan custom permission
const newCustomPermission = ref<{ resource: string; accessLevel: AccessLevel }>({
  resource: "",
  accessLevel: "full-akses",
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

/* =========================
   INTERFACES
========================= */
interface MenuItemWithPerm extends MenuItem {
  checked: boolean;
  selectedLevel: AccessLevel;
  permId?: number | null;
  expanded?: boolean;
  children?: MenuItemWithPerm[];
}

/* =========================
   ACCESS LEVEL OPTIONS
========================= */
const VALID_ACCESS_LEVELS: AccessLevel[] = ['full-akses', 'admin-akses', 'change-akses', 'view-akses'];
const DEFAULT_ACCESS_LEVEL: AccessLevel = 'full-akses';

/** Memastikan nilai accessLevel selalu valid — fallback ke DEFAULT_ACCESS_LEVEL */
const sanitizeAccessLevel = (level: any): AccessLevel => {
  if (level && VALID_ACCESS_LEVELS.includes(level as AccessLevel)) {
    return level as AccessLevel;
  }
  return DEFAULT_ACCESS_LEVEL;
};

const accessLevelOptions: { value: AccessLevel; label: string; badgeClass: string; description: string }[] = [
  { value: "full-akses", label: "Full Akses", badgeClass: "bg-error/15 text-error border-error/30 font-extrabold", description: "Full Manage" },
  { value: "admin-akses", label: "Admin Akses", badgeClass: "bg-warning/15 text-amber-700 border-amber-300 font-extrabold", description: "CRUD Access" },
  { value: "change-akses", label: "Change Akses", badgeClass: "bg-info/15 text-info border-info/30 font-extrabold", description: "Create/Update" },
  { value: "view-akses", label: "View Akses", badgeClass: "bg-success/15 text-emerald-700 border-emerald-300 font-extrabold", description: "Read Only" },
];

/* =========================
   COMPUTED: STATISTIK PERMISSION
========================= */
const menuPermStats = computed(() => {
  let total = 0;
  let checked = 0;
  const countRecursive = (items: MenuItemWithPerm[]) => {
    for (const item of items) {
      if (item.requiredResource) {
        total++;
        if (item.checked) checked++;
      }
      if (item.children && item.children.length > 0) {
        countRecursive(item.children as MenuItemWithPerm[]);
      }
    }
  };
  countRecursive(menuTreeWithPerms.value);
  return { total, checked };
});

const isAllMenuChecked = computed(() => {
  return menuPermStats.value.total > 0 && menuPermStats.value.checked === menuPermStats.value.total;
});

const isMenuIndeterminate = computed(() => {
  return menuPermStats.value.checked > 0 && menuPermStats.value.checked < menuPermStats.value.total;
});

/** Centang semua atau batalkan centang semua menu */
const toggleCheckAllMenu = (checkedState?: boolean) => {
  const targetState = typeof checkedState === 'boolean' ? checkedState : !isAllMenuChecked.value;

  const applyCheck = (items: MenuItemWithPerm[]) => {
    for (const item of items) {
      if (item.requiredResource) {
        item.checked = targetState;
        if (targetState && !item.selectedLevel) {
          item.selectedLevel = DEFAULT_ACCESS_LEVEL;
        }
      }
      if (item.children && item.children.length > 0) {
        applyCheck(item.children as MenuItemWithPerm[]);
      }
    }
  };

  applyCheck(menuTreeWithPerms.value);
};

/** Centang atau batalkan centang semua submenu di dalam suatu group/folder */
const toggleCheckGroup = (parent: MenuItemWithPerm) => {
  const childWithResource: MenuItemWithPerm[] = [];
  const collectChild = (nodes: MenuItemWithPerm[]) => {
    for (const n of nodes) {
      if (n.requiredResource) childWithResource.push(n);
      if (n.children && n.children.length > 0) collectChild(n.children as MenuItemWithPerm[]);
    }
  };
  if (parent.children) collectChild(parent.children as MenuItemWithPerm[]);

  const isGroupAllChecked = childWithResource.length > 0 && childWithResource.every(c => c.checked);
  const targetState = !isGroupAllChecked;

  const applyCheck = (nodes: MenuItemWithPerm[]) => {
    for (const n of nodes) {
      if (n.requiredResource) {
        n.checked = targetState;
        if (targetState && !n.selectedLevel) n.selectedLevel = DEFAULT_ACCESS_LEVEL;
      }
      if (n.children && n.children.length > 0) applyCheck(n.children as MenuItemWithPerm[]);
    }
  };
  if (parent.children) applyCheck(parent.children as MenuItemWithPerm[]);

  if (parent.requiredResource) {
    parent.checked = targetState;
    if (targetState && !parent.selectedLevel) parent.selectedLevel = DEFAULT_ACCESS_LEVEL;
  }
};

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
   CREATE & EDIT ROLE
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
  roleForm.value = { name: role.name, description: role.description || "" };
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
    const msg = err?.data?.message || err?.message || "Gagal menyimpan data role";
    showToast(Array.isArray(msg) ? msg.join(", ") : msg, "error");
  } finally {
    submitLoading.value = false;
  }
};

/* =========================
   DELETE ROLE
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
    customClass: { popup: "rounded-3xl border border-base-content/10" },
  });
  if (!result.isConfirmed) return;
  try {
    await roleService.deleteRole(id);
    showToast(`Role "${name}" berhasil dihapus`, "success");
    fetchRoles();
  } catch (err: any) {
    showToast("Gagal menghapus role", "error");
  }
};

/* =========================
   PERMISSION — MENU CHECKLIST
========================= */

/**
 * Rekursif: inject info checked & selectedLevel dari permMap ke menu tree
 */
const buildMenuTreeWithPerms = (
  menuItems: MenuItem[],
  permMap: Map<string, RolePermission>
): MenuItemWithPerm[] => {
  return menuItems.map((item) => {
    const resource = item.requiredResource?.trim().toLowerCase() || null;
    const perm = resource ? permMap.get(resource) : undefined;

    return {
      ...item,
      checked: !!perm,
      // Gunakan sanitizeAccessLevel agar tidak ada nilai null/undefined yang lolos
      selectedLevel: sanitizeAccessLevel(perm?.accessLevel),
      permId: perm?.id || null,
      expanded: true,
      children: item.children && item.children.length > 0
        ? buildMenuTreeWithPerms(item.children, permMap)
        : [],
    } as MenuItemWithPerm;
  });
};

/**
 * Kumpulkan semua menu yang memiliki requiredResource secara rekursif
 */
const collectMenusWithResource = (items: MenuItemWithPerm[]): MenuItemWithPerm[] => {
  const result: MenuItemWithPerm[] = [];
  const traverse = (nodes: MenuItemWithPerm[]) => {
    nodes.forEach(node => {
      if (node.requiredResource) result.push(node);
      if (node.children && node.children.length > 0) traverse(node.children as MenuItemWithPerm[]);
    });
  };
  traverse(items);
  return result;
};

/**
 * Buka modal permission & muat data menu + permissions role sekaligus
 */
const openPermissionModal = async (role: Role) => {
  selectedRoleForPermission.value = role;
  permissionLoading.value = true;
  showPermissionModal.value = true;
  menuTreeWithPerms.value = [];
  customPermissions.value = [];
  activeTab.value = 'menu';
  showCopySection.value = false;
  newCustomPermission.value = { resource: "", accessLevel: "full-akses" };

  try {
    // Parallel fetch: menu tree role + detail role (permissions)
    const [menuTree, roleDetail]: [MenuItem[], any] = await Promise.all([
      menuService.getMenusByRoleId(role.id!),
      roleService.getRoleById(role.id!),
    ]);

    const roleData = roleDetail?.data || roleDetail;
    const allPermissions: RolePermission[] = roleData?.permissions || [];

    // Buat Map resource → permission (O(1) lookup)
    const permMap = new Map<string, RolePermission>();
    allPermissions.forEach(p => {
      if (p.resource) permMap.set(p.resource.trim().toLowerCase(), p);
    });

    // Bangun menu tree dengan info permission
    menuTreeWithPerms.value = buildMenuTreeWithPerms(menuTree, permMap);

    // Pisahkan permission yang resource-nya tidak ada di menu manapun
    const allMenuResources = new Set<string>();
    const collectResources = (items: MenuItem[]) => {
      items.forEach(item => {
        if (item.requiredResource) allMenuResources.add(item.requiredResource.trim().toLowerCase());
        if (item.children) collectResources(item.children);
      });
    };
    collectResources(menuTree);

    customPermissions.value = allPermissions.filter(p =>
      p.resource && !allMenuResources.has(p.resource.trim().toLowerCase())
    );

    // Fetch resource options untuk dropdown custom
    try {
      const res = await permissionService.getResources('array');
      resourceOptions.value = Array.isArray(res) ? res : [];
    } catch {
      resourceOptions.value = [];
    }

  } catch (err) {
    console.error("Gagal memuat data permission:", err);
    showToast("Gagal mengambil data hak akses role", "error");
  } finally {
    permissionLoading.value = false;
  }
};

/** Toggle checklist menu item */
const toggleMenuCheck = (item: MenuItemWithPerm) => {
  if (!item.requiredResource) return;
  item.checked = !item.checked;
};

/**
 * Simpan semua permission (menu checklist + custom) sekaligus via sync endpoint
 */
const saveAllPermissions = async () => {
  if (!selectedRoleForPermission.value?.id) return;

  permissionSaving.value = true;
  try {
    const allMenuItems = collectMenusWithResource(menuTreeWithPerms.value);

    // Filter: hanya item yang ter-checklist, punya requiredResource non-kosong, dan accessLevel valid
    const checkedMenuPerms = allMenuItems
      .filter(item => item.checked && item.requiredResource?.trim())
      .map(item => ({
        resource: item.requiredResource!.trim(),
        accessLevel: sanitizeAccessLevel(item.selectedLevel),
      }));

    // Filter: hanya custom permission dengan resource non-kosong dan accessLevel valid
    const customPerms = customPermissions.value
      .filter(p => p.resource?.trim())
      .map(p => ({
        resource: p.resource.trim(),
        accessLevel: sanitizeAccessLevel(p.accessLevel),
      }));

    const allPerms = [...checkedMenuPerms, ...customPerms];

    // Jika tidak ada permission sama sekali, tetap kirim array kosong (valid per backend)
    await permissionService.syncPermissions({
      role_id: selectedRoleForPermission.value.id,
      permissions: allPerms,
    });

    showToast(
      allPerms.length > 0
        ? `${allPerms.length} hak akses berhasil disimpan`
        : "Hak akses berhasil dikosongkan",
      "success"
    );
    fetchRoles();
  } catch (err: any) {
    const msg = err?.data?.message;
    showToast(
      Array.isArray(msg) ? msg.join(', ') : (msg || "Gagal menyimpan hak akses"),
      "error"
    );
  } finally {
    permissionSaving.value = false;
  }
};

/* =========================
   CUSTOM PERMISSION MANAGEMENT
========================= */
const handleAddCustomPermission = () => {
  const resource = newCustomPermission.value.resource?.trim();
  if (!resource) {
    showToast("Nama resource wajib diisi", "error");
    return;
  }

  const exists = customPermissions.value.some(
    p => p.resource.toLowerCase() === resource.toLowerCase()
  );
  if (exists) {
    showToast(`Resource "${resource}" sudah ada`, "warning");
    return;
  }

  // Cek tidak duplikat dengan resource dari menu
  const menuResources = collectMenusWithResource(menuTreeWithPerms.value)
    .map(m => m.requiredResource!.toLowerCase());
  if (menuResources.includes(resource.toLowerCase())) {
    showToast(`Resource "${resource}" sudah diatur via menu checklist`, "warning");
    return;
  }

  customPermissions.value.push({ resource, accessLevel: newCustomPermission.value.accessLevel });
  newCustomPermission.value = { resource: "", accessLevel: "full-akses" };
  showToast(`Resource "${resource}" ditambahkan`, "success");
};

const handleRemoveCustomPermission = async (perm: RolePermission) => {
  const result = await Swal.fire({
    title: "Hapus Resource Kustom?",
    text: `Hapus resource "${perm.resource}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
    customClass: { popup: "rounded-3xl border border-base-content/10" },
  });
  if (!result.isConfirmed) return;
  customPermissions.value = customPermissions.value.filter(p => p.resource !== perm.resource);
};

/* =========================
   COPY PERMISSIONS
========================= */
const handleCopyPermissions = async () => {
  if (!selectedRoleForPermission.value?.id || !copySourceRoleId.value) {
    showToast("Pilih role sumber terlebih dahulu", "warning");
    return;
  }

  const sourceRole = roles.value.find(r => r.id === copySourceRoleId.value);
  const confirmResult = await Swal.fire({
    title: "Salin Hak Akses?",
    text: `Salin seluruh hak akses dari "${sourceRole?.name || 'Sumber'}" ke "${selectedRoleForPermission.value.name}" (${copyMode.value === 'overwrite' ? 'Mode Timpa' : 'Mode Gabung'})?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Salin Sekarang",
    cancelButtonText: "Batal",
    reverseButtons: true,
    customClass: { popup: "rounded-3xl border border-base-content/10" },
  });

  if (!confirmResult.isConfirmed) return;

  permissionSaving.value = true;
  try {
    const res: any = await permissionService.copyPermissions({
      source_role_id: copySourceRoleId.value,
      target_role_id: selectedRoleForPermission.value.id,
      mode: copyMode.value,
    });

    const msg = res?.data?.message || res?.message || `Berhasil menyalin hak akses dari "${sourceRole?.name}"`;
    showToast(msg, "success");

    // Refresh modal
    await openPermissionModal(selectedRoleForPermission.value);
    showCopySection.value = false;
  } catch (err: any) {
    showToast(err?.data?.message || "Gagal menyalin hak akses", "error");
  } finally {
    permissionSaving.value = false;
  }
};

/* =========================
   INITIALIZATION
========================= */
onMounted(() => {
  fetchRoles();
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

                <td class="py-4 px-4 max-w-xs">
                  <p class="text-xs text-base-content/70 truncate">
                    {{ role.description || 'Tidak ada deskripsi penjelas.' }}
                  </p>
                </td>

                <td class="py-4 px-4 text-center">
                  <span class="badge badge-primary badge-outline text-xs font-semibold px-2.5 py-1 rounded-lg">
                    {{ role.permissions ? role.permissions.length : 0 }} Modul Resource
                  </span>
                </td>

                <td class="py-4 px-4 text-xs text-base-content/60 font-medium">
                  <div class="flex items-center gap-1.5">
                    <Calendar class="w-3.5 h-3.5 text-base-content/40" />
                    <span>{{ role.createdAt ? new Date(role.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' }}</span>
                  </div>
                </td>

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

        <!-- PAGINATION -->
        <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-base-content/10">
          <p class="text-xs text-base-content/60 font-medium">
            Halaman <span class="font-bold text-base-content">{{ currentPage }}</span> dari <span class="font-bold text-base-content">{{ totalPages }}</span> (Total {{ totalItems }} Role)
          </p>
          <div class="join">
            <button class="join-item btn btn-sm rounded-l-xl" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button
              v-for="p in totalPages"
              :key="p"
              class="join-item btn btn-sm"
              :class="{'btn-primary': p === currentPage}"
              @click="changePage(p)"
            >{{ p }}</button>
            <button class="join-item btn btn-sm rounded-r-xl" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL CREATE / EDIT ROLE                                  -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showRoleModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showRoleModal = false)">
        <div class="modal-box max-w-lg bg-base-100 rounded-3xl border border-base-content/10 p-7 shadow-2xl relative text-base-content">
          <button class="absolute top-5 right-5 text-base-content/40 hover:text-error transition" @click="showRoleModal = false" :disabled="submitLoading">
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
              <span v-if="roleErrors.name" class="text-xs text-error font-semibold mt-1 block">{{ roleErrors.name }}</span>
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
            <button class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6" @click="showRoleModal = false" :disabled="submitLoading">Batal</button>
            <button class="btn btn-primary rounded-2xl font-bold px-7 shadow-lg shadow-primary/30 flex items-center gap-2" @click="submitRole" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              {{ isEdit ? "Simpan Perubahan" : "Buat Role" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODAL ATUR HAK AKSES — MENU CHECKLIST                     -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showPermissionModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!permissionSaving && (showPermissionModal = false)">
        <div class="modal-box max-w-4xl max-h-[90vh] flex flex-col bg-base-100 rounded-3xl border border-base-content/10 p-0 shadow-2xl relative text-base-content overflow-hidden">

          <!-- MODAL HEADER -->
          <div class="p-5 sm:p-6 pb-4 border-b border-base-content/10 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Key class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-extrabold text-base-content text-xl tracking-tight leading-tight">Pengaturan Hak Akses</h3>
                <p class="text-xs font-semibold text-primary mt-0.5">
                  Role: <span class="font-extrabold">{{ selectedRoleForPermission?.name }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="btn btn-outline btn-primary btn-xs rounded-xl font-bold gap-1.5 px-3 h-8 flex items-center"
                @click="showCopySection = !showCopySection"
              >
                <Copy class="w-3.5 h-3.5 shrink-0" />
                <span class="hidden sm:inline">{{ showCopySection ? 'Tutup' : 'Salin dari Role' }}</span>
              </button>
              <button
                class="w-8 h-8 rounded-xl bg-base-200 hover:bg-error/10 text-base-content/50 hover:text-error transition flex items-center justify-center"
                @click="showPermissionModal = false"
                :disabled="permissionSaving"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- COPY SECTION -->
          <div v-if="showCopySection" class="px-5 sm:px-6 pt-4 shrink-0">
            <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-3">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Copy class="w-4 h-4" /> Salin Seluruh Hak Akses dari Role Lain
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div class="md:col-span-5">
                  <label class="block text-[11px] font-bold text-base-content/70 mb-1">Role Sumber</label>
                  <Select2 v-model="copySourceRoleId" :options="sourceRoleOptions" label-key="name" value-key="id" placeholder="Pilih role sumber..." :clearable="false" />
                </div>
                <div class="md:col-span-4">
                  <label class="block text-[11px] font-bold text-base-content/70 mb-1.5">Mode Salin</label>
                  <Select2 v-model="copyMode" :options="copyModeOptions" label-key="label" value-key="value" placeholder="Pilih mode..." :clearable="false" />
                </div>
                <div class="md:col-span-3">
                  <button
                    class="w-full h-[42px] rounded-xl bg-primary hover:bg-primary-focus text-primary-content font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    @click="handleCopyPermissions"
                    :disabled="permissionSaving || !copySourceRoleId"
                  >
                    <span v-if="permissionSaving" class="loading loading-spinner loading-xs"></span>
                    <Copy v-else class="w-3.5 h-3.5" />
                    <span>Salin Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB NAVIGATION -->
          <div class="px-5 sm:px-6 pt-4 shrink-0">
            <div class="flex gap-1 bg-base-200/60 rounded-2xl p-1">
              <button
                class="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all"
                :class="activeTab === 'menu' ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/60 hover:text-base-content'"
                @click="activeTab = 'menu'"
              >
                <Layers class="w-4 h-4 shrink-0" />
                <span class="truncate">Checklist Menu</span>
                <span class="badge badge-sm shrink-0" :class="activeTab === 'menu' ? 'badge-primary' : 'badge-ghost'">
                  {{ menuPermStats.checked }}/{{ menuPermStats.total }}
                </span>
              </button>
              <button
                class="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all"
                :class="activeTab === 'custom' ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/60 hover:text-base-content'"
                @click="activeTab = 'custom'"
              >
                <Settings class="w-4 h-4 shrink-0" />
                <span class="truncate">Pengaturan Hak Akses Role</span>
                <span v-if="customPermissions.length > 0" class="badge badge-sm badge-warning shrink-0">{{ customPermissions.length }}</span>
              </button>
            </div>
          </div>

          <!-- LOADING STATE -->
          <div v-if="permissionLoading" class="flex-1 flex items-center justify-center py-16">
            <div class="text-center space-y-3">
              <span class="loading loading-spinner loading-lg text-primary"></span>
              <p class="text-sm font-medium text-base-content/60">Memuat data hak akses...</p>
            </div>
          </div>

          <!-- CONTENT AREA -->
          <div v-else class="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">

            <!-- ======================== -->
            <!-- TAB: CHECKLIST MENU      -->
            <!-- ======================== -->
            <div v-if="activeTab === 'menu'">
              <!-- Info banner -->
              <div class="flex items-start gap-2.5 p-3.5 bg-info/10 border border-info/20 rounded-2xl mb-3">
                <Info class="w-4 h-4 text-info mt-0.5 shrink-0" />
                <p class="text-xs text-info/90 font-medium leading-relaxed">
                  Centang menu yang ingin diberikan akses, lalu pilih tingkat aksesnya. Default level: <strong>Full Akses</strong>.
                  Klik <strong>Simpan Perubahan</strong> untuk menyimpan semua sekaligus.
                </p>
              </div>

              <!-- Toolbar Checklist All & Aksi Cepat -->
              <div
                v-if="menuTreeWithPerms.length > 0"
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 bg-base-100 border border-base-content/10 rounded-2xl shadow-xs mb-3"
              >
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-primary checkbox-sm"
                      :checked="isAllMenuChecked"
                      :indeterminate="isMenuIndeterminate"
                      @change="toggleCheckAllMenu()"
                    />
                    <span class="text-xs sm:text-sm font-bold text-base-content">
                      Checklist Semua Menu
                    </span>
                  </label>
                  <span class="badge badge-sm font-semibold shrink-0" :class="isAllMenuChecked ? 'badge-primary' : 'badge-ghost'">
                    {{ menuPermStats.checked }} / {{ menuPermStats.total }} terpilih
                  </span>
                </div>

                <div class="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    class="btn btn-xs btn-outline btn-primary gap-1 font-semibold"
                    @click="toggleCheckAllMenu(true)"
                    :disabled="isAllMenuChecked"
                    title="Centang semua menu yang memiliki resource"
                  >
                    <CheckSquare class="w-3.5 h-3.5" />
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-outline btn-ghost text-base-content/70 hover:text-error gap-1 font-semibold"
                    @click="toggleCheckAllMenu(false)"
                    :disabled="menuPermStats.checked === 0"
                    title="Batalkan semua centang menu"
                  >
                    <Square class="w-3.5 h-3.5" />
                    Batal Semua
                  </button>
                </div>
              </div>

              <!-- Empty state -->
              <div v-if="menuTreeWithPerms.length === 0" class="py-12 text-center bg-base-200/30 rounded-2xl border border-dashed border-base-content/15">
                <Layers class="w-10 h-10 text-base-content/20 mx-auto mb-2" />
                <p class="text-sm font-medium text-base-content/50">Tidak ada data menu yang tersedia.</p>
              </div>

              <!-- MENU TREE CHECKLIST -->
              <div v-else class="space-y-2">
                <div
                  v-for="parentMenu in menuTreeWithPerms"
                  :key="parentMenu.id"
                  class="border border-base-content/10 rounded-2xl overflow-hidden transition-all"
                >
                  <!-- Parent row (collapsible header) -->
                  <div
                    class="flex items-center justify-between px-4 py-3 bg-base-200/60 cursor-pointer hover:bg-base-200 transition-colors select-none"
                    @click="parentMenu.expanded = !parentMenu.expanded"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Folder class="w-3.5 h-3.5" />
                      </div>
                      <span class="font-extrabold text-sm text-base-content truncate">{{ parentMenu.name }}</span>
                      <span
                        v-if="parentMenu.children && (parentMenu.children as MenuItemWithPerm[]).filter(c => !!c.requiredResource).length > 0"
                        class="badge badge-sm badge-ghost text-[10px] font-semibold shrink-0"
                      >
                        {{ (parentMenu.children as MenuItemWithPerm[]).filter(c => c.checked && !!c.requiredResource).length }}
                        / {{ (parentMenu.children as MenuItemWithPerm[]).filter(c => !!c.requiredResource).length }}
                      </span>
                      <span v-if="parentMenu.requiredResource" class="badge badge-xs badge-outline badge-primary font-mono hidden sm:flex shrink-0">
                        {{ parentMenu.requiredResource }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <!-- Tombol pilih semua dalam grup jika punya sub-menu -->
                      <button
                        v-if="parentMenu.children && (parentMenu.children as MenuItemWithPerm[]).filter(c => !!c.requiredResource).length > 0"
                        type="button"
                        class="btn btn-ghost btn-xs text-[11px] text-primary hover:bg-primary/10 px-2 py-0.5 h-auto min-h-0 font-bold"
                        @click.stop="toggleCheckGroup(parentMenu)"
                        title="Centang atau batalkan semua submenu dalam grup ini"
                      >
                        Pilih Grup
                      </button>

                      <label v-if="parentMenu.requiredResource" class="flex items-center gap-1.5 cursor-pointer" @click.stop>
                        <input
                          type="checkbox"
                          class="checkbox checkbox-primary checkbox-sm"
                          :checked="parentMenu.checked"
                          @change="toggleMenuCheck(parentMenu)"
                        />
                        <span class="text-xs font-semibold text-base-content/70 hidden sm:inline">Aktifkan</span>
                      </label>
                      <ChevronDown class="w-4 h-4 text-base-content/50 transition-transform duration-200" :class="parentMenu.expanded ? 'rotate-0' : '-rotate-90'" />
                    </div>
                  </div>

                  <!-- Level akses parent jika punya requiredResource dan di-checklist -->
                  <div
                    v-if="parentMenu.requiredResource && parentMenu.checked"
                    class="px-4 py-2.5 bg-primary/5 border-t border-base-content/5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span class="text-xs font-semibold text-base-content/60">
                      Tingkat Akses untuk <span class="text-primary font-bold">{{ parentMenu.name }}</span>:
                    </span>
                    <div class="flex flex-wrap items-center gap-1">
                      <button
                        v-for="opt in accessLevelOptions"
                        :key="opt.value"
                        class="px-2 py-1 rounded-lg text-[10px] font-bold border transition-all whitespace-nowrap"
                        :class="parentMenu.selectedLevel === opt.value
                          ? opt.badgeClass + ' ring-2 ring-offset-1 ring-primary/40'
                          : 'bg-base-100 text-base-content/40 border-base-content/10 hover:border-primary/30'"
                        @click="parentMenu.selectedLevel = opt.value"
                      >{{ opt.label }}</button>
                    </div>
                  </div>

                  <!-- Children Menu Items -->
                  <div v-if="parentMenu.expanded && parentMenu.children && parentMenu.children.length > 0">
                    <div
                      v-for="(child, cIdx) in (parentMenu.children as MenuItemWithPerm[])"
                      :key="child.id"
                      class="border-t border-base-content/5"
                    >
                      <!-- Child row -->
                      <div
                        class="flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
                        :class="cIdx % 2 === 0 ? 'bg-base-100' : 'bg-base-50'"
                      >
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="pl-3 shrink-0">
                            <input
                              v-if="child.requiredResource"
                              type="checkbox"
                              class="checkbox checkbox-primary checkbox-sm"
                              :checked="child.checked"
                              @change="toggleMenuCheck(child)"
                            />
                            <div v-else class="w-4 h-4 flex items-center justify-center">
                              <div class="w-1.5 h-1.5 rounded-full bg-base-content/20"></div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="font-semibold text-sm text-base-content truncate">{{ child.name }}</span>
                            <span v-if="child.requiredResource" class="badge badge-xs badge-ghost font-mono text-[10px] text-base-content/50 hidden sm:flex shrink-0">
                              {{ child.requiredResource }}
                            </span>
                            <span v-if="!child.requiredResource" class="badge badge-xs bg-base-200 text-base-content/40 border-0 font-medium shrink-0">
                              Tanpa Resource
                            </span>
                          </div>
                        </div>

                        <!-- Level akses child -->
                        <div v-if="child.requiredResource && child.checked" class="flex flex-wrap items-center gap-1 ml-2 shrink-0">
                          <button
                            v-for="opt in accessLevelOptions"
                            :key="opt.value"
                            class="px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold border transition-all whitespace-nowrap"
                            :class="child.selectedLevel === opt.value
                              ? opt.badgeClass + ' ring-1 ring-offset-1 ring-primary/30'
                              : 'bg-base-100 text-base-content/40 border-base-content/10 hover:border-primary/30'"
                            @click="child.selectedLevel = opt.value"
                          >{{ opt.label }}</button>
                        </div>
                        <div v-else-if="child.requiredResource && !child.checked" class="ml-2 shrink-0">
                          <span class="badge badge-sm badge-ghost text-base-content/30 font-medium">Tidak Aktif</span>
                        </div>
                      </div>

                      <!-- Sub-children Level 3 -->
                      <div v-if="child.children && child.children.length > 0">
                        <div
                          v-for="grandchild in (child.children as MenuItemWithPerm[])"
                          :key="grandchild.id"
                          class="flex items-center justify-between pl-12 pr-4 py-2.5 border-t border-base-content/5 bg-base-200/20 hover:bg-primary/5 transition-colors"
                        >
                          <div class="flex items-center gap-2.5 min-w-0">
                            <input
                              v-if="grandchild.requiredResource"
                              type="checkbox"
                              class="checkbox checkbox-primary checkbox-xs shrink-0"
                              :checked="grandchild.checked"
                              @change="toggleMenuCheck(grandchild)"
                            />
                            <div v-else class="w-3 h-3 flex items-center justify-center shrink-0">
                              <div class="w-1 h-1 rounded-full bg-base-content/20"></div>
                            </div>
                            <span class="text-xs font-semibold text-base-content/80 truncate">{{ grandchild.name }}</span>
                            <span v-if="grandchild.requiredResource" class="badge badge-xs badge-ghost font-mono text-[10px] text-base-content/40 hidden sm:flex shrink-0">
                              {{ grandchild.requiredResource }}
                            </span>
                          </div>
                          <div v-if="grandchild.requiredResource && grandchild.checked" class="flex flex-wrap items-center gap-0.5 ml-2 shrink-0">
                            <button
                              v-for="opt in accessLevelOptions"
                              :key="opt.value"
                              class="px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-all whitespace-nowrap"
                              :class="grandchild.selectedLevel === opt.value
                                ? opt.badgeClass
                                : 'bg-base-100 text-base-content/40 border-base-content/10 hover:border-primary/30'"
                              @click="grandchild.selectedLevel = opt.value"
                            >{{ opt.label }}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ================================= -->
            <!-- TAB: PENGATURAN HAK AKSES ROLE    -->
            <!-- ================================= -->
            <div v-if="activeTab === 'custom'" class="space-y-4">
              <!-- Info banner -->
              <div class="flex items-start gap-2.5 p-3.5 bg-warning/10 border border-warning/20 rounded-2xl">
                <Info class="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p class="text-xs font-medium leading-relaxed text-base-content/80">
                  Panel ini untuk menambahkan hak akses resource yang <strong>tidak terdaftar di menu</strong>
                  (mis: API internal, fitur tersembunyi, atau resource khusus).
                  Perubahan disimpan bersamaan saat klik <strong>Simpan Perubahan</strong>.
                </p>
              </div>

              <!-- Form Tambah Custom Permission -->
              <div class="p-4 bg-gradient-to-r from-primary/5 via-base-200/50 to-primary/5 rounded-2xl border border-primary/10">
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2 mb-3">
                  <Sparkles class="w-4 h-4 text-primary" />
                  Tambah Resource Kustom
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div class="md:col-span-5">
                    <label class="block text-[11px] font-bold text-base-content/70 mb-1.5">Nama Resource / Modul</label>
                    <Select2
                      v-model="newCustomPermission.resource"
                      :options="resourceOptions"
                      placeholder="Pilih / ketik resource..."
                      search-placeholder="Cari atau ketik resource kustom..."
                      :allow-custom="true"
                    />
                  </div>
                  <div class="md:col-span-4">
                    <label class="block text-[11px] font-bold text-base-content/70 mb-1.5">Tingkat Akses</label>
                    <Select2
                      v-model="newCustomPermission.accessLevel"
                      :options="accessLevelOptions"
                      label-key="label"
                      value-key="value"
                      placeholder="Pilih level..."
                      :clearable="false"
                    />
                  </div>
                  <div class="md:col-span-3">
                    <button
                      class="w-full h-[42px] rounded-xl bg-primary hover:bg-primary-focus text-primary-content font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      @click="handleAddCustomPermission"
                    >
                      <Plus class="w-3.5 h-3.5 stroke-[3]" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- List Custom Permissions -->
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-base-content/60 mb-3 flex items-center gap-2">
                  <Settings class="w-3.5 h-3.5" />
                  Resource Kustom Terpasang
                  <span class="badge badge-sm badge-ghost">{{ customPermissions.length }}</span>
                </h4>

                <div v-if="customPermissions.length === 0" class="py-10 text-center bg-base-200/30 rounded-2xl border border-dashed border-base-content/15">
                  <Lock class="w-8 h-8 text-base-content/20 mx-auto mb-2" />
                  <p class="text-xs font-medium text-base-content/40">Belum ada resource kustom yang dikonfigurasi.</p>
                </div>

                <div v-else class="space-y-2">
                  <div
                    v-for="perm in customPermissions"
                    :key="perm.resource"
                    class="flex items-center justify-between p-3.5 bg-base-100 rounded-2xl border border-base-content/10 hover:border-primary/30 transition-all"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center text-warning shrink-0">
                        <Key class="w-4 h-4" />
                      </div>
                      <div class="min-w-0">
                        <h5 class="font-bold text-sm text-base-content truncate">{{ perm.resource }}</h5>
                        <p class="text-[11px] text-base-content/40 font-medium">Resource Kustom</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <select
                        v-model="perm.accessLevel"
                        class="select select-bordered select-xs rounded-xl font-bold text-xs py-0 h-8 bg-base-100 border-base-content/20 focus:border-primary"
                      >
                        <option v-for="opt in accessLevelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                      <button
                        class="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                        @click="handleRemoveCustomPermission(perm)"
                        title="Hapus Resource Kustom"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- MODAL FOOTER -->
          <div class="shrink-0 px-5 sm:px-6 py-4 border-t border-base-content/10 flex items-center justify-between gap-3 bg-base-100">
            <div class="hidden sm:flex items-center gap-2 text-xs text-base-content/50 font-medium">
              <CheckCircle2 class="w-4 h-4 text-success shrink-0" />
              <span>
                <span class="font-bold text-base-content">{{ menuPermStats.checked }}</span> menu aktif
                dari <span class="font-bold text-base-content">{{ menuPermStats.total }}</span> total
                <span v-if="customPermissions.length > 0" class="text-warning">
                  · {{ customPermissions.length }} kustom
                </span>
              </span>
            </div>
            <div class="flex items-center gap-3 ml-auto">
              <button
                class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-5"
                @click="showPermissionModal = false"
                :disabled="permissionSaving"
              >Tutup</button>
              <button
                class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/30 flex items-center gap-2"
                @click="saveAllPermissions"
                :disabled="permissionSaving"
              >
                <span v-if="permissionSaving" class="loading loading-spinner loading-sm"></span>
                <CheckCircle2 v-else class="w-4 h-4" />
                Simpan Perubahan
              </button>
            </div>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>
