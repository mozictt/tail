<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import EasyDataTable from "vue3-easy-data-table";
import "vue3-easy-data-table/dist/style.css";
import { UserService, type UserItem } from "@/services/user.service";
import { RoleService, type Role } from "@/services/role.service";
import { PegawaiService, type PegawaiItem } from "@/services/pegawai.service";
import Select2 from "@/components/ui/Select2.vue";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  KeyRound,
  RefreshCw,
  Sparkles
} from "lucide-vue-next";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const userService = UserService();
const roleService = RoleService();
const pegawaiService = PegawaiService();

/* =========================
   STATE DATA TABLE & SERVER OPTIONS
========================= */
const headers = [
  { text: "PENGGUNA", value: "username", sortable: true },
  { text: "ROLE HAK AKSES", value: "role", sortable: false },
  { text: "STATUS AKUN", value: "is_active", sortable: true },
  { text: "TANGGAL DIBUAT", value: "createdAt", sortable: true },
  { text: "AKSI", value: "aksi", sortable: false },
];

const serverOptions = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: "id",
  sortType: "desc",
});

const users = ref<UserItem[]>([]);
const totalItems = ref(0);
const loading = ref(false);
const searchQuery = ref("");
const statusFilter = ref<string>("all"); // 'all' | 'true' | 'false'

/* =========================
   FETCH USERS DATA
========================= */
const fetchUsers = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
      search: searchQuery.value.trim(),
    };

    if (statusFilter.value !== "all") {
      params.is_active = statusFilter.value === "true";
    }

    const res: any = await userService.getUsers(params);
    
    let rawData: UserItem[] = [];
    let count = 0;

    if (res?.data?.items && Array.isArray(res.data.items)) {
      rawData = res.data.items;
      count = res.data.meta?.totalItems ?? res.data.items.length;
    } else if (res?.items && Array.isArray(res.items)) {
      rawData = res.items;
      count = res.meta?.totalItems ?? res.items.length;
    } else if (res?.data && Array.isArray(res.data)) {
      rawData = res.data;
      count = res.meta?.total ?? res.total ?? res.data.length;
    } else if (Array.isArray(res)) {
      rawData = res;
      count = res.length;
    }

    users.value = rawData;
    totalItems.value = count;
  } catch (err: any) {
    console.error("Gagal mengambil data user:", err);
    showToast("Gagal memuat data pengguna", "error");
  } finally {
    loading.value = false;
  }
};

const updateOptions = (options: any) => {
  serverOptions.value = options;
  fetchUsers();
};

/* =========================
   WATCHERS (SEARCH & FILTER)
========================= */
let searchTimeout: any = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    serverOptions.value.page = 1;
    fetchUsers();
  }, 400);
});

watch(statusFilter, () => {
  serverOptions.value.page = 1;
  fetchUsers();
});

/* =========================
   ROLE OPTIONS (FOR SELECT2)
========================= */
const roleOptions = ref<Role[]>([]);
const roleLoading = ref(false);

const fetchRoleOptions = async () => {
  roleLoading.value = true;
  try {
    const res: any = await roleService.getRoles({ page: 1, limit: 100 });
    const payload = res?.data !== undefined ? res.data : res;
    if (Array.isArray(payload)) {
      roleOptions.value = payload;
    } else if (payload && Array.isArray(payload.data)) {
      roleOptions.value = payload.data;
    }
  } catch (err) {
    console.error("Gagal mengambil role options:", err);
  } finally {
    roleLoading.value = false;
  }
};

/* =========================
   MODAL CREATE / EDIT USER
========================= */
const showUserModal = ref(false);
const isEdit = ref(false);
const selectedUserId = ref<number | null>(null);
const submitLoading = ref(false);
const unassignedPegawai = ref<PegawaiItem[]>([]);
const unassignedLoading = ref(false);

const pegawaiOptions = computed(() => {
  if (!unassignedPegawai.value || !Array.isArray(unassignedPegawai.value)) {
    return [];
  }
  return unassignedPegawai.value.map(p => ({
    id: p.id,
    name: `${p.name} (NIP: ${p.nip})`
  }));
});

const userForm = ref<{
  username: string;
  password: string;
  role_id: number | null;
  is_active: boolean;
  pegawai_id: number | null;
  pegawai_name?: string;
  pegawai_nip?: string;
}>({
  username: "",
  password: "",
  role_id: null,
  is_active: true,
  pegawai_id: null,
  pegawai_name: "",
  pegawai_nip: "",
});

const userErrors = ref<{ username?: string; role_id?: string; password?: string; pegawai_id?: string }>({});

const openCreateModal = async () => {
  isEdit.value = false;
  selectedUserId.value = null;
  userForm.value = {
    username: "",
    password: "",
    role_id: roleOptions.value.length > 0 ? roleOptions.value[0].id || null : null,
    is_active: true,
    pegawai_id: null,
    pegawai_name: "",
    pegawai_nip: "",
  };
  userErrors.value = {};
  
  unassignedLoading.value = true;
  try {
    const res = await pegawaiService.getUnassignedPegawai();
    const data = res && (res as any).data !== undefined ? (res as any).data : res;
    unassignedPegawai.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Gagal memuat daftar pegawai:", err);
  } finally {
    unassignedLoading.value = false;
  }
  
  showUserModal.value = true;
};

const openEditModal = (user: any) => {
  isEdit.value = true;
  selectedUserId.value = user.id;
  userForm.value = {
    username: user.username,
    password: "",
    role_id: user.role?.id || null,
    is_active: user.is_active,
    pegawai_id: user.pegawai?.id || null,
    pegawai_name: user.pegawai?.name || "",
    pegawai_nip: user.pegawai?.nip || "",
  };
  userErrors.value = {};
  showUserModal.value = true;
};

const validateForm = () => {
  userErrors.value = {};
  let isValid = true;

  if (!userForm.value.username.trim()) {
    userErrors.value.username = "Username wajib diisi";
    isValid = false;
  }

  if (!isEdit.value && !userForm.value.password) {
    userErrors.value.password = "Password wajib diisi untuk pengguna baru";
    isValid = false;
  }

  if (!userForm.value.role_id) {
    userErrors.value.role_id = "Role wajib dipilih";
    isValid = false;
  }

  if (!isEdit.value && !userForm.value.pegawai_id) {
    userErrors.value.pegawai_id = "Pegawai wajib dipilih";
    isValid = false;
  }

  return isValid;
};

const submitUser = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    if (isEdit.value && selectedUserId.value) {
      const payload: any = {
        username: userForm.value.username.trim(),
        role_id: userForm.value.role_id,
        is_active: userForm.value.is_active,
      };

      if (userForm.value.password) {
        payload.password = userForm.value.password;
      }

      await userService.updateUser(selectedUserId.value, payload);
      showToast(`Data penguna "${userForm.value.username}" berhasil diperbarui`, "success");
    } else {
      const route = useRoute();
      const currentTenantId = (route.params.slug as string) || "00000000-0000-0000-0000-000000000000";

      const api = useApi();
      await api('/auth/register', {
        method: 'POST',
        body: {
          username: userForm.value.username.trim(),
          password: userForm.value.password,
          id_role: Number(userForm.value.role_id),
          tenantId: currentTenantId,
          pegawaiId: Number(userForm.value.pegawai_id),
        },
      });
      showToast(`Pengguna baru "${userForm.value.username}" berhasil dibuat`, "success");
    }

    showUserModal.value = false;
    fetchUsers();
  } catch (err: any) {
    console.error("Gagal menyimpan user:", err);
    showToast(err?.data?.message || err?.message || "Gagal menyimpan data pengguna", "error");
  } finally {
    submitLoading.value = false;
  }
};

/* =========================
   TOGGLE STATUS & DELETE USER
========================= */
const handleToggleStatus = async (user: UserItem) => {
  const newStatus = !user.is_active;
  const statusText = newStatus ? "Mengaktifkan" : "Menonaktifkan";

  const confirmResult = await Swal.fire({
    title: `${statusText} Akun?`,
    text: `Apakah Anda yakin ingin ${statusText.toLowerCase()} akun "${user.username}"?`,
    icon: newStatus ? "question" : "warning",
    showCancelButton: true,
    confirmButtonText: `Ya, ${statusText}`,
    cancelButtonText: "Batal",
    customClass: {
      confirmButton: newStatus ? "btn btn-primary rounded-xl px-5 font-bold" : "btn btn-warning rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (!confirmResult.isConfirmed) return;

  try {
    await userService.toggleUserStatus(user.id, newStatus);
    user.is_active = newStatus;
    showToast(`Akun "${user.username}" berhasil di-${newStatus ? 'aktifkan' : 'nonaktifkan'}`, "success");
  } catch (err: any) {
    console.error("Gagal mengubah status user:", err);
    showToast("Gagal mengubah status pengguna", "error");
  }
};

const handleDeleteUser = async (user: UserItem) => {
  const confirmResult = await Swal.fire({
    title: "Hapus Pengguna?",
    text: `Apakah Anda yakin ingin menghapus akun "${user.username}"? Tindakan ini bersifat Soft Delete.`,
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
    await userService.deleteUser(user.id);
    showToast(`Pengguna "${user.username}" berhasil dihapus`, "success");
    fetchUsers();
  } catch (err: any) {
    console.error("Gagal menghapus user:", err);
    showToast("Gagal menghapus pengguna", "error");
  }
};

const handleResetPassword = async (user: UserItem) => {
  const confirmResult = await Swal.fire({
    title: "Reset Password Pengguna?",
    html: `Apakah Anda yakin ingin mereset password pengguna <strong>"${user.username}"</strong>?<br/><br/><span class="text-warning font-bold">Password akan di-reset menjadi default: <code>password123</code></span>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Reset Password",
    cancelButtonText: "Batal",
    customClass: {
      confirmButton: "btn btn-warning rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (!confirmResult.isConfirmed) return;

  try {
    await userService.resetPassword(user.id, "password123");
    await Swal.fire({
      title: "Password Berhasil Di-reset!",
      html: `Password untuk akun <strong>"${user.username}"</strong> telah di-reset menjadi:<br/><br/><div class="bg-base-200 p-3 rounded-xl font-mono text-lg text-primary font-black border border-primary/20">password123</div>`,
      icon: "success",
      confirmButtonText: "Mengerti",
      customClass: {
        confirmButton: "btn btn-primary rounded-xl px-6 font-bold",
      },
    });
  } catch (err: any) {
    console.error("Gagal reset password:", err);
    showToast(err?.data?.message || err?.message || "Gagal mereset password pengguna", "error");
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

const getRoleBadgeClass = (roleName?: string) => {
  if (!roleName) return "bg-base-200 text-base-content/70 border-base-content/10";
  const lower = roleName.toLowerCase();
  if (lower.includes("super") || lower.includes("master")) {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
  }
  if (lower.includes("admin")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
};

onMounted(() => {
  fetchRoleOptions();
  fetchUsers();
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    <!-- ======================================================== -->
    <!-- HEADER SECTION -->
    <!-- ======================================================== -->
    <HeaderSearch 
      title="Manajemen Pengguna" 
      subtitle="Kelola akun pengguna, penetapan role hak akses, dan status keaktifan sistem secara dinamis" 
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
          <span>Tambah Pengguna</span>
        </button>
      </template>
    </HeaderSearch>

    <!-- ======================================================== -->
    <!-- FILTER & CONTROL BAR -->
    <!-- ======================================================== -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-base-100 p-4 rounded-3xl border border-base-content/10 shadow-xs">
      <!-- Status Filter Tabs -->
      <div class="flex items-center gap-1.5 bg-base-200/50 p-1 rounded-2xl w-full sm:w-auto">
        <button 
          class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex-1 sm:flex-initial text-center"
          :class="statusFilter === 'all' ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/60 hover:text-base-content'"
          @click="statusFilter = 'all'"
        >
          Semua User
        </button>
        <button 
          class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex-1 sm:flex-initial text-center flex items-center justify-center gap-1.5"
          :class="statusFilter === 'true' ? 'bg-base-100 text-emerald-600 shadow-sm' : 'text-base-content/60 hover:text-base-content'"
          @click="statusFilter = 'true'"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Aktif</span>
        </button>
        <button 
          class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex-1 sm:flex-initial text-center flex items-center justify-center gap-1.5"
          :class="statusFilter === 'false' ? 'bg-base-100 text-error shadow-sm' : 'text-base-content/60 hover:text-base-content'"
          @click="statusFilter = 'false'"
        >
          <span class="w-2 h-2 rounded-full bg-error"></span>
          <span>Non-Aktif</span>
        </button>
      </div>

      <!-- Quick Info / Refresh -->
      <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <span class="text-xs font-bold text-base-content/60">
          Total: <span class="text-base-content font-extrabold">{{ totalItems }} Pengguna</span>
        </span>

        <button 
          class="btn btn-ghost btn-sm btn-square rounded-xl hover:bg-base-200"
          @click="fetchUsers"
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
            :items="users" 
            :loading="loading" 
            :server-items-length="totalItems"
            v-model:server-options="serverOptions" 
            @update:server-options="updateOptions" 
            buttons-pagination
            :rows-items="[10, 20, 50]"
            table-class-name="customize-easy-table"
          >
            <!-- Column Username Customizer -->
            <template #item-username="item">
              <div class="flex items-center gap-3 py-1">
                <div class="w-9 h-9 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 uppercase text-xs border border-primary/20">
                  {{ item.username ? item.username.substring(0, 2) : 'US' }}
                </div>
                <div>
                  <h4 class="font-extrabold text-sm text-base-content tracking-tight">
                    {{ item.username }}
                  </h4>
                  <span class="text-[11px] font-semibold text-base-content/60 block mt-0.5" v-if="item.pegawai">
                    {{ item.pegawai.name }} (NIP: {{ item.pegawai.nip }})
                  </span>
                  <span class="text-[10px] font-semibold text-base-content/40" v-else>ID: #{{ item.id }}</span>
                </div>
              </div>
            </template>

            <!-- Column Role Customizer -->
            <template #item-role="{ role }">
              <span 
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border shadow-2xs"
                :class="getRoleBadgeClass(role?.name)"
              >
                <ShieldCheck class="w-3.5 h-3.5" />
                <span>{{ role?.name || 'Tanpa Role' }}</span>
              </span>
            </template>

            <!-- Column Status Customizer (Interactive Toggle Switch) -->
            <template #item-is_active="item">
              <div class="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  class="toggle toggle-emerald toggle-sm"
                  :checked="item.is_active"
                  @change="handleToggleStatus(item)"
                  title="Klik untuk mengubah status aktif"
                />
                <span 
                  class="text-xs font-extrabold"
                  :class="item.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-base-content/40'"
                >
                  {{ item.is_active ? 'Aktif' : 'Non-Aktif' }}
                </span>
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
                  class="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-warning hover:bg-warning/10 rounded-xl"
                  @click="handleResetPassword(item)"
                  title="Reset Password (default: password123)"
                >
                  <KeyRound class="w-3.5 h-3.5" />
                </button>

                <button 
                  class="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-primary hover:bg-primary/10 rounded-xl"
                  @click="openEditModal(item)"
                  title="Edit User"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>

                <button 
                  class="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-error hover:bg-error/10 rounded-xl"
                  @click="handleDeleteUser(item)"
                  title="Hapus User"
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
    <!-- MODAL CREATE / EDIT USER -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showUserModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showUserModal = false)">
        <div class="modal-box max-w-md bg-base-100 rounded-3xl border border-base-content/10 p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden">
          <!-- Header (flex-none) -->
          <div class="flex-none pr-8">
            <button 
              class="absolute top-5 right-5 text-base-content/40 hover:text-error transition" 
              @click="showUserModal = false"
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
              {{ isEdit ? "Edit Data Pengguna" : "Tambah Pengguna Baru" }}
            </h3>
          </div>

          <!-- Body (flex-1) -->
          <div class="flex-1 min-h-0 overflow-y-auto pr-1 pb-28 space-y-4">
            <!-- Pegawai Selection -->
            <div v-if="!isEdit">
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Pilih Pegawai <span class="text-error">*</span></span>
                <span v-if="unassignedLoading" class="loading loading-spinner loading-xs text-primary"></span>
              </label>
              <Select2
                v-model="userForm.pegawai_id"
                :options="pegawaiOptions"
                label-key="name"
                value-key="id"
                placeholder="Pilih Pegawai untuk akun ini..."
                :clearable="false"
              />
              <span v-if="userErrors.pegawai_id" class="text-xs text-error font-semibold mt-1 block">
                {{ userErrors.pegawai_id }}
              </span>
            </div>
            <div v-else>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Pegawai Terkait
              </label>
              <input 
                type="text"
                readonly
                :value="userForm.pegawai_name ? `${userForm.pegawai_name} (NIP: ${userForm.pegawai_nip})` : 'Tidak ada pegawai terkait'"
                class="input input-bordered w-full rounded-2xl h-12 bg-base-200 text-base-content/60 font-semibold text-sm cursor-not-allowed" 
              />
            </div>

            <!-- Username Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Username <span class="text-error">*</span>
              </label>
              <input 
                v-model="userForm.username" 
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium text-sm" 
                :class="{'border-error': userErrors.username}" 
                placeholder="Contoh: john_doe" 
              />
              <span v-if="userErrors.username" class="text-xs text-error font-semibold mt-1 block">
                {{ userErrors.username }}
              </span>
            </div>

            <!-- Password Input -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Password <span v-if="!isEdit" class="text-error">*</span>
                <span v-else class="text-base-content/40 font-normal normal-case">(kosongkan jika tidak diubah)</span>
              </label>
              <div class="relative">
                <input 
                  v-model="userForm.password" 
                  type="password"
                  class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 font-medium text-sm pr-10" 
                  :class="{'border-error': userErrors.password}" 
                  placeholder="••••••••" 
                />
                <KeyRound class="w-4 h-4 text-base-content/40 absolute right-3.5 top-4" />
              </div>
              <span v-if="userErrors.password" class="text-xs text-error font-semibold mt-1 block">
                {{ userErrors.password }}
              </span>
            </div>

            <!-- Role Selection (Select2) -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">
                Role Hak Akses <span class="text-error">*</span>
              </label>
              <Select2
                v-model="userForm.role_id"
                :options="roleOptions"
                label-key="name"
                value-key="id"
                placeholder="Pilih Role Pengguna..."
                :clearable="false"
              />
              <span v-if="userErrors.role_id" class="text-xs text-error font-semibold mt-1 block">
                {{ userErrors.role_id }}
              </span>
            </div>

            <!-- Active Status Radio -->
            <div class="pt-2">
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">
                Status Keaktifan Akun
              </label>
              <div class="flex items-center gap-4 bg-base-200/40 p-3 rounded-2xl border border-base-content/10">
                <label class="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-base-content">
                  <input type="radio" :value="true" v-model="userForm.is_active" class="radio radio-primary radio-sm" />
                  <span class="text-emerald-600">Aktif</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-base-content">
                  <input type="radio" :value="false" v-model="userForm.is_active" class="radio radio-error radio-sm" />
                  <span class="text-error">Non-Aktif</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Footer (flex-none) -->
          <div class="flex-none modal-action gap-3 mt-6">
            <button class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6" @click="showUserModal = false" :disabled="submitLoading">
              Batal
            </button>
            <button class="btn btn-primary rounded-2xl font-bold px-7 shadow-lg shadow-primary/30 flex items-center gap-2" @click="submitUser" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              {{ isEdit ? "Simpan Perubahan" : "Buat Pengguna" }}
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
