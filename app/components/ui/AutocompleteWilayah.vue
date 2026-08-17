<template>
  <div class="relative w-full" ref="containerRef">
    <label v-if="label" class="block text-xs font-semibold text-base-content/80 mb-1">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <!-- Input Field -->
      <div class="relative flex items-center">
        <span class="absolute left-3.5 text-base-content/40">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        
        <input
          type="text"
          v-model="searchQuery"
          @input="handleInput"
          @focus="handleFocus"
          :placeholder="placeholder"
          class="input input-bordered w-full pl-10 pr-10 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition bg-base-100 text-base-content"
          :class="{ 'border-error ring-error/20': error }"
          :disabled="disabled"
        />

        <!-- Loading / Clear Indicator -->
        <span class="absolute right-3.5 flex items-center gap-1.5">
          <span v-if="loading" class="loading loading-spinner loading-xs text-primary"></span>
          <button
            v-else-if="modelValue && clearable && !disabled"
            type="button"
            @click="clearSelection"
            class="text-base-content/30 hover:text-error transition p-0.5 rounded-full hover:bg-base-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 text-base-content/30 transition-transform duration-200"
            :class="{ 'rotate-180': isOpen }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      <!-- Dropdown Results -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform scale-95 opacity-0 -translate-y-2"
        enter-to-class="transform scale-100 opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform scale-100 opacity-100 translate-y-0"
        leave-to-class="transform scale-95 opacity-0 -translate-y-2"
      >
        <div
          v-if="isOpen && (results.length > 0 || searchQuery.trim().length >= 2)"
          class="absolute z-[9999] w-full bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl mt-1.5 overflow-hidden max-h-60 flex flex-col"
        >
          <!-- Options List -->
          <ul class="overflow-y-auto p-1 scrollbar-thin max-h-56 divide-y divide-base-content/5">
            <!-- Results Found -->
            <li
              v-for="item in results"
              :key="item.id"
              @click="selectItem(item)"
              class="px-4 py-3 cursor-pointer hover:bg-primary/5 transition flex flex-col gap-0.5 text-left group"
              :class="{ 'bg-primary/10 text-primary font-bold': modelValue === item.id }"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-base-content group-hover:text-primary transition-colors">
                  {{ item.kelurahan }}
                </span>
                <span v-if="item.kodePos" class="text-[10px] bg-base-200 px-2 py-0.5 rounded font-mono text-base-content/60">
                  {{ item.kodePos }}
                </span>
              </div>
              <span class="text-[11px] text-base-content/60 leading-normal line-clamp-1">
                Kec. {{ item.kecamatan }}, {{ item.kabupaten }}, {{ item.provinsi }}
              </span>
            </li>

            <!-- Loading State inside Dropdown (for slow networks) -->
            <li v-if="loading && results.length === 0" class="px-4 py-8 text-center text-sm text-base-content/50 flex flex-col items-center gap-2">
              <span class="loading loading-spinner loading-md text-primary"></span>
              <span>Mencari data wilayah...</span>
            </li>

            <!-- Empty State -->
            <li v-else-if="results.length === 0 && searchQuery.trim().length >= 2 && !loading" class="px-4 py-8 text-center text-sm text-base-content/50">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mx-auto mb-2 text-base-content/20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25gC4.5 6.621 7.858 3.5 12 3.5c4.142 0 7.5 3.121 7.5 7.0c0 .172 0 .343-.005.514z" />
              </svg>
              Wilayah "{{ searchQuery }}" tidak ditemukan
            </li>

            <!-- Prompt to type more characters -->
            <li v-else-if="searchQuery.trim().length < 2 && results.length === 0" class="px-4 py-6 text-center text-xs text-base-content/40">
              Ketik minimal 2 karakter untuk mulai mencari
            </li>
          </ul>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { WilayahService, type WilayahSearchResult } from "@/services/wilayah.service";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  initialLabel: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "Ketik Kelurahan/Kecamatan/Kota...",
  },
  required: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "select", "clear"]);

const wilayahService = WilayahService();

const searchQuery = ref("");
const isOpen = ref(false);
const loading = ref(false);
const results = ref<WilayahSearchResult[]>([]);
const containerRef = ref<HTMLElement | null>(null);

let debounceTimeout: NodeJS.Timeout | null = null;

// Sinkronisasi value awal / label awal
watch(
  () => props.initialLabel,
  (newVal) => {
    if (newVal) {
      searchQuery.value = newVal;
    }
  },
  { immediate: true }
);

// Pemicu query search saat user mengetik
const handleInput = () => {
  isOpen.value = true;
  
  if (debounceTimeout) clearTimeout(debounceTimeout);

  const query = searchQuery.value.trim();
  if (query.length < 2) {
    results.value = [];
    return;
  }

  loading.value = true;
  debounceTimeout = setTimeout(async () => {
    try {
      const data = await wilayahService.searchWilayah(query);
      results.value = data;
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }, 400); // Debounce 400ms
};

const handleFocus = () => {
  if (!props.disabled) {
    isOpen.value = true;
    if (searchQuery.value.trim().length >= 2 && results.value.length === 0) {
      handleInput();
    }
  }
};

const selectItem = (item: WilayahSearchResult) => {
  searchQuery.value = item.label;
  emit("update:modelValue", item.id);
  emit("select", item);
  isOpen.value = false;
};

const clearSelection = () => {
  searchQuery.value = "";
  results.value = [];
  emit("update:modelValue", "");
  emit("clear");
  isOpen.value = false;
};

const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
    // Kembalikan ke initial label jika input digantung / dikosongkan tanpa select
    if (!props.modelValue) {
      searchQuery.value = "";
    } else if (props.initialLabel && searchQuery.value !== props.initialLabel) {
      searchQuery.value = props.initialLabel;
    }
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  if (debounceTimeout) clearTimeout(debounceTimeout);
});
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 5px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.4);
  border-radius: 10px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.6);
}
</style>
