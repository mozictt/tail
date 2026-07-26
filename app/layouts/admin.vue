<script setup lang="ts">
import { ref } from "vue";
import * as icons from "lucide-vue-next";
import Sidebar from "@/components/Sidebar.vue"; 

const activeMenu = ref<any>(null);
const sidebarRef = ref();

const onUpdateActive = (menuItem: any) => {
  activeMenu.value = menuItem;
};

const toggleMobileSidebar = () => {
  sidebarRef.value?.toggleMobileSidebar();
};
</script>

<template>
  <div class="flex h-screen bg-base-200/50 overflow-hidden">
    <!-- Sidebar -->
    <Sidebar ref="sidebarRef" @update-active="onUpdateActive" />

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Navbar -->
      <header class="bg-base-100/85 backdrop-blur-md border-b border-base-content/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <!-- Kiri: icon & judul -->
        <div class="flex items-center space-x-3.5">
          <div class="p-2.5 rounded-xl bg-base-200 border border-base-content/5 text-primary">
            <component
              :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
              class="w-5 h-5"
            />
          </div>
          <div>
            <h1 class="text-base font-bold text-base-content tracking-tight leading-none mb-1">
              {{ activeMenu?.name || "Menu" }}
            </h1>
            <p class="text-xs font-medium text-base-content/60">
              {{ activeMenu?.description || "Dashboard Admin" }}
            </p>
          </div>
        </div>

        <!-- Kanan: theme switcher & mobile sidebar toggle -->
        <div class="flex items-center gap-3">
          <ThemeSwitcher />
          
          <button class="btn btn-ghost btn-sm md:hidden hover:bg-base-200 text-base-content/75 rounded-lg" @click="toggleMobileSidebar">
            <icons.Menu class="w-5 h-5" />
          </button>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-6 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

