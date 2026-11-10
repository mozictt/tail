<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  BedDouble,
  Building,
  CheckCircle2,
  MapPin,
  X,
  XCircle,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import { UnitService } from "@/services/unit.service";
import { KelasService } from "@/services/kelas.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  isBedCapableUnitType,
  JENIS_UNIT_OPTIONS,
  JenisUnit,
  type CreateUnitPayload,
  type KelasOptionItem,
  type UnitItem,
  type UnitOptionItem,
  type UpdateUnitPayload,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: UnitItem): void;
}>();

const unitService = UnitService();
const kelasService = KelasService();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);
const loadingOptions = ref(false);
const manualBedFlagTouched = ref(false);

const unitOptions = ref<UnitOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);

interface UnitFormState {
  kode: string;
  nama: string;
  jenisUnit: JenisUnit;
  parentId: number | undefined;
  kelasDefaultId: number | undefined;
  gedung: string;
  lantai: string;
  noTeleponEkstensi: string;
  kodeBpjsPoli: string;
  ihsLocationId: string;
  isTersediaBed: boolean;
  keterangan: string;
  status: MasterStatus;
}

const createDefaultForm = (): UnitFormState => ({
  kode: "",
  nama: "",
  jenisUnit: JenisUnit.RAWAT_JALAN,
  parentId: undefined,
  kelasDefaultId: undefined,
  gedung: "",
  lantai: "",
  noTeleponEkstensi: "",
  kodeBpjsPoli: "",
  ihsLocationId: "",
  isTersediaBed: false,
  keterangan: "",
  status: "Y",
});

const form = ref<UnitFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof UnitFormState, string>>>({});

const parentSelectOptions = computed(() =>
  unitOptions.value
    .filter((u) => u.id !== props.editId)
    .map((u) => ({
      id: u.id,
      displayLabel: `${u.kode} — ${u.nama}`,
    })),
);

const kelasSelectOptions = computed(() =>
  kelasOptions.value.map((k) => ({
    id: k.id,
    displayLabel: `${k.kode} — ${k.nama}`,
  })),
);

const loadReferenceOptions = async () => {
  loadingOptions.value = true;
  try {
    const [unitRes, kelasRes] = await Promise.allSettled([
      unitService.getUnitOptions(),
      kelasService.getKelasOptions(),
    ]);
    if (unitRes.status === "fulfilled") unitOptions.value = unitRes.value;
    if (kelasRes.status === "fulfilled") kelasOptions.value = kelasRes.value;
  } finally {
    loadingOptions.value = false;
  }
};

const resetState = () => {
  form.value = createDefaultForm();
  errors.value = {};
  manualBedFlagTouched.value = false;
};

const populateFromItem = (item: UnitItem) => {
  form.value = {
    kode: item.kode || "",
    nama: item.nama || "",
    jenisUnit: item.jenisUnit || JenisUnit.RAWAT_JALAN,
    parentId: item.parentId ?? undefined,
    kelasDefaultId: item.kelasDefaultId ?? undefined,
    gedung: item.gedung || "",
    lantai: item.lantai || "",
    noTeleponEkstensi: item.noTeleponEkstensi || "",
    kodeBpjsPoli: item.kodeBpjsPoli || "",
    ihsLocationId: item.ihsLocationId || "",
    isTersediaBed: Boolean(item.isTersediaBed),
    keterangan: item.keterangan || "",
    status: item.status === "N" ? "N" : "Y",
  };
  manualBedFlagTouched.value = true;
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
      const detail = await unitService.getUnitById(targetId);
      populateFromItem(detail);
    } catch (err: unknown) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat detail unit"),
        "error",
      );
      emit("close");
    } finally {
      modalLoading.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => form.value.jenisUnit,
  (jenis) => {
    if (isEdit.value || manualBedFlagTouched.value) return;
    form.value.isTersediaBed = isBedCapableUnitType(jenis);
  },
);

const toggleIsTersediaBed = () => {
  manualBedFlagTouched.value = true;
  form.value.isTersediaBed = !form.value.isTersediaBed;
};

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof UnitFormState, string>> = {};
  const f = form.value;
  const phoneRegex = /^[0-9+\-\s]+$/;

  if (!f.kode.trim()) {
    nextErrors.kode = "Kode unit wajib diisi";
  } else if (f.kode.trim().length > 30) {
    nextErrors.kode = "Kode unit maksimal 30 karakter";
  }

  if (!f.nama.trim()) {
    nextErrors.nama = "Nama unit wajib diisi";
  } else if (f.nama.trim().length > 120) {
    nextErrors.nama = "Nama unit maksimal 120 karakter";
  }

  if (!f.jenisUnit) {
    nextErrors.jenisUnit = "Jenis unit wajib dipilih";
  }

  if (
    f.noTeleponEkstensi.trim() &&
    !phoneRegex.test(f.noTeleponEkstensi.trim())
  ) {
    nextErrors.noTeleponEkstensi =
      "Nomor telepon/ekstensi hanya boleh berisi angka, spasi, + atau -";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildCreatePayload = (): CreateUnitPayload => {
  const f = form.value;
  return {
    kode: f.kode.trim(),
    nama: f.nama.trim(),
    jenisUnit: f.jenisUnit,
    parentId: f.parentId,
    kelasDefaultId: f.kelasDefaultId,
    gedung: f.gedung.trim() || undefined,
    lantai: f.lantai.trim() || undefined,
    noTeleponEkstensi: f.noTeleponEkstensi.trim() || undefined,
    kodeBpjsPoli: f.kodeBpjsPoli.trim() || undefined,
    ihsLocationId: f.ihsLocationId.trim() || undefined,
    isTersediaBed: f.isTersediaBed,
    keterangan: f.keterangan.trim() || undefined,
    status: f.status,
  };
};

const buildUpdatePayload = (): UpdateUnitPayload => ({
  ...buildCreatePayload(),
  parentId: form.value.parentId ?? null,
  kelasDefaultId: form.value.kelasDefaultId ?? null,
});

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const saved =
      isEdit.value && props.editId
        ? await unitService.updateUnit(props.editId, buildUpdatePayload())
        : await unitService.createUnit(buildCreatePayload());

    showToast(
      isEdit.value
        ? `Unit "${saved.nama}" berhasil diperbarui`
        : `Unit baru "${saved.nama}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: unknown) {
    const msg = extractApiErrorMessage(err, "Gagal menyimpan data unit");
    const lower = msg.toLowerCase();
    if (lower.includes("kode")) errors.value.kode = msg;
    if (lower.includes("nama")) errors.value.nama = msg;
    if (lower.includes("induk") || lower.includes("siklus")) {
      errors.value.parentId = msg;
    }
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
            aria-label="Tutup modal"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building class="w-5 h-5" />
            </div>
            <span>{{ isEdit ? "Edit Master Unit Pelayanan" : "Tambah Master Unit Baru" }}</span>
          </h3>
        </div>

        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-32 bg-base-200 rounded-2xl"></div>
        </div>

        <form
          v-else
          id="unit-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <!-- SEKSI 1: IDENTITAS & HIERARKI -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <Building class="w-4 h-4" />
                Identitas & Hierarki Unit
              </h4>
              <span v-if="loadingOptions" class="loading loading-spinner loading-xs text-primary"></span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Unit <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.kode"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: UNIT-MLT, POLI-INT"
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
                  Jenis Pelayanan Unit <span class="text-error">*</span>
                </label>
                <select
                  v-model="form.jenisUnit"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.jenisUnit }"
                  @change="errors.jenisUnit = undefined"
                >
                  <option
                    v-for="opt in JENIS_UNIT_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <span v-if="errors.jenisUnit" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.jenisUnit }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama Unit / Ruangan / Poliklinik <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.nama"
                  type="text"
                  maxlength="120"
                  placeholder="Contoh: Bangsal Melati / Poli Penyakit Dalam"
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
                  Unit Induk (Opsional)
                </label>
                <Select2
                  v-model="form.parentId"
                  :options="parentSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Pilih unit induk..."
                  :error="Boolean(errors.parentId)"
                  @change="errors.parentId = undefined"
                />
                <span v-if="errors.parentId" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.parentId }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kelas Perawatan Default (Opsional)
                </label>
                <Select2
                  v-model="form.kelasDefaultId"
                  :options="kelasSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Pilih kelas default..."
                />
              </div>

              <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div class="p-3 rounded-xl bg-base-100 border border-base-content/10 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-base-content flex items-center gap-1.5">
                      <BedDouble class="w-3.5 h-3.5 text-primary" />
                      Mendukung Tempat Tidur (Bed)
                    </p>
                    <p class="text-[11px] text-base-content/55 leading-snug">
                      Wajib aktif agar ruangan dapat menampung bed
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-primary toggle-sm shrink-0"
                    :checked="form.isTersediaBed"
                    @change="toggleIsTersediaBed"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Status Aktif Unit
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
            </div>
          </section>

          <!-- SEKSI 2: LOKASI, INTEGRASI & KETERANGAN -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5 pb-6">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <MapPin class="w-4 h-4" />
              Lokasi Fisik & Integrasi Sistem
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Gedung
                </label>
                <input
                  v-model="form.gedung"
                  type="text"
                  maxlength="80"
                  placeholder="Contoh: Gedung A"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Lantai
                </label>
                <input
                  v-model="form.lantai"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: Lantai 2"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  No. Telepon / Ekstensi
                </label>
                <input
                  v-model="form.noTeleponEkstensi"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: 102"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.noTeleponEkstensi }"
                  @input="errors.noTeleponEkstensi = undefined"
                />
                <span v-if="errors.noTeleponEkstensi" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.noTeleponEkstensi }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Poli BPJS / HFIS
                </label>
                <input
                  v-model="form.kodeBpjsPoli"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: INT, ANA, IGD"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono uppercase"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  IHS Location ID (SATUSEHAT Kemenkes)
                </label>
                <input
                  v-model="form.ihsLocationId"
                  type="text"
                  maxlength="50"
                  placeholder="UUID Location SATUSEHAT"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div class="sm:col-span-3">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Keterangan Tambahan
                </label>
                <textarea
                  v-model="form.keterangan"
                  rows="2"
                  maxlength="500"
                  placeholder="Catatan tambahan mengenai unit layanan..."
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
            form="unit-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
            :disabled="submitLoading || modalLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Unit" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

