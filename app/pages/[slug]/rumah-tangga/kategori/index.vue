<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-content/10 shadow-sm">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
          <NuxtLink :to="`/${slug}/rumah-tangga`" class="hover:underline">Rumah Tangga</NuxtLink>
          <span>/</span>
          <span>Kategori</span>
        </div>
        <h1 class="text-2xl font-bold text-base-content tracking-tight flex items-center gap-2">
          <lucide.Tags class="w-7 h-7 text-info" />
          Kategori Pengeluaran & Pemasukan
        </h1>
        <p class="text-sm text-base-content/60 mt-0.5">
          Kelola daftar kategori transaksi beserta label warna untuk visualisasi grafik.
        </p>
      </div>

      <button @click="openCreateModal" class="btn btn-primary rounded-xl gap-2 text-sm shadow-md hover:shadow-lg transition">
        <lucide.Plus class="w-4 h-4" />
        Tambah Kategori
      </button>
    </div>

    <!-- Filter Type -->
    <div class="flex items-center gap-2 bg-base-100 p-2 rounded-2xl border border-base-content/10 w-fit">
      <button
        @click="selectedType = undefined"
        class="btn btn-sm rounded-xl"
        :class="selectedType === undefined ? 'btn-primary' : 'btn-ghost'"
      >
        Semua Kategori
      </button>
      <button
        @click="selectedType = CategoryType.PENGELUARAN"
        class="btn btn-sm rounded-xl"
        :class="selectedType === CategoryType.PENGELUARAN ? 'btn-error text-white' : 'btn-ghost'"
      >
        💸 Pengeluaran
      </button>
      <button
        @click="selectedType = CategoryType.PEMASUKAN"
        class="btn btn-sm rounded-xl"
        :class="selectedType === CategoryType.PEMASUKAN ? 'btn-success text-white' : 'btn-ghost'"
      >
        💰 Pemasukan
      </button>
    </div>

    <!-- Categories Grid / List -->
    <div v-if="loading" class="p-12 bg-base-100 rounded-2xl border border-base-content/10 text-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="text-sm text-base-content/50 mt-2">Memuat daftar kategori...</p>
    </div>

    <div v-else-if="filteredCategories.length === 0" class="p-12 bg-base-100 rounded-2xl border border-base-content/10 text-center">
      <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto text-base-content/30 mb-2">
        <lucide.Tag class="w-8 h-8" />
      </div>
      <h3 class="text-base font-semibold text-base-content">Belum ada kategori</h3>
      <p class="text-xs text-base-content/50">Klik tombol Tambah Kategori di atas untuk membuat kategori pertama.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <!-- Color & Icon Circle -->
          <div
            class="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-sm"
            :style="{ backgroundColor: cat.color || (cat.type === 'PEMASUKAN' ? '#10b981' : '#f43f5e') }"
          >
            {{ cat.name.charAt(0).toUpperCase() }}
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-base text-base-content">{{ cat.name }}</h3>
              <span
                class="badge badge-xs font-semibold"
                :class="cat.type === 'PEMASUKAN' ? 'badge-success text-white' : 'badge-error text-white'"
              >
                {{ cat.type }}
              </span>
            </div>
            <p class="text-xs text-base-content/50 mt-0.5">
              Urutan: {{ cat.orderNo || 0 }} •
              <span :class="cat.isActive ? 'text-success font-medium' : 'text-base-content/30'">
                {{ cat.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button @click="openEditModal(cat)" class="btn btn-square btn-ghost btn-sm text-info hover:bg-info/10">
            <lucide.Pencil class="w-4 h-4" />
          </button>
          <button @click="confirmDelete(cat)" class="btn btn-square btn-ghost btn-sm text-error hover:bg-error/10">
            <lucide.Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form Create / Edit -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" :checked="showModal" />
      <div v-if="showModal" class="modal modal-open backdrop-blur-md bg-slate-950/40" @click.self="!saving && (showModal = false)">
        <div class="modal-box rounded-3xl max-w-md bg-base-100 border border-base-content/10 p-6 shadow-2xl relative text-base-content">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error transition" @click="showModal = false">
            ✕
          </button>

          <h3 class="font-extrabold text-lg text-base-content flex items-center gap-2 pr-8">
            <lucide.Tag class="w-5 h-5 text-primary" />
            {{ isEditing ? 'Edit Kategori' : 'Tambah Kategori Baru' }}
          </h3>

          <form @submit.prevent="submitForm" class="space-y-4 mt-4">
            <!-- Nama Kategori -->
            <div class="form-control">
              <label class="label text-xs font-semibold">Nama Kategori <span class="text-error">*</span></label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="Contoh: Belanja Dapur / Gaji"
                class="input input-bordered input-sm rounded-xl w-full"
              />
            </div>

            <!-- Tipe Kategori -->
            <div class="form-control">
              <label class="label text-xs font-semibold">Tipe Kategori <span class="text-error">*</span></label>
              <select v-model="form.type" required class="select select-bordered select-sm rounded-xl w-full">
                <option :value="CategoryType.PENGELUARAN">Pengeluaran</option>
                <option :value="CategoryType.PEMASUKAN">Pemasukan</option>
              </select>
            </div>

            <!-- Warna HEX & Preset -->
            <div class="form-control">
              <label class="label text-xs font-semibold">Warna Label Grafik</label>
              <div class="flex items-center gap-3">
                <input
                  v-model="form.color"
                  type="color"
                  class="w-10 h-10 rounded-xl cursor-pointer border border-base-content/20"
                />
                <input
                  v-model="form.color"
                  type="text"
                  placeholder="#3b82f6"
                  class="input input-bordered input-sm rounded-xl w-full font-mono uppercase text-xs"
                />
              </div>
              <!-- Color Presets -->
              <div class="flex items-center gap-2 mt-2">
                <button
                  v-for="preset in colorPresets"
                  :key="preset"
                  type="button"
                  @click="form.color = preset"
                  class="w-5 h-5 rounded-full border border-white shadow-xs hover:scale-110 transition"
                  :style="{ backgroundColor: preset }"
                ></button>
              </div>
            </div>

            <!-- Urutan / Order No -->
            <div class="form-control">
              <label class="label text-xs font-semibold">Urutan Tampilan</label>
              <input
                v-model.number="form.orderNo"
                type="number"
                min="0"
                placeholder="1"
                class="input input-bordered input-sm rounded-xl w-full"
              />
            </div>

            <!-- Active Toggle (for Edit mode) -->
            <div v-if="isEditing" class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input v-model="form.isActive" type="checkbox" class="toggle toggle-primary toggle-sm" />
                <span class="label-text text-xs font-medium">Kategori Aktif</span>
              </label>
            </div>

            <div class="modal-action">
              <button type="button" @click="showModal = false" class="btn btn-ghost btn-sm rounded-xl">Batal</button>
              <button type="submit" class="btn btn-primary btn-sm rounded-xl" :disabled="saving">
                <span v-if="saving" class="loading loading-spinner loading-xs"></span>
                Simpan Kategori
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
import { CategoryType, type ExpenseCategory } from '@/types/rumah-tangga';

definePageMeta({ layout: 'admin' });

const route = useRoute();
const slug = computed(() => route.params.slug as string || 'default');
const service = RumahTanggaService();

const loading = ref(false);
const saving = ref(false);
const categories = ref<ExpenseCategory[]>([]);
const selectedType = ref<CategoryType | undefined>(undefined);

const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);

const colorPresets = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const form = reactive({
  name: '',
  type: CategoryType.PENGELUARAN,
  color: '#3b82f6',
  orderNo: 1,
  isActive: true,
});

const filteredCategories = computed(() => {
  if (!selectedType.value) return categories.value;
  return categories.value.filter(c => c.type === selectedType.value);
});

const fetchCategories = async () => {
  loading.value = true;
  try {
    const res = await service.getCategoriesAdmin();
    if (res) categories.value = res;
  } catch (err) {
    console.error('Error fetching categories:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  editingId.value = null;
  form.name = '';
  form.type = CategoryType.PENGELUARAN;
  form.color = '#3b82f6';
  form.orderNo = categories.value.length + 1;
  form.isActive = true;
  showModal.value = true;
};

const openEditModal = (cat: ExpenseCategory) => {
  isEditing.value = true;
  editingId.value = cat.id;
  form.name = cat.name;
  form.type = cat.type;
  form.color = cat.color || '#3b82f6';
  form.orderNo = cat.orderNo || 0;
  form.isActive = cat.isActive;
  showModal.value = true;
};

const submitForm = async () => {
  if (!form.name.trim()) return;

  saving.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await service.updateCategory(editingId.value, {
        name: form.name,
        type: form.type,
        color: form.color,
        orderNo: form.orderNo,
        isActive: form.isActive,
      });
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Kategori berhasil diperbarui', timer: 1500, showConfirmButton: false });
    } else {
      await service.createCategory({
        name: form.name,
        type: form.type,
        color: form.color,
        orderNo: form.orderNo,
      });
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Kategori baru berhasil dibuat', timer: 1500, showConfirmButton: false });
    }
    showModal.value = false;
    fetchCategories();
  } catch (err: any) {
    Swal.fire({ icon: 'error', title: 'Gagal', text: err?.data?.message || 'Gagal menyimpan kategori' });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (cat: ExpenseCategory) => {
  const confirm = await Swal.fire({
    title: 'Hapus Kategori?',
    text: `Anda yakin ingin menghapus kategori "${cat.name}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444',
  });

  if (confirm.isConfirmed) {
    try {
      await service.deleteCategory(cat.id);
      Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Kategori berhasil dihapus', timer: 1500, showConfirmButton: false });
      fetchCategories();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus kategori.' });
    }
  }
};

onMounted(() => {
  fetchCategories();
});
</script>
