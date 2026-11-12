<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FlaskConical,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  TestTubes,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import LabParameterFormModal from "@/components/master/LabParameterFormModal.vue";
import { ParameterLabService } from "@/services/parameter-lab.service";
import { usePermission } from "@/composables/usePermission";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  TIPE_HASIL_LAB_OPTIONS,
  TipeHasilLab,
  type LabParameterItem,
  type LabTindakanOverviewItem,
  type LabTindakanParameterMappingItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Master Parameter & Panel Laboratorium",
});

const parameterLabService = ParameterLabService();
const { slugPath } = useSlugRoute();
const { showToast } = useToast();
const { canWrite, canDelete } = usePermission();

const ROUTE_PATH = "/master/parameter-lab";
const RESOURCE_NAME = "Parameter Lab";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));
const canDeleteData = computed(() => canDelete(ROUTE_PATH, RESOURCE_NAME));

type ActiveTab = "panel-mapping" | "parameters";
const activeTab = ref<ActiveTab>("panel-mapping");

// ===== TAB 1: MASTER PARAMETER =====
const items = ref<LabParameterItem[]>([]);
const loadingParams = ref(false);
const searchQuery = ref("");
const tipeFilter = ref<TipeHasilLab | "">("");
const statusFilter = ref<MasterStatus | "">("");
const currentPage = ref(1);
const limit = ref(20);
const totalItems = ref(0);
const totalPages = ref(1);

const fetchParameters = async () => {
  loadingParams.value = true;
  try {
    const res = await parameterLabService.getParameters({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim() || undefined,
      tipeHasil: tipeFilter.value || undefined,
      status: statusFilter.value || undefined,
    });
    items.value = res.items;
    totalItems.value = res.meta.totalItems;
    totalPages.value = res.meta.totalPages;
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat daftar parameter lab"),
      "error",
    );
  } finally {
    loadingParams.value = false;
  }
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchParameters();
  }, 350);
});

watch([tipeFilter, statusFilter], () => {
  currentPage.value = 1;
  fetchParameters();
});

// ===== TAB 2: MAPPING PANEL TINDAKAN LAB (MIS: DARAH LENGKAP) =====
const tindakanList = ref<LabTindakanOverviewItem[]>([]);
const tindakanSearch = ref("");
const loadingTindakan = ref(false);
const selectedTindakanId = ref<number | null>(null);
const loadingMapping = ref(false);
const savingMapping = ref(false);
const mappingItems = ref<LabTindakanParameterMappingItem[]>([]);
const allParameterOptions = ref<LabParameterItem[]>([]);
const pickerSearch = ref("");

const selectedTindakan = computed(
  () =>
    tindakanList.value.find((t) => t.id === selectedTindakanId.value) ?? null,
);

const filteredTindakanList = computed(() => {
  const q = tindakanSearch.value.trim().toLowerCase();
  if (!q) return tindakanList.value;
  return tindakanList.value.filter(
    (t) =>
      t.kode.toLowerCase().includes(q) ||
      t.nama.toLowerCase().includes(q) ||
      (t.kelompokTarif || "").toLowerCase().includes(q),
  );
});

const mappedParamIdsSet = computed(
  () => new Set(mappingItems.value.map((m) => m.parameterId)),
);

const availableOptionsToAdd = computed(() => {
  const q = pickerSearch.value.trim().toLowerCase();
  return allParameterOptions.value.filter((p) => {
    if (mappedParamIdsSet.value.has(p.id)) return false;
    if (!q) return true;
    return (
      p.kode.toLowerCase().includes(q) ||
      p.nama.toLowerCase().includes(q) ||
      (p.grup || "").toLowerCase().includes(q)
    );
  });
});

const fetchMappingWorkspace = async () => {
  loadingTindakan.value = true;
  try {
    const [overviewRes, optionsRes] = await Promise.all([
      parameterLabService.getTindakanOverview(),
      parameterLabService.getParameterOptions(),
    ]);
    tindakanList.value = overviewRes;
    allParameterOptions.value = optionsRes;
    if (!selectedTindakanId.value && overviewRes.length > 0) {
      selectedTindakanId.value = overviewRes[0]!.id;
    }
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat daftar tindakan tarif lab"),
      "error",
    );
  } finally {
    loadingTindakan.value = false;
  }
};

const loadSelectedMapping = async (tindakanId: number) => {
  loadingMapping.value = true;
  try {
    const res = await parameterLabService.getMappingByTindakan(tindakanId);
    mappingItems.value = res.items.map((item, idx) => ({
      ...item,
      urutan: item.urutan || idx + 1,
      subGrupLabel: item.subGrupLabel || item.parameter?.grup || "",
    }));
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat mapping parameter panel"),
      "error",
    );
  } finally {
    loadingMapping.value = false;
  }
};

watch(selectedTindakanId, (nextId) => {
  if (nextId) {
    loadSelectedMapping(nextId);
  } else {
    mappingItems.value = [];
  }
});

const addExistingParamToPanel = (param: LabParameterItem) => {
  if (mappedParamIdsSet.value.has(param.id)) return;
  mappingItems.value.push({
    parameterId: param.id,
    urutan: mappingItems.value.length + 1,
    subGrupLabel: param.grup || "",
    isWajib: true,
    parameter: param,
  });
};

const removeMappingRow = (idx: number) => {
  mappingItems.value.splice(idx, 1);
  mappingItems.value.forEach((item, i) => {
    item.urutan = i + 1;
  });
};

const moveMappingRow = (idx: number, delta: -1 | 1) => {
  const target = idx + delta;
  if (target < 0 || target >= mappingItems.value.length) return;
  const copy = [...mappingItems.value];
  const [moved] = copy.splice(idx, 1);
  if (!moved) return;
  copy.splice(target, 0, moved);
  copy.forEach((item, i) => {
    item.urutan = i + 1;
  });
  mappingItems.value = copy;
};

const handleSaveMapping = async () => {
  if (!selectedTindakanId.value) return;
  savingMapping.value = true;
  try {
    await parameterLabService.saveMappingForTindakan(
      selectedTindakanId.value,
      mappingItems.value.map((item, idx) => ({
        parameterId: item.parameterId,
        urutan: idx + 1,
        subGrupLabel: item.subGrupLabel,
        isWajib: item.isWajib,
      })),
    );
    showToast("Susunan parameter pemeriksaan lab berhasil disimpan", "success");
    await Promise.all([
      fetchMappingWorkspace(),
      loadSelectedMapping(selectedTindakanId.value),
    ]);
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menyimpan susunan parameter panel"),
      "error",
    );
  } finally {
    savingMapping.value = false;
  }
};

// ===== MODAL HANDLERS =====
const showParamModal = ref(false);
const editingParamId = ref<number | null>(null);
const quickAddTindakanId = ref<number | null>(null);
const standalonePreset = ref<{
  kode?: string;
  nama?: string;
  grup?: string | null;
  satuan?: string | null;
} | null>(null);

const openCreateParam = () => {
  editingParamId.value = null;
  quickAddTindakanId.value = null;
  standalonePreset.value = null;
  showParamModal.value = true;
};

const openQuickAddToPanel = () => {
  if (!selectedTindakanId.value) return;
  editingParamId.value = null;
  quickAddTindakanId.value = selectedTindakanId.value;
  standalonePreset.value = null;
  showParamModal.value = true;
};

const openStandaloneParamSetup = () => {
  if (!selectedTindakan.value) return;
  editingParamId.value = null;
  quickAddTindakanId.value = selectedTindakan.value.id;
  standalonePreset.value = {
    kode: selectedTindakan.value.kode,
    nama: selectedTindakan.value.nama,
    grup: selectedTindakan.value.kelompokTarif ?? null,
    satuan: selectedTindakan.value.satuan ?? null,
  };
  showParamModal.value = true;
};

const openEditParam = (id: number) => {
  editingParamId.value = id;
  quickAddTindakanId.value = null;
  standalonePreset.value = null;
  showParamModal.value = true;
};

const handleParamModalSaved = async () => {
  await Promise.all([fetchParameters(), fetchMappingWorkspace()]);
  if (selectedTindakanId.value) {
    await loadSelectedMapping(selectedTindakanId.value);
  }
};

const handleDeleteParam = async (param: LabParameterItem) => {
  const confirm = await Swal.fire({
    title: "Hapus Parameter Lab?",
    text: `Parameter "${param.nama}" (${param.kode}) akan dihapus permanen.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e11d48",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    reverseButtons: true,
  });
  if (!confirm.isConfirmed) return;

  try {
    await parameterLabService.deleteParameter(param.id);
    showToast(`Parameter "${param.nama}" berhasil dihapus`, "success");
    await Promise.all([fetchParameters(), fetchMappingWorkspace()]);
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menghapus parameter lab"),
      "error",
    );
  }
};

const formatRujukanRingkas = (param: LabParameterItem): string => {
  const list = param.rujukanList ?? [];
  if (list.length === 0) return "Belum diatur";
  if (list.length === 1) {
    const r = list[0]!;
    if (r.nilaiNormalText) return r.nilaiNormalText;
    if (r.nilaiMin !== null && r.nilaiMax !== null) {
      return `${Number(r.nilaiMin)} - ${Number(r.nilaiMax)} ${param.satuan || ""}`.trim();
    }
  }
  return `${list.length} aturan rujukan`;
};

onMounted(async () => {
  await Promise.all([fetchMappingWorkspace(), fetchParameters()]);
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <!-- HEADER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center justify-center shrink-0">
            <FlaskConical class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
              Master Parameter & Panel Laboratorium
            </h1>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Kelola sub-pemeriksaan (seperti Hemoglobin, Leukosit, Trombosit), nilai normal rujukan, dan susunan paket (seperti Darah Lengkap)
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <NuxtLink
            :to="slugPath('/master/tarif')"
            class="btn btn-sm btn-ghost border border-base-content/15 rounded-xl font-bold"
          >
            Kelola Tarif Lab
          </NuxtLink>
          <button
            v-if="canManageData"
            type="button"
            class="btn btn-primary rounded-xl font-bold shadow-md gap-2"
            @click="openCreateParam"
          >
            <Plus class="w-4 h-4" />
            Tambah Parameter
          </button>
        </div>
      </div>

      <!-- TAB SWITCHER -->
      <div class="mt-4 pt-3 border-t border-base-content/10 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="activeTab === 'panel-mapping' ? 'btn-primary' : 'btn-ghost'"
          @click="activeTab = 'panel-mapping'"
        >
          <Layers class="w-4 h-4" />
          Mapping Panel Tindakan Lab ({{ tindakanList.length }})
        </button>
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="activeTab === 'parameters' ? 'btn-primary' : 'btn-ghost'"
          @click="activeTab = 'parameters'"
        >
          <TestTubes class="w-4 h-4" />
          Daftar Master Parameter ({{ totalItems }})
        </button>
      </div>
    </div>

    <!-- TAB 1: MAPPING PANEL TINDAKAN (e.g. DARAH LENGKAP -> PARAMETER) -->
    <div
      v-if="activeTab === 'panel-mapping'"
      class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
    >
      <!-- Left: Daftar Tarif Lab -->
      <div class="lg:col-span-4 min-w-0 bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-sm space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-extrabold text-base-content">
            Tindakan Tarif Lab
          </h2>
          <button
            type="button"
            class="btn btn-xs btn-ghost rounded-lg"
            @click="fetchMappingWorkspace"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingTindakan }" />
          </button>
        </div>

        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="tindakanSearch"
            type="text"
            placeholder="Cari tindakan lab (mis: Darah Lengkap)..."
            class="input input-bordered input-sm w-full pl-9 rounded-xl text-xs"
          />
        </div>

        <div
          v-if="tindakanList.length === 0 && !loadingTindakan"
          class="p-6 text-center bg-base-200/40 rounded-xl text-xs text-base-content/60"
        >
          Belum ada item tarif kategori <strong>Laboratorium</strong>.
          <div class="mt-2">
            <NuxtLink
              :to="slugPath('/master/tarif')"
              class="link link-primary font-bold"
            >
              Buat di Master Tarif Tindakan →
            </NuxtLink>
          </div>
        </div>

        <div v-else class="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
          <button
            v-for="t in filteredTindakanList"
            :key="t.id"
            type="button"
            class="w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2"
            :class="
              selectedTindakanId === t.id
                ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                : 'bg-base-100 border-base-content/10 hover:bg-base-200/50'
            "
            @click="selectedTindakanId = t.id"
          >
            <div class="min-w-0">
              <div class="text-xs font-mono opacity-75">{{ t.kode }}</div>
              <div class="font-bold text-sm truncate text-base-content">{{ t.nama }}</div>
            </div>
            <span
              class="badge badge-sm font-bold shrink-0"
              :class="t.jumlahParameter > 0 ? 'badge-success badge-outline' : 'badge-info badge-outline'"
            >
              {{ t.jumlahParameter > 0 ? `${t.jumlahParameter} param` : "Tunggal" }}
            </span>
          </button>
        </div>
      </div>

      <!-- Right: Parameter Susunan untuk Tindakan Terpilih -->
      <div class="lg:col-span-8 min-w-0 bg-base-100 border border-base-content/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div v-if="!selectedTindakan" class="py-16 text-center text-sm text-base-content/50">
          Pilih salah satu tindakan tarif laboratorium di sebelah kiri untuk mengatur parameter pemeriksaannya.
        </div>

        <template v-else>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-content/10">
            <div class="min-w-0">
              <div class="text-xs font-mono font-bold text-primary">{{ selectedTindakan.kode }}</div>
              <h2 class="text-base sm:text-lg font-extrabold text-base-content break-words">
                Susunan Parameter: {{ selectedTindakan.nama }}
              </h2>
            </div>
            <div v-if="canManageData" class="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                class="btn btn-sm btn-outline rounded-xl font-bold gap-1.5"
                @click="openQuickAddToPanel"
              >
                <Plus class="w-3.5 h-3.5" />
                Buat Parameter Baru & Tambah
              </button>
              <button
                type="button"
                class="btn btn-sm btn-primary rounded-xl font-bold gap-1.5 shadow-sm"
                :disabled="savingMapping"
                @click="handleSaveMapping"
              >
                <span v-if="savingMapping" class="loading loading-spinner loading-xs"></span>
                <Save v-else class="w-3.5 h-3.5" />
                Simpan Susunan Panel
              </button>
            </div>
          </div>

          <div v-if="loadingMapping" class="py-10 space-y-3 animate-pulse">
            <div class="h-12 bg-base-200 rounded-xl"></div>
            <div class="h-12 bg-base-200 rounded-xl"></div>
          </div>

          <template v-else>
            <!-- Tambah dari parameter yang sudah ada -->
            <div
              v-if="canManageData"
              class="bg-base-200/40 border border-base-content/10 rounded-xl p-3 space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-base-content/80">
                  Tambahkan Parameter yang Sudah Ada ke Panel Ini:
                </span>
                <span class="text-[11px] text-base-content/50">
                  {{ availableOptionsToAdd.length }} tersedia
                </span>
              </div>
              <input
                v-model="pickerSearch"
                type="text"
                placeholder="Cari parameter (mis: Hemoglobin, Leukosit, Trombosit)..."
                class="input input-bordered input-sm w-full rounded-xl text-xs bg-base-100"
              />
              <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                <button
                  v-for="opt in availableOptionsToAdd.slice(0, 24)"
                  :key="opt.id"
                  type="button"
                  class="btn btn-xs btn-outline border-base-content/20 hover:btn-primary rounded-lg font-semibold gap-1"
                  @click="addExistingParamToPanel(opt)"
                >
                  <Plus class="w-3 h-3" />
                  <span>{{ opt.nama }}</span>
                  <span v-if="opt.satuan" class="opacity-60">({{ opt.satuan }})</span>
                </button>
                <span
                  v-if="availableOptionsToAdd.length === 0"
                  class="text-xs text-base-content/50 py-1"
                >
                  Semua parameter cocok sudah ditambahkan. Gunakan tombol <strong>Buat Parameter Baru & Tambah</strong> di atas jika belum ada.
                </span>
              </div>
            </div>

            <!-- Susunan Parameter Saat Ini -->
            <div
              v-if="mappingItems.length === 0"
              class="p-6 text-center bg-base-200/30 border border-dashed border-base-content/15 rounded-2xl text-xs text-base-content/75 space-y-3"
            >
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-info/10 text-info font-bold text-[11px]">
                Mode Pemeriksaan Tunggal Aktif (Tanpa Sub-Parameter)
              </div>
              <p class="max-w-lg mx-auto leading-relaxed text-base-content/70">
                Karena belum ada sub-parameter, tindakan <strong>{{ selectedTindakan.nama }}</strong> otomatis memiliki
                <strong>1 kolom input hasil langsung (teks/angka bebas)</strong> saat input hasil penunjang lab.
              </p>
              <div v-if="canManageData" class="pt-1 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  class="btn btn-sm btn-primary btn-outline rounded-xl font-bold gap-1.5"
                  @click="openStandaloneParamSetup"
                >
                  <Plus class="w-3.5 h-3.5" />
                  Atur Satuan &amp; Nilai Rujukan ({{ selectedTindakan.nama }})
                </button>
              </div>
              <p class="text-[11px] text-base-content/50">
                Jika tindakan ini memiliki banyak anakan parameter (seperti Darah Lengkap), pilih beberapa parameter di atas lalu klik <strong>Simpan Susunan Panel</strong>.
              </p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(row, idx) in mappingItems"
                :key="row.parameterId"
                class="bg-base-100 border border-base-content/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center shrink-0">
                    {{ idx + 1 }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-bold text-sm text-base-content">
                        {{ row.parameter?.nama || `Param #${row.parameterId}` }}
                      </span>
                      <span class="font-mono text-[11px] px-2 py-0.5 rounded bg-base-200 text-base-content/70">
                        {{ row.parameter?.kode }}
                      </span>
                      <span v-if="row.parameter?.satuan" class="text-xs text-base-content/60">
                        ({{ row.parameter.satuan }})
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 mt-1.5">
                      <input
                        v-model="row.subGrupLabel"
                        type="text"
                        maxlength="80"
                        placeholder="Label grup cetak (opsional)"
                        class="input input-bordered input-xs rounded-lg text-xs w-48"
                        :disabled="!canManageData"
                      />
                      <label class="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          v-model="row.isWajib"
                          type="checkbox"
                          class="checkbox checkbox-xs checkbox-primary"
                          :disabled="!canManageData"
                        />
                        <span>Wajib diisi</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div v-if="canManageData" class="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost btn-square rounded-lg"
                    :disabled="idx === 0"
                    title="Geser ke atas"
                    @click="moveMappingRow(idx, -1)"
                  >
                    <ArrowUp class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost btn-square rounded-lg"
                    :disabled="idx === mappingItems.length - 1"
                    title="Geser ke bawah"
                    @click="moveMappingRow(idx, 1)"
                  >
                    <ArrowDown class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost btn-square rounded-lg text-base-content/60 hover:text-primary"
                    title="Edit parameter & nilai rujukan"
                    @click="openEditParam(row.parameterId)"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost btn-square rounded-lg text-error"
                    title="Keluarkan dari panel"
                    @click="removeMappingRow(idx)"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- TAB 2: DAFTAR MASTER PARAMETER -->
    <div v-else class="space-y-4">
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <div class="relative sm:col-span-2">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kode, nama parameter, grup, LOINC..."
            class="input input-bordered input-sm w-full pl-10 rounded-xl text-xs"
          />
        </div>
        <select
          v-model="tipeFilter"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Tipe Hasil</option>
          <option v-for="t in TIPE_HASIL_LAB_OPTIONS" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
        <select
          v-model="statusFilter"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status</option>
          <option value="Y">Aktif</option>
          <option value="N">Nonaktif</option>
        </select>
      </div>

      <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm overflow-hidden">
        <div v-if="loadingParams && items.length === 0" class="p-6 space-y-3 animate-pulse">
          <div v-for="i in 5" :key="i" class="h-12 bg-base-200 rounded-xl"></div>
        </div>
        <div v-else-if="items.length === 0" class="p-10 text-center text-sm text-base-content/60">
          Belum ada data parameter laboratorium.
        </div>
        <template v-else>
          <div class="hidden md:block overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr class="bg-base-200/60 text-xs uppercase tracking-wider text-base-content/60">
                  <th class="py-3 px-4">Kode & Nama Parameter</th>
                  <th class="py-3 px-4">Grup</th>
                  <th class="py-3 px-4">Satuan & Tipe</th>
                  <th class="py-3 px-4">Nilai Rujukan</th>
                  <th class="py-3 px-4 text-center">Dipakai Panel</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-base-content/5 text-sm">
                <tr v-for="param in items" :key="param.id" class="hover:bg-base-200/35">
                  <td class="py-3 px-4">
                    <span class="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md mr-2">
                      {{ param.kode }}
                    </span>
                    <span class="font-bold">{{ param.nama }}</span>
                  </td>
                  <td class="py-3 px-4 text-xs text-base-content/70">
                    {{ param.grup || "-" }}
                  </td>
                  <td class="py-3 px-4 text-xs">
                    <span class="font-semibold">{{ param.satuan || "-" }}</span>
                    <span class="text-base-content/50 ml-1">({{ param.tipeHasil }})</span>
                  </td>
                  <td class="py-3 px-4 text-xs font-medium">
                    {{ formatRujukanRingkas(param) }}
                  </td>
                  <td class="py-3 px-4 text-center text-xs font-bold">
                    {{ param.jumlahTindakan ?? 0 }} tindakan
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                      :class="
                        param.status === 'Y'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      "
                    >
                      <CheckCircle2 v-if="param.status === 'Y'" class="w-3 h-3" />
                      <XCircle v-else class="w-3 h-3" />
                      {{ param.status === "Y" ? "Aktif" : "Nonaktif" }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <div class="inline-flex items-center gap-1">
                      <button
                        v-if="canManageData"
                        type="button"
                        class="btn btn-xs btn-ghost btn-square rounded-lg"
                        @click="openEditParam(param.id)"
                      >
                        <Pencil class="w-4 h-4" />
                      </button>
                      <button
                        v-if="canDeleteData"
                        type="button"
                        class="btn btn-xs btn-ghost btn-square rounded-lg text-error"
                        @click="handleDeleteParam(param)"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="md:hidden divide-y divide-base-content/10">
            <div v-for="param in items" :key="param.id" class="p-4 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="font-mono font-bold text-xs text-primary">{{ param.kode }}</span>
                  <h3 class="font-bold text-sm">{{ param.nama }}</h3>
                  <p class="text-xs text-base-content/60">
                    {{ param.grup || "Umum" }} • {{ param.satuan || "-" }} • {{ formatRujukanRingkas(param) }}
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    v-if="canManageData"
                    type="button"
                    class="btn btn-xs btn-ghost rounded-lg"
                    @click="openEditParam(param.id)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="canDeleteData"
                    type="button"
                    class="btn btn-xs btn-ghost text-error rounded-lg"
                    @click="handleDeleteParam(param)"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-if="totalPages > 1 || totalItems > 0" class="p-4 border-t border-base-content/10">
          <AppPagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :total-items="totalItems"
            :limit="limit"
            @page-change="(p) => { currentPage = p; fetchParameters(); }"
          />
        </div>
      </div>
    </div>

    <LabParameterFormModal
      :show="showParamModal"
      :edit-id="editingParamId"
      :quick-tindakan-id="quickAddTindakanId"
      :quick-tindakan-nama="selectedTindakan?.nama || ''"
      :initial-preset="standalonePreset"
      @close="showParamModal = false"
      @saved="handleParamModalSaved"
    />
  </div>
</template>
