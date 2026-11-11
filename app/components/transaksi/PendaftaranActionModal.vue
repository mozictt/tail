<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  X,
  XCircle,
} from "lucide-vue-next";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import FlatpickrTime from "@/components/ui/FlatpickrTime.vue";
import { PendaftaranService } from "@/services/pendaftaran.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  CARA_KELUAR_PASIEN_OPTIONS,
  CaraKeluarPasien,
  type PendaftaranItem,
} from "@/types/simrs";

export type PendaftaranActionMode = "selesai" | "batal" | "batal-ranap";

const props = defineProps<{
  show: boolean;
  mode: PendaftaranActionMode;
  pendaftaran: PendaftaranItem | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated", item: PendaftaranItem): void;
}>();

const pendaftaranService = PendaftaranService();
const { formatDateForInput } = useDate();
const { showToast } = useToast();

const saving = ref(false);
const caraKeluar = ref<CaraKeluarPasien>(CaraKeluarPasien.PULANG_SEMBUH);
const useCurrentExitTime = ref(true);
const exitDate = ref("");
const exitTime = ref("");
const alasan = ref("");
const catatan = ref("");
const alasanError = ref("");

const currentTimeHHMM = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const modalTitle = computed(() => {
  if (props.mode === "selesai") return "Selesaikan / Pulangkan Kunjungan";
  if (props.mode === "batal-ranap") return "Batalkan Status Rawat Inap";
  return "Batalkan Kunjungan Pendaftaran";
});

const submitButtonText = computed(() => {
  if (props.mode === "selesai") return "Selesaikan Kunjungan";
  if (props.mode === "batal-ranap") return "Konfirmasi Batal Ranap";
  return "Ya, Batalkan Kunjungan";
});

watch(
  () => [props.show, props.mode, props.pendaftaran] as const,
  ([isOpen]) => {
    if (!isOpen) return;
    caraKeluar.value = CaraKeluarPasien.PULANG_SEMBUH;
    useCurrentExitTime.value = true;
    exitDate.value = formatDateForInput(new Date());
    exitTime.value = currentTimeHHMM();
    alasan.value = "";
    catatan.value = "";
    alasanError.value = "";
  },
  { immediate: true },
);

const resolveCustomExitIso = (): string | undefined => {
  if (useCurrentExitTime.value || !exitDate.value) return undefined;
  const hhmm = /^\d{2}:\d{2}$/.test(exitTime.value) ? exitTime.value : "00:00";
  const local = new Date(`${exitDate.value}T${hhmm}:00`);
  return Number.isNaN(local.getTime()) ? undefined : local.toISOString();
};

const submitSelesai = async (target: PendaftaranItem) => {
  const updated = await pendaftaranService.selesaiPendaftaran(target.id, {
    caraKeluar: caraKeluar.value,
    waktuKeluar: resolveCustomExitIso(),
    catatan: catatan.value.trim() || undefined,
  });
  showToast(`Kunjungan "${target.noRegistrasi}" telah diselesaikan`, "success");
  return updated;
};

const submitBatalRanap = async (target: PendaftaranItem) => {
  const updated = await pendaftaranService.batalRanap(target.id, {
    alasan: alasan.value.trim(),
    catatan: catatan.value.trim() || undefined,
  });
  showToast(`Status rawat inap "${target.noRegistrasi}" dibatalkan`, "success");
  return updated;
};

const submitBatal = async (target: PendaftaranItem) => {
  const updated = await pendaftaranService.batalPendaftaran(target.id, {
    alasan: alasan.value.trim(),
    catatan: catatan.value.trim() || undefined,
  });
  showToast(`Kunjungan "${target.noRegistrasi}" telah dibatalkan`, "success");
  return updated;
};

const handleSubmit = async () => {
  if (!props.pendaftaran || saving.value) return;

  if (props.mode !== "selesai" && !alasan.value.trim()) {
    alasanError.value = "Alasan wajib diisi";
    return;
  }

  saving.value = true;
  try {
    const updated =
      props.mode === "selesai"
        ? await submitSelesai(props.pendaftaran)
        : props.mode === "batal-ranap"
          ? await submitBatalRanap(props.pendaftaran)
          : await submitBatal(props.pendaftaran);
    emit("updated", updated);
    emit("close");
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, "Gagal memproses aksi kunjungan"), "error");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && pendaftaran"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="!saving && emit('close')"
    >
      <div class="modal-box max-w-lg w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 shadow-2xl relative text-base-content">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error"
          :disabled="saving"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg tracking-tight flex items-center gap-2.5 pr-8 mb-4">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            :class="
              mode === 'selesai'
                ? 'bg-emerald-500/10 text-emerald-600'
                : mode === 'batal-ranap'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-rose-500/10 text-rose-600'
            "
          >
            <CheckCircle2 v-if="mode === 'selesai'" class="w-4 h-4" />
            <RotateCcw v-else-if="mode === 'batal-ranap'" class="w-4 h-4" />
            <XCircle v-else class="w-4 h-4" />
          </div>
          <span>{{ modalTitle }}</span>
        </h3>

        <!-- Ringkasan Kunjungan -->
        <div class="p-3.5 rounded-2xl bg-base-200/40 border border-base-content/10 mb-4 text-xs space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-extrabold text-primary">{{ pendaftaran.noRegistrasi }}</span>
            <span class="font-mono text-base-content/60">RM: {{ pendaftaran.pasien?.noRm || "-" }}</span>
          </div>
          <div class="font-bold text-sm text-base-content">
            {{ pendaftaran.pasien?.penduduk?.namaLengkap || "-" }}
          </div>
          <div class="text-base-content/65">
            {{ pendaftaran.unitSaatIni?.nama || "-" }}
            <template v-if="pendaftaran.bedSaatIni">
              • Bed: {{ pendaftaran.bedSaatIni.kode }} ({{ pendaftaran.bedSaatIni.nama }})
            </template>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <template v-if="mode === 'selesai'">
            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Cara Keluar / Discharge
              </label>
              <select
                v-model="caraKeluar"
                class="select select-bordered w-full rounded-xl h-11 text-sm"
              >
                <option
                  v-for="opt in CARA_KELUAR_PASIEN_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  v-model="useCurrentExitTime"
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-primary"
                />
                Gunakan waktu selesai saat ini secara otomatis
              </label>

              <div v-if="!useCurrentExitTime" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-base-content/75 mb-1">Tanggal Keluar</label>
                  <FlatpickrDate v-model="exitDate" size="sm" :clearable="false" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-base-content/75 mb-1">Jam Keluar</label>
                  <FlatpickrTime v-model="exitTime" size="sm" />
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div
              class="p-3 rounded-xl border text-xs flex items-start gap-2"
              :class="
                mode === 'batal-ranap'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
              "
            >
              <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
              <span v-if="mode === 'batal-ranap'">
                Bed rawat inap saat ini otomatis kembali berstatus <strong>KOSONG</strong>. Jika pasien sebelumnya dimutasi dari Rajal/IGD, kunjungan dikembalikan ke unit asal; jika daftar langsung Ranap, kunjungan menjadi <strong>BATAL</strong>.
              </span>
              <span v-else>
                Kunjungan akan ditandai <strong>BATAL</strong> dan bed yang ditempati (jika ada) otomatis kembali berstatus <strong>KOSONG</strong>.
              </span>
            </div>

            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Alasan {{ mode === "batal-ranap" ? "Batal Rawat Inap" : "Pembatalan" }}
                <span class="text-error">*</span>
              </label>
              <textarea
                v-model="alasan"
                rows="2"
                maxlength="500"
                :placeholder="
                  mode === 'batal-ranap'
                    ? 'Contoh: Keluarga menolak rawat inap dan memilih rawat jalan'
                    : 'Contoh: Pasien mengundurkan diri sebelum pemeriksaan'
                "
                class="textarea textarea-bordered w-full rounded-xl text-sm"
                :class="{ 'border-error': alasanError }"
                @input="alasanError = ''"
              ></textarea>
              <span v-if="alasanError" class="text-xs text-error font-semibold mt-1 block">
                {{ alasanError }}
              </span>
            </div>
          </template>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              v-model="catatan"
              rows="2"
              maxlength="1000"
              placeholder="Catatan tambahan petugas..."
              class="textarea textarea-bordered w-full rounded-xl text-sm"
            ></textarea>
          </div>

          <div class="modal-action gap-2 pt-2 border-t border-base-content/10">
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-xl"
              :disabled="saving"
              @click="emit('close')"
            >
              Tutup
            </button>
            <button
              type="submit"
              class="btn btn-sm rounded-xl px-5 font-bold"
              :class="
                mode === 'selesai'
                  ? 'btn-success text-white'
                  : mode === 'batal-ranap'
                    ? 'btn-warning'
                    : 'btn-error text-white'
              "
              :disabled="saving"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <span>{{ saving ? "Memproses..." : submitButtonText }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

