<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { IdCard, MapPin, Phone, Stethoscope, UserRound, X } from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import UiAutocompleteWilayah from "@/components/ui/AutocompleteWilayah.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import { PendudukService } from "@/services/penduduk.service";
import { useMasterReferences } from "@/composables/useMasterReferences";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatKelurahanLabel,
  GOLONGAN_DARAH_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  JenisKelamin,
  KEWARGANEGARAAN_OPTIONS,
  Kewarganegaraan,
  RHESUS_OPTIONS,
  STATUS_PERKAWINAN_OPTIONS,
  type CreatePendudukPayload,
  type GolonganDarah,
  type PendudukItem,
  type RhesusDarah,
  type StatusPerkawinan,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: PendudukItem): void;
}>();

const pendudukService = PendudukService();
const { showToast } = useToast();
const {
  agamaOptions,
  pendidikanOptions,
  pekerjaanOptions,
  sukuOptions,
  loadingReferences,
  loadReferences,
} = useMasterReferences();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);
const initialWilayahLabel = ref("");

interface PendudukFormState {
  nik: string;
  noKk: string;
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
  golonganDarah: GolonganDarah | "";
  rhesus: RhesusDarah | "";
  statusPerkawinan: StatusPerkawinan | "";
  kewarganegaraan: Kewarganegaraan;
  agamaId: number | undefined;
  pendidikanId: number | undefined;
  pekerjaanId: number | undefined;
  sukuId: number | undefined;
  noTelepon: string;
  email: string;
  idKelurahan: string;
  rt: string;
  rw: string;
  kodePos: string;
  alamatKtp: string;
  ihsPatientId: string;
}

const createDefaultForm = (): PendudukFormState => ({
  nik: "",
  noKk: "",
  namaLengkap: "",
  tempatLahir: "",
  tanggalLahir: "",
  jenisKelamin: JenisKelamin.LAKI_LAKI,
  golonganDarah: "",
  rhesus: "",
  statusPerkawinan: "",
  kewarganegaraan: Kewarganegaraan.WNI,
  agamaId: undefined,
  pendidikanId: undefined,
  pekerjaanId: undefined,
  sukuId: undefined,
  noTelepon: "",
  email: "",
  idKelurahan: "",
  rt: "",
  rw: "",
  kodePos: "",
  alamatKtp: "",
  ihsPatientId: "",
});

const form = ref<PendudukFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof PendudukFormState, string>>>({});
const todayIso = computed(() => new Date().toISOString().split("T")[0]);

const resetState = () => {
  form.value = createDefaultForm();
  errors.value = {};
  initialWilayahLabel.value = "";
};

const populateFromItem = (item: PendudukItem) => {
  form.value = {
    nik: item.nik || "",
    noKk: item.noKk || "",
    namaLengkap: item.namaLengkap || "",
    tempatLahir: item.tempatLahir || "",
    tanggalLahir: item.tanggalLahir ? String(item.tanggalLahir).slice(0, 10) : "",
    jenisKelamin: item.jenisKelamin || JenisKelamin.LAKI_LAKI,
    golonganDarah: item.golonganDarah || "",
    rhesus: item.rhesus || "",
    statusPerkawinan: item.statusPerkawinan || "",
    kewarganegaraan: item.kewarganegaraan || Kewarganegaraan.WNI,
    agamaId: item.agamaId ?? undefined,
    pendidikanId: item.pendidikanId ?? undefined,
    pekerjaanId: item.pekerjaanId ?? undefined,
    sukuId: item.sukuId ?? undefined,
    noTelepon: item.noTelepon || "",
    email: item.email || "",
    idKelurahan: item.idKelurahan || "",
    rt: item.rt || "",
    rw: item.rw || "",
    kodePos: item.kodePos || "",
    alamatKtp: item.alamatKtp || "",
    ihsPatientId: item.ihsPatientId || "",
  };
  initialWilayahLabel.value = formatKelurahanLabel(item.kelurahan);
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;

    resetState();
    await loadReferences();

    if (targetId) {
      modalLoading.value = true;
      try {
        const detail = await pendudukService.getPendudukById(targetId);
        populateFromItem(detail);
      } catch (err: any) {
        showToast(
          extractApiErrorMessage(err, "Gagal memuat detail penduduk"),
          "error",
        );
        emit("close");
      } finally {
        modalLoading.value = false;
      }
    }
  },
  { immediate: true },
);

const handleWilayahSelect = (item: any) => {
  form.value.idKelurahan = item.id || "";
  if (!form.value.kodePos.trim() && item.kodePos) {
    form.value.kodePos = item.kodePos;
  }
};

const handleWilayahClear = () => {
  form.value.idKelurahan = "";
};

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof PendudukFormState, string>> = {};
  const f = form.value;

  if (f.nik.trim() && !/^\d{16}$/.test(f.nik.trim())) {
    nextErrors.nik = "NIK harus terdiri dari tepat 16 digit angka";
  }

  if (f.noKk.trim() && !/^\d{16}$/.test(f.noKk.trim())) {
    nextErrors.noKk = "No. KK harus terdiri dari tepat 16 digit angka";
  }

  if (!f.namaLengkap.trim()) {
    nextErrors.namaLengkap = "Nama lengkap wajib diisi";
  } else if (f.namaLengkap.trim().length > 150) {
    nextErrors.namaLengkap = "Nama lengkap maksimal 150 karakter";
  }

  if (!f.jenisKelamin) {
    nextErrors.jenisKelamin = "Jenis kelamin wajib dipilih";
  }

  if (f.tanggalLahir) {
    const birthDate = new Date(f.tanggalLahir);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
      nextErrors.tanggalLahir =
        "Tanggal lahir tidak valid atau melebihi hari ini";
    }
  }

  if (f.noTelepon.trim() && !/^[0-9+\-\s]+$/.test(f.noTelepon.trim())) {
    nextErrors.noTelepon =
      "Nomor telepon hanya boleh berisi angka, spasi, + atau -";
  }

  if (f.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(f.email.trim())) {
      nextErrors.email = "Format email tidak valid";
    }
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildPayload = (): CreatePendudukPayload => {
  const f = form.value;
  return {
    nik: f.nik.trim() || undefined,
    noKk: f.noKk.trim() || undefined,
    namaLengkap: f.namaLengkap.trim(),
    tempatLahir: f.tempatLahir.trim() || undefined,
    tanggalLahir: f.tanggalLahir || undefined,
    jenisKelamin: f.jenisKelamin,
    golonganDarah: f.golonganDarah || undefined,
    rhesus: f.rhesus || undefined,
    statusPerkawinan: f.statusPerkawinan || undefined,
    kewarganegaraan: f.kewarganegaraan,
    agamaId: f.agamaId,
    pendidikanId: f.pendidikanId,
    pekerjaanId: f.pekerjaanId,
    sukuId: f.sukuId,
    noTelepon: f.noTelepon.trim() || undefined,
    email: f.email.trim() || undefined,
    idKelurahan: f.idKelurahan || undefined,
    rt: f.rt.trim() || undefined,
    rw: f.rw.trim() || undefined,
    kodePos: f.kodePos.trim() || undefined,
    alamatKtp: f.alamatKtp.trim() || undefined,
    ihsPatientId: f.ihsPatientId.trim() || undefined,
  };
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const payload = buildPayload();
    const saved =
      isEdit.value && props.editId
        ? await pendudukService.updatePenduduk(props.editId, payload)
        : await pendudukService.createPenduduk(payload);

    showToast(
      isEdit.value
        ? `Data penduduk "${saved.namaLengkap}" berhasil diperbarui`
        : `Penduduk baru "${saved.namaLengkap}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: any) {
    const message = extractApiErrorMessage(err, "Gagal menyimpan data penduduk");
    if (message.toLowerCase().includes("nik")) {
      errors.value.nik = message;
    }
    showToast(message, "error");
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
      <div class="modal-box max-w-4xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
        <!-- Header -->
        <div class="flex-none pr-8 mb-5">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
            :disabled="submitLoading"
            aria-label="Tutup modal"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IdCard class="w-5 h-5" />
            </div>
            <span>{{ isEdit ? "Edit Data Penduduk" : "Tambah Data Penduduk Baru" }}</span>
          </h3>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse overflow-y-auto">
          <div class="h-12 bg-base-200 rounded-2xl"></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="h-12 bg-base-200 rounded-2xl"></div>
            <div class="h-12 bg-base-200 rounded-2xl"></div>
          </div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <!-- Form Body -->
        <form
          v-else
          id="penduduk-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6"
          @submit.prevent="handleSubmit"
        >
          <!-- SEKSI 1: IDENTITAS KEPENDUDUKAN -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <UserRound class="w-4 h-4" />
              Identitas Kependudukan
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  NIK (16 Digit)
                </label>
                <input
                  v-model="form.nik"
                  type="text"
                  maxlength="16"
                  inputmode="numeric"
                  placeholder="Contoh: 3273011505900001"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.nik }"
                  @input="errors.nik = undefined"
                />
                <span v-if="errors.nik" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.nik }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  No. Kartu Keluarga (16 Digit)
                </label>
                <input
                  v-model="form.noKk"
                  type="text"
                  maxlength="16"
                  inputmode="numeric"
                  placeholder="Contoh: 3273011505900099"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.noKk }"
                  @input="errors.noKk = undefined"
                />
                <span v-if="errors.noKk" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.noKk }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama Lengkap (Sesuai KTP) <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.namaLengkap"
                  type="text"
                  maxlength="150"
                  placeholder="Contoh: Budi Santoso"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-medium"
                  :class="{ 'border-error': errors.namaLengkap }"
                  @input="errors.namaLengkap = undefined"
                />
                <span v-if="errors.namaLengkap" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.namaLengkap }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Jenis Kelamin <span class="text-error">*</span>
                </label>
                <select
                  v-model="form.jenisKelamin"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.jenisKelamin }"
                >
                  <option
                    v-for="opt in JENIS_KELAMIN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <span v-if="errors.jenisKelamin" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.jenisKelamin }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kewarganegaraan
                </label>
                <select
                  v-model="form.kewarganegaraan"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option
                    v-for="opt in KEWARGANEGARAAN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tempat Lahir
                </label>
                <input
                  v-model="form.tempatLahir"
                  type="text"
                  maxlength="100"
                  placeholder="Contoh: Bandung"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tanggal Lahir
                </label>
                <FlatpickrDate
                  v-model="form.tanggalLahir"
                  :max-date="todayIso"
                  :error="Boolean(errors.tanggalLahir)"
                  placeholder="Pilih tanggal lahir..."
                  @change="errors.tanggalLahir = undefined"
                />
                <span v-if="errors.tanggalLahir" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.tanggalLahir }}
                </span>
              </div>
            </div>
          </section>

          <!-- SEKSI 2: SOSIAL, MEDIS & REFERENSI -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <Stethoscope class="w-4 h-4" />
                Data Sosial, Medis & Referensi
              </h4>
              <span v-if="loadingReferences" class="loading loading-spinner loading-xs text-primary"></span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Golongan Darah
                </label>
                <select
                  v-model="form.golonganDarah"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option value="">-- Pilih Gol. Darah --</option>
                  <option
                    v-for="opt in GOLONGAN_DARAH_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Rhesus
                </label>
                <select
                  v-model="form.rhesus"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option value="">-- Pilih Rhesus --</option>
                  <option
                    v-for="opt in RHESUS_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Perkawinan
                </label>
                <select
                  v-model="form.statusPerkawinan"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option value="">-- Pilih Status --</option>
                  <option
                    v-for="opt in STATUS_PERKAWINAN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Agama
                </label>
                <Select2
                  v-model="form.agamaId"
                  :options="agamaOptions"
                  label-key="nama"
                  value-key="id"
                  placeholder="Pilih Agama..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Pendidikan Terakhir
                </label>
                <Select2
                  v-model="form.pendidikanId"
                  :options="pendidikanOptions"
                  label-key="nama"
                  value-key="id"
                  placeholder="Pilih Pendidikan..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Pekerjaan
                </label>
                <Select2
                  v-model="form.pekerjaanId"
                  :options="pekerjaanOptions"
                  label-key="nama"
                  value-key="id"
                  placeholder="Pilih Pekerjaan..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Suku Bangsa
                </label>
                <Select2
                  v-model="form.sukuId"
                  :options="sukuOptions"
                  label-key="nama"
                  value-key="id"
                  placeholder="Pilih Suku..."
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  IHS Patient ID (SATUSEHAT Kemenkes)
                </label>
                <input
                  v-model="form.ihsPatientId"
                  type="text"
                  maxlength="50"
                  placeholder="Contoh: P02280547535"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>
            </div>
          </section>

          <!-- SEKSI 3: KONTAK & ALAMAT KTP -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5 pb-8">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Phone class="w-4 h-4" />
              Kontak & Alamat Domisili (KTP)
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nomor Telepon / HP
                </label>
                <input
                  v-model="form.noTelepon"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: 081234567890"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.noTelepon }"
                  @input="errors.noTelepon = undefined"
                />
                <span v-if="errors.noTelepon" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.noTelepon }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Alamat Email
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  maxlength="150"
                  placeholder="Contoh: budi@example.com"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.email }"
                  @input="errors.email = undefined"
                />
                <span v-if="errors.email" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.email }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <UiAutocompleteWilayah
                  v-model="form.idKelurahan"
                  :initial-label="initialWilayahLabel"
                  label="Wilayah Administratif (Kelurahan / Kecamatan / Kota)"
                  placeholder="Ketik nama kelurahan atau kecamatan..."
                  @select="handleWilayahSelect"
                  @clear="handleWilayahClear"
                />
              </div>

              <div class="grid grid-cols-3 gap-3 sm:col-span-2">
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    RT
                  </label>
                  <input
                    v-model="form.rt"
                    type="text"
                    maxlength="5"
                    placeholder="001"
                    class="input input-bordered w-full rounded-xl h-11 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    RW
                  </label>
                  <input
                    v-model="form.rw"
                    type="text"
                    maxlength="5"
                    placeholder="002"
                    class="input input-bordered w-full rounded-xl h-11 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Kode Pos
                  </label>
                  <input
                    v-model="form.kodePos"
                    type="text"
                    maxlength="10"
                    placeholder="40111"
                    class="input input-bordered w-full rounded-xl h-11 text-sm"
                  />
                </div>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5 flex items-center gap-1.5">
                  <MapPin class="w-3.5 h-3.5 text-base-content/50" />
                  Alamat Lengkap KTP
                </label>
                <textarea
                  v-model="form.alamatKtp"
                  maxlength="500"
                  rows="3"
                  placeholder="Contoh: Jl. Asia Afrika No. 10"
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>
            </div>
          </section>
        </form>

        <!-- Footer -->
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
            form="penduduk-form"
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

