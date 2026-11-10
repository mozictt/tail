<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  CheckCircle2,
  Coins,
  Layers,
  X,
  XCircle,
} from "lucide-vue-next";
import InputRupiah from "@/components/ui/InputRupiah.vue";
import { KelasService } from "@/services/kelas.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import type { CreateKelasPayload, KelasItem } from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: KelasItem): void;
}>();

const kelasService = KelasService();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);

interface KelasFormState {
  kode: string;
  nama: string;
  urutan: number;
  kodeBpjsAplicare: string;
  tarifAkomodasi: number | undefined;
  keterangan: string;
  status: MasterStatus;
}

const createDefaultForm = (): KelasFormState => ({
  kode: "",
  nama: "",
  urutan: 0,
  kodeBpjsAplicare: "",
  tarifAkomodasi: undefined,
  keterangan: "",
  status: "Y",
});

const form = ref<KelasFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof KelasFormState, string>>>({});

const resetState = () => {
  form.value = createDefaultForm();
  errors.value = {};
};

const populateFromItem = (item: KelasItem) => {
  const parsedTarif =
    item.tarifAkomodasi !== null &&
    item.tarifAkomodasi !== undefined &&
    item.tarifAkomodasi !== ""
      ? Number(item.tarifAkomodasi)
      : undefined;

  form.value = {
    kode: item.kode || "",
    nama: item.nama || "",
    urutan: Number(item.urutan ?? 0),
    kodeBpjsAplicare: item.kodeBpjsAplicare || "",
    tarifAkomodasi: Number.isFinite(parsedTarif) ? parsedTarif : undefined,
    keterangan: item.keterangan || "",
    status: item.status === "N" ? "N" : "Y",
  };
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();
    if (!targetId) return;

    modalLoading.value = true;
    try {
      const detail = await kelasService.getKelasById(targetId);
      populateFromItem(detail);
    } catch (err: unknown) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat detail kelas"),
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
  const nextErrors: Partial<Record<keyof KelasFormState, string>> = {};
  const f = form.value;

  if (!f.kode.trim()) {
    nextErrors.kode = "Kode kelas wajib diisi";
  } else if (f.kode.trim().length > 30) {
    nextErrors.kode = "Kode kelas maksimal 30 karakter";
  }

  if (!f.nama.trim()) {
    nextErrors.nama = "Nama kelas wajib diisi";
  } else if (f.nama.trim().length > 100) {
    nextErrors.nama = "Nama kelas maksimal 100 karakter";
  }

  if (!Number.isInteger(Number(f.urutan)) || Number(f.urutan) < 0) {
    nextErrors.urutan = "Urutan harus bilangan bulat minimal 0";
  }

  if (f.tarifAkomodasi !== undefined && f.tarifAkomodasi < 0) {
    nextErrors.tarifAkomodasi = "Tarif akomodasi tidak boleh negatif";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildPayload = (): CreateKelasPayload => {
  const f = form.value;
  return {
    kode: f.kode.trim(),
    nama: f.nama.trim(),
    urutan: Math.max(0, Math.floor(Number(f.urutan || 0))),
    kodeBpjsAplicare: f.kodeBpjsAplicare.trim() || undefined,
    tarifAkomodasi:
      f.tarifAkomodasi !== undefined ? Number(f.tarifAkomodasi) : undefined,
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
        ? await kelasService.updateKelas(props.editId, payload)
        : await kelasService.createKelas(payload);

    showToast(
      isEdit.value
        ? `Kelas "${saved.nama}" berhasil diperbarui`
        : `Kelas baru "${saved.nama}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: unknown) {
    const msg = extractApiErrorMessage(err, "Gagal menyimpan data kelas");
    const lower = msg.toLowerCase();
    if (lower.includes("kode")) errors.value.kode = msg;
    if (lower.includes("nama")) errors.value.nama = msg;
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
              <Layers class="w-5 h-5" />
            </div>
            <span>{{ isEdit ? "Edit Master Kelas" : "Tambah Master Kelas Baru" }}</span>
          </h3>
        </div>

        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="h-12 bg-base-200 rounded-2xl"></div>
            <div class="h-12 bg-base-200 rounded-2xl"></div>
          </div>
          <div class="h-24 bg-base-200 rounded-2xl"></div>
        </div>

        <form
          v-else
          id="kelas-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Layers class="w-4 h-4" />
              Identitas Kelas Perawatan
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Kelas <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.kode"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: VVP, VIP, KL1, ICU"
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
                  Urutan Tingkatan
                </label>
                <input
                  v-model.number="form.urutan"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.urutan }"
                  @input="errors.urutan = undefined"
                />
                <span v-if="errors.urutan" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.urutan }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama Kelas Perawatan <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.nama"
                  type="text"
                  maxlength="100"
                  placeholder="Contoh: Kelas 1 / VIP / ICU"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-medium"
                  :class="{ 'border-error': errors.nama }"
                  @input="errors.nama = undefined"
                />
                <span v-if="errors.nama" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.nama }}
                </span>
              </div>
            </div>
          </section>

          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Coins class="w-4 h-4" />
              Tarif Akomodasi, Bridging BPJS & Status
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tarif Akomodasi Dasar / Hari
                </label>
                <InputRupiah
                  v-model="form.tarifAkomodasi"
                  placeholder="350.000"
                  input-class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
                <span v-if="errors.tarifAkomodasi" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.tarifAkomodasi }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode BPJS Aplicare
                </label>
                <input
                  v-model="form.kodeBpjsAplicare"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: KL1, VIP, VVP, ICU"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono uppercase"
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
                  placeholder="Contoh: Ruang perawatan 2 tempat tidur per kamar dengan AC & TV"
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Aktif Kelas
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
            form="kelas-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
            :disabled="submitLoading || modalLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Kelas" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

