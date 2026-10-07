<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-content/10 shadow-sm">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
          <NuxtLink :to="`/${slug}/rumah-tangga`" class="hover:underline">Rumah Tangga</NuxtLink>
          <span>/</span>
          <span>Transaksi</span>
        </div>
        <h1 class="text-2xl font-bold text-base-content tracking-tight flex items-center gap-2">
          <lucide.Receipt class="w-7 h-7 text-primary" />
          Manajemen Transaksi Keuangan
        </h1>
        <p class="text-sm text-base-content/60 mt-0.5">
          Catat dan atur seluruh arus pemasukan & pengeluaran operasional rumah tangga.
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <select v-model="selectedMonth" @change="onMonthYearChange" class="select select-bordered select-sm rounded-xl">
          <option v-for="(name, idx) in monthsList" :key="idx" :value="idx + 1">
            {{ name }}
          </option>
        </select>
        <select v-model="selectedYear" @change="onMonthYearChange" class="select select-bordered select-sm rounded-xl">
          <option v-for="y in yearsList" :key="y" :value="y">
            {{ y }}
          </option>
        </select>
        <button
          @click="generateIncome"
          class="btn btn-outline btn-sm rounded-xl gap-2 border-info text-info hover:bg-info hover:text-white shadow-sm"
          :disabled="generating"
          :title="`Salin pemasukan rutin dari bulan ${prevMonthLabel} ke ${monthsList[selectedMonth - 1]} ${selectedYear}`"
        >
          <span v-if="generating" class="loading loading-spinner loading-xs"></span>
          <lucide.Copy v-else class="w-4 h-4" />
          Generate Pemasukan Rutin
        </button>
        <button @click="openCreateModal" class="btn btn-primary rounded-xl gap-2 text-sm shadow-md hover:shadow-lg transition">
          <lucide.Plus class="w-4 h-4" />
          Tambah Transaksi
        </button>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="bg-base-100 p-4 rounded-2xl border border-base-content/10 shadow-sm space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <!-- Search input -->
        <div class="relative">
          <lucide.Search class="w-4 h-4 absolute left-3 top-3 text-base-content/40" />
          <input
            v-model="filters.search"
            @input="onSearchInput"
            type="text"
            placeholder="Cari transaksi..."
            class="input input-bordered input-sm w-full pl-9 rounded-xl"
          />
        </div>

        <!-- Tipe dropdown -->
        <select v-model="filters.type" @change="fetchData" class="select select-bordered select-sm rounded-xl">
          <option :value="undefined">Semua Tipe</option>
          <option value="PENGELUARAN">Pengeluaran</option>
          <option value="PEMASUKAN">Pemasukan</option>
        </select>

        <!-- Kategori dropdown -->
        <select v-model="filters.categoryId" @change="fetchData" class="select select-bordered select-sm rounded-xl">
          <option :value="undefined">Semua Kategori</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>

        <!-- Anggota Keluarga dropdown -->
        <select v-model="filters.familyMemberId" @change="fetchData" class="select select-bordered select-sm rounded-xl">
          <option :value="undefined">Semua Anggota Keluarga</option>
          <option v-for="mem in familyMembers" :key="mem.id" :value="mem.id">
            {{ mem.name }} ({{ mem.relationship }})
          </option>
        </select>

        <!-- Reset filter button -->
        <button @click="resetFilters" class="btn btn-ghost btn-sm rounded-xl gap-1 text-xs">
          <lucide.RotateCcw class="w-3.5 h-3.5" />
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-base-100 rounded-2xl border border-base-content/10 shadow-sm overflow-hidden">
      <div v-if="loading" class="p-12 flex flex-col items-center justify-center space-y-3">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-sm text-base-content/50">Memuat data transaksi...</p>
      </div>

      <div v-else-if="transactions.length === 0" class="p-12 text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto text-base-content/30">
          <lucide.Inbox class="w-8 h-8" />
        </div>
        <h3 class="text-base font-semibold text-base-content">Tidak ada transaksi ditemukan</h3>
        <p class="text-xs text-base-content/50 max-w-sm mx-auto">
          Coba ubah kata kunci pencarian atau buat transaksi baru.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table w-full">
          <thead class="bg-base-200/50">
            <tr class="text-xs text-base-content/60">
              <th>Tanggal</th>
              <th>Judul & Catatan</th>
              <th>Kategori</th>
              <th>Anggota</th>
              <th>Tipe</th>
              <th class="text-right">Nominal</th>
              <th>Struk Bukti</th>
              <th class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-base-content/5">
            <tr v-for="tx in transactions" :key="tx.id" class="hover:bg-base-200/30 transition text-sm">
              <!-- Tanggal -->
              <td class="whitespace-nowrap text-xs text-base-content/70">
                {{ formatDate(tx.transactionDate) }}
              </td>

              <!-- Title & Note -->
              <td>
                <div class="font-semibold text-base-content">{{ tx.description || tx.title }}</div>
                <div v-if="tx.notes || tx.note" class="text-xs text-base-content/50 italic truncate max-w-xs">{{ tx.notes || tx.note }}</div>
                <span v-if="tx.isRecurring" class="badge badge-xs badge-outline badge-secondary mt-1">
                  Rutin
                </span>
              </td>

              <!-- Kategori -->
              <td>
                <span class="badge badge-sm badge-ghost font-medium">
                  {{ tx.category?.name || '-' }}
                </span>
              </td>

              <!-- Anggota -->
              <td class="text-xs text-base-content/70">
                {{ tx.familyMember?.name || '-' }}
              </td>

              <!-- Tipe -->
              <td>
                <span
                  class="badge badge-sm font-semibold"
                  :class="(tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? 'badge-success text-white' : 'badge-error text-white'"
                >
                  {{ (tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? 'PEMASUKAN' : 'PENGELUARAN' }}
                </span>
              </td>

              <!-- Nominal -->
              <td class="font-bold whitespace-nowrap text-right" :class="(tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? 'text-emerald-600' : 'text-rose-600'">
                {{ (tx.type === 'PEMASUKAN' || tx.type === 'INCOME') ? '+' : '-' }}{{ formatRupiah(tx.amount) }}
              </td>

              <!-- Struk Bukti -->
              <td>
                <button
                  v-if="tx.receiptPhoto || tx.receiptPath"
                  @click="viewReceipt(tx.receiptPhoto || tx.receiptPath || '')"
                  class="btn btn-xs btn-outline btn-info rounded-lg gap-1"
                >
                  <lucide.Eye class="w-3 h-3" />
                  Lihat
                </button>
                <button
                  v-else
                  @click="openUploadReceiptModal(tx)"
                  class="btn btn-xs btn-ghost text-base-content/40 hover:text-primary gap-1"
                >
                  <lucide.Upload class="w-3 h-3" />
                  Upload
                </button>
              </td>

              <!-- Aksi -->
              <td>
                <div class="flex items-center justify-center gap-1">
                  <button @click="openEditModal(tx)" class="btn btn-square btn-ghost btn-xs text-info hover:bg-info/10">
                    <lucide.Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button @click="confirmDelete(tx)" class="btn btn-square btn-ghost btn-xs text-error hover:bg-error/10">
                    <lucide.Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="meta.totalPages > 1" class="p-4 border-t border-base-content/10 flex items-center justify-between">
        <span class="text-xs text-base-content/60">
          Menampilkan {{ (meta.currentPage - 1) * meta.itemsPerPage + 1 }} -
          {{ Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems) }} dari {{ meta.totalItems }} data
        </span>

        <div class="join">
          <button
            @click="changePage(meta.currentPage - 1)"
            :disabled="meta.currentPage <= 1"
            class="join-item btn btn-xs btn-outline rounded-l-xl"
          >
            « Prev
          </button>
          <button class="join-item btn btn-xs btn-active pointer-events-none">
            Hal {{ meta.currentPage }} / {{ meta.totalPages }}
          </button>
          <button
            @click="changePage(meta.currentPage + 1)"
            :disabled="meta.currentPage >= meta.totalPages"
            class="join-item btn btn-xs btn-outline rounded-r-xl"
          >
            Next »
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form Create/Edit Transaksi -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" :checked="showModal" />
      <div v-if="showModal" class="modal modal-open backdrop-blur-md bg-slate-950/40" @click.self="!saving && closeModal()">
        <div class="modal-box rounded-3xl max-w-lg bg-base-100 border border-base-content/10 p-6 shadow-2xl relative text-base-content">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error transition" @click="closeModal">
            ✕
          </button>

          <h3 class="font-extrabold text-lg text-base-content flex items-center gap-2 pr-8">
            <lucide.Receipt class="w-5 h-5 text-primary" />
            {{ isEditing ? 'Edit Transaksi' : 'Tambah Transaksi Baru' }}
          </h3>

          <form @submit.prevent="submitForm" class="space-y-4 mt-4">
            <!-- Tipe Transaksi -->
            <div class="form-control">
              <label class="label text-xs font-semibold">Tipe Transaksi <span class="text-error">*</span></label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  @click="form.type = 'PENGELUARAN'"
                  class="btn btn-sm rounded-xl"
                  :class="form.type === 'PENGELUARAN' ? 'btn-error text-white' : 'btn-outline'"
                >
                  💸 Pengeluaran
                </button>
                <button
                  type="button"
                  @click="form.type = 'PEMASUKAN'"
                  class="btn btn-sm rounded-xl"
                  :class="form.type === 'PEMASUKAN' ? 'btn-success text-white' : 'btn-outline'"
                >
                  💰 Pemasukan
                </button>
              </div>
            </div>

            <!-- Judul Transaksi -->
            <div class="form-control">
              <label class="label text-xs font-semibold">Judul Transaksi <span class="text-error">*</span></label>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="Contoh: Belanja Bulanan Supermarket"
                class="input input-bordered input-sm rounded-xl w-full"
              />
            </div>

            <!-- Nominal & Tanggal -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="form-control">
                <label class="label text-xs font-semibold">Nominal (Rp) <span class="text-error">*</span></label>
                <UiInputRupiah
                  v-model="form.amount"
                  required
                  placeholder="50.000"
                />
              </div>
              <div class="form-control">
                <label class="label text-xs font-semibold">Tanggal <span class="text-error">*</span></label>
                <ClientOnly>
                  <VueDatePicker
                    v-model="pickerDate"
                    @update:model-value="onPickerDateSelected"
                    :enable-time-picker="false"
                    :teleport="true"
                    locale="id"
                    format="dd/MM/yyyy"
                    auto-apply
                    placeholder="Pilih Tanggal Transaksi..."
                    class="dp-custom-styled"
                  />
                  <template #fallback>
                    <input
                      v-model="form.transactionDate"
                      type="date"
                      required
                      class="input input-bordered input-sm rounded-xl w-full"
                    />
                  </template>
                </ClientOnly>
              </div>
            </div>

            <!-- Kategori & Anggota Keluarga -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="form-control">
                <label class="label text-xs font-semibold">Kategori <span class="text-error">*</span></label>
                <select v-model.number="form.categoryId" required class="select select-bordered select-sm rounded-xl w-full">
                  <option :value="0" disabled>Pilih Kategori</option>
                  <option
                    v-for="cat in filteredCategoriesForForm"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="form-control">
                <label class="label text-xs font-semibold">Anggota Keluarga</label>
                <select v-model.number="form.familyMemberId" class="select select-bordered select-sm rounded-xl w-full">
                  <option :value="undefined">Opsional (Pilih)</option>
                  <option v-for="mem in familyMembers" :key="mem.id" :value="mem.id">
                    {{ mem.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Pengeluaran Rutin Checkbox -->
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input v-model="form.isRecurring" type="checkbox" class="checkbox checkbox-primary checkbox-sm rounded-md" />
                <span class="label-text text-xs font-medium">Transaksi Rutin (Berulang)</span>
              </label>
            </div>

            <div v-if="form.isRecurring" class="form-control">
              <label class="label text-xs font-semibold">Frekuensi Rutin</label>
              <select v-model="form.recurringFrequency" class="select select-bordered select-sm rounded-xl w-full">
                <option value="MINGGUAN">Mingguan</option>
                <option value="BULANAN">Bulanan</option>
                <option value="TAHUNAN">Tahunan</option>
              </select>
            </div>

            <!-- Catatan / Note -->
            <div class="form-control">
              <label class="label text-xs font-semibold">Catatan / Keterangan</label>
              <textarea
                v-model="form.note"
                rows="2"
                placeholder="Catatan tambahan..."
                class="textarea textarea-bordered text-sm rounded-xl w-full"
              ></textarea>
            </div>

            <!-- Action Buttons -->
            <div class="modal-action">
              <button type="button" @click="closeModal" class="btn btn-ghost btn-sm rounded-xl">Batal</button>
              <button type="submit" class="btn btn-primary btn-sm rounded-xl" :disabled="saving">
                <span v-if="saving" class="loading loading-spinner loading-xs"></span>
                Simpan Data
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal Upload Struk Bukti -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" :checked="showUploadModal" />
      <div v-if="showUploadModal" class="modal modal-open backdrop-blur-md bg-slate-950/40" @click.self="!uploading && (showUploadModal = false)">
        <div class="modal-box rounded-3xl max-w-md bg-base-100 border border-base-content/10 p-6 shadow-2xl relative text-base-content">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error transition" @click="showUploadModal = false">
            ✕
          </button>

          <h3 class="font-extrabold text-lg text-base-content flex items-center gap-2 pr-8">
            <lucide.Upload class="w-5 h-5 text-info" />
            Upload Struk / Bukti Transaksi
          </h3>
          <p class="text-xs text-base-content/60 mt-1">
            Pilih file foto struk atau nota pembayaran (JPG/PNG, Max 5MB).
          </p>

          <div class="form-control mt-4 space-y-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              @change="handleFileSelected"
              class="file-input file-input-bordered file-input-sm w-full rounded-xl"
            />

            <div v-if="selectedFile" class="text-xs text-emerald-600 font-semibold">
              ✓ File terpilih: {{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)
            </div>
          </div>

          <div class="modal-action">
            <button type="button" @click="showUploadModal = false" class="btn btn-ghost btn-sm rounded-xl">Batal</button>
            <button
              @click="submitUploadReceipt"
              :disabled="!selectedFile || uploading"
              class="btn btn-info btn-sm rounded-xl text-white"
            >
              <span v-if="uploading" class="loading loading-spinner loading-xs"></span>
              Upload Struk
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Viewer Struk -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" :checked="showReceiptViewer" />
      <div v-if="showReceiptViewer" class="modal modal-open backdrop-blur-md bg-slate-950/40" @click.self="showReceiptViewer = false">
        <div class="modal-box rounded-3xl max-w-lg p-5 bg-base-100 border border-base-content/10 shadow-2xl relative text-base-content">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error transition" @click="showReceiptViewer = false">
            ✕
          </button>
          <div class="border-b pb-3 border-base-content/10 pr-8">
            <h3 class="font-bold text-base text-base-content">Foto Bukti / Struk Transaksi</h3>
          </div>
          <div class="mt-4 flex items-center justify-center min-h-48 bg-base-200 rounded-xl overflow-hidden">
            <img :src="activeReceiptUrl" alt="Bukti Transaksi" class="max-h-96 object-contain" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as lucide from 'lucide-vue-next';
import Swal from 'sweetalert2';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { RumahTanggaService } from '@/services/rumah-tangga.service';
import {
  TransactionType,
  type Transaction,
  type ExpenseCategory,
  type FamilyMember,
  type CategoryType,
} from '@/types/rumah-tangga';

definePageMeta({ layout: 'admin' });

const route = useRoute();
const slug = computed(() => route.params.slug as string || 'default');
const service = RumahTanggaService();

const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const generating = ref(false);

const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());

const monthsList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const prevMonthLabel = computed(() => {
  const d = new Date(selectedYear.value, selectedMonth.value - 2, 1);
  return `${monthsList[d.getMonth()]} ${d.getFullYear()}`;
});

const yearsList = computed(() => {
  const c = new Date().getFullYear();
  return [c - 1, c, c + 1];
});

const transactions = ref<Transaction[]>([]);
const categories = ref<ExpenseCategory[]>([]);
const familyMembers = ref<FamilyMember[]>([]);

const meta = reactive({
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 0,
  totalPages: 1,
});

const filters = reactive<{
  search: string;
  type?: CategoryType;
  categoryId?: number;
  familyMemberId?: number;
}>({
  search: '',
  type: undefined,
  categoryId: undefined,
  familyMemberId: undefined,
});

// Form state
const showModal = ref(false);
const isEditing = ref(false);
const currentEditingId = ref<number | null>(null);

const pickerDate = ref<Date | null>(new Date());

const onPickerDateSelected = (val: Date | null) => {
  if (val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      form.transactionDate = `${year}-${month}-${day}`;
    }
  } else {
    form.transactionDate = '';
  }
};

const form = reactive({
  title: '',
  amount: 0,
  type: 'PENGELUARAN' as CategoryType,
  transactionDate: new Date().toISOString().split('T')[0],
  categoryId: 0,
  familyMemberId: undefined as number | undefined,
  note: '',
  isRecurring: false,
  recurringFrequency: 'BULANAN',
});

// Upload Receipt State
const showUploadModal = ref(false);
const targetTxIdForUpload = ref<number | null>(null);
const selectedFile = ref<File | null>(null);

// Viewer Receipt State
const showReceiptViewer = ref(false);
const activeReceiptUrl = ref('');

const filteredCategoriesForForm = computed(() => {
  return categories.value.filter(c => c.type === form.type);
});

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

let searchTimeout: any = null;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    meta.currentPage = 1;
    fetchData();
  }, 400);
};

const onMonthYearChange = () => {
  meta.currentPage = 1;
  fetchData();
};

watch([selectedMonth, selectedYear], () => {
  meta.currentPage = 1;
  fetchData();
});

const resetFilters = () => {
  filters.search = '';
  filters.type = undefined;
  filters.categoryId = undefined;
  filters.familyMemberId = undefined;
  selectedMonth.value = new Date().getMonth() + 1;
  selectedYear.value = new Date().getFullYear();
  meta.currentPage = 1;
  fetchData();
};

const changePage = (page: number) => {
  meta.currentPage = page;
  fetchData();
};

const fetchData = async () => {
  loading.value = true;
  try {
    const year = selectedYear.value;
    const month = selectedMonth.value;
    const lastDay = new Date(year, month, 0).getDate();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const res = await service.getTransactions({
      page: meta.currentPage,
      limit: meta.itemsPerPage,
      search: filters.search || undefined,
      type: filters.type,
      categoryId: filters.categoryId,
      familyMemberId: filters.familyMemberId,
      startDate,
      endDate,
      month,
      year,
      sortBy: 'transactionDate',
      sortType: 'desc',
    });

    transactions.value = res.items || [];
    if (res.meta) {
      meta.totalItems = res.meta.totalItems;
      meta.totalPages = res.meta.totalPages;
      meta.currentPage = res.meta.currentPage;
    }
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
  } finally {
    loading.value = false;
  }
};

const loadDependencies = async () => {
  try {
    const [catRes, memRes] = await Promise.all([
      service.getCategoriesAdmin(),
      service.getFamilyMembers(),
    ]);
    if (catRes) categories.value = catRes;
    if (memRes) familyMembers.value = memRes;
  } catch (err) {
    console.error('Error loading categories/members:', err);
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  currentEditingId.value = null;
  form.title = '';
  form.amount = 0;
  form.type = 'PENGELUARAN';
  const todayStr = new Date().toISOString().split('T')[0];
  form.transactionDate = todayStr;
  pickerDate.value = new Date();
  form.categoryId = filteredCategoriesForForm.value[0]?.id || 0;
  form.familyMemberId = undefined;
  form.note = '';
  form.isRecurring = false;
  form.recurringFrequency = 'BULANAN';
  showModal.value = true;
};

const openEditModal = (tx: Transaction) => {
  isEditing.value = true;
  currentEditingId.value = tx.id;
  form.title = tx.title || tx.description || '';
  form.amount = tx.amount;
  form.type = tx.type;
  const dateStr = tx.transactionDate ? tx.transactionDate.split('T')[0] : '';
  form.transactionDate = dateStr;
  pickerDate.value = dateStr ? new Date(dateStr) : new Date();
  form.categoryId = tx.categoryId;
  form.familyMemberId = tx.familyMemberId;
  form.note = tx.notes || tx.note || '';
  form.isRecurring = tx.isRecurring || false;
  form.recurringFrequency = tx.recurringFrequency || 'BULANAN';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const submitForm = async () => {
  if (!form.categoryId || form.categoryId === 0) {
    Swal.fire({ icon: 'warning', title: 'Pilih Kategori', text: 'Kategori transaksi wajib dipilih!' });
    return;
  }

  saving.value = true;
  try {
    const txType = (form.type as string) === 'PEMASUKAN' ? TransactionType.INCOME : TransactionType.EXPENSE;
    const payload = {
      description: form.title,
      amount: Number(form.amount),
      type: txType,
      transactionDate: form.transactionDate,
      categoryId: Number(form.categoryId),
      familyMemberId: form.familyMemberId ? Number(form.familyMemberId) : undefined,
      notes: form.note || undefined,
      isRecurring: form.isRecurring,
    };

    if (isEditing.value && currentEditingId.value) {
      await service.updateTransaction(currentEditingId.value, payload);
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data transaksi berhasil diperbarui!', timer: 1500, showConfirmButton: false });
    } else {
      await service.createTransaction(payload);
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Transaksi baru berhasil dibuat!', timer: 1500, showConfirmButton: false });
    }

    closeModal();
    fetchData();
  } catch (err: any) {
    const errorMsg = Array.isArray(err?.data?.message)
      ? err.data.message.join(', ')
      : (err?.data?.message || 'Gagal menyimpan transaksi.');
    Swal.fire({ icon: 'error', title: 'Gagal', text: errorMsg });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (tx: Transaction) => {
  const confirm = await Swal.fire({
    title: 'Hapus Transaksi?',
    text: `Anda yakin ingin menghapus "${tx.title}" nominal ${formatRupiah(tx.amount)}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444',
  });

  if (confirm.isConfirmed) {
    try {
      await service.deleteTransaction(tx.id);
      Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Transaksi berhasil dihapus!', timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus transaksi.' });
    }
  }
};

const openUploadReceiptModal = (tx: Transaction) => {
  targetTxIdForUpload.value = tx.id;
  selectedFile.value = null;
  showUploadModal.value = true;
};

const handleFileSelected = (e: any) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    selectedFile.value = files[0];
  }
};

const submitUploadReceipt = async () => {
  if (!targetTxIdForUpload.value || !selectedFile.value) return;

  uploading.value = true;
  try {
    await service.uploadReceipt(targetTxIdForUpload.value, selectedFile.value);
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Bukti transaksi berhasil di-upload!', timer: 1500, showConfirmButton: false });
    showUploadModal.value = false;
    fetchData();
  } catch (err: any) {
    Swal.fire({ icon: 'error', title: 'Upload Gagal', text: err?.data?.message || 'Gagal meng-upload berkas.' });
  } finally {
    uploading.value = false;
  }
};

const viewReceipt = (path: string) => {
  if (!path) return;
  const config = useRuntimeConfig();
  if (path.startsWith('http')) {
    // URL absolut: langsung pakai
    activeReceiptUrl.value = path;
  } else {
    // Path relatif dari DB: `uploads/{slug}/receipts/{filename}`
    // Endpoint backend: GET /rt-files/receipt-photo/{path}
    const cleanPath = path.replace(/^[\/\\]+/, '');
    activeReceiptUrl.value = `${config.public.apiBase}/rt-files/receipt-photo/${cleanPath}`;
  }
  showReceiptViewer.value = true;
};


const generateIncome = async () => {
  const { isConfirmed } = await Swal.fire({
    title: 'Generate Pemasukan Rutin?',
    html: `Salin semua pemasukan rutin (isRecurring) dari <strong>${prevMonthLabel.value}</strong> ke <strong>${monthsList[selectedMonth.value - 1]} ${selectedYear.value}</strong>?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Generate',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#3b82f6',
  });

  if (!isConfirmed) return;

  generating.value = true;
  try {
    const result = await service.generateIncomeFromPrevious(
      selectedYear.value,
      selectedMonth.value,
    );
    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      html: `<strong>${result.generated}</strong> transaksi pemasukan rutin berhasil di-generate dari <strong>${monthsList[result.sourceMonth - 1]} ${result.sourceYear}</strong>.<br>Dilewati (sudah ada): ${result.skipped}`,
      timer: 3000,
      showConfirmButton: false,
    });
    fetchData();
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Gagal menyalin transaksi pemasukan rutin.';
    Swal.fire({ icon: 'error', title: 'Gagal', text: msg });
  } finally {
    generating.value = false;
  }
};

onMounted(() => {
  fetchData();
  loadDependencies();
});
</script>

