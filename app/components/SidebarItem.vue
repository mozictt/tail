<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute } from "vue-router";

const emit = defineEmits(["update-active"]);

const isOpen = ref(true);
const menu = ref<any[]>([]);
const openSubmenu = ref<string | null>(null);
const route = useRoute();

// ===== Fungsi utilitas =====
const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + "/");
};

const isParentActive = (children: any[]) => {
  return children.some((c) => isActive(c.path));
};

// Cari nama menu/submenu aktif dan kirim ke layout
const updateActiveMenuName = () => {
  const findMenu = (items: any[]): string | null => {
    for (const item of items) {
      if (item.path && isActive(item.path)) return item.name;
      if (item.children) {
        const child = findMenu(item.children);
        if (child) return child;
      }
    }
    return null;
  };

  emit("update-active", findMenu(menu.value) || "Menu");
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

  updateActiveMenuName(); // ✅ sekarang fungsi ini sudah didefinisikan
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
    updateActiveMenuName();
  },
  { immediate: true }
);

// ===== Actions =====
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const toggleSubmenu = (name: string) => {
  openSubmenu.value = openSubmenu.value === name ? null : name;
};
</script>

<template>
  <aside
    :class="[
      'bg-base-200 h-screen p-4 transition-all duration-300 shadow-md flex flex-col overflow-y-auto',
      isOpen ? 'w-64' : 'w-20'
    ]"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <span v-if="isOpen" class="text-lg font-bold text-primary">
        Admin Panel
      </span>
      <button class="btn btn-ghost btn-sm" @click="toggleSidebar">
        <icons.Menu class="w-5 h-5" />
      </button>
    </div>

    <!-- Menu -->
    <nav class="flex flex-col gap-1">
      <div v-for="(item, idx) in menu" :key="idx">
        <!-- Menu tanpa submenu -->
        <NuxtLink
          v-if="!item.children"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-300 transition-colors"
          :class="isActive(item.path) ? 'bg-primary text-white' : ''"
        >
          <component :is="icons[item.icon]" class="w-5 h-5" />
          <span v-if="isOpen">{{ item.name }}</span>
        </NuxtLink>

        <!-- Menu dengan submenu -->
        <div
          v-else
          class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-300 cursor-pointer transition-colors"
          @click="toggleSubmenu(item.name)"
          :class="isParentActive(item.children) ? 'bg-primary text-white' : ''"
        >
          <component :is="icons[item.icon]" class="w-5 h-5" />
          <span v-if="isOpen" class="flex-1">{{ item.name }}</span>
          <icons.ChevronDown
            v-if="isOpen"
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-180': openSubmenu === item.name }"
          />
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
              class="px-3 py-1 rounded-md hover:bg-base-300 text-sm transition-colors"
              :class="isActive(child.path) ? 'bg-primary text-white' : ''"
            >
              {{ child.name }}
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- Profil -->
    <div class="mt-auto pt-4 border-t border-base-300">
      <div class="flex items-center gap-3 p-2 hover:bg-base-300 rounded-lg cursor-pointer">
        <img
          src="https://i.pravatar.cc/100?img=3"
          alt="Avatar"
          class="w-10 h-10 rounded-full object-cover"
        />
        <div v-if="isOpen" class="flex flex-col">
          <span class="font-semibold">John Doe</span>
          <span class="text-xs opacity-70">Administrator</span>
        </div>
      </div>
      <button
        v-if="isOpen"
        class="btn btn-sm btn-error w-full mt-2"
      >
        Logout
      </button>
      <button
        v-else
        class="btn btn-sm btn-error w-full mt-2 flex justify-center"
      >
        <icons.LogOut class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
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
</style>
