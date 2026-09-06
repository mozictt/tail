<script setup lang="ts">
import { ref, computed, watch } from "vue";
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import { Calendar, Clock, Sparkles } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    modelValue?: string | Date | null;
    placeholder?: string;
    withTime?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    placeholder: "Pilih Tanggal & Jam Kadaluarsa...",
    withTime: true,
    disabled: false,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const dateValue = ref<Date | null>(null);

// Synchronize modelValue <-> dateValue
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      dateValue.value = null;
      return;
    }
    const d = typeof newVal === "string" ? new Date(newVal) : newVal;
    dateValue.value = !isNaN(d.getTime()) ? d : null;
  },
  { immediate: true }
);

const handleDateUpdate = (val: Date | number | string | null) => {
  if (!val) {
    emit("update:modelValue", "");
  } else {
    const d = typeof val === "object" && val instanceof Date ? val : new Date(val);
    if (!isNaN(d.getTime())) {
      emit("update:modelValue", d.toISOString());
    } else {
      emit("update:modelValue", "");
    }
  }
};

// Preset Shortcuts VueDatePicker
const presets = computed(() => {
  const now = new Date();
  
  const trial = new Date();
  trial.setDate(now.getDate() + 14);
  trial.setHours(23, 59, 59, 0);

  const month1 = new Date();
  month1.setDate(now.getDate() + 30);
  month1.setHours(23, 59, 59, 0);

  const year1 = new Date();
  year1.setDate(now.getDate() + 365);
  year1.setHours(23, 59, 59, 0);

  return [
    { label: "+14 Hari (Trial)", value: trial },
    { label: "+30 Hari (1 Bulan)", value: month1 },
    { label: "+1 Tahun", value: year1 },
  ];
});

const applyPreset = (presetDate: Date) => {
  dateValue.value = presetDate;
  handleDateUpdate(presetDate);
};
</script>

<template>
  <div class="w-full space-y-2 font-sans">
    <ClientOnly>
      <VueDatePicker
        v-model="dateValue"
        @update:model-value="handleDateUpdate"
        :enable-time-picker="withTime"
        :disabled="disabled"
        :placeholder="placeholder"
        :teleport="true"
        locale="id"
        format="dd MMMM yyyy HH:mm"
        auto-apply
        text-input
        class="dp-custom-styled"
      >
        <template #input-icon>
          <div class="px-2 text-purple-600">
            <Calendar class="w-4 h-4" />
          </div>
        </template>
      </VueDatePicker>

      <!-- Fallback SSR jika belum ClientReady -->
      <template #fallback>
        <div class="input input-sm input-bordered w-full rounded-xl flex items-center gap-2 text-xs text-base-content/40">
          <Calendar class="w-4 h-4 text-purple-600" />
          <span>Memuat Datepicker...</span>
        </div>
      </template>
    </ClientOnly>

    <!-- Quick Preset Buttons Bar -->
    <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
      <button
        v-for="p in presets"
        :key="p.label"
        type="button"
        @click="applyPreset(p.value)"
        class="btn btn-xs bg-base-100 hover:bg-purple-600 hover:text-white border-base-content/20 text-[10px] font-semibold rounded-lg transition-all"
      >
        {{ p.label }}
      </button>
    </div>
  </div>
</template>

<style>
/* Kustomisasi Tema @vuepic/vue-datepicker agar selaras dengan Tailwind & DaisyUI */
.dp__theme_light, .dp__theme_dark {
  --dp-font-family: inherit;
  --dp-border-radius: 0.75rem;
  --dp-cell-border-radius: 0.5rem;
  --dp-primary-color: #7c3aed;
  --dp-primary-text-color: #ffffff;
  --dp-border-color: rgba(156, 163, 175, 0.3);
  --dp-menu-border-color: rgba(156, 163, 175, 0.2);
}

.dp__input {
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  border-radius: 0.75rem !important;
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
}

.dp__menu {
  border-radius: 1rem !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}
</style>
