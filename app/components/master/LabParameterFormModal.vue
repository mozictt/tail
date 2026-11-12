<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  CheckCircle2,
  FlaskConical,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import { ParameterLabService } from "@/services/parameter-lab.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  JenisKelaminRujukanLab,
  TIPE_HASIL_LAB_OPTIONS,
  TipeHasilLab,
  type CreateLabParameterPayload,
  type LabParameterItem,
  type LabParameterRujukanItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    editId?: number | null;
    quickTindakanId?: number | null;
    quickTindakanNama?: string;
    initialPreset?: {
      kode?: string;
      nama?: string;
      grup?: string | null;
      satuan?: string | null;
    } | null;
  }>(),
  {
    editId: null,
    quickTindakanId: null,
    quickTindakanNama: "",
    initialPreset: null,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item?: LabParameterItem): void;
}>();

const parameterLabService = ParameterLabService();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);

interface RujukanRowState {
  jenisKelamin: JenisKelaminRujukanLab;
  usiaMinHari: number | string;
  usiaMaxHari: number | string;
  labelUsia: string;
  nilaiMin: string | number;
  nilaiMax: string | number;
  kritisMin: string | number;
  kritisMax: string | number;
  nilaiNormalText: string;
}

interface ParameterFormState {
  kode: string;
  nama: string;
  grup: string;
  satuan: string;
  tipeHasil: TipeHasilLab;
  opsiText: string;
  desimal: number;
  metode: string;
  loincCode: string;
  urutanDefault: number;
  keterangan: string;
  status: MasterStatus;
  isWajib: boolean;
  rujukanList: RujukanRowState[];
}

const createDefaultRujukan = (): RujukanRowState => ({
  jenisKelamin: JenisKelaminRujukanLab.ALL,
  usiaMinHari: 0,
  usiaMaxHari: 99999,
  labelUsia: "Semua Usia",
  nilaiMin: "",
  nilaiMax: "",
  kritisMin: "",
  kritisMax: "",
  nilaiNormalText: "",
});

const createDefaultForm = (): ParameterFormState => ({
  kode: "",
  nama: "",
  grup: "",
  satuan: "",
  tipeHasil: TipeHasilLab.NUMERIC,
  opsiText: "Negatif, Positif (+), Positif (++), Positif (+++)",
  desimal: 1,
  metode: "",
  loincCode: "",
  urutanDefault: 0,
  keterangan: "",
  status: "Y",
  isWajib: true,
  rujukanList: [createDefaultRujukan()],
});

const AGE_PRESETS = [
  { label: "Semua Usia", minHari: 0, maxHari: 99999 },
  { label: "Neonatus (0-28 hr)", minHari: 0, maxHari: 28 },
  { label: "Anak (< 14 Thn)", minHari: 29, maxHari: 5109 },
  { label: "Dewasa (>= 14 Thn)", minHari: 5110, maxHari: 99999 },
];

const form = ref<ParameterFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof ParameterFormState, string>>>({});

const resetState = () => {
  form.value = createDefaultForm();
  errors.value = {};
};

const trimText = (val: unknown): string => String(val ?? "").trim();

const parseOptionalNumeric = (
  val: string | number | null | undefined,
): number | null => {
  if (val === null || val === undefined) return null;
  const trimmed = trimText(val);
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
};

const toDisplayInput = (val?: string | number | null): string => {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  return Number.isFinite(num) ? String(num) : "";
};

const populateFromItem = (item: LabParameterItem) => {
  form.value = {
    kode: item.kode || "",
    nama: item.nama || "",
    grup: item.grup || "",
    satuan: item.satuan || "",
    tipeHasil: item.tipeHasil || TipeHasilLab.NUMERIC,
    opsiText:
      item.opsiPilihan && item.opsiPilihan.length > 0
        ? item.opsiPilihan.join(", ")
        : "Negatif, Positif (+), Positif (++)",
    desimal: Number(item.desimal ?? 2),
    metode: item.metode || "",
    loincCode: item.loincCode || "",
    urutanDefault: Number(item.urutanDefault ?? 0),
    keterangan: item.keterangan || "",
    status: item.status === "N" ? "N" : "Y",
    isWajib: true,
    rujukanList:
      item.rujukanList && item.rujukanList.length > 0
        ? item.rujukanList.map((r) => ({
            jenisKelamin: r.jenisKelamin || JenisKelaminRujukanLab.ALL,
            usiaMinHari: Number(r.usiaMinHari ?? 0),
            usiaMaxHari: Number(r.usiaMaxHari ?? 99999),
            labelUsia: r.labelUsia || "",
            nilaiMin: toDisplayInput(r.nilaiMin),
            nilaiMax: toDisplayInput(r.nilaiMax),
            kritisMin: toDisplayInput(r.kritisMin),
            kritisMax: toDisplayInput(r.kritisMax),
            nilaiNormalText: r.nilaiNormalText || "",
          }))
        : [],
  };
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();
    if (!targetId) {
      if (props.initialPreset) {
        if (props.initialPreset.kode) {
          form.value.kode = props.initialPreset.kode;
        }
        if (props.initialPreset.nama) {
          form.value.nama = props.initialPreset.nama;
        }
        if (props.initialPreset.grup) {
          form.value.grup = props.initialPreset.grup;
        }
        const rawSatuan = props.initialPreset.satuan?.trim();
        if (
          rawSatuan &&
          !["pemeriksaan", "tindakan", "paket"].includes(rawSatuan.toLowerCase())
        ) {
          form.value.satuan = rawSatuan;
        }
      }
      return;
    }

    modalLoading.value = true;
    try {
      const detail = await parameterLabService.getParameterById(targetId);
      populateFromItem(detail);
    } catch (err: unknown) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat detail parameter lab"),
        "error",
      );
      emit("close");
    } finally {
      modalLoading.value = false;
    }
  },
  { immediate: true },
);

const addRujukanRow = () => {
  form.value.rujukanList.push(createDefaultRujukan());
};

const removeRujukanRow = (idx: number) => {
  form.value.rujukanList.splice(idx, 1);
};

const applyAgePreset = (
  row: RujukanRowState,
  preset: { label: string; minHari: number; maxHari: number },
) => {
  row.usiaMinHari = preset.minHari;
  row.usiaMaxHari = preset.maxHari;
  row.labelUsia = preset.label;
};

const FORMAT_HASIL_PRESETS: Array<{
  id: string;
  label: string;
  tipeHasil: TipeHasilLab;
  opsiText?: string;
  defaultNormal?: string;
}> = [
  { id: "numeric", label: "Angka (Numerik)", tipeHasil: TipeHasilLab.NUMERIC },
  {
    id: "neg-pos",
    label: "Negatif / Positif",
    tipeHasil: TipeHasilLab.OPTION,
    opsiText: "Negatif, Positif",
    defaultNormal: "Negatif",
  },
  {
    id: "gradasi",
    label: "Positif (+/++/+++)",
    tipeHasil: TipeHasilLab.OPTION,
    opsiText: "Negatif, Positif (+), Positif (++), Positif (+++)",
    defaultNormal: "Negatif",
  },
  {
    id: "reaktif",
    label: "Non-Reaktif / Reaktif",
    tipeHasil: TipeHasilLab.OPTION,
    opsiText: "Non-Reaktif, Reaktif",
    defaultNormal: "Non-Reaktif",
  },
  { id: "text", label: "Teks / Bebas", tipeHasil: TipeHasilLab.TEXT },
];

const applyFormatPreset = (preset: (typeof FORMAT_HASIL_PRESETS)[number]) => {
  form.value.tipeHasil = preset.tipeHasil;
  if (preset.opsiText) {
    form.value.opsiText = preset.opsiText;
    errors.value.opsiText = undefined;
  }
  if (preset.defaultNormal) {
    for (const r of form.value.rujukanList) {
      if (!r.nilaiNormalText.trim() && !trimText(r.nilaiMin) && !trimText(r.nilaiMax)) {
        r.nilaiNormalText = preset.defaultNormal;
      }
    }
  }
};

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof ParameterFormState, string>> = {};
  const f = form.value;

  if (!trimText(f.kode)) nextErrors.kode = "Kode parameter wajib diisi";
  if (!trimText(f.nama)) nextErrors.nama = "Nama parameter wajib diisi";

  if (f.tipeHasil === TipeHasilLab.OPTION) {
    const opts = trimText(f.opsiText)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (opts.length === 0) {
      nextErrors.opsiText = "Minimal isi 1 opsi hasil (pisahkan dengan koma)";
    }
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildRujukanPayload = (): LabParameterRujukanItem[] => {
  return form.value.rujukanList.map((r) => {
    const minHari = parseOptionalNumeric(r.usiaMinHari);
    const maxHari = parseOptionalNumeric(r.usiaMaxHari);
    return {
      jenisKelamin: r.jenisKelamin,
      usiaMinHari: Math.max(0, Math.floor(minHari ?? 0)),
      usiaMaxHari: Math.max(0, Math.floor(maxHari ?? 99999)),
      labelUsia: trimText(r.labelUsia) || undefined,
      nilaiMin: parseOptionalNumeric(r.nilaiMin),
      nilaiMax: parseOptionalNumeric(r.nilaiMax),
      kritisMin: parseOptionalNumeric(r.kritisMin),
      kritisMax: parseOptionalNumeric(r.kritisMax),
      nilaiNormalText: trimText(r.nilaiNormalText) || undefined,
    };
  });
};

const buildPayload = (): CreateLabParameterPayload => {
  const f = form.value;
  return {
    kode: trimText(f.kode),
    nama: trimText(f.nama),
    grup: trimText(f.grup) || undefined,
    satuan: trimText(f.satuan) || undefined,
    tipeHasil: f.tipeHasil,
    opsiPilihan:
      f.tipeHasil === TipeHasilLab.OPTION
        ? trimText(f.opsiText)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    desimal: Math.max(0, Math.min(4, Math.floor(Number(f.desimal || 0)))),
    metode: trimText(f.metode) || undefined,
    loincCode: trimText(f.loincCode) || undefined,
    urutanDefault: Math.max(0, Math.floor(Number(f.urutanDefault || 0))),
    keterangan: trimText(f.keterangan) || undefined,
    status: f.status,
    rujukanList: buildRujukanPayload(),
  };
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const payload = buildPayload();

    if (!isEdit.value && props.quickTindakanId) {
      await parameterLabService.quickAddToTindakan(props.quickTindakanId, {
        ...payload,
        subGrupLabel: payload.grup,
        isWajib: form.value.isWajib,
      });
      showToast(
        `Parameter "${payload.nama}" berhasil dibuat dan dihubungkan ke panel`,
        "success",
      );
      emit("saved");
      emit("close");
      return;
    }

    const saved =
      isEdit.value && props.editId
        ? await parameterLabService.updateParameter(props.editId, payload)
        : await parameterLabService.createParameter(payload);

    showToast(
      isEdit.value
        ? `Parameter "${saved.nama}" berhasil diperbarui`
        : `Parameter "${saved.nama}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menyimpan parameter lab"),
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
      <div class="modal-box max-w-4xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-5 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <div class="flex-none pr-8 mb-4">
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
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FlaskConical class="w-5 h-5" />
            </div>
            <div>
              <span>
                {{
                  isEdit
                    ? "Edit Master Parameter Lab"
                    : quickTindakanId
                      ? `Tambah Parameter ke Panel "${quickTindakanNama}"`
                      : "Tambah Master Parameter Lab Baru"
                }}
              </span>
              <p class="text-xs font-normal text-base-content/60 mt-0.5">
                Atur satuan, tipe hasil, dan rentang nilai rujukan per gender & rentang usia
              </p>
            </div>
          </h3>
        </div>

        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-32 bg-base-200 rounded-2xl"></div>
        </div>

        <form
          v-else
          id="lab-parameter-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <!-- Identitas Parameter -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary">
              1. Identitas & Format Hasil Parameter
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Kode Parameter <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.kode"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: HB, LEU, PLT"
                  class="input input-bordered w-full rounded-xl h-10 text-sm font-mono uppercase"
                  :class="{ 'border-error': errors.kode }"
                  @input="errors.kode = undefined"
                />
                <span v-if="errors.kode" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.kode }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Nama Parameter Pemeriksaan <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.nama"
                  type="text"
                  maxlength="150"
                  placeholder="Contoh: Hemoglobin, Leukosit, Trombosit, Gula Darah Puasa"
                  class="input input-bordered w-full rounded-xl h-10 text-sm font-medium"
                  :class="{ 'border-error': errors.nama }"
                  @input="errors.nama = undefined"
                />
                <span v-if="errors.nama" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.nama }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Grup / Sub-Kelompok Hasil
                </label>
                <input
                  v-model="form.grup"
                  type="text"
                  maxlength="80"
                  placeholder="Hematologi Rutin / Kimia Klinik"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Satuan
                </label>
                <input
                  v-model="form.satuan"
                  type="text"
                  maxlength="30"
                  placeholder="g/dL, 10^3/uL, %, mg/dL"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Tipe Input Hasil
                </label>
                <select
                  v-model="form.tipeHasil"
                  class="select select-bordered w-full rounded-xl h-10 min-h-10 text-sm"
                >
                  <option
                    v-for="opt in TIPE_HASIL_LAB_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div class="sm:col-span-2 lg:col-span-3 bg-base-100/80 border border-base-content/10 rounded-xl p-3 space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs font-bold text-base-content/80">
                    Preset Cepat Format Hasil
                  </span>
                  <span class="text-[11px] text-base-content/55">
                    Pilih tipe hasil (angka, pilihan Negatif/Positif, atau teks campuran)
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="preset in FORMAT_HASIL_PRESETS"
                    :key="preset.id"
                    type="button"
                    class="btn btn-xs rounded-lg font-bold"
                    :class="
                      form.tipeHasil === preset.tipeHasil &&
                      (!preset.opsiText || form.opsiText.trim() === preset.opsiText)
                        ? 'btn-primary'
                        : 'btn-outline border-base-content/20'
                    "
                    @click="applyFormatPreset(preset)"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>

              <div v-if="form.tipeHasil === TipeHasilLab.OPTION" class="sm:col-span-2 lg:col-span-3">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Daftar Opsi Pilihan (pisahkan dengan koma) <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.opsiText"
                  type="text"
                  placeholder="Contoh: Negatif, Positif (+), Positif (++), Positif (+++)"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                  :class="{ 'border-error': errors.opsiText }"
                  @input="errors.opsiText = undefined"
                />
                <span v-if="errors.opsiText" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.opsiText }}
                </span>
              </div>

              <div v-if="form.tipeHasil === TipeHasilLab.NUMERIC">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Jumlah Desimal Tampilan
                </label>
                <input
                  v-model.number="form.desimal"
                  type="number"
                  min="0"
                  max="4"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Urutan Default
                </label>
                <input
                  v-model.number="form.urutanDefault"
                  type="number"
                  min="0"
                  class="input input-bordered w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  LOINC / Metode
                </label>
                <input
                  v-model="form.loincCode"
                  type="text"
                  maxlength="30"
                  placeholder="Kode LOINC (opsional)"
                  class="input input-bordered w-full rounded-xl h-10 text-sm font-mono"
                />
              </div>

              <div class="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'Y'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'Y'"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    Aktif (Y)
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'N'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'N'"
                  >
                    <XCircle class="w-3.5 h-3.5" />
                    Nonaktif (N)
                  </button>
                </div>

                <label v-if="quickTindakanId && !isEdit" class="inline-flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    v-model="form.isWajib"
                    type="checkbox"
                    class="checkbox checkbox-xs checkbox-primary"
                  />
                  <span>Wajib diisi pada panel tindakan ini</span>
                </label>
              </div>
            </div>
          </section>

          <!-- Nilai Normal & Kritis Rujukan -->
          <section class="space-y-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary">
                  2. Rentang Nilai Normal & Kritis Rujukan
                </h4>
                <p class="text-[11px] text-base-content/60">
                  Saat input hasil pasien, sistem otomatis memilih rujukan yang paling cocok dengan jenis kelamin & usia pasien.
                </p>
              </div>
              <button
                type="button"
                class="btn btn-xs btn-primary rounded-xl font-bold gap-1"
                @click="addRujukanRow"
              >
                <Plus class="w-3.5 h-3.5" />
                Tambah Rujukan
              </button>
            </div>

            <div
              v-if="form.rujukanList.length === 0"
              class="text-xs text-center py-6 bg-base-100 rounded-xl border border-dashed border-base-content/15 text-base-content/60"
            >
              Belum ada aturan nilai rujukan. Klik <strong>Tambah Rujukan</strong> jika parameter memiliki batas normal.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(row, idx) in form.rujukanList"
                :key="idx"
                class="bg-base-100 border border-base-content/10 rounded-xl p-3.5 space-y-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-xs font-extrabold text-primary mr-1">Rujukan #{{ idx + 1 }}</span>
                    <button
                      v-for="preset in AGE_PRESETS"
                      :key="preset.label"
                      type="button"
                      class="badge badge-sm badge-outline hover:badge-primary cursor-pointer"
                      @click="applyAgePreset(row, preset)"
                    >
                      {{ preset.label }}
                    </button>
                  </div>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost text-error rounded-lg"
                    @click="removeRujukanRow(idx)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label class="block text-[11px] font-bold text-base-content/70 mb-1">Gender</label>
                    <select
                      v-model="row.jenisKelamin"
                      class="select select-bordered select-sm w-full rounded-lg text-xs"
                    >
                      <option :value="JenisKelaminRujukanLab.ALL">Semua (L & P)</option>
                      <option :value="JenisKelaminRujukanLab.LAKI_LAKI">Laki-laki (L)</option>
                      <option :value="JenisKelaminRujukanLab.PEREMPUAN">Perempuan (P)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-base-content/70 mb-1">Label Usia</label>
                    <input
                      v-model="row.labelUsia"
                      type="text"
                      placeholder="Dewasa"
                      class="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-base-content/70 mb-1">Usia Min (Hari)</label>
                    <input
                      v-model.number="row.usiaMinHari"
                      type="number"
                      min="0"
                      class="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-base-content/70 mb-1">Usia Max (Hari)</label>
                    <input
                      v-model.number="row.usiaMaxHari"
                      type="number"
                      min="0"
                      class="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div
                  v-if="form.tipeHasil === TipeHasilLab.NUMERIC"
                  class="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
                >
                  <div>
                    <label class="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      Batas Normal Min
                    </label>
                    <input
                      v-model="row.nilaiMin"
                      type="number"
                      step="any"
                      placeholder="Mis: 13.5"
                      class="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      Batas Normal Max
                    </label>
                    <input
                      v-model="row.nilaiMax"
                      type="number"
                      step="any"
                      placeholder="Mis: 17.5"
                      class="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                      Nilai Kritis Min
                    </label>
                    <input
                      v-model="row.kritisMin"
                      type="number"
                      step="any"
                      placeholder="Opsional"
                      class="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                      Nilai Kritis Max
                    </label>
                    <input
                      v-model="row.kritisMax"
                      type="number"
                      step="any"
                      placeholder="Opsional"
                      class="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label class="block text-[11px] font-bold text-base-content/70">
                      {{
                        form.tipeHasil === TipeHasilLab.NUMERIC
                          ? "Teks Rujukan Custom (jika Min/Max kosong, boleh diisi hasil Positif/Negatif/teks)"
                          : "Nilai Normal yang Diharapkan (mis: Negatif / Non-Reaktif / Normal)"
                      }}
                    </label>
                    <div
                      v-if="form.tipeHasil !== TipeHasilLab.NUMERIC"
                      class="flex flex-wrap gap-1"
                    >
                      <button
                        v-for="norm in ['Negatif', 'Non-Reaktif', 'Normal']"
                        :key="norm"
                        type="button"
                        class="btn btn-xs btn-ghost border border-base-content/15 rounded-md h-6 min-h-0 px-2 text-[10px]"
                        @click="row.nilaiNormalText = norm"
                      >
                        {{ norm }}
                      </button>
                    </div>
                  </div>
                  <input
                    v-model="row.nilaiNormalText"
                    type="text"
                    maxlength="120"
                    :placeholder="
                      form.tipeHasil === TipeHasilLab.NUMERIC
                        ? 'Contoh: 13.5 - 17.5 atau Normal'
                        : 'Contoh: Negatif'
                    "
                    class="input input-bordered input-sm w-full rounded-lg text-xs"
                  />
                </div>
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
            form="lab-parameter-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-md"
            :disabled="modalLoading || submitLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Parameter" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
