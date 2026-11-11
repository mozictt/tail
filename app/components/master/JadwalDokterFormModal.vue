<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Stethoscope,
  X,
  XCircle,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import FlatpickrTime from "@/components/ui/FlatpickrTime.vue";
import { JadwalDokterService } from "@/services/jadwal-dokter.service";
import { DokterService } from "@/services/dokter.service";
import { UnitService } from "@/services/unit.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  formatDurasiMenitLabel,
  formatNamaGelarDokter,
  getOptionLabel,
  HARI_PRAKTIK_OPTIONS,
  HariPraktik,
  hitungDurasiSesiMenit,
  JENIS_UNIT_OPTIONS,
  SESI_PRAKTIK_OPTIONS,
  SesiPraktik,
  type BaseJadwalDokterPayload,
  type DokterItem,
  type JadwalDokterDokterSummary,
  type JadwalDokterItem,
  type UnitOptionItem,
} from "@/types/simrs";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const props = withDefaults(
  defineProps<{
    show: boolean;
    editId?: number | null;
    presetDokterId?: number | null;
    presetUnitId?: number | null;
    presetHari?: HariPraktik | null;
  }>(),
  {
    editId: null,
    presetDokterId: null,
    presetUnitId: null,
    presetHari: null,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", items: JadwalDokterItem[]): void;
}>();

const jadwalService = JadwalDokterService();
const dokterService = DokterService();
const unitService = UnitService();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const scheduleMode = ref<"single" | "bulk">("single");
const modalLoading = ref(false);
const submitLoading = ref(false);
const loadingOptions = ref(false);
const autoTotalKuota = ref(true);

const dokterOptions = ref<Array<DokterItem | JadwalDokterDokterSummary>>([]);
const unitOptions = ref<UnitOptionItem[]>([]);

interface JadwalFormState {
  dokterId: number | undefined;
  unitId: number | undefined;
  hari: HariPraktik;
  hariList: HariPraktik[];
  jamMulai: string;
  jamSelesai: string;
  sesi: SesiPraktik | "";
  ruangan: string;
  kuotaJkn: number;
  kuotaNonJkn: number;
  kuotaTotal: number;
  durasiPerPasien: number | "";
  kodeJadwalBpjs: string;
  ihsScheduleId: string;
  keterangan: string;
  status: MasterStatus;
}

const createDefaultForm = (): JadwalFormState => ({
  dokterId: props.presetDokterId ?? undefined,
  unitId: props.presetUnitId ?? undefined,
  hari: props.presetHari ?? HariPraktik.SENIN,
  hariList: props.presetHari ? [props.presetHari] : [HariPraktik.SENIN],
  jamMulai: "08:00",
  jamSelesai: "12:00",
  sesi: SesiPraktik.PAGI,
  ruangan: "",
  kuotaJkn: 20,
  kuotaNonJkn: 10,
  kuotaTotal: 30,
  durasiPerPasien: 15,
  kodeJadwalBpjs: "",
  ihsScheduleId: "",
  keterangan: "",
  status: "Y",
});

const form = ref<JadwalFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof JadwalFormState, string>>>({});

const formatDokterOptionLabel = (d: DokterItem | JadwalDokterDokterSummary): string => {
  const nama =
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter;
  const spec = d.spesialisasi ? ` • ${d.spesialisasi}` : "";
  return `${d.kodeDokter} — ${nama}${spec}`;
};

const dokterSelectOptions = computed(() =>
  dokterOptions.value.map((d) => ({
    id: d.id,
    displayLabel: formatDokterOptionLabel(d),
  })),
);

const unitSelectOptions = computed(() =>
  unitOptions.value.map((u) => ({
    id: u.id,
    displayLabel: `${u.kode} — ${u.nama} (${getOptionLabel(JENIS_UNIT_OPTIONS, u.jenisUnit)})`,
  })),
);

const durasiSesiMenit = computed(() =>
  hitungDurasiSesiMenit(form.value.jamMulai, form.value.jamSelesai),
);

const estimasiSlotPreview = computed(() => {
  const total = durasiSesiMenit.value;
  const perPasien = Number(form.value.durasiPerPasien);
  if (!total || !Number.isFinite(perPasien) || perPasien <= 0) return null;
  return Math.floor(total / perPasien);
});

const mergeDetailDokterIfMissing = (detail: JadwalDokterItem) => {
  if (!detail.dokter) return;
  const exists = dokterOptions.value.some((d) => d.id === detail.dokterId);
  if (!exists) {
    dokterOptions.value = [detail.dokter, ...dokterOptions.value];
  }
};

const loadReferenceOptions = async () => {
  loadingOptions.value = true;
  try {
    const [dokterRes, unitRes] = await Promise.allSettled([
      dokterService.getDokter({
        page: 1,
        limit: 100,
        status: "Y",
        sortBy: "kodeDokter",
        sortType: "ASC",
      }),
      unitService.getUnitOptions(),
    ]);
    if (dokterRes.status === "fulfilled") dokterOptions.value = dokterRes.value.items;
    if (unitRes.status === "fulfilled") unitOptions.value = unitRes.value;
  } finally {
    loadingOptions.value = false;
  }
};

const resetState = () => {
  scheduleMode.value = "single";
  autoTotalKuota.value = true;
  form.value = createDefaultForm();
  errors.value = {};
};

const populateFromItem = (item: JadwalDokterItem) => {
  const jkn = Number(item.kuotaJkn ?? 0);
  const nonJkn = Number(item.kuotaNonJkn ?? 0);
  const total = Number(item.kuotaTotal ?? 0);
  autoTotalKuota.value = total === jkn + nonJkn;

  form.value = {
    dokterId: item.dokterId,
    unitId: item.unitId,
    hari: item.hari,
    hariList: [item.hari],
    jamMulai: String(item.jamMulai || "08:00").slice(0, 5),
    jamSelesai: String(item.jamSelesai || "12:00").slice(0, 5),
    sesi: item.sesi || "",
    ruangan: item.ruangan || "",
    kuotaJkn: jkn,
    kuotaNonJkn: nonJkn,
    kuotaTotal: total,
    durasiPerPasien: item.durasiPerPasien ?? "",
    kodeJadwalBpjs: item.kodeJadwalBpjs || "",
    ihsScheduleId: item.ihsScheduleId || "",
    keterangan: item.keterangan || "",
    status: item.status === "N" ? "N" : "Y",
  };
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();
    await loadReferenceOptions();
    if (!targetId) return;

    modalLoading.value = true;
    try {
      const detail = await jadwalService.getJadwalDokterById(targetId);
      mergeDetailDokterIfMissing(detail);
      populateFromItem(detail);
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, "Gagal memuat detail jadwal dokter"), "error");
      emit("close");
    } finally {
      modalLoading.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => [form.value.kuotaJkn, form.value.kuotaNonJkn, autoTotalKuota.value] as const,
  ([jkn, nonJkn, isAuto]) => {
    if (!isAuto) return;
    const safeJkn = Math.max(0, Math.floor(Number(jkn) || 0));
    const safeNonJkn = Math.max(0, Math.floor(Number(nonJkn) || 0));
    form.value.kuotaTotal = safeJkn + safeNonJkn;
    errors.value.kuotaTotal = undefined;
  },
);

const toggleBulkDay = (hari: HariPraktik) => {
  const list = form.value.hariList;
  const idx = list.indexOf(hari);
  form.value.hariList =
    idx >= 0 ? list.filter((item) => item !== hari) : [...list, hari];
  errors.value.hariList = undefined;
};

const applyBulkPreset = (days: HariPraktik[]) => {
  form.value.hariList = [...days];
  errors.value.hariList = undefined;
};

const validateTimeAndQuota = (
  f: JadwalFormState,
  nextErrors: Partial<Record<keyof JadwalFormState, string>>,
) => {
  if (!TIME_PATTERN.test(f.jamMulai.trim())) {
    nextErrors.jamMulai = "Format jam mulai harus HH:mm";
  }
  if (!TIME_PATTERN.test(f.jamSelesai.trim())) {
    nextErrors.jamSelesai = "Format jam selesai harus HH:mm";
  }
  const durasi = hitungDurasiSesiMenit(f.jamMulai, f.jamSelesai);
  if (!nextErrors.jamMulai && !nextErrors.jamSelesai && durasi === null) {
    nextErrors.jamSelesai = "Jam selesai harus lebih besar dari jam mulai";
  }

  if (f.durasiPerPasien !== "") {
    const dp = Number(f.durasiPerPasien);
    if (!Number.isInteger(dp) || dp < 1 || dp > 480) {
      nextErrors.durasiPerPasien = "Durasi harus 1 - 480 menit";
    } else if (durasi !== null && dp > durasi) {
      nextErrors.durasiPerPasien = `Maksimal ${durasi} menit (sesuai durasi sesi)`;
    }
  }
};

const validateQuotaValues = (
  f: JadwalFormState,
  nextErrors: Partial<Record<keyof JadwalFormState, string>>,
) => {
  const jkn = Number(f.kuotaJkn);
  const nonJkn = Number(f.kuotaNonJkn);
  const total = Number(f.kuotaTotal);

  if (!Number.isInteger(jkn) || jkn < 0) nextErrors.kuotaJkn = "Minimal 0";
  if (!Number.isInteger(nonJkn) || nonJkn < 0) nextErrors.kuotaNonJkn = "Minimal 0";
  if (!Number.isInteger(total) || total < 0) {
    nextErrors.kuotaTotal = "Minimal 0";
  } else if (jkn + nonJkn > total) {
    nextErrors.kuotaTotal = `Total (${total}) kurang dari JKN + Non-JKN (${jkn + nonJkn})`;
  }
};

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof JadwalFormState, string>> = {};
  const f = form.value;

  if (!f.dokterId) nextErrors.dokterId = "Dokter wajib dipilih";
  if (!f.unitId) nextErrors.unitId = "Unit / Poliklinik wajib dipilih";
  if (!isEdit.value && scheduleMode.value === "bulk" && f.hariList.length === 0) {
    nextErrors.hariList = "Pilih minimal 1 hari praktik";
  }
  if ((isEdit.value || scheduleMode.value === "single") && !f.hari) {
    nextErrors.hari = "Hari praktik wajib dipilih";
  }

  validateTimeAndQuota(f, nextErrors);
  validateQuotaValues(f, nextErrors);

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildBasePayload = (): BaseJadwalDokterPayload => {
  const f = form.value;
  return {
    dokterId: Number(f.dokterId),
    unitId: Number(f.unitId),
    jamMulai: f.jamMulai.trim().slice(0, 5),
    jamSelesai: f.jamSelesai.trim().slice(0, 5),
    sesi: f.sesi || undefined,
    ruangan: f.ruangan.trim() || undefined,
    kuotaJkn: Number(f.kuotaJkn || 0),
    kuotaNonJkn: Number(f.kuotaNonJkn || 0),
    kuotaTotal: Number(f.kuotaTotal || 0),
    durasiPerPasien:
      f.durasiPerPasien !== "" ? Number(f.durasiPerPasien) : undefined,
    kodeJadwalBpjs: f.kodeJadwalBpjs.trim() || undefined,
    ihsScheduleId: f.ihsScheduleId.trim() || undefined,
    keterangan: f.keterangan.trim() || undefined,
    status: f.status,
  };
};

const handleSubmit = async () => {
  if (!validateForm() || submitLoading.value) return;

  submitLoading.value = true;
  try {
    const base = buildBasePayload();
    if (isEdit.value && props.editId) {
      const updated = await jadwalService.updateJadwalDokter(props.editId, {
        ...base,
        hari: form.value.hari,
      });
      showToast("Jadwal dokter berhasil diperbarui", "success");
      emit("saved", [updated]);
      emit("close");
      return;
    }

    if (scheduleMode.value === "bulk") {
      const createdList = await jadwalService.bulkCreateJadwalDokter({
        ...base,
        hariList: form.value.hariList,
      });
      showToast(`${createdList.length} jadwal dokter berhasil dibuat`, "success");
      emit("saved", createdList);
      emit("close");
      return;
    }

    const created = await jadwalService.createJadwalDokter({
      ...base,
      hari: form.value.hari,
    });
    showToast("Jadwal dokter berhasil ditambahkan", "success");
    emit("saved", [created]);
    emit("close");
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, "Gagal menyimpan jadwal dokter"), "error");
  } finally {
    submitLoading.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="!submitLoading && emit('close')"
    >
      <div class="modal-box max-w-3xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
          :disabled="submitLoading"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3 pr-8 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarClock class="w-5 h-5" />
          </div>
          <span>{{ isEdit ? "Edit Jadwal Praktik Dokter" : "Tambah Jadwal Praktik Dokter" }}</span>
        </h3>

        <div v-if="modalLoading" class="space-y-3 py-6 animate-pulse">
          <div class="h-14 bg-base-200 rounded-2xl"></div>
          <div class="h-44 bg-base-200 rounded-2xl"></div>
          <div class="h-32 bg-base-200 rounded-2xl"></div>
        </div>

        <form v-else class="flex-1 min-h-0 flex flex-col" @submit.prevent="handleSubmit">
          <div class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
            <!-- Mode Single vs Bulk saat Create -->
            <div
              v-if="!isEdit"
              class="p-3.5 rounded-2xl bg-base-200/40 border border-base-content/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <p class="text-xs font-extrabold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                  <Layers class="w-3.5 h-3.5 text-primary" />
                  Mode Penjadwalan
                </p>
                <p class="text-[11px] text-base-content/60 mt-0.5">
                  Pilih input per hari atau sekaligus banyak hari dalam 1 transaksi atomik.
                </p>
              </div>
              <div class="grid grid-cols-2 gap-1.5 bg-base-100 p-1 rounded-xl border border-base-content/10 shrink-0">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="scheduleMode === 'single' ? 'bg-primary text-primary-content shadow-xs' : 'text-base-content/70 hover:bg-base-200'"
                  @click="scheduleMode = 'single'"
                >
                  Satu Hari
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="scheduleMode === 'bulk' ? 'bg-primary text-primary-content shadow-xs' : 'text-base-content/70 hover:bg-base-200'"
                  @click="scheduleMode = 'bulk'"
                >
                  Multi-Hari (Bulk)
                </button>
              </div>
            </div>

            <!-- Dokter & Unit -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4">
              <div class="sm:col-span-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary">
                <Stethoscope class="w-4 h-4" />
                Dokter & Unit Pelayanan
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Dokter <span class="text-error">*</span>
                </label>
                <Select2
                  v-model="form.dokterId"
                  :options="dokterSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Pilih dokter aktif..."
                  :error="Boolean(errors.dokterId)"
                  @change="errors.dokterId = undefined"
                />
                <span v-if="errors.dokterId" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.dokterId }}
                </span>
                <p v-else-if="!loadingOptions && dokterOptions.length === 0" class="text-[11px] text-warning font-semibold mt-1">
                  Belum ada data master dokter aktif.
                </p>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Unit / Poliklinik <span class="text-error">*</span>
                </label>
                <Select2
                  v-model="form.unitId"
                  :options="unitSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Pilih unit / poliklinik..."
                  :error="Boolean(errors.unitId)"
                  @change="errors.unitId = undefined"
                />
                <span v-if="errors.unitId" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.unitId }}
                </span>
              </div>
            </div>

            <!-- Hari & Jam Praktik -->
            <div class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary">
                  <Clock class="w-4 h-4" />
                  Hari & Jam Praktik
                </span>
                <span
                  v-if="durasiSesiMenit"
                  class="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary"
                >
                  Durasi Sesi: {{ formatDurasiMenitLabel(durasiSesiMenit) }}
                  <template v-if="estimasiSlotPreview !== null">
                    • ±{{ estimasiSlotPreview }} slot antrean
                  </template>
                </span>
              </div>

              <!-- Single Hari Picker -->
              <div v-if="isEdit || scheduleMode === 'single'">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Hari Praktik <span class="text-error">*</span>
                </label>
                <div class="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  <button
                    v-for="opt in HARI_PRAKTIK_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="h-9 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.hari === opt.value
                        ? 'bg-primary text-primary-content border-primary shadow-xs'
                        : 'bg-base-100 border-base-content/10 text-base-content/75 hover:bg-base-200/60'
                    "
                    @click="
                      form.hari = opt.value;
                      errors.hari = undefined;
                    "
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <span v-if="errors.hari" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.hari }}
                </span>
              </div>

              <!-- Bulk Multi-Hari Picker -->
              <div v-else>
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label class="text-xs font-bold text-base-content/80">
                    Pilih Hari Praktik <span class="text-error">*</span>
                    <span class="font-normal text-base-content/55">({{ form.hariList.length }} hari dipilih)</span>
                  </label>
                  <div class="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary"
                      @click="applyBulkPreset([HariPraktik.SENIN, HariPraktik.SELASA, HariPraktik.RABU, HariPraktik.KAMIS, HariPraktik.JUMAT])"
                    >
                      Senin–Jumat
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-primary"
                      @click="applyBulkPreset([HariPraktik.SENIN, HariPraktik.SELASA, HariPraktik.RABU, HariPraktik.KAMIS, HariPraktik.JUMAT, HariPraktik.SABTU])"
                    >
                      Senin–Sabtu
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error"
                      @click="applyBulkPreset([])"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  <button
                    v-for="opt in HARI_PRAKTIK_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="h-9 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.hariList.includes(opt.value)
                        ? 'bg-primary text-primary-content border-primary shadow-xs'
                        : 'bg-base-100 border-base-content/10 text-base-content/75 hover:bg-base-200/60'
                    "
                    @click="toggleBulkDay(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <span v-if="errors.hariList" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.hariList }}
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Jam Mulai <span class="text-error">*</span>
                  </label>
                  <FlatpickrTime
                    v-model="form.jamMulai"
                    placeholder="08:00"
                    :error="Boolean(errors.jamMulai)"
                    @change="errors.jamMulai = undefined"
                  />
                  <span v-if="errors.jamMulai" class="text-xs text-error font-semibold mt-1 block">
                    {{ errors.jamMulai }}
                  </span>
                </div>

                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Jam Selesai <span class="text-error">*</span>
                  </label>
                  <FlatpickrTime
                    v-model="form.jamSelesai"
                    placeholder="12:00"
                    :error="Boolean(errors.jamSelesai)"
                    @change="errors.jamSelesai = undefined"
                  />
                  <span v-if="errors.jamSelesai" class="text-xs text-error font-semibold mt-1 block">
                    {{ errors.jamSelesai }}
                  </span>
                </div>

                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Sesi Praktik
                  </label>
                  <select
                    v-model="form.sesi"
                    class="select select-bordered w-full rounded-xl h-11 text-sm"
                  >
                    <option value="">-- Opsional --</option>
                    <option
                      v-for="opt in SESI_PRAKTIK_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Ruangan / Bilik
                  </label>
                  <input
                    v-model="form.ruangan"
                    type="text"
                    maxlength="60"
                    placeholder="Contoh: Ruang Poli 1"
                    class="input input-bordered w-full rounded-xl h-11 text-sm"
                  />
                </div>
              </div>
            </div>

            <!-- Kuota & Integrasi -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-base-200/30 border border-base-content/10 rounded-2xl p-4">
              <div class="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span class="font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <ShieldCheck class="w-4 h-4" />
                  Kuota Pasien, Durasi & Integrasi
                </span>
                <label class="inline-flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-base-content/75">
                  <input
                    v-model="autoTotalKuota"
                    type="checkbox"
                    class="checkbox checkbox-xs checkbox-primary"
                  />
                  Hitung otomatis Kuota Total = JKN + Non-JKN
                </label>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kuota JKN (BPJS)
                </label>
                <input
                  v-model.number="form.kuotaJkn"
                  type="number"
                  min="0"
                  step="1"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.kuotaJkn }"
                  @input="errors.kuotaJkn = undefined"
                />
                <span v-if="errors.kuotaJkn" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.kuotaJkn }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kuota Non-JKN / Umum
                </label>
                <input
                  v-model.number="form.kuotaNonJkn"
                  type="number"
                  min="0"
                  step="1"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.kuotaNonJkn }"
                  @input="errors.kuotaNonJkn = undefined"
                />
                <span v-if="errors.kuotaNonJkn" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.kuotaNonJkn }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kuota Total
                </label>
                <input
                  v-model.number="form.kuotaTotal"
                  type="number"
                  min="0"
                  step="1"
                  :disabled="autoTotalKuota"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.kuotaTotal }"
                  @input="errors.kuotaTotal = undefined"
                />
                <span v-if="errors.kuotaTotal" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.kuotaTotal }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Durasi / Pasien (Menit)
                </label>
                <input
                  v-model.number="form.durasiPerPasien"
                  type="number"
                  min="1"
                  max="480"
                  step="1"
                  placeholder="Contoh: 15"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.durasiPerPasien }"
                  @input="errors.durasiPerPasien = undefined"
                />
                <span v-if="errors.durasiPerPasien" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.durasiPerPasien }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Jadwal BPJS (HFIS)
                </label>
                <input
                  v-model="form.kodeJadwalBpjs"
                  type="text"
                  maxlength="50"
                  placeholder="Contoh: HFIS-INT-SENIN-01"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  IHS Schedule ID (SATUSEHAT)
                </label>
                <input
                  v-model="form.ihsScheduleId"
                  type="text"
                  maxlength="50"
                  placeholder="Contoh: sch-10009880728-int"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div class="sm:col-span-2 lg:col-span-3">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Keterangan Tambahan
                </label>
                <textarea
                  v-model="form.keterangan"
                  rows="2"
                  maxlength="500"
                  placeholder="Catatan khusus, misal: Khusus pasien kontrol & rujukan baru"
                  class="textarea textarea-bordered w-full rounded-xl text-sm"
                ></textarea>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Jadwal
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="flex items-center justify-center gap-1 h-11 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'Y'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'Y'"
                  >
                    <CheckCircle2 class="w-4 h-4" />
                    Aktif
                  </button>
                  <button
                    type="button"
                    class="flex items-center justify-center gap-1 h-11 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'N'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'N'"
                  >
                    <XCircle class="w-4 h-4" />
                    Nonaktif
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-none modal-action gap-2 pt-4 mt-2 border-t border-base-content/10">
            <button
              type="button"
              class="btn btn-ghost rounded-xl"
              :disabled="submitLoading"
              @click="emit('close')"
            >
              Batal
            </button>
            <button
              type="submit"
              class="btn btn-primary rounded-xl px-6 font-bold shadow-md shadow-primary/25"
              :disabled="submitLoading || modalLoading"
            >
              <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
              <span>
                {{
                  submitLoading
                    ? "Menyimpan..."
                    : isEdit
                      ? "Simpan Perubahan"
                      : scheduleMode === "bulk"
                        ? `Simpan ${form.hariList.length} Jadwal`
                        : "Simpan Jadwal"
                }}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

