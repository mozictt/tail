<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  Building2,
  CheckCircle2,
  FileSignature,
  Phone,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-vue-next";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import { PenjaminService } from "@/services/penjamin.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  JENIS_PENJAMIN_OPTIONS,
  JenisPenjamin,
  type CreatePenjaminPayload,
  type PenjaminItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: PenjaminItem): void;
}>();

const penjaminService = PenjaminService();
const { showToast } = useToast();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);
const manualCardFlagTouched = ref(false);

interface PenjaminFormState {
  kode: string;
  nama: string;
  jenisPenjamin: JenisPenjamin;
  perusahaanInduk: string;
  noTelepon: string;
  email: string;
  alamat: string;
  picNama: string;
  picTelepon: string;
  noPks: string;
  pksBerlakuSampai: string;
  kodeEksternalBpjs: string;
  butuhNoKartu: boolean;
  status: MasterStatus;
}

const createDefaultForm = (): PenjaminFormState => ({
  kode: "",
  nama: "",
  jenisPenjamin: JenisPenjamin.ASURANSI_SWASTA,
  perusahaanInduk: "",
  noTelepon: "",
  email: "",
  alamat: "",
  picNama: "",
  picTelepon: "",
  noPks: "",
  pksBerlakuSampai: "",
  kodeEksternalBpjs: "",
  butuhNoKartu: true,
  status: "Y",
});

const form = ref<PenjaminFormState>(createDefaultForm());
const errors = ref<Partial<Record<keyof PenjaminFormState, string>>>({});

const resetState = () => {
  form.value = createDefaultForm();
  errors.value = {};
  manualCardFlagTouched.value = false;
};

const populateFromItem = (item: PenjaminItem) => {
  form.value = {
    kode: item.kode || "",
    nama: item.nama || "",
    jenisPenjamin: item.jenisPenjamin || JenisPenjamin.ASURANSI_SWASTA,
    perusahaanInduk: item.perusahaanInduk || "",
    noTelepon: item.noTelepon || "",
    email: item.email || "",
    alamat: item.alamat || "",
    picNama: item.picNama || "",
    picTelepon: item.picTelepon || "",
    noPks: item.noPks || "",
    pksBerlakuSampai: item.pksBerlakuSampai
      ? String(item.pksBerlakuSampai).slice(0, 10)
      : "",
    kodeEksternalBpjs: item.kodeEksternalBpjs || "",
    butuhNoKartu: Boolean(item.butuhNoKartu),
    status: item.status === "N" ? "N" : "Y",
  };
  manualCardFlagTouched.value = true;
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();

    if (targetId) {
      modalLoading.value = true;
      try {
        const detail = await penjaminService.getPenjaminById(targetId);
        populateFromItem(detail);
      } catch (err: any) {
        showToast(
          extractApiErrorMessage(err, "Gagal memuat detail penjamin"),
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

watch(
  () => form.value.jenisPenjamin,
  (jenis) => {
    if (isEdit.value || manualCardFlagTouched.value) return;
    form.value.butuhNoKartu =
      jenis !== JenisPenjamin.UMUM && jenis !== JenisPenjamin.KEMENKES;
  },
);

const toggleButuhNoKartu = () => {
  manualCardFlagTouched.value = true;
  form.value.butuhNoKartu = !form.value.butuhNoKartu;
};

const validateForm = (): boolean => {
  const nextErrors: Partial<Record<keyof PenjaminFormState, string>> = {};
  const f = form.value;
  const phoneRegex = /^[0-9+\-\s]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!f.kode.trim()) {
    nextErrors.kode = "Kode penjamin wajib diisi";
  } else if (f.kode.trim().length > 30) {
    nextErrors.kode = "Kode penjamin maksimal 30 karakter";
  }

  if (!f.nama.trim()) {
    nextErrors.nama = "Nama penjamin wajib diisi";
  } else if (f.nama.trim().length > 120) {
    nextErrors.nama = "Nama penjamin maksimal 120 karakter";
  }

  if (!f.jenisPenjamin) {
    nextErrors.jenisPenjamin = "Jenis penjamin wajib dipilih";
  }

  if (f.noTelepon.trim() && !phoneRegex.test(f.noTelepon.trim())) {
    nextErrors.noTelepon =
      "Nomor telepon hanya boleh berisi angka, spasi, tanda + atau -";
  }

  if (f.picTelepon.trim() && !phoneRegex.test(f.picTelepon.trim())) {
    nextErrors.picTelepon =
      "Nomor telepon PIC hanya boleh berisi angka, spasi, tanda + atau -";
  }

  if (f.email.trim() && !emailRegex.test(f.email.trim())) {
    nextErrors.email = "Format email tidak valid";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildPayload = (): CreatePenjaminPayload => {
  const f = form.value;
  return {
    kode: f.kode.trim(),
    nama: f.nama.trim(),
    jenisPenjamin: f.jenisPenjamin,
    perusahaanInduk: f.perusahaanInduk.trim() || undefined,
    noTelepon: f.noTelepon.trim() || undefined,
    email: f.email.trim() || undefined,
    alamat: f.alamat.trim() || undefined,
    picNama: f.picNama.trim() || undefined,
    picTelepon: f.picTelepon.trim() || undefined,
    noPks: f.noPks.trim() || undefined,
    pksBerlakuSampai: f.pksBerlakuSampai || undefined,
    kodeEksternalBpjs: f.kodeEksternalBpjs.trim() || undefined,
    butuhNoKartu: f.butuhNoKartu,
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
        ? await penjaminService.updatePenjamin(props.editId, payload)
        : await penjaminService.createPenjamin(payload);

    showToast(
      isEdit.value
        ? `Penjamin "${saved.nama}" berhasil diperbarui`
        : `Penjamin baru "${saved.nama}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: any) {
    const msg = extractApiErrorMessage(err, "Gagal menyimpan data penjamin");
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
              <ShieldCheck class="w-5 h-5" />
            </div>
            <span>{{ isEdit ? "Edit Master Penjamin" : "Tambah Master Penjamin Baru" }}</span>
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
          id="penjamin-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <!-- SEKSI 1: IDENTITAS PENJAMIN -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Building2 class="w-4 h-4" />
              Identitas & Ketentuan Penjamin
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Penjamin <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.kode"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: BPJS, PRUDENTIAL, MANDIRI"
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
                  Jenis Penjamin <span class="text-error">*</span>
                </label>
                <select
                  v-model="form.jenisPenjamin"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.jenisPenjamin }"
                  @change="errors.jenisPenjamin = undefined"
                >
                  <option
                    v-for="opt in JENIS_PENJAMIN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <span v-if="errors.jenisPenjamin" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.jenisPenjamin }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama Resmi Penjamin / Asuransi / Perusahaan <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.nama"
                  type="text"
                  maxlength="120"
                  placeholder="Contoh: BPJS Kesehatan / PT Prudential Life Assurance"
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
                  Perusahaan Induk / Grup
                </label>
                <input
                  v-model="form.perusahaanInduk"
                  type="text"
                  maxlength="150"
                  placeholder="Contoh: PT Asuransi Jiwa Bersama"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Eksternal (BPJS / SATUSEHAT)
                </label>
                <input
                  v-model="form.kodeEksternalBpjs"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: 0001"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div class="p-3 rounded-xl bg-base-100 border border-base-content/10 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-base-content">Wajib Nomor Kartu / Polis</p>
                    <p class="text-[11px] text-base-content/55 leading-snug">
                      Nonaktifkan untuk penjamin Umum / Pribadi
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-primary toggle-sm shrink-0"
                    :checked="form.butuhNoKartu"
                    @change="toggleButuhNoKartu"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                    Status Aktif
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

          <!-- SEKSI 2: KONTAK & PIC -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Phone class="w-4 h-4" />
              Kontak Kantor & PIC Kerja Sama
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  No. Telepon Layanan / Kantor
                </label>
                <input
                  v-model="form.noTelepon"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: 021500400"
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
                  Email Klaim / Koordinasi
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  maxlength="150"
                  placeholder="klaim@asuransi.co.id"
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
                  Nama PIC (Contact Person)
                </label>
                <input
                  v-model="form.picNama"
                  type="text"
                  maxlength="120"
                  placeholder="Contoh: Rina Kusuma"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  No. Telepon PIC
                </label>
                <input
                  v-model="form.picTelepon"
                  type="text"
                  maxlength="20"
                  placeholder="Contoh: 081234567891"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.picTelepon }"
                  @input="errors.picTelepon = undefined"
                />
                <span v-if="errors.picTelepon" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.picTelepon }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Alamat Kantor Penjamin
                </label>
                <textarea
                  v-model="form.alamat"
                  rows="2"
                  maxlength="500"
                  placeholder="Jl. Letjen MT Haryono Kav. 4-5, Jakarta"
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>
            </div>
          </section>

          <!-- SEKSI 3: PERJANJIAN KERJA SAMA (PKS) -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5 pb-6">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <FileSignature class="w-4 h-4" />
              Perjanjian Kerja Sama (PKS)
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nomor PKS
                </label>
                <input
                  v-model="form.noPks"
                  type="text"
                  maxlength="80"
                  placeholder="Contoh: PKS/RS-01/2026"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  PKS Berlaku Sampai
                </label>
                <FlatpickrDate
                  v-model="form.pksBerlakuSampai"
                  placeholder="Pilih tanggal akhir PKS..."
                />
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
            form="penjamin-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
            :disabled="submitLoading || modalLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Penjamin" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

