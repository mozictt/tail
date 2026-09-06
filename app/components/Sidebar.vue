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
import Swal from "sweetalert2";

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

const menu = computed(() => menuStore.authorizedMenus);
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
  const result = await Swal.fire({
    title: "Konfirmasi Logout",
    text: "Apakah anda yakin akan logout?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Logout",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
    customClass: {
      confirmButton: "btn btn-error text-white rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (result.isConfirmed) {
    menuStore.clearMenus();
    await auth.logout();
    closeProfileDropdown();
  }
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
  if (isMobile.value) return 'w-72'; // mobile selalu full
  return isOpen.value ? 'w-72' : 'w-[68px]'; // desktop toggle
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
      'fixed inset-y-0 left-0 flex flex-col md:static z-40 transition-all duration-300 border-r border-base-content/10 bg-base-100 shadow-2xl md:shadow-none',
      isOpen ? 'w-72' : 'w-[68px]',
      isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
    style="height: 100dvh; max-height: -webkit-fill-available;"
  >
    <!-- HEADER BRANDING -->
    <div
      class="flex shrink-0 border-b border-base-content/5 transition-all duration-300"
      :class="isOpen ? 'items-center justify-between p-4 md:p-5' : 'flex-col items-center justify-center gap-2 py-3 px-1'"
    >
      <!-- Expanded header: Logo + App Name + Toggle Button -->
      <template v-if="isOpen">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-base-200 border border-base-content/10 flex items-center justify-center shadow-md shadow-primary/10 shrink-0 overflow-hidden">
            <SecureCompanyLogo
              :logo-filename="companyProfileStore.logoFilename"
              :logo-path="companyProfileStore.logoPath"
              :alt="companyProfileStore.appName"
              img-class="max-w-full max-h-full w-auto h-auto object-contain p-0.5"
            />
          </div>
          <span class="font-bold text-base-content text-base tracking-tight truncate" :title="companyProfileStore.appName">
            {{ companyProfileStore.appName }}
          </span>
        </div>
        
        <button
          class="hidden md:inline-flex text-base-content/40 hover:text-base-content/80 hover:bg-base-200 p-1.5 rounded-lg transition shrink-0"
          @click="toggleSidebar"
          title="Minimize Sidebar"
        >
          <icons.ChevronLeft class="w-4 h-4" />
        </button>
      </template>

      <!-- Collapsed header: Centered Logo + Toggle Expand Button underneath -->
      <template v-else>
        <div class="w-9 h-9 rounded-xl bg-base-200 border border-base-content/10 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
          <SecureCompanyLogo
            :logo-filename="companyProfileStore.logoFilename"
            :logo-path="companyProfileStore.logoPath"
            :alt="companyProfileStore.appName"
            img-class="max-w-full max-h-full w-auto h-auto object-contain p-0.5"
          />
        </div>
        <button
          class="hidden md:inline-flex text-base-content/40 hover:text-base-content hover:bg-base-200 p-1 rounded-lg transition text-xs"
          @click="toggleSidebar"
          title="Expand Sidebar"
        >
          <icons.ChevronRight class="w-4 h-4" />
        </button>
      </template>

      <!-- Mobile Close Button -->
      <button class="md:hidden text-base-content/50 hover:text-base-content hover:bg-base-200 p-1.5 rounded-lg transition" @click="closeMobileSidebar" title="Tutup Menu">
        <icons.X class="w-5 h-5" />
      </button>
    </div>

    <!-- MENU LIST -->
    <nav
      class="flex flex-col gap-1.5 flex-1 min-h-0 scrollbar-thin overflow-y-auto"
      :class="isOpen ? 'p-4' : 'px-2 py-3'"
    >
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
    <div
      class="border-t border-base-content/5 relative bg-base-100 shrink-0 transition-all"
      :class="isOpen ? 'p-3 md:p-4 pb-6 md:pb-4' : 'p-2 py-3 flex justify-center items-center'"
    >
      <!-- Expanded Footer Profile -->
      <div
        v-if="isOpen || isMobile"
        class="flex items-center justify-between gap-2 p-2 rounded-xl bg-base-200/50 hover:bg-base-200 transition cursor-pointer"
        @click="toggleProfileDropdown"
      >
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <div class="relative w-9 h-9 md:w-10 md:h-10 shrink-0">
            <SecureAvatar
              :avatar-path="profile?.pegawai?.avatar"
              :name="profileName"
              img-class="w-9 h-9 md:w-10 md:h-10 rounded-xl object-cover ring-2 ring-base-200"
              fallback-class="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center ring-2 ring-base-200 uppercase text-xs border border-primary/20 shrink-0"
            />
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-base-100 z-10"></span>
          </div>

          <div class="flex flex-col flex-1 min-w-0">
            <span class="font-semibold text-base-content text-xs md:text-sm truncate leading-tight">{{ profileName }}</span>
            <span class="text-[10px] md:text-xs text-base-content/50 truncate font-medium">{{ profileRole }}</span>
          </div>

          <icons.ChevronDown
            class="w-4 h-4 text-base-content/40 transition-transform shrink-0"
            :class="{ 'rotate-180': profileDropdownOpen }"
          />
        </div>
      </div>

      <!-- Collapsed Footer Profile -->
      <div
        v-else
        class="group relative flex items-center justify-center cursor-pointer w-full"
        @click="toggleProfileDropdown"
      >
        <div class="relative w-10 h-10 rounded-xl overflow-visible flex items-center justify-center hover:bg-base-200 transition p-0.5">
          <SecureAvatar
            :avatar-path="profile?.pegawai?.avatar"
            :name="profileName"
            img-class="w-9 h-9 rounded-xl object-cover ring-2 ring-base-200"
            fallback-class="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center ring-2 ring-base-200 uppercase text-[10px] border border-primary/20 shrink-0"
          />
          <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-base-100 z-10"></span>
        </div>

        <!-- Tooltip nama user ketika collapsed -->
        <div class="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] whitespace-nowrap transition-all duration-200 translate-x-1 group-hover:translate-x-0">
          <div class="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xl flex flex-col gap-0.5 min-w-max">
            <span class="text-white leading-tight">{{ profileName }}</span>
            <span class="text-white/50 text-[10px] font-normal">{{ profileRole }}</span>
          </div>
          <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
        </div>
      </div>

      <!-- PROFIL DROPDOWN MENU -->
      <Transition name="fade">
        <div
          v-if="profileDropdownOpen"
          class="absolute bottom-16 left-3 right-3 md:left-4 md:right-4 bg-base-100 border border-base-content/10 shadow-2xl rounded-2xl p-1.5 z-50 animate-fade-in min-w-[200px]"
          :class="!isOpen ? 'left-full ml-2 bottom-2 w-52' : ''"
        >
          <NuxtLink
            :to="slugPath('/profile')"
            class="flex items-center gap-2.5 px-3 py-2 text-xs md:text-sm text-base-content/80 hover:bg-base-200 hover:text-base-content rounded-xl transition font-medium"
            @click="closeProfileDropdown"
          >
            <icons.User class="w-4 h-4 text-primary shrink-0" />
            <span>Profil Saya</span>
          </NuxtLink>
          <NuxtLink
            :to="slugPath('/profil-perusahaan')"
            class="flex items-center gap-2.5 px-3 py-2 text-xs md:text-sm text-base-content/80 hover:bg-base-200 hover:text-base-content rounded-xl transition font-medium"
            @click="closeProfileDropdown"
          >
            <icons.Building2 class="w-4 h-4 text-primary shrink-0" />
            <span>Profil Perusahaan</span>
          </NuxtLink>
          <div class="border-t border-base-content/5 my-1"></div>
          <button
            @click="handleLogout"
            class="flex items-center gap-2.5 px-3 py-2 text-xs md:text-sm text-error hover:bg-error/10 rounded-xl w-full text-left transition font-bold"
          >
            <icons.LogOut class="w-4 h-4 shrink-0" />
            <span>Logout / Keluar</span>
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