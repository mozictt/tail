<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useMenuStore } from "@/stores/menu";
import { useHead } from "#imports";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const ui = useUIStore();
const menuStore = useMenuStore();

const emit = defineEmits(["update-active"]);

// ===== STATE =====
const isOpen = ref(true); // desktop
const isMobile = ref(false);

const menu = computed(() => menuStore.menus);
const openSubmenu = ref<string | null>(null);
const activeMenuName = ref("Menu");

// 👉 FIX: pakai store langsung
const isMobileOpen = computed(() => ui.isMobileSidebarOpen);

// ===== PROFILE =====
const profileDropdownOpen = ref(false);

const toggleProfileDropdown = () => {
  profileDropdownOpen.value = !profileDropdownOpen.value;
};

const closeProfileDropdown = () => {
  profileDropdownOpen.value = false;
};

const handleLogout = async () => {
  menuStore.clearMenus(); // Clear menus on logout
  await auth.logout();
  closeProfileDropdown();
};

// ===== RESPONSIVE =====
const checkScreen = () => {
  isMobile.value = window.innerWidth < 768;
};

// ===== SIDEBAR CONTROL =====
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) profileDropdownOpen.value = false;
};

// 👉 FIX MOBILE SIDEBAR
const toggleMobileSidebar = () => {
  ui.toggleMobileSidebar();
};

const closeMobileSidebar = () => {
  ui.closeMobileSidebar();
};

defineExpose({
  toggleMobileSidebar,
});

const isActive = (path: string) => {
  if (!path) return false;
  return route.path === path || route.path.startsWith(path + "/");
};

const isParentActive = (children: any[]) =>
  children && children.some((c) => isActive(c.url || c.path));

const findActiveMenu = (items: any[]): any | null => {
  for (const item of items) {
    const itemPath = item.url || item.path;
    if (itemPath && isActive(itemPath)) return item;
    if (item.children && item.children.length > 0) {
      const child = findActiveMenu(item.children);
      if (child) return child;
    }
  }
  return null;
};

const updateActiveMenu = () => {
  const active = findActiveMenu(menu.value);
  if (active) {
    activeMenuName.value = active.name;
    emit("update-active", active);
  } else {
    activeMenuName.value = "Menu";
    emit("update-active", null);
  }
};

const toggleSubmenu = (name: string) => {
  openSubmenu.value = openSubmenu.value === name ? null : name;
};

const handleMenuClick = (item: any) => {
  if (item.children && item.children.length > 0) {
     isOpen.value = true;
    toggleSubmenu(item.name);
  } else {
    // 👉 AUTO CLOSE MOBILE SIDEBAR
    if (isMobile.value) {
      closeMobileSidebar();
    }
  }
};

// ===== LIFECYCLE =====
onMounted(async () => {
  if (!menuStore.hasFetched && auth.id_role) {
    await menuStore.fetchMenus();
  }

  checkScreen();
  window.addEventListener("resize", checkScreen);

  menu.value.forEach((item: any) => {
    if (item.children?.some((c: any) => isActive(c.url || c.path))) {
      openSubmenu.value = item.name;
    }
  });

  updateActiveMenu();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreen);
});

// ===== WATCH =====
watch(isOpen, (val) => {
  if (!val) openSubmenu.value = null;
});

watch(
  () => route.path,
  () => {
    updateActiveMenu();
    if (isMobile.value) closeMobileSidebar();
  },
  { immediate: true }
);

// ===== TITLE =====
const config = useRuntimeConfig();

useHead(() => ({
  title: activeMenuName.value
    ? `${activeMenuName.value} - ${config.public.appName}`
    : config.public.appName,
}));
// ===== SIDEBAR WIDTH =====
const sidebarWidthClass = computed(() => {
  if (isMobile.value) return 'w-64'; // mobile selalu full
  return isOpen.value ? 'w-64' : 'w-20'; // desktop toggle
});
watch(isMobile, (val) => {
  if (val) {
    // MOBILE → selalu terbuka
    isOpen.value = true;
  }
});
</script>
<template>
  <!-- OVERLAY -->
  <Transition name="fade">
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-30 md:hidden"
      @click="closeMobileSidebar"
    />
  </Transition>

  <!-- SIDEBAR -->
  <aside
    :class="[
      'h-screen flex flex-col fixed md:static z-40 transition-all duration-300 border-r border-base-content/10 bg-base-100',
      isOpen ? 'w-64' : 'w-20',
      isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
  >
    <!-- HEADER BRANDING -->
    <div class="flex items-center justify-between p-5 border-b border-base-content/5">
      <div v-if="isOpen" class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content shadow-md shadow-primary/20">
          <icons.Layers class="w-5 h-5" />
        </div>
        <span class="font-bold text-base-content text-lg tracking-tight">Admin Panel</span>
      </div>
      <div v-else class="w-full flex justify-center">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content shadow-md">
          <icons.Layers class="w-5 h-5" />
        </div>
      </div>
      
      <button class="hidden md:inline-flex text-base-content/40 hover:text-base-content/80 hover:bg-base-200 p-1.5 rounded-lg transition" @click="toggleSidebar">
        <component :is="isOpen ? icons.ChevronLeft : icons.Menu" class="w-4 h-4" />
      </button>
    </div>

    <!-- MENU LIST -->
    <nav class="flex flex-col gap-1.5 p-4 overflow-y-auto flex-1 min-h-0">
      <div v-for="(item, idx) in menu" :key="idx">
        <!-- SINGLE MENU -->
        <NuxtLink
          v-if="!item.children || item.children.length === 0"
          :to="item.url || item.path"
          @click="handleMenuClick(item)"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm text-base-content/70 hover:bg-base-200 hover:text-base-content"
          :class="
            isActive(item.url || item.path)
              ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary shadow-sm'
              : ''
          "
        >
          <component :is="icons[item.icon as keyof typeof icons] || icons.Circle" class="w-5 h-5" :class="isActive(item.url || item.path) ? 'text-primary' : 'text-base-content/40'" />
          <span v-if="isOpen">{{ item.name }}</span>
        </NuxtLink>

        <!-- PARENT MENU (WITH SUBMENU) -->
        <div
          v-else
          @click="handleMenuClick(item)"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 font-medium text-sm text-base-content/70 hover:bg-base-200 hover:text-base-content"
          :class="
            isParentActive(item.children)
              ? 'bg-base-200/50 text-base-content'
              : ''
          "
        >
          <component :is="icons[item.icon as keyof typeof icons] || icons.Folder" class="w-5 h-5" :class="isParentActive(item.children) ? 'text-primary' : 'text-base-content/40'" />
          <span v-if="isOpen" class="flex-1">{{ item.name }}</span>

          <icons.ChevronDown
            v-if="isOpen"
            :class="{ 'rotate-180 text-primary': openSubmenu === item.name }"
            class="w-4 h-4 transition-transform text-base-content/40"
          />
        </div>

        <!-- SUBMENU SECTION -->
        <div
          v-if="item.children && item.children.length > 0 && openSubmenu === item.name && isOpen"
          class="pl-9 mt-1 space-y-1 relative before:absolute before:left-5 before:top-0 before:bottom-0 before:w-0.5 before:bg-base-200"
        >
          <NuxtLink
            v-for="(child, i) in item.children"
            :key="i"
            :to="child.url || child.path"
            @click="handleMenuClick(child)"
            class="block py-2 text-sm rounded-lg px-3 transition-all font-medium text-base-content/60 hover:text-base-content hover:bg-base-200"
            :class="
              isActive(child.url || child.path)
                ? 'text-primary bg-primary/5 hover:text-primary hover:bg-primary/10'
                : ''
            "
          >
            {{ child.name }}
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- FOOTER PROFILE -->
    <div class="p-4 border-t border-base-content/5 relative bg-base-100">
      <div
        class="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-base-200 transition"
        @click="toggleProfileDropdown"
      >
        <div class="relative">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop"
            class="w-10 h-10 rounded-xl object-cover ring-2 ring-base-200"
          />
          <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-base-100"></span>
        </div>

        <div v-if="isOpen" class="flex flex-col flex-1 min-w-0">
          <span class="font-semibold text-base-content text-sm truncate">John Doe</span>
          <span class="text-xs text-base-content/50 truncate font-medium">Administrator</span>
        </div>

        <icons.ChevronDown
          v-if="isOpen"
          class="w-4 h-4 ml-auto text-base-content/40 transition-transform"
          :class="{ 'rotate-180': profileDropdownOpen }"
        />
      </div>

      <!-- PROFIL DROPDOWN MENU -->
      <Transition name="fade">
        <div
          v-if="profileDropdownOpen"
          class="absolute bottom-16 left-4 right-4 bg-base-100 border border-base-content/10 shadow-premium rounded-xl py-2 z-20"
        >
          <NuxtLink
            to="/settings/profile"
            class="flex items-center gap-2.5 px-4 py-2 text-sm text-base-content/80 hover:bg-base-200 hover:text-base-content transition font-medium"
            @click="closeProfileDropdown"
          >
            <icons.User class="w-4 h-4 text-base-content/40" />
            Profile
          </NuxtLink>
          <NuxtLink
            to="/settings/security"
            class="flex items-center gap-2.5 px-4 py-2 text-sm text-base-content/80 hover:bg-base-200 hover:text-base-content transition font-medium"
            @click="closeProfileDropdown"
          >
            <icons.Settings class="w-4 h-4 text-base-content/40" />
            Security
          </NuxtLink>
          <div class="border-t border-base-content/5 my-1"></div>
          <button
            @click="handleLogout"
            class="flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 w-full text-left transition font-semibold"
          >
            <icons.LogOut class="w-4 h-4" />
            Logout
          </button>
        </div>
      </Transition>
    </div>
  </aside>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>