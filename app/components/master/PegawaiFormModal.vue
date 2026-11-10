<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Briefcase, Link2, MapPin, Users, X } from "lucide-vue-next";
import UiAutocompleteWilayah from "@/components/ui/AutocompleteWilayah.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import PendudukSelector from "@/components/master/PendudukSelector.vue";
import { PegawaiService, type PegawaiItem } from "@/services/pegawai.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatKelurahanLabel,
  STATUS_AKTIF_PEGAWAI_OPTIONS,
  STATUS_KEPEGAWAIAN_OPTIONS,
  StatusAktifPegawai,
  type PendudukItem,
  type StatusKepegawaian,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: PegawaiItem): void;
}>();

const pegawaiService = PegawaiService();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);
const initialWilayahLabel = ref("");
const linkedPenduduk = ref<Partial<PendudukItem> | null>(null);

interface PegawaiFormState {
  pendudukId: number | undefined;
  nip: string;
  name: string;
  position: string;
  statusKepegawaian: StatusKepegawaian | "";
  statusAktif: StatusAktifPegawai;
  unitKerja: string;
  tanggalMasuk: string;
  tanggalKeluar: string;
  email: string;
  phoneNumber: string;
  idKelurahan: string;
  address: string;
  bio: string;
}

const createDefaultForm = (): PegawaiFormState => ({
  pendudukId: undefined,
  nip: "",
  name: "",
  position: "",
  statusKepegawaian: "",
  statusAktif: StatusAktifPegawai.AKTIF,
  unitKerja: "",
  tanggalMasuk: "",
  tanggalKeluar: "",
  email: "",
  phoneNumber: "",
  idKelurahan: "",
  address: "",
  bio: "",
});

const form = ref<PegawaiFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof PegawaiFormState, string>>>({});

const resetState = () => {
  form.value = createDefaultForm();
  errors.value = {};
  initialWilayahLabel.value = "";
  linkedPenduduk.value = null;
};

const populateFromItem = (item: PegawaiItem) => {
  form.value = {
    pendudukId: item.pendudukId ?? undefined,
    nip: item.nip || "",
    name: item.name || "",
    position: item.position || "",
    statusKepegawaian: item.statusKepegawaian || "",
    statusAktif: item.statusAktif || StatusAktifPegawai.AKTIF,
    unitKerja: item.unitKerja || "",
    tanggalMasuk: item.tanggalMasuk ? String(item.tanggalMasuk).slice(0, 10) : "",
    tanggalKeluar: item.tanggalKeluar ? String(item.tanggalKeluar).slice(0, 10) : "",
    email: item.email || "",
    phoneNumber: item.phoneNumber || "",
    idKelurahan: item.idKelurahan || "",
    address: item.address || "",
    bio: item.bio || "",
  };
  linkedPenduduk.value = item.penduduk ?? null;
  initialWilayahLabel.value = formatKelurahanLabel(item.kelurahan);
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();

    if (targetId) {
      modalLoading.value = true;
      try {
        const detail = await pegawaiService.getPegawaiById(targetId);
        populateFromItem(detail);
      } catch (err: any) {
        showToast(extractApiErrorMessage(err, "Gagal memuat detail pegawai"), "error");
        emit("close");
      } finally {
        modalLoading.value = false;
      }
    }
  },
  { immediate: true },
);

const handlePendudukSelected = (penduduk: PendudukItem | null) => {
  linkedPenduduk.value = penduduk;
  if (!penduduk) return;

  if (!form.value.name.trim() && penduduk.namaLengkap) {
    form.value.name = penduduk.namaLengkap;
  }
  if (!form.value.email.trim() && penduduk.email) {
    form.value.email = penduduk.email;
  }
  if (!form.value.phoneNumber.trim() && penduduk.noTelepon) {
    form.value.phoneNumber = penduduk.noTelepon;
  }
  if (!form.value.address.trim() && penduduk.alamatKtp) {
    form.value.address = penduduk.alamatKtp;
  }
  if (!form.value.idKelurahan && penduduk.idKelurahan) {
    form.value.idKelurahan = penduduk.idKelurahan;
    initialWilayahLabel.value = formatKelurahanLabel(penduduk.kelurahan);
  }
};

const handleWilayahSelect = (item: any) => {
  form.value.idKelurahan = item.id || "";
};

const handleWilayahClear = () => {
  form.value.idKelurahan = "";
};

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof PegawaiFormState, string>> = {};
  const f = form.value;

  if (!f.nip.trim()) {
    nextErrors.nip = "NIP wajib diisi";
  } else if (f.nip.trim().length > 50) {
    nextErrors.nip = "NIP maksimal 50 karakter";
  }

  if (!f.name.trim()) {
    nextErrors.name = "Nama lengkap pegawai wajib diisi";
  } else if (f.name.trim().length > 150) {
    nextErrors.name = "Nama maksimal 150 karakter";
  }

  if (f.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(f.email.trim())) {
      nextErrors.email = "Format email tidak valid";
    }
  }

  if (f.phoneNumber.trim() && !/^[0-9+\-\s]+$/.test(f.phoneNumber.trim())) {
    nextErrors.phoneNumber = "Nomor telepon hanya boleh angka, spasi, + atau -";
  }

  if (
    f.tanggalMasuk &&
    f.tanggalKeluar &&
    new Date(f.tanggalKeluar) < new Date(f.tanggalMasuk)
  ) {
    nextErrors.tanggalKeluar = "Tanggal keluar tidak boleh lebih awal dari tanggal masuk";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const f = form.value;
    const payload = {
      pendudukId: f.pendudukId,
      nip: f.nip.trim(),
      name: f.name.trim(),
      position: f.position.trim() || undefined,
      statusKepegawaian: f.statusKepegawaian || undefined,
      statusAktif: f.statusAktif,
      unitKerja: f.unitKerja.trim() || undefined,
      tanggalMasuk: f.tanggalMasuk || undefined,
      tanggalKeluar: f.tanggalKeluar || undefined,
      email: f.email.trim() || undefined,
      phoneNumber: f.phoneNumber.trim() || undefined,
      idKelurahan: f.idKelurahan || undefined,
      address: f.address.trim() || undefined,
      bio: f.bio.trim() || undefined,
    };

    const saved =
      isEdit.value && props.editId
        ? await pegawaiService.updatePegawai(props.editId, payload)
        : await pegawaiService.createPegawai(payload);

    showToast(
      isEdit.value
        ? `Data pegawai "${saved.name}" berhasil diperbarui`
        : `Pegawai baru "${saved.name}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: any) {
    const msg = extractApiErrorMessage(err, "Gagal menyimpan data pegawai");
    if (msg.toLowerCase().includes("nip")) errors.value.nip = msg;
    if (msg.toLowerCase().includes("email")) errors.value.email = msg;
    if (msg.toLowerCase().includes("penduduk")) errors.value.pendudukId = msg;
    showToast(msg, "error");
  } finally {
    submitLoading.value = false;
  }
};

const handleClose = () => {
  if (submitLoading.value) return;
  emit("close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.show && !submitLoading.value) {
    handleClose();
  }
};

onMounted(() => {
  if (process.client) window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  if (process.client) window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="handleClose"
    >
      <div class="modal-box max-w-3xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
        <div class="flex-none pr-8 mb-5">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
            :disabled="submitLoading"
            aria-label="Tutup"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users class="w-5 h-5" />
            </div>
            <span>{{ isEdit ? "Edit Data Pegawai" : "Tambah Pegawai Baru" }}</span>
          </h3>
        </div>

        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse">
          <div class="h-14 bg-base-200 rounded-2xl"></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="h-12 bg-base-200 rounded-2xl"></div>
            <div class="h-12 bg-base-200 rounded-2xl"></div>
          </div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <form
          v-else
          id="pegawai-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <!-- TAUTAN PENDUDUK -->
          <section class="space-y-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Link2 class="w-4 h-4" />
              Integrasi Data Penduduk (Opsional)
            </h4>
            <p class="text-xs text-base-content/60">
              Tautkan pegawai dengan data penduduk agar nama, kontak, dan alamat terisi otomatis.
            </p>
            <PendudukSelector
              v-model="form.pendudukId"
              :initial-penduduk="linkedPenduduk"
              :error="errors.pendudukId"
              label=""
              @selected="handlePendudukSelected"
            />
          </section>

          <!-- KEPEGAWAIAN -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Briefcase class="w-4 h-4" />
              Informasi Kepegawaian
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  NIP / Nomor Induk Pegawai <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.nip"
                  type="text"
                  maxlength="50"
                  placeholder="Contoh: PEG-001 atau 19920812..."
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.nip }"
                  @input="errors.nip = undefined"
                />
                <span v-if="errors.nip" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.nip }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama Lengkap Pegawai <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  maxlength="150"
                  placeholder="Contoh: Dr. Budi Santoso"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-medium"
                  :class="{ 'border-error': errors.name }"
                  @input="errors.name = undefined"
                />
                <span v-if="errors.name" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.name }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Jabatan / Posisi
                </label>
                <input
                  v-model="form.position"
                  type="text"
                  maxlength="100"
                  placeholder="Contoh: Staff Keuangan / Perawat"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Unit Kerja / Instalasi
                </label>
                <input
                  v-model="form.unitKerja"
                  type="text"
                  maxlength="100"
                  placeholder="Contoh: Instalasi Rawat Jalan"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Kepegawaian
                </label>
                <select
                  v-model="form.statusKepegawaian"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option value="">-- Pilih Status Kepegawaian --</option>
                  <option
                    v-for="opt in STATUS_KEPEGAWAIAN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Aktif
                </label>
                <select
                  v-model="form.statusAktif"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option
                    v-for="opt in STATUS_AKTIF_PEGAWAI_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tanggal Masuk
                </label>
                <FlatpickrDate
                  v-model="form.tanggalMasuk"
                  :max-date="form.tanggalKeluar || undefined"
                  placeholder="Pilih tanggal masuk..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tanggal Keluar
                </label>
                <FlatpickrDate
                  v-model="form.tanggalKeluar"
                  :min-date="form.tanggalMasuk || undefined"
                  :error="Boolean(errors.tanggalKeluar)"
                  placeholder="Pilih tanggal keluar..."
                  @change="errors.tanggalKeluar = undefined"
                />
                <span v-if="errors.tanggalKeluar" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.tanggalKeluar }}
                </span>
              </div>
            </div>
          </section>

          <!-- KONTAK & DOMISILI -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5 pb-8">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <MapPin class="w-4 h-4" />
              Kontak, Domisili & Bio
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Alamat Email
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  maxlength="150"
                  placeholder="Contoh: budi@klinik.id"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.email }"
                  @input="errors.email = undefined"
                />
                <span v-if="errors.email" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.email }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  v-model="form.phoneNumber"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: 081234567890"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.phoneNumber }"
                  @input="errors.phoneNumber = undefined"
                />
                <span v-if="errors.phoneNumber" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.phoneNumber }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <UiAutocompleteWilayah
                  v-model="form.idKelurahan"
                  :initial-label="initialWilayahLabel"
                  label="Wilayah Administratif (Kelurahan / Kecamatan / Kota)"
                  placeholder="Cari kelurahan tempat tinggal..."
                  @select="handleWilayahSelect"
                  @clear="handleWilayahClear"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Alamat Domisili
                </label>
                <textarea
                  v-model="form.address"
                  rows="2"
                  maxlength="500"
                  placeholder="Alamat lengkap tempat tinggal pegawai..."
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Bio / Catatan Singkat
                </label>
                <textarea
                  v-model="form.bio"
                  rows="2"
                  maxlength="500"
                  placeholder="Deskripsi singkat keahlian atau catatan pegawai..."
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>
            </div>
          </section>
        </form>

        <div class="flex-none modal-action gap-2 pt-4 mt-2 border-t border-base-content/10">
          <button
            type="button"
            class="btn btn-ghost rounded-2xl font-bold px-5"
            :disabled="submitLoading"
            @click="handleClose"
          >
            Batal
          </button>
          <button
            type="submit"
            form="pegawai-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
            :disabled="submitLoading || modalLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Data" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

