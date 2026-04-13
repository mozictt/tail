<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useHead } from "#imports";


const router = useRouter();
const { userRole, logout } = useAuth();

const emit = defineEmits(["update-active"]);

const isOpen = ref(true); // desktop sidebar
const isMobileOpen = ref(false); // mobile overlay
const menu = ref<any[]>([]);
const openSubmenu = ref<string | null>(null);
const route = useRoute();

const activeMenuName = ref("Menu");


// Profile dropdown
const profileDropdownOpen = ref(false);
const toggleProfileDropdown = () => {
  profileDropdownOpen.value = !profileDropdownOpen.value;
};
const closeProfileDropdown = () => {
  profileDropdownOpen.value = false;
};

const handleLogout = () => {
  logout();
  router.push("/login");
  profileDropdownOpen.value = false;
};

// ===== Utils =====
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

// ===== Lifecycle =====
onMounted(async () => {
  menu.value = await $fetch("/api/menu");
  menu.value.forEach((item) => {
    if (item.children?.some((c) => isActive(c.path))) {
      openSubmenu.value = item.name;
    }
  });
  updateActiveMenu();
});

// collapse effect
watch(isOpen, (newVal) => {
  if (!newVal) openSubmenu.value = null;
});

// update when route changes
watch(
  () => route.path,
  () => {
    updateActiveMenu();
    isMobileOpen.value = false;
  },
  { immediate: true },
);

// ===== Actions =====
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) profileDropdownOpen.value = false;
};
const toggleMobileSidebar = () => {
  isMobileOpen.value = !isMobileOpen.value;
};
const toggleSubmenu = (name: string) => {
  openSubmenu.value = openSubmenu.value === name ? null : name;
};
defineExpose({
  toggleMobileSidebar,
});
const config = useRuntimeConfig();
useHead(() => ({
  title: activeMenuName.value
    ? `${activeMenuName.value} - ${config.public.appName}`
    : `${config.public.appName}`,
}));
</script>

<template>
  <!-- Mobile overlay -->
  <Transition name="fade">
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
      @click="isMobileOpen = false"
    ></div>
  </Transition>
  <aside
    :class="[
      'h-screen transition-all duration-500 flex flex-col fixed md:static z-40 rounded-r-xl',
      'bg-gradient-to-b from-[#e0f7fa] to-[#d0f0fd]',
      isOpen ? 'w-64' : 'w-20',
      isMobileOpen ? 'left-0 top-0' : '-left-64 top-0',
    ]"
  >
    <!-- HEADER -->
    <div
      class="flex items-center justify-between p-4 border-b border-blue-800 bg-blue-900"
    >
      <span v-if="isOpen" class="text-lg font-bold text-white">
        Admin Panel
      </span>

      <button
        class="btn btn-ghost btn-sm hidden md:inline-flex"
        @click="toggleSidebar"
      >
        <icons.Menu class="w-5 h-5 text-white" />
      </button>
    </div>

    <!-- MENU -->
    <nav class="flex flex-col gap-1 flex-1 p-4 overflow-y-auto">
      <div v-for="(item, idx) in menu" :key="idx">
        <!-- Menu tanpa submenu -->
        <NuxtLink
          v-if="!item.children"
          :to="item.path"
          class="flex flex-col gap-0.5 px-3 py-2 rounded-lg transition-all duration-300 menu-item"
          :class="
            isActive(item.path)
              ? 'bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] text-white shadow-md'
              : 'hover:bg-gradient-to-r hover:from-[#b3e5fc] hover:to-[#e1f5fe] text-gray-800'
          "
          :title="item.description || item.name"
        >
          <div class="flex items-center gap-3">
            <component :is="icons[item.icon]" class="w-5 h-5" />
            <span v-if="isOpen">{{ item.name }}</span>
          </div>
        </NuxtLink>

        <!-- Menu dengan submenu -->
        <div
          v-else
          class="flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-gradient-to-r hover:from-[#b3e5fc] hover:to-[#e1f5fe] cursor-pointer transition-all duration-300 menu-item"
          @click="toggleSubmenu(item.name)"
          :class="
            isParentActive(item.children)
              ? 'bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] text-white shadow-inner'
              : 'text-gray-800'
          "
          :title="item.description || item.name"
        >
          <div class="flex items-center gap-3">
            <component :is="icons[item.icon]" class="w-5 h-5" />
            <span v-if="isOpen" class="flex-1">{{ item.name }}</span>
            <icons.ChevronDown
              v-if="isOpen"
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-180': openSubmenu === item.name }"
            />
          </div>
        </div>

        <!-- Submenu -->
        <Transition name="submenu">
          <div
            v-if="item.children && openSubmenu === item.name && isOpen"
            class="flex flex-col gap-1 mt-1 pl-10 overflow-hidden"
          >
            <NuxtLink
              v-for="(child, cidx) in item.children"
              :key="cidx"
              :to="child.path"
              class="px-3 py-1 rounded-md text-sm transition-all duration-300 submenu-item"
              :class="
                isActive(child.path)
                  ? 'bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] text-white shadow-inner'
                  : 'hover:bg-gradient-to-r hover:from-[#b3e5fc] hover:to-[#e1f5fe] text-gray-700'
              "
            >
              {{ child.name }}
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- Profile -->
    <div class="mt-auto pt-4 border-t border-blue-300 relative" tabindex="0">
      <div
        class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gradient-to-r hover:from-[#b3e5fc] hover:to-[#e1f5fe] select-none"
        @click="toggleProfileDropdown"
      >
        <img
          src="https://i.pravatar.cc/100?img=3"
          alt="Avatar"
          class="w-10 h-10 rounded-full object-cover"
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
          class="absolute bottom-14 left-0 w-full bg-gradient-to-b from-[#d0f0fd] to-[#e0f7fa] shadow-lg rounded-md py-2 z-20"
        >
          <NuxtLink
            to="/profile"
            class="flex items-center gap-2 px-4 py-2 hover:bg-gradient-to-r hover:from-[#4fc3f7] hover:to-[#81d4fa] text-white transition-all duration-300"
            @click="profileDropdownOpen = false"
          >
            <icons.User class="w-5 h-5" />
            Profile
          </NuxtLink>
          <NuxtLink
            to="/settings"
            class="flex items-center gap-2 px-4 py-2 hover:bg-gradient-to-r hover:from-[#4fc3f7] hover:to-[#81d4fa] text-white transition-all duration-300"
            @click="profileDropdownOpen = false"
          >
            <icons.Settings class="w-5 h-5" />
            Settings
          </NuxtLink>
          <button
            @mousedown.stop
            @click="
              handleLogout();
              closeProfileDropdown();
            "
            class="flex items-center gap-2 px-4 py-2 hover:bg-gradient-to-r hover:from-[#ff8a65] hover:to-[#ffab91] text-white transition-all duration-300 w-full text-left"
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
/* Submenu slide */
.submenu-enter-active,
.submenu-leave-active {
  transition: all 0.35s ease;
}
.submenu-enter-from,
.submenu-leave-to {
  max-height: 0;
  opacity: 0;
}
.submenu-enter-to,
.submenu-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* Fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>
