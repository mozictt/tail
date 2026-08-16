<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useMenuStore } from "@/stores/menu";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useHead } from "#imports";
import { UserService } from "@/services/user.service";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const ui = useUIStore();
const menuStore = useMenuStore();
const companyProfileStore = useCompanyProfileStore();
const { slugPath, currentSlug } = useSlugRoute();

const emit = defineEmits(["update-active"]);

// ===== STATE =====
const isOpen = ref(true); // desktop
const isMobile = ref(false);

const menu = computed(() => menuStore.menus);
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
  // Bandingkan path menu (tanpa slug) dengan path URL (tanpa slug prefix)
  const currentPath = route.path.replace(`/${currentSlug.value}`, '') || '/';
  return currentPath === path || currentPath.startsWith(path + "/");
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

const handleMenuClick = (item: any) => {
  const hasChildren = item.children && item.children.length > 0;
  if (hasChildren) {
    isOpen.value = true;
  } else {
    // 👉 AUTO CLOSE MOBILE SIDEBAR
    if (isMobile.value) {
      closeMobileSidebar();
    }
  }
};

// ===== PROFILE DETAILS =====
const profile = ref<any>(null);
const userService = UserService();

const profileName = computed(() => {
  if (profile.value?.pegawai?.name) {
    return profile.value.pegawai.name;
  }
  return auth.username || "User";
});

const profileRole = computed(() => {
  if (profile.value?.role?.name) {
    return profile.value.role.name;
  }
  return auth.role || "Guest";
});

// ===== LIFECYCLE =====
onMounted(async () => {
  if (!menuStore.hasFetched && auth.id_role) {
    await menuStore.fetchMenus();
  }

  if (auth.isLoggedIn) {
    await companyProfileStore.fetchProfile();
    try {
      const res = await userService.getProfile();
      profile.value = res?.data || res;
    } catch (err) {
      console.error("Gagal memuat profil pengguna:", err);
    }
  }

  checkScreen();
  window.addEventListener("resize", checkScreen);
  updateActiveMenu();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreen);
});

// ===== WATCH =====

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

useHead(() => {
  const baseAppName = companyProfileStore.appName || config.public.appName || "Admin Panel";
  return {
    title: activeMenuName.value
      ? `${activeMenuName.value} - ${baseAppName}`
      : baseAppName,
  };
});
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
    <div class="flex items-center justify-between p-4 md:p-5 border-b border-base-content/5">
      <div v-if="isOpen" class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-base-200 border border-base-content/10 flex items-center justify-center shadow-md shadow-primary/10 shrink-0 overflow-hidden">
          <SecureCompanyLogo
            :logo-filename="companyProfileStore.logoFilename"
            :logo-path="companyProfileStore.logoPath"
            :alt="companyProfileStore.appName"
            img-class="max-w-full max-h-full w-auto h-auto object-contain p-0.5"
          />
        </div>
        <span class="font-bold text-base-content text-lg tracking-tight truncate" :title="companyProfileStore.appName">
          {{ companyProfileStore.appName }}
        </span>
      </div>
      <div v-else class="w-full flex justify-center">
        <div class="w-8 h-8 rounded-lg bg-base-200 border border-base-content/10 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
          <SecureCompanyLogo
            :logo-filename="companyProfileStore.logoFilename"
            :logo-path="companyProfileStore.logoPath"
            :alt="companyProfileStore.appName"
            img-class="max-w-full max-h-full w-auto h-auto object-contain p-0.5"
          />
        </div>
      </div>
      
      <button class="hidden md:inline-flex text-base-content/40 hover:text-base-content/80 hover:bg-base-200 p-1.5 rounded-lg transition" @click="toggleSidebar">
        <component :is="isOpen ? icons.ChevronLeft : icons.Menu" class="w-4 h-4" />
      </button>

      <button class="md:hidden text-base-content/50 hover:text-base-content hover:bg-base-200 p-1.5 rounded-lg transition" @click="closeMobileSidebar" title="Tutup Menu">
        <icons.X class="w-5 h-5" />
      </button>
    </div>

    <!-- MENU LIST -->
    <nav class="flex flex-col gap-1.5 p-4 overflow-y-auto flex-1 min-h-0">
      <SidebarItem
        v-for="(item, idx) in menu"
        :key="idx"
        :item="item"
        :depth="0"
        :isOpenSidebar="isOpen"
        @menu-click="handleMenuClick"
      />
    </nav>

    <!-- FOOTER PROFILE -->
    <div class="p-4 border-t border-base-content/5 relative bg-base-100">
      <div
        class="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-base-200 transition"
        @click="toggleProfileDropdown"
      >
        <div class="relative w-10 h-10">
          <SecureAvatar
            :avatar-path="profile?.pegawai?.avatar"
            :name="profileName"
            img-class="w-10 h-10 rounded-xl object-cover ring-2 ring-base-200"
            fallback-class="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center ring-2 ring-base-200 uppercase text-xs border border-primary/20 shrink-0"
          />
          <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-base-100 z-10"></span>
        </div>

        <div v-if="isOpen" class="flex flex-col flex-1 min-w-0">
          <span class="font-semibold text-base-content text-sm truncate">{{ profileName }}</span>
          <span class="text-xs text-base-content/50 truncate font-medium">{{ profileRole }}</span>
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
            :to="slugPath('/profile')"
            class="flex items-center gap-2.5 px-4 py-2 text-sm text-base-content/80 hover:bg-base-200 hover:text-base-content transition font-medium"
            @click="closeProfileDropdown"
          >
            <icons.User class="w-4 h-4 text-base-content/40" />
            Profil Saya
          </NuxtLink>
          <NuxtLink
            :to="slugPath('/profil-perusahaan')"
            class="flex items-center gap-2.5 px-4 py-2 text-sm text-base-content/80 hover:bg-base-200 hover:text-base-content transition font-medium"
            @click="closeProfileDropdown"
          >
            <icons.Building2 class="w-4 h-4 text-base-content/40" />
            Profil Perusahaan
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