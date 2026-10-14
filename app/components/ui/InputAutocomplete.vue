<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

interface SuggestionOption {
  description?: string;
  label?: string;
  categoryId?: number;
  categoryName?: string;
  type?: string;
  frequency?: number;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    inputClass?: string;
    labelKey?: string;
    minChars?: number;
    debounceMs?: number;
    fetchSuggestions?: (query: string) => Promise<SuggestionOption[]>;
  }>(),
  {
    modelValue: '',
    placeholder: 'Ketik atau pilih dari riwayat...',
    required: false,
    disabled: false,
    inputClass: 'input input-bordered input-sm rounded-xl w-full',
    labelKey: 'description',
    minChars: 0,
    debounceMs: 300,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'select', item: SuggestionOption): void;
  (e: 'clear'): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const isOpen = ref(false);
const loading = ref(false);
const options = ref<SuggestionOption[]>([]);
const highlightedIndex = ref(-1);

let debounceTimer: any = null;

// Mengambil teks label dari item
const getItemLabel = (item: SuggestionOption): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item[props.labelKey] || item.label || item.description || '';
};

// Eksekusi pemanggilan fetch suggestions
const loadSuggestions = async (query: string) => {
  if (!props.fetchSuggestions) return;

  if (query.trim().length < props.minChars) {
    options.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await props.fetchSuggestions(query.trim());
    options.value = Array.isArray(res) ? res : [];
  } catch (err) {
    console.error('[InputAutocomplete] Error fetching suggestions:', err);
    options.value = [];
  } finally {
    loading.value = false;
    highlightedIndex.value = -1;
  }
};

// Handler saat teks input berubah (ketik manual)
const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = target.value;
  emit('update:modelValue', val);

  isOpen.value = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadSuggestions(val);
  }, props.debounceMs);
};

// Handler saat input mendapatkan fokus
const onFocus = () => {
  if (props.disabled) return;
  isOpen.value = true;
  // Jika options masih kosong atau baru pertama kali, ambil saran terbaru/terpopuler
  if (options.value.length === 0) {
    loadSuggestions(props.modelValue || '');
  }
};

// Handler pemilihan item dari dropdown
const selectOption = (item: SuggestionOption) => {
  const label = getItemLabel(item);
  emit('update:modelValue', label);
  emit('select', item);
  isOpen.value = false;
  highlightedIndex.value = -1;
};

// Bersihkan input
const clearInput = () => {
  emit('update:modelValue', '');
  emit('clear');
  options.value = [];
  isOpen.value = false;
  highlightedIndex.value = -1;
  inputRef.value?.focus();
};

// Keyboard navigation
const onKeyDown = (e: KeyboardEvent) => {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      isOpen.value = true;
      onFocus();
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (options.value.length > 0) {
      highlightedIndex.value = (highlightedIndex.value + 1) % options.value.length;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (options.value.length > 0) {
      highlightedIndex.value =
        highlightedIndex.value <= 0 ? options.value.length - 1 : highlightedIndex.value - 1;
    }
  } else if (e.key === 'Enter') {
    if (highlightedIndex.value >= 0 && highlightedIndex.value < options.value.length) {
      e.preventDefault();
      selectOption(options.value[highlightedIndex.value]);
    } else {
      // Jika menekan enter tanpa memilih opsi, biarkan ketikan manual tersimpan dan tutup dropdown
      isOpen.value = false;
    }
  } else if (e.key === 'Escape') {
    isOpen.value = false;
    highlightedIndex.value = -1;
  }
};

// Click outside handler
const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
    highlightedIndex.value = -1;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="relative w-full" ref="containerRef">
    <div class="relative flex items-center">
      <input
        ref="inputRef"
        type="text"
        :value="modelValue"
        @input="onInput"
        @focus="onFocus"
        @keydown="onKeyDown"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :class="[
          inputClass,
          'pr-14 transition-all duration-150',
          isOpen ? 'ring-2 ring-primary/20 border-primary' : '',
        ]"
      />

      <!-- Action Indicators -->
      <div class="absolute right-2.5 flex items-center gap-1">
        <!-- Spinner Loading -->
        <span v-if="loading" class="loading loading-spinner loading-xs text-primary"></span>

        <!-- Clear Button -->
        <button
          v-if="modelValue && !disabled"
          type="button"
          @click.stop="clearInput"
          class="btn btn-ghost btn-circle btn-xs text-base-content/40 hover:text-error hover:bg-base-200 transition"
          title="Hapus teks"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Dropdown Arrow Indicator -->
        <button
          type="button"
          @click.stop="isOpen = !isOpen; if (isOpen) onFocus();"
          class="text-base-content/40 hover:text-base-content transition p-1"
          tabindex="-1"
          title="Tampilkan saran"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5 transition-transform duration-200"
            :class="{ 'rotate-180 text-primary': isOpen }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="transform opacity-0 scale-95 -translate-y-1"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="transform opacity-100 scale-100 translate-y-0"
      leave-to-class="transform opacity-0 scale-95 -translate-y-1"
    >
      <div
        v-if="isOpen && (options.length > 0 || loading || modelValue.trim().length > 0)"
        class="absolute left-0 right-0 top-full mt-1.5 z-[100] bg-base-100 border border-base-content/10 rounded-2xl shadow-xl overflow-hidden max-h-64 flex flex-col backdrop-blur-md"
      >
        <!-- Header Info -->
        <div class="px-3.5 py-1.5 bg-base-200/50 border-b border-base-content/5 flex items-center justify-between text-[11px] font-medium text-base-content/60">
          <span>Pilih riwayat transaksi atau ketik manual</span>
          <span v-if="options.length > 0" class="badge badge-xs badge-ghost font-mono">
            {{ options.length }} saran
          </span>
        </div>

        <!-- Options List -->
        <ul class="overflow-y-auto p-1 divide-y divide-base-content/5 max-h-52 scrollbar-thin">
          <!-- Suggestion Items -->
          <li
            v-for="(item, idx) in options"
            :key="idx"
            @click="selectOption(item)"
            @mouseenter="highlightedIndex = idx"
            class="px-3 py-2 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 text-left group"
            :class="[
              highlightedIndex === idx ? 'bg-primary/10 text-primary' : 'hover:bg-base-200/60 text-base-content',
              getItemLabel(item) === modelValue ? 'font-bold bg-primary/5 text-primary' : ''
            ]"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="text-base-content/40 group-hover:text-primary transition shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-medium truncate">
                  {{ getItemLabel(item) }}
                </div>
                <div v-if="item.categoryName" class="text-[10px] text-base-content/50 truncate flex items-center gap-1 mt-0.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                  <span>{{ item.categoryName }}</span>
                </div>
              </div>
            </div>

            <!-- Frequency Badge -->
            <div v-if="item.frequency" class="shrink-0 text-right">
              <span class="badge badge-xs badge-ghost text-[10px] text-base-content/50 group-hover:badge-primary group-hover:text-white transition">
                {{ item.frequency }}x
              </span>
            </div>
          </li>

          <!-- Empty Suggestions State -->
          <li
            v-if="!loading && options.length === 0 && modelValue.trim().length > 0"
            class="px-3.5 py-4 text-center text-xs text-base-content/60 space-y-1"
          >
            <div class="text-base-content/40 text-[13px]">✨ Judul Baru</div>
            <div>
              Gunakan teks manual:
              <strong class="text-base-content font-semibold">"{{ modelValue }}"</strong>
            </div>
          </li>

          <!-- Loading State Inside Dropdown -->
          <li v-if="loading && options.length === 0" class="px-3.5 py-5 text-center text-xs text-base-content/50 flex flex-col items-center gap-2">
            <span class="loading loading-spinner loading-sm text-primary"></span>
            <span>Mencari riwayat transaksi...</span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 8px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>
