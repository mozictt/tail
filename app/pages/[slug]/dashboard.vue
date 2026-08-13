<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Welcome Header -->
    <div class="flex flex-col gap-1">
      <h2 class="text-xl sm:text-2xl font-bold text-base-content tracking-tight">Selamat Datang Kembali, John! 👋</h2>
      <p class="text-xs sm:text-sm text-base-content/60">Berikut adalah ikhtisar performa aplikasi Anda hari ini.</p>
    </div>

    <!-- Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <!-- Users Card -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm hover:shadow-md p-4 sm:p-6 transition-all duration-300 flex items-center justify-between">
        <div class="space-y-1.5 sm:space-y-2">
          <p class="text-[11px] sm:text-xs font-semibold text-base-content/50 uppercase tracking-wider">Total Pengguna</p>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-base-content">1,245</h3>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-success">
            <span class="bg-success/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <icons.TrendingUp class="w-3.5 h-3.5" /> +12.4%
            </span>
            <span class="text-base-content/40 font-medium">vs bulan lalu</span>
          </div>
        </div>
        <div class="p-3.5 sm:p-4 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <icons.Users class="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
      </div>

      <!-- Sales Card -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm hover:shadow-md p-4 sm:p-6 transition-all duration-300 flex items-center justify-between">
        <div class="space-y-1.5 sm:space-y-2">
          <p class="text-[11px] sm:text-xs font-semibold text-base-content/50 uppercase tracking-wider">Total Penjualan</p>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-base-content">$12,340</h3>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-success">
            <span class="bg-success/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <icons.TrendingUp class="w-3.5 h-3.5" /> +8.2%
            </span>
            <span class="text-base-content/40 font-medium">vs bulan lalu</span>
          </div>
        </div>
        <div class="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
          <icons.DollarSign class="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
      </div>

      <!-- Orders Card -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm hover:shadow-md p-4 sm:p-6 transition-all duration-300 flex items-center justify-between">
        <div class="space-y-1.5 sm:space-y-2">
          <p class="text-[11px] sm:text-xs font-semibold text-base-content/50 uppercase tracking-wider">Total Pesanan</p>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-base-content">543</h3>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-error">
            <span class="bg-error/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <icons.TrendingDown class="w-3.5 h-3.5" /> -2.4%
            </span>
            <span class="text-base-content/40 font-medium">vs minggu lalu</span>
          </div>
        </div>
        <div class="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 text-amber-500">
          <icons.Package class="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as icons from "lucide-vue-next";
definePageMeta({ layout: 'admin' })
</script>

