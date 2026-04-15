<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useHead } from "#imports";

const router = useRouter();
const { logout } = useAuth();
const auth = useAuthStore();
const route = useRoute();
const ui = useUIStore();

const emit = defineEmits(["update-active"]);

// ===== STATE =====
const isOpen = ref(true); // desktop
const isMobileOpen = computed(() => ui.isMobileSidebarOpen); // mobile
const isMobile = ref(false);

const menu = ref<any[]>([]);
const openSubmenu = ref<string | null>(null);
const activeMenuName = ref("Menu");

// ===== PROFILE =====
const profileDropdownOpen = ref(false);

const toggleProfileDropdown = () => {
  profileDropdownOpen.value = !profileDropdownOpen.value;
};

const closeProfileDropdown = () => {
  profileDropdownOpen.value = false;
};

const handleLogout = async () => {
  await auth.logout();
  closeProfileDropdown();
};

// ===== RESPONSIVE =====
const checkScreen = () => {
  isMobile.value = window.innerWidth < 768;
};

const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) profileDropdownOpen.value = false;
};

const toggleMobileSidebar = () => {
  isMobileOpen.value = !isMobileOpen.value;
};

defineExpose({
  toggleMobileSidebar,
});

// ===== MENU =====
const isActive = (path: string) =>
  route.path === path || route.path.startsWith(path + "/");

const isParentActive = (children: any[]) =>
  children.some((c) => isActive(c.path));

const findActiveMenu = (items: any[]): any | null => {
  for (const item of items) {
    if (item.path && isActive(item.path)) return item;
    if (item.children) {
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
  if (item.children) {
    toggleSubmenu(item.name);
  } else {
    // auto close mobile
    if (isMobile.value) {
      isMobileOpen.value = false;
    }
  }
};

// ===== LIFECYCLE =====
onMounted(async () => {
  menu.value = await $fetch("/api/menu");

  checkScreen();
  window.addEventListener("resize", checkScreen);

  menu.value.forEach((item) => {
    if (item.children?.some((c) => isActive(c.path))) {
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
    if (isMobile.value) isMobileOpen.value = false;
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
</script>

<template>
  <!-- OVERLAY -->
  <Transition name="fade">
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
      @click="isMobileOpen = false"
    ></div>
  </Transition>

  <!-- SIDEBAR -->
  <aside
    :class="[
      'h-screen flex flex-col fixed md:static z-40 transition-all duration-300 rounded-r-xl',
      'bg-gradient-to-b from-[#e0f7fa] to-[#d0f0fd]',

      // WIDTH
      isOpen ? 'w-64' : 'w-20',

      // 👉 FIX POSITION
      isMobileOpen
        ? 'translate-x-0'
        : '-translate-x-full md:translate-x-0',
    ]"
  >
    <!-- HEADER -->
    <div class="flex items-center justify-between p-4 bg-blue-900 text-white">
      <span v-if="isOpen" class="font-bold">Admin Panel</span>

      <button class="hidden md:inline-flex" @click="toggleSidebar">
        <icons.Menu class="w-5 h-5" />
      </button>
    </div>

    <!-- MENU -->
    <nav class="flex flex-col gap-1 p-4 overflow-y-auto flex-1 min-h-0">
      <div v-for="(item, idx) in menu" :key="idx">
        <!-- SINGLE -->
        <NuxtLink
          v-if="!item.children"
          :to="item.path"
          @click="handleMenuClick(item)"
          class="flex items-center gap-3 px-3 py-2 rounded-lg transition"
          :class="
            isActive(item.path)
              ? 'bg-blue-500 text-white'
              : 'hover:bg-blue-100'
          "
        >
          <component :is="icons[item.icon]" class="w-5 h-5" />
          <span v-if="isOpen">{{ item.name }}</span>
        </NuxtLink>

        <!-- PARENT -->
        <div
          v-else
          @click="handleMenuClick(item)"
          class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
          :class="
            isParentActive(item.children)
              ? 'bg-blue-500 text-white'
              : 'hover:bg-blue-100'
          "
        >
          <component :is="icons[item.icon]" class="w-5 h-5" />
          <span v-if="isOpen" class="flex-1">{{ item.name }}</span>

          <icons.ChevronDown
            v-if="isOpen"
            :class="{ 'rotate-180': openSubmenu === item.name }"
            class="w-4 h-4 transition-transform"
          />
        </div>

        <!-- SUBMENU -->
        <div
          v-if="item.children && openSubmenu === item.name && isOpen"
          class="pl-8 mt-1 space-y-1"
        >
          <NuxtLink
            v-for="(child, i) in item.children"
            :key="i"
            :to="child.path"
            @click="handleMenuClick(child)"
            class="block py-1 text-sm rounded px-2 transition"
            :class="
              isActive(child.path)
                ? 'bg-blue-500 text-white'
                : 'hover:text-blue-600'
            "
          >
            {{ child.name }}
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- PROFILE -->
    <div class="mt-auto pt-4 border-t border-blue-300 relative">
      <div
        class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-blue-100"
        @click="toggleProfileDropdown"
      >
        <img
          src="https://i.pravatar.cc/100?img=3"
          class="w-10 h-10 rounded-full"
        />

        <div v-if="isOpen" class="flex flex-col flex-1">
          <span class="font-semibold truncate">John Doe</span>
          <span class="text-xs opacity-70 truncate">Administrator</span>
        </div>

        <icons.ChevronDown
          v-if="isOpen"
          class="w-4 h-4 ml-auto transition-transform"
          :class="{ 'rotate-180': profileDropdownOpen }"
        />
      </div>

      <Transition name="fade">
        <div
          v-if="profileDropdownOpen"
          class="absolute bottom-14 left-0 w-full bg-white shadow-lg rounded-md py-2 z-20"
        >
          <NuxtLink
            to="/profile"
            class="flex items-center gap-2 px-4 py-2 hover:bg-blue-100"
          >
            <icons.User class="w-5 h-5" />
            Profile
          </NuxtLink>

          <NuxtLink
            to="/settings"
            class="flex items-center gap-2 px-4 py-2 hover:bg-blue-100"
          >
            <icons.Settings class="w-5 h-5" />
            Settings
          </NuxtLink>

          <button
            @click="handleLogout"
            class="flex items-center gap-2 px-4 py-2 hover:bg-red-100 w-full text-left"
          >
            <icons.LogOut class="w-5 h-5" />
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