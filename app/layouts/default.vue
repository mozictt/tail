<script setup lang="ts">
import { ref } from "vue";
import * as icons from "lucide-vue-next";
import Sidebar from "@/components/Sidebar.vue";
import { useUIStore } from "@/stores/ui";

const ui = useUIStore();

const activeMenu = ref<any>(null);

const onUpdateActive = (menuItem: any) => {
  activeMenu.value = menuItem;
};
</script>

<template>
  <div class="flex h-screen">
    <Sidebar @update-active="onUpdateActive" />

    <div class="flex-1 flex flex-col bg-gray-50">
      
      <!-- HEADER -->
      <header
        class="relative z-10 bg-gradient-to-r from-pink-200 to-purple-300 shadow-sm border-b px-6 py-4 flex items-center justify-between"
      >
        <!-- LEFT -->
        <div class="flex items-center gap-4">
          
          <!-- ✅ MOBILE BUTTON -->
          <button
            class="md:hidden bg-blue-900 text-white p-2 rounded-lg shadow"
            @click="ui.toggleMobileSidebar()"
          >
            <icons.Menu class="w-5 h-5" />
          </button>

          <div class="p-2 rounded-lg bg-blue-100 text-blue-600">
            <component
              :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
              class="w-6 h-6"
            />
          </div>

          <div>
            <h1 class="font-semibold text-lg text-gray-800">
              {{ activeMenu?.name || "Dashboard" }}
            </h1>
            <p class="text-xs text-gray-500">
              {{ activeMenu?.description || "Selamat datang di sistem" }}
            </p>
          </div>
        </div>

        <!-- RIGHT -->
        <div class="flex items-center gap-4">
          <!-- SEARCH -->
          <div class="relative hidden md:block">
            <icons.Search
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search..."
              class="pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <!-- NOTIF -->
          <button class="relative p-2 hover:bg-gray-100 rounded-lg">
            <icons.Bell class="w-5 h-5 text-gray-600" />
          </button>

          <!-- USER -->
          <div class="flex items-center gap-2">
            <img src="https://i.pravatar.cc/40" class="w-8 h-8 rounded-full" />
          </div>
        </div>
      </header>

      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>