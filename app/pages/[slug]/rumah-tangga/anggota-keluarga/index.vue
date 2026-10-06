<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-content/10 shadow-sm">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
          <NuxtLink :to="`/${slug}/rumah-tangga`" class="hover:underline">Rumah Tangga</NuxtLink>
          <span>/</span>
          <span>Anggota Keluarga</span>
        </div>
        <h1 class="text-2xl font-bold text-base-content tracking-tight flex items-center gap-2">
          <lucide.Users class="w-7 h-7 text-accent" />
          Master Data Anggota Keluarga
        </h1>
        <p class="text-sm text-base-content/60 mt-0.5">
          Kelola data anggota keluarga untuk melacak pengeluaran per individu secara transparan.
        </p>
      </div>

      <button @click="openCreateModal" class="btn btn-primary rounded-xl gap-2 text-sm shadow-md hover:shadow-lg transition">
        <lucide.UserPlus class="w-4 h-4" />
        Tambah Anggota
      </button>
    </div>

    <!-- Family Member List / Grid -->
    <div v-if="loading" class="p-12 bg-base-100 rounded-2xl border border-base-content/10 text-center">
      <span class="loading loading-spinner loading-lg text-accent"></span>
      <p class="text-sm text-base-content/50 mt-2">Memuat anggota keluarga...</p>
    </div>

    <div v-else-if="members.length === 0" class="p-12 bg-base-100 rounded-2xl border border-base-content/10 text-center space-y-3">
      <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto text-base-content/30">
        <lucide.Users class="w-8 h-8" />
      </div>
      <h3 class="text-base font-semibold text-base-content">Belum ada anggota keluarga</h3>
      <p class="text-xs text-base-content/50 max-w-sm mx-auto">
        Tambahkan anggota keluarga agar transaksi pengeluaran dapat dikaitkan dengan penanggung jawab.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="m in members"
        :key="m.id"
        class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-extrabold text-lg">
            {{ m.name.charAt(0).toUpperCase() }}
          </div>

          <div>
            <h3 class="font-bold text-base text-base-content">{{ m.name }}</h3>
            <span class="badge badge-sm badge-outline badge-accent mt-0.5 font-medium">
              {{ m.relationship }}
            </span>
            <div class="text-xs text-base-content/50 space-y-0.5 mt-1">
              <p v-if="m.phone" class="flex items-center gap-1">
                <lucide.Phone class="w-3 h-3" /> {{ m.phone }}
              </p>
              <p v-if="m.email" class="flex items-center gap-1">
                <lucide.Mail class="w-3 h-3" /> {{ m.email }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button @click="openEditModal(m)" class="btn btn-square btn-ghost btn-sm text-info hover:bg-info/10">
            <lucide.Pencil class="w-4 h-4" />
          </button>
          <button @click="confirmDelete(m)" class="btn btn-square btn-ghost btn-sm text-error hover:bg-error/10">
            <lucide.Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Create / Edit -->
    <Teleport to="body">
      <input type="checkbox" class="modal-toggle" :checked="showModal" />
      <div v-if="showModal" class="modal modal-open backdrop-blur-md bg-slate-950/40" @click.self="!saving && (showModal = false)">
        <div class="modal-box rounded-3xl max-w-md bg-base-100 border border-base-content/10 p-6 shadow-2xl relative text-base-content">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error transition" @click="showModal = false">
            ✕
          </button>

          <h3 class="font-extrabold text-lg text-base-content flex items-center gap-2 pr-8">
            <lucide.Users class="w-5 h-5 text-accent" />
            {{ isEditing ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga' }}
          </h3>

          <form @submit.prevent="submitForm" class="space-y-4 mt-4">
            <div class="form-control">
              <label class="label text-xs font-semibold">Nama Lengkap <span class="text-error">*</span></label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                class="input input-bordered input-sm rounded-xl w-full"
              />
            </div>

            <div class="form-control">
              <label class="label text-xs font-semibold">Hubungan / Peran <span class="text-error">*</span></label>
              <select v-model="form.relationship" required class="select select-bordered select-sm rounded-xl w-full">
                <option value="Suami">Suami</option>
                <option value="Istri">Istri</option>
                <option value="Anak">Anak</option>
                <option value="Ayah">Ayah</option>
                <option value="Ibu">Ibu</option>
                <option value="Saudara">Saudara</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label text-xs font-semibold">Nomor Telepon (WhatsApp)</label>
              <input
                v-model="form.phone"
                type="text"
                placeholder="08123456789"
                class="input input-bordered input-sm rounded-xl w-full"
              />
            </div>

            <div class="form-control">
              <label class="label text-xs font-semibold">Alamat Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="budi@example.com"
                class="input input-bordered input-sm rounded-xl w-full"
              />
            </div>

            <div class="modal-action">
              <button type="button" @click="showModal = false" class="btn btn-ghost btn-sm rounded-xl">Batal</button>
              <button type="submit" class="btn btn-primary btn-sm rounded-xl" :disabled="saving">
                <span v-if="saving" class="loading loading-spinner loading-xs"></span>
                Simpan
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
import type { FamilyMember } from '@/types/rumah-tangga';

definePageMeta({ layout: 'admin' });

const route = useRoute();
const slug = computed(() => route.params.slug as string || 'default');
const service = RumahTanggaService();

const loading = ref(false);
const saving = ref(false);
const members = ref<FamilyMember[]>([]);

const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  name: '',
  relationship: 'Anak',
  phone: '',
  email: '',
});

const fetchMembers = async () => {
  loading.value = true;
  try {
    const res = await service.getFamilyMembers();
    if (res) members.value = res;
  } catch (err) {
    console.error('Error fetching family members:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  editingId.value = null;
  form.name = '';
  form.relationship = 'Anak';
  form.phone = '';
  form.email = '';
  showModal.value = true;
};

const openEditModal = (m: FamilyMember) => {
  isEditing.value = true;
  editingId.value = m.id;
  form.name = m.name;
  form.relationship = m.relationship;
  form.phone = m.phone || '';
  form.email = m.email || '';
  showModal.value = true;
};

const submitForm = async () => {
  if (!form.name.trim()) return;

  saving.value = true;
  try {
    const payload = {
      name: form.name,
      relationship: form.relationship,
      phone: form.phone || undefined,
      email: form.email || undefined,
    };

    if (isEditing.value && editingId.value) {
      await service.updateFamilyMember(editingId.value, payload);
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data anggota keluarga diperbarui', timer: 1500, showConfirmButton: false });
    } else {
      await service.createFamilyMember(payload);
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Anggota keluarga baru ditambahkan', timer: 1500, showConfirmButton: false });
    }
    showModal.value = false;
    fetchMembers();
  } catch (err: any) {
    Swal.fire({ icon: 'error', title: 'Gagal', text: err?.data?.message || 'Gagal menyimpan data anggota keluarga.' });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (m: FamilyMember) => {
  const confirm = await Swal.fire({
    title: 'Hapus Anggota Keluarga?',
    text: `Anda yakin ingin menghapus "${m.name}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444',
  });

  if (confirm.isConfirmed) {
    try {
      await service.deleteFamilyMember(m.id);
      Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Anggota keluarga berhasil dihapus', timer: 1500, showConfirmButton: false });
      fetchMembers();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus anggota keluarga.' });
    }
  }
};

onMounted(() => {
  fetchMembers();
});
</script>
