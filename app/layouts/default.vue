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
  <div class="flex h-screen bg-slate-50/50 overflow-hidden">
    <Sidebar @update-active="onUpdateActive" />

    <div class="flex-1 flex flex-col min-w-0">
      
      <!-- HEADER -->
      <header
        class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-10"
      >
        <!-- LEFT -->
        <div class="flex items-center gap-3.5">
          
          <!-- ✅ MOBILE BUTTON -->
          <button
            class="md:hidden btn btn-ghost btn-sm text-slate-500 p-2 rounded-lg"
            @click="ui.toggleMobileSidebar()"
          >
            <icons.Menu class="w-5 h-5" />
          </button>

          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-primary">
            <component
              :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
              class="w-5 h-5"
            />
          </div>

          <div>
            <h1 class="text-base font-bold text-slate-800 tracking-tight leading-none mb-1">
              {{ activeMenu?.name || "Dashboard" }}
            </h1>
            <p class="text-xs font-medium text-slate-400">
              {{ activeMenu?.description || "Selamat datang di sistem" }}
            </p>
          </div>
        </div>

        <!-- RIGHT -->
        <div class="flex items-center gap-4">
          <!-- SEARCH -->
          <div class="relative hidden md:block">
            <icons.Search
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search..."
              class="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <!-- NOTIF -->
          <button class="relative p-2 hover:bg-slate-50 border border-slate-200/40 rounded-xl transition text-slate-600">
            <icons.Bell class="w-5 h-5" />
            <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
          </button>

          <!-- USER -->
          <div class="flex items-center gap-2">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" class="w-8 h-8 rounded-xl object-cover ring-2 ring-slate-100" />
          </div>
        </div>
      </header>

      <main class="flex-1 p-6 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>