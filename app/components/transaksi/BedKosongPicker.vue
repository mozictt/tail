<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AlertCircle, BedDouble, CheckCircle2, ShieldAlert } from "lucide-vue-next";
import { BedService } from "@/services/bed.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  StatusKetersediaanBed,
  type BedOptionItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    modelValue?: number | undefined;
    unitId?: number | undefined;
    allowedOccupiedBedId?: number | null;
    required?: boolean;
    error?: string;
  }>(),
  {
    modelValue: undefined,
    unitId: undefined,
    allowedOccupiedBedId: null,
    required: false,
    error: "",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number | undefined): void;
  (e: "selected", bed: BedOptionItem | null): void;
}>();

const bedService = BedService();
const { showToast } = useToast();

const loading = ref(false);
const rawBeds = ref<BedOptionItem[]>([]);

const selectableBeds = computed(() =>
  rawBeds.value.filter(
    (b) =>
      b.statusKetersediaan === StatusKetersediaanBed.KOSONG ||
      (props.allowedOccupiedBedId !== null && b.id === props.allowedOccupiedBedId),
  ),
);

const occupiedCount = computed(() => rawBeds.value.length - selectableBeds.value.length);

const loadBeds = async () => {
  if (!props.unitId) {
    rawBeds.value = [];
    return;
  }

  loading.value = true;
  try {
    const list = await bedService.getBedOptions({ unitId: Number(props.unitId) });
    rawBeds.value = list;

    if (props.modelValue) {
      const stillValid = selectableBeds.value.find((b) => b.id === props.modelValue);
      if (!stillValid) {
        emit("update:modelValue", undefined);
        emit("selected", null);
      } else {
        emit("selected", stillValid);
      }
    }
  } catch (err: unknown) {
    rawBeds.value = [];
    showToast(extractApiErrorMessage(err, "Gagal memuat daftar tempat tidur unit"), "error");
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.unitId, props.allowedOccupiedBedId] as const,
  () => {
    loadBeds();
  },
  { immediate: true },
);

const toggleSelect = (bed: BedOptionItem) => {
  if (props.modelValue === bed.id) {
    if (!props.required) {
      emit("update:modelValue", undefined);
      emit("selected", null);
    }
    return;
  }
  emit("update:modelValue", bed.id);
  emit("selected", bed);
};
</script>

<template>
  <div class="space-y-2">
    <div v-if="!unitId" class="p-3 rounded-xl bg-base-200/40 border border-dashed border-base-content/15 text-xs text-base-content/60">
      Pilih unit tujuan terlebih dahulu untuk melihat tempat tidur (bed) yang tersedia.
    </div>

    <div v-else-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      <div v-for="i in 3" :key="i" class="h-18 rounded-xl bg-base-200 animate-pulse"></div>
    </div>

    <div
      v-else-if="selectableBeds.length === 0"
      class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2"
    >
      <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        Tidak ada bed berstatus <strong>KOSONG</strong> pada unit ini
        <template v-if="occupiedCount > 0"> ({{ occupiedCount }} bed sedang terisi/non-kosong)</template>.
      </span>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <button
          v-for="bed in selectableBeds"
          :key="bed.id"
          type="button"
          class="text-left p-3 rounded-xl border transition space-y-1"
          :class="
            modelValue === bed.id
              ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
              : 'bg-base-100 border-base-content/10 hover:border-primary/40 hover:bg-base-200/30'
          "
          @click="toggleSelect(bed)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs font-extrabold text-primary inline-flex items-center gap-1">
              <BedDouble class="w-3.5 h-3.5" />
              {{ bed.kode }}
            </span>
            <span
              v-if="allowedOccupiedBedId === bed.id && bed.statusKetersediaan !== StatusKetersediaanBed.KOSONG"
              class="badge badge-xs badge-info font-bold"
            >
              Bed Saat Ini
            </span>
            <CheckCircle2 v-else-if="modelValue === bed.id" class="w-4 h-4 text-primary shrink-0" />
          </div>

          <div class="font-bold text-xs text-base-content truncate">{{ bed.nama }}</div>
          <div class="text-[11px] text-base-content/65 flex items-center gap-1.5 flex-wrap">
            <span v-if="bed.namaKamar">{{ bed.namaKamar }}</span>
            <span v-if="bed.kelas" class="badge badge-xs badge-ghost font-semibold">
              {{ bed.kelas.nama }}
            </span>
            <span
              v-if="bed.isIsolasi"
              class="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600"
            >
              <ShieldAlert class="w-3 h-3" /> Isolasi
            </span>
          </div>
        </button>
      </div>
      <p v-if="occupiedCount > 0" class="text-[11px] text-base-content/55">
        Menampilkan {{ selectableBeds.length }} bed tersedia ({{ occupiedCount }} bed terisi/perbaikan disembunyikan).
      </p>
    </template>

    <span v-if="error" class="text-xs text-error font-semibold block">
      {{ error }}
    </span>
  </div>
</template>

