<template>
  <div class="space-y-6">
    <!-- Header & Period Selector -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-content/10 shadow-sm">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
          <NuxtLink :to="`/${slug}/rumah-tangga`" class="hover:underline">Rumah Tangga</NuxtLink>
          <span>/</span>
          <span>Anggaran (Budget)</span>
        </div>
        <h1 class="text-2xl font-bold text-base-content tracking-tight flex items-center gap-2">
          <lucide.PieChart class="w-7 h-7 text-warning" />
          Perencanaan & Control Anggaran
        </h1>
        <p class="text-sm text-base-content/60 mt-0.5">
          Tetapkan batas anggaran belanja bulanan per kategori dan pantau persentase realisasinya.
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <select v-model="selectedMonth" @change="fetchBudgets" class="select select-bordered select-sm rounded-xl">
          <option v-for="(name, idx) in monthsList" :key="idx" :value="idx + 1">
            {{ name }}
          </option>
        </select>
        <select v-model="selectedYear" @change="fetchBudgets" class="select select-bordered select-sm rounded-xl">
          <option v-for="y in yearsList" :key="y" :value="y">
            {{ y }}
          </option>
        </select>
        <button
          @click="generateBudget"
          class="btn btn-outline btn-sm rounded-xl gap-2 border-info text-info hover:bg-info hover:text-white shadow-sm"
          :disabled="generating"
          :title="`Salin anggaran dari bulan ${prevMonthLabel} ke ${monthsList[selectedMonth - 1]} ${selectedYear}`"
        >
          <span v-if="generating" class="loading loading-spinner loading-xs"></span>
          <lucide.Copy v-else class="w-4 h-4" />
          Generate dari Bulan Lalu
        </button>
        <button @click="openModal" class="btn btn-warning btn-sm rounded-xl text-white gap-2 shadow-sm">
          <lucide.Plus class="w-4 h-4" />
          Set Anggaran
        </button>
      </div>
    </div>

    <!-- Summary Overview Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm">
        <span class="text-xs font-semibold text-base-content/50 uppercase">Total Target Anggaran</span>
        <h3 class="text-2xl font-extrabold text-base-content mt-1">{{ formatRupiah(totalBudget) }}</h3>
      </div>
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm">
        <span class="text-xs font-semibold text-base-content/50 uppercase">Total Realisasi Saat Ini</span>
        <h3 class="text-2xl font-extrabold mt-1" :class="totalRealized > totalBudget ? 'text-rose-600' : 'text-emerald-600'">
          {{ formatRupiah(totalRealized) }}
        </h3>
      </div>
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm">
        <span class="text-xs font-semibold text-base-content/50 uppercase">Rata-rata Terpakai</span>
        <h3 class="text-2xl font-extrabold text-amber-600 mt-1">{{ overallPercentage }}%</h3>
      </div>
    </div>

    <!-- Budget List -->
    <div class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm p-5 space-y-4">
      <h2 class="text-lg font-bold text-base-content">
        Daftar Anggaran Kategori ({{ monthsList[selectedMonth - 1] }} {{ selectedYear }})
      </h2>

      <div v-if="loading" class="p-12 text-center">
        <span class="loading loading-spinner loading-lg text-warning"></span>
        <p class="text-sm text-base-content/50 mt-2">Memuat data anggaran...</p>
      </div>

      <div v-else-if="budgets.length === 0" class="p-12 text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto text-base-content/30">
          <lucide.PieChart class="w-8 h-8" />
        </div>
        <h3 class="text-base font-semibold text-base-content">Belum Ada Anggaran Ditetapkan</h3>
        <p class="text-xs text-base-content/50 max-w-sm mx-auto">
          Klik tombol Set Anggaran untuk membatasi pengeluaran per kategori di bulan ini.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="b in budgets"
          :key="b.id"
          class="bg-base-200/40 border border-base-content/10 rounded-2xl p-4 space-y-3 hover:border-warning/50 transition"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: b.category?.color || '#f59e0b' }"></span>
              <h3 class="font-bold text-base text-base-content">{{ b.category?.name || 'Kategori' }}</h3>
            </div>
            <button @click="confirmDelete(b)" class="btn btn-ghost btn-square btn-xs text-error">
              <lucide.Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex items-center justify-between text-xs">
            <span class="text-base-content/60">Target: <strong class="text-base-content">{{ formatRupiah(b.budgetAmount) }}</strong></span>
            <span class="text-base-content/60">Realisasi: <strong :class="getRealizationColorClass(b)">{{ formatRupiah(getRealizedAmount(b)) }}</strong></span>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-1">
            <div class="w-full bg-base-300 h-2.5 rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-500"
                :class="getProgressBarBg(b)"
                :style="{ width: `${Math.min(getPercentage(b), 100)}%` }"
              ></div>
            </div>

            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold" :class="getRealizationColorClass(b)">
                {{ getPercentage(b) }}% Terpakai
              </span>
              <span v-if="getPercentage(b) > 100" class="text-error font-semibold flex items-center gap-0.5">
                <lucide.AlertTriangle class="w-3 h-3" /> Overbudget!
              </span>
              <span v-else class="text-base-content/40">
                Sisa: {{ formatRupiah(b.remainingAmount !== undefined ? b.remainingAmount : Math.max(b.budgetAmount - getRealizedAmount(b), 0)) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upsert Modal -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" :checked="showModal" />
      <div v-if="showModal" class="modal modal-open backdrop-blur-md bg-slate-950/40" @click.self="!saving && (showModal = false)">
        <div class="modal-box rounded-3xl max-w-md bg-base-100 border border-base-content/10 p-6 shadow-2xl relative text-base-content">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error transition" @click="showModal = false">
            ✕
          </button>

          <h3 class="font-extrabold text-lg text-base-content flex items-center gap-2 pr-8">
            <lucide.PieChart class="w-5 h-5 text-warning" />
            Atur Anggaran Kategori
          </h3>

          <form @submit.prevent="submitBudget" class="space-y-4 mt-4">
            <div class="form-control">
              <label class="label text-xs font-semibold">Kategori Pengeluaran <span class="text-error">*</span></label>
              <select v-model.number="form.categoryId" required class="select select-bordered select-sm rounded-xl w-full">
                <option :value="0" disabled>Pilih Kategori</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label text-xs font-semibold">Target Anggaran (Rp) <span class="text-error">*</span></label>
              <UiInputRupiah
                v-model="form.amount"
                required
                placeholder="1.000.000"
              />
            </div>

            <div class="form-control">
              <label class="label text-xs font-semibold">Catatan Opsional</label>
              <input
                v-model="form.note"
                type="text"
                placeholder="Contoh: Batas maksimal belanja pasar"
                class="input input-bordered input-sm rounded-xl w-full"
              />
            </div>

            <div class="modal-action">
              <button type="button" @click="showModal = false" class="btn btn-ghost btn-sm rounded-xl">Batal</button>
              <button type="submit" class="btn btn-warning btn-sm rounded-xl text-white" :disabled="saving">
                <span v-if="saving" class="loading loading-spinner loading-xs"></span>
                Simpan Anggaran
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import * as lucide from 'lucide-vue-next';
import Swal from 'sweetalert2';
import { RumahTanggaService } from '@/services/rumah-tangga.service';
import { CategoryType, type BudgetPlan, type ExpenseCategory } from '@/types/rumah-tangga';

definePageMeta({ layout: 'admin' });

const route = useRoute();
const slug = computed(() => route.params.slug as string || 'default');
const service = RumahTanggaService();

const loading = ref(false);
const saving = ref(false);
const generating = ref(false);
const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());

const budgets = ref<BudgetPlan[]>([]);
const categories = ref<ExpenseCategory[]>([]);

const showModal = ref(false);
const form = reactive({
  categoryId: 0,
  amount: 0,
  note: '',
});

const monthsList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Label bulan sebelumnya untuk tooltip tombol generate
const prevMonthLabel = computed(() => {
  const d = new Date(selectedYear.value, selectedMonth.value - 2, 1);
  return `${monthsList[d.getMonth()]} ${d.getFullYear()}`;
});

const yearsList = computed(() => {
  const c = new Date().getFullYear();
  return [c - 1, c, c + 1];
});

const getRealizedAmount = (b: BudgetPlan) => Number(b.usedAmount ?? b.realizedAmount ?? 0);

const totalBudget = computed(() => budgets.value.reduce((acc, b) => acc + Number(b.budgetAmount || 0), 0));
const totalRealized = computed(() => budgets.value.reduce((acc, b) => acc + getRealizedAmount(b), 0));
const overallPercentage = computed(() => {
  if (!totalBudget.value || totalBudget.value <= 0) return 0;
  return Math.round((totalRealized.value / totalBudget.value) * 100);
});

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const getPercentage = (b: BudgetPlan) => {
  if (b.percentage !== undefined && b.percentage !== null) return Number(b.percentage);
  const budget = Number(b.budgetAmount || 0);
  if (budget <= 0) return 0;
  return Math.round((getRealizedAmount(b) / budget) * 100);
};

const getRealizationColorClass = (b: BudgetPlan) => {
  const p = getPercentage(b);
  if (p > 100) return 'text-rose-600 font-bold';
  if (p >= 80) return 'text-amber-600 font-bold';
  return 'text-emerald-600 font-bold';
};

const getProgressBarBg = (b: BudgetPlan) => {
  const p = getPercentage(b);
  if (p > 100) return 'bg-rose-500';
  if (p >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const fetchBudgets = async () => {
  loading.value = true;
  try {
    const res = await service.getBudgets(selectedYear.value, selectedMonth.value);
    if (res) budgets.value = res;
  } catch (err) {
    console.error('Error fetching budgets:', err);
  } finally {
    loading.value = false;
  }
};

const generateBudget = async () => {
  const hasBudgets = budgets.value.length > 0;

  // Jika sudah ada anggaran di bulan target, tanya apakah ingin overwrite
  let overwrite = false;
  if (hasBudgets) {
    const { value: choice } = await Swal.fire({
      title: 'Generate Anggaran?',
      html: `Anggaran bulan <strong>${monthsList[selectedMonth.value - 1]} ${selectedYear.value}</strong> sudah ada.<br>Pilih tindakan:`,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Tambah yang belum ada',
      denyButtonText: 'Timpa semua (Overwrite)',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#f59e0b',
    });

    if (choice === undefined) return; // Batal
    // choice: true = confirm (tambah), false = deny (overwrite)
    overwrite = choice === false;
  } else {
    const { isConfirmed } = await Swal.fire({
      title: 'Generate Anggaran?',
      html: `Salin semua anggaran dari <strong>${prevMonthLabel.value}</strong> ke <strong>${monthsList[selectedMonth.value - 1]} ${selectedYear.value}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Generate',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3b82f6',
    });
    if (!isConfirmed) return;
  }

  generating.value = true;
  try {
    const result = await service.generateBudgetFromPrevious(
      selectedYear.value,
      selectedMonth.value,
      overwrite,
    );
    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      html: `<strong>${result.generated}</strong> anggaran berhasil di-generate dari <strong>${monthsList[result.sourceMonth - 1]} ${result.sourceYear}</strong>.<br>Dilewati: ${result.skipped}`,
      timer: 3000,
      showConfirmButton: false,
    });
    fetchBudgets();
  } catch (err: any) {
    const msg =
      err?.data?.message ||
      err?.message ||
      'Tidak ada data anggaran di bulan sebelumnya untuk dijadikan referensi.';
    Swal.fire({ icon: 'warning', title: 'Gagal Generate', text: msg });
  } finally {
    generating.value = false;
  }
};

const loadCategories = async () => {
  try {
    const res = await service.getCategories(CategoryType.PENGELUARAN);
    if (res) categories.value = res;
  } catch (err) {
    console.error('Error loading categories:', err);
  }
};

const openModal = () => {
  form.categoryId = categories.value[0]?.id || 0;
  form.amount = 0;
  form.note = '';
  showModal.value = true;
};

const submitBudget = async () => {
  if (!form.categoryId || form.amount <= 0) {
    Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Pilih kategori dan isi nominal target anggaran.' });
    return;
  }

  saving.value = true;
  try {
    await service.upsertBudget({
      categoryId: form.categoryId,
      budgetAmount: form.amount,
      periodMonth: Number(selectedMonth.value),
      periodYear: Number(selectedYear.value),
      notes: form.note || undefined,
    });
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Anggaran berhasil disimpan!', timer: 1500, showConfirmButton: false });
    showModal.value = false;
    fetchBudgets();
  } catch (err: any) {
    const errorMsg = Array.isArray(err?.data?.message) ? err.data.message.join(', ') : (err?.data?.message || 'Gagal menyimpan anggaran.');
    Swal.fire({ icon: 'error', title: 'Gagal', text: errorMsg });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (b: BudgetPlan) => {
  const confirm = await Swal.fire({
    title: 'Hapus Anggaran?',
    text: `Anda yakin ingin menghapus anggaran untuk kategori "${b.category?.name}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444',
  });

  if (confirm.isConfirmed) {
    try {
      await service.deleteBudget(b.id);
      Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Anggaran berhasil dihapus', timer: 1500, showConfirmButton: false });
      fetchBudgets();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus anggaran.' });
    }
  }
};

onMounted(() => {
  fetchBudgets();
  loadCategories();
});
</script>
