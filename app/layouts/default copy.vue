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
    <Sidebar @update-active="onUpdateActive" />

    <div class="flex-1 flex flex-col bg-gray-50">
      <!-- <header class="bg-white p-4 shadow flex items-center gap-3">

        <component
          :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
          class="w-6 h-6 text-blue-600"
        />

        <div>
          <h1 class="font-semibold text-lg">
            {{ activeMenu?.name || "Menu" }}
          </h1>
          <p class="text-sm text-gray-500">
            {{ activeMenu?.description || "" }}
          </p>
        </div>

      </header> -->
      <header
        class="bg-gradient-to-r from-pink-200 to-purple-300 shadow-sm border-b px-6 py-4 flex items-center justify-between"
      >
        <!-- LEFT -->
        <div class="flex items-center gap-4">
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
              class="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>

          <!-- NOTIFICATION -->
          <button class="relative p-2 hover:bg-gray-100 rounded-lg">
            <icons.Bell class="w-5 h-5 text-gray-600" />
            <span
              class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
            ></span>
          </button>

          <!-- USER -->
          <div
            class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-lg"
          >
            <img src="https://i.pravatar.cc/40" class="w-8 h-8 rounded-full" />
            <div class="hidden md:block text-sm">
              <p class="font-medium text-gray-700">Admin</p>
              <p class="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </header>
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div> 

  <!-- TOAST -->
 
</template>
