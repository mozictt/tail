<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  BadgeDollarSign,
  CheckCircle2,
  Coins,
  FlaskConical,
  Scan,
  Stethoscope,
  X,
  XCircle,
} from "lucide-vue-next";
import InputRupiah from "@/components/ui/InputRupiah.vue";
import { TarifService } from "@/services/tarif.service";
import { useCurrency } from "@/composables/useCurrency";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  JenisTarif,
  MODALITAS_RADIOLOGI_OPTIONS,
  type CreateTarifTindakanPayload,
  type TarifAtributKhusus,
  type TarifTindakanItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
  initialJenisTarif?: JenisTarif | "";
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: TarifTindakanItem): void;
}>();

const tarifService = TarifService();
const { formatRupiah } = useCurrency();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);

interface TarifTindakanFormState {
  kode: string;
  nama: string;
  jenisTarif: JenisTarif;
  kelompokTarif: string;
  satuan: string;
  kodeEksternal: string;
  keterangan: string;
  status: MasterStatus;
  spesimen: string;
  metodeLab: string;
  butuhPuasa: boolean;
  estimasiHasilJam: number | undefined;
  modalitas: string;
  proyeksi: string;
  butuhKontras: boolean;
  setTarifDefault: boolean;
  jasaSarana: number;
  bhp: number;
  jasaDokter: number;
  jasaNakes: number;
}

const createDefaultForm = (jenis?: JenisTarif | ""): TarifTindakanFormState => {
  const defaultJenis =
    jenis === JenisTarif.LABORATORIUM || jenis === JenisTarif.RADIOLOGI
      ? jenis
      : JenisTarif.BIASA;

  return {
    kode: "",
    nama: "",
    jenisTarif: defaultJenis,
    kelompokTarif: "",
    satuan:
      defaultJenis === JenisTarif.BIASA ? "Tindakan" : "Pemeriksaan",
    kodeEksternal: "",
    keterangan: "",
    status: "Y",
    spesimen: "",
    metodeLab: "",
    butuhPuasa: false,
    estimasiHasilJam: undefined,
    modalitas: defaultJenis === JenisTarif.RADIOLOGI ? "X-RAY" : "",
    proyeksi: "",
    butuhKontras: false,
    setTarifDefault: true,
    jasaSarana: 0,
    bhp: 0,
    jasaDokter: 0,
    jasaNakes: 0,
  };
};

const form = ref<TarifTindakanFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof TarifTindakanFormState, string>>>({});

const previewTotalDefault = computed(
  () =>
    Math.max(0, Number(form.value.jasaSarana || 0)) +
    Math.max(0, Number(form.value.bhp || 0)) +
    Math.max(0, Number(form.value.jasaDokter || 0)) +
    Math.max(0, Number(form.value.jasaNakes || 0)),
);

const kelompokPlaceholder = computed(() => {
  if (form.value.jenisTarif === JenisTarif.LABORATORIUM) {
    return "Contoh: Hematologi, Kimia Klinik, Urinalisa";
  }
  if (form.value.jenisTarif === JenisTarif.RADIOLOGI) {
    return "Contoh: Rontgen Konvensional, USG, CT-Scan";
  }
  return "Contoh: Konsultasi, Tindakan Medis, Keperawatan";
});

const resetState = () => {
  form.value = createDefaultForm(props.initialJenisTarif);
  errors.value = {};
};

const populateFromItem = (item: TarifTindakanItem) => {
  const meta = item.atributKhusus || {};
  form.value = {
    kode: item.kode || "",
    nama: item.nama || "",
    jenisTarif: item.jenisTarif || JenisTarif.BIASA,
    kelompokTarif: item.kelompokTarif || "",
    satuan: item.satuan || "Tindakan",
    kodeEksternal: item.kodeEksternal || "",
    keterangan: item.keterangan || "",
    status: item.status === "N" ? "N" : "Y",
    spesimen: meta.spesimen || "",
    metodeLab: meta.metode || "",
    butuhPuasa: Boolean(meta.butuhPuasa),
    estimasiHasilJam:
      meta.estimasiHasilJam !== undefined
        ? Number(meta.estimasiHasilJam)
        : undefined,
    modalitas: meta.modalitas || "",
    proyeksi: meta.proyeksi || "",
    butuhKontras: Boolean(meta.butuhKontras),
    setTarifDefault: false,
    jasaSarana: 0,
    bhp: 0,
    jasaDokter: 0,
    jasaNakes: 0,
  };
};

watch(
  () => form.value.jenisTarif,
  (nextJenis) => {
    if (isEdit.value) return;
    if (nextJenis === JenisTarif.BIASA && form.value.satuan === "Pemeriksaan") {
      form.value.satuan = "Tindakan";
    } else if (
      (nextJenis === JenisTarif.LABORATORIUM ||
        nextJenis === JenisTarif.RADIOLOGI) &&
      form.value.satuan === "Tindakan"
    ) {
      form.value.satuan = "Pemeriksaan";
    }
    if (nextJenis === JenisTarif.RADIOLOGI && !form.value.modalitas) {
      form.value.modalitas = "X-RAY";
    }
  },
);

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();
    if (!targetId) return;

    modalLoading.value = true;
    try {
      const detail = await tarifService.getTarifById(targetId);
      populateFromItem(detail);
    } catch (err: unknown) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat detail master tarif"),
        "error",
      );
      emit("close");
    } finally {
      modalLoading.value = false;
    }
  },
  { immediate: true },
);

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof TarifTindakanFormState, string>> = {};
  const f = form.value;

  if (!f.kode.trim()) {
    nextErrors.kode = "Kode tindakan wajib diisi";
  } else if (f.kode.trim().length > 30) {
    nextErrors.kode = "Kode maksimal 30 karakter";
  }

  if (!f.nama.trim()) {
    nextErrors.nama = "Nama tindakan/pemeriksaan wajib diisi";
  } else if (f.nama.trim().length > 180) {
    nextErrors.nama = "Nama maksimal 180 karakter";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildAtributKhususPayload = (): TarifAtributKhusus | undefined => {
  const f = form.value;
  if (f.jenisTarif === JenisTarif.LABORATORIUM) {
    const meta: TarifAtributKhusus = {};
    if (f.spesimen.trim()) meta.spesimen = f.spesimen.trim();
    if (f.metodeLab.trim()) meta.metode = f.metodeLab.trim();
    if (f.butuhPuasa) meta.butuhPuasa = true;
    if (
      f.estimasiHasilJam !== undefined &&
      Number.isFinite(Number(f.estimasiHasilJam)) &&
      Number(f.estimasiHasilJam) >= 0
    ) {
      meta.estimasiHasilJam = Math.round(Number(f.estimasiHasilJam));
    }
    return Object.keys(meta).length > 0 ? meta : undefined;
  }

  if (f.jenisTarif === JenisTarif.RADIOLOGI) {
    const meta: TarifAtributKhusus = {};
    if (f.modalitas.trim()) meta.modalitas = f.modalitas.trim();
    if (f.proyeksi.trim()) meta.proyeksi = f.proyeksi.trim();
    if (f.butuhKontras) meta.butuhKontras = true;
    return Object.keys(meta).length > 0 ? meta : undefined;
  }

  return undefined;
};

const buildPayload = (): CreateTarifTindakanPayload => {
  const f = form.value;
  const payload: CreateTarifTindakanPayload = {
    kode: f.kode.trim(),
    nama: f.nama.trim(),
    jenisTarif: f.jenisTarif,
    kelompokTarif: f.kelompokTarif.trim() || undefined,
    satuan: f.satuan.trim() || "Tindakan",
    kodeEksternal: f.kodeEksternal.trim() || undefined,
    atributKhusus: buildAtributKhususPayload(),
    keterangan: f.keterangan.trim() || undefined,
    status: f.status,
  };

  if (!isEdit.value && f.setTarifDefault) {
    payload.tarifDefault = {
      jasaSarana: Number(f.jasaSarana || 0),
      bhp: Number(f.bhp || 0),
      jasaDokter: Number(f.jasaDokter || 0),
      jasaNakes: Number(f.jasaNakes || 0),
    };
  }

  return payload;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const payload = buildPayload();
    let saved: TarifTindakanItem;

    if (isEdit.value && props.editId) {
      const { tarifDefault: _omit, berlakuMulaiDefault: _omitDate, ...updateBody } = payload;
      saved = await tarifService.updateTarif(props.editId, updateBody);
      showToast(`Master tarif "${saved.nama}" berhasil diperbarui`, "success");
    } else {
      saved = await tarifService.createTarif(payload);
      showToast(`Master tarif "${saved.nama}" berhasil ditambahkan`, "success");
    }

    emit("saved", saved);
    emit("close");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menyimpan master tarif"),
      "error",
    );
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
    emit("close");
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
            aria-label="Tutup modal"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BadgeDollarSign class="w-5 h-5" />
            </div>
            <div>
              <span>{{ isEdit ? "Edit Master Tarif Tindakan" : "Tambah Master Tarif Tindakan" }}</span>
              <p class="text-xs font-normal text-base-content/60 mt-0.5">
                Dukung kategori Tarif Biasa, Laboratorium, dan Radiologi
              </p>
            </div>
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
          id="tarif-tindakan-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <!-- Kategori Jenis Tarif -->
          <section class="space-y-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary">
              1. Kategori Jenis Tarif <span class="text-error">*</span>
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                class="flex items-center gap-2.5 p-3 rounded-2xl border text-left transition"
                :class="
                  form.jenisTarif === JenisTarif.BIASA
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-700 dark:text-sky-300 shadow-sm'
                    : 'bg-base-100 border-base-content/10 text-base-content/70 hover:bg-base-200/60'
                "
                @click="form.jenisTarif = JenisTarif.BIASA"
              >
                <div class="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Stethoscope class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-xs font-extrabold">Tarif Biasa</div>
                  <div class="text-[11px] opacity-75">Poli, IGD, Ranap, OK</div>
                </div>
              </button>

              <button
                type="button"
                class="flex items-center gap-2.5 p-3 rounded-2xl border text-left transition"
                :class="
                  form.jenisTarif === JenisTarif.LABORATORIUM
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'bg-base-100 border-base-content/10 text-base-content/70 hover:bg-base-200/60'
                "
                @click="form.jenisTarif = JenisTarif.LABORATORIUM"
              >
                <div class="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FlaskConical class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-xs font-extrabold">Laboratorium</div>
                  <div class="text-[11px] opacity-75">Patologi & Spesimen</div>
                </div>
              </button>

              <button
                type="button"
                class="flex items-center gap-2.5 p-3 rounded-2xl border text-left transition"
                :class="
                  form.jenisTarif === JenisTarif.RADIOLOGI
                    ? 'bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300 shadow-sm'
                    : 'bg-base-100 border-base-content/10 text-base-content/70 hover:bg-base-200/60'
                "
                @click="form.jenisTarif = JenisTarif.RADIOLOGI"
              >
                <div class="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Scan class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-xs font-extrabold">Radiologi</div>
                  <div class="text-[11px] opacity-75">X-Ray, USG, CT-Scan</div>
                </div>
              </button>
            </div>
          </section>

          <!-- Identitas Tindakan -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary">
              2. Identitas Layanan / Tindakan
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Tarif / Tindakan <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.kode"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: TRF-001, LAB-DL, RAD-THX"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono uppercase"
                  :class="{ 'border-error': errors.kode }"
                  @input="errors.kode = undefined"
                />
                <span v-if="errors.kode" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.kode }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Eksternal (ICD-9 / LOINC / BPJS)
                </label>
                <input
                  v-model="form.kodeEksternal"
                  type="text"
                  maxlength="50"
                  placeholder="Opsional, contoh: 89.03 atau 58410-2"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama Tindakan / Pemeriksaan <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.nama"
                  type="text"
                  maxlength="180"
                  placeholder="Contoh: Konsultasi Dokter Spesialis / Darah Lengkap / Foto Thorax PA"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-medium"
                  :class="{ 'border-error': errors.nama }"
                  @input="errors.nama = undefined"
                />
                <span v-if="errors.nama" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.nama }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kelompok / Subkategori
                </label>
                <input
                  v-model="form.kelompokTarif"
                  type="text"
                  maxlength="80"
                  :placeholder="kelompokPlaceholder"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Satuan Hitung
                </label>
                <input
                  v-model="form.satuan"
                  type="text"
                  maxlength="30"
                  placeholder="Tindakan / Pemeriksaan / Paket / Kali"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>
            </div>

            <!-- Parameter Khusus Lab -->
            <div
              v-if="form.jenisTarif === JenisTarif.LABORATORIUM"
              class="pt-3 border-t border-base-content/10 grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div>
                <label class="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                  Jenis Spesimen Lab
                </label>
                <input
                  v-model="form.spesimen"
                  type="text"
                  maxlength="100"
                  placeholder="Darah EDTA / Serum / Urin"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                  Metode Pemeriksaan
                </label>
                <input
                  v-model="form.metodeLab"
                  type="text"
                  maxlength="100"
                  placeholder="Hematology Analyzer / ELISA"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                  Estimasi Hasil (Jam)
                </label>
                <input
                  v-model.number="form.estimasiHasilJam"
                  type="number"
                  min="0"
                  max="720"
                  placeholder="Contoh: 2"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>
              <div class="sm:col-span-3">
                <label class="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    v-model="form.butuhPuasa"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-success rounded-md"
                  />
                  <span class="text-xs font-semibold text-base-content/80">
                    Pasien wajib puasa sebelum pengambilan sampel
                  </span>
                </label>
              </div>
            </div>

            <!-- Parameter Khusus Radiologi -->
            <div
              v-if="form.jenisTarif === JenisTarif.RADIOLOGI"
              class="pt-3 border-t border-base-content/10 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div>
                <label class="block text-xs font-bold text-violet-600 dark:text-violet-400 mb-1.5">
                  Modalitas Radiologi
                </label>
                <select
                  v-model="form.modalitas"
                  class="select select-bordered w-full rounded-xl h-10 min-h-10 text-sm"
                >
                  <option value="">-- Pilih Modalitas --</option>
                  <option
                    v-for="opt in MODALITAS_RADIOLOGI_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-violet-600 dark:text-violet-400 mb-1.5">
                  Proyeksi / Bagian Tubuh
                </label>
                <input
                  v-model="form.proyeksi"
                  type="text"
                  maxlength="120"
                  placeholder="Contoh: PA / AP-Lateral / Abdomen"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    v-model="form.butuhKontras"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-secondary rounded-md"
                  />
                  <span class="text-xs font-semibold text-base-content/80">
                    Pemeriksaan menggunakan media kontras
                  </span>
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Keterangan Tambahan
                </label>
                <textarea
                  v-model="form.keterangan"
                  rows="2"
                  maxlength="500"
                  placeholder="Catatan tambahan terkait cakupan layanan/tindakan"
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Aktif Tindakan
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="flex items-center justify-center gap-1.5 h-10 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'Y'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'Y'"
                  >
                    <CheckCircle2 class="w-4 h-4" />
                    Aktif (Y)
                  </button>
                  <button
                    type="button"
                    class="flex items-center justify-center gap-1.5 h-10 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'N'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'N'"
                  >
                    <XCircle class="w-4 h-4" />
                    Nonaktif (N)
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- Tarif Dasar Default (Create Only) -->
          <section
            v-if="!isEdit"
            class="space-y-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Coins class="w-4 h-4 text-primary" />
                <div>
                  <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary">
                    3. Tarif Dasar Default (Semua Unit / Penjamin / Kelas)
                  </h4>
                  <p class="text-[11px] text-base-content/60">
                    Variasi spesifik per Unit, Penjamin, & Kelas dapat ditambahkan setelah disimpan.
                  </p>
                </div>
              </div>
              <input
                v-model="form.setTarifDefault"
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
              />
            </div>

            <div
              v-if="form.setTarifDefault"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1"
            >
              <div>
                <label class="block text-[11px] font-bold text-base-content/80 mb-1">
                  Jasa Sarana / RS
                </label>
                <InputRupiah
                  v-model="form.jasaSarana"
                  input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-base-content/80 mb-1">
                  BHP / Bahan
                </label>
                <InputRupiah
                  v-model="form.bhp"
                  input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-sky-600 dark:text-sky-400 mb-1">
                  Jasa Dokter
                </label>
                <InputRupiah
                  v-model="form.jasaDokter"
                  input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  Jasa Nakes
                </label>
                <InputRupiah
                  v-model="form.jasaNakes"
                  input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                />
              </div>

              <div class="sm:col-span-2 lg:col-span-4 flex items-center justify-between bg-base-100 border border-base-content/10 rounded-xl px-4 py-2.5">
                <span class="text-xs font-bold text-base-content/70">
                  Total Tarif Dasar (Otomatis)
                </span>
                <span class="text-base font-extrabold text-primary tabular-nums">
                  {{ formatRupiah(previewTotalDefault) }}
                </span>
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
            form="tarif-tindakan-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-md"
            :disabled="modalLoading || submitLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Master Tarif" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

