<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { MenuService, type MenuItem } from "@/services/menu.service";
import HeaderSearch from "@/components/header-master.vue";
import Swal from "sweetalert2";
import * as icons from "lucide-vue-next";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Folder,
  Menu as MenuIcon,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Layers,
  ShieldAlert,
  Hash,
  Link as LinkIcon
} from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import { useMenuStore } from "@/stores/menu";

definePageMeta({ layout: "admin" });

const { showToast } = useToast();
const menuService = MenuService();
const menuStore = useMenuStore();

/* =========================
   STATE
========================= */
const items = ref<MenuItem[]>([]);
const loading = ref(false);
const search = ref("");
const expandedParentIds = ref<number[]>([]);

/* =========================
   MODAL & FORM STATE
========================= */
const showModal = ref(false);
const modalLoading = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);
const selectedId = ref<number | null>(null);

const form = ref<Partial<MenuItem>>({
  name: "",
  url: "",
  icon: "",
  order_no: 1,
  parent_id: undefined,
  requiredResource: "",
  is_active: true,
  is_visible: true,
});

const formErrors = ref({
  name: "",
  url: "",
});

// DYNAMIC FULL LUCIDE ICON LIST (Extracts ALL 1,000+ Lucide icons automatically)
const allLucideIconNames = computed(() => {
  return Object.keys(icons).filter((key) => {
    return (
      key !== 'createLucideIcon' &&
      key !== 'default' &&
      key !== 'icons' &&
      typeof (icons as any)[key] !== 'undefined'
    );
  });
});

const iconSearchText = ref("");
const displayIconLimit = ref(72);

const totalMatchingIcons = computed(() => {
  const query = iconSearchText.value.toLowerCase().trim();
  if (!query) return allLucideIconNames.value.length;

  const searchAliasMap: Record<string, string[]> = {
    dashboard: ["layoutdashboard", "grid", "gauge"],
    user: ["users", "user", "usercheck", "userplus", "shieldcheck"],
    users: ["users", "user", "group"],
    pengguna: ["users", "user"],
    settings: ["settings", "sliders", "cog", "wrench"],
    pengaturan: ["settings", "sliders", "cog", "wrench"],
    barang: ["package", "box", "boxes", "shoppingbag", "shoppingcart", "store"],
    produk: ["package", "box", "boxes", "shoppingbag", "shoppingcart"],
    foto: ["image", "images", "camera", "picture", "photo", "film"],
    gallery: ["images", "image", "camera", "picture", "photo"],
    gambar: ["image", "images", "camera", "picture", "photo"],
    folder: ["folder", "folderplus", "folderopen"],
    laporan: ["filetext", "file", "document", "clipboard", "barchart", "barchart3"],
    perusahaan: ["building", "building2", "store", "factory"],
    role: ["shieldcheck", "shield", "lock", "key", "usercheck"],
    hakakses: ["shieldcheck", "shield", "lock", "key"],
    menu: ["menu", "layers", "list", "layout"],
  };

  const aliasMatches = searchAliasMap[query] || [];

  return allLucideIconNames.value.filter((name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes(query)) return true;
    if (aliasMatches.some((alias) => lowerName.includes(alias))) return true;
    return false;
  }).length;
});

const filteredDynamicIconList = computed(() => {
  const query = iconSearchText.value.toLowerCase().trim();
  let list = allLucideIconNames.value;

  if (query) {
    const searchAliasMap: Record<string, string[]> = {
      dashboard: ["layoutdashboard", "grid", "gauge"],
      user: ["users", "user", "usercheck", "userplus", "shieldcheck"],
      users: ["users", "user", "group"],
      pengguna: ["users", "user"],
      settings: ["settings", "sliders", "cog", "wrench"],
      pengaturan: ["settings", "sliders", "cog", "wrench"],
      barang: ["package", "box", "boxes", "shoppingbag", "shoppingcart", "store"],
      produk: ["package", "box", "boxes", "shoppingbag", "shoppingcart"],
      foto: ["image", "images", "camera", "picture", "photo", "film"],
      gallery: ["images", "image", "camera", "picture", "photo"],
      gambar: ["image", "images", "camera", "picture", "photo"],
      folder: ["folder", "folderplus", "folderopen"],
      laporan: ["filetext", "file", "document", "clipboard", "barchart", "barchart3"],
      perusahaan: ["building", "building2", "store", "factory"],
      role: ["shieldcheck", "shield", "lock", "key", "usercheck"],
      hakakses: ["shieldcheck", "shield", "lock", "key"],
      menu: ["menu", "layers", "list", "layout"],
    };

    const aliasMatches = searchAliasMap[query] || [];

    list = allLucideIconNames.value.filter((name) => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes(query)) return true;
      if (aliasMatches.some((alias) => lowerName.includes(alias))) return true;
      return false;
    });
  }

  return list.slice(0, displayIconLimit.value);
});

const loadMoreIcons = () => {
  displayIconLimit.value += 72;
};

// Common Resource Key suggestions
const resourcePresets = ["Menu", "User", "Role", "Barang", "Gallery", "Album"];

/* =========================
   COMPUTED & FILTERING
========================= */
const rootMenus = computed(() => {
  return items.value;
});

const parentMenuOptions = computed(() => {
  // Flat list of menus that can act as parent (top-level or non-nested)
  return items.value.map((m) => ({
    id: m.id,
    name: m.name,
  }));
});

const filteredItems = computed(() => {
  if (!search.value) return items.value;
  const s = search.value.toLowerCase();

  const filterTree = (nodes: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];
    for (const node of nodes) {
      const matchSelf =
        node.name.toLowerCase().includes(s) ||
        (node.url && node.url.toLowerCase().includes(s)) ||
        (node.requiredResource && node.requiredResource.toLowerCase().includes(s));

      const matchingChildren = node.children ? filterTree(node.children) : [];

      if (matchSelf || matchingChildren.length > 0) {
        result.push({
          ...node,
          children: matchingChildren.length > 0 ? matchingChildren : node.children,
        });
      }
    }
    return result;
  };

  return filterTree(items.value);
});

const totalMenuCount = computed(() => {
  const countNodes = (nodes: MenuItem[]): number => {
    return nodes.reduce((acc, node) => {
      return acc + 1 + (node.children ? countNodes(node.children) : 0);
    }, 0);
  };
  return countNodes(items.value);
});

/* =========================
   HELPER & TREE EXPANSION
========================= */
const toggleExpand = (id: number) => {
  const idx = expandedParentIds.value.indexOf(id);
  if (idx > -1) {
    expandedParentIds.value.splice(idx, 1);
  } else {
    expandedParentIds.value.push(id);
  }
};

const isExpanded = (id: number) => {
  return expandedParentIds.value.includes(id);
};

// Normalizer component helper untuk Lucide icons (Case-insensitive & Aliases)
const getIconComponent = (iconName?: string | null) => {
  if (!iconName || !iconName.trim()) return icons.Circle;

  const raw = iconName.trim();
  const cleanName = raw.replace(/[-_]/g, "").toLowerCase();

  // Custom Aliases mapping untuk nama populer/legacy
  const aliases: Record<string, string> = {
    dashboard: "LayoutDashboard",
    layoutdashboard: "LayoutDashboard",
    users: "Users",
    user: "User",
    settings: "Settings",
    setting: "Settings",
    picture: "Image",
    gallery: "Images",
    image: "Image",
    photo: "Image",
    role: "ShieldCheck",
    roles: "ShieldCheck",
    menus: "Menu",
    menu: "Menu",
    boxicon: "Package",
    box: "Package",
    barang: "Package",
    plus: "Plus",
    folder: "Folder",
    layers: "Layers",
    company: "Building2",
    perusahaan: "Building2",
  };

  if (aliases[cleanName] && (icons as any)[aliases[cleanName]]) {
    return (icons as any)[aliases[cleanName]];
  }

  // Direct match di objek icons (PascalCase)
  if ((icons as any)[raw]) {
    return (icons as any)[raw];
  }

  // Search case-insensitive match
  const foundKey = Object.keys(icons).find(
    (k) => k.toLowerCase() === cleanName || k.replace(/[-_]/g, "").toLowerCase() === cleanName
  );

  if (foundKey) {
    return (icons as any)[foundKey];
  }

  return icons.Circle;
};

/* =========================
   FETCH DATA
========================= */
const fetchMenus = async () => {
  loading.value = true;
  try {
    const data = await menuService.getMenus();
    items.value = data;
    // Auto expand all parent menus by default for convenient viewing
    expandedParentIds.value = data.map((m) => m.id!).filter(Boolean);
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil data menu", "error");
  } finally {
    loading.value = false;
  }
};

/* =========================
   FORM VALIDATION & RESET
========================= */
const validateForm = () => {
  let isValid = true;
  formErrors.value = { name: "", url: "" };

  if (!form.value.name?.trim()) {
    formErrors.value.name = "Nama menu wajib diisi";
    isValid = false;
  }

  return isValid;
};

const resetForm = () => {
  form.value = {
    name: "",
    url: "",
    icon: "",
    order_no: 1,
    parent_id: undefined,
    requiredResource: "",
    is_active: true,
    is_visible: true,
  };
  formErrors.value = { name: "", url: "" };
  isEdit.value = false;
  selectedId.value = null;
};

/* =========================
   CRUD ACTIONS
========================= */
const openCreateModal = (parentId?: number) => {
  resetForm();
  if (parentId) {
    form.value.parent_id = parentId;
  }
  showModal.value = true;
};

const openEditModal = async (item: MenuItem) => {
  if (!item.id) return;
  showModal.value = true;
  modalLoading.value = true;
  try {
    const res = await menuService.getMenuById(item.id);
    form.value = {
      name: res.name,
      url: res.url || "",
      icon: res.icon || "",
      order_no: res.order_no || 1,
      parent_id: res.parent?.id || (res as any).parent_id || undefined,
      requiredResource: res.requiredResource || "",
      is_active: res.is_active ?? true,
      is_visible: res.is_visible ?? true,
    };
    selectedId.value = item.id;
    isEdit.value = true;
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil detail menu", "error");
    showModal.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const submitMenu = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const payload = {
      name: form.value.name,
      url: form.value.url || "",
      icon: form.value.icon || undefined,
      order_no: Number(form.value.order_no) || 1,
      parent_id: form.value.parent_id ? Number(form.value.parent_id) : undefined,
      requiredResource: form.value.requiredResource || undefined,
      is_active: form.value.is_active,
      is_visible: form.value.is_visible,
    };

    if (isEdit.value && selectedId.value) {
      await menuService.updateMenu(selectedId.value, payload);
      showToast("Menu berhasil diperbarui", "success");
    } else {
      await menuService.createMenu(payload);
      showToast("Menu berhasil ditambahkan", "success");
    }

    showModal.value = false;
    resetForm();
    await fetchMenus();
    // Refresh sidebar menu store dynamically
    await menuStore.fetchMenus();
  } catch (err: any) {
    console.error(err);
    const msg = err?.data?.message || "Terjadi kesalahan server saat menyimpan menu";
    showToast(typeof msg === "string" ? msg : "Gagal menyimpan menu", "error");
  } finally {
    submitLoading.value = false;
  }
};

const deleteMenu = async (item: MenuItem) => {
  if (!item.id) return;

  const hasChildren = item.children && item.children.length > 0;
  const warningText = hasChildren
    ? `Menu "${item.name}" memiliki ${item.children.length} submenu yang akan ikut terhapus.`
    : `Menu "${item.name}" akan dihapus permanen.`;

  const result = await Swal.fire({
    title: "Hapus Menu?",
    text: warningText,
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
    await menuService.deleteMenu(item.id);
    showToast("Menu berhasil dihapus", "success");
    await fetchMenus();
    // Refresh sidebar menu store dynamically
    await menuStore.fetchMenus();
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus menu", "error");
  }
};

onMounted(() => {
  fetchMenus();
});
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER SEARCH -->
    <HeaderSearch
      title="Manajemen Menu"
      subtitle="Kelola struktur menu navigasi, URL route, dan resource permission aplikasi"
      :total="totalMenuCount"
      v-model:search="search"
      @search="() => {}"
      @add="openCreateModal()"
    />

    <!-- CONTENT CARD -->
    <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-premium min-h-[500px]">
      <!-- LOADING SKELETON -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="h-16 bg-base-200 rounded-2xl animate-pulse"></div>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-else-if="filteredItems.length === 0"
        class="py-24 text-center bg-base-200/30 rounded-3xl border border-dashed border-base-content/15"
      >
        <div class="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Layers class="w-10 h-10" />
        </div>
        <h3 class="font-bold text-base-content text-xl mb-1">Belum Ada Menu</h3>
        <p class="text-base-content/60 text-sm max-w-md mx-auto mb-6">
          Tambahkan menu navigasi pertama Anda untuk mengatur struktur halaman sistem.
        </p>
        <button class="btn btn-primary rounded-xl px-8 shadow-md shadow-primary/20" @click="openCreateModal()">
          + Tambah Menu Baru
        </button>
      </div>

      <!-- TABLE LIST -->
      <div v-else class="overflow-x-auto">
        <table class="table w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr class="text-xs uppercase tracking-wider text-base-content/50 border-b border-base-content/5 pb-3">
              <th class="py-3 px-4">Nama Menu & Icon</th>
              <th class="py-3 px-4">URL Route</th>
              <th class="py-3 px-4">Resource Key</th>
              <th class="py-3 px-4 text-center">Urutan</th>
              <th class="py-3 px-4 text-center">Status</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <!-- LOOP PARENT MENU -->
            <template v-for="menu in filteredItems" :key="menu.id">
              <!-- PARENT ROW -->
              <tr class="bg-base-200/40 hover:bg-base-200/80 transition-all rounded-2xl group border border-base-content/5">
                <!-- Name & Icon -->
                <td class="py-4 px-4 rounded-l-2xl">
                  <div class="flex items-center gap-3">
                    <button
                      v-if="menu.children && menu.children.length > 0"
                      @click="toggleExpand(menu.id!)"
                      class="w-7 h-7 rounded-lg bg-base-100 border border-base-content/10 flex items-center justify-center text-base-content/60 hover:text-primary transition"
                    >
                      <component
                        :is="isExpanded(menu.id!) ? ChevronDown : ChevronRight"
                        class="w-4 h-4"
                      />
                    </button>
                    <div v-else class="w-7 h-7"></div>

                    <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner">
                      <component :is="getIconComponent(menu.icon)" class="w-5 h-5" />
                    </div>

                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-base-content text-base">{{ menu.name }}</span>
                        <span class="badge badge-primary badge-outline text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Parent
                        </span>
                        <span v-if="menu.children && menu.children.length > 0" class="text-xs text-base-content/50 font-medium">
                          ({{ menu.children.length }} Submenu)
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- URL -->
                <td class="py-4 px-4">
                  <span v-if="menu.url" class="font-mono text-xs bg-base-100 text-primary font-semibold px-2.5 py-1 rounded-lg border border-base-content/10 inline-flex items-center gap-1.5">
                    <LinkIcon class="w-3.5 h-3.5 text-primary/60" />
                    {{ menu.url }}
                  </span>
                  <span v-else class="text-xs text-base-content/40 italic">Tidak Ada (Header Group)</span>
                </td>

                <!-- Required Resource -->
                <td class="py-4 px-4">
                  <span v-if="menu.requiredResource" class="badge badge-secondary badge-soft text-xs font-semibold px-2.5 py-1 rounded-lg">
                    <ShieldAlert class="w-3 h-3 mr-1" />
                    {{ menu.requiredResource }}
                  </span>
                  <span v-else class="text-xs text-base-content/40">Public / General</span>
                </td>

                <!-- Order No -->
                <td class="py-4 px-4 text-center">
                  <span class="bg-base-100 border border-base-content/10 px-2.5 py-1 rounded-lg text-xs font-bold text-base-content">
                    #{{ menu.order_no ?? 1 }}
                  </span>
                </td>

                <!-- Status -->
                <td class="py-4 px-4 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <span
                      class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                      :class="menu.is_active ? 'bg-success/15 text-success' : 'bg-error/15 text-error'"
                    >
                      <component :is="menu.is_active ? CheckCircle : XCircle" class="w-3.5 h-3.5" />
                      {{ menu.is_active ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="py-4 px-4 text-right rounded-r-2xl">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      class="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg font-bold gap-1"
                      @click="openCreateModal(menu.id)"
                      title="Tambah Submenu"
                    >
                      <Plus class="w-3.5 h-3.5" />
                      Submenu
                    </button>
                    <button
                      class="w-8 h-8 rounded-lg bg-base-100 border border-base-content/10 text-base-content/70 hover:bg-info hover:text-white transition flex items-center justify-center shadow-xs"
                      @click="openEditModal(menu)"
                      title="Edit Menu"
                    >
                      <Pencil class="w-4 h-4" />
                    </button>
                    <button
                      class="w-8 h-8 rounded-lg bg-base-100 border border-base-content/10 text-base-content/70 hover:bg-error hover:text-white transition flex items-center justify-center shadow-xs"
                      @click="deleteMenu(menu)"
                      title="Hapus Menu"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <!-- LOOP CHILDREN SUBMENUS -->
              <template v-if="menu.children && menu.children.length > 0 && isExpanded(menu.id!)">
                <tr
                  v-for="child in menu.children"
                  :key="child.id"
                  class="bg-base-100 hover:bg-base-200/50 transition-all rounded-xl border-l-4 border-l-primary/40"
                >
                  <!-- Name & Icon Submenu -->
                  <td class="py-3 px-4 pl-12">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-base-200 text-base-content/70 flex items-center justify-center text-xs">
                        <component :is="getIconComponent(child.icon)" class="w-4 h-4" />
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-base-content text-sm">{{ child.name }}</span>
                          <span class="badge badge-neutral text-[10px] font-medium px-2 py-0.5 rounded-md">
                            Submenu
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- URL -->
                  <td class="py-3 px-4">
                    <span v-if="child.url" class="font-mono text-xs text-base-content/80 font-medium">
                      {{ child.url }}
                    </span>
                    <span v-else class="text-xs text-base-content/40 italic">-</span>
                  </td>

                  <!-- Required Resource -->
                  <td class="py-3 px-4">
                    <span v-if="child.requiredResource" class="badge badge-outline badge-secondary text-xs font-medium px-2 py-0.5 rounded-md">
                      {{ child.requiredResource }}
                    </span>
                    <span v-else class="text-xs text-base-content/40">-</span>
                  </td>

                  <!-- Order No -->
                  <td class="py-3 px-4 text-center text-xs font-medium text-base-content/70">
                    #{{ child.order_no ?? 1 }}
                  </td>

                  <!-- Status -->
                  <td class="py-3 px-4 text-center">
                    <span
                      class="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      :class="child.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
                    >
                      {{ child.is_active ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        class="w-7 h-7 rounded-lg bg-base-200 text-base-content/70 hover:bg-info hover:text-white transition flex items-center justify-center"
                        @click="openEditModal(child)"
                        title="Edit Submenu"
                      >
                        <Pencil class="w-3.5 h-3.5" />
                      </button>
                      <button
                        class="w-7 h-7 rounded-lg bg-base-200 text-base-content/70 hover:bg-error hover:text-white transition flex items-center justify-center"
                        @click="deleteMenu(child)"
                        title="Hapus Submenu"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL FORM CREATE / EDIT -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" v-model="showModal" />
      <div class="modal backdrop-blur-md bg-slate-950/40" @click.self="!submitLoading && (showModal = false)">
        <div class="modal-box max-w-xl bg-base-100 rounded-3xl border border-base-content/10 p-8 shadow-2xl relative text-base-content">
          <!-- CLOSE BUTTON -->
          <button
            class="absolute top-6 right-6 text-base-content/40 hover:text-error hover:rotate-90 transition-all duration-300"
            @click="showModal = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- MODAL TITLE -->
          <h3 class="font-extrabold text-base-content text-2xl tracking-tight mb-6 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers class="w-5 h-5" />
            </div>
            {{ isEdit ? "Edit Menu Navigasi" : "Tambah Menu Navigasi Baru" }}
          </h3>

          <!-- LOADING SKELETON -->
          <div v-if="modalLoading" class="space-y-4 animate-pulse">
            <div class="h-12 bg-base-200 rounded-2xl w-full"></div>
            <div class="h-12 bg-base-200 rounded-2xl w-full"></div>
            <div class="h-12 bg-base-200 rounded-2xl w-full"></div>
          </div>

          <!-- FORM BODY -->
          <div v-else class="space-y-5">
            <!-- NAMA MENU -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">
                Nama Menu <span class="text-error">*</span>
              </label>
              <input
                v-model="form.name"
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 font-medium text-sm"
                :class="{ 'border-error': formErrors.name }"
                placeholder="Cth: Data Barang, Gallery, User Management"
              />
              <span v-if="formErrors.name" class="text-xs text-error font-semibold mt-1.5 block">
                {{ formErrors.name }}
              </span>
            </div>

            <!-- URL ROUTE -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">
                URL Route <span class="text-base-content/40 font-normal normal-case">(kosongkan jika parent)</span>
              </label>
              <div class="relative">
                <LinkIcon class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                <input
                  v-model="form.url"
                  class="input input-bordered w-full pl-10 rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 font-mono text-sm"
                  placeholder="Cth: /barang/listtable atau /gallery"
                />
              </div>
            </div>

            <!-- PARENT MENU & ORDER NO -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">
                  Parent Menu
                </label>
                <select
                  v-model="form.parent_id"
                  class="select select-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 text-sm font-medium"
                >
                  <option :value="undefined">Tanpa Parent (Top Level)</option>
                  <option v-for="opt in parentMenuOptions" :key="opt.id" :value="opt.id">
                    {{ opt.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">
                  Urutan (Order No)
                </label>
                <input
                  v-model.number="form.order_no"
                  type="number"
                  min="1"
                  class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 font-medium text-sm"
                  placeholder="1"
                />
              </div>
            </div>

            <!-- DYNAMIC FULL LUCIDE ICON SELECTOR & LIVE SEARCH -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider">
                  Pilih Icon Navigasi <span class="text-base-content/40 font-normal normal-case">(Bebas pilih dari {{ allLucideIconNames.length }}+ Ikon Lucide)</span>
                </label>
                <span class="text-[11px] text-primary font-bold">
                  {{ totalMatchingIcons }} Ikon Ditemukan
                </span>
              </div>
              
              <!-- Input & Live Preview -->
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                  <component :is="getIconComponent(form.icon)" class="w-6 h-6" />
                </div>
                <div class="relative w-full">
                  <input
                    v-model="form.icon"
                    class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 font-mono text-sm"
                    placeholder="Ketik nama ikon (cth: LayoutDashboard, Users, Package, Settings, Camera)..."
                  />
                  <button
                    v-if="form.icon"
                    type="button"
                    @click="form.icon = ''"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-base-content/40 hover:text-error font-bold"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <!-- Live Search Filter Input -->
              <div class="relative mt-2">
                <input
                  v-model="iconSearchText"
                  type="text"
                  class="input input-bordered input-sm w-full pl-8 rounded-xl text-xs bg-base-200/60 focus:bg-base-100 transition"
                  placeholder="Cari dari seluruh perpustakaan ikon Lucide (cth: user, chart, mail, arrow, check, edit, lock, wifi)..."
                />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                </svg>
              </div>

              <!-- Dynamic Interactive Icon Grid -->
              <div class="p-3 bg-base-200/40 border border-base-content/10 rounded-2xl max-h-52 overflow-y-auto space-y-3">
                <div v-if="filteredDynamicIconList.length > 0" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  <button
                    v-for="iconName in filteredDynamicIconList"
                    :key="iconName"
                    type="button"
                    @click="form.icon = iconName"
                    class="flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 group"
                    :class="form.icon === iconName || (form.icon && getIconComponent(form.icon) === getIconComponent(iconName))
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105' 
                      : 'bg-base-100 border-base-content/10 hover:bg-primary/10 hover:border-primary/40 text-base-content/80'"
                    :title="iconName"
                  >
                    <component :is="getIconComponent(iconName)" class="w-4 h-4 mb-1" />
                    <span class="text-[9px] font-mono font-medium truncate w-full text-center">{{ iconName }}</span>
                  </button>
                </div>
                <div v-else class="text-center py-6 text-xs text-base-content/50 italic">
                  Tidak ada ikon Lucide yang cocok dengan kata kunci "{{ iconSearchText }}". Ketik nama ikon secara manual di atas.
                </div>

                <!-- Load More Button -->
                <div v-if="filteredDynamicIconList.length < totalMatchingIcons" class="text-center pt-1">
                  <button
                    type="button"
                    @click="loadMoreIcons"
                    class="btn btn-xs btn-ghost text-xs text-primary font-bold hover:bg-primary/10 rounded-lg"
                  >
                    + Muat Lebih Banyak Ikon (Tersisa {{ totalMatchingIcons - filteredDynamicIconList.length }})
                  </button>
                </div>
              </div>
            </div>

            <!-- REQUIRED RESOURCE (RBAC PERMISSION) -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-2">
                Required Resource Key <span class="text-base-content/40 font-normal normal-case">(Otorisasi Akses RBAC)</span>
              </label>
              <input
                v-model="form.requiredResource"
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 bg-base-100 font-mono text-sm"
                placeholder="Cth: Menu, Barang, Gallery, User, Role"
              />
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span class="text-xs text-base-content/50 font-medium self-center mr-1">Pilihan:</span>
                <button
                  v-for="resKey in resourcePresets"
                  :key="resKey"
                  type="button"
                  @click="form.requiredResource = resKey"
                  class="btn btn-xs btn-ghost border border-base-content/10 rounded-lg text-xs hover:bg-secondary/10 hover:text-secondary font-mono"
                  :class="{ 'bg-secondary/15 text-secondary border-secondary': form.requiredResource === resKey }"
                >
                  {{ resKey }}
                </button>
              </div>
            </div>

            <!-- STATUS TOGGLES -->
            <div class="grid grid-cols-2 gap-4 pt-2 border-t border-base-content/10">
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" v-model="form.is_active" class="toggle toggle-primary toggle-sm" />
                <span class="text-xs font-bold text-base-content">Status Aktif</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" v-model="form.is_visible" class="toggle toggle-primary toggle-sm" />
                <span class="text-xs font-bold text-base-content">Tampilkan di Sidebar</span>
              </label>
            </div>
          </div>

          <!-- MODAL ACTIONS -->
          <div v-if="!modalLoading" class="modal-action gap-3 mt-8">
            <button
              class="btn btn-ghost hover:bg-base-200 rounded-2xl font-bold px-6"
              @click="showModal = false"
              :disabled="submitLoading"
            >
              Batal
            </button>
            <button
              class="btn btn-primary rounded-2xl font-bold px-8 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 flex items-center gap-2"
              @click="submitMenu"
              :disabled="submitLoading"
            >
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              {{ isEdit ? "Simpan Perubahan" : "Buat Menu" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
