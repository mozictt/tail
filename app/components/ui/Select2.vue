<template>
  <div class="relative" ref="dropdownRef">
    <!-- Trigger Button -->
    <div
      class="w-full flex items-center justify-between input input-bordered rounded-xl bg-base-100 text-base-content cursor-pointer transition duration-200"
      :class="[
        isOpen ? 'ring-2 ring-primary/20 border-primary' : '',
        error ? 'border-error ring-error/20' : ''
      ]"
      @click="toggleDropdown"
    >
      <span class="truncate block pr-4" :class="!displayText ? 'text-base-content/50' : 'text-base-content font-medium'">
        {{ displayText || placeholder }}
      </span>
      <div class="flex items-center gap-2">
        <button v-if="modelValue && clearable" @click.stop="clearSelection" class="text-base-content/40 hover:text-error transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-base-content/50 transition-transform duration-200"
          :class="isOpen ? 'rotate-180 text-primary' : ''"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute z-[9999] w-full bg-base-100 border border-base-content/10 rounded-xl shadow-2xl overflow-hidden"
        :class="openUpward ? 'bottom-full mb-2' : 'top-full mt-2'"
      >
        <!-- Search Input -->
        <div class="p-2 border-b border-base-content/5 bg-base-200/50">
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              class="w-full bg-base-100 text-sm rounded-lg pl-9 pr-3 py-2 outline-none border border-base-content/10 focus:border-primary focus:ring-1 focus:ring-primary transition"
              :placeholder="searchPlaceholder"
              @click.stop
              @keyup.enter="handleEnterKey"
            />
          </div>
        </div>

        <!-- Options List -->
        <ul class="max-h-60 overflow-y-auto p-1 scrollbar-thin">
          <!-- Null / Default Option -->
          <li
            v-if="!searchQuery && showDefaultOption"
            @click="selectItem(undefined)"
            class="px-3 py-2.5 rounded-lg text-sm cursor-pointer transition flex items-center justify-between"
            :class="!modelValue ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-base-200 text-base-content/80'"
          >
            <span>{{ defaultOptionText }}</span>
            <svg v-if="!modelValue" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </li>

          <!-- Custom Creatable Option -->
          <li
            v-if="allowCustom && searchQuery.trim() && !hasExactMatch"
            @click="selectCustomItem(searchQuery.trim())"
            class="px-3 py-2.5 rounded-lg text-sm cursor-pointer transition bg-primary/5 hover:bg-primary/10 text-primary font-semibold flex items-center justify-between border-b border-base-content/5 mb-1"
          >
            <span>+ Gunakan Kustom: "{{ searchQuery.trim() }}"</span>
            <span class="text-[10px] bg-primary/20 px-2 py-0.5 rounded font-bold">Tekan Enter ↵</span>
          </li>

          <!-- Filtered Options -->
          <li
            v-for="item in normalizedFilteredOptions"
            :key="item.value"
            @click="selectItem(item.value)"
            class="px-3 py-2.5 rounded-lg text-sm cursor-pointer transition flex items-center justify-between gap-2"
            :class="modelValue === item.value ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-base-200 text-base-content'"
          >
            <div class="flex-1 min-w-0">
              <slot name="option" :option="item.rawItem">
                <span class="truncate block">{{ item.label }}</span>
              </slot>
            </div>
            <svg v-if="modelValue === item.value" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </li>

          <!-- Empty State -->
          <li v-if="normalizedFilteredOptions.length === 0 && (!allowCustom || !searchQuery.trim())" class="px-3 py-8 text-center text-sm text-base-content/50">
            Pencarian tidak ditemukan
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: undefined
  },
  options: {
    type: Array as () => any[],
    required: true
  },
  labelKey: {
    type: String,
    default: 'name'
  },
  valueKey: {
    type: String,
    default: 'id'
  },
  placeholder: {
    type: String,
    default: 'Pilih salah satu...'
  },
  searchPlaceholder: {
    type: String,
    default: 'Cari...'
  },
  clearable: {
    type: Boolean,
    default: true
  },
  error: {
    type: Boolean,
    default: false
  },
  showDefaultOption: {
    type: Boolean,
    default: false
  },
  defaultOptionText: {
    type: String,
    default: '-- Tidak Ada --'
  },
  allowCustom: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchQuery = ref('');
const dropdownRef = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

// Normalize options whether array of strings or array of objects
const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { label: String(opt), value: opt, rawItem: opt };
    }
    const label = opt[props.labelKey] ?? opt.name ?? opt.label ?? String(opt[props.valueKey]);
    const value = opt[props.valueKey] ?? opt.id ?? opt.value;
    return { label: String(label), value, rawItem: opt };
  });
});

const normalizedFilteredOptions = computed(() => {
  if (!searchQuery.value) return normalizedOptions.value;
  const lowerQuery = searchQuery.value.toLowerCase();
  return normalizedOptions.value.filter(opt =>
    opt.label.toLowerCase().includes(lowerQuery)
  );
});

const hasExactMatch = computed(() => {
  if (!searchQuery.value) return false;
  const q = searchQuery.value.trim().toLowerCase();
  return normalizedOptions.value.some(opt => opt.label.toLowerCase() === q);
});

const displayText = computed(() => {
  if (props.modelValue === undefined || props.modelValue === null || props.modelValue === '') {
    return '';
  }
  const found = normalizedOptions.value.find(opt => opt.value === props.modelValue);
  return found ? found.label : String(props.modelValue);
});

const openUpward = ref(false);

const toggleDropdown = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = '';
    
    // Auto-detect apakah ruang di bawah mencukupi (minimal 260px)
    if (dropdownRef.value) {
      const rect = dropdownRef.value.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      openUpward.value = spaceBelow < 260 && rect.top > 260;
    }

    await nextTick();
    if (searchInput.value) {
      searchInput.value.focus();
    }
  }
};

const selectItem = (val: any) => {
  emit('update:modelValue', val);
  emit('change', val);
  isOpen.value = false;
};

const selectCustomItem = (customVal: string) => {
  emit('update:modelValue', customVal);
  emit('change', customVal);
  isOpen.value = false;
};

const handleEnterKey = () => {
  if (props.allowCustom && searchQuery.value.trim() && !hasExactMatch.value) {
    selectCustomItem(searchQuery.value.trim());
  } else if (normalizedFilteredOptions.value.length > 0) {
    selectItem(normalizedFilteredOptions.value[0].value);
  }
};

const clearSelection = () => {
  emit('update:modelValue', undefined);
  emit('change', undefined);
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}
</style>
