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
      <span class="truncate block pr-4" :class="!selectedItem ? 'text-base-content/50' : 'text-base-content font-medium'">
        {{ selectedItem ? selectedItem.name : placeholder }}
      </span>
      <div class="flex items-center gap-2">
        <button v-if="selectedItem && clearable" @click.stop="clearSelection" class="text-base-content/40 hover:text-error transition">
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
        class="absolute z-50 w-full mt-2 bg-base-100 border border-base-content/10 rounded-xl shadow-premium overflow-hidden"
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
              placeholder="Cari..."
              @click.stop
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

          <!-- Filtered Options -->
          <li
            v-for="item in filteredOptions"
            :key="item[valueKey]"
            @click="selectItem(item[valueKey])"
            class="px-3 py-2.5 rounded-lg text-sm cursor-pointer transition flex items-center justify-between"
            :class="modelValue === item[valueKey] ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-base-200 text-base-content'"
          >
            <span>{{ item[labelKey] }}</span>
            <svg v-if="modelValue === item[valueKey]" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </li>

          <!-- Empty State -->
          <li v-if="filteredOptions.length === 0" class="px-3 py-8 text-center text-sm text-base-content/50">
            Pencarian tidak ditemukan
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

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
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchQuery = ref('');
const dropdownRef = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

const selectedItem = computed(() => {
  return props.options.find(opt => opt[props.valueKey] === props.modelValue);
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options;
  const lowerQuery = searchQuery.value.toLowerCase();
  return props.options.filter(opt => {
    const label = String(opt[props.labelKey]).toLowerCase();
    return label.includes(lowerQuery);
  });
});

const toggleDropdown = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = '';
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
