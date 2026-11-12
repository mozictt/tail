<script setup lang="ts">
import { computed } from "vue";
import { TipeHasilLab } from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    tipeHasil: TipeHasilLab;
    opsiPilihan?: string[] | null;
    hasNumericBounds?: boolean;
    nilaiNormalText?: string | null;
  }>(),
  {
    opsiPilihan: null,
    hasNumericBounds: false,
    nilaiNormalText: null,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const selectOptions = computed(() => {
  const base = (props.opsiPilihan ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  const current = props.modelValue.trim();
  if (current && !base.includes(current)) {
    return [current, ...base];
  }
  return base;
});

const showSelectMode = computed(
  () =>
    props.tipeHasil === TipeHasilLab.OPTION && selectOptions.value.length > 0,
);

const showQuickQualitativeChips = computed(
  () =>
    !showSelectMode.value &&
    (props.tipeHasil === TipeHasilLab.TEXT || !props.hasNumericBounds),
);

const quickChips = computed(() => {
  const chips = ["Negatif", "Positif", "Normal"];
  const expected = props.nilaiNormalText?.trim();
  if (
    expected &&
    expected !== "-" &&
    !expected.includes(" - ") &&
    !chips.some((c) => c.toLowerCase() === expected.toLowerCase()) &&
    expected.length <= 20 &&
    !/^\d+(\.\d+)?$/.test(expected)
  ) {
    chips.push(expected);
  }
  return chips;
});

const isStrictNumericInput = computed(
  () => props.tipeHasil === TipeHasilLab.NUMERIC && props.hasNumericBounds,
);

const onValueChange = (raw: string) => {
  emit("update:modelValue", raw);
};

const applyChip = (chip: string) => {
  emit("update:modelValue", props.modelValue.trim() === chip ? "" : chip);
};
</script>

<template>
  <div class="space-y-1.5">
    <select
      v-if="showSelectMode"
      :value="modelValue"
      class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
      @change="onValueChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="">-- Pilih Hasil --</option>
      <option v-for="opt in selectOptions" :key="opt" :value="opt">
        {{ opt }}
      </option>
    </select>

    <input
      v-else
      :value="modelValue"
      type="text"
      :inputmode="isStrictNumericInput ? 'decimal' : 'text'"
      :placeholder="
        isStrictNumericInput
          ? 'Nilai angka...'
          : 'Angka / Positif / Negatif...'
      "
      class="input input-bordered input-sm w-full rounded-xl text-xs font-semibold"
      @input="onValueChange(($event.target as HTMLInputElement).value)"
    />

    <div v-if="showQuickQualitativeChips" class="flex flex-wrap gap-1">
      <button
        v-for="chip in quickChips"
        :key="chip"
        type="button"
        class="px-2 py-0.5 rounded-md border text-[10px] font-bold transition"
        :class="
          modelValue.trim().toLowerCase() === chip.toLowerCase()
            ? 'bg-primary text-primary-content border-primary'
            : 'bg-base-200/70 text-base-content/75 border-base-content/15 hover:bg-base-200'
        "
        @click="applyChip(chip)"
      >
        {{ chip }}
      </button>
    </div>
  </div>
</template>

