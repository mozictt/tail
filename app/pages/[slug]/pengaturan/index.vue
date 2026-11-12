<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Building2,
  ClipboardPlus,
  Hash,
  Info,
  RotateCcw,
  Save,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useTenantSettingsStore } from "@/stores/tenant-settings";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatNoRmFromConfig,
  NO_RM_PRESET_OPTIONS,
} from "@/utils/format-no-rm.util";
import {
  DEFAULT_TENANT_SETTINGS,
  type TenantNoRmPresetKode,
  type TenantNoRmSetting,
  type TenantPendaftaranSetting,
  type UpdateTenantSettingsPayload,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Pengaturan & Kustomisasi Tenant",
});

const authStore = useAuthStore();
const tenantSettingsStore = useTenantSettingsStore();
const { canWrite } = usePermission();
const { showToast } = useToast();

const ROUTE_PATH = "/pengaturan";
const RESOURCE_NAME = "Pengaturan";

const isMasterAdmin = computed(
  () => Boolean(authStore.isMasterTenant && authStore.isSuperAdmin),
);
const canSaveSettings = computed(
  () => isMasterAdmin.value || canWrite(ROUTE_PATH, RESOURCE_NAME),
);

type SettingsTab = "no-rm" | "pendaftaran";
const activeTab = ref<SettingsTab>("no-rm");

const loading = ref(false);
const saving = ref(false);
const activeTenantLabel = ref("");
const activeTenantSlug = ref("");

interface SettingsFormState {
  noRm: {
    mode: "PRESET" | "CUSTOM";
    presetKode: TenantNoRmPresetKode;
    jumlahDigit: number;
    prefix: string;
    suffix: string;
    panjangBlok: number | "";
    pemisahBlok: "-" | "." | "/";
    izinkanPilihFormatDiPendaftaran: boolean;
  };
  pendaftaran: TenantPendaftaranSetting;
}

const createDefaultFormState = (): SettingsFormState => ({
  noRm: {
    mode: DEFAULT_TENANT_SETTINGS.noRm.mode,
    presetKode: DEFAULT_TENANT_SETTINGS.noRm.presetKode,
    jumlahDigit: DEFAULT_TENANT_SETTINGS.noRm.jumlahDigit,
    prefix: "",
    suffix: "",
    panjangBlok: "",
    pemisahBlok: "-",
    izinkanPilihFormatDiPendaftaran:
      DEFAULT_TENANT_SETTINGS.noRm.izinkanPilihFormatDiPendaftaran,
  },
  pendaftaran: {
    ...DEFAULT_TENANT_SETTINGS.pendaftaran,
  },
});

const form = ref<SettingsFormState>(createDefaultFormState());
const errors = ref<{
  jumlahDigit?: string;
  panjangBlok?: string;
  judulHalaman?: string;
  judulHalamanSukses?: string;
}>({});

const blockLengthOptions = [
  { value: "", label: "Tanpa Pemisah Blok (Polos)" },
  { value: 2, label: "Per 2 Digit (00-00-01)" },
  { value: 3, label: "Per 3 Digit (000-001)" },
  { value: 4, label: "Per 4 Digit (0000-0001)" },
];

const delimiterOptions: Array<{ value: "-" | "." | "/"; label: string }> = [
  { value: "-", label: "Strip (-)" },
  { value: ".", label: "Titik (.)" },
  { value: "/", label: "Garis Miring (/)" },
];

const effectivePattern = computed(() => {
  const n = form.value.noRm;
  if (n.mode === "PRESET" && n.presetKode !== "CUSTOM") {
    const preset = NO_RM_PRESET_OPTIONS.find((p) => p.kode === n.presetKode);
    if (preset) return preset.pattern;
  }
  return {
    jumlahDigit: Number(n.jumlahDigit) || 8,
    prefix: n.prefix.trim() || null,
    suffix: n.suffix.trim() || null,
    panjangBlok: n.panjangBlok ? Number(n.panjangBlok) : null,
    pemisahBlok: n.panjangBlok ? n.pemisahBlok : null,
  };
});

const previewSeq1 = computed(() =>
  formatNoRmFromConfig(1, effectivePattern.value),
);
const previewSeq25 = computed(() =>
  formatNoRmFromConfig(25, effectivePattern.value),
);
const previewSeq1234 = computed(() =>
  formatNoRmFromConfig(1234, effectivePattern.value),
);

const applySettingsToForm = (
  noRm: TenantNoRmSetting,
  pendaftaran: TenantPendaftaranSetting,
) => {
  form.value = {
    noRm: {
      mode: noRm.mode === "CUSTOM" ? "CUSTOM" : "PRESET",
      presetKode: noRm.presetKode || "PLAIN_8",
      jumlahDigit: Number(noRm.jumlahDigit || 8),
      prefix: noRm.prefix || "",
      suffix: noRm.suffix || "",
      panjangBlok:
        noRm.panjangBlok && Number(noRm.panjangBlok) >= 2
          ? Number(noRm.panjangBlok)
          : "",
      pemisahBlok: noRm.pemisahBlok || "-",
      izinkanPilihFormatDiPendaftaran: Boolean(
        noRm.izinkanPilihFormatDiPendaftaran,
      ),
    },
    pendaftaran: {
      judulHalaman:
        pendaftaran.judulHalaman ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.judulHalaman,
      subjudulHalaman:
        pendaftaran.subjudulHalaman ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.subjudulHalaman,
      judulHalamanSukses:
        pendaftaran.judulHalamanSukses ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.judulHalamanSukses,
      subjudulHalamanSukses:
        pendaftaran.subjudulHalamanSukses ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.subjudulHalamanSukses,
    },
  };
  errors.value = {};
};

const selectPreset = (kode: Exclude<TenantNoRmPresetKode, "CUSTOM">) => {
  const preset = NO_RM_PRESET_OPTIONS.find((item) => item.kode === kode);
  if (!preset) return;
  form.value.noRm = {
    ...form.value.noRm,
    mode: "PRESET",
    presetKode: kode,
    jumlahDigit: preset.pattern.jumlahDigit,
    prefix: preset.pattern.prefix || "",
    suffix: preset.pattern.suffix || "",
    panjangBlok: preset.pattern.panjangBlok ?? "",
    pemisahBlok:
      (preset.pattern.pemisahBlok as "-" | "." | "/") || "-",
  };
  errors.value.jumlahDigit = undefined;
  errors.value.panjangBlok = undefined;
};

const selectCustomMode = () => {
  form.value.noRm.mode = "CUSTOM";
  form.value.noRm.presetKode = "CUSTOM";
};

const loadSettings = async () => {
  loading.value = true;
  try {
    await tenantSettingsStore.fetchSettings(true);
    activeTenantLabel.value = tenantSettingsStore.tenantName;
    activeTenantSlug.value = tenantSettingsStore.tenantSlug;
    applySettingsToForm(
      tenantSettingsStore.noRm,
      tenantSettingsStore.pendaftaran,
    );
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat pengaturan tenant"),
      "error",
    );
  } finally {
    loading.value = false;
  }
};

const validateForm = (): boolean => {
  const nextErrors: typeof errors.value = {};
  const digits = Number(form.value.noRm.jumlahDigit);

  if (form.value.noRm.mode === "CUSTOM") {
    if (!Number.isInteger(digits) || digits < 3 || digits > 12) {
      nextErrors.jumlahDigit = "Jumlah digit No. RM harus antara 3 sampai 12";
    }
    if (
      form.value.noRm.panjangBlok !== "" &&
      Number(form.value.noRm.panjangBlok) > digits
    ) {
      nextErrors.panjangBlok =
        "Panjang blok tidak boleh melebihi jumlah digit";
    }
  }

  if (previewSeq1.value.length > 30) {
    nextErrors.jumlahDigit =
      "Hasil format No. RM tidak boleh melebihi 30 karakter";
  }

  if (!form.value.pendaftaran.judulHalaman.trim()) {
    nextErrors.judulHalaman = "Judul halaman pendaftaran wajib diisi";
  }

  if (!form.value.pendaftaran.judulHalamanSukses.trim()) {
    nextErrors.judulHalamanSukses = "Judul halaman sukses wajib diisi";
  }

  errors.value = nextErrors;
  return Object.values(nextErrors).every((v) => !v);
};

const buildPayload = (): UpdateTenantSettingsPayload => {
  const n = form.value.noRm;
  const p = form.value.pendaftaran;
  const isCustom = n.mode === "CUSTOM";
  const blockSize = isCustom && n.panjangBlok ? Number(n.panjangBlok) : null;

  return {
    noRm: {
      mode: n.mode,
      presetKode: isCustom ? "CUSTOM" : n.presetKode,
      jumlahDigit: effectivePattern.value.jumlahDigit,
      prefix: isCustom ? n.prefix.trim() || null : null,
      suffix: isCustom ? n.suffix.trim() || null : null,
      panjangBlok: blockSize,
      pemisahBlok: blockSize ? n.pemisahBlok : null,
      izinkanPilihFormatDiPendaftaran: Boolean(
        n.izinkanPilihFormatDiPendaftaran,
      ),
    },
    pendaftaran: {
      judulHalaman: p.judulHalaman.trim(),
      subjudulHalaman: p.subjudulHalaman.trim(),
      judulHalamanSukses: p.judulHalamanSukses.trim(),
      subjudulHalamanSukses: p.subjudulHalamanSukses.trim(),
    },
  };
};

const handleSave = async () => {
  if (!canSaveSettings.value) {
    showToast("Anda tidak memiliki akses untuk mengubah pengaturan", "error");
    return;
  }
  if (!validateForm() || saving.value) return;

  saving.value = true;
  try {
    const payload = buildPayload();
    const res = await tenantSettingsStore.updateCurrentSettings(payload);

    applySettingsToForm(res.settings.noRm, res.settings.pendaftaran);
    showToast(
      `Pengaturan untuk "${res.tenantName}" berhasil disimpan`,
      "success",
    );
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menyimpan pengaturan tenant"),
      "error",
    );
  } finally {
    saving.value = false;
  }
};

const handleResetDefault = () => {
  applySettingsToForm(
    DEFAULT_TENANT_SETTINGS.noRm,
    DEFAULT_TENANT_SETTINGS.pendaftaran,
  );
  showToast(
    "Form dikembalikan ke nilai standar (klik Simpan Pengaturan untuk menerapkan)",
    "info",
  );
};

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="space-y-5 max-w-5xl mx-auto">
    <!-- HEADER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-primary/10 text-primary border-primary/20 flex items-center justify-center shrink-0">
            <Settings class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
              Pengaturan & Kustomisasi Tenant
            </h1>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Atur model penomoran Rekam Medis (No. RM) dan kustomisasi teks/label modul khusus untuk masing-masing tenant
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-xl border border-base-content/15 gap-1.5 font-bold"
            :disabled="loading || saving"
            @click="handleResetDefault"
          >
            <RotateCcw class="w-4 h-4" />
            <span>Reset Standar</span>
          </button>

          <button
            v-if="canSaveSettings"
            type="button"
            class="btn btn-primary btn-sm sm:btn-md rounded-xl font-bold gap-2 shadow-sm"
            :disabled="loading || saving"
            @click="handleSave"
          >
            <span v-if="saving" class="loading loading-spinner loading-xs"></span>
            <Save v-else class="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      <div
        v-if="activeTenantLabel"
        class="rounded-xl bg-primary/8 border border-primary/20 px-3.5 py-2.5 text-xs flex items-center gap-2"
      >
        <Building2 class="w-4 h-4 text-primary shrink-0" />
        <span>
          Mengatur konfigurasi untuk tenant:
          <strong class="text-primary">{{ activeTenantLabel }}</strong>
          <span class="font-mono text-base-content/60 ml-1">(/{{ activeTenantSlug }})</span>
        </span>
      </div>
    </div>

    <!-- CATEGORY TABS -->
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="btn btn-sm rounded-xl gap-2 font-bold border"
        :class="
          activeTab === 'no-rm'
            ? 'btn-primary border-primary shadow-xs'
            : 'bg-base-100 border-base-content/10 text-base-content/70 hover:bg-base-200/60'
        "
        @click="activeTab = 'no-rm'"
      >
        <Hash class="w-4 h-4" />
        <span>Model & Format No. RM</span>
      </button>

      <button
        type="button"
        class="btn btn-sm rounded-xl gap-2 font-bold border"
        :class="
          activeTab === 'pendaftaran'
            ? 'btn-primary border-primary shadow-xs'
            : 'bg-base-100 border-base-content/10 text-base-content/70 hover:bg-base-200/60'
        "
        @click="activeTab = 'pendaftaran'"
      >
        <SlidersHorizontal class="w-4 h-4" />
        <span>Tampilan & Label Pendaftaran</span>
      </button>
    </div>

    <!-- LOADING STATE -->
    <div
      v-if="loading"
      class="bg-base-100 border border-base-content/10 rounded-2xl p-12 flex flex-col items-center gap-3 text-base-content/60"
    >
      <span class="loading loading-spinner loading-md text-primary"></span>
      <p class="text-xs font-semibold">Memuat pengaturan tenant...</p>
    </div>

    <!-- SECTION 1: MODEL NO. RM -->
    <div
      v-else-if="activeTab === 'no-rm'"
      class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-base-content/10">
        <div>
          <h2 class="text-base font-extrabold text-base-content flex items-center gap-2">
            <Hash class="w-4 h-4 text-primary" />
            <span>Model Penomoran Rekam Medis (No. RM)</span>
          </h2>
          <p class="text-xs text-base-content/60 mt-0.5">
            Tentukan format otomatis No. RM pasien baru khusus tenant ini (mis. 8 digit, 4 digit, 6 digit strip, atau pola kustom)
          </p>
        </div>
      </div>

      <!-- Preset Selector Cards -->
      <div class="space-y-2.5">
        <div class="text-xs font-bold uppercase tracking-wider text-base-content/60 flex items-center gap-1.5">
          <Sparkles class="w-3.5 h-3.5 text-primary" />
          <span>Pilih Model Penomoran</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            v-for="preset in NO_RM_PRESET_OPTIONS"
            :key="preset.kode"
            type="button"
            class="text-left p-4 rounded-2xl border transition-all space-y-1.5"
            :class="
              form.noRm.mode === 'PRESET' && form.noRm.presetKode === preset.kode
                ? 'bg-primary/10 border-primary ring-1 ring-primary/30'
                : 'bg-base-200/30 border-base-content/10 hover:border-primary/40'
            "
            @click="selectPreset(preset.kode)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-extrabold text-base-content">{{ preset.label }}</span>
              <span class="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-base-100 border border-base-content/15 text-primary">
                {{ formatNoRmFromConfig(1, preset.pattern) }}
              </span>
            </div>
            <p class="text-[11px] text-base-content/65 leading-relaxed">
              {{ preset.description }}
            </p>
          </button>

          <button
            type="button"
            class="text-left p-4 rounded-2xl border transition-all space-y-1.5"
            :class="
              form.noRm.mode === 'CUSTOM'
                ? 'bg-primary/10 border-primary ring-1 ring-primary/30'
                : 'bg-base-200/30 border-base-content/10 hover:border-primary/40'
            "
            @click="selectCustomMode"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-extrabold text-base-content">Pola Kustom</span>
              <span class="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-base-100 border border-base-content/15 text-primary">
                Custom
              </span>
            </div>
            <p class="text-[11px] text-base-content/65 leading-relaxed">
              Atur sendiri jumlah digit (3-12), prefix/suffix, dan pemisah blok
            </p>
          </button>
        </div>
      </div>

      <!-- Custom Pattern Controls -->
      <div
        v-if="form.noRm.mode === 'CUSTOM'"
        class="rounded-2xl bg-base-200/35 border border-base-content/10 p-4 sm:p-5 space-y-4"
      >
        <div class="text-xs font-extrabold uppercase tracking-wider text-base-content/70">
          Konfigurasi Pola Kustom
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Jumlah Digit <span class="text-error">*</span>
            </label>
            <input
              v-model.number="form.noRm.jumlahDigit"
              type="number"
              min="3"
              max="12"
              class="input input-bordered w-full rounded-xl h-11 text-sm font-mono font-bold"
              :class="{ 'border-error': errors.jumlahDigit }"
              @input="errors.jumlahDigit = undefined"
            />
            <span v-if="errors.jumlahDigit" class="text-xs text-error font-semibold mt-1 block">
              {{ errors.jumlahDigit }}
            </span>
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Prefix (Awalan)
            </label>
            <input
              v-model="form.noRm.prefix"
              type="text"
              maxlength="6"
              placeholder="Mis. RM-"
              class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Suffix (Akhiran)
            </label>
            <input
              v-model="form.noRm.suffix"
              type="text"
              maxlength="6"
              placeholder="Mis. -RJ"
              class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Kelompok Blok
            </label>
            <select
              v-model="form.noRm.panjangBlok"
              class="select select-bordered w-full rounded-xl h-11 text-sm"
              :class="{ 'border-error': errors.panjangBlok }"
              @change="errors.panjangBlok = undefined"
            >
              <option v-for="opt in blockLengthOptions" :key="String(opt.value)" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <span v-if="errors.panjangBlok" class="text-xs text-error font-semibold mt-1 block">
              {{ errors.panjangBlok }}
            </span>
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Pemisah Blok
            </label>
            <select
              v-model="form.noRm.pemisahBlok"
              :disabled="!form.noRm.panjangBlok"
              class="select select-bordered w-full rounded-xl h-11 text-sm"
            >
              <option v-for="opt in delimiterOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Live Preview Box -->
      <div class="rounded-2xl bg-primary/8 dark:bg-primary/15 border border-primary/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-primary">
            Preview Hasil Generate No. RM
          </div>
          <p class="text-[11px] text-base-content/70 mt-0.5">
            Panjang total: <strong>{{ previewSeq1.length }}</strong> / 30 karakter
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 font-mono">
          <span class="px-2.5 py-1 rounded-xl bg-base-100 border border-primary/30 text-sm font-extrabold text-primary">
            #1: {{ previewSeq1 }}
          </span>
          <span class="px-2.5 py-1 rounded-xl bg-base-100 border border-base-content/15 text-xs font-bold text-base-content/80">
            #25: {{ previewSeq25 }}
          </span>
          <span class="px-2.5 py-1 rounded-xl bg-base-100 border border-base-content/15 text-xs font-bold text-base-content/80">
            #1234: {{ previewSeq1234 }}
          </span>
        </div>
      </div>

      <!-- Toggle Override on Registration Form -->
      <label class="p-4 rounded-2xl bg-base-200/35 border border-base-content/10 flex items-center justify-between gap-4 cursor-pointer">
        <div class="space-y-0.5">
          <div class="text-xs sm:text-sm font-bold text-base-content">
            Izinkan operator memilih ulang format preset saat pendaftaran pasien baru
          </div>
          <p class="text-[11px] text-base-content/60">
            Jika dimatikan, form pendaftaran otomatis mengunci mengikuti model No. RM dari halaman Setting ini.
          </p>
        </div>
        <input
          v-model="form.noRm.izinkanPilihFormatDiPendaftaran"
          type="checkbox"
          class="toggle toggle-primary toggle-sm sm:toggle-md shrink-0"
        />
      </label>
    </div>

    <!-- SECTION 2: KUSTOMISASI LABEL & TEKS HALAMAN PENDAFTARAN -->
    <div
      v-else
      class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div class="pb-3 border-b border-base-content/10">
        <h2 class="text-base font-extrabold text-base-content flex items-center gap-2">
          <SlidersHorizontal class="w-4 h-4 text-primary" />
          <span>Kustomisasi Teks Halaman Pendaftaran</span>
        </h2>
        <p class="text-xs text-base-content/60 mt-0.5">
          Sesuaikan judul & keterangan halaman pendaftaran untuk kebutuhan khusus tenant (misal klinik khusus Rawat Jalan)
        </p>
      </div>

      <!-- Live Header Preview -->
      <div class="space-y-2">
        <div class="text-[11px] font-bold uppercase tracking-wider text-base-content/60">
          Preview Header Halaman Pendaftaran
        </div>
        <div class="bg-base-200/35 border border-base-content/15 rounded-2xl p-4 sm:p-5">
          <div class="flex items-start sm:items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl border bg-primary/10 text-primary border-primary/20 flex items-center justify-center shrink-0">
              <ClipboardPlus class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <div class="text-base sm:text-lg font-extrabold text-base-content tracking-tight break-words">
                {{ form.pendaftaran.judulHalaman || DEFAULT_TENANT_SETTINGS.pendaftaran.judulHalaman }}
              </div>
              <p class="text-xs text-base-content/60 mt-0.5 break-words">
                {{ form.pendaftaran.subjudulHalaman || DEFAULT_TENANT_SETTINGS.pendaftaran.subjudulHalaman }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Judul Halaman Pendaftaran <span class="text-error">*</span>
          </label>
          <input
            v-model="form.pendaftaran.judulHalaman"
            type="text"
            maxlength="120"
            placeholder="Contoh: Pendaftaran Kunjungan Pasien Rajal"
            class="input input-bordered w-full rounded-xl h-11 text-sm"
            :class="{ 'border-error': errors.judulHalaman }"
            @input="errors.judulHalaman = undefined"
          />
          <span v-if="errors.judulHalaman" class="text-xs text-error font-semibold mt-1 block">
            {{ errors.judulHalaman }}
          </span>
          <span v-else class="text-[11px] text-base-content/55 mt-1 block">
            Standar bawaan: "{{ DEFAULT_TENANT_SETTINGS.pendaftaran.judulHalaman }}"
          </span>
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Subjudul Halaman Pendaftaran
          </label>
          <textarea
            v-model="form.pendaftaran.subjudulHalaman"
            rows="2"
            maxlength="300"
            class="textarea textarea-bordered w-full rounded-xl text-sm"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Judul Halaman Setelah Simpan (Ringkasan Pasien Terdaftar) <span class="text-error">*</span>
          </label>
          <input
            v-model="form.pendaftaran.judulHalamanSukses"
            type="text"
            maxlength="120"
            class="input input-bordered w-full rounded-xl h-11 text-sm"
            :class="{ 'border-error': errors.judulHalamanSukses }"
            @input="errors.judulHalamanSukses = undefined"
          />
          <span v-if="errors.judulHalamanSukses" class="text-xs text-error font-semibold mt-1 block">
            {{ errors.judulHalamanSukses }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Subjudul Halaman Setelah Simpan
          </label>
          <textarea
            v-model="form.pendaftaran.subjudulHalamanSukses"
            rows="2"
            maxlength="300"
            class="textarea textarea-bordered w-full rounded-xl text-sm"
          ></textarea>
        </div>
      </div>

      <div class="rounded-xl bg-info/10 border border-info/25 p-3.5 text-xs text-base-content/80 flex items-start gap-2.5">
        <Info class="w-4 h-4 text-info shrink-0 mt-0.5" />
        <span>
          Seluruh pengaturan disimpan per tenant pada konfigurasi <code class="font-mono font-bold">tenants.settings</code> dan dapat diperluas untuk kustomisasi modul lainnya di masa mendatang.
        </span>
      </div>
    </div>
  </div>
</template>

