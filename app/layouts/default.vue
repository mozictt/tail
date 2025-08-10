<script setup lang="ts">
import { ref } from "vue";
import * as icons from "lucide-vue-next";
import Sidebar from "@/components/Sidebar.vue"; 

const activeMenu = ref<any>(null);

const onUpdateActive = (menuItem: any) => {
  activeMenu.value = menuItem;
};
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <Sidebar @update-active="onUpdateActive" />

    <!-- Main -->
    <div class="flex-1 flex flex-col bg-base-100">
      <!-- Navbar -->
      <header class="bg-base-300 p-4 shadow-md flex items-center space-x-4">
        <component
          :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
          class="w-6 h-6 text-primary"
        />
        <div>
          <h1 class="text-lg font-semibold">{{ activeMenu?.name || "Menu" }}</h1>
          <p class="text-sm text-base-content/70">{{ activeMenu?.description || "" }}</p>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
