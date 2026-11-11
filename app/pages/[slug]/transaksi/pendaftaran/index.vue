<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Building,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPlus,
  Clock,
  Eye,
  RotateCcw,
  Search,
  Stethoscope,
  Users,
  X,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import PendaftaranPasienForm, {
  type UnifiedPasienFormState,
} from "@/components/transaksi/PendaftaranPasienForm.vue";
import PendaftaranPenjaminSection from "@/components/transaksi/PendaftaranPenjaminSection.vue";
import {
  buildPenjaminListPayload,
  createDefaultPenjaminMultiState,
  createPenjaminStateFromPasienCards,
  getEffectivePrimaryJenisPenjamin,
  validatePenjaminMultiState,
  type PenjaminKunjunganMultiState,
} from "@/utils/pendaftaran-penjamin.util";
import BedKosongPicker from "@/components/transaksi/BedKosongPicker.vue";
import PasienPickerModal from "@/components/transaksi/PasienPickerModal.vue";
import DokterJadwalPickerModal from "@/components/transaksi/DokterJadwalPickerModal.vue";
import PendaftaranDetailModal from "@/components/transaksi/PendaftaranDetailModal.vue";
import { PendaftaranService } from "@/services/pendaftaran.service";
import { PasienService } from "@/services/pasien.service";
import { UnitService } from "@/services/unit.service";
import { PenjaminService } from "@/services/penjamin.service";
import { KelasService } from "@/services/kelas.service";
import { useDate } from "@/composables/useDate";
import { usePermission } from "@/composables/usePermission";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  CARA_MASUK_PASIEN_OPTIONS,
  CaraMasukPasien,
  formatKelurahanLabel,
  formatNamaGelarDokter,
  getOptionLabel,
  isInpatientLayanan,
  JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
  JenisIdentitas,
  JenisKelamin,
  JenisLayananPendaftaran,
  REGISTRABLE_UNIT_JENIS_TO_LAYANAN,
  SESI_PRAKTIK_OPTIONS,
  type CreatePasienPayload,
  type CreatePendaftaranPayload,
  type DokterItem,
  type JadwalDokterTersediaItem,
  type KelasOptionItem,
  type PasienItem,
  type PenjaminOptionItem,
  type PendaftaranItem,
  type UnitOptionItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Pendaftaran Pasien",
});

const pendaftaranService = PendaftaranService();
const pasienService = PasienService();
const unitService = UnitService();
const penjaminService = PenjaminService();
const kelasService = KelasService();
const { formatDateForInput } = useDate();
const { slugPath } = useSlugRoute();
const { showToast } = useToast();
const { canWrite } = usePermission();

const ROUTE_PATH = "/transaksi/pendaftaran";
const RESOURCE_NAME = "Pendaftaran";
const canCreateData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));

const saving = ref(false);
const loadingRefs = ref(false);
const loadingPasienDetail = ref(false);

const unitOptions = ref<UnitOptionItem[]>([]);
const penjaminOptions = ref<PenjaminOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);

const showPasienPicker = ref(false);
const showDokterPicker = ref(false);
const selectedPasienDetail = ref<PasienItem | null>(null);
const selectedJadwal = ref<JadwalDokterTersediaItem | null>(null);
const selectedDokterText = ref("");
const wilayahLabel = ref("");
const wilayahKey = ref(0);

const lastCreatedVisit = ref<PendaftaranItem | null>(null);
const showDetailModal = ref(false);

const createDefaultPasienForm = (): UnifiedPasienFormState => ({
  selectedPasienId: null,
  rmMode: "auto",
  noRm: "",
  formatNoRm: "",
  isBayiBaruLahir: false,
  isIdentitasTidakDiketahui: false,
  jenisIdentitas: JenisIdentitas.KTP,
  nik: "",
  noIdentitasLain: "",
  namaLengkap: "",
  tempatLahir: "",
  tanggalLahir: "",
  jenisKelamin: JenisKelamin.LAKI_LAKI,
  noTelepon: "",
  idKelurahan: "",
  alamatKtp: "",
  alamatSamaKtp: true,
  alamatDomisili: "",
  namaPj: "",
  hubunganPj: "",
  noHpPj: "",
});

const pasienForm = ref<UnifiedPasienFormState>(createDefaultPasienForm());
const penjaminState = ref<PenjaminKunjunganMultiState>(createDefaultPenjaminMultiState());
const primaryJenisPenjamin = computed(() =>
  getEffectivePrimaryJenisPenjamin(penjaminState.value),
);

const visitForm = ref({
  tanggalKunjungan: formatDateForInput(new Date()),
  unitId: undefined as number | undefined,
  jadwalDokterId: undefined as number | undefined,
  dokterId: undefined as number | undefined,
  bedId: undefined as number | undefined,
  caraMasuk: CaraMasukPasien.DATANG_SENDIRI,
  asalRujukan: "",
  keluhanUtama: "",
  catatan: "",
  ihsEncounterId: "",
});

const errors = ref<Record<string, string | undefined>>({});

const registrableUnits = computed(() =>
  unitOptions.value.filter((u) => Boolean(REGISTRABLE_UNIT_JENIS_TO_LAYANAN[u.jenisUnit])),
);

const unitSelectOptions = computed(() =>
  registrableUnits.value.map((u) => ({
    id: u.id,
    displayLabel: `${u.kode} — ${u.nama} (${getOptionLabel(JENIS_LAYANAN_PENDAFTARAN_OPTIONS, REGISTRABLE_UNIT_JENIS_TO_LAYANAN[u.jenisUnit])})`,
  })),
);

const selectedUnit = computed(() =>
  registrableUnits.value.find((u) => u.id === Number(visitForm.value.unitId)) ?? null,
);

const targetLayanan = computed<JenisLayananPendaftaran | null>(() =>
  selectedUnit.value
    ? REGISTRABLE_UNIT_JENIS_TO_LAYANAN[selectedUnit.value.jenisUnit] ?? null
    : null,
);

const isTargetRajal = computed(
  () => targetLayanan.value === JenisLayananPendaftaran.RAWAT_JALAN,
);

const isTargetInpatient = computed(() =>
  Boolean(targetLayanan.value && isInpatientLayanan(targetLayanan.value)),
);

const savedPenjaminList = computed(
  () => selectedPasienDetail.value?.penjaminList ?? [],
);

const clearError = (key: string) => {
  errors.value[key] = undefined;
};

const loadReferences = async () => {
  loadingRefs.value = true;
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
    loadingRefs.value = false;
  }
};

const populateExistingPatient = (detail: PasienItem) => {
  selectedPasienDetail.value = detail;
  const p = detail.penduduk;
  wilayahLabel.value = formatKelurahanLabel(p?.kelurahan);
  wilayahKey.value += 1;

  pasienForm.value = {
    selectedPasienId: detail.id,
    rmMode: "manual",
    noRm: detail.noRm || "",
    formatNoRm: "",
    isBayiBaruLahir: Boolean(detail.isBayiBaruLahir),
    isIdentitasTidakDiketahui: Boolean(detail.isIdentitasTidakDiketahui),
    jenisIdentitas: p?.jenisIdentitas ?? JenisIdentitas.KTP,
    nik: p?.nik || "",
    noIdentitasLain: p?.noIdentitasLain || "",
    namaLengkap: p?.namaLengkap || "",
    tempatLahir: p?.tempatLahir || "",
    tanggalLahir: p?.tanggalLahir ? String(p.tanggalLahir).slice(0, 10) : "",
    jenisKelamin: p?.jenisKelamin ?? JenisKelamin.LAKI_LAKI,
    noTelepon: p?.noTelepon || "",
    idKelurahan: p?.idKelurahan || "",
    alamatKtp: p?.alamatKtp || "",
    alamatSamaKtp: detail.alamatSamaKtp !== false,
    alamatDomisili: detail.alamatDomisili || "",
    namaPj: detail.namaPj || "",
    hubunganPj: detail.hubunganPj || "",
    noHpPj: detail.noHpPj || "",
  };

  penjaminState.value = createPenjaminStateFromPasienCards(
    detail.penjaminList ?? [],
  );

  clearError("newNoRm");
  clearError("newNik");
  clearError("namaLengkap");
};

const handlePickedPatient = async (picked: PasienItem) => {
  loadingPasienDetail.value = true;
  try {
    const detail = await pasienService.getPasienById(picked.id);
    populateExistingPatient(detail);
  } catch {
    populateExistingPatient(picked);
  } finally {
    loadingPasienDetail.value = false;
  }
};

const resetPasienToNew = () => {
  selectedPasienDetail.value = null;
  pasienForm.value = createDefaultPasienForm();
  wilayahLabel.value = "";
  wilayahKey.value += 1;
  if (
    penjaminState.value.paymentType === "asuransi" &&
    penjaminState.value.items.some((item) => item.sourceMode === "saved")
  ) {
    penjaminState.value = createDefaultPenjaminMultiState();
  }
};

const resetFullForm = () => {
  resetPasienToNew();
  penjaminState.value = createDefaultPenjaminMultiState();
  selectedJadwal.value = null;
  selectedDokterText.value = "";
  visitForm.value = {
    tanggalKunjungan: formatDateForInput(new Date()),
    unitId: undefined,
    jadwalDokterId: undefined,
    dokterId: undefined,
    bedId: undefined,
    caraMasuk: CaraMasukPasien.DATANG_SENDIRI,
    asalRujukan: "",
    keluhanUtama: "",
    catatan: "",
    ihsEncounterId: "",
  };
  errors.value = {};
};

const handleUnitChange = () => {
  clearError("unitId");
  clearError("jadwalDokterId");
  clearError("dokterId");
  clearError("bedId");
  visitForm.value.jadwalDokterId = undefined;
  visitForm.value.dokterId = undefined;
  visitForm.value.bedId = undefined;
  selectedJadwal.value = null;
  selectedDokterText.value = "";

  if (targetLayanan.value === JenisLayananPendaftaran.IGD) {
    visitForm.value.caraMasuk = CaraMasukPasien.IGD;
  } else if (visitForm.value.caraMasuk === CaraMasukPasien.IGD) {
    visitForm.value.caraMasuk = CaraMasukPasien.DATANG_SENDIRI;
  }
};

const handleSelectJadwal = (jadwal: JadwalDokterTersediaItem) => {
  selectedJadwal.value = jadwal;
  visitForm.value.unitId = jadwal.unitId;
  visitForm.value.jadwalDokterId = jadwal.id;
  visitForm.value.dokterId = jadwal.dokterId;
  const namaDokter =
    jadwal.dokter?.namaTampilan ||
    formatNamaGelarDokter(
      jadwal.dokter?.gelarDepan,
      jadwal.dokter?.penduduk?.namaLengkap,
      jadwal.dokter?.gelarBelakang,
    ) ||
    jadwal.dokter?.kodeDokter ||
    `Dokter #${jadwal.dokterId}`;
  selectedDokterText.value = `${jadwal.dokter?.kodeDokter || ""} — ${namaDokter}`;
  clearError("unitId");
  clearError("jadwalDokterId");
  clearError("dokterId");
};

const handleSelectDokter = (dokter: DokterItem) => {
  selectedJadwal.value = null;
  visitForm.value.jadwalDokterId = undefined;
  visitForm.value.dokterId = dokter.id;
  const namaDokter =
    dokter.namaTampilan ||
    formatNamaGelarDokter(
      dokter.gelarDepan,
      dokter.penduduk?.namaLengkap,
      dokter.gelarBelakang,
    ) ||
    dokter.kodeDokter;
  selectedDokterText.value = `${dokter.kodeDokter} — ${namaDokter}`;
  clearError("dokterId");
  clearError("jadwalDokterId");
};

const clearDokterOrJadwal = () => {
  selectedJadwal.value = null;
  visitForm.value.jadwalDokterId = undefined;
  visitForm.value.dokterId = undefined;
  selectedDokterText.value = "";
};

const validatePasienSection = (next: Record<string, string | undefined>) => {
  const pf = pasienForm.value;
  if (pf.selectedPasienId) return;

  if (pf.rmMode === "manual" && !pf.noRm.trim()) {
    next.newNoRm = "Nomor RM manual wajib diisi";
  }
  if (!pf.namaLengkap.trim()) {
    next.namaLengkap = "Nama lengkap pasien wajib diisi";
  }
  if (
    pf.jenisIdentitas === JenisIdentitas.KTP &&
    pf.nik.trim() &&
    !/^\d{16}$/.test(pf.nik.trim())
  ) {
    next.newNik = "NIK harus terdiri dari tepat 16 digit angka";
  }
};

const validatePenjaminAndVisit = (next: Record<string, string | undefined>) => {
  validatePenjaminMultiState(
    penjaminState.value,
    penjaminOptions.value,
    savedPenjaminList.value.filter((c) => c.status !== "N"),
    next,
  );

  const v = visitForm.value;
  if (!v.unitId) next.unitId = "Unit tujuan pelayanan wajib dipilih";
  if (isTargetRajal.value && !v.jadwalDokterId) {
    next.jadwalDokterId = "Unit Rawat Jalan wajib memilih jadwal praktik dokter";
  }
  if (!v.jadwalDokterId && !v.dokterId) {
    next.dokterId = "Dokter penanggung jawab / DPJP wajib dipilih";
  }
  if (isTargetInpatient.value && !v.bedId) {
    next.bedId = "Unit Rawat Inap / Intensive wajib memilih bed kosong";
  }
};

const validateForm = (): boolean => {
  const next: Record<string, string | undefined> = {};
  validatePasienSection(next);
  validatePenjaminAndVisit(next);
  errors.value = next;
  return Object.values(next).every((val) => !val);
};

const buildPasienBaruPayload = (): CreatePasienPayload => {
  const pf = pasienForm.value;
  return {
    noRm: pf.rmMode === "manual" ? pf.noRm.trim() : undefined,
    formatNoRm:
      pf.rmMode === "auto" && pf.formatNoRm ? pf.formatNoRm : undefined,
    isBayiBaruLahir: pf.isBayiBaruLahir,
    isIdentitasTidakDiketahui: pf.isIdentitasTidakDiketahui,
    alamatSamaKtp: pf.alamatSamaKtp,
    alamatDomisili: pf.alamatSamaKtp ? undefined : pf.alamatDomisili.trim() || undefined,
    namaPj: pf.namaPj.trim() || undefined,
    hubunganPj: pf.hubunganPj || undefined,
    noHpPj: pf.noHpPj.trim() || undefined,
    penduduk: {
      jenisIdentitas: pf.jenisIdentitas,
      nik:
        pf.jenisIdentitas === JenisIdentitas.KTP
          ? pf.nik.trim() || undefined
          : undefined,
      noIdentitasLain:
        pf.jenisIdentitas !== JenisIdentitas.KTP
          ? pf.noIdentitasLain.trim() || undefined
          : undefined,
      namaLengkap: pf.namaLengkap.trim(),
      tempatLahir: pf.tempatLahir.trim() || undefined,
      tanggalLahir: pf.tanggalLahir || undefined,
      jenisKelamin: pf.jenisKelamin,
      noTelepon: pf.noTelepon.trim() || undefined,
      idKelurahan: pf.idKelurahan || undefined,
      alamatKtp: pf.alamatKtp.trim() || undefined,
    },
  };
};

const buildCreatePayload = (): CreatePendaftaranPayload => {
  const v = visitForm.value;

  return {
    pasienId: pasienForm.value.selectedPasienId ?? undefined,
    pasienBaru: pasienForm.value.selectedPasienId
      ? undefined
      : buildPasienBaruPayload(),
    tanggalKunjungan: v.tanggalKunjungan || undefined,
    unitId: Number(v.unitId),
    jadwalDokterId: v.jadwalDokterId,
    dokterId: v.dokterId,
    bedId: isTargetRajal.value ? undefined : v.bedId,
    penjaminList: buildPenjaminListPayload(penjaminState.value),
    caraMasuk: v.caraMasuk,
    asalRujukan: v.asalRujukan.trim() || undefined,
    keluhanUtama: v.keluhanUtama.trim() || undefined,
    catatan: v.catatan.trim() || undefined,
    ihsEncounterId: v.ihsEncounterId.trim() || undefined,
  };
};

const handleSubmit = async () => {
  if (!canCreateData.value) {
    showToast("Anda tidak memiliki akses untuk mendaftarkan kunjungan", "error");
    return;
  }
  if (!validateForm() || saving.value) return;

  saving.value = true;
  try {
    const created = await pendaftaranService.createPendaftaran(buildCreatePayload());
    lastCreatedVisit.value = created;
    const queueLabel = created.kodeAntreanSaatIni
      ? ` • Antrean: ${created.kodeAntreanSaatIni}`
      : "";
    showToast(`Pendaftaran berhasil (${created.noRegistrasi}${queueLabel})`, "success");
    resetFullForm();
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, "Gagal memproses pendaftaran pasien"), "error");
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadReferences();
});
</script>

<template>
  <div class="space-y-5 max-w-6xl mx-auto">
    <!-- HEADER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-primary/10 text-primary border-primary/20 flex items-center justify-center shrink-0">
            <ClipboardPlus class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
              Pendaftaran Kunjungan Pasien
            </h1>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Formulir terpadu pendaftaran pasien baru maupun pasien lama (pilih pasien lama & dokter melalui popup)
            </p>
          </div>
        </div>

        <NuxtLink
          :to="slugPath('/transaksi/informasi-kunjungan')"
          class="btn btn-outline btn-primary rounded-xl font-bold gap-2 w-full sm:w-auto shrink-0"
        >
          <ClipboardCheck class="w-4 h-4" />
          <span>Informasi Kunjungan</span>
        </NuxtLink>
      </div>
    </div>

    <!-- BANNER PENDAFTARAN BERHASIL TERAKHIR -->
    <div
      v-if="lastCreatedVisit"
      class="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div class="flex items-start gap-3 min-w-0">
        <CheckCircle2 class="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
        <div class="min-w-0 text-xs space-y-1">
          <div class="font-extrabold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2 flex-wrap">
            <span>Pendaftaran Berhasil: {{ lastCreatedVisit.noRegistrasi }}</span>
            <span
              v-if="lastCreatedVisit.kodeAntreanSaatIni"
              class="font-mono px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30"
            >
              No. Antrean: {{ lastCreatedVisit.kodeAntreanSaatIni }}
            </span>
          </div>
          <p class="text-base-content/75">
            Pasien <strong>{{ lastCreatedVisit.pasien?.penduduk?.namaLengkap || "-" }}</strong>
            (RM: <span class="font-mono font-bold">{{ lastCreatedVisit.pasien?.noRm || "-" }}</span>)
            • {{ lastCreatedVisit.unitSaatIni?.nama || "-" }}
            <template v-if="lastCreatedVisit.bedSaatIni">
              • Bed {{ lastCreatedVisit.bedSaatIni.kode }}
            </template>
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          class="btn btn-xs sm:btn-sm btn-outline rounded-xl gap-1"
          @click="showDetailModal = true"
        >
          <Eye class="w-3.5 h-3.5" />
          Lihat Detail
        </button>
        <NuxtLink
          :to="slugPath('/transaksi/informasi-kunjungan')"
          class="btn btn-xs sm:btn-sm btn-primary rounded-xl gap-1"
        >
          Informasi Kunjungan
        </NuxtLink>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square rounded-lg"
          aria-label="Tutup banner"
          @click="lastCreatedVisit = null"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <!-- 1. FORM TERPADU IDENTITAS PASIEN (LAMA / BARU) -->
      <PendaftaranPasienForm
        :form="pasienForm"
        :selected-pasien="selectedPasienDetail"
        :wilayah-label="wilayahLabel"
        :wilayah-key="wilayahKey"
        :loading-detail="loadingPasienDetail"
        :errors="errors"
        @open-picker="showPasienPicker = true"
        @reset-to-new="resetPasienToNew"
        @clear-error="clearError"
      />

      <!-- 2. CARA BAYAR / PENJAMIN -->
      <PendaftaranPenjaminSection
        :state="penjaminState"
        :saved-penjamin-list="savedPenjaminList"
        :penjamin-options="penjaminOptions"
        :kelas-options="kelasOptions"
        :errors="errors"
        @clear-error="clearError"
      />

      <!-- 3. TUJUAN PELAYANAN, DOKTER (POPUP), BED & ANAMNESA -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div class="flex items-center gap-2.5 pb-3 border-b border-base-content/10">
          <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building class="w-4 h-4" />
          </div>
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-base-content">
            3. Tujuan Layanan, Dokter & Anamnesa Loket
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Tanggal Kunjungan
            </label>
            <FlatpickrDate
              v-model="visitForm.tanggalKunjungan"
              :clearable="false"
              placeholder="Pilih tanggal kunjungan..."
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Unit Tujuan Pelayanan <span class="text-error">*</span>
            </label>
            <Select2
              v-model="visitForm.unitId"
              :options="unitSelectOptions"
              label-key="displayLabel"
              value-key="id"
              placeholder="Pilih poliklinik / IGD / bangsal..."
              :error="Boolean(errors.unitId)"
              @change="handleUnitChange"
            />
            <span v-if="errors.unitId" class="text-xs text-error font-semibold mt-1 block">
              {{ errors.unitId }}
            </span>
          </div>
        </div>

        <!-- Pemilihan Dokter / Jadwal via Popup -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-base-content/80">
            {{ isTargetRajal ? "Jadwal Praktik & Dokter" : "Dokter / DPJP & Jadwal" }}
            <span class="text-error">*</span>
          </label>

          <div
            class="p-3.5 rounded-xl border bg-base-200/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            :class="errors.jadwalDokterId || errors.dokterId ? 'border-error' : 'border-base-content/15'"
          >
            <div v-if="selectedDokterText" class="min-w-0 space-y-0.5 text-xs">
              <div class="font-bold text-sm text-base-content truncate flex items-center gap-2">
                <Stethoscope class="w-4 h-4 text-primary shrink-0" />
                <span class="truncate">{{ selectedDokterText }}</span>
              </div>
              <div v-if="selectedJadwal" class="text-[11px] text-base-content/65 flex flex-wrap items-center gap-2">
                <span class="font-semibold text-base-content/80">{{ selectedJadwal.unit?.nama }}</span>
                <span class="inline-flex items-center gap-1 font-mono font-bold text-primary">
                  • <Clock class="w-3 h-3" /> {{ selectedJadwal.jamMulai }} - {{ selectedJadwal.jamSelesai }}
                </span>
                <span v-if="selectedJadwal.sesi">
                  • Sesi {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, selectedJadwal.sesi) }}
                </span>
                <span v-if="!selectedJadwal.kuotaInfo.isUnlimited" class="inline-flex items-center gap-1">
                  • <Users class="w-3 h-3" /> Sisa {{ selectedJadwal.kuotaInfo.sisaKuotaTotal }}/{{ selectedJadwal.kuotaInfo.kuotaTotal }}
                </span>
              </div>
              <div v-else class="text-[11px] text-base-content/60">
                Terpilih sebagai Dokter Penanggung Jawab (DPJP / Dokter Jaga)
              </div>
            </div>
            <span v-else class="text-xs text-base-content/55">
              {{
                isTargetRajal
                  ? "Klik tombol Pilih Dokter / Jadwal untuk memilih jadwal praktik & antrean..."
                  : "Klik tombol Pilih Dokter untuk memilih dokter DPJP atau jadwal praktik..."
              }}
            </span>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="selectedDokterText"
                type="button"
                class="btn btn-ghost btn-xs rounded-lg text-error"
                aria-label="Hapus pilihan dokter"
                @click="clearDokterOrJadwal"
              >
                <X class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm rounded-xl gap-1.5 font-bold"
                @click="showDokterPicker = true"
              >
                <Search class="w-3.5 h-3.5" />
                <span>{{ isTargetRajal ? "Pilih Dokter / Jadwal" : "Pilih Dokter" }}</span>
              </button>
            </div>
          </div>

          <span v-if="errors.jadwalDokterId || errors.dokterId" class="text-xs text-error font-semibold block">
            {{ errors.jadwalDokterId || errors.dokterId }}
          </span>
        </div>

        <!-- Pilihan Bed Kosong (Ranap / Intensive / IGD ber-bed) -->
        <div
          v-if="selectedUnit && !isTargetRajal && selectedUnit.isTersediaBed"
          class="space-y-1.5"
        >
          <label class="block text-xs font-bold text-base-content/80">
            Pilih Tempat Tidur (Bed Kosong)
            <span v-if="isTargetInpatient" class="text-error">*</span>
            <span v-else class="font-normal text-base-content/55">(Opsional untuk IGD)</span>
          </label>
          <BedKosongPicker
            v-model="visitForm.bedId"
            :unit-id="visitForm.unitId"
            :required="isTargetInpatient"
            :error="errors.bedId"
            @selected="clearError('bedId')"
          />
        </div>

        <!-- Informasi Masuk & Keluhan -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2 border-t border-base-content/10">
          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Cara Masuk Pasien
            </label>
            <select
              v-model="visitForm.caraMasuk"
              class="select select-bordered w-full rounded-xl h-11 text-sm"
            >
              <option v-for="opt in CARA_MASUK_PASIEN_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Asal Rujukan (Opsional)
            </label>
            <input
              v-model="visitForm.asalRujukan"
              type="text"
              maxlength="150"
              placeholder="Contoh: Klinik Pratama Sehat"
              class="input input-bordered w-full rounded-xl h-11 text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              IHS Encounter ID (SATUSEHAT)
            </label>
            <input
              v-model="visitForm.ihsEncounterId"
              type="text"
              maxlength="50"
              placeholder="Opsional"
              class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Keluhan Utama Saat Daftar
            </label>
            <input
              v-model="visitForm.keluhanUtama"
              type="text"
              maxlength="1000"
              placeholder="Contoh: Demam sejak 3 hari disertai pusing"
              class="input input-bordered w-full rounded-xl h-11 text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-base-content/80 mb-1.5">
              Catatan Petugas
            </label>
            <input
              v-model="visitForm.catatan"
              type="text"
              maxlength="1000"
              placeholder="Catatan loket pendaftaran"
              class="input input-bordered w-full rounded-xl h-11 text-sm"
            />
          </div>
        </div>
      </div>

      <!-- ACTION FOOTER -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          class="btn btn-ghost rounded-xl gap-2"
          :disabled="saving"
          @click="resetFullForm"
        >
          <RotateCcw class="w-4 h-4" />
          <span>Reset Semua Formulir</span>
        </button>

        <button
          type="submit"
          class="btn btn-primary rounded-xl px-8 font-bold shadow-md shadow-primary/25 gap-2"
          :disabled="saving || loadingRefs || !canCreateData"
        >
          <span v-if="saving" class="loading loading-spinner loading-xs"></span>
          <ClipboardPlus v-else class="w-4 h-4" />
          <span>{{ saving ? "Memproses Pendaftaran..." : "Simpan & Daftarkan Kunjungan" }}</span>
        </button>
      </div>
    </form>

    <!-- POPUP PEMILIHAN PASIEN -->
    <PasienPickerModal
      :show="showPasienPicker"
      :selected-pasien-id="pasienForm.selectedPasienId"
      @close="showPasienPicker = false"
      @select="handlePickedPatient"
    />

    <!-- POPUP PEMILIHAN DOKTER / JADWAL PRAKTIK -->
    <DokterJadwalPickerModal
      :show="showDokterPicker"
      :unit="selectedUnit"
      :tanggal="visitForm.tanggalKunjungan"
      :jenis-penjamin="primaryJenisPenjamin"
      :selected-dokter-id="visitForm.dokterId ?? null"
      :selected-jadwal-id="visitForm.jadwalDokterId ?? null"
      @close="showDokterPicker = false"
      @select-jadwal="handleSelectJadwal"
      @select-dokter="handleSelectDokter"
    />

    <!-- MODAL DETAIL KUNJUNGAN BARU -->
    <PendaftaranDetailModal
      :show="showDetailModal"
      :pendaftaran-id="lastCreatedVisit?.id ?? null"
      :can-manage="false"
      @close="showDetailModal = false"
    />
  </div>
</template>
