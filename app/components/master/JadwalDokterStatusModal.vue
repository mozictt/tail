<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { CheckCircle2, RefreshCw, X, XCircle } from "lucide-vue-next";
import { JadwalDokterService } from "@/services/jadwal-dokter.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  formatNamaGelarDokter,
  getOptionLabel,
  HARI_PRAKTIK_OPTIONS,
  type JadwalDokterItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  jadwal: JadwalDokterItem | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated", item: JadwalDokterItem): void;
}>();

const jadwalService = JadwalDokterService();
const { showToast } = useToast();

const selectedStatus = ref<MasterStatus>("Y");
const keterangan = ref("");
const saving = ref(false);

const dokterNama = computed(() => {
  const d = props.jadwal?.dokter;
  if (!d) return "-";
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
});

watch(
  () => [props.show, props.jadwal] as const,
  ([isOpen, jadwal]) => {
    if (!isOpen || !jadwal) return;
    selectedStatus.value = jadwal.status === "N" ? "N" : "Y";
    keterangan.value = jadwal.keterangan || "";
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!props.jadwal || saving.value) return;
  saving.value = true;
  try {
    const updated = await jadwalService.updateStatusJadwalDokter(props.jadwal.id, {
      status: selectedStatus.value,
      keterangan: keterangan.value.trim() || undefined,
    });
    showToast(
      `Status jadwal ${getOptionLabel(HARI_PRAKTIK_OPTIONS, props.jadwal.hari)} diubah menjadi ${selectedStatus.value === "Y" ? "Aktif" : "Nonaktif"}`,
      "success",
    );
    emit("updated", updated);
    emit("close");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memperbarui status jadwal dokter"),
      "error",
    );
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && jadwal"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="!saving && emit('close')"
    >
      <div class="modal-box max-w-md w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 shadow-2xl relative text-base-content">
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
          <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <RefreshCw class="w-4 h-4" />
          </div>
          <span>Status & Catatan Jadwal</span>
        </h3>

        <div class="p-3.5 rounded-2xl bg-base-200/40 border border-base-content/10 mb-4 text-xs space-y-1">
          <div class="font-bold text-sm text-base-content">{{ dokterNama }}</div>
          <div class="text-base-content/65">
            {{ jadwal.unit?.nama || "-" }} •
            {{ jadwal.hariLabel || getOptionLabel(HARI_PRAKTIK_OPTIONS, jadwal.hari) }}
            ({{ jadwal.jamMulai }} - {{ jadwal.jamSelesai }})
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-2">
              Status Jadwal Praktik
            </label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                class="flex items-center justify-center gap-2 h-11 rounded-xl border text-xs font-bold transition"
                :class="
                  selectedStatus === 'Y'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-base-100 border-base-content/10 text-base-content/65 hover:bg-base-200/50'
                "
                @click="selectedStatus = 'Y'"
              >
                <CheckCircle2 class="w-4 h-4" />
                Aktif (Y)
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-2 h-11 rounded-xl border text-xs font-bold transition"
                :class="
                  selectedStatus === 'N'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                    : 'bg-base-100 border-base-content/10 text-base-content/65 hover:bg-base-200/50'
                "
                @click="selectedStatus = 'N'"
              >
                <XCircle class="w-4 h-4" />
                Nonaktif (N)
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Catatan / Alasan Perubahan (Opsional)
            </label>
            <textarea
              v-model="keterangan"
              rows="2"
              maxlength="500"
              placeholder="Contoh: Jadwal dinonaktifkan sementara selama dokter dinas luar"
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
              Batal
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-sm rounded-xl px-5 font-bold"
              :disabled="saving"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <span>{{ saving ? "Menyimpan..." : "Simpan Status" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

