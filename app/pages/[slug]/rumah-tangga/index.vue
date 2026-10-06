<template>
  <div class="space-y-6">
    <!-- Header Page & Period Selector -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-content/10 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-base-content tracking-tight flex items-center gap-2">
          <lucide.Home class="w-7 h-7 text-primary" />
          Dashboard Keuangan Rumah Tangga
        </h1>
        <p class="text-sm text-base-content/60 mt-1">
          Pantau kesehatan keuangan, arus kas, dan pengeluaran operasional keluarga.
        </p>
      </div>

      <!-- Year & Month Selector -->
      <div class="flex items-center gap-2">
        <select v-model="selectedMonth" @change="loadDashboard" class="select select-bordered select-sm rounded-xl">
          <option v-for="(name, idx) in monthsList" :key="idx" :value="idx + 1">
            {{ name }}
          </option>
        </select>

        <select v-model="selectedYear" @change="loadDashboard" class="select select-bordered select-sm rounded-xl">
          <option v-for="y in yearsList" :key="y" :value="y">
            {{ y }}
          </option>
        </select>

        <button @click="loadDashboard" class="btn btn-primary btn-sm rounded-xl" :disabled="loading">
          <lucide.RefreshCw :class="{'animate-spin': loading}" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Quick Navigation Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <NuxtLink :to="`/${slug}/rumah-tangga/transaksi`" class="btn btn-outline border-base-content/10 hover:btn-primary justify-start rounded-xl gap-2 text-xs sm:text-sm">
        <lucide.Receipt class="w-4 h-4 text-primary" />
        Data Transaksi
      </NuxtLink>
      <NuxtLink :to="`/${slug}/rumah-tangga/kategori`" class="btn btn-outline border-base-content/10 hover:btn-primary justify-start rounded-xl gap-2 text-xs sm:text-sm">
        <lucide.Tags class="w-4 h-4 text-info" />
        Kategori
      </NuxtLink>
      <NuxtLink :to="`/${slug}/rumah-tangga/anggaran`" class="btn btn-outline border-base-content/10 hover:btn-primary justify-start rounded-xl gap-2 text-xs sm:text-sm">
        <lucide.PieChart class="w-4 h-4 text-warning" />
        Anggaran (Budget)
      </NuxtLink>
      <NuxtLink :to="`/${slug}/rumah-tangga/laporan`" class="btn btn-outline border-base-content/10 hover:btn-primary justify-start rounded-xl gap-2 text-xs sm:text-sm">
        <lucide.FileText class="w-4 h-4 text-success" />
        Laporan Akuntansi
      </NuxtLink>
    </div>

    <!-- Stat Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <!-- Total Pemasukan -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Total Pemasukan</span>
          <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <lucide.ArrowDownLeft class="w-5 h-5" />
          </div>
        </div>
        <h3 class="text-2xl font-extrabold text-emerald-600 mt-2">
          {{ formatRupiah(summary.totalIncome) }}
        </h3>
        <div class="flex items-center gap-1.5 text-xs font-semibold mt-2" :class="summary.incomeChangePercentage >= 0 ? 'text-success' : 'text-error'">
          <span>{{ summary.incomeChangePercentage >= 0 ? '▲' : '▼' }} {{ Math.abs(summary.incomeChangePercentage) }}%</span>
          <span class="text-base-content/40 font-normal">vs bulan lalu</span>
        </div>
      </div>

      <!-- Total Pengeluaran -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Total Pengeluaran</span>
          <div class="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <lucide.ArrowUpRight class="w-5 h-5" />
          </div>
        </div>
        <h3 class="text-2xl font-extrabold text-rose-600 mt-2">
          {{ formatRupiah(summary.totalExpense) }}
        </h3>
        <div class="flex items-center gap-1.5 text-xs font-semibold mt-2" :class="summary.expenseChangePercentage <= 0 ? 'text-success' : 'text-error'">
          <span>{{ summary.expenseChangePercentage >= 0 ? '▲' : '▼' }} {{ Math.abs(summary.expenseChangePercentage) }}%</span>
          <span class="text-base-content/40 font-normal">vs bulan lalu</span>
        </div>
      </div>

      <!-- Sisa Saldo (Net Balance) -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Sisa Saldo Net</span>
          <div class="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
            <lucide.Wallet class="w-5 h-5" />
          </div>
        </div>
        <h3 class="text-2xl font-extrabold text-base-content mt-2" :class="summary.netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'">
          {{ formatRupiah(summary.netBalance) }}
        </h3>
        <div class="flex items-center gap-1.5 text-xs font-semibold mt-2 text-base-content/50">
          <span>Total {{ summary.totalTransactionsCount }} Transaksi</span>
        </div>
      </div>

      <!-- Status Penggunaan Anggaran -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Penggunaan Anggaran</span>
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <lucide.PieChart class="w-5 h-5" />
          </div>
        </div>
        <h3 class="text-2xl font-extrabold mt-2" :class="totalBudgetUsed > totalTargetBudget && totalTargetBudget > 0 ? 'text-rose-600' : 'text-amber-600'">
          {{ budgetUsagePercentage }}%
        </h3>
        <div class="mt-2 space-y-1">
          <div class="w-full bg-base-200 h-1.5 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-500"
              :class="totalBudgetUsed > totalTargetBudget && totalTargetBudget > 0 ? 'bg-rose-500' : 'bg-amber-500'"
              :style="{ width: `${Math.min(budgetUsagePercentage, 100)}%` }"
            ></div>
          </div>
          <p class="text-[11px] text-base-content/50 flex items-center justify-between">
            <span>Target: {{ formatRupiah(totalTargetBudget) }}</span>
            <span v-if="totalTargetBudget === 0" class="italic">Belum di-set</span>
            <span v-else-if="totalBudgetUsed > totalTargetBudget" class="text-error font-bold">Overbudget!</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Visual Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Daily Trend Line & Area Chart -->
        <div class="lg:col-span-2 bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
          <!-- Chart Top Bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base-content/5 pb-3">
            <div>
              <h2 class="text-base sm:text-lg font-bold text-base-content flex items-center gap-2">
                <lucide.TrendingUp class="w-5 h-5 text-primary" />
                Tren Pemasukan vs Pengeluaran Harian
              </h2>
              <p class="text-xs text-base-content/50">Grafik pergerakan arus kas bulan {{ monthsList[selectedMonth - 1] }} {{ selectedYear }}</p>
            </div>

            <div class="flex items-center gap-3 text-xs font-semibold">
              <div class="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-xl">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Pemasukan</span>
              </div>
              <div class="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 px-3 py-1 rounded-xl">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Pengeluaran</span>
              </div>
            </div>
          </div>

          <div v-if="loading" class="h-64 flex items-center justify-center">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>

          <div v-else class="space-y-2">
            <!-- Modern SVG Container -->
            <div class="relative h-64 w-full pt-4">
              <!-- Floating Glassmorphism Tooltip -->
              <div
                v-if="hoveredPoint"
                class="absolute z-20 pointer-events-none transition-all duration-150 transform -translate-x-1/2 bg-base-100/95 backdrop-blur-md border border-base-content/15 shadow-2xl p-3 rounded-xl text-xs space-y-1 min-w-[160px]"
                :style="{ left: `${hoveredPoint.x}%`, top: '10px' }"
              >
                <div class="font-bold text-base-content border-b border-base-content/10 pb-1 flex items-center gap-1">
                  <lucide.Calendar class="w-3.5 h-3.5 text-primary" />
                  {{ formatDate(hoveredPoint.date) }}
                </div>
                <div class="flex items-center justify-between gap-3 pt-0.5">
                  <span class="text-emerald-600 font-medium">💰 Pemasukan:</span>
                  <span class="font-bold text-emerald-600">+{{ formatRupiah(hoveredPoint.income) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-rose-600 font-medium">💸 Pengeluaran:</span>
                  <span class="font-bold text-rose-600">-{{ formatRupiah(hoveredPoint.expense) }}</span>
                </div>
              </div>

              <!-- SVG Canvas -->
              <svg class="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                <defs>
                  <!-- Gradient for Income -->
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
                  </linearGradient>

                  <!-- Gradient for Expense -->
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Horizontal Background Grid Lines -->
                <line x1="0" y1="8" x2="100" y2="8" stroke="currentColor" stroke-dasharray="2 2" class="text-base-content/10" />
                <line x1="0" y1="23" x2="100" y2="23" stroke="currentColor" stroke-dasharray="2 2" class="text-base-content/10" />
                <line x1="0" y1="38" x2="100" y2="38" stroke="currentColor" stroke-dasharray="2 2" class="text-base-content/10" />

                <!-- Income Area Fill & Smooth Line -->
                <path :d="chartIncomeAreaPath" fill="url(#incomeGrad)" />
                <path :d="chartIncomePath" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Expense Area Fill & Smooth Line -->
                <path :d="chartExpenseAreaPath" fill="url(#expenseGrad)" />
                <path :d="chartExpensePath" fill="none" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Interactive Vertical Hover Guideline -->
                <line
                  v-if="hoveredPoint"
                  :x1="hoveredPoint.x"
                  y1="5"
                  :x2="hoveredPoint.x"
                  y2="48"
                  stroke="currentColor"
                  stroke-dasharray="2 2"
                  class="text-primary/60"
                  stroke-width="0.6"
                />

                <!-- Active Data Circles on Days with Transactions -->
                <g v-for="pt in chartPoints" :key="pt.day">
                  <!-- Income Node -->
                  <circle
                    v-if="pt.income > 0"
                    :cx="pt.x"
                    :cy="pt.yIncome"
                    r="1.8"
                    fill="#10b981"
                    stroke="#ffffff"
                    stroke-width="0.8"
                    class="cursor-pointer hover:scale-125 transition-transform"
                    @mouseenter="hoveredPoint = pt"
                    @mouseleave="hoveredPoint = null"
                  />
                  <!-- Expense Node -->
                  <circle
                    v-if="pt.expense > 0"
                    :cx="pt.x"
                    :cy="pt.yExpense"
                    r="1.8"
                    fill="#f43f5e"
                    stroke="#ffffff"
                    stroke-width="0.8"
                    class="cursor-pointer hover:scale-125 transition-transform"
                    @mouseenter="hoveredPoint = pt"
                    @mouseleave="hoveredPoint = null"
                  />
                  <!-- Invisible Hover Area for Every Day -->
                  <rect
                    :x="pt.x - 1.5"
                    y="0"
                    width="3"
                    height="50"
                    fill="transparent"
                    class="cursor-pointer"
                    @mouseenter="hoveredPoint = pt"
                    @mouseleave="hoveredPoint = null"
                  />
                </g>
              </svg>
            </div>

            <!-- X-Axis Day Labels -->
            <div class="flex items-center justify-between text-[11px] text-base-content/40 px-1 pt-1 border-t border-base-content/5">
              <span v-for="pt in axisTickDays" :key="pt.day" class="font-medium">
                Tgl {{ pt.day }}
              </span>
            </div>
          </div>
        </div>

      <!-- Category Breakdown Donut / Progress -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 class="text-lg font-bold text-base-content flex items-center gap-2">
          <lucide.PieChart class="w-5 h-5 text-info" />
          Proporsi Pengeluaran per Kategori
        </h2>

        <div v-if="loading" class="h-64 flex items-center justify-center">
          <span class="loading loading-spinner loading-md text-info"></span>
        </div>
        <div v-else-if="categoryBreakdown.length === 0" class="h-64 flex items-center justify-center text-base-content/40 text-sm">
          Tidak ada pengeluaran per kategori.
        </div>
        <div v-else class="space-y-3 max-h-64 overflow-y-auto pr-1">
          <div v-for="cat in categoryBreakdown" :key="cat.categoryId" class="space-y-1">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="flex items-center gap-1.5 text-base-content/80">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: cat.color || '#3b82f6' }"></span>
                {{ cat.categoryName }}
              </span>
              <span class="text-base-content/70">{{ formatRupiah(cat.totalAmount ?? (cat as any).total) }} ({{ cat.percentage || 0 }}%)</span>
            </div>
            <div class="w-full bg-base-200 h-2 rounded-full overflow-hidden">
              <div class="h-full transition-all duration-500" :style="{ width: `${cat.percentage || 0}%`, backgroundColor: cat.color || '#3b82f6' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Family Member Breakdown & Recent Transactions -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Member Breakdown -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 class="text-lg font-bold text-base-content flex items-center gap-2">
          <lucide.Users class="w-5 h-5 text-accent" />
          Pengeluaran per Anggota Keluarga
        </h2>

        <div v-if="loading" class="h-48 flex items-center justify-center">
          <span class="loading loading-spinner loading-md text-accent"></span>
        </div>
        <div v-else-if="memberBreakdown.length === 0" class="h-48 flex items-center justify-center text-base-content/40 text-sm">
          Belum ada data anggota keluarga.
        </div>
        <div v-else class="space-y-3">
          <div v-for="mem in memberBreakdown" :key="mem.memberId" class="flex items-center justify-between p-3 rounded-xl bg-base-200/50">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {{ (mem.memberName || 'A').charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="text-sm font-semibold text-base-content">{{ mem.memberName }}</p>
                <p class="text-xs text-base-content/50">{{ mem.percentage || 0 }}% dari total</p>
              </div>
            </div>
            <span class="text-sm font-bold text-rose-600">{{ formatRupiah(mem.totalAmount ?? (mem as any).total) }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Recent Transactions -->
      <div class="lg:col-span-2 bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-base-content flex items-center gap-2">
            <lucide.History class="w-5 h-5 text-warning" />
            Transaksi Terakhir
          </h2>
          <NuxtLink :to="`/${slug}/rumah-tangga/transaksi`" class="text-xs text-primary font-semibold hover:underline">
            Lihat Semua →
          </NuxtLink>
        </div>

        <div v-if="loading" class="h-48 flex items-center justify-center">
          <span class="loading loading-spinner loading-md text-warning"></span>
        </div>
        <div v-else-if="recentTransactions.length === 0" class="h-48 flex items-center justify-center text-base-content/40 text-sm">
          Belum ada transaksi terbaru.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table table-sm w-full">
            <thead>
              <tr class="text-base-content/50">
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Kategori</th>
                <th>Tipe</th>
                <th class="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in recentTransactions" :key="tx.id" class="hover:bg-base-200/40 transition">
                <td class="text-xs text-base-content/70 whitespace-nowrap">{{ formatDate(tx.transactionDate) }}</td>
                <td class="font-semibold text-xs text-base-content">{{ tx.description || tx.title }}</td>
                <td>
                  <span class="badge badge-sm badge-ghost text-xs font-normal">
                    {{ tx.category?.name || '-' }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge badge-sm font-semibold"
                    :class="(tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? 'badge-success text-white' : 'badge-error text-white'"
                  >
                    {{ (tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? 'PEMASUKAN' : 'PENGELUARAN' }}
                  </span>
                </td>
                <td class="text-right font-bold text-xs" :class="(tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? 'text-emerald-600' : 'text-rose-600'">
                  {{ (tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? '+' : '-' }}{{ formatRupiah(tx.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
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
import type {
  DashboardSummary,
  DailyChartData,
  CategoryBreakdownData,
  MemberBreakdownData,
  Transaction,
} from '@/types/rumah-tangga';

definePageMeta({ layout: 'admin' });

const route = useRoute();
const slug = computed(() => route.params.slug as string || 'default');

const service = RumahTanggaService();

const loading = ref(false);
const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());

const monthsList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const yearsList = computed(() => {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
});

const summary = ref<DashboardSummary>({
  totalIncome: 0,
  totalExpense: 0,
  netBalance: 0,
  incomeChangePercentage: 0,
  expenseChangePercentage: 0,
  netBalanceChangePercentage: 0,
  totalTransactionsCount: 0,
});

const dailyChart = ref<DailyChartData[]>([]);
const categoryBreakdown = ref<CategoryBreakdownData[]>([]);
const memberBreakdown = ref<MemberBreakdownData[]>([]);
const recentTransactions = ref<Transaction[]>([]);

const totalTargetBudget = ref(0);
const totalBudgetUsed = ref(0);

const budgetUsagePercentage = computed(() => {
  if (!totalTargetBudget.value || totalTargetBudget.value <= 0) return 0;
  return Math.round((totalBudgetUsed.value / totalTargetBudget.value) * 100);
});

const savingRatio = computed(() => {
  if (!summary.value.totalIncome || summary.value.totalIncome <= 0) return 0;
  const net = summary.value.totalIncome - summary.value.totalExpense;
  if (net <= 0) return 0;
  return Math.round((net / summary.value.totalIncome) * 100);
});

const formatRupiah = (val: number | string | undefined) => {
  if (val === undefined || val === null) return 'Rp 0';
  const num = Number(val);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const hoveredPoint = ref<{ day: number; date: string; income: number; expense: number; x: number; yIncome: number; yExpense: number } | null>(null);

const maxDailyVal = computed(() => {
  if (!dailyChart.value || dailyChart.value.length === 0) return 1000;
  const max = Math.max(...dailyChart.value.map(d => Math.max(Number(d.income || 0), Number(d.expense || 0))));
  return max > 0 ? max : 1000;
});

const chartPoints = computed(() => {
  if (!dailyChart.value || dailyChart.value.length === 0) return [];
  const totalPoints = dailyChart.value.length;
  const maxVal = maxDailyVal.value;

  return dailyChart.value.map((d, idx) => {
    const x = (idx / (totalPoints - 1 || 1)) * 100;
    const inc = Number(d.income || 0);
    const exp = Number(d.expense || 0);
    const yIncome = 45 - (inc / maxVal) * 35;
    const yExpense = 45 - (exp / maxVal) * 35;
    return {
      day: d.day || idx + 1,
      date: d.date,
      income: inc,
      expense: exp,
      x,
      yIncome,
      yExpense,
    };
  });
});

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) * 0.15;
    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
    const cp2x = p2.x - (p3.x - p1.x) * 0.15;
    const cp2y = p2.y - (p3.y - p1.y) * 0.15;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

const chartIncomePath = computed(() => {
  const points = chartPoints.value.map(p => ({ x: p.x, y: p.yIncome }));
  return buildSmoothPath(points);
});

const chartIncomeAreaPath = computed(() => {
  const line = chartIncomePath.value;
  if (!line) return '';
  return `${line} L 100 48 L 0 48 Z`;
});

const chartExpensePath = computed(() => {
  const points = chartPoints.value.map(p => ({ x: p.x, y: p.yExpense }));
  return buildSmoothPath(points);
});

const chartExpenseAreaPath = computed(() => {
  const line = chartExpensePath.value;
  if (!line) return '';
  return `${line} L 100 48 L 0 48 Z`;
});

const axisTickDays = computed(() => {
  return chartPoints.value.filter(p => p.day === 1 || p.day % 5 === 0 || p.day === chartPoints.value.length);
});

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [sumRes, dailyRes, catRes, memRes, txRes, budgetRes] = await Promise.all([
      service.getDashboardSummary(selectedYear.value, selectedMonth.value),
      service.getDailyChart(selectedYear.value, selectedMonth.value),
      service.getCategoryBreakdown(selectedYear.value, selectedMonth.value),
      service.getMemberBreakdown(selectedYear.value, selectedMonth.value),
      service.getTransactions({ limit: 5, sortBy: 'transactionDate', sortType: 'desc' }),
      service.getBudgets(selectedYear.value, selectedMonth.value),
    ]);

    if (sumRes) summary.value = sumRes;
    if (dailyRes) dailyChart.value = dailyRes;
    if (catRes) categoryBreakdown.value = catRes;
    if (memRes) memberBreakdown.value = memRes;
    if (txRes && txRes.items) recentTransactions.value = txRes.items;

    if (budgetRes && Array.isArray(budgetRes)) {
      totalTargetBudget.value = budgetRes.reduce((acc, b) => acc + Number(b.budgetAmount || 0), 0);
      totalBudgetUsed.value = budgetRes.reduce((acc, b) => acc + Number(b.usedAmount ?? b.realizedAmount ?? 0), 0);
    }
  } catch (err) {
    console.error('Gagal memuat data dashboard:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDashboard();
});
</script>
