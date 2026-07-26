<script setup lang="ts">
import { useUIStore } from "@/stores/ui";
import { Settings, Sun, Moon } from "lucide-vue-next";

const ui = useUIStore();

const colors = [
  { id: "modern", name: "Indigo", class: "bg-indigo-600" },
  { id: "emerald", name: "Emerald", class: "bg-emerald-500" },
  { id: "sunset", name: "Sunset", class: "bg-orange-500" },
  { id: "rose", name: "Rose", class: "bg-rose-500" },
] as const;
</script>

<template>
  <div class="dropdown dropdown-end">
    <!-- Trigger Button -->
    <label tabindex="0" class="btn btn-ghost btn-sm p-2 rounded-xl border border-slate-200/40 hover:bg-slate-50 text-slate-500 flex items-center gap-1.5 cursor-pointer">
      <Settings class="w-4 h-4 text-slate-400 animate-[spin_10s_linear_infinite]" />
      <span class="text-xs font-bold hidden sm:inline">Tema</span>
    </label>

    <!-- Dropdown Card -->
    <div tabindex="0" class="dropdown-content z-[100] card card-compact w-60 p-4 shadow-premium bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-2xl mt-2 text-slate-800">
      <div class="font-bold text-slate-700 text-xs tracking-wide uppercase mb-3">
        Pengaturan Tema
      </div>

      <!-- Mode Switch (Light / Dark) -->
      <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <span class="text-xs font-semibold text-slate-500">Mode Gelap</span>
        <button class="btn btn-sm btn-ghost hover:bg-slate-100 rounded-xl p-1.5 flex items-center gap-1.5" @click="ui.toggleThemeMode">
          <Sun v-if="ui.themeMode === 'dark'" class="w-4 h-4 text-amber-500 fill-amber-500" />
          <Moon v-else class="w-4 h-4 text-indigo-500 fill-indigo-100" />
          <span class="text-xs font-extrabold text-slate-600">{{ ui.themeMode === 'light' ? 'Nonaktif' : 'Aktif' }}</span>
        </button>
      </div>

      <!-- Color Palette Picker -->
      <div class="space-y-2">
        <span class="text-xs font-semibold text-slate-500 block">Warna Utama</span>
        <div class="grid grid-cols-4 gap-2">
          <button 
            v-for="color in colors" 
            :key="color.id" 
            class="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-100 transition hover:bg-slate-50 hover:border-slate-300"
            :class="{'border-primary bg-primary/5 hover:border-primary': ui.themeColor === color.id}"
            @click="ui.setThemeColor(color.id)"
          >
            <span class="w-5 h-5 rounded-full block shadow-sm border border-black/5" :class="color.class"></span>
            <span class="text-[9px] font-bold text-slate-500" :class="{'text-primary': ui.themeColor === color.id}">{{ color.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
