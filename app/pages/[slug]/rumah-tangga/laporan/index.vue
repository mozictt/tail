<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-content/10 shadow-sm">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
          <NuxtLink :to="`/${slug}/rumah-tangga`" class="hover:underline">Rumah Tangga</NuxtLink>
          <span>/</span>
          <span>Laporan Akuntansi</span>
        </div>
        <h1 class="text-2xl font-bold text-base-content tracking-tight flex items-center gap-2">
          <lucide.FileText class="w-7 h-7 text-success" />
          Laporan Akuntansi & Arus Kas
        </h1>
        <p class="text-sm text-base-content/60 mt-0.5">
          Rekapitulasi lengkap pemasukan, pengeluaran rutin, dan analisa tren akuntansi rumah tangga.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <select v-model="selectedYear" @change="loadActiveReport" class="select select-bordered select-sm rounded-xl">
          <option v-for="y in yearsList" :key="y" :value="y">{{ y }}</option>
        </select>

        <button @click="printReport" class="btn btn-outline btn-sm rounded-xl gap-1 text-xs">
          <lucide.Printer class="w-3.5 h-3.5" />
          Cetak / PDF
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="flex items-center gap-2 border-b border-base-content/10 pb-2 overflow-x-auto">
      <button
        @click="activeTab = 'monthly'; loadActiveReport()"
        class="btn btn-sm rounded-xl"
        :class="activeTab === 'monthly' ? 'btn-primary' : 'btn-ghost'"
      >
        <lucide.Calendar class="w-4 h-4" />
        Laporan Bulanan (12 Bulan)
      </button>

      <button
        @click="activeTab = 'category'; loadActiveReport()"
        class="btn btn-sm rounded-xl"
        :class="activeTab === 'category' ? 'btn-primary' : 'btn-ghost'"
      >
        <lucide.PieChart class="w-4 h-4" />
        Laporan per Kategori
      </button>

      <button
        @click="activeTab = 'recurring'; loadActiveReport()"
        class="btn btn-sm rounded-xl"
        :class="activeTab === 'recurring' ? 'btn-primary' : 'btn-ghost'"
      >
        <lucide.Repeat class="w-4 h-4" />
        Pengeluaran Rutin / Tagihan
      </button>

      <button
        @click="activeTab = 'trend'; loadActiveReport()"
        class="btn btn-sm rounded-xl"
        :class="activeTab === 'trend' ? 'btn-primary' : 'btn-ghost'"
      >
        <lucide.TrendingUp class="w-4 h-4" />
        Analisa Tren (6 Bulan)
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-base-100 p-12 rounded-2xl border border-base-content/10 text-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="text-sm text-base-content/50 mt-2">Menyusun laporan akuntansi...</p>
    </div>

    <!-- TAB 1: LAPORAN BULANAN (12 BULAN) -->
    <div v-else-if="activeTab === 'monthly'" class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm p-5 space-y-4">
      <h2 class="text-lg font-bold text-base-content">
        Ringkasan Akuntansi Bulanan Tahun {{ selectedYear }}
      </h2>

      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead class="bg-base-200/50">
            <tr class="text-xs text-base-content/60">
              <th>Bulan</th>
              <th class="text-right">Total Pemasukan</th>
              <th class="text-right">Total Pengeluaran</th>
              <th class="text-right">Surplus / Defisit (Net)</th>
              <th>Visual Arus Kas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-base-content/5">
            <tr v-for="item in monthlyReport" :key="item.month" class="hover:bg-base-200/30 transition text-sm">
              <td class="font-bold text-base-content">{{ item.monthName }}</td>
              <td class="text-right font-semibold text-emerald-600">{{ formatRupiah(item.income) }}</td>
              <td class="text-right font-semibold text-rose-600">{{ formatRupiah(item.expense) }}</td>
              <td class="text-right font-extrabold" :class="item.net >= 0 ? 'text-indigo-600' : 'text-rose-600'">
                {{ formatRupiah(item.net) }}
              </td>
              <td>
                <div class="w-full bg-base-200 h-2 rounded-full overflow-hidden flex">
                  <div
                    class="bg-emerald-500 h-full"
                    :style="{ width: `${item.income + item.expense > 0 ? (item.income / (item.income + item.expense)) * 100 : 0}%` }"
                  ></div>
                  <div
                    class="bg-rose-500 h-full"
                    :style="{ width: `${item.income + item.expense > 0 ? (item.expense / (item.income + item.expense)) * 100 : 0}%` }"
                  ></div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-base-200/80 font-bold text-sm">
            <tr>
              <td>TOTAL TAHUNAN</td>
              <td class="text-right text-emerald-600">{{ formatRupiah(totalYearlyIncome) }}</td>
              <td class="text-right text-rose-600">{{ formatRupiah(totalYearlyExpense) }}</td>
              <td class="text-right" :class="totalYearlyNet >= 0 ? 'text-indigo-600' : 'text-rose-600'">
                {{ formatRupiah(totalYearlyNet) }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- TAB 2: LAPORAN PER KATEGORI -->
    <div v-else-if="activeTab === 'category'" class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-base-content">
          Pengeluaran per Kategori Tahun {{ selectedYear }}
        </h2>
        <select v-model="selectedMonth" @change="loadActiveReport" class="select select-bordered select-sm rounded-xl">
          <option :value="undefined">Seluruh Bulan (Setahun)</option>
          <option v-for="(name, idx) in monthsList" :key="idx" :value="idx + 1">{{ name }}</option>
        </select>
      </div>

      <div v-if="categoryReport.length === 0" class="p-8 text-center text-base-content/40">
        Belum ada data pengeluaran per kategori.
      </div>
      <div v-else class="space-y-3">
        <div v-for="cat in categoryReport" :key="cat.categoryId" class="bg-base-200/40 p-4 rounded-xl space-y-2">
          <div class="flex items-center justify-between text-sm font-bold">
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: cat.color || '#3b82f6' }"></span>
              {{ cat.categoryName }}
            </span>
            <span class="text-rose-600">{{ formatRupiah(cat.totalAmount) }} ({{ cat.percentage }}%)</span>
          </div>

          <div class="w-full bg-base-300 h-2.5 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-500"
              :style="{ width: `${cat.percentage}%`, backgroundColor: cat.color || '#3b82f6' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: PENGELUARAN RUTIN / TAGIHAN -->
    <div v-else-if="activeTab === 'recurring'" class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm p-5 space-y-4">
      <h2 class="text-lg font-bold text-base-content">
        Daftar Pengeluaran Rutin & Tagihan Tetap
      </h2>

      <div v-if="recurringReport.length === 0" class="p-8 text-center text-base-content/40">
        Belum ada pengeluaran rutin yang tercatat.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="table w-full">
          <thead class="bg-base-200/50">
            <tr class="text-xs text-base-content/60">
              <th>Nama Tagihan</th>
              <th>Kategori</th>
              <th>Frekuensi</th>
              <th class="text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in recurringReport" :key="tx.id" class="hover:bg-base-200/30">
              <td class="font-bold text-base-content">{{ tx.title }}</td>
              <td><span class="badge badge-sm badge-ghost">{{ tx.category?.name || '-' }}</span></td>
              <td><span class="badge badge-sm badge-secondary">{{ tx.recurringFrequency || 'BULANAN' }}</span></td>
              <td class="text-right font-bold text-rose-600">{{ formatRupiah(tx.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 4: TREND REPORT -->
    <div v-else-if="activeTab === 'trend'" class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm p-5 space-y-4">
      <h2 class="text-lg font-bold text-base-content">
        Tren Pengeluaran 6 Bulan Terakhir
      </h2>

      <div v-if="trendReport.length === 0" class="p-8 text-center text-base-content/40">
        Belum cukup data tren pengeluaran.
      </div>
      <div v-else class="space-y-4">
        <div v-for="t in trendReport" :key="t.monthName" class="space-y-1">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span>{{ t.monthName }} {{ t.year }}</span>
            <span class="text-rose-600 font-bold">{{ formatRupiah(t.expense) }}</span>
          </div>
          <div class="w-full bg-base-200 h-3 rounded-full overflow-hidden">
            <div class="bg-rose-500 h-full" :style="{ width: `${Math.min((t.expense / maxTrendExpense) * 100, 100)}%` }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import * as lucide from 'lucide-vue-next';
import { RumahTanggaService } from '@/services/rumah-tangga.service';
import type { MonthlyReportData } from '@/types/rumah-tangga';

definePageMeta({ layout: 'admin' });

const route = useRoute();
const slug = computed(() => route.params.slug as string || 'default');
const service = RumahTanggaService();

const loading = ref(false);
const activeTab = ref<'monthly' | 'category' | 'recurring' | 'trend'>('monthly');
const selectedYear = ref(new Date().getFullYear());
const selectedMonth = ref<number | undefined>(undefined);

const monthsList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const yearsList = computed(() => {
  const c = new Date().getFullYear();
  return [c - 2, c - 1, c, c + 1];
});

const monthlyReport = ref<MonthlyReportData[]>([]);
const categoryReport = ref<any[]>([]);
const recurringReport = ref<any[]>([]);
const trendReport = ref<any[]>([]);

const totalYearlyIncome = computed(() => monthlyReport.value.reduce((acc, m) => acc + (m.income || 0), 0));
const totalYearlyExpense = computed(() => monthlyReport.value.reduce((acc, m) => acc + (m.expense || 0), 0));
const totalYearlyNet = computed(() => totalYearlyIncome.value - totalYearlyExpense.value);

const maxTrendExpense = computed(() => {
  if (trendReport.value.length === 0) return 1;
  return Math.max(...trendReport.value.map(t => t.expense), 1);
});

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const loadActiveReport = async () => {
  loading.value = true;
  try {
    if (activeTab.value === 'monthly') {
      const res = await service.getMonthlyReport(selectedYear.value);
      if (res) monthlyReport.value = res;
    } else if (activeTab.value === 'category') {
      const res = await service.getCategoryReport(selectedYear.value, selectedMonth.value);
      if (res) categoryReport.value = res;
    } else if (activeTab.value === 'recurring') {
      const res = await service.getRecurringReport(selectedYear.value, selectedMonth.value);
      if (res) recurringReport.value = res;
    } else if (activeTab.value === 'trend') {
      const res = await service.getTrendReport(6);
      if (res) trendReport.value = res;
    }
  } catch (err) {
    console.error('Error loading report:', err);
  } finally {
    loading.value = false;
  }
};

const printReport = () => {
  window.print();
};

onMounted(() => {
  loadActiveReport();
});
</script>
