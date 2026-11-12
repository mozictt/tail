<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Coins,
  Copy,
  Layers,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import InputRupiah from "@/components/ui/InputRupiah.vue";
import Select2 from "@/components/ui/Select2.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import { TarifService } from "@/services/tarif.service";
import { UnitService } from "@/services/unit.service";
import { PenjaminService } from "@/services/penjamin.service";
import { KelasService } from "@/services/kelas.service";
import { useCurrency } from "@/composables/useCurrency";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  getJenisTarifBadgeClass,
  getJenisTarifShortLabel,
  type KelasOptionItem,
  type PenjaminOptionItem,
  type TarifLayananItem,
  type TarifResolveResult,
  type TarifTindakanItem,
  type UnitOptionItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    tindakanId?: number | null;
    canManage?: boolean;
    canDelete?: boolean;
  }>(),
  {
    tindakanId: null,
    canManage: false,
    canDelete: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated"): void;
}>();

const tarifService = TarifService();
const unitService = UnitService();
const penjaminService = PenjaminService();
const kelasService = KelasService();
const { formatRupiah } = useCurrency();
const { showToast } = useToast();

type ActiveTab = "matrix" | "simulator";
type InputMode = "single" | "bulk";

const activeTab = ref<ActiveTab>("matrix");
const loadingDetail = ref(false);
const loadingOptions = ref(false);
const savingRule = ref(false);
const deletingId = ref<number | null>(null);
const resolvingSim = ref(false);

const detail = ref<TarifTindakanItem | null>(null);
const unitOptions = ref<UnitOptionItem[]>([]);
const penjaminOptions = ref<PenjaminOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);

const showFormPanel = ref(false);
const editingHargaId = ref<number | null>(null);
const inputMode = ref<InputMode>("single");

const todayIso = () => new Date().toISOString().slice(0, 10);

interface HargaRuleFormState {
  unitId: number | undefined;
  penjaminId: number | undefined;
  kelasId: number | undefined;
  unitIds: number[];
  penjaminIds: number[];
  kelasIds: number[];
  modeDuplikat: "SKIP" | "OVERWRITE";
  jasaSarana: number;
  bhp: number;
  jasaDokter: number;
  jasaNakes: number;
  berlakuMulai: string;
  berlakuSampai: string;
  keterangan: string;
  status: MasterStatus;
}

const createDefaultRuleForm = (): HargaRuleFormState => ({
  unitId: undefined,
  penjaminId: undefined,
  kelasId: undefined,
  unitIds: [],
  penjaminIds: [],
  kelasIds: [],
  modeDuplikat: "SKIP",
  jasaSarana: 0,
  bhp: 0,
  jasaDokter: 0,
  jasaNakes: 0,
  berlakuMulai: todayIso(),
  berlakuSampai: "",
  keterangan: "",
  status: "Y",
});

const ruleForm = ref<HargaRuleFormState>(createDefaultRuleForm());

const simForm = ref<{
  unitId: number | undefined;
  penjaminId: number | undefined;
  kelasId: number | undefined;
  tanggal: string;
}>({
  unitId: undefined,
  penjaminId: undefined,
  kelasId: undefined,
  tanggal: todayIso(),
});
const simResult = ref<TarifResolveResult | null>(null);

const unitSelectOptions = computed(() =>
  unitOptions.value.map((u) => ({
    id: u.id,
    displayLabel: `${u.kode} — ${u.nama}`,
  })),
);

const penjaminSelectOptions = computed(() =>
  penjaminOptions.value.map((p) => ({
    id: p.id,
    displayLabel: `${p.kode} — ${p.nama}`,
  })),
);

const kelasSelectOptions = computed(() =>
  kelasOptions.value.map((k) => ({
    id: k.id,
    displayLabel: `${k.kode} — ${k.nama}`,
  })),
);

const previewTotalRule = computed(
  () =>
    Math.max(0, Number(ruleForm.value.jasaSarana || 0)) +
    Math.max(0, Number(ruleForm.value.bhp || 0)) +
    Math.max(0, Number(ruleForm.value.jasaDokter || 0)) +
    Math.max(0, Number(ruleForm.value.jasaNakes || 0)),
);

const componentShare = computed(() => {
  const total = previewTotalRule.value;
  if (total <= 0) {
    return { saranaPct: 0, bhpPct: 0, dokterPct: 0, nakesPct: 0 };
  }
  return {
    saranaPct: Math.round((Number(ruleForm.value.jasaSarana || 0) / total) * 100),
    bhpPct: Math.round((Number(ruleForm.value.bhp || 0) / total) * 100),
    dokterPct: Math.round((Number(ruleForm.value.jasaDokter || 0) / total) * 100),
    nakesPct: Math.round((Number(ruleForm.value.jasaNakes || 0) / total) * 100),
  };
});

const bulkComboCount = computed(() => {
  const u = Math.max(1, ruleForm.value.unitIds.length);
  const p = Math.max(1, ruleForm.value.penjaminIds.length);
  const k = Math.max(1, ruleForm.value.kelasIds.length);
  return u * p * k;
});

const hargaRules = computed<TarifLayananItem[]>(
  () => detail.value?.daftarHarga ?? [],
);

const loadOptions = async () => {
  loadingOptions.value = true;
  try {
    const [unitRes, penjaminRes, kelasRes] = await Promise.allSettled([
      unitService.getUnitOptions(),
      penjaminService.getPenjaminOptions(),
      kelasService.getKelasOptions(),
    ]);
    if (unitRes.status === "fulfilled") unitOptions.value = unitRes.value;
    if (penjaminRes.status === "fulfilled") penjaminOptions.value = penjaminRes.value;
    if (kelasRes.status === "fulfilled") kelasOptions.value = kelasRes.value;
  } finally {
    loadingOptions.value = false;
  }
};

const loadDetail = async (targetId: number) => {
  loadingDetail.value = true;
  try {
    detail.value = await tarifService.getTarifById(targetId);
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat matriks harga tarif"),
      "error",
    );
    emit("close");
  } finally {
    loadingDetail.value = false;
  }
};

watch(
  () => [props.show, props.tindakanId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen || !targetId) return;
    activeTab.value = "matrix";
    showFormPanel.value = false;
    editingHargaId.value = null;
    ruleForm.value = createDefaultRuleForm();
    simResult.value = null;
    simForm.value = {
      unitId: undefined,
      penjaminId: undefined,
      kelasId: undefined,
      tanggal: todayIso(),
    };

    await Promise.all([loadOptions(), loadDetail(targetId)]);
  },
  { immediate: true },
);

const toggleArraySelection = (arr: number[], id: number) => {
  const idx = arr.indexOf(id);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(id);
  }
};

const openCreateRuleForm = (mode: InputMode = "single") => {
  editingHargaId.value = null;
  inputMode.value = mode;
  ruleForm.value = createDefaultRuleForm();
  showFormPanel.value = true;
};

const openEditRuleForm = (rule: TarifLayananItem) => {
  editingHargaId.value = rule.id;
  inputMode.value = "single";
  ruleForm.value = {
    unitId: rule.unitId ?? undefined,
    penjaminId: rule.penjaminId ?? undefined,
    kelasId: rule.kelasId ?? undefined,
    unitIds: [],
    penjaminIds: [],
    kelasIds: [],
    modeDuplikat: "SKIP",
    jasaSarana: Number(rule.jasaSarana || 0),
    bhp: Number(rule.bhp || 0),
    jasaDokter: Number(rule.jasaDokter || 0),
    jasaNakes: Number(rule.jasaNakes || 0),
    berlakuMulai: rule.berlakuMulai ? rule.berlakuMulai.slice(0, 10) : todayIso(),
    berlakuSampai: rule.berlakuSampai ? rule.berlakuSampai.slice(0, 10) : "",
    keterangan: rule.keterangan || "",
    status: rule.status === "N" ? "N" : "Y",
  };
  showFormPanel.value = true;
};

const duplicateRuleToForm = (rule: TarifLayananItem) => {
  editingHargaId.value = null;
  inputMode.value = "single";
  ruleForm.value = {
    ...createDefaultRuleForm(),
    unitId: rule.unitId ?? undefined,
    penjaminId: rule.penjaminId ?? undefined,
    kelasId: rule.kelasId ?? undefined,
    jasaSarana: Number(rule.jasaSarana || 0),
    bhp: Number(rule.bhp || 0),
    jasaDokter: Number(rule.jasaDokter || 0),
    jasaNakes: Number(rule.jasaNakes || 0),
    berlakuMulai: todayIso(),
    berlakuSampai: rule.berlakuSampai ? rule.berlakuSampai.slice(0, 10) : "",
    keterangan: rule.keterangan || "",
    status: "Y",
  };
  showFormPanel.value = true;
};

const handleSaveRule = async () => {
  if (!props.tindakanId) return;
  const f = ruleForm.value;

  if (f.berlakuSampai && f.berlakuSampai < f.berlakuMulai) {
    showToast(
      "Tanggal berlaku sampai tidak boleh lebih awal dari tanggal mulai",
      "error",
    );
    return;
  }

  if (inputMode.value === "bulk" && !editingHargaId.value && bulkComboCount.value > 100) {
    showToast("Maksimal 100 kombinasi aturan per generate massal", "error");
    return;
  }

  savingRule.value = true;
  try {
    if (editingHargaId.value) {
      await tarifService.updateTarifHarga(editingHargaId.value, {
        unitId: f.unitId ?? null,
        penjaminId: f.penjaminId ?? null,
        kelasId: f.kelasId ?? null,
        jasaSarana: Number(f.jasaSarana || 0),
        bhp: Number(f.bhp || 0),
        jasaDokter: Number(f.jasaDokter || 0),
        jasaNakes: Number(f.jasaNakes || 0),
        berlakuMulai: f.berlakuMulai,
        berlakuSampai: f.berlakuSampai || null,
        keterangan: f.keterangan.trim() || null,
        status: f.status,
      });
      showToast("Aturan tarif berhasil diperbarui", "success");
    } else if (inputMode.value === "bulk") {
      const res = await tarifService.bulkCreateTarifHarga(props.tindakanId, {
        unitIds: f.unitIds,
        penjaminIds: f.penjaminIds,
        kelasIds: f.kelasIds,
        modeDuplikat: f.modeDuplikat,
        jasaSarana: Number(f.jasaSarana || 0),
        bhp: Number(f.bhp || 0),
        jasaDokter: Number(f.jasaDokter || 0),
        jasaNakes: Number(f.jasaNakes || 0),
        berlakuMulai: f.berlakuMulai,
        berlakuSampai: f.berlakuSampai || null,
        keterangan: f.keterangan.trim() || null,
        status: f.status,
      });
      showToast(
        `Generate massal selesai: ${res.createdCount} dibuat, ${res.updatedCount} diperbarui, ${res.skippedCount} dilewati`,
        "success",
      );
    } else {
      await tarifService.createTarifHarga(props.tindakanId, {
        unitId: f.unitId ?? null,
        penjaminId: f.penjaminId ?? null,
        kelasId: f.kelasId ?? null,
        jasaSarana: Number(f.jasaSarana || 0),
        bhp: Number(f.bhp || 0),
        jasaDokter: Number(f.jasaDokter || 0),
        jasaNakes: Number(f.jasaNakes || 0),
        berlakuMulai: f.berlakuMulai,
        berlakuSampai: f.berlakuSampai || null,
        keterangan: f.keterangan.trim() || null,
        status: f.status,
      });
      showToast("Aturan tarif berhasil ditambahkan", "success");
    }

    showFormPanel.value = false;
    editingHargaId.value = null;
    await loadDetail(props.tindakanId);
    emit("updated");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menyimpan aturan tarif"),
      "error",
    );
  } finally {
    savingRule.value = false;
  }
};

const handleDeleteRule = async (rule: TarifLayananItem) => {
  if (!props.tindakanId) return;

  const label = [
    rule.unit?.nama || "Semua Unit",
    rule.penjamin?.nama || "Semua Penjamin",
    rule.kelas?.nama || "Semua Kelas",
  ].join(" • ");

  const confirm = await Swal.fire({
    title: "Hapus Aturan Tarif?",
    text: `Hapus tarif (${label}) sebesar ${formatRupiah(rule.totalTarif)}?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e11d48",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    reverseButtons: true,
  });

  if (!confirm.isConfirmed) return;

  deletingId.value = rule.id;
  try {
    await tarifService.deleteTarifHarga(rule.id);
    showToast("Aturan tarif berhasil dihapus", "success");
    await loadDetail(props.tindakanId);
    emit("updated");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menghapus aturan tarif"),
      "error",
    );
  } finally {
    deletingId.value = null;
  }
};

const runSimulator = async () => {
  if (!props.tindakanId) return;
  resolvingSim.value = true;
  try {
    simResult.value = await tarifService.resolveTarif({
      tindakanId: props.tindakanId,
      unitId: simForm.value.unitId,
      penjaminId: simForm.value.penjaminId,
      kelasId: simForm.value.kelasId,
      tanggal: simForm.value.tanggal || undefined,
    });
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menjalankan simulasi tarif"),
      "error",
    );
  } finally {
    resolvingSim.value = false;
  }
};

const getScoreBadgeClass = (score: number): string => {
  if (score === 7) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (score >= 4) return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
  if (score >= 1) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-base-200 text-base-content/75 border-base-content/15";
};

const handleClose = () => {
  if (savingRule.value || deletingId.value !== null) return;
  emit("close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.show && !savingRule.value) {
    emit("close");
  }
};

onMounted(() => {
  if (process.client) window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  if (process.client) window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="handleClose"
    >
      <div class="modal-box max-w-5xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-5 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <!-- Modal Header -->
        <div class="flex-none pr-9 mb-4">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
            :disabled="savingRule"
            aria-label="Tutup modal"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BadgeDollarSign class="w-6 h-6" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-extrabold text-lg sm:text-xl tracking-tight truncate">
                  {{ detail?.nama || "Matriks Harga Tarif" }}
                </h3>
                <span
                  v-if="detail"
                  class="px-2.5 py-0.5 rounded-lg border text-[11px] font-bold"
                  :class="getJenisTarifBadgeClass(detail.jenisTarif)"
                >
                  {{ getJenisTarifShortLabel(detail.jenisTarif) }}
                </span>
              </div>
              <p class="text-xs text-base-content/60 mt-0.5 flex flex-wrap items-center gap-2">
                <span class="font-mono font-bold text-primary">{{ detail?.kode }}</span>
                <span v-if="detail?.kelompokTarif">• {{ detail.kelompokTarif }}</span>
                <span>• Prioritas lookup: <strong>Unit → Penjamin → Kelas</strong></span>
              </p>
            </div>
          </div>

          <!-- Tabs Switch -->
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-base-content/10 pb-3">
            <div class="flex items-center gap-1.5 bg-base-200/70 p-1 rounded-2xl">
              <button
                type="button"
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                :class="
                  activeTab === 'matrix'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/60 hover:text-base-content'
                "
                @click="activeTab = 'matrix'"
              >
                <Layers class="w-3.5 h-3.5" />
                Matriks Tarif ({{ hargaRules.length }})
              </button>
              <button
                type="button"
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                :class="
                  activeTab === 'simulator'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/60 hover:text-base-content'
                "
                @click="activeTab = 'simulator'"
              >
                <Play class="w-3.5 h-3.5" />
                Simulasi Cek Tarif
              </button>
            </div>

            <div
              v-if="activeTab === 'matrix' && canManage && !showFormPanel"
              class="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                class="btn btn-sm btn-outline rounded-xl font-bold gap-1.5"
                @click="openCreateRuleForm('bulk')"
              >
                <Sparkles class="w-3.5 h-3.5" />
                Generate Massal
              </button>
              <button
                type="button"
                class="btn btn-sm btn-primary rounded-xl font-bold gap-1.5 shadow-sm"
                @click="openCreateRuleForm('single')"
              >
                <Plus class="w-4 h-4" />
                Tambah Aturan Tarif
              </button>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div v-if="loadingDetail" class="flex-1 space-y-4 py-6 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-32 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
          <!-- TAB 1: MATRIX -->
          <template v-if="activeTab === 'matrix'">
            <!-- Form Panel Add / Edit / Bulk -->
            <section
              v-if="showFormPanel && canManage"
              class="bg-base-200/40 border border-primary/25 rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-base-content/10">
                <div class="flex items-center gap-2">
                  <Coins class="w-4 h-4 text-primary" />
                  <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary">
                    {{
                      editingHargaId
                        ? "Edit Aturan Tarif"
                        : inputMode === "bulk"
                          ? "Generate Aturan Tarif Massal (Multi Unit × Penjamin × Kelas)"
                          : "Tambah Aturan Tarif Baru"
                    }}
                  </h4>
                </div>
                <div class="flex items-center gap-2">
                  <div
                    v-if="!editingHargaId"
                    class="join bg-base-100 border border-base-content/10 rounded-xl p-0.5"
                  >
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition"
                      :class="inputMode === 'single' ? 'bg-primary text-primary-content' : 'text-base-content/60'"
                      @click="inputMode = 'single'"
                    >
                      Tunggal
                    </button>
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition"
                      :class="inputMode === 'bulk' ? 'bg-primary text-primary-content' : 'text-base-content/60'"
                      @click="inputMode = 'bulk'"
                    >
                      Massal
                    </button>
                  </div>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost rounded-lg"
                    @click="showFormPanel = false"
                  >
                    Tutup Form
                  </button>
                </div>
              </div>

              <!-- Dimension Selectors: Single Mode -->
              <div
                v-if="inputMode === 'single' || editingHargaId"
                class="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    Unit Pelayanan
                  </label>
                  <Select2
                    v-model="ruleForm.unitId"
                    :options="unitSelectOptions"
                    label-key="displayLabel"
                    value-key="id"
                    :show-default-option="true"
                    default-option-text="Semua Unit (Berlaku Umum)"
                    placeholder="Semua Unit (Berlaku Umum)"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    Penjamin / Cara Bayar
                  </label>
                  <Select2
                    v-model="ruleForm.penjaminId"
                    :options="penjaminSelectOptions"
                    label-key="displayLabel"
                    value-key="id"
                    :show-default-option="true"
                    default-option-text="Semua Penjamin"
                    placeholder="Semua Penjamin"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    Kelas Perawatan
                  </label>
                  <Select2
                    v-model="ruleForm.kelasId"
                    :options="kelasSelectOptions"
                    label-key="displayLabel"
                    value-key="id"
                    :show-default-option="true"
                    default-option-text="Semua / Non-Kelas"
                    placeholder="Semua / Non-Kelas"
                  />
                </div>
              </div>

              <!-- Dimension Selectors: Bulk Mode -->
              <div v-else class="space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <!-- Multi Unit -->
                  <div class="bg-base-100 border border-base-content/10 rounded-xl p-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold flex items-center gap-1.5">
                        <Building2 class="w-3.5 h-3.5 text-primary" />
                        Pilih Unit
                      </span>
                      <button
                        v-if="ruleForm.unitIds.length > 0"
                        type="button"
                        class="text-[11px] font-semibold text-primary hover:underline"
                        @click="ruleForm.unitIds = []"
                      >
                        Reset (Semua)
                      </button>
                    </div>
                    <p v-if="ruleForm.unitIds.length === 0" class="text-[11px] text-base-content/50 mb-1.5">
                      Tidak dicentang = berlaku <strong>Semua Unit</strong>
                    </p>
                    <div class="max-h-32 overflow-y-auto space-y-1 pr-1">
                      <label
                        v-for="u in unitOptions"
                        :key="u.id"
                        class="flex items-center gap-2 text-xs cursor-pointer hover:bg-base-200/60 px-2 py-1 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          class="checkbox checkbox-xs checkbox-primary"
                          :checked="ruleForm.unitIds.includes(u.id)"
                          @change="toggleArraySelection(ruleForm.unitIds, u.id)"
                        />
                        <span class="truncate">{{ u.nama }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Multi Penjamin -->
                  <div class="bg-base-100 border border-base-content/10 rounded-xl p-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold flex items-center gap-1.5">
                        <ShieldCheck class="w-3.5 h-3.5 text-emerald-600" />
                        Pilih Penjamin
                      </span>
                      <button
                        v-if="ruleForm.penjaminIds.length > 0"
                        type="button"
                        class="text-[11px] font-semibold text-primary hover:underline"
                        @click="ruleForm.penjaminIds = []"
                      >
                        Reset (Semua)
                      </button>
                    </div>
                    <p v-if="ruleForm.penjaminIds.length === 0" class="text-[11px] text-base-content/50 mb-1.5">
                      Tidak dicentang = berlaku <strong>Semua Penjamin</strong>
                    </p>
                    <div class="max-h-32 overflow-y-auto space-y-1 pr-1">
                      <label
                        v-for="p in penjaminOptions"
                        :key="p.id"
                        class="flex items-center gap-2 text-xs cursor-pointer hover:bg-base-200/60 px-2 py-1 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          class="checkbox checkbox-xs checkbox-primary"
                          :checked="ruleForm.penjaminIds.includes(p.id)"
                          @change="toggleArraySelection(ruleForm.penjaminIds, p.id)"
                        />
                        <span class="truncate">{{ p.nama }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Multi Kelas -->
                  <div class="bg-base-100 border border-base-content/10 rounded-xl p-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold flex items-center gap-1.5">
                        <Layers class="w-3.5 h-3.5 text-amber-600" />
                        Pilih Kelas
                      </span>
                      <button
                        v-if="ruleForm.kelasIds.length > 0"
                        type="button"
                        class="text-[11px] font-semibold text-primary hover:underline"
                        @click="ruleForm.kelasIds = []"
                      >
                        Reset (Semua)
                      </button>
                    </div>
                    <p v-if="ruleForm.kelasIds.length === 0" class="text-[11px] text-base-content/50 mb-1.5">
                      Tidak dicentang = <strong>Semua / Non-Kelas</strong>
                    </p>
                    <div class="max-h-32 overflow-y-auto space-y-1 pr-1">
                      <label
                        v-for="k in kelasOptions"
                        :key="k.id"
                        class="flex items-center gap-2 text-xs cursor-pointer hover:bg-base-200/60 px-2 py-1 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          class="checkbox checkbox-xs checkbox-primary"
                          :checked="ruleForm.kelasIds.includes(k.id)"
                          @change="toggleArraySelection(ruleForm.kelasIds, k.id)"
                        />
                        <span class="truncate">{{ k.nama }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 bg-base-100 border border-base-content/10 rounded-xl px-3.5 py-2 text-xs">
                  <span>
                    Total kombinasi yang akan dibuat:
                    <strong class="text-primary">{{ bulkComboCount }}</strong> aturan (maks. 100)
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-base-content/70">Jika kombinasi sudah ada:</span>
                    <select
                      v-model="ruleForm.modeDuplikat"
                      class="select select-bordered select-xs rounded-lg font-semibold"
                    >
                      <option value="SKIP">Lewati (SKIP)</option>
                      <option value="OVERWRITE">Timpa Harga (OVERWRITE)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Komponen Nominal -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    Jasa Sarana / RS
                  </label>
                  <InputRupiah
                    v-model="ruleForm.jasaSarana"
                    input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    BHP / Bahan
                  </label>
                  <InputRupiah
                    v-model="ruleForm.bhp"
                    input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">
                    Jasa Dokter
                  </label>
                  <InputRupiah
                    v-model="ruleForm.jasaDokter"
                    input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    Jasa Nakes
                  </label>
                  <InputRupiah
                    v-model="ruleForm.jasaNakes"
                    input-class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                  />
                </div>
              </div>

              <!-- Live Total & Komposisi -->
              <div class="bg-base-100 border border-base-content/10 rounded-xl p-3.5 space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs font-bold text-base-content/70">
                    Total Tarif Efektif (Sarana + BHP + Jasa Dokter + Jasa Nakes)
                  </span>
                  <span class="text-lg font-black text-primary tabular-nums">
                    {{ formatRupiah(previewTotalRule) }}
                  </span>
                </div>
                <div class="w-full h-2 rounded-full bg-base-200 overflow-hidden flex">
                  <div
                    class="bg-slate-500 h-full transition-all"
                    :style="{ width: `${componentShare.saranaPct}%` }"
                  ></div>
                  <div
                    class="bg-amber-500 h-full transition-all"
                    :style="{ width: `${componentShare.bhpPct}%` }"
                  ></div>
                  <div
                    class="bg-sky-500 h-full transition-all"
                    :style="{ width: `${componentShare.dokterPct}%` }"
                  ></div>
                  <div
                    class="bg-emerald-500 h-full transition-all"
                    :style="{ width: `${componentShare.nakesPct}%` }"
                  ></div>
                </div>
                <div class="flex flex-wrap items-center gap-3 text-[11px] text-base-content/70">
                  <span class="inline-flex items-center gap-1"><i class="w-2 h-2 rounded-full bg-slate-500 inline-block"></i> Sarana {{ componentShare.saranaPct }}%</span>
                  <span class="inline-flex items-center gap-1"><i class="w-2 h-2 rounded-full bg-amber-500 inline-block"></i> BHP {{ componentShare.bhpPct }}%</span>
                  <span class="inline-flex items-center gap-1"><i class="w-2 h-2 rounded-full bg-sky-500 inline-block"></i> Dokter {{ componentShare.dokterPct }}%</span>
                  <span class="inline-flex items-center gap-1"><i class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></i> Nakes {{ componentShare.nakesPct }}%</span>
                </div>
              </div>

              <!-- Tanggal Berlaku, Keterangan, Status -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    Berlaku Mulai <span class="text-error">*</span>
                  </label>
                  <FlatpickrDate v-model="ruleForm.berlakuMulai" size="sm" :clearable="false" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    Berlaku Sampai (Opsional)
                  </label>
                  <FlatpickrDate
                    v-model="ruleForm.berlakuSampai"
                    size="sm"
                    placeholder="Kosong = Permanen"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">
                    Status Aturan
                  </label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      class="flex items-center justify-center gap-1 h-10 rounded-xl border text-xs font-bold transition"
                      :class="
                        ruleForm.status === 'Y'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-base-100 border-base-content/10 text-base-content/60'
                      "
                      @click="ruleForm.status = 'Y'"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" />
                      Aktif
                    </button>
                    <button
                      type="button"
                      class="flex items-center justify-center gap-1 h-10 rounded-xl border text-xs font-bold transition"
                      :class="
                        ruleForm.status === 'N'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                          : 'bg-base-100 border-base-content/10 text-base-content/60'
                      "
                      @click="ruleForm.status = 'N'"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                      Nonaktif
                    </button>
                  </div>
                </div>

                <div class="sm:col-span-3">
                  <input
                    v-model="ruleForm.keterangan"
                    type="text"
                    maxlength="500"
                    placeholder="Catatan tambahan aturan tarif (opsional)"
                    class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  class="btn btn-sm btn-ghost rounded-xl font-bold"
                  :disabled="savingRule"
                  @click="showFormPanel = false"
                >
                  Batal
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-primary rounded-xl font-bold px-5"
                  :disabled="savingRule"
                  @click="handleSaveRule"
                >
                  <span v-if="savingRule" class="loading loading-spinner loading-xs"></span>
                  <span>{{ editingHargaId ? "Simpan Perubahan" : inputMode === "bulk" ? "Generate Matriks" : "Simpan Aturan" }}</span>
                </button>
              </div>
            </section>

            <!-- Daftar Aturan Matriks -->
            <div v-if="hargaRules.length === 0" class="py-10 text-center bg-base-200/30 border border-dashed border-base-content/15 rounded-2xl">
              <Coins class="w-10 h-10 mx-auto text-base-content/30 mb-2" />
              <p class="font-bold text-sm text-base-content/75">
                Belum ada aturan harga untuk tindakan ini
              </p>
              <p class="text-xs text-base-content/50 mt-1">
                Tambahkan tarif dasar (Semua Unit/Penjamin/Kelas) atau variasi spesifik per Unit, Penjamin, & Kelas.
              </p>
            </div>

            <div v-else class="space-y-3">
              <!-- Desktop Table -->
              <div class="hidden lg:block overflow-x-auto border border-base-content/10 rounded-2xl">
                <table class="table table-sm w-full">
                  <thead>
                    <tr class="bg-base-200/70 text-[11px] uppercase tracking-wider text-base-content/60">
                      <th class="py-3 px-3">Unit / Penjamin / Kelas</th>
                      <th class="py-3 px-3 text-right">Sarana</th>
                      <th class="py-3 px-3 text-right">BHP</th>
                      <th class="py-3 px-3 text-right text-sky-600 dark:text-sky-400">Jasa Dokter</th>
                      <th class="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Jasa Nakes</th>
                      <th class="py-3 px-3 text-right">Total Tarif</th>
                      <th class="py-3 px-3">Berlaku / Status</th>
                      <th v-if="canManage || canDelete" class="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-base-content/5 text-xs">
                    <tr
                      v-for="rule in hargaRules"
                      :key="rule.id"
                      class="hover:bg-base-200/40 transition"
                    >
                      <td class="py-3 px-3">
                        <div class="flex flex-wrap items-center gap-1 mb-1">
                          <span
                            class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                            :class="getScoreBadgeClass(rule.specificityScore)"
                          >
                            Skor {{ rule.specificityScore }} • {{ rule.specificityLabel }}
                          </span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 text-[11px]">
                          <span class="badge badge-sm rounded-lg" :class="rule.unit ? 'badge-info badge-outline' : 'badge-ghost'">
                            {{ rule.unit?.nama || "Semua Unit" }}
                          </span>
                          <span class="badge badge-sm rounded-lg" :class="rule.penjamin ? 'badge-success badge-outline' : 'badge-ghost'">
                            {{ rule.penjamin?.nama || "Semua Penjamin" }}
                          </span>
                          <span class="badge badge-sm rounded-lg" :class="rule.kelas ? 'badge-warning badge-outline' : 'badge-ghost'">
                            {{ rule.kelas?.nama || "Semua Kelas" }}
                          </span>
                        </div>
                      </td>
                      <td class="py-3 px-3 text-right tabular-nums">{{ formatRupiah(rule.jasaSarana) }}</td>
                      <td class="py-3 px-3 text-right tabular-nums">{{ formatRupiah(rule.bhp) }}</td>
                      <td class="py-3 px-3 text-right tabular-nums font-semibold text-sky-600 dark:text-sky-400">
                        {{ formatRupiah(rule.jasaDokter) }}
                      </td>
                      <td class="py-3 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {{ formatRupiah(rule.jasaNakes) }}
                      </td>
                      <td class="py-3 px-3 text-right tabular-nums font-extrabold text-primary">
                        {{ formatRupiah(rule.totalTarif) }}
                      </td>
                      <td class="py-3 px-3">
                        <div class="text-[11px] font-mono text-base-content/70">
                          {{ rule.berlakuMulai }}
                          <span v-if="rule.berlakuSampai">→ {{ rule.berlakuSampai }}</span>
                          <span v-else class="text-base-content/40">→ dst</span>
                        </div>
                        <span
                          class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          :class="
                            rule.status === 'Y'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          "
                        >
                          {{ rule.status === "Y" ? "Aktif" : "Nonaktif" }}
                        </span>
                      </td>
                      <td v-if="canManage || canDelete" class="py-3 px-3 text-right">
                        <div class="inline-flex items-center gap-1">
                          <button
                            v-if="canManage"
                            type="button"
                            class="btn btn-xs btn-ghost btn-square rounded-lg text-base-content/60 hover:text-primary"
                            title="Duplikat aturan ini ke form"
                            @click="duplicateRuleToForm(rule)"
                          >
                            <Copy class="w-3.5 h-3.5" />
                          </button>
                          <button
                            v-if="canManage"
                            type="button"
                            class="btn btn-xs btn-ghost btn-square rounded-lg text-base-content/60 hover:text-primary"
                            title="Edit aturan"
                            @click="openEditRuleForm(rule)"
                          >
                            <Pencil class="w-3.5 h-3.5" />
                          </button>
                          <button
                            v-if="canDelete"
                            type="button"
                            class="btn btn-xs btn-ghost btn-square rounded-lg text-base-content/60 hover:text-error"
                            title="Hapus aturan"
                            :disabled="deletingId === rule.id"
                            @click="handleDeleteRule(rule)"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile Cards -->
              <div class="lg:hidden space-y-2.5">
                <div
                  v-for="rule in hargaRules"
                  :key="rule.id"
                  class="bg-base-200/30 border border-base-content/10 rounded-2xl p-3.5 space-y-2.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <span
                      class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                      :class="getScoreBadgeClass(rule.specificityScore)"
                    >
                      Skor {{ rule.specificityScore }} • {{ rule.specificityLabel }}
                    </span>
                    <span class="font-black text-sm text-primary tabular-nums">
                      {{ formatRupiah(rule.totalTarif) }}
                    </span>
                  </div>

                  <div class="flex flex-wrap gap-1.5 text-[11px]">
                    <span class="badge badge-sm rounded-lg" :class="rule.unit ? 'badge-info badge-outline' : 'badge-ghost'">
                      {{ rule.unit?.nama || "Semua Unit" }}
                    </span>
                    <span class="badge badge-sm rounded-lg" :class="rule.penjamin ? 'badge-success badge-outline' : 'badge-ghost'">
                      {{ rule.penjamin?.nama || "Semua Penjamin" }}
                    </span>
                    <span class="badge badge-sm rounded-lg" :class="rule.kelas ? 'badge-warning badge-outline' : 'badge-ghost'">
                      {{ rule.kelas?.nama || "Semua Kelas" }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs bg-base-100 rounded-xl p-2.5 border border-base-content/5">
                    <div>Sarana: <strong>{{ formatRupiah(rule.jasaSarana) }}</strong></div>
                    <div>BHP: <strong>{{ formatRupiah(rule.bhp) }}</strong></div>
                    <div class="text-sky-600 dark:text-sky-400">
                      Dokter: <strong>{{ formatRupiah(rule.jasaDokter) }}</strong>
                    </div>
                    <div class="text-emerald-600 dark:text-emerald-400">
                      Nakes: <strong>{{ formatRupiah(rule.jasaNakes) }}</strong>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-1">
                    <span class="text-[11px] font-mono text-base-content/60">
                      {{ rule.berlakuMulai }} • {{ rule.status === "Y" ? "Aktif" : "Nonaktif" }}
                    </span>
                    <div v-if="canManage || canDelete" class="flex items-center gap-1">
                      <button
                        v-if="canManage"
                        type="button"
                        class="btn btn-xs btn-ghost rounded-lg"
                        @click="duplicateRuleToForm(rule)"
                      >
                        Salin
                      </button>
                      <button
                        v-if="canManage"
                        type="button"
                        class="btn btn-xs btn-ghost rounded-lg text-primary"
                        @click="openEditRuleForm(rule)"
                      >
                        Edit
                      </button>
                      <button
                        v-if="canDelete"
                        type="button"
                        class="btn btn-xs btn-ghost rounded-lg text-error"
                        @click="handleDeleteRule(rule)"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- TAB 2: SIMULATOR -->
          <template v-else>
            <div class="bg-base-200/35 border border-base-content/10 rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary">
                  Simulator Penentuan Tarif (Prioritas: Unit → Penjamin → Kelas)
                </h4>
                <p class="text-xs text-base-content/60 mt-0.5">
                  Pilih konteks layanan pasien untuk mengecek aturan mana yang otomatis terpilih beserta pembagian jasa dokter & nakes.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">Unit</label>
                  <Select2
                    v-model="simForm.unitId"
                    :options="unitSelectOptions"
                    label-key="displayLabel"
                    value-key="id"
                    :show-default-option="true"
                    default-option-text="-- Tanpa Unit Spesifik --"
                    placeholder="Pilih Unit..."
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">Penjamin</label>
                  <Select2
                    v-model="simForm.penjaminId"
                    :options="penjaminSelectOptions"
                    label-key="displayLabel"
                    value-key="id"
                    :show-default-option="true"
                    default-option-text="-- Tanpa Penjamin Spesifik --"
                    placeholder="Pilih Penjamin..."
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">Kelas</label>
                  <Select2
                    v-model="simForm.kelasId"
                    :options="kelasSelectOptions"
                    label-key="displayLabel"
                    value-key="id"
                    :show-default-option="true"
                    default-option-text="-- Non-Kelas / Default --"
                    placeholder="Pilih Kelas..."
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">Tanggal Layanan</label>
                  <FlatpickrDate v-model="simForm.tanggal" size="sm" :clearable="false" />
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  type="button"
                  class="btn btn-sm btn-primary rounded-xl font-bold px-5 gap-2"
                  :disabled="resolvingSim"
                  @click="runSimulator"
                >
                  <span v-if="resolvingSim" class="loading loading-spinner loading-xs"></span>
                  <Play v-else class="w-3.5 h-3.5" />
                  Cek Tarif Efektif
                </button>
              </div>
            </div>

            <div
              v-if="simResult"
              class="border rounded-2xl p-4 sm:p-5 space-y-4"
              :class="simResult.found ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-rose-500/5 border-rose-500/25'"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-base-content/60">
                    Hasil Resolusi ({{ simResult.prioritas }})
                  </span>
                  <p class="text-sm font-bold mt-0.5">
                    {{ simResult.keteranganKecocokan }}
                  </p>
                </div>
                <div v-if="simResult.rincian" class="text-left sm:text-right">
                  <span class="text-xs text-base-content/60 block">Total Tagihan Pasien</span>
                  <span class="text-2xl font-black text-primary tabular-nums">
                    {{ formatRupiah(simResult.rincian.totalTarif) }}
                  </span>
                </div>
              </div>

              <div
                v-if="simResult.rincian"
                class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-base-100 rounded-xl p-3.5 border border-base-content/10 text-xs"
              >
                <div>
                  <span class="text-base-content/60 block">Jasa Sarana / RS</span>
                  <strong class="text-sm tabular-nums">{{ formatRupiah(simResult.rincian.jasaSarana) }}</strong>
                </div>
                <div>
                  <span class="text-base-content/60 block">BHP / Bahan</span>
                  <strong class="text-sm tabular-nums">{{ formatRupiah(simResult.rincian.bhp) }}</strong>
                </div>
                <div>
                  <span class="text-sky-600 dark:text-sky-400 block font-semibold">Jasa Dokter</span>
                  <strong class="text-sm text-sky-600 dark:text-sky-400 tabular-nums">{{ formatRupiah(simResult.rincian.jasaDokter) }}</strong>
                </div>
                <div>
                  <span class="text-emerald-600 dark:text-emerald-400 block font-semibold">Jasa Nakes</span>
                  <strong class="text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">{{ formatRupiah(simResult.rincian.jasaNakes) }}</strong>
                </div>
              </div>

              <div v-if="simResult.kandidatTerurut.length > 1" class="text-xs space-y-1.5">
                <span class="font-bold text-base-content/70">Kandidat yang cocok (diurutkan dari prioritas tertinggi):</span>
                <div
                  v-for="(cand, idx) in simResult.kandidatTerurut"
                  :key="cand.id"
                  class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-base-100 border border-base-content/10"
                >
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-bold" :class="idx === 0 ? 'text-primary' : 'text-base-content/50'">#{{ idx + 1 }}</span>
                    <span class="font-semibold">{{ cand.specificityLabel }} (Skor {{ cand.specificityScore }})</span>
                    <span class="text-base-content/50">
                      — {{ cand.unit?.nama || "Semua Unit" }} / {{ cand.penjamin?.nama || "Semua Penjamin" }} / {{ cand.kelas?.nama || "Semua Kelas" }}
                    </span>
                  </div>
                  <strong class="tabular-nums">{{ formatRupiah(cand.totalTarif) }}</strong>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="flex-none modal-action pt-3 mt-2 border-t border-base-content/10">
          <button
            type="button"
            class="btn btn-ghost rounded-2xl font-bold px-6"
            :disabled="savingRule"
            @click="handleClose"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

