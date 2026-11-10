<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  Briefcase,
  CheckCircle2,
  FileBadge,
  IdCard,
  Stethoscope,
  X,
  XCircle,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import UiAutocompleteWilayah from "@/components/ui/AutocompleteWilayah.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import PendudukSelector from "@/components/master/PendudukSelector.vue";
import { DokterService } from "@/services/dokter.service";
import { useMasterReferences } from "@/composables/useMasterReferences";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  formatKelurahanLabel,
  formatNamaGelarDokter,
  GOLONGAN_DARAH_OPTIONS,
  JENIS_DOKTER_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  JenisDokter,
  JenisKelamin,
  Kewarganegaraan,
  RHESUS_OPTIONS,
  STATUS_AKTIF_PEGAWAI_OPTIONS,
  STATUS_KEPEGAWAIAN_OPTIONS,
  StatusAktifPegawai,
  type AvailablePegawaiOption,
  type CreateDokterPayload,
  type DokterItem,
  type GolonganDarah,
  type PendudukItem,
  type RhesusDarah,
  type StatusKepegawaian,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", item: DokterItem): void;
}>();

const dokterService = DokterService();
const { showToast } = useToast();
const {
  agamaOptions,
  pendidikanOptions,
  pekerjaanOptions,
  sukuOptions,
  loadReferences,
} = useMasterReferences();

const isEdit = computed(() => Boolean(props.editId));
const modalLoading = ref(false);
const submitLoading = ref(false);

type PendudukMode = "existing" | "new";
type PegawaiMode = "none" | "existing" | "new";

const pendudukMode = ref<PendudukMode>("existing");
const pegawaiMode = ref<PegawaiMode>("none");

const linkedPenduduk = ref<Partial<PendudukItem> | null>(null);
const availablePegawaiList = ref<AvailablePegawaiOption[]>([]);
const currentPegawaiOption = ref<AvailablePegawaiOption | null>(null);
const initialWilayahLabel = ref("");
const pegawaiAutoSynced = ref(false);

interface DokterFormState {
  kodeDokter: string;
  pendudukId: number | undefined;
  pegawaiId: number | undefined;
  gelarDepan: string;
  gelarBelakang: string;
  jenisDokter: JenisDokter;
  spesialisasi: string;
  noStr: string;
  isStrSeumurHidup: boolean;
  strTerbitPada: string;
  strBerlakuSampai: string;
  noSip: string;
  sipTerbitPada: string;
  sipBerlakuSampai: string;
  ihsPractitionerId: string;
  kodeBpjs: string;
  status: MasterStatus;
}

interface NewPendudukState {
  nik: string;
  namaLengkap: string;
  jenisKelamin: JenisKelamin;
  tempatLahir: string;
  tanggalLahir: string;
  golonganDarah: GolonganDarah | "";
  rhesus: RhesusDarah | "";
  agamaId: number | undefined;
  pendidikanId: number | undefined;
  pekerjaanId: number | undefined;
  sukuId: number | undefined;
  noTelepon: string;
  email: string;
  idKelurahan: string;
  alamatKtp: string;
}

interface NewPegawaiState {
  nip: string;
  name: string;
  position: string;
  statusKepegawaian: StatusKepegawaian | "";
  statusAktif: StatusAktifPegawai;
  unitKerja: string;
  tanggalMasuk: string;
  email: string;
  phoneNumber: string;
}

const createDefaultDokterForm = (): DokterFormState => ({
  kodeDokter: "",
  pendudukId: undefined,
  pegawaiId: undefined,
  gelarDepan: "",
  gelarBelakang: "",
  jenisDokter: JenisDokter.UMUM,
  spesialisasi: "",
  noStr: "",
  isStrSeumurHidup: false,
  strTerbitPada: "",
  strBerlakuSampai: "",
  noSip: "",
  sipTerbitPada: "",
  sipBerlakuSampai: "",
  ihsPractitionerId: "",
  kodeBpjs: "",
  status: "Y",
});

const createDefaultNewPenduduk = (): NewPendudukState => ({
  nik: "",
  namaLengkap: "",
  jenisKelamin: JenisKelamin.LAKI_LAKI,
  tempatLahir: "",
  tanggalLahir: "",
  golonganDarah: "",
  rhesus: "",
  agamaId: undefined,
  pendidikanId: undefined,
  pekerjaanId: undefined,
  sukuId: undefined,
  noTelepon: "",
  email: "",
  idKelurahan: "",
  alamatKtp: "",
});

const createDefaultNewPegawai = (): NewPegawaiState => ({
  nip: "",
  name: "",
  position: "",
  statusKepegawaian: "",
  statusAktif: StatusAktifPegawai.AKTIF,
  unitKerja: "",
  tanggalMasuk: "",
  email: "",
  phoneNumber: "",
});

const form = ref<DokterFormState>(createDefaultDokterForm());
const newPenduduk = ref<NewPendudukState>(createDefaultNewPenduduk());
const newPegawai = ref<NewPegawaiState>(createDefaultNewPegawai());
const errors = ref<Record<string, string>>({});
const todayIso = computed(() => new Date().toISOString().split("T")[0]);

const pegawaiSelectOptions = computed(() => {
  const combined = [...availablePegawaiList.value];
  if (
    currentPegawaiOption.value &&
    !combined.some((p) => p.id === currentPegawaiOption.value!.id)
  ) {
    combined.unshift(currentPegawaiOption.value);
  }
  return combined.map((p) => ({
    id: p.id,
    displayName: `${p.name} (NIP: ${p.nip})${p.penduduk?.nik ? ` — NIK: ${p.penduduk.nik}` : ""}`,
    raw: p,
  }));
});

const previewNamaTampilan = computed(() => {
  const baseName =
    pendudukMode.value === "new"
      ? newPenduduk.value.namaLengkap
      : linkedPenduduk.value?.namaLengkap;
  return formatNamaGelarDokter(
    form.value.gelarDepan,
    baseName || "Nama Dokter",
    form.value.gelarBelakang,
  );
});

const resetState = () => {
  pendudukMode.value = "existing";
  pegawaiMode.value = "none";
  form.value = createDefaultDokterForm();
  newPenduduk.value = createDefaultNewPenduduk();
  newPegawai.value = createDefaultNewPegawai();
  linkedPenduduk.value = null;
  currentPegawaiOption.value = null;
  initialWilayahLabel.value = "";
  pegawaiAutoSynced.value = false;
  errors.value = {};
};

const loadAvailablePegawai = async () => {
  try {
    availablePegawaiList.value = await dokterService.getAvailablePegawai();
  } catch {
    availablePegawaiList.value = [];
  }
};

const populateFromDetail = (detail: DokterItem) => {
  pendudukMode.value = "existing";
  pegawaiMode.value = detail.pegawaiId ? "existing" : "none";
  linkedPenduduk.value = detail.penduduk ?? null;

  if (detail.pegawai) {
    currentPegawaiOption.value = {
      id: detail.pegawai.id,
      nip: detail.pegawai.nip,
      name: detail.pegawai.name || detail.penduduk?.namaLengkap || detail.pegawai.nip,
      position: detail.pegawai.position,
      statusKepegawaian: detail.pegawai.statusKepegawaian,
      statusAktif: detail.pegawai.statusAktif,
      pendudukId: detail.pegawai.pendudukId,
    };
  }

  form.value = {
    kodeDokter: detail.kodeDokter || "",
    pendudukId: detail.pendudukId,
    pegawaiId: detail.pegawaiId ?? undefined,
    gelarDepan: detail.gelarDepan || "",
    gelarBelakang: detail.gelarBelakang || "",
    jenisDokter: detail.jenisDokter || JenisDokter.UMUM,
    spesialisasi: detail.spesialisasi || "",
    noStr: detail.noStr || "",
    isStrSeumurHidup: Boolean(detail.isStrSeumurHidup),
    strTerbitPada: detail.strTerbitPada ? String(detail.strTerbitPada).slice(0, 10) : "",
    strBerlakuSampai: detail.strBerlakuSampai ? String(detail.strBerlakuSampai).slice(0, 10) : "",
    noSip: detail.noSip || "",
    sipTerbitPada: detail.sipTerbitPada ? String(detail.sipTerbitPada).slice(0, 10) : "",
    sipBerlakuSampai: detail.sipBerlakuSampai ? String(detail.sipBerlakuSampai).slice(0, 10) : "",
    ihsPractitionerId: detail.ihsPractitionerId || "",
    kodeBpjs: detail.kodeBpjs || "",
    status: detail.status === "N" ? "N" : "Y",
  };
};

watch(
  () => [props.show, props.editId] as const,
  async ([isOpen, targetId]) => {
    if (!isOpen) return;
    resetState();

    await Promise.all([loadAvailablePegawai(), loadReferences()]);

    if (targetId) {
      modalLoading.value = true;
      try {
        const detail = await dokterService.getDokterById(targetId);
        populateFromDetail(detail);
      } catch (err: any) {
        showToast(extractApiErrorMessage(err, "Gagal memuat detail dokter"), "error");
        emit("close");
      } finally {
        modalLoading.value = false;
      }
    }
  },
  { immediate: true },
);

watch(
  () => form.value.isStrSeumurHidup,
  (isLifetime) => {
    if (isLifetime) {
      form.value.strBerlakuSampai = "";
      errors.value.strBerlakuSampai = "";
    }
  },
);

watch(
  () => form.value.pegawaiId,
  (selectedPegawaiId) => {
    if (!selectedPegawaiId || isEdit.value) return;
    const match = pegawaiSelectOptions.value.find((opt) => opt.id === selectedPegawaiId)?.raw;
    if (match?.pendudukId && match.pendudukId !== form.value.pendudukId) {
      pendudukMode.value = "existing";
      form.value.pendudukId = match.pendudukId;
      if (match.penduduk) {
        linkedPenduduk.value = match.penduduk;
      }
      showToast(
        `Penduduk otomatis disinkronkan dengan data pegawai "${match.name}"`,
        "info",
      );
    }
  },
);

const findPegawaiByPenduduk = async (
  penduduk: PendudukItem,
): Promise<AvailablePegawaiOption | null> => {
  const cached = pegawaiSelectOptions.value.find(
    (opt) => opt.raw.pendudukId === penduduk.id,
  )?.raw;
  if (cached) return cached;

  if (!penduduk.namaLengkap) return null;

  try {
    const fetched = await dokterService.getAvailablePegawai(penduduk.namaLengkap);
    const matched = fetched.find((p) => p.pendudukId === penduduk.id) || null;
    if (matched && !availablePegawaiList.value.some((p) => p.id === matched.id)) {
      availablePegawaiList.value.push(matched);
    }
    return matched;
  } catch {
    return null;
  }
};

const clearAutoSyncedPegawai = () => {
  const currentPegawai = pegawaiSelectOptions.value.find(
    (opt) => opt.id === form.value.pegawaiId,
  )?.raw;

  if (
    pegawaiAutoSynced.value ||
    (currentPegawai?.pendudukId && currentPegawai.pendudukId !== form.value.pendudukId)
  ) {
    form.value.pegawaiId = undefined;
    if (!isEdit.value && pegawaiMode.value === "existing") {
      pegawaiMode.value = "none";
    }
  }
  pegawaiAutoSynced.value = false;
};

const handlePendudukSelected = async (penduduk: PendudukItem | null) => {
  linkedPenduduk.value = penduduk;
  errors.value.pendudukId = "";

  if (!penduduk) {
    clearAutoSyncedPegawai();
    return;
  }

  const matchedPegawai = await findPegawaiByPenduduk(penduduk);
  if (matchedPegawai) {
    pegawaiMode.value = "existing";
    errors.value.pegawaiId = "";

    if (form.value.pegawaiId !== matchedPegawai.id) {
      form.value.pegawaiId = matchedPegawai.id;
      pegawaiAutoSynced.value = true;
      showToast(
        `Pegawai "${matchedPegawai.name}" (NIP: ${matchedPegawai.nip}) otomatis dipilih sesuai data penduduk`,
        "info",
      );
    }
    return;
  }

  clearAutoSyncedPegawai();
};

const switchToNewPenduduk = () => {
  pendudukMode.value = "new";
  form.value.pendudukId = undefined;
  linkedPenduduk.value = null;
  errors.value.pendudukId = "";
  clearAutoSyncedPegawai();
};

const handleWilayahSelect = (item: any) => {
  newPenduduk.value.idKelurahan = item.id || "";
};

const handleWilayahClear = () => {
  newPenduduk.value.idKelurahan = "";
};

const validateForm = (): boolean => {
  const nextErrors: Record<string, string> = {};
  const f = form.value;

  if (!f.kodeDokter.trim()) {
    nextErrors.kodeDokter = "Kode dokter wajib diisi";
  } else if (f.kodeDokter.trim().length > 30) {
    nextErrors.kodeDokter = "Kode dokter maksimal 30 karakter";
  }

  if (pendudukMode.value === "existing") {
    if (!f.pendudukId) {
      nextErrors.pendudukId = "Pilih data penduduk terlebih dahulu";
    }
  } else {
    if (!/^\d{16}$/.test(newPenduduk.value.nik.trim())) {
      nextErrors.newNik = "NIK (16 digit angka) wajib diisi untuk penduduk baru";
    }
    if (!newPenduduk.value.namaLengkap.trim()) {
      nextErrors.newNamaLengkap = "Nama lengkap penduduk wajib diisi";
    }
    if (
      newPenduduk.value.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPenduduk.value.email.trim())
    ) {
      nextErrors.newEmail = "Format email penduduk tidak valid";
    }
  }

  if (!isEdit.value) {
    if (pegawaiMode.value === "existing" && !f.pegawaiId) {
      nextErrors.pegawaiId = "Pilih pegawai yang akan ditautkan";
    }
    if (pegawaiMode.value === "new") {
      if (!newPegawai.value.nip.trim()) {
        nextErrors.newPegawaiNip = "NIP pegawai baru wajib diisi";
      }
      if (
        newPegawai.value.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPegawai.value.email.trim())
      ) {
        nextErrors.newPegawaiEmail = "Format email pegawai tidak valid";
      }
    }
  }

  if (
    !f.isStrSeumurHidup &&
    f.strTerbitPada &&
    f.strBerlakuSampai &&
    new Date(f.strBerlakuSampai) < new Date(f.strTerbitPada)
  ) {
    nextErrors.strBerlakuSampai =
      "Tanggal berakhir STR tidak boleh lebih awal dari tanggal terbit";
  }

  if (
    f.sipTerbitPada &&
    f.sipBerlakuSampai &&
    new Date(f.sipBerlakuSampai) < new Date(f.sipTerbitPada)
  ) {
    nextErrors.sipBerlakuSampai =
      "Tanggal berakhir SIP tidak boleh lebih awal dari tanggal terbit";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitLoading.value = true;
  try {
    const f = form.value;
    const basePayload: CreateDokterPayload = {
      kodeDokter: f.kodeDokter.trim(),
      gelarDepan: f.gelarDepan.trim() || undefined,
      gelarBelakang: f.gelarBelakang.trim() || undefined,
      jenisDokter: f.jenisDokter,
      spesialisasi: f.spesialisasi.trim() || undefined,
      noStr: f.noStr.trim() || undefined,
      isStrSeumurHidup: f.isStrSeumurHidup,
      strTerbitPada: f.strTerbitPada || undefined,
      strBerlakuSampai: f.isStrSeumurHidup ? undefined : f.strBerlakuSampai || undefined,
      noSip: f.noSip.trim() || undefined,
      sipTerbitPada: f.sipTerbitPada || undefined,
      sipBerlakuSampai: f.sipBerlakuSampai || undefined,
      ihsPractitionerId: f.ihsPractitionerId.trim() || undefined,
      kodeBpjs: f.kodeBpjs.trim() || undefined,
      status: f.status,
    };

    let saved: DokterItem;

    if (isEdit.value && props.editId) {
      saved = await dokterService.updateDokter(props.editId, {
        ...basePayload,
        pendudukId: f.pendudukId,
        pegawaiId: pegawaiMode.value === "existing" ? f.pegawaiId : undefined,
      });
    } else {
      if (pendudukMode.value === "existing") {
        basePayload.pendudukId = f.pendudukId;
      } else {
        const np = newPenduduk.value;
        basePayload.penduduk = {
          nik: np.nik.trim(),
          namaLengkap: np.namaLengkap.trim(),
          jenisKelamin: np.jenisKelamin,
          tempatLahir: np.tempatLahir.trim() || undefined,
          tanggalLahir: np.tanggalLahir || undefined,
          golonganDarah: np.golonganDarah || undefined,
          rhesus: np.rhesus || undefined,
          kewarganegaraan: Kewarganegaraan.WNI,
          agamaId: np.agamaId,
          pendidikanId: np.pendidikanId,
          pekerjaanId: np.pekerjaanId,
          sukuId: np.sukuId,
          noTelepon: np.noTelepon.trim() || undefined,
          email: np.email.trim() || undefined,
          idKelurahan: np.idKelurahan || undefined,
          alamatKtp: np.alamatKtp.trim() || undefined,
        };
      }

      if (pegawaiMode.value === "existing" && f.pegawaiId) {
        basePayload.pegawaiId = f.pegawaiId;
      } else if (pegawaiMode.value === "new") {
        const ng = newPegawai.value;
        basePayload.pegawai = {
          nip: ng.nip.trim(),
          name: ng.name.trim() || undefined,
          position: ng.position.trim() || undefined,
          statusKepegawaian: ng.statusKepegawaian || undefined,
          statusAktif: ng.statusAktif,
          unitKerja: ng.unitKerja.trim() || undefined,
          tanggalMasuk: ng.tanggalMasuk || undefined,
          email: ng.email.trim() || undefined,
          phoneNumber: ng.phoneNumber.trim() || undefined,
        };
      }

      saved = await dokterService.createDokter(basePayload);
    }

    showToast(
      isEdit.value
        ? `Data dokter "${saved.kodeDokter}" berhasil diperbarui`
        : `Dokter baru "${saved.kodeDokter}" berhasil ditambahkan`,
      "success",
    );
    emit("saved", saved);
    emit("close");
  } catch (err: any) {
    const msg = extractApiErrorMessage(err, "Gagal menyimpan data dokter");
    if (msg.toLowerCase().includes("kode dokter")) errors.value.kodeDokter = msg;
    if (msg.toLowerCase().includes("str")) errors.value.noStr = msg;
    showToast(msg, "error");
  } finally {
    submitLoading.value = false;
  }
};

const handleClose = () => {
  if (submitLoading.value) return;
  emit("close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.show && !submitLoading.value) {
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
      <div class="modal-box max-w-4xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
        <div class="flex-none pr-8 mb-5">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
            :disabled="submitLoading"
            aria-label="Tutup"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Stethoscope class="w-5 h-5" />
            </div>
            <div>
              <span>{{ isEdit ? "Edit Data Master Dokter" : "Tambah Master Dokter Baru" }}</span>
              <p v-if="previewNamaTampilan" class="text-xs font-semibold text-primary mt-0.5">
                Preview: {{ previewNamaTampilan }}
              </p>
            </div>
          </h3>
        </div>

        <div v-if="modalLoading" class="flex-1 space-y-4 py-4 animate-pulse">
          <div class="h-24 bg-base-200 rounded-2xl"></div>
          <div class="h-24 bg-base-200 rounded-2xl"></div>
          <div class="h-32 bg-base-200 rounded-2xl"></div>
        </div>

        <form
          v-else
          id="dokter-form"
          class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <!-- BAGIAN 1: DATA PENDUDUK -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <IdCard class="w-4 h-4" />
                1. Data Kependudukan Dokter <span class="text-error">*</span>
              </h4>

              <div v-if="!isEdit" class="flex items-center gap-1.5 bg-base-100 p-1 rounded-xl border border-base-content/10 w-fit">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="pendudukMode === 'existing' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="pendudukMode = 'existing'"
                >
                  Pilih Penduduk Terdaftar
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  :class="pendudukMode === 'new' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="switchToNewPenduduk"
                >
                  + Input Penduduk Baru
                </button>
              </div>
            </div>

            <div v-if="pendudukMode === 'existing'">
              <PendudukSelector
                v-model="form.pendudukId"
                mode="available-for-dokter"
                :initial-penduduk="linkedPenduduk"
                :error="errors.pendudukId"
                label="Cari Penduduk (yang belum terdaftar sebagai dokter)"
                @selected="handlePendudukSelected"
              />
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  NIK (16 Digit) <span class="text-error">*</span>
                </label>
                <input
                  v-model="newPenduduk.nik"
                  type="text"
                  maxlength="16"
                  inputmode="numeric"
                  placeholder="3273011505900001"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm font-mono"
                  :class="{ 'border-error': errors.newNik }"
                />
                <span v-if="errors.newNik" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newNik }}
                </span>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Nama Lengkap (Tanpa Gelar) <span class="text-error">*</span>
                </label>
                <input
                  v-model="newPenduduk.namaLengkap"
                  type="text"
                  maxlength="150"
                  placeholder="Budi Santoso"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                  :class="{ 'border-error': errors.newNamaLengkap }"
                />
                <span v-if="errors.newNamaLengkap" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newNamaLengkap }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Jenis Kelamin <span class="text-error">*</span>
                </label>
                <select v-model="newPenduduk.jenisKelamin" class="select select-bordered select-sm w-full rounded-xl h-10 text-sm">
                  <option v-for="opt in JENIS_KELAMIN_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Tempat Lahir</label>
                <input v-model="newPenduduk.tempatLahir" type="text" class="input input-bordered input-sm w-full rounded-xl h-10 text-sm" />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Tanggal Lahir</label>
                <FlatpickrDate
                  v-model="newPenduduk.tanggalLahir"
                  size="sm"
                  :max-date="todayIso"
                  placeholder="Pilih tanggal lahir..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">No. Telepon</label>
                <input v-model="newPenduduk.noTelepon" type="text" class="input input-bordered input-sm w-full rounded-xl h-10 text-sm" />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Email</label>
                <input
                  v-model="newPenduduk.email"
                  type="email"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                  :class="{ 'border-error': errors.newEmail }"
                />
                <span v-if="errors.newEmail" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newEmail }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Gol. Darah & Rhesus</label>
                <div class="grid grid-cols-2 gap-2">
                  <select v-model="newPenduduk.golonganDarah" class="select select-bordered select-sm rounded-xl h-10 text-xs">
                    <option value="">Gol</option>
                    <option v-for="opt in GOLONGAN_DARAH_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <select v-model="newPenduduk.rhesus" class="select select-bordered select-sm rounded-xl h-10 text-xs">
                    <option value="">Rh</option>
                    <option v-for="opt in RHESUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.value }}</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Agama</label>
                <Select2 v-model="newPenduduk.agamaId" :options="agamaOptions" label-key="nama" value-key="id" placeholder="Agama..." />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Pendidikan</label>
                <Select2 v-model="newPenduduk.pendidikanId" :options="pendidikanOptions" label-key="nama" value-key="id" placeholder="Pendidikan..." />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Pekerjaan / Suku</label>
                <div class="grid grid-cols-2 gap-2">
                  <Select2 v-model="newPenduduk.pekerjaanId" :options="pekerjaanOptions" label-key="nama" value-key="id" placeholder="Pekerjaan" />
                  <Select2 v-model="newPenduduk.sukuId" :options="sukuOptions" label-key="nama" value-key="id" placeholder="Suku" />
                </div>
              </div>

              <div class="sm:col-span-2 lg:col-span-3">
                <UiAutocompleteWilayah
                  v-model="newPenduduk.idKelurahan"
                  :initial-label="initialWilayahLabel"
                  label="Wilayah Administratif"
                  @select="handleWilayahSelect"
                  @clear="handleWilayahClear"
                />
              </div>

              <div class="sm:col-span-2 lg:col-span-3">
                <label class="block text-xs font-bold text-base-content/80 mb-1">Alamat KTP</label>
                <textarea v-model="newPenduduk.alamatKtp" rows="2" class="textarea textarea-bordered w-full rounded-xl text-sm resize-none"></textarea>
              </div>
            </div>
          </section>

          <!-- BAGIAN 2: DATA KEPEGAWAIAN (OPSIONAL) -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <Briefcase class="w-4 h-4" />
                2. Tautan Data Kepegawaian (Opsional)
              </h4>

              <div class="flex flex-wrap items-center gap-1.5 bg-base-100 p-1 rounded-xl border border-base-content/10 w-fit">
                <button
                  v-if="!isEdit || !currentPegawaiOption"
                  type="button"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold transition"
                  :class="pegawaiMode === 'none' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="pegawaiMode = 'none'; form.pegawaiId = undefined; pegawaiAutoSynced = false"
                >
                  Tanpa Pegawai
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold transition"
                  :class="pegawaiMode === 'existing' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="pegawaiMode = 'existing'"
                >
                  Pilih Pegawai
                </button>
                <button
                  v-if="!isEdit"
                  type="button"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold transition"
                  :class="pegawaiMode === 'new' ? 'bg-primary text-primary-content' : 'text-base-content/60 hover:bg-base-200'"
                  @click="pegawaiMode = 'new'; form.pegawaiId = undefined; pegawaiAutoSynced = false"
                >
                  + Pegawai Baru
                </button>
              </div>
            </div>

            <div v-if="pegawaiMode === 'existing'" class="space-y-1.5">
              <Select2
                v-model="form.pegawaiId"
                :options="pegawaiSelectOptions"
                label-key="displayName"
                value-key="id"
                placeholder="Pilih pegawai yang belum terdaftar sebagai dokter..."
                :error="Boolean(errors.pegawaiId)"
                @change="pegawaiAutoSynced = false"
              />
              <p v-if="pegawaiAutoSynced && form.pegawaiId" class="text-[11px] font-semibold text-primary">
                Pegawai terisi otomatis karena penduduk tertaut sudah terdaftar sebagai pegawai.
              </p>
              <span v-if="errors.pegawaiId" class="text-xs text-error font-semibold mt-1 block">
                {{ errors.pegawaiId }}
              </span>
            </div>

            <div v-else-if="pegawaiMode === 'new'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  NIP Pegawai <span class="text-error">*</span>
                </label>
                <input
                  v-model="newPegawai.nip"
                  type="text"
                  maxlength="50"
                  placeholder="PEG-DOK-001"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm font-mono"
                  :class="{ 'border-error': errors.newPegawaiNip }"
                />
                <span v-if="errors.newPegawaiNip" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newPegawaiNip }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">
                  Nama Pegawai <span class="text-base-content/45 font-normal">(otomatis dari KTP jika kosong)</span>
                </label>
                <input
                  v-model="newPegawai.name"
                  type="text"
                  maxlength="150"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Jabatan</label>
                <input
                  v-model="newPegawai.position"
                  type="text"
                  placeholder="Dokter Spesialis"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Status Kepegawaian</label>
                <select v-model="newPegawai.statusKepegawaian" class="select select-bordered select-sm w-full rounded-xl h-10 text-sm">
                  <option value="">-- Pilih --</option>
                  <option v-for="opt in STATUS_KEPEGAWAIAN_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Status Aktif</label>
                <select v-model="newPegawai.statusAktif" class="select select-bordered select-sm w-full rounded-xl h-10 text-sm">
                  <option v-for="opt in STATUS_AKTIF_PEGAWAI_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Unit Kerja</label>
                <input
                  v-model="newPegawai.unitKerja"
                  type="text"
                  placeholder="Instalasi Rawat Jalan"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Tanggal Masuk</label>
                <FlatpickrDate
                  v-model="newPegawai.tanggalMasuk"
                  size="sm"
                  placeholder="Pilih tanggal masuk..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">Email Pegawai</label>
                <input
                  v-model="newPegawai.email"
                  type="email"
                  class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
                  :class="{ 'border-error': errors.newPegawaiEmail }"
                />
                <span v-if="errors.newPegawaiEmail" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.newPegawaiEmail }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1">No. Telepon Pegawai</label>
                <input v-model="newPegawai.phoneNumber" type="text" class="input input-bordered input-sm w-full rounded-xl h-10 text-sm" />
              </div>
            </div>
          </section>

          <!-- BAGIAN 3: PROFESI, STR, SIP & INTEGRASI -->
          <section class="space-y-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 sm:p-5">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <FileBadge class="w-4 h-4" />
              3. Data Profesi, STR, SIP & Integrasi
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode Dokter <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.kodeDokter"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: DOK-001"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.kodeDokter }"
                  @input="errors.kodeDokter = ''"
                />
                <span v-if="errors.kodeDokter" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.kodeDokter }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Gelar Depan
                </label>
                <input
                  v-model="form.gelarDepan"
                  type="text"
                  maxlength="30"
                  placeholder="Contoh: dr. / drg."
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Gelar Belakang
                </label>
                <input
                  v-model="form.gelarBelakang"
                  type="text"
                  maxlength="80"
                  placeholder="Contoh: Sp.PD, FINASIM"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Jenis Dokter
                </label>
                <select v-model="form.jenisDokter" class="select select-bordered w-full rounded-xl h-11 text-sm">
                  <option v-for="opt in JENIS_DOKTER_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Bidang Spesialisasi
                </label>
                <input
                  v-model="form.spesialisasi"
                  type="text"
                  maxlength="100"
                  placeholder="Contoh: Penyakit Dalam / Anak / Umum"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>

              <!-- STR -->
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nomor STR
                </label>
                <input
                  v-model="form.noStr"
                  type="text"
                  maxlength="50"
                  placeholder="3211100123456789"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                  :class="{ 'border-error': errors.noStr }"
                />
                <span v-if="errors.noStr" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.noStr }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tanggal Terbit STR
                </label>
                <FlatpickrDate
                  v-model="form.strTerbitPada"
                  :max-date="!form.isStrSeumurHidup && form.strBerlakuSampai ? form.strBerlakuSampai : undefined"
                  placeholder="Pilih tanggal terbit STR..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  STR Berlaku Sampai
                </label>
                <FlatpickrDate
                  v-model="form.strBerlakuSampai"
                  :disabled="form.isStrSeumurHidup"
                  :min-date="form.strTerbitPada || undefined"
                  :error="Boolean(errors.strBerlakuSampai)"
                  placeholder="Pilih masa berlaku STR..."
                  @change="errors.strBerlakuSampai = ''"
                />
                <label class="flex items-center gap-2 mt-2 cursor-pointer">
                  <input v-model="form.isStrSeumurHidup" type="checkbox" class="checkbox checkbox-primary checkbox-xs" />
                  <span class="text-xs font-semibold text-base-content/80">STR Seumur Hidup (UU Kes. No. 17/2023)</span>
                </label>
                <span v-if="errors.strBerlakuSampai" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.strBerlakuSampai }}
                </span>
              </div>

              <!-- SIP -->
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Nomor SIP
                </label>
                <input
                  v-model="form.noSip"
                  type="text"
                  maxlength="50"
                  placeholder="503/SIP.001/DINKES/2024"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tanggal Terbit SIP
                </label>
                <FlatpickrDate
                  v-model="form.sipTerbitPada"
                  :max-date="form.sipBerlakuSampai || undefined"
                  placeholder="Pilih tanggal terbit SIP..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  SIP Berlaku Sampai
                </label>
                <FlatpickrDate
                  v-model="form.sipBerlakuSampai"
                  :min-date="form.sipTerbitPada || undefined"
                  :error="Boolean(errors.sipBerlakuSampai)"
                  placeholder="Pilih masa berlaku SIP..."
                  @change="errors.sipBerlakuSampai = ''"
                />
                <span v-if="errors.sipBerlakuSampai" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.sipBerlakuSampai }}
                </span>
              </div>

              <!-- SATUSEHAT, BPJS, STATUS -->
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  IHS Practitioner ID (SATUSEHAT)
                </label>
                <input
                  v-model="form.ihsPractitionerId"
                  type="text"
                  maxlength="50"
                  placeholder="10009880728"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kode DPJP BPJS / HFIS
                </label>
                <input
                  v-model="form.kodeBpjs"
                  type="text"
                  maxlength="30"
                  placeholder="123456"
                  class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Status Aktif Dokter
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
          </section>
        </form>

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
            form="dokter-form"
            class="btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/25 gap-2"
            :disabled="submitLoading || modalLoading"
          >
            <span v-if="submitLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isEdit ? "Simpan Perubahan" : "Simpan Data Dokter" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
