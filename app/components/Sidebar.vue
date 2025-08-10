<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const router = useRouter();
const { userRole, logout } = useAuth();

// const filteredMenu = computed(() => {
//   if (userRole.value === "admin") return menu.value;
//   return menu.value.filter((item) => item.name !== "Settings");
// });

const handleLogout = () => {
  logout();
  router.push("/login"); // arahkan ke halaman login setelah logout
  profileDropdownOpen.value = false; // tutup dropdown
};
const emit = defineEmits(["update-active"]);

const isOpen = ref(true);
const menu = ref<any[]>([]);
const openSubmenu = ref<string | null>(null);
const route = useRoute();

const activeMenuName = ref("Menu");

// Profil dropdown
const profileDropdownOpen = ref(false);
const toggleProfileDropdown = () => {
  profileDropdownOpen.value = !profileDropdownOpen.value;
};
const closeProfileDropdown = () => {
  profileDropdownOpen.value = false;
};

// ===== Fungsi utilitas =====
const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + "/");
};

const isParentActive = (children: any[]) => {
  return children.some((c) => isActive(c.path));
};

// Cari menu aktif objek (bukan cuma nama)
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

// Update menu aktif dan kirim objeknya ke parent
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

  // Auto buka submenu kalau path aktif ada di dalamnya
  menu.value.forEach((item) => {
    if (item.children?.some((c) => isActive(c.path))) {
      openSubmenu.value = item.name;
    }
  });

  updateActiveMenu();
});

// Tutup semua submenu kalau sidebar di-collapse
watch(isOpen, (newVal) => {
  if (!newVal) {
    openSubmenu.value = null;
  }
});

// Update setiap kali route berubah
watch(
  () => route.path,
  () => {
    updateActiveMenu();
  },
  { immediate: true }
);

// ===== Actions =====
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    profileDropdownOpen.value = false;
  }
};

const toggleSubmenu = (name: string) => {
  openSubmenu.value = openSubmenu.value === name ? null : name;
};
</script>

<template>
  <aside :class="[
    'bg-base-200 h-screen p-4 transition-all duration-300 shadow-md flex flex-col overflow-y-auto',
    isOpen ? 'w-64' : 'w-20'
  ]">
    <!-- Header + Toggle -->
    <div class="flex items-center justify-between mb-6">
      <span v-if="isOpen" class="text-lg font-bold text-primary">
        Admin Panel
      </span>
      <button class="btn btn-ghost btn-sm" @click="toggleSidebar">
        <icons.Menu class="w-5 h-5" />
      </button>
    </div>

    <!-- Menu -->
    <nav class="flex flex-col gap-1 flex-1">
      <div v-for="(item, idx) in menu" :key="idx">
        <!-- Menu tanpa submenu -->
        <NuxtLink v-if="!item.children" :to="item.path"
          class="flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-base-300 transition-colors menu-item"
          :class="isActive(item.path) ? 'active' : ''" :title="item.description || item.name">
          <div class="flex items-center gap-3">
            <component :is="icons[item.icon]" class="w-5 h-5" />
            <span v-if="isOpen">{{ item.name }}</span>
          </div>
          <!-- <small v-if="isOpen" class="text-xs text-base-content/70 truncate">
            {{ item.description }}
          </small> -->
        </NuxtLink>

        <!-- Menu dengan submenu -->
        <div v-else
          class="flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-base-300 cursor-pointer transition-colors menu-item"
          @click="toggleSubmenu(item.name)" :class="isParentActive(item.children) ? 'active' : ''" :title="item.description || item.name">
          <div class="flex items-center gap-3">
            <component :is="icons[item.icon]" class="w-5 h-5" />
            <span v-if="isOpen" class="flex-1">{{ item.name }}</span>
            <icons.ChevronDown v-if="isOpen" class="w-4 h-4 transition-transform"
              :class="{ 'rotate-180': openSubmenu === item.name }" />
          </div>
          <!-- <small v-if="isOpen" class="text-xs text-base-content/70 truncate">
            {{ item.description }}
          </small> -->
        </div>

        <!-- Submenu -->
        <Transition name="submenu">
          <div v-if="item.children && openSubmenu === item.name && isOpen"
            class="flex flex-col gap-1 mt-1 pl-10 overflow-hidden">
            <NuxtLink v-for="(child, cidx) in item.children" :key="cidx" :to="child.path"
              class="px-3 py-1 rounded-md hover:bg-base-300 text-sm transition-colors submenu-item"
              :class="isActive(child.path) ? 'active-submenu' : ''" :title="child.name">
              {{ child.name }}
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- Profil dengan dropdown -->
    <div class="mt-auto pt-4 border-t border-base-300 relative" tabindex="0" @blur="closeProfileDropdown">
      <div class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-300 select-none"
        @click="toggleProfileDropdown" :title="isOpen ? 'Open Profile Menu' : 'Profile'">
        <img src="https://i.pravatar.cc/100?img=3" alt="Avatar" class="w-10 h-10 rounded-full object-cover" />
        <div v-if="isOpen" class="flex flex-col flex-1">
          <span class="font-semibold truncate">John Doe</span>
          <span class="text-xs opacity-70 truncate">Administrator</span>
        </div>
        <icons.ChevronDown v-if="isOpen" class="w-4 h-4 ml-auto transition-transform"
          :class="{ 'rotate-180': profileDropdownOpen }" />
      </div>
      <Transition name="fade">
        <div v-if="profileDropdownOpen"
          class="absolute bottom-14 left-0 w-full bg-base-300 shadow-lg rounded-md py-2 z-20">
          <NuxtLink to="/profile"
            class="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-blue-600 text-white transition-colors duration-200"
            @click="profileDropdownOpen = false">
            <icons.User class="w-5 h-5" />
            Profile
          </NuxtLink>
          <NuxtLink to="/settings"
            class="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-blue-600 text-white transition-colors duration-200"
            @click="profileDropdownOpen = false">
            <icons.Settings class="w-5 h-5" />
            Settings
          </NuxtLink>
         <button
        @click="handleLogout"
        class="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-red-600 text-white transition-colors duration-200"
      >
        <icons.LogOut class="w-5 h-5" />
        Logout
      </button>
        </div>
      </Transition>
    </div>
  </aside>
</template>

<style scoped>
/* Animasi submenu */
.submenu-enter-active,
.submenu-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
}

.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  max-height: 0;
}

/* Animasi dropdown profil */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Menu aktif */
.menu-item.active {
  border-left: 4px solid var(--color-primary);
  background-color: var(--color-primary);
  color: white;
}

/* Submenu aktif */
.submenu-item.active-submenu {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
  border-radius: 0.375rem;
  /* rounded-md */
}

/* Transisi smooth menu */
.menu-item,
.submenu-item {
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Icon rotate smooth */
svg.w-4.h-4 {
  transition: transform 0.3s ease;
}
</style>
