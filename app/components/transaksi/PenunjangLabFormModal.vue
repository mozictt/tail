<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  CheckCircle2,
  Coins,
  FlaskConical,
  Microscope,
  Search,
  UserCheck,
  X,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import LabHasilInputControl from "@/components/transaksi/LabHasilInputControl.vue";
import { PenunjangLabService } from "@/services/penunjang-lab.service";
import { TarifService } from "@/services/tarif.service";
import { UnitService } from "@/services/unit.service";
import { DokterService } from "@/services/dokter.service";
import { PegawaiService, type PegawaiItem } from "@/services/pegawai.service";
import { useCurrency } from "@/composables/useCurrency";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  calculateAgeLabel,
  FlagHasilLab,
  getFlagHasilLabBadgeClass,
  getFlagHasilLabLabel,
  getOptionLabel,
  getStatusKunjunganBadgeClass,
  getStatusPembayaranBadgeClass,
  JenisTarif,
  JenisUnit,
  STATUS_KUNJUNGAN_OPTIONS,
  STATUS_PEMBAYARAN_KUNJUNGAN_OPTIONS,
  TipeHasilLab,
  type DokterItem,
  type PenunjangLabEligibleKunjunganItem,
  type PenunjangLabHasilDetail,
  type PenunjangLabOrderItem,
  type PenunjangLabPreviewResponse,
  type PreviewTindakanParameterItem,
  type TarifOptionItem,
  type UnitOptionItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    kunjungan?: PenunjangLabEligibleKunjunganItem | null;
    editOrderId?: number | null;
  }>(),
  {
    kunjungan: null,
    editOrderId: null,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: PenunjangLabOrderItem): void;
}>();

const penunjangLabService = PenunjangLabService();
const tarifService = TarifService();
const unitService = UnitService();
const dokterService = DokterService();
const pegawaiService = PegawaiService();
const { formatRupiah } = useCurrency();
const { slugPath } = useSlugRoute();
const { showToast } = useToast();

const isEditMode = computed(() => Boolean(props.editOrderId));
const loadingInit = ref(false);
const loadingPreview = ref(false);
const saving = ref(false);

const unitLabOptions = ref<UnitOptionItem[]>([]);
const dokterOptions = ref<DokterItem[]>([]);
const pegawaiOptions = ref<PegawaiItem[]>([]);
const labTindakanOptions = ref<TarifOptionItem[]>([]);

const orderDetail = ref<PenunjangLabOrderItem | null>(null);
const previewData = ref<PenunjangLabPreviewResponse | null>(null);

const tindakanSearch = ref("");
const selectedTindakanIds = ref<number[]>([]);

const unitLabId = ref<number | undefined>(undefined);
const dokterLabId = ref<number | undefined>(undefined);
const petugasLabId = ref<number | undefined>(undefined);
const isCito = ref(false);
const diagnosaKlinis = ref("");
const catatanKlinis = ref("");
const kesanLab = ref("");

// Create mode map: `${tindakanId}:${parameterId}` -> { hasilNilai, catatan }
const createInputs = ref<
  Record<string, { hasilNilai: string; catatan: string }>
>({});

// Edit mode list mapped by hasil row id
const editHasilRows = ref<
  Array<
    PenunjangLabHasilDetail & {
      inputNilai: string;
      inputCatatan: string;
      itemNama: string;
    }
  >
>([]);

const activePatientSummary = computed(() => {
  if (isEditMode.value && orderDetail.value) {
    const p = orderDetail.value.pasien;
    const pen = orderDetail.value.pendaftaran;
    return {
      noLab: orderDetail.value.noLab,
      noRegistrasi: pen?.noRegistrasi || "-",
      noRm: p?.noRm || "-",
      nama: p?.penduduk?.namaLengkap || "-",
      jenisKelamin: p?.penduduk?.jenisKelamin || "-",
      umur: calculateAgeLabel(p?.penduduk?.tanggalLahir),
      unitNama: orderDetail.value.unitPengirim?.nama || "-",
      penjaminNama: pen?.namaPenjaminSnapshot || "Umum",
      kelasNama: pen?.kelasSaatIni?.nama || "Non-Kelas / Rajal",
      statusKunjungan: pen?.statusKunjungan,
      statusPembayaran: orderDetail.value.statusPembayaran,
    };
  }
  if (props.kunjungan) {
    const k = props.kunjungan;
    const p = k.pasien;
    return {
      noLab: "Otomatis saat disimpan",
      noRegistrasi: k.noRegistrasi,
      noRm: p?.noRm || "-",
      nama: p?.penduduk?.namaLengkap || "-",
      jenisKelamin: p?.penduduk?.jenisKelamin || "-",
      umur: calculateAgeLabel(p?.penduduk?.tanggalLahir),
      unitNama: k.unitSaatIni?.nama || "-",
      penjaminNama: k.namaPenjaminSnapshot || "Umum",
      kelasNama: k.kelasSaatIni?.nama || "Non-Kelas / Rajal",
      statusKunjungan: k.statusKunjungan,
      statusPembayaran: k.statusPembayaran || "BELUM_BAYAR",
    };
  }
  return null;
});

const unitSelectOptions = computed(() =>
  unitLabOptions.value.map((u) => ({
    id: u.id,
    displayLabel: `${u.kode} — ${u.nama}`,
  })),
);

const dokterSelectOptions = computed(() =>
  dokterOptions.value.map((d) => ({
    id: d.id,
    displayLabel:
      d.namaLengkapGelar ||
      `${d.kodeDokter} — ${d.penduduk?.namaLengkap || "Dokter"}`,
  })),
);

const pegawaiSelectOptions = computed(() =>
  pegawaiOptions.value.map((p) => ({
    id: p.id,
    displayLabel: `${p.nip} — ${p.name}${p.position ? ` (${p.position})` : ""}`,
  })),
);

const filteredLabTindakanOptions = computed(() => {
  const q = tindakanSearch.value.trim().toLowerCase();
  if (!q) return labTindakanOptions.value;
  return labTindakanOptions.value.filter(
    (t) =>
      t.kode.toLowerCase().includes(q) ||
      t.nama.toLowerCase().includes(q) ||
      (t.kelompokTarif || "").toLowerCase().includes(q),
  );
});

const editGroupedItems = computed(() => {
  if (!orderDetail.value) return [];
  const items = orderDetail.value.items ?? [];
  return items.map((item) => ({
    item,
    rows: editHasilRows.value.filter((h) => h.penunjangLabItemId === item.id),
  }));
});

const hasBounds = (bounds: {
  nilaiMin: number | null;
  nilaiMax: number | null;
  kritisMin: number | null;
  kritisMax: number | null;
}): boolean =>
  bounds.nilaiMin !== null ||
  bounds.nilaiMax !== null ||
  bounds.kritisMin !== null ||
  bounds.kritisMax !== null;

const evaluateClientFlag = (
  rawVal: string,
  tipeHasil: TipeHasilLab,
  bounds: {
    nilaiMin: number | null;
    nilaiMax: number | null;
    kritisMin: number | null;
    kritisMax: number | null;
    nilaiNormalText?: string | null;
  },
): FlagHasilLab | null => {
  const trimmed = rawVal.trim();
  if (!trimmed) return null;

  if (tipeHasil === TipeHasilLab.NUMERIC) {
    const num = Number(trimmed.replace(/,/g, "."));
    if (Number.isFinite(num)) {
      if (bounds.kritisMin !== null && num < bounds.kritisMin) {
        return FlagHasilLab.CRITICAL_LOW;
      }
      if (bounds.kritisMax !== null && num > bounds.kritisMax) {
        return FlagHasilLab.CRITICAL_HIGH;
      }
      if (bounds.nilaiMin !== null && num < bounds.nilaiMin) {
        return FlagHasilLab.LOW;
      }
      if (bounds.nilaiMax !== null && num > bounds.nilaiMax) {
        return FlagHasilLab.HIGH;
      }
      if (bounds.nilaiMin !== null || bounds.nilaiMax !== null) {
        return FlagHasilLab.NORMAL;
      }
      if (!bounds.nilaiNormalText?.trim()) return null;
    } else if (hasBounds(bounds)) {
      return null;
    }
  }

  const normalText = bounds.nilaiNormalText?.trim();
  if (!normalText || normalText === "-") return null;
  const tokens = normalText
    .split(/[|/,]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return tokens.includes(trimmed.toLowerCase()) ||
    normalText.toLowerCase() === trimmed.toLowerCase()
    ? FlagHasilLab.NORMAL
    : FlagHasilLab.ABNORMAL;
};

const getPreviewInputKey = (
  tindakanId: number,
  parameterId: number | null,
): string => `${tindakanId}:${parameterId ?? "direct"}`;

const getOrCreateInputEntry = (
  tindakanId: number,
  parameterId: number | null,
) => {
  const key = getPreviewInputKey(tindakanId, parameterId);
  if (!createInputs.value[key]) {
    createInputs.value[key] = { hasilNilai: "", catatan: "" };
  }
  return createInputs.value[key]!;
};

const getPreviewParamFlag = (
  tindakanId: number,
  param: PreviewTindakanParameterItem,
): FlagHasilLab | null =>
  evaluateClientFlag(
    createInputs.value[getPreviewInputKey(tindakanId, param.parameterId)]
      ?.hasilNilai || "",
    param.tipeHasil,
    {
      nilaiMin: param.rujukan?.nilaiMin ?? null,
      nilaiMax: param.rujukan?.nilaiMax ?? null,
      kritisMin: param.rujukan?.kritisMin ?? null,
      kritisMax: param.rujukan?.kritisMax ?? null,
      nilaiNormalText: param.rujukan?.nilaiNormalText,
    },
  );

const getEditRowFlag = (row: PenunjangLabHasilDetail & { inputNilai: string }) =>
  evaluateClientFlag(row.inputNilai, row.tipeHasilSnapshot, {
    nilaiMin: row.nilaiRujukanMinSnapshot,
    nilaiMax: row.nilaiRujukanMaxSnapshot,
    kritisMin: row.kritisMinSnapshot,
    kritisMax: row.kritisMaxSnapshot,
    nilaiNormalText: row.nilaiNormalTextSnapshot,
  });

const loadMasterOptions = async () => {
  const [unitRes, dokterRes, pegawaiRes, tindakanRes] =
    await Promise.allSettled([
      unitService.getUnitOptions({ jenisUnit: JenisUnit.LABORATORIUM }),
      dokterService.getDokter({ page: 1, limit: 100, status: "Y" }),
      pegawaiService.getPegawai({ page: 1, limit: 100 }),
      tarifService.getTarifOptions({ jenisTarif: JenisTarif.LABORATORIUM }),
    ]);

  if (unitRes.status === "fulfilled") {
    unitLabOptions.value = unitRes.value;
    if (!isEditMode.value && unitRes.value.length === 1 && !unitLabId.value) {
      unitLabId.value = unitRes.value[0]!.id;
    }
  }
  if (dokterRes.status === "fulfilled") {
    dokterOptions.value = dokterRes.value.items;
  }
  if (pegawaiRes.status === "fulfilled") {
    pegawaiOptions.value = pegawaiRes.value.array;
  }
  if (tindakanRes.status === "fulfilled") {
    labTindakanOptions.value = tindakanRes.value;
  }
};

const refreshPreview = async () => {
  if (!props.kunjungan || selectedTindakanIds.value.length === 0) {
    previewData.value = null;
    return;
  }
  loadingPreview.value = true;
  try {
    const res = await penunjangLabService.previewTindakan({
      pendaftaranId: props.kunjungan.id,
      tindakanIds: selectedTindakanIds.value,
      unitLabId: unitLabId.value,
    });
    previewData.value = res;

    // Ensure reactive input entries exist for each parameter (termasuk tindakan tunggal tanpa anakan)
    for (const block of res.items) {
      for (const param of block.parameters) {
        getOrCreateInputEntry(block.tindakan.id, param.parameterId);
      }
    }
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat preview pemeriksaan & tarif lab"),
      "error",
    );
  } finally {
    loadingPreview.value = false;
  }
};

watch([selectedTindakanIds, unitLabId], () => {
  if (!isEditMode.value && props.show) {
    refreshPreview();
  }
});

watch(
  () => [props.show, props.kunjungan?.id, props.editOrderId] as const,
  async ([isOpen, _kId, targetOrderId]) => {
    if (!isOpen) return;
    loadingInit.value = true;
    orderDetail.value = null;
    previewData.value = null;
    selectedTindakanIds.value = [];
    tindakanSearch.value = "";
    createInputs.value = {};
    editHasilRows.value = [];
    unitLabId.value = undefined;
    dokterLabId.value = undefined;
    petugasLabId.value = undefined;
    isCito.value = false;
    diagnosaKlinis.value = "";
    catatanKlinis.value = "";
    kesanLab.value = "";

    try {
      await loadMasterOptions();
      if (targetOrderId) {
        const detail = await penunjangLabService.getOrderById(targetOrderId);
        orderDetail.value = detail;
        unitLabId.value = detail.unitLabId ?? undefined;
        dokterLabId.value = detail.dokterLabId ?? undefined;
        petugasLabId.value = detail.petugasLabId ?? undefined;
        isCito.value = detail.isCito;
        diagnosaKlinis.value = detail.diagnosaKlinis || "";
        catatanKlinis.value = detail.catatanKlinis || "";
        kesanLab.value = detail.kesanLab || "";

        const itemNameById = new Map<number, string>();
        for (const it of detail.items ?? []) {
          itemNameById.set(it.id, it.namaTindakanSnapshot);
        }

        editHasilRows.value = (detail.hasilList ?? []).map((row) => ({
          ...row,
          inputNilai: row.hasilNilai || "",
          inputCatatan: row.catatan || "",
          itemNama: itemNameById.get(row.penunjangLabItemId) || "",
        }));
      }
    } catch (err: unknown) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat form penunjang lab"),
        "error",
      );
      emit("close");
    } finally {
      loadingInit.value = false;
    }
  },
  { immediate: true },
);

const toggleTindakanSelection = (tindakanId: number) => {
  const idx = selectedTindakanIds.value.indexOf(tindakanId);
  if (idx >= 0) {
    selectedTindakanIds.value = selectedTindakanIds.value.filter(
      (id) => id !== tindakanId,
    );
  } else {
    selectedTindakanIds.value = [...selectedTindakanIds.value, tindakanId];
  }
};

const handleSave = async (tandaiSelesaiInput: boolean) => {
  saving.value = true;
  try {
    if (isEditMode.value && props.editOrderId) {
      const saved = await penunjangLabService.saveHasil(props.editOrderId, {
        dokterLabId: dokterLabId.value ?? null,
        petugasLabId: petugasLabId.value ?? null,
        kesanLab: kesanLab.value.trim() || null,
        tandaiSelesaiInput,
        hasilList: editHasilRows.value.map((row) => ({
          id: row.id,
          hasilNilai: row.inputNilai.trim() || null,
          catatan: row.inputCatatan.trim() || null,
        })),
      });
      showToast(
        tandaiSelesaiInput
          ? `Hasil lab ${saved.noLab} selesai diinput`
          : `Draft hasil lab ${saved.noLab} berhasil disimpan`,
        "success",
      );
      emit("saved", saved);
      emit("close");
      return;
    }

    if (!props.kunjungan) return;
    if (selectedTindakanIds.value.length === 0) {
      showToast("Pilih minimal 1 pemeriksaan laboratorium", "error");
      return;
    }

    const hasilInputs: Array<{
      tindakanId: number;
      parameterId?: number | null;
      hasilNilai?: string | null;
      catatan?: string | null;
    }> = [];

    for (const block of previewData.value?.items ?? []) {
      for (const param of block.parameters) {
        const key = getPreviewInputKey(block.tindakan.id, param.parameterId);
        const entry = createInputs.value[key];
        if (entry && (entry.hasilNilai.trim() !== "" || entry.catatan.trim() !== "")) {
          hasilInputs.push({
            tindakanId: block.tindakan.id,
            parameterId: param.parameterId,
            hasilNilai: entry.hasilNilai.trim() || null,
            catatan: entry.catatan.trim() || null,
          });
        }
      }
    }

    const created = await penunjangLabService.createOrder({
      pendaftaranId: props.kunjungan.id,
      unitLabId: unitLabId.value ?? null,
      dokterLabId: dokterLabId.value ?? null,
      petugasLabId: petugasLabId.value ?? null,
      isCito: isCito.value,
      diagnosaKlinis: diagnosaKlinis.value.trim() || undefined,
      catatanKlinis: catatanKlinis.value.trim() || undefined,
      kesanLab: kesanLab.value.trim() || undefined,
      tindakanIds: selectedTindakanIds.value,
      hasilInputs,
      tandaiSelesaiInput,
    });

    showToast(
      `Penunjang Lab ${created.noLab} berhasil disimpan (${tandaiSelesaiInput ? "Selesai Input Hasil" : "Diproses"})`,
      "success",
    );
    emit("saved", created);
    emit("close");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menyimpan transaksi penunjang lab"),
      "error",
    );
  } finally {
    saving.value = false;
  }
};

const handleClose = () => {
  if (saving.value) return;
  emit("close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.show && !saving.value) {
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
      <div class="modal-box max-w-6xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-5 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
        <!-- Header -->
        <div class="flex-none pr-9 mb-4">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
            :disabled="saving"
            aria-label="Tutup modal"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Microscope class="w-5 h-5" />
            </div>
            <div>
              <span>
                {{
                  isEditMode
                    ? `Input / Edit Hasil Lab (${activePatientSummary?.noLab || ""})`
                    : "Input Penunjang & Hasil Laboratorium"
                }}
              </span>
              <p class="text-xs font-normal text-base-content/60 mt-0.5">
                Pilih tindakan pemeriksaan lab lalu langsung isikan hasil setiap parameternya
              </p>
            </div>
          </h3>
        </div>

        <div v-if="loadingInit" class="flex-1 space-y-4 py-6 animate-pulse">
          <div class="h-20 bg-base-200 rounded-2xl"></div>
          <div class="h-44 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
          <!-- Identitas Pasien & Kunjungan -->
          <section
            v-if="activePatientSummary"
            class="bg-base-200/40 border border-base-content/10 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <span class="text-base-content/55 block">Pasien & No. RM</span>
              <strong class="text-sm text-base-content block truncate">
                {{ activePatientSummary.nama }}
              </strong>
              <span class="font-mono text-primary font-bold">
                {{ activePatientSummary.noRm }} ({{ activePatientSummary.jenisKelamin }} • {{ activePatientSummary.umur }})
              </span>
            </div>
            <div>
              <span class="text-base-content/55 block">No. Registrasi & Unit</span>
              <strong class="font-mono block">{{ activePatientSummary.noRegistrasi }}</strong>
              <span class="text-base-content/75">{{ activePatientSummary.unitNama }}</span>
            </div>
            <div>
              <span class="text-base-content/55 block">Penjamin & Kelas Tarif</span>
              <strong class="block">{{ activePatientSummary.penjaminNama }}</strong>
              <span class="text-base-content/75">{{ activePatientSummary.kelasNama }}</span>
            </div>
            <div>
              <span class="text-base-content/55 block">Status Kunjungan & Bayar</span>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                  :class="getStatusKunjunganBadgeClass(activePatientSummary.statusKunjungan)"
                >
                  {{ getOptionLabel(STATUS_KUNJUNGAN_OPTIONS, activePatientSummary.statusKunjungan) }}
                </span>
                <span
                  class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                  :class="getStatusPembayaranBadgeClass(activePatientSummary.statusPembayaran)"
                >
                  {{ getOptionLabel(STATUS_PEMBAYARAN_KUNJUNGAN_OPTIONS, activePatientSummary.statusPembayaran) }}
                </span>
              </div>
            </div>
          </section>

          <!-- Pelaksana & Info Klinis -->
          <section class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div v-if="!isEditMode">
              <label class="block text-xs font-bold text-base-content/80 mb-1">
                Unit Laboratorium Pelaksana
              </label>
              <Select2
                v-model="unitLabId"
                :options="unitSelectOptions"
                label-key="displayLabel"
                value-key="id"
                :show-default-option="true"
                default-option-text="-- Ikuti Unit Asal / Default --"
                placeholder="Pilih Unit Lab..."
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1">
                Dokter Penanggung Jawab Lab
              </label>
              <Select2
                v-model="dokterLabId"
                :options="dokterSelectOptions"
                label-key="displayLabel"
                value-key="id"
                :show-default-option="true"
                default-option-text="-- Belum Dipilih --"
                placeholder="Pilih Dokter Lab..."
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1">
                Petugas / Analis Lab (Nakes)
              </label>
              <Select2
                v-model="petugasLabId"
                :options="pegawaiSelectOptions"
                label-key="displayLabel"
                value-key="id"
                :show-default-option="true"
                default-option-text="-- Belum Dipilih --"
                placeholder="Pilih Petugas Analis..."
              />
            </div>

            <template v-if="!isEditMode">
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Diagnosa / Indikasi Klinis
                </label>
                <input
                  v-model="diagnosaKlinis"
                  type="text"
                  maxlength="255"
                  placeholder="Contoh: Observasi Febris / Suspek DBD"
                  class="input input-bordered w-full rounded-xl h-10 text-sm bg-base-100"
                />
              </div>
              <div class="flex items-end pb-1">
                <label class="inline-flex items-center gap-2.5 cursor-pointer bg-rose-500/10 border border-rose-500/25 px-3.5 py-2 rounded-xl w-full">
                  <input
                    v-model="isCito"
                    type="checkbox"
                    class="checkbox checkbox-sm checkbox-error"
                  />
                  <span class="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                    Tandai CITO (Prioritas Segera)
                  </span>
                </label>
              </div>
            </template>
          </section>

          <!-- MODE CREATE: PILIH PEMERIKSAAN LAB & PREVIEW PARAMETER + TARIF -->
          <template v-if="!isEditMode">
            <section class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <FlaskConical class="w-4 h-4" />
                    Pilih Pemeriksaan / Paket Lab ({{ selectedTindakanIds.length }} dipilih)
                  </h4>
                  <p class="text-[11px] text-base-content/60">
                    Memilih item (mis: Darah Lengkap) otomatis menampilkan seluruh sub-parameter pemeriksaannya dan tarif sesuai Unit, Penjamin, & Kelas pasien.
                  </p>
                </div>
                <NuxtLink
                  :to="slugPath('/master/parameter-lab')"
                  class="text-xs font-bold link link-primary"
                >
                  Atur Panel & Parameter →
                </NuxtLink>
              </div>

              <div class="relative">
                <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                <input
                  v-model="tindakanSearch"
                  type="text"
                  placeholder="Cari nama/kode pemeriksaan laboratorium..."
                  class="input input-bordered input-sm w-full pl-9 rounded-xl text-xs bg-base-100"
                />
              </div>

              <div
                v-if="labTindakanOptions.length === 0"
                class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300"
              >
                Belum ada master tarif tindakan berkategori <strong>Laboratorium</strong>. Tambahkan terlebih dahulu di menu Master Tarif Tindakan.
              </div>

              <div
                v-else
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1"
              >
                <label
                  v-for="opt in filteredLabTindakanOptions"
                  :key="opt.id"
                  class="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs"
                  :class="
                    selectedTindakanIds.includes(opt.id)
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-base-100 border-base-content/10 hover:bg-base-200/60'
                  "
                >
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs checkbox-primary mt-0.5"
                    :checked="selectedTindakanIds.includes(opt.id)"
                    @change="toggleTindakanSelection(opt.id)"
                  />
                  <div class="min-w-0">
                    <div class="font-bold text-base-content truncate">{{ opt.nama }}</div>
                    <div class="text-[11px] font-mono opacity-70">
                      {{ opt.kode }}{{ opt.kelompokTarif ? ` • ${opt.kelompokTarif}` : "" }}
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <!-- Preview Tarif + Input Hasil Langsung -->
            <div v-if="loadingPreview" class="py-8 text-center text-xs text-base-content/60">
              <span class="loading loading-spinner loading-sm text-primary mr-2"></span>
              Menghitung tarif dan memuat parameter rujukan pasien...
            </div>

            <template v-else-if="previewData">
              <!-- Ringkasan Tarif Terhitung -->
              <div class="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2 text-xs">
                  <Coins class="w-4 h-4 text-primary" />
                  <span class="font-bold">Estimasi Tarif Pemeriksaan (Unit → Penjamin → Kelas):</span>
                </div>
                <div class="flex flex-wrap items-center gap-4 text-xs">
                  <span>Jasa Dokter: <strong class="text-sky-600 dark:text-sky-400">{{ formatRupiah(previewData.totalJasaDokter) }}</strong></span>
                  <span>Jasa Nakes: <strong class="text-emerald-600 dark:text-emerald-400">{{ formatRupiah(previewData.totalJasaNakes) }}</strong></span>
                  <span class="text-sm font-black text-primary">
                    Total: {{ formatRupiah(previewData.totalTarif) }}
                  </span>
                </div>
              </div>

              <!-- Input Hasil Langsung Per Paket -->
              <div
                v-for="block in previewData.items"
                :key="block.tindakan.id"
                class="border border-base-content/10 rounded-2xl overflow-hidden bg-base-100"
              >
                <div class="bg-base-200/70 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div class="font-extrabold text-sm flex items-center gap-2">
                      <span>{{ block.tindakan.nama }}</span>
                      <span class="font-mono text-xs text-primary">{{ block.tindakan.kode }}</span>
                    </div>
                    <div class="text-[11px] text-base-content/60">
                      Tarif: <strong>{{ formatRupiah(block.rincianTarif.totalTarif) }}</strong>
                      ({{ block.keteranganTarif }})
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <NuxtLink
                      v-if="block.parameters.some((p) => p.isStandaloneDirect || p.parameterId === null)"
                      :to="slugPath('/master/parameter-lab')"
                      class="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Atur Sub-Parameter
                    </NuxtLink>
                    <span class="badge badge-sm badge-outline font-bold">
                      {{
                        block.parameters.some((p) => p.isStandaloneDirect || p.parameterId === null)
                          ? "Hasil Tunggal"
                          : `${block.parameters.length} parameter`
                      }}
                    </span>
                  </div>
                </div>

                <div class="divide-y divide-base-content/5">
                  <div
                    v-for="param in block.parameters"
                    :key="getPreviewInputKey(block.tindakan.id, param.parameterId)"
                    class="p-3 sm:px-4 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center text-xs"
                  >
                    <div class="lg:col-span-4 min-w-0">
                      <div class="font-bold text-sm text-base-content flex flex-wrap items-center gap-1.5">
                        <span>
                          {{ param.nama }}
                          <span v-if="param.isWajib" class="text-error">*</span>
                        </span>
                        <span
                          v-if="param.isStandaloneDirect || param.parameterId === null"
                          class="badge badge-xs badge-info badge-outline font-bold"
                        >
                          Input Langsung
                        </span>
                      </div>
                      <div class="text-[11px] text-base-content/60">
                        {{ param.grup || "Umum" }} • Kode: <span class="font-mono">{{ param.kode }}</span>
                      </div>
                    </div>

                    <div class="lg:col-span-3 min-w-0">
                      <LabHasilInputControl
                        v-model="getOrCreateInputEntry(block.tindakan.id, param.parameterId).hasilNilai"
                        :tipe-hasil="param.tipeHasil"
                        :opsi-pilihan="param.opsiPilihan"
                        :has-numeric-bounds="
                          hasBounds({
                            nilaiMin: param.rujukan?.nilaiMin ?? null,
                            nilaiMax: param.rujukan?.nilaiMax ?? null,
                            kritisMin: param.rujukan?.kritisMin ?? null,
                            kritisMax: param.rujukan?.kritisMax ?? null,
                          })
                        "
                        :nilai-normal-text="param.rujukan?.nilaiNormalText"
                      />
                    </div>

                    <div class="lg:col-span-2 min-w-0 flex items-center justify-between lg:justify-start gap-2">
                      <span class="font-semibold text-base-content/75">
                        {{ param.satuan || "-" }}
                      </span>
                      <span
                        v-if="getPreviewParamFlag(block.tindakan.id, param)"
                        class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                        :class="
                          getFlagHasilLabBadgeClass(
                            getPreviewParamFlag(block.tindakan.id, param),
                          )
                        "
                      >
                        {{
                          getFlagHasilLabLabel(
                            getPreviewParamFlag(block.tindakan.id, param),
                          )
                        }}
                      </span>
                    </div>

                    <div class="lg:col-span-3 min-w-0 flex flex-col gap-1">
                      <div class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Rujukan: {{ param.rujukan?.displayText || "-" }}
                      </div>
                      <input
                        v-model="getOrCreateInputEntry(block.tindakan.id, param.parameterId).catatan"
                        type="text"
                        placeholder="Catatan (opsional)"
                        class="input input-bordered input-xs w-full rounded-lg text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- MODE EDIT HASIL ORDER EXISTING -->
          <template v-else-if="orderDetail">
            <div
              v-for="group in editGroupedItems"
              :key="group.item.id"
              class="border border-base-content/10 rounded-2xl overflow-hidden bg-base-100"
            >
              <div class="bg-base-200/70 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="font-extrabold text-sm">{{ group.item.namaTindakanSnapshot }}</span>
                  <span class="ml-2 font-mono text-xs text-primary">{{ group.item.kodeTindakanSnapshot }}</span>
                </div>
                <span class="text-xs font-bold text-primary">
                  {{ formatRupiah(group.item.subtotalTarif) }}
                </span>
              </div>

              <div v-if="group.rows.length === 0" class="p-4 text-xs text-base-content/60">
                Belum ada baris input hasil untuk tindakan ini.
              </div>

              <div v-else class="divide-y divide-base-content/5">
                <div
                  v-for="row in group.rows"
                  :key="row.id"
                  class="p-3 sm:px-4 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center text-xs"
                >
                  <div class="lg:col-span-4 min-w-0">
                    <div class="font-bold text-sm flex flex-wrap items-center gap-1.5">
                      <span>
                        {{ row.namaParameterSnapshot }}
                        <span v-if="row.isWajib" class="text-error">*</span>
                      </span>
                      <span
                        v-if="row.parameterId === null"
                        class="badge badge-xs badge-info badge-outline font-bold"
                      >
                        Hasil Tunggal
                      </span>
                    </div>
                    <div class="text-[11px] text-base-content/60">
                      {{ row.grupSnapshot || "Umum" }} • <span class="font-mono">{{ row.kodeParameterSnapshot }}</span>
                    </div>
                  </div>

                  <div class="lg:col-span-3 min-w-0">
                    <LabHasilInputControl
                      v-model="row.inputNilai"
                      :tipe-hasil="row.tipeHasilSnapshot"
                      :opsi-pilihan="row.opsiPilihanSnapshot"
                      :has-numeric-bounds="
                        hasBounds({
                          nilaiMin: row.nilaiRujukanMinSnapshot,
                          nilaiMax: row.nilaiRujukanMaxSnapshot,
                          kritisMin: row.kritisMinSnapshot,
                          kritisMax: row.kritisMaxSnapshot,
                        })
                      "
                      :nilai-normal-text="row.nilaiNormalTextSnapshot"
                    />
                  </div>

                  <div class="lg:col-span-2 min-w-0 flex items-center gap-2">
                    <span class="font-semibold text-base-content/75">
                      {{ row.satuanSnapshot || "-" }}
                    </span>
                    <span
                      v-if="getEditRowFlag(row)"
                      class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                      :class="getFlagHasilLabBadgeClass(getEditRowFlag(row))"
                    >
                      {{ getFlagHasilLabLabel(getEditRowFlag(row)) }}
                    </span>
                  </div>

                  <div class="lg:col-span-3 min-w-0 flex flex-col gap-1">
                    <div class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Rujukan: {{ row.nilaiNormalTextSnapshot || "-" }}
                    </div>
                    <input
                      v-model="row.inputCatatan"
                      type="text"
                      placeholder="Catatan parameter (opsional)"
                      class="input input-bordered input-xs w-full rounded-lg text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Kesan / Catatan Umum Lab -->
          <section v-if="isEditMode || previewData">
            <label class="block text-xs font-bold text-base-content/80 mb-1">
              Kesan / Kesimpulan Laboratorium
            </label>
            <textarea
              v-model="kesanLab"
              rows="2"
              maxlength="1500"
              placeholder="Catatan klinis atau kesimpulan hasil lab secara keseluruhan (opsional)"
              class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
            ></textarea>
          </section>
        </div>

        <!-- Footer Actions -->
        <div class="flex-none modal-action flex-wrap gap-2 pt-4 mt-2 border-t border-base-content/10">
          <button
            type="button"
            class="btn btn-ghost rounded-2xl font-bold px-5"
            :disabled="saving"
            @click="handleClose"
          >
            Batal
          </button>
          <button
            type="button"
            class="btn btn-outline btn-primary rounded-2xl font-bold px-5"
            :disabled="loadingInit || saving || (!isEditMode && selectedTindakanIds.length === 0)"
            @click="handleSave(false)"
          >
            <span v-if="saving" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEditMode ? "Simpan Draft Hasil" : "Simpan sebagai Diproses" }}</span>
          </button>
          <button
            type="button"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-md gap-1.5"
            :disabled="loadingInit || saving || (!isEditMode && selectedTindakanIds.length === 0)"
            @click="handleSave(true)"
          >
            <CheckCircle2 v-if="!saving" class="w-4 h-4" />
            <span>Simpan & Selesaikan Input Hasil</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
