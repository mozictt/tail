<script setup lang="ts">
import { ref, watch } from "vue";
import { RefreshCw, X } from "lucide-vue-next";
import { BedService } from "@/services/bed.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  getStatusKetersediaanBedBadgeClass,
  STATUS_KETERSEDIAAN_BED_OPTIONS,
  StatusKetersediaanBed,
  type BedItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  bed: BedItem | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated", item: BedItem): void;
}>();

const bedService = BedService();
const { showToast } = useToast();

const selectedStatus = ref<StatusKetersediaanBed>(StatusKetersediaanBed.KOSONG);
const keterangan = ref("");
const saving = ref(false);

watch(
  () => [props.show, props.bed] as const,
  ([isOpen, bed]) => {
    if (!isOpen || !bed) return;
    selectedStatus.value =
      bed.statusKetersediaan || StatusKetersediaanBed.KOSONG;
    keterangan.value = bed.keterangan || "";
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!props.bed) return;
  saving.value = true;
  try {
    const updated = await bedService.updateStatusKetersediaan(props.bed.id, {
      statusKetersediaan: selectedStatus.value,
      keterangan: keterangan.value.trim() || undefined,
    });
    showToast(
      `Status ketersediaan bed "${props.bed.nama}" diperbarui`,
      "success",
    );
    emit("updated", updated);
    emit("close");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal mengubah status ketersediaan bed"),
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
      v-if="show && bed"
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
          <span>Status Ketersediaan Bed</span>
        </h3>

        <div class="p-3 rounded-2xl bg-base-200/40 border border-base-content/10 mb-4 text-xs space-y-0.5">
          <div class="font-bold text-sm text-base-content">
            {{ bed.nama }} ({{ bed.kode }})
          </div>
          <div class="text-base-content/60">
            {{ bed.unit?.nama || "-" }}
            <template v-if="bed.namaKamar"> • {{ bed.namaKamar }}</template>
            <template v-if="bed.kelas"> • {{ bed.kelas.nama }}</template>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-2">
              Pilih Status Ketersediaan Baru
            </label>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="opt in STATUS_KETERSEDIAAN_BED_OPTIONS"
                :key="opt.value"
                type="button"
                class="flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition text-left"
                :class="
                  selectedStatus === opt.value
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'border-base-content/10 bg-base-100 hover:bg-base-200/50 text-base-content/75'
                "
                @click="selectedStatus = opt.value"
              >
                <span>{{ opt.label }}</span>
                <span
                  class="text-[10px] px-2 py-0.5 rounded-md border"
                  :class="getStatusKetersediaanBedBadgeClass(opt.value)"
                >
                  {{ opt.value }}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Catatan Perubahan Status (Opsional)
            </label>
            <textarea
              v-model="keterangan"
              rows="2"
              maxlength="500"
              placeholder="Contoh: Proses sterilisasi ruangan setelah pasien pulang"
              class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
            ></textarea>
          </div>

          <div class="modal-action pt-2 border-t border-base-content/10">
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
              class="btn btn-primary btn-sm rounded-xl px-5 font-bold gap-1.5"
              :disabled="saving"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <span>Simpan Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

