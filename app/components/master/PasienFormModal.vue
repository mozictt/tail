<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  AlertTriangle,
  Baby,
  CheckCircle2,
  HeartPulse,
  IdCard,
  MapPin,
  Pencil,
  PhoneCall,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import UiAutocompleteWilayah from "@/components/ui/AutocompleteWilayah.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import PendudukSelector from "@/components/master/PendudukSelector.vue";
import PendudukFormModal from "@/components/master/PendudukFormModal.vue";
import PasienPenjaminManager from "@/components/master/PasienPenjaminManager.vue";
import { PasienService } from "@/services/pasien.service";
import { useMasterReferences } from "@/composables/useMasterReferences";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  FORMAT_NO_RM_OPTIONS,
  FormatNoRm,
  formatKelurahanLabel,
  GOLONGAN_DARAH_OPTIONS,
  HUBUNGAN_PJ_OPTIONS,
  JENIS_IDENTITAS_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  JenisIdentitas,
  JenisKelamin,
  KEWARGANEGARAAN_OPTIONS,
  Kewarganegaraan,
  RHESUS_OPTIONS,
  STATUS_HIDUP_OPTIONS,
  STATUS_PERKAWINAN_OPTIONS,
  StatusHidup,
  type CreatePasienPayload,
  type CreatePasienPenjaminPayload,
  type CreatePendudukPayload,
  type GolonganDarah,
  type HubunganPenanggungJawab,
  type PasienItem,
  type PasienPenjaminItem,
  type PendudukItem,
  type RhesusDarah,
  type StatusPerkawinan,
  type UpdatePasienPayload,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: PasienItem): void;
}>();

const pasienService = PasienService();
const { formatDate } = useDate();
const { showToast } = useToast();
const {
  agamaOptions,
  pendidikanOptions,
  pekerjaanOptions,
  sukuOptions,
  loadingReferences,
  loadReferences,
} = useMasterReferences();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);

const rmMode = ref<"auto" | "manual">("auto");
const pendudukMode = ref<"existing" | "new">("new");
const showChangePenduduk = ref(false);
const showEditPendudukModal = ref(false);
const hasSubResourceUpdate = ref(false);

const linkedPenduduk = ref<Partial<PendudukItem> | null>(null);
const linkedIbu = ref<Partial<PendudukItem> | null>(null);
const initialWilayahKtpLabel = ref("");
const initialWilayahDomisiliLabel = ref("");
const wilayahKeyCounter = ref(0);

const draftPenjaminList = ref<CreatePasienPenjaminPayload[]>([]);
const livePenjaminList = ref<PasienPenjaminItem[]>([]);

interface PasienFormState {
  noRm: string;
  formatNoRm: FormatNoRm | "";
  pendudukId: number | undefined;
  pendudukIbuId: number | undefined;
  isBayiBaruLahir: boolean;
  isIdentitasTidakDiketahui: boolean;
  alamatSamaKtp: boolean;
  alamatDomisili: string;
  idKelurahanDomisili: string;
  rtDomisili: string;
  rwDomisili: string;
  namaPj: string;
  hubunganPj: HubunganPenanggungJawab | "";
  noHpPj: string;
  alamatPj: string;
  catatanPenting: string;
  status: MasterStatus;
}

interface NewPendudukState {
  jenisIdentitas: JenisIdentitas;
  nik: string;
  noIdentitasLain: string;
  noKk: string;
  namaLengkap: string;
  namaIbuKandung: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
  golonganDarah: GolonganDarah | "";
  rhesus: RhesusDarah | "";
  statusPerkawinan: StatusPerkawinan | "";
  kewarganegaraan: Kewarganegaraan;
  statusHidup: StatusHidup;
  tanggalMeninggal: string;
  agamaId: number | undefined;
  pendidikanId: number | undefined;
  pekerjaanId: number | undefined;
  sukuId: number | undefined;
  noTelepon: string;
  email: string;
  idKelurahan: string;
  rt: string;
  rw: string;
  kodePos: string;
  alamatKtp: string;
  ihsPatientId: string;
}

const createDefaultPasienForm = (): PasienFormState => ({
  noRm: "",
  formatNoRm: "",
  pendudukId: undefined,
  pendudukIbuId: undefined,
  isBayiBaruLahir: false,
  isIdentitasTidakDiketahui: false,
  alamatSamaKtp: true,
  alamatDomisili: "",
  idKelurahanDomisili: "",
  rtDomisili: "",
  rwDomisili: "",
  namaPj: "",
  hubunganPj: "",
  noHpPj: "",
  alamatPj: "",
  catatanPenting: "",
  status: "Y",
});

const createDefaultNewPenduduk = (): NewPendudukState => ({
  jenisIdentitas: JenisIdentitas.KTP,
  nik: "",
  noIdentitasLain: "",
  noKk: "",
  namaLengkap: "",
  namaIbuKandung: "",
  tempatLahir: "",
  tanggalLahir: "",
  jenisKelamin: JenisKelamin.LAKI_LAKI,
  golonganDarah: "",
  rhesus: "",
  statusPerkawinan: "",
  kewarganegaraan: Kewarganegaraan.WNI,
  statusHidup: StatusHidup.HIDUP,
  tanggalMeninggal: "",
  agamaId: undefined,
  pendidikanId: undefined,
  pekerjaanId: undefined,
  sukuId: undefined,
  noTelepon: "",
  email: "",
  idKelurahan: "",
  rt: "",
  rw: "",
  kodePos: "",
  alamatKtp: "",
  ihsPatientId: "",
});

const form = ref<PasienFormState>(createDefaultPasienForm());
const newPenduduk = ref<NewPendudukState>(createDefaultNewPenduduk());
const errors = ref<Record<string, string>>({});
const todayIso = computed(() => new Date().toISOString().split("T")[0]);

const resetState = () => {
  rmMode.value = "auto";
  pendudukMode.value = "new";
  showChangePenduduk.value = false;
  showEditPendudukModal.value = false;
  hasSubResourceUpdate.value = false;
  form.value = createDefaultPasienForm();
  newPenduduk.value = createDefaultNewPenduduk();
  linkedPenduduk.value = null;
  linkedIbu.value = null;
  initialWilayahKtpLabel.value = "";
  initialWilayahDomisiliLabel.value = "";
  draftPenjaminList.value = [];
  livePenjaminList.value = [];
  errors.value = {};
  wilayahKeyCounter.value += 1;
};

const populateFromDetail = (detail: PasienItem) => {
  rmMode.value = "manual";
  pendudukMode.value = "existing";
  showChangePenduduk.value = false;
  linkedPenduduk.value = detail.penduduk ?? null;
  linkedIbu.value = detail.pendudukIbu ?? null;
  livePenjaminList.value = detail.penjaminList ? [...detail.penjaminList] : [];
  initialWilayahDomisiliLabel.value = formatKelurahanLabel(
    detail.kelurahanDomisili,
  );
  wilayahKeyCounter.value += 1;

  form.value = {
    noRm: detail.noRm || "",
    formatNoRm: "",
    pendudukId: detail.pendudukId,
    pendudukIbuId: detail.pendudukIbuId ?? undefined,
    isBayiBaruLahir: Boolean(detail.isBayiBaruLahir),
    isIdentitasTidakDiketahui: Boolean(detail.isIdentitasTidakDiketahui),
    alamatSamaKtp: detail.alamatSamaKtp !== false,
    alamatDomisili: detail.alamatDomisili || "",
    idKelurahanDomisili: detail.idKelurahanDomisili || "",
    rtDomisili: detail.rtDomisili || "",
    rwDomisili: detail.rwDomisili || "",
    namaPj: detail.namaPj || "",
    hubunganPj: detail.hubunganPj || "",
    noHpPj: detail.noHpPj || "",
    alamatPj: detail.alamatPj || "",
    catatanPenting: detail.catatanPenting || "",
    status: detail.status === "N" ? "N" : "Y",
  };
};

const loadDetail = async (id: number) => {
  modalLoading.value = true;
  try {
    const detail = await pasienService.getPasienById(id);
    populateFromDetail(detail);
  } catch (err: any) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat detail pasien"),
      "error",
    );
    emit("close");
  } finally {
    modalLoading.value = false;
  }
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();
    await loadReferences();

    if (targetId) {
      await loadDetail(targetId);
    }
  },
  { immediate: true },
);

watch(
  () => form.value.isIdentitasTidakDiketahui,
  (unknown) => {
    if (isEdit.value || pendudukMode.value !== "new") return;
    if (unknown) {
      newPenduduk.value.jenisIdentitas = JenisIdentitas.TANPA_IDENTITAS;
    } else if (
      newPenduduk.value.jenisIdentitas === JenisIdentitas.TANPA_IDENTITAS
    ) {
      newPenduduk.value.jenisIdentitas = JenisIdentitas.KTP;
    }
  },
);

watch(
  () => form.value.isBayiBaruLahir,
  (isBaby) => {
    if (!isBaby) {
      form.value.pendudukIbuId = undefined;
      linkedIbu.value = null;
    } else if (!isEdit.value && pendudukMode.value === "new") {
      if (newPenduduk.value.jenisIdentitas === JenisIdentitas.KTP) {
        newPenduduk.value.jenisIdentitas = JenisIdentitas.KIA;
      }
    }
  },
);

watch(
  () => newPenduduk.value.statusHidup,
  (status) => {
    if (status !== StatusHidup.MENINGGAL) {
      newPenduduk.value.tanggalMeninggal = "";
      errors.value.newTanggalMeninggal = "";
    }
  },
);

const handlePendudukSelected = (penduduk: PendudukItem | null) => {
  linkedPenduduk.value = penduduk;
  errors.value.pendudukId = "";
};

const handleIbuSelected = (ibu: PendudukItem | null) => {
  linkedIbu.value = ibu;
  if (ibu && !newPenduduk.value.namaIbuKandung.trim()) {
    newPenduduk.value.namaIbuKandung = ibu.namaLengkap;
  }
};

const handleWilayahKtpSelect = (item: any) => {
  newPenduduk.value.idKelurahan = item.id || "";
  if (!newPenduduk.value.kodePos.trim() && item.kodePos) {
    newPenduduk.value.kodePos = item.kodePos;
  }
};

const handleWilayahKtpClear = () => {
  newPenduduk.value.idKelurahan = "";
};

const handleWilayahDomisiliSelect = (item: any) => {
  form.value.idKelurahanDomisili = item.id || "";
};

const handleWilayahDomisiliClear = () => {
  form.value.idKelurahanDomisili = "";
};

const validateNewPenduduk = (nextErrors: Record<string, string>) => {
  const np = newPenduduk.value;

  if (np.nik.trim() && !/^\d{16}$/.test(np.nik.trim())) {
    nextErrors.newNik = "NIK harus terdiri dari tepat 16 digit angka";
  }

  if (np.noKk.trim() && !/^\d{16}$/.test(np.noKk.trim())) {
    nextErrors.newNoKk = "No. KK harus terdiri dari tepat 16 digit angka";
  }

  if (!np.namaLengkap.trim()) {
    nextErrors.newNamaLengkap = "Nama lengkap pasien wajib diisi";
  } else if (np.namaLengkap.trim().length > 150) {
    nextErrors.newNamaLengkap = "Nama lengkap maksimal 150 karakter";
  }

  if (np.tanggalLahir) {
    const birth = new Date(np.tanggalLahir);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (Number.isNaN(birth.getTime()) || birth > today) {
      nextErrors.newTanggalLahir =
        "Tanggal lahir tidak valid atau melebihi hari ini";
    }
  }

  if (np.statusHidup === StatusHidup.MENINGGAL && np.tanggalMeninggal) {
    const death = new Date(np.tanggalMeninggal);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (Number.isNaN(death.getTime()) || death > today) {
      nextErrors.newTanggalMeninggal =
        "Tanggal meninggal tidak valid atau melebihi hari ini";
    } else if (np.tanggalLahir && death < new Date(np.tanggalLahir)) {
      nextErrors.newTanggalMeninggal =
        "Tanggal meninggal tidak boleh lebih awal dari tanggal lahir";
    }
  }

  if (np.noTelepon.trim() && !/^[0-9+\-\s]+$/.test(np.noTelepon.trim())) {
    nextErrors.newNoTelepon =
      "Nomor telepon hanya boleh berisi angka, spasi, + atau -";
  }

  if (
    np.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(np.email.trim())
  ) {
    nextErrors.newEmail = "Format email tidak valid";
  }
};

const validateForm = (): boolean => {
  const nextErrors: Record<string, string> = {};
  const f = form.value;

  if (isEdit.value || rmMode.value === "manual") {
    if (!f.noRm.trim()) {
      nextErrors.noRm = "Nomor Rekam Medis wajib diisi";
    } else if (f.noRm.trim().length > 30) {
      nextErrors.noRm = "Nomor Rekam Medis maksimal 30 karakter";
    }
  }

  if (isEdit.value || pendudukMode.value === "existing") {
    if (!f.pendudukId) {
      nextErrors.pendudukId = "Data penduduk wajib dipilih";
    }
  } else {
    validateNewPenduduk(nextErrors);
  }

  if (
    f.pendudukIbuId &&
    f.pendudukId &&
    Number(f.pendudukIbuId) === Number(f.pendudukId)
  ) {
    nextErrors.pendudukIbuId =
      "Penduduk ibu kandung tidak boleh sama dengan pasien sendiri";
  }

  if (f.noHpPj.trim() && !/^[0-9+\-\s]+$/.test(f.noHpPj.trim())) {
    nextErrors.noHpPj =
      "Nomor HP penanggung jawab hanya boleh berisi angka, spasi, + atau -";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const buildNewPendudukPayload = (): CreatePendudukPayload => {
  const np = newPenduduk.value;
  return {
    jenisIdentitas: np.jenisIdentitas,
    nik: np.nik.trim() || undefined,
    noIdentitasLain: np.noIdentitasLain.trim() || undefined,
    noKk: np.noKk.trim() || undefined,
    namaLengkap: np.namaLengkap.trim(),
    namaIbuKandung: np.namaIbuKandung.trim() || undefined,
    tempatLahir: np.tempatLahir.trim() || undefined,
    tanggalLahir: np.tanggalLahir || undefined,
    jenisKelamin: np.jenisKelamin,
    golonganDarah: np.golonganDarah || undefined,
    rhesus: np.rhesus || undefined,
    statusPerkawinan: np.statusPerkawinan || undefined,
    kewarganegaraan: np.kewarganegaraan,
    statusHidup: np.statusHidup,
    tanggalMeninggal:
      np.statusHidup === StatusHidup.MENINGGAL
        ? np.tanggalMeninggal || undefined
        : undefined,
    agamaId: np.agamaId,
    pendidikanId: np.pendidikanId,
    pekerjaanId: np.pekerjaanId,
    sukuId: np.sukuId,
    noTelepon: np.noTelepon.trim() || undefined,
    email: np.email.trim() || undefined,
    idKelurahan: np.idKelurahan || undefined,
    rt: np.rt.trim() || undefined,
    rw: np.rw.trim() || undefined,
    kodePos: np.kodePos.trim() || undefined,
    alamatKtp: np.alamatKtp.trim() || undefined,
    ihsPatientId: np.ihsPatientId.trim() || undefined,
  };
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const f = form.value;
    let saved: PasienItem;

    if (isEdit.value && props.editId) {
      const updatePayload: UpdatePasienPayload = {
        noRm: f.noRm.trim(),
        pendudukId: f.pendudukId,
        pendudukIbuId: f.isBayiBaruLahir ? f.pendudukIbuId : undefined,
        isBayiBaruLahir: f.isBayiBaruLahir,
        isIdentitasTidakDiketahui: f.isIdentitasTidakDiketahui,
        alamatSamaKtp: f.alamatSamaKtp,
        alamatDomisili: f.alamatSamaKtp
          ? undefined
          : f.alamatDomisili.trim() || undefined,
        idKelurahanDomisili: f.alamatSamaKtp
          ? undefined
          : f.idKelurahanDomisili || undefined,
        rtDomisili: f.alamatSamaKtp
          ? undefined
          : f.rtDomisili.trim() || undefined,
        rwDomisili: f.alamatSamaKtp
          ? undefined
          : f.rwDomisili.trim() || undefined,
        namaPj: f.namaPj.trim() || undefined,
        hubunganPj: f.hubunganPj || undefined,
        noHpPj: f.noHpPj.trim() || undefined,
        alamatPj: f.alamatPj.trim() || undefined,
        catatanPenting: f.catatanPenting.trim() || undefined,
        status: f.status,
      };
      saved = await pasienService.updatePasien(props.editId, updatePayload);
    } else {
      const createPayload: CreatePasienPayload = {
        noRm: rmMode.value === "manual" ? f.noRm.trim() : undefined,
        formatNoRm:
          rmMode.value === "auto" && f.formatNoRm
            ? f.formatNoRm
            : undefined,
        pendudukId: pendudukMode.value === "existing" ? f.pendudukId : undefined,
        penduduk:
          pendudukMode.value === "new" ? buildNewPendudukPayload() : undefined,
        pendudukIbuId: f.isBayiBaruLahir ? f.pendudukIbuId : undefined,
        isBayiBaruLahir: f.isBayiBaruLahir,
        isIdentitasTidakDiketahui: f.isIdentitasTidakDiketahui,
        alamatSamaKtp: f.alamatSamaKtp,
        alamatDomisili: f.alamatSamaKtp
          ? undefined
          : f.alamatDomisili.trim() || undefined,
        idKelurahanDomisili: f.alamatSamaKtp
          ? undefined
          : f.idKelurahanDomisili || undefined,
        rtDomisili: f.alamatSamaKtp
          ? undefined
          : f.rtDomisili.trim() || undefined,
        rwDomisili: f.alamatSamaKtp
          ? undefined
          : f.rwDomisili.trim() || undefined,
        namaPj: f.namaPj.trim() || undefined,
        hubunganPj: f.hubunganPj || undefined,
        noHpPj: f.noHpPj.trim() || undefined,
        alamatPj: f.alamatPj.trim() || undefined,
        catatanPenting: f.catatanPenting.trim() || undefined,
        status: f.status,
        penjaminList:
          draftPenjaminList.value.length > 0
            ? draftPenjaminList.value
            : undefined,
      };
      saved = await pasienService.createPasien(createPayload);
    }

    showToast(
      isEdit.value
        ? `Data pasien No. RM "${saved.noRm}" berhasil diperbarui`
        : `Pasien baru "${saved.penduduk?.namaLengkap || ""}" (No. RM: ${saved.noRm}) berhasil didaftarkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: any) {
    const msg = extractApiErrorMessage(err, "Gagal menyimpan data pasien");
    const lower = msg.toLowerCase();
    if (lower.includes("rm")) errors.value.noRm = msg;
    if (lower.includes("nik")) errors.value.newNik = msg;
    if (lower.includes("penduduk tersebut sudah terdaftar")) {
      errors.value.pendudukId = msg;
    }
    showToast(msg, "error");
  } finally {
    submitLoading.value = false;
  }
};

const handlePendudukSaved = async (updatedPenduduk: PendudukItem) => {
  linkedPenduduk.value = updatedPenduduk;
  hasSubResourceUpdate.value = true;
  if (props.editId) {
    await loadDetail(props.editId);
  }
};

const handleLivePenjaminUpdated = (items: PasienPenjaminItem[]) => {
  livePenjaminList.value = items;
  hasSubResourceUpdate.value = true;
};

const handleClose = () => {
  if (submitLoading.value) return;
  if (hasSubResourceUpdate.value && linkedPenduduk.value) {
    emit("saved", {
      id: props.editId || 0,
      noRm: form.value.noRm,
      pendudukId: form.value.pendudukId || 0,
      isBayiBaruLahir: form.value.isBayiBaruLahir,
      isIdentitasTidakDiketahui: form.value.isIdentitasTidakDiketahui,
      alamatSamaKtp: form.value.alamatSamaKtp,
      status: form.value.status,
    });
  }
  emit("close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (
    e.key === "Escape" &&
    props.show &&
    !submitLoading.value &&
    !showEditPendudukModal.value
  ) {
    handleClose();
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
      <div class="modal-box max-w-5xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
        <!-- HEADER -->
        <div class="flex-none pr-8 mb-5">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
            :disabled="submitLoading"
            aria-label="Tutup modal"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HeartPulse class="w-5 h-5" />
            </div>
            <div>
              <span>{{ isEdit ? "Edit Data Master Pasien" : "Registrasi Pasien Baru" }}</span>
              <p v-if="isEdit && form.noRm" class="text-xs font-mono font-bold text-primary mt-0.5">
                No. RM: {{ form.noRm }}
              </p>
            </div>
          </h3>
        </div>

        <!-- LOADING -->
        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse">
          <div class="h-24 bg-base-200 rounded-2xl"></div>
          <div class="h-36 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <!-- FORM BODY -->
        <form
          v-else
          id="pasien-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <!-- BAGIAN 1: NOMOR RM & KATEGORI KHUSUS -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <IdCard class="w-4 h-4" />
                1. Nomor Rekam Medis & Kategori Pasien
              </h4>

              <div v-if="!isEdit" class="flex items-center gap-1.5 bg-base-100 p-1 rounded-xl border border-base-content/10 w-fit">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="rmMode === 'auto' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="rmMode = 'auto'; errors.noRm = ''"
                >
                  Generate Otomatis
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="rmMode === 'manual' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="rmMode = 'manual'"
                >
                  Input Manual (Migrasi)
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="!isEdit && rmMode === 'auto'">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Format Nomor RM Otomatis
                </label>
                <select
                  v-model="form.formatNoRm"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option value="">Ikuti Pengaturan Tenant (Default)</option>
                  <option
                    v-for="opt in FORMAT_NO_RM_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div v-else>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nomor Rekam Medis (No. RM) <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.noRm"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: 00000001 atau 00-00-01"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono font-bold"
                  :class="{ 'border-error': errors.noRm }"
                  @input="errors.noRm = ''"
                />
                <span v-if="errors.noRm" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.noRm }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Aktif Pasien
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="flex items-center justify-center gap-1.5 h-11 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'Y'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'Y'"
                  >
                    <CheckCircle2 class="w-4 h-4" />
                    Aktif (Y)
                  </button>
                  <button
                    type="button"
                    class="flex items-center justify-center gap-1.5 h-11 rounded-xl border text-xs font-bold transition"
                    :class="
                      form.status === 'N'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                        : 'bg-base-100 border-base-content/10 text-base-content/60'
                    "
                    @click="form.status = 'N'"
                  >
                    <XCircle class="w-4 h-4" />
                    Nonaktif (N)
                  </button>
                </div>
              </div>
            </div>

            <!-- Flag Kasus Khusus -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label class="flex items-start gap-3 p-3 rounded-xl bg-base-100 border border-base-content/10 cursor-pointer hover:border-primary/40 transition">
                <input
                  v-model="form.isBayiBaruLahir"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm mt-0.5"
                />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-base-content flex items-center gap-1.5">
                    <Baby class="w-3.5 h-3.5 text-primary" />
                    Bayi Baru Lahir
                  </p>
                  <p class="text-[11px] text-base-content/55 mt-0.5">
                    NIK boleh dikosongkan dan dapat ditautkan ke data penduduk ibu kandung.
                  </p>
                </div>
              </label>

              <label class="flex items-start gap-3 p-3 rounded-xl bg-base-100 border border-base-content/10 cursor-pointer hover:border-warning/40 transition">
                <input
                  v-model="form.isIdentitasTidakDiketahui"
                  type="checkbox"
                  class="checkbox checkbox-warning checkbox-sm mt-0.5"
                />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-base-content flex items-center gap-1.5">
                    <AlertTriangle class="w-3.5 h-3.5 text-warning" />
                    IGD Tanpa Identitas (Mr. X / Mrs. X)
                  </p>
                  <p class="text-[11px] text-base-content/55 mt-0.5">
                    Untuk pasien darurat yang belum membawa kartu identitas.
                  </p>
                </div>
              </label>
            </div>

            <!-- Tautan Ibu Kandung untuk Bayi -->
            <div v-if="form.isBayiBaruLahir" class="pt-1">
              <PendudukSelector
                v-model="form.pendudukIbuId"
                mode="all"
                :initial-penduduk="linkedIbu"
                :error="errors.pendudukIbuId"
                label="Tautkan Data Ibu Kandung (Opsional)"
                placeholder="Cari NIK atau nama ibu kandung..."
                @selected="handleIbuSelected"
              />
            </div>
          </section>

          <!-- BAGIAN 2: DATA KEPENDUDUKAN -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <UserRound class="w-4 h-4" />
                2. Data Kependudukan Pasien <span class="text-error">*</span>
              </h4>

              <div v-if="!isEdit" class="flex items-center gap-1.5 bg-base-100 p-1 rounded-xl border border-base-content/10 w-fit">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="pendudukMode === 'new' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="pendudukMode = 'new'; form.pendudukId = undefined; errors.pendudukId = ''"
                >
                  + Input Penduduk Baru
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="pendudukMode === 'existing' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="pendudukMode = 'existing'"
                >
                  Pilih Penduduk Terdaftar
                </button>
              </div>
            </div>

            <!-- EDIT MODE: Ringkasan Penduduk Tertaut -->
            <div v-if="isEdit && !showChangePenduduk" class="p-4 rounded-2xl bg-base-100 border border-base-content/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <div class="font-bold text-sm text-base-content">
                  {{ linkedPenduduk?.namaLengkap || `Penduduk #${form.pendudukId}` }}
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60">
                  <span class="font-mono">
                    {{ linkedPenduduk?.jenisIdentitas || "NIK" }}:
                    {{ linkedPenduduk?.nik || linkedPenduduk?.noIdentitasLain || "-" }}
                  </span>
                  <span v-if="linkedPenduduk?.tanggalLahir">
                    Lahir: {{ formatDate(linkedPenduduk.tanggalLahir) }}
                  </span>
                  <span v-if="linkedPenduduk?.noTelepon">
                    HP: {{ linkedPenduduk.noTelepon }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  class="btn btn-outline btn-primary btn-xs rounded-xl gap-1"
                  @click="showEditPendudukModal = true"
                >
                  <Pencil class="w-3.5 h-3.5" />
                  Edit Kependudukan
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs rounded-xl"
                  @click="showChangePenduduk = true"
                >
                  Ganti Tautan
                </button>
              </div>
            </div>

            <!-- EXISTING PENDUDUK SELECTOR -->
            <div v-else-if="isEdit || pendudukMode === 'existing'" class="space-y-2">
              <PendudukSelector
                v-model="form.pendudukId"
                mode="all"
                :initial-penduduk="linkedPenduduk"
                :error="errors.pendudukId"
                label="Cari Data Penduduk"
                placeholder="Cari NIK 16 digit atau nama lengkap..."
                @selected="handlePendudukSelected"
              />
              <button
                v-if="isEdit && showChangePenduduk"
                type="button"
                class="btn btn-ghost btn-xs rounded-lg text-base-content/60"
                @click="showChangePenduduk = false"
              >
                Batal ganti tautan penduduk
              </button>
            </div>

            <!-- NEW PENDUDUK FORM -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Jenis Identitas
                </label>
                <select
                  v-model="newPenduduk.jenisIdentitas"
                  class="select select-bordered select-sm w-full rounded-xl h-10 text-sm"
                >
                  <option
                    v-for="opt in JENIS_IDENTITAS_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  NIK (16 Digit)
                  <span class="text-[10px] font-normal text-base-content/50">(opsional u/ bayi/IGD)</span>
                </label>
                <input
                  v-model="newPenduduk.nik"
                  type="text"
                  maxlength="16"
                  inputmode="numeric"
                  placeholder="3273011505900001"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm font-mono"
                  :class="{ 'border-error': errors.newNik }"
                  @input="errors.newNik = ''"
                />
                <span v-if="errors.newNik" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newNik }}
                </span>
              </div>

              <div v-if="newPenduduk.jenisIdentitas !== JenisIdentitas.KTP && newPenduduk.jenisIdentitas !== JenisIdentitas.TANPA_IDENTITAS">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Nomor Identitas Lain ({{ newPenduduk.jenisIdentitas }})
                </label>
                <input
                  v-model="newPenduduk.noIdentitasLain"
                  type="text"
                  maxlength="50"
                  placeholder="Nomor Paspor / KIA / KITAS"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm font-mono"
                />
              </div>

              <div v-else>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  No. Kartu Keluarga (16 Digit)
                </label>
                <input
                  v-model="newPenduduk.noKk"
                  type="text"
                  maxlength="16"
                  inputmode="numeric"
                  placeholder="3273011505900099"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm font-mono"
                  :class="{ 'border-error': errors.newNoKk }"
                  @input="errors.newNoKk = ''"
                />
                <span v-if="errors.newNoKk" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newNoKk }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Nama Lengkap Pasien <span class="text-error">*</span>
                </label>
                <input
                  v-model="newPenduduk.namaLengkap"
                  type="text"
                  maxlength="150"
                  :placeholder="
                    form.isBayiBaruLahir
                      ? 'Contoh: By. Ny. Siti Aminah'
                      : form.isIdentitasTidakDiketahui
                        ? 'Contoh: Tn. X (Pasien IGD)'
                        : 'Contoh: Budi Santoso'
                  "
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm font-medium"
                  :class="{ 'border-error': errors.newNamaLengkap }"
                  @input="errors.newNamaLengkap = ''"
                />
                <span v-if="errors.newNamaLengkap" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newNamaLengkap }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Jenis Kelamin <span class="text-error">*</span>
                </label>
                <select
                  v-model="newPenduduk.jenisKelamin"
                  class="select select-bordered select-sm w-full rounded-xl h-10 text-sm"
                >
                  <option
                    v-for="opt in JENIS_KELAMIN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Nama Ibu Kandung
                </label>
                <input
                  v-model="newPenduduk.namaIbuKandung"
                  type="text"
                  maxlength="150"
                  placeholder="Verifikasi identitas / SATUSEHAT"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Tempat Lahir
                </label>
                <input
                  v-model="newPenduduk.tempatLahir"
                  type="text"
                  maxlength="100"
                  placeholder="Bandung"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Tanggal Lahir
                </label>
                <FlatpickrDate
                  v-model="newPenduduk.tanggalLahir"
                  size="sm"
                  :max-date="todayIso"
                  :error="Boolean(errors.newTanggalLahir)"
                  placeholder="Pilih tanggal lahir..."
                  @change="errors.newTanggalLahir = ''"
                />
                <span v-if="errors.newTanggalLahir" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newTanggalLahir }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  No. Telepon / HP
                </label>
                <input
                  v-model="newPenduduk.noTelepon"
                  type="text"
                  maxlength="20"
                  placeholder="081234567890"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                  :class="{ 'border-error': errors.newNoTelepon }"
                  @input="errors.newNoTelepon = ''"
                />
                <span v-if="errors.newNoTelepon" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newNoTelepon }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Email
                </label>
                <input
                  v-model="newPenduduk.email"
                  type="email"
                  maxlength="150"
                  placeholder="pasien@example.com"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                  :class="{ 'border-error': errors.newEmail }"
                  @input="errors.newEmail = ''"
                />
                <span v-if="errors.newEmail" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newEmail }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Gol. Darah & Rhesus
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <select
                    v-model="newPenduduk.golonganDarah"
                    class="select select-bordered select-sm rounded-xl h-10 text-xs"
                  >
                    <option value="">Gol</option>
                    <option
                      v-for="opt in GOLONGAN_DARAH_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                  <select
                    v-model="newPenduduk.rhesus"
                    class="select select-bordered select-sm rounded-xl h-10 text-xs"
                  >
                    <option value="">Rh</option>
                    <option
                      v-for="opt in RHESUS_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.value }}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Status Perkawinan
                </label>
                <select
                  v-model="newPenduduk.statusPerkawinan"
                  class="select select-bordered select-sm w-full rounded-xl h-10 text-sm"
                >
                  <option value="">-- Pilih --</option>
                  <option
                    v-for="opt in STATUS_PERKAWINAN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Kewarganegaraan
                </label>
                <select
                  v-model="newPenduduk.kewarganegaraan"
                  class="select select-bordered select-sm w-full rounded-xl h-10 text-sm"
                >
                  <option
                    v-for="opt in KEWARGANEGARAAN_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Status Hidup
                </label>
                <select
                  v-model="newPenduduk.statusHidup"
                  class="select select-bordered select-sm w-full rounded-xl h-10 text-sm"
                >
                  <option
                    v-for="opt in STATUS_HIDUP_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div v-if="newPenduduk.statusHidup === StatusHidup.MENINGGAL">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Tanggal Meninggal
                </label>
                <FlatpickrDate
                  v-model="newPenduduk.tanggalMeninggal"
                  size="sm"
                  :min-date="newPenduduk.tanggalLahir || undefined"
                  :max-date="todayIso"
                  :error="Boolean(errors.newTanggalMeninggal)"
                  placeholder="Pilih tanggal meninggal..."
                  @change="errors.newTanggalMeninggal = ''"
                />
                <span v-if="errors.newTanggalMeninggal" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newTanggalMeninggal }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1 flex items-center gap-1.5">
                  <span>Agama</span>
                  <span v-if="loadingReferences" class="loading loading-spinner loading-xs text-primary"></span>
                </label>
                <Select2
                  v-model="newPenduduk.agamaId"
                  :options="agamaOptions"
                  label-key="nama"
                  value-key="id"
                  placeholder="Agama..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Pendidikan
                </label>
                <Select2
                  v-model="newPenduduk.pendidikanId"
                  :options="pendidikanOptions"
                  label-key="nama"
                  value-key="id"
                  placeholder="Pendidikan..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Pekerjaan / Suku
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <Select2
                    v-model="newPenduduk.pekerjaanId"
                    :options="pekerjaanOptions"
                    label-key="nama"
                    value-key="id"
                    placeholder="Pekerjaan"
                  />
                  <Select2
                    v-model="newPenduduk.sukuId"
                    :options="sukuOptions"
                    label-key="nama"
                    value-key="id"
                    placeholder="Suku"
                  />
                </div>
              </div>

              <div class="sm:col-span-2 lg:col-span-3">
                <UiAutocompleteWilayah
                  :key="`ktp-wilayah-${wilayahKeyCounter}`"
                  v-model="newPenduduk.idKelurahan"
                  :initial-label="initialWilayahKtpLabel"
                  label="Wilayah Administratif KTP (Kelurahan / Kecamatan / Kota)"
                  @select="handleWilayahKtpSelect"
                  @clear="handleWilayahKtpClear"
                />
              </div>

              <div class="grid grid-cols-3 gap-2 sm:col-span-2 lg:col-span-1">
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">RT</label>
                  <input v-model="newPenduduk.rt" type="text" maxlength="5" placeholder="001" class="input input-bordered input-sm w-full rounded-xl h-10 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">RW</label>
                  <input v-model="newPenduduk.rw" type="text" maxlength="5" placeholder="002" class="input input-bordered input-sm w-full rounded-xl h-10 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-base-content/80 mb-1">Kd Pos</label>
                  <input v-model="newPenduduk.kodePos" type="text" maxlength="10" placeholder="40111" class="input input-bordered input-sm w-full rounded-xl h-10 text-sm" />
                </div>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Alamat Lengkap KTP
                </label>
                <input
                  v-model="newPenduduk.alamatKtp"
                  type="text"
                  maxlength="500"
                  placeholder="Jl. Asia Afrika No. 10"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                />
              </div>
            </div>
          </section>

          <!-- BAGIAN 3: ALAMAT DOMISILI -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <MapPin class="w-4 h-4" />
                3. Alamat Domisili Saat Ini
              </h4>

              <label class="flex items-center gap-2 cursor-pointer bg-base-100 px-3 py-1.5 rounded-xl border border-base-content/10 w-fit">
                <input
                  v-model="form.alamatSamaKtp"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-xs"
                />
                <span class="text-xs font-bold text-base-content">Sama dengan alamat KTP</span>
              </label>
            </div>

            <p v-if="form.alamatSamaKtp" class="text-xs text-base-content/60">
              Alamat domisili pasien mengikuti data alamat KTP pada kependudukan.
            </p>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <UiAutocompleteWilayah
                  :key="`domisili-wilayah-${wilayahKeyCounter}`"
                  v-model="form.idKelurahanDomisili"
                  :initial-label="initialWilayahDomisiliLabel"
                  label="Wilayah Domisili (Kelurahan / Kecamatan / Kota)"
                  placeholder="Ketik nama kelurahan domisili..."
                  @select="handleWilayahDomisiliSelect"
                  @clear="handleWilayahDomisiliClear"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  RT Domisili
                </label>
                <input
                  v-model="form.rtDomisili"
                  type="text"
                  maxlength="5"
                  placeholder="003"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  RW Domisili
                </label>
                <input
                  v-model="form.rwDomisili"
                  type="text"
                  maxlength="5"
                  placeholder="005"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Alamat Lengkap Domisili
                </label>
                <textarea
                  v-model="form.alamatDomisili"
                  rows="2"
                  maxlength="500"
                  placeholder="Jl. Dago Asri No. 12"
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>
            </div>
          </section>

          <!-- BAGIAN 4: PENANGGUNG JAWAB & CATATAN PENTING -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <PhoneCall class="w-4 h-4" />
              4. Penanggung Jawab (Kontak Darurat) & Catatan Medis Ringkas
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nama Penanggung Jawab
                </label>
                <input
                  v-model="form.namaPj"
                  type="text"
                  maxlength="150"
                  placeholder="Contoh: Siti Aminah"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Hubungan dengan Pasien
                </label>
                <select
                  v-model="form.hubunganPj"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                >
                  <option value="">-- Pilih Hubungan --</option>
                  <option
                    v-for="opt in HUBUNGAN_PJ_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  No. HP Penanggung Jawab
                </label>
                <input
                  v-model="form.noHpPj"
                  type="text"
                  maxlength="20"
                  placeholder="081298765432"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors.noHpPj }"
                  @input="errors.noHpPj = ''"
                />
                <span v-if="errors.noHpPj" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.noHpPj }}
                </span>
              </div>

              <div class="sm:col-span-3">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Alamat Penanggung Jawab
                </label>
                <input
                  v-model="form.alamatPj"
                  type="text"
                  maxlength="500"
                  placeholder="Jl. Merdeka No. 8"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div class="sm:col-span-3">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Catatan Penting / Alergi Obat / Kondisi Khusus
                </label>
                <textarea
                  v-model="form.catatanPenting"
                  rows="2"
                  maxlength="1000"
                  placeholder="Contoh: Alergi antibiotik golongan penisilin, riwayat asma..."
                  class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"
                ></textarea>
              </div>
            </div>
          </section>

          <!-- BAGIAN 5: PENJAMIN / ASURANSI PASIEN -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5 pb-8">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <ShieldCheck class="w-4 h-4" />
              5. Penjamin / Asuransi Pasien (Multi-Penjamin)
            </h4>

            <PasienPenjaminManager
              v-if="isEdit"
              :pasien-id="editId"
              :initial-items="livePenjaminList"
              @updated="handleLivePenjaminUpdated"
            />
            <PasienPenjaminManager
              v-else
              v-model="draftPenjaminList"
            />
          </section>
        </form>

        <!-- FOOTER -->
        <div class="flex-none modal-action gap-2 pt-4 mt-2 border-t border-base-content/10">
          <button
            type="button"
            class="btn btn-ghost rounded-2xl font-bold px-5"
            :disabled="submitLoading"
            @click="handleClose"
          >
            Batal
          </button>
          <button
            type="submit"
            form="pasien-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
            :disabled="submitLoading || modalLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Daftarkan Pasien" }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Reuse Edit Data Penduduk saat Edit Pasien -->
    <PendudukFormModal
      v-if="isEdit && form.pendudukId"
      :show="showEditPendudukModal"
      :edit-id="form.pendudukId"
      @close="showEditPendudukModal = false"
      @saved="handlePendudukSaved"
    />
  </Teleport>
</template>

