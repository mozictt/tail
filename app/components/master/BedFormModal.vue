<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  BedDouble,
  CheckCircle2,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import { BedService } from "@/services/bed.service";
import { UnitService } from "@/services/unit.service";
import { KelasService } from "@/services/kelas.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  STATUS_KETERSEDIAAN_BED_OPTIONS,
  StatusKetersediaanBed,
  type BedItem,
  type CreateBedPayload,
  type KelasOptionItem,
  type UnitOptionItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: BedItem): void;
}>();

const bedService = BedService();
const unitService = UnitService();
const kelasService = KelasService();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);
const loadingOptions = ref(false);

const unitOptions = ref<UnitOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);

interface BedFormState {
  kode: string;
  nama: string;
  unitId: number | undefined;
  kelasId: number | undefined;
  namaKamar: string;
  statusKetersediaan: StatusKetersediaanBed;
  isIsolasi: boolean;
  ihsLocationId: string;
  keterangan: string;
  status: MasterStatus;
}

const createDefaultForm = (): BedFormState => ({
  kode: "",
  nama: "",
  unitId: undefined,
  kelasId: undefined,
  namaKamar: "",
  statusKetersediaan: StatusKetersediaanBed.KOSONG,
  isIsolasi: false,
  ihsLocationId: "",
  keterangan: "",
  status: "Y",
});

const form = ref<BedFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof BedFormState, string>>>({});

const unitSelectOptions = computed(() =>
  unitOptions.value.map((u) => ({
    id: u.id,
    displayLabel: `${u.kode} — ${u.nama}`,
    raw: u,
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
      unitService.getUnitOptions({ isTersediaBed: true }),
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
};

const populateFromItem = (item: BedItem) => {
  form.value = {
    kode: item.kode || "",
    nama: item.nama || "",
    unitId: item.unitId,
    kelasId: item.kelasId,
    namaKamar: item.namaKamar || "",
    statusKetersediaan:
      item.statusKetersediaan || StatusKetersediaanBed.KOSONG,
    isIsolasi: Boolean(item.isIsolasi),
    ihsLocationId: item.ihsLocationId || "",
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
      const detail = await bedService.getBedById(targetId);
      populateFromItem(detail);
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, "Gagal memuat detail bed"), "error");
      emit("close");
    } finally {
      modalLoading.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => form.value.unitId,
  (selectedUnitId) => {
    if (!selectedUnitId || isEdit.value) return;
    const match = unitOptions.value.find((u) => u.id === Number(selectedUnitId));
    if (match?.kelasDefaultId && !form.value.kelasId) {
      form.value.kelasId = match.kelasDefaultId;
      errors.value.kelasId = undefined;
    }
  },
);

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof BedFormState, string>> = {};
  const f = form.value;

  if (!f.kode.trim()) {
    nextErrors.kode = "Kode bed wajib diisi";
  } else if (f.kode.trim().length > 30) {
    nextErrors.kode = "Kode bed maksimal 30 karakter";
  }

  if (!f.nama.trim()) {
    nextErrors.nama = "Nama bed wajib diisi";
  } else if (f.nama.trim().length > 100) {
    nextErrors.nama = "Nama bed maksimal 100 karakter";
  }

  if (!f.unitId) {
    nextErrors.unitId = "Unit pelayanan wajib dipilih";
  }

  if (!f.kelasId) {
    nextErrors.kelasId = "Kelas perawatan wajib dipilih";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildPayload = (): CreateBedPayload => {
  const f = form.value;
  return {
    kode: f.kode.trim(),
    nama: f.nama.trim(),
    unitId: Number(f.unitId),
    kelasId: Number(f.kelasId),
    namaKamar: f.namaKamar.trim() || undefined,
    statusKetersediaan: f.statusKetersediaan,
    isIsolasi: f.isIsolasi,
    ihsLocationId: f.ihsLocationId.trim() || undefined,
    keterangan: f.keterangan.trim() || undefined,
    status: f.status,
  };
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const payload = buildPayload();
    const saved =
      isEdit.value && props.editId
        ? await bedService.updateBed(props.editId, payload)
        : await bedService.createBed(payload);

    showToast(
      isEdit.value
        ? `Bed "${saved.nama}" berhasil diperbarui`
        : `Bed baru "${saved.nama}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: unknown) {
    const msg = extractApiErrorMessage(err, "Gagal menyimpan data bed");
    const lower = msg.toLowerCase();
    if (lower.includes("kode")) errors.value.kode = msg;
    if (lower.includes("unit")) errors.value.unitId = msg;
    if (lower.includes("kelas")) errors.value.kelasId = msg;
    if (lower.includes("terdaftar pada")) errors.value.nama = msg;
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
      <div class="modal-box max-w-2xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
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
              <BedDouble class="w-5 h-5" />
            </div>
            <span>{{ isEdit ? "Edit Master Tempat Tidur (Bed)" : "Tambah Tempat Tidur (Bed) Baru" }}</span>
          </h3>
        </div>

        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <form
          v-else
          id="bed-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <BedDouble class="w-4 h-4" />
                Identitas & Lokasi Tempat Tidur
              </h4>
              <span v-if="loadingOptions" class="loading loading-spinner loading-xs text-primary"></span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Bed <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.kode"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: MLT-101-01"
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
                  Nama / Nomor Bed <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.nama"
                  type="text"
                  maxlength="100"
                  placeholder="Contoh: Bed 01"
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
                  Unit Pelayanan (Pendukung Bed) <span class="text-error">*</span>
                </label>
                <Select2
                  v-model="form.unitId"
                  :options="unitSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Pilih unit / bangsal..."
                  :error="Boolean(errors.unitId)"
                  @change="errors.unitId = undefined"
                />
                <span v-if="errors.unitId" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.unitId }}
                </span>
                <p
                  v-else-if="!loadingOptions && unitOptions.length === 0"
                  class="text-[11px] text-warning font-semibold mt-1"
                >
                  Belum ada Unit aktif dengan opsi "Mendukung Bed" aktif.
                </p>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kelas Perawatan <span class="text-error">*</span>
                </label>
                <Select2
                  v-model="form.kelasId"
                  :options="kelasSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Pilih kelas..."
                  :error="Boolean(errors.kelasId)"
                  @change="errors.kelasId = undefined"
                />
                <span v-if="errors.kelasId" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.kelasId }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama / Nomor Kamar
                </label>
                <input
                  v-model="form.namaKamar"
                  type="text"
                  maxlength="80"
                  placeholder="Contoh: Kamar 101"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Ketersediaan Awal
                </label>
                <select
                  v-model="form.statusKetersediaan"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option
                    v-for="opt in STATUS_KETERSEDIAAN_BED_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label class="p-3 rounded-xl bg-base-100 border border-base-content/10 flex items-center justify-between gap-3 cursor-pointer">
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-base-content flex items-center gap-1.5">
                      <ShieldAlert class="w-3.5 h-3.5 text-warning" />
                      Tempat Tidur Isolasi
                    </p>
                    <p class="text-[11px] text-base-content/55 leading-snug">
                      Tandai jika berada di ruang isolasi
                    </p>
                  </div>
                  <input
                    v-model="form.isIsolasi"
                    type="checkbox"
                    class="toggle toggle-warning toggle-sm shrink-0"
                  />
                </label>

                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Status Aktif Master Bed
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

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  IHS Location ID Level Bed (SATUSEHAT)
                </label>
                <input
                  v-model="form.ihsLocationId"
                  type="text"
                  maxlength="50"
                  placeholder="UUID Location level bed SATUSEHAT"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Keterangan Fasilitas
                </label>
                <textarea
                  v-model="form.keterangan"
                  rows="2"
                  maxlength="500"
                  placeholder="Contoh: Dilengkapi monitor pasien dan oksigen sentral"
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
            form="bed-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
            :disabled="submitLoading || modalLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Bed" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

