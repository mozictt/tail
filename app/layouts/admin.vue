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
      <header class="bg-base-100/85 backdrop-blur-md border-b border-base-content/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
        <!-- Kiri: mobile sidebar toggle, icon & judul -->
        <div class="flex items-center gap-2.5 md:gap-3.5 min-w-0">
          <button 
            class="btn btn-ghost btn-sm md:hidden hover:bg-base-200 text-base-content/75 rounded-lg p-1.5 flex-shrink-0" 
            @click="toggleMobileSidebar"
            title="Toggle Menu"
          >
            <icons.Menu class="w-5.5 h-5.5" />
          </button>

          <div class="p-2 md:p-2.5 rounded-xl bg-base-200 border border-base-content/5 text-primary flex-shrink-0">
            <component
              :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
              class="w-5 h-5"
            />
          </div>

          <div class="min-w-0">
            <h1 class="text-sm md:text-base font-bold text-base-content tracking-tight leading-none mb-1 truncate">
              {{ activeMenu?.name || "Menu" }}
            </h1>
            <p class="text-[11px] md:text-xs font-medium text-base-content/60 truncate">
              {{ activeMenu?.description || "Dashboard Admin" }}
            </p>
          </div>
        </div>

        <!-- Kanan: theme switcher -->
        <div class="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <ThemeSwitcher />
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-4 md:p-6 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

