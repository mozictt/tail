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
  <div class="flex h-screen bg-slate-50/50 overflow-hidden">
    <!-- Sidebar -->
    <Sidebar ref="sidebarRef" @update-active="onUpdateActive" />

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Navbar -->
      <header class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <!-- Kiri: icon & judul -->
        <div class="flex items-center space-x-3.5">
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-primary">
            <component
              :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
              class="w-5 h-5"
            />
          </div>
          <div>
            <h1 class="text-base font-bold text-slate-800 tracking-tight leading-none mb-1">
              {{ activeMenu?.name || "Menu" }}
            </h1>
            <p class="text-xs font-medium text-slate-400">
              {{ activeMenu?.description || "Dashboard Admin" }}
            </p>
          </div>
        </div>

        <!-- Kanan: tombol toggle (hanya muncul di mobile) -->
        <button class="btn btn-ghost btn-sm md:hidden hover:bg-slate-100 text-slate-500 rounded-lg" @click="toggleMobileSidebar">
          <icons.Menu class="w-5 h-5" />
        </button>
      </header>

      <!-- Content -->
      <main class="flex-1 p-6 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

