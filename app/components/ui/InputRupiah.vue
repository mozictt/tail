<script setup lang="ts">
import { ref, watch } from 'vue';
import { useCurrency } from '@/composables/useCurrency';

const props = withDefaults(
  defineProps<{
    modelValue?: number | null;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    min?: number;
    prefix?: string;
    inputClass?: string;
  }>(),
  {
    modelValue: 0,
    placeholder: '0',
    required: false,
    disabled: false,
    min: 0,
    prefix: 'Rp ',
    inputClass: 'input input-bordered input-sm rounded-xl w-full',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const { formatInputRupiah, parseRupiah } = useCurrency();

const displayValue = ref('');

// Sync displayValue when prop modelValue changes externally
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal === null || newVal === undefined || newVal === 0) {
      displayValue.value = '';
    } else {
      displayValue.value = formatInputRupiah(newVal);
    }
  },
  { immediate: true }
);

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const rawText = target.value;
  const numValue = parseRupiah(rawText);

  // Update formatted text on display
  displayValue.value = numValue > 0 ? formatInputRupiah(numValue) : '';
  target.value = displayValue.value;

  // Emit actual numeric value (number) to v-model
  emit('update:modelValue', numValue);
};
</script>

<template>
  <div class="relative w-full">
    <span
      v-if="prefix"
      class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-base-content/50 pointer-events-none z-10"
    >
      {{ prefix }}
    </span>
    <input
      type="text"
      inputmode="numeric"
      :value="displayValue"
      @input="onInput"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="[inputClass, prefix ? 'pl-9' : '', 'text-right font-semibold']"
    />
  </div>
</template>
