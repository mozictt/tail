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
  <div class="flex h-screen">
    <!-- Sidebar -->
    <Sidebar ref="sidebarRef" @update-active="onUpdateActive" />

    <!-- Main -->
    <div class="flex-1 flex flex-col bg-base-100">
      <!-- Navbar -->
      <header class="bg-base-300 p-4 shadow-md flex items-center justify-between">
        <!-- Kiri: icon & judul -->
        <div class="flex items-center space-x-4">
          <component
            :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
            class="w-6 h-6 text-primary"
          />
          <div>
            <h1 class="text-lg font-semibold">{{ activeMenu?.name || "Menu" }}</h1>
            <p class="text-sm text-base-content/70">{{ activeMenu?.description || "" }}</p>
          </div>
        </div>

        <!-- Kanan: tombol toggle (hanya muncul di mobile) -->
        <button class="btn btn-ghost btn-sm md:hidden" @click="toggleMobileSidebar">
          <icons.Menu class="w-5 h-5" />
        </button>
      </header>

      <!-- Content -->
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
