<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import flatpickr from "flatpickr";
import { Indonesian } from "flatpickr/dist/l10n/id.js";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import { Clock, X } from "lucide-vue-next";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    clearable?: boolean;
    size?: "sm" | "md";
  }>(),
  {
    modelValue: "",
    placeholder: "HH:mm",
    disabled: false,
    error: false,
    clearable: false,
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
    "input input-bordered w-full pl-10 rounded-xl bg-base-100 text-base-content font-mono font-medium",
    heightClass,
    rightPad,
    errorClass,
    disabledClass,
  ]
    .filter(Boolean)
    .join(" ");
});

const emitNormalizedTime = (raw: string) => {
  const normalized = raw.trim().slice(0, 5);
  emit("update:modelValue", normalized);
  emit("change", normalized);
};

onMounted(() => {
  if (!inputRef.value) return;

  fpInstance = flatpickr(inputRef.value, {
    locale: Indonesian,
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
    time_24hr: true,
    minuteIncrement: 1,
    allowInput: true,
    disableMobile: true,
    defaultDate:
      props.modelValue && TIME_PATTERN.test(props.modelValue.trim().slice(0, 5))
        ? props.modelValue.trim().slice(0, 5)
        : undefined,
    onChange: (_selectedDates, timeStr) => {
      emitNormalizedTime(timeStr);
    },
    onClose: (_selectedDates, timeStr) => {
      emitNormalizedTime(timeStr);
    },
  });
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (!fpInstance) return;
    const normalized = newVal ? String(newVal).trim().slice(0, 5) : "";
    const currentFormatted = fpInstance.selectedDates[0]
      ? fpInstance.formatDate(fpInstance.selectedDates[0], "H:i")
      : "";

    if (normalized === currentFormatted) return;

    if (normalized && TIME_PATTERN.test(normalized)) {
      fpInstance.setDate(normalized, false);
    } else if (!normalized) {
      fpInstance.clear(false);
    }
  },
);

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) fpInstance?.close();
  },
);

const clearTime = () => {
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
    <Clock class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/45 pointer-events-none z-10" />

    <input
      ref="inputRef"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="computedInputClass"
    />

    <button
      v-if="clearable && modelValue && !disabled"
      type="button"
      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error p-1 z-10"
      aria-label="Hapus waktu"
      @click.stop="clearTime"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

