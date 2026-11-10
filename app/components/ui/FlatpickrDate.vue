<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import flatpickr from "flatpickr";
import { Indonesian } from "flatpickr/dist/l10n/id.js";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import { Calendar, X } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    placeholder?: string;
    minDate?: string | Date;
    maxDate?: string | Date;
    disabled?: boolean;
    error?: boolean;
    clearable?: boolean;
    size?: "sm" | "md";
  }>(),
  {
    modelValue: "",
    placeholder: "Pilih tanggal...",
    minDate: undefined,
    maxDate: undefined,
    disabled: false,
    error: false,
    clearable: true,
    size: "md",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
let fpInstance: FlatpickrInstance | null = null;

const computedInputClass = computed(() => {
  const heightClass = props.size === "sm" ? "input-sm h-10 text-sm" : "h-11 text-sm";
  const rightPad = props.clearable && !props.disabled ? "pr-9" : "pr-3";
  const errorClass = props.error ? "border-error" : "";
  const disabledClass = props.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  return [
    "input input-bordered w-full pl-10 rounded-xl bg-base-100 text-base-content font-medium",
    heightClass,
    rightPad,
    errorClass,
    disabledClass,
  ]
    .filter(Boolean)
    .join(" ");
});

const syncAltInputState = () => {
  if (!fpInstance?.altInput) return;
  fpInstance.altInput.className = computedInputClass.value;
  fpInstance.altInput.disabled = props.disabled;
  fpInstance.altInput.placeholder = props.placeholder;
};

onMounted(() => {
  if (!inputRef.value) return;

  fpInstance = flatpickr(inputRef.value, {
    locale: Indonesian,
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d F Y",
    altInputClass: computedInputClass.value,
    disableMobile: true,
    monthSelectorType: "dropdown",
    defaultDate: props.modelValue || undefined,
    minDate: props.minDate || undefined,
    maxDate: props.maxDate || undefined,
    onChange: (_selectedDates, dateStr) => {
      emit("update:modelValue", dateStr);
      emit("change", dateStr);
    },
  });

  syncAltInputState();
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (!fpInstance) return;
    const normalized = newVal ? String(newVal).slice(0, 10) : "";
    const currentFormatted = fpInstance.selectedDates[0]
      ? fpInstance.formatDate(fpInstance.selectedDates[0], "Y-m-d")
      : "";

    if (normalized === currentFormatted) return;

    if (normalized) {
      fpInstance.setDate(normalized, false);
    } else {
      fpInstance.clear(false);
    }
  },
);

watch(
  () => props.minDate,
  (val) => {
    fpInstance?.set("minDate", val || undefined);
  },
);

watch(
  () => props.maxDate,
  (val) => {
    fpInstance?.set("maxDate", val || undefined);
  },
);

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) {
      fpInstance?.close();
    }
    syncAltInputState();
  },
);

watch([() => props.error, () => props.size, () => props.placeholder], () => {
  syncAltInputState();
});

const clearDate = () => {
  if (props.disabled) return;
  fpInstance?.clear(false);
  emit("update:modelValue", "");
  emit("change", "");
};

onBeforeUnmount(() => {
  fpInstance?.destroy();
  fpInstance = null;
});
</script>

<template>
  <div class="relative w-full">
    <Calendar class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/45 pointer-events-none z-10" />

    <input
      ref="inputRef"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="computedInputClass"
      readonly
    />

    <button
      v-if="modelValue && clearable && !disabled"
      type="button"
      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error p-1 rounded-lg transition z-10"
      title="Hapus tanggal"
      aria-label="Hapus tanggal"
      @click.stop="clearDate"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

