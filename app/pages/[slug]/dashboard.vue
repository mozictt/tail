<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Selamat Datang Kembali, John! 👋</h2>
      <p class="text-sm text-slate-500">Berikut adalah ikhtisar performa aplikasi Anda hari ini.</p>
    </div>

    <!-- Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Users Card -->
      <div class="bg-white border border-slate-100 rounded-2xl shadow-premium p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pengguna</p>
          <h3 class="text-3xl font-extrabold text-slate-800">1,245</h3>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-success">
            <span class="bg-success/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <icons.TrendingUp class="w-3.5 h-3.5" /> +12.4%
            </span>
            <span class="text-slate-400 font-medium">vs bulan lalu</span>
          </div>
        </div>
        <div class="p-4 rounded-2xl bg-indigo-50 text-indigo-600 shadow-glow">
          <icons.Users class="w-7 h-7" />
        </div>
      </div>

      <!-- Sales Card -->
      <div class="bg-white border border-slate-100 rounded-2xl shadow-premium p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Penjualan</p>
          <h3 class="text-3xl font-extrabold text-slate-800">$12,340</h3>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-success">
            <span class="bg-success/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <icons.TrendingUp class="w-3.5 h-3.5" /> +8.2%
            </span>
            <span class="text-slate-400 font-medium">vs bulan lalu</span>
          </div>
        </div>
        <div class="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
          <icons.DollarSign class="w-7 h-7" />
        </div>
      </div>

      <!-- Orders Card -->
      <div class="bg-white border border-slate-100 rounded-2xl shadow-premium p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pesanan</p>
          <h3 class="text-3xl font-extrabold text-slate-800">543</h3>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-error">
            <span class="bg-error/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <icons.TrendingDown class="w-3.5 h-3.5" /> -2.4%
            </span>
            <span class="text-slate-400 font-medium">vs minggu lalu</span>
          </div>
        </div>
        <div class="p-4 rounded-2xl bg-amber-50 text-amber-600">
          <icons.Package class="w-7 h-7" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as icons from "lucide-vue-next";
definePageMeta({ layout: 'admin' })
</script>

