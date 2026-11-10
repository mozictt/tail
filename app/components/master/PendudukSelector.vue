<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { IdCard, Search, UserCheck, X } from "lucide-vue-next";
import { PendudukService } from "@/services/penduduk.service";
import { DokterService } from "@/services/dokter.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { AvailablePendudukOption, PendudukItem } from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    modelValue?: number | null;
    mode?: "all" | "available-for-dokter";
    initialPenduduk?: Partial<PendudukItem> | null;
    disabled?: boolean;
    error?: string;
    label?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: undefined,
    mode: "all",
    initialPenduduk: null,
    disabled: false,
    error: "",
    label: "Tautkan Data Penduduk",
    placeholder: "Cari nama atau NIK (16 digit)...",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number | undefined): void;
  (e: "selected", penduduk: PendudukItem | null): void;
}>();

const pendudukService = PendudukService();
const dokterService = DokterService();
const { formatDate } = useDate();
const { showToast } = useToast();

const searchQuery = ref("");
const results = ref<AvailablePendudukOption[]>([]);
const loading = ref(false);
const isOpen = ref(false);
const selectedSummary = ref<Partial<PendudukItem> | null>(null);
const containerRef = ref<HTMLElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.initialPenduduk,
  (val) => {
    selectedSummary.value = val ?? null;
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  async (newId, oldId) => {
    if (!newId) {
      selectedSummary.value = null;
      return;
    }
    if (newId !== oldId && (!selectedSummary.value || selectedSummary.value.id !== newId)) {
      try {
        const detail = await pendudukService.getPendudukById(newId);
        selectedSummary.value = detail;
        emit("selected", detail);
      } catch {
        // biarkan fallback
      }
    }
  },
);

const fetchOptions = async (query: string) => {
  loading.value = true;
  try {
    if (props.mode === "available-for-dokter") {
      results.value = await dokterService.getAvailablePenduduk(query);
    } else {
      const res = await pendudukService.getPenduduk({
        page: 1,
        limit: 20,
        search: query,
        sortBy: "namaLengkap",
        sortType: "ASC",
      });
      results.value = res.items;
    }
  } catch (err: any) {
    results.value = [];
    showToast(extractApiErrorMessage(err, "Gagal mencari data penduduk"), "error");
  } finally {
    loading.value = false;
  }
};

const handleInput = () => {
  isOpen.value = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchOptions(searchQuery.value.trim());
  }, 350);
};

const handleFocus = () => {
  if (props.disabled) return;
  isOpen.value = true;
  if (results.value.length === 0) {
    fetchOptions(searchQuery.value.trim());
  }
};

const handleLookupNik = async () => {
  const nik = searchQuery.value.trim();
  if (!/^\d{16}$/.test(nik)) {
    showToast("Masukkan tepat 16 digit NIK untuk pencarian cepat", "warning");
    return;
  }

  loading.value = true;
  try {
    const found = await pendudukService.getPendudukByNik(nik);
    selectedSummary.value = found;
    emit("update:modelValue", found.id);
    emit("selected", found);
    isOpen.value = false;
    searchQuery.value = "";
    showToast(`Penduduk "${found.namaLengkap}" ditemukan`, "success");
  } catch (err: any) {
    showToast(extractApiErrorMessage(err, "Penduduk dengan NIK tersebut tidak ditemukan"), "error");
  } finally {
    loading.value = false;
  }
};

const selectItem = async (option: AvailablePendudukOption) => {
  isOpen.value = false;
  searchQuery.value = "";
  selectedSummary.value = option;
  emit("update:modelValue", option.id);

  try {
    const detail = await pendudukService.getPendudukById(option.id);
    selectedSummary.value = detail;
    emit("selected", detail);
  } catch {
    emit("selected", option as PendudukItem);
  }
};

const clearSelection = () => {
  selectedSummary.value = null;
  searchQuery.value = "";
  emit("update:modelValue", undefined);
  emit("selected", null);
};

const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  if (process.client) document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (process.client) document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div ref="containerRef" class="relative w-full space-y-2">
    <label v-if="label" class="block text-xs font-bold text-base-content/80">
      {{ label }}
    </label>

    <!-- Selected Card -->
    <div
      v-if="selectedSummary && modelValue"
      class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/25"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <UserCheck class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <p class="text-xs sm:text-sm font-bold text-base-content truncate">
            {{ selectedSummary.namaLengkap }}
          </p>
          <p class="text-[11px] font-mono text-base-content/60 truncate">
            NIK: {{ selectedSummary.nik || "-" }}
            <span v-if="selectedSummary.jenisKelamin">
              • {{ selectedSummary.jenisKelamin === "L" ? "Laki-laki" : "Perempuan" }}
            </span>
          </p>
        </div>
      </div>

      <button
        v-if="!disabled"
        type="button"
        class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-error shrink-0"
        title="Lepas tautan penduduk"
        @click="clearSelection"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Search Input -->
    <div v-if="!disabled" class="flex items-center gap-2">
      <div class="relative flex-1">
        <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="placeholder"
          class="input input-bordered w-full pl-10 pr-8 rounded-xl h-11 text-sm"
          :class="{ 'border-error': Boolean(error) }"
          @input="handleInput"
          @focus="handleFocus"
        />
        <span v-if="loading" class="loading loading-spinner loading-xs text-primary absolute right-3 top-3.5"></span>
      </div>

      <button
        v-if="/^\d{16}$/.test(searchQuery.trim())"
        type="button"
        class="btn btn-outline btn-primary btn-sm h-11 rounded-xl px-3 text-xs font-bold shrink-0 gap-1"
        :disabled="loading"
        @click="handleLookupNik"
      >
        <IdCard class="w-4 h-4" />
        Cek NIK
      </button>
    </div>

    <span v-if="error" class="text-xs text-error font-semibold block">
      {{ error }}
    </span>

    <!-- Dropdown -->
    <div
      v-if="isOpen && !disabled"
      class="absolute z-[9999] left-0 right-0 bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl mt-1 max-h-60 overflow-y-auto divide-y divide-base-content/5"
    >
      <div v-if="loading && results.length === 0" class="p-4 text-center text-xs text-base-content/50">
        Memuat data penduduk...
      </div>
      <div v-else-if="results.length === 0" class="p-4 text-center text-xs text-base-content/50">
        Penduduk tidak ditemukan.
      </div>
      <button
        v-for="item in results"
        :key="item.id"
        type="button"
        class="w-full text-left px-4 py-2.5 hover:bg-primary/5 transition flex items-center justify-between gap-2"
        @click="selectItem(item)"
      >
        <div class="min-w-0">
          <p class="text-xs sm:text-sm font-bold text-base-content truncate">
            {{ item.namaLengkap }}
          </p>
          <p class="text-[11px] font-mono text-base-content/55">
            NIK: {{ item.nik || "-" }}
            <span v-if="item.tanggalLahir">• Lahir: {{ formatDate(item.tanggalLahir) }}</span>
          </p>
        </div>
        <span class="badge badge-xs badge-ghost font-bold shrink-0">
          {{ item.jenisKelamin }}
        </span>
      </button>
    </div>
  </div>
</template>

