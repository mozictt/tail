<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building,
  Clock,
  Search,
  Stethoscope,
  Users,
  X,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import BedKosongPicker from "@/components/transaksi/BedKosongPicker.vue";
import DokterJadwalPickerModal from "@/components/transaksi/DokterJadwalPickerModal.vue";
import { PendaftaranService } from "@/services/pendaftaran.service";
import { UnitService } from "@/services/unit.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatNamaGelarDokter,
  getOptionLabel,
  isInpatientLayanan,
  JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
  JenisLayananPendaftaran,
  REGISTRABLE_UNIT_JENIS_TO_LAYANAN,
  SESI_PRAKTIK_OPTIONS,
  type DokterItem,
  type JadwalDokterTersediaItem,
  type PendaftaranItem,
  type UnitOptionItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  pendaftaran: PendaftaranItem | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated", item: PendaftaranItem): void;
}>();

const pendaftaranService = PendaftaranService();
const unitService = UnitService();
const { formatDateForInput } = useDate();
const { showToast } = useToast();

const saving = ref(false);
const loadingOptions = ref(false);
const unitOptions = ref<UnitOptionItem[]>([]);
const showDokterPicker = ref(false);

const selectedJadwal = ref<JadwalDokterTersediaItem | null>(null);
const selectedDokterLabel = ref("");

interface MutasiFormState {
  unitTujuanId: number | undefined;
  jadwalDokterId: number | undefined;
  dokterTujuanId: number | undefined;
  bedTujuanId: number | undefined;
  tanggalMutasi: string;
  alasan: string;
  catatan: string;
}

const form = ref<MutasiFormState>({
  unitTujuanId: undefined,
  jadwalDokterId: undefined,
  dokterTujuanId: undefined,
  bedTujuanId: undefined,
  tanggalMutasi: "",
  alasan: "",
  catatan: "",
});
const errors = ref<Partial<Record<keyof MutasiFormState, string>>>({});

const currentlyInpatient = computed(() =>
  Boolean(props.pendaftaran && isInpatientLayanan(props.pendaftaran.jenisLayananSaatIni)),
);

const allowedUnitOptions = computed(() =>
  unitOptions.value.filter((u) => {
    const layanan = REGISTRABLE_UNIT_JENIS_TO_LAYANAN[u.jenisUnit];
    if (!layanan) return false;
    return currentlyInpatient.value ? isInpatientLayanan(layanan) : true;
  }),
);

const unitSelectOptions = computed(() =>
  allowedUnitOptions.value.map((u) => ({
    id: u.id,
    displayLabel: `${u.kode} — ${u.nama} (${getOptionLabel(JENIS_LAYANAN_PENDAFTARAN_OPTIONS, REGISTRABLE_UNIT_JENIS_TO_LAYANAN[u.jenisUnit])})`,
  })),
);

const selectedUnit = computed(() =>
  allowedUnitOptions.value.find((u) => u.id === Number(form.value.unitTujuanId)) ?? null,
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

const loadOptions = async () => {
  loadingOptions.value = true;
  try {
    unitOptions.value = await unitService.getUnitOptions();
  } catch {
    unitOptions.value = [];
  } finally {
    loadingOptions.value = false;
  }
};

watch(
  () => [props.show, props.pendaftaran] as const,
  async ([isOpen, target]) => {
    if (!isOpen || !target) return;
    selectedJadwal.value = null;
    selectedDokterLabel.value = target.dokterSaatIni
      ? `${target.dokterSaatIni.kodeDokter} — ${
          target.dokterSaatIni.namaTampilan ||
          target.dokterSaatIni.penduduk?.namaLengkap ||
          target.dokterSaatIni.kodeDokter
        }`
      : "";
    form.value = {
      unitTujuanId: currentlyInpatient.value ? target.unitSaatIniId : undefined,
      jadwalDokterId: undefined,
      dokterTujuanId: target.dokterSaatIniId,
      bedTujuanId: currentlyInpatient.value ? target.bedSaatIniId ?? undefined : undefined,
      tanggalMutasi: formatDateForInput(new Date()),
      alasan: "",
      catatan: "",
    };
    errors.value = {};
    await loadOptions();
  },
  { immediate: true },
);

const handleUnitChange = () => {
  errors.value.unitTujuanId = undefined;
  errors.value.jadwalDokterId = undefined;
  errors.value.dokterTujuanId = undefined;
  errors.value.bedTujuanId = undefined;
  form.value.jadwalDokterId = undefined;
  selectedJadwal.value = null;

  if (isTargetRajal.value) {
    form.value.dokterTujuanId = undefined;
    selectedDokterLabel.value = "";
  }
  if (form.value.unitTujuanId !== props.pendaftaran?.unitSaatIniId) {
    form.value.bedTujuanId = undefined;
  }
};

const handleSelectJadwal = (jadwal: JadwalDokterTersediaItem) => {
  selectedJadwal.value = jadwal;
  form.value.unitTujuanId = jadwal.unitId;
  form.value.jadwalDokterId = jadwal.id;
  form.value.dokterTujuanId = jadwal.dokterId;
  const namaDokter =
    jadwal.dokter?.namaTampilan ||
    formatNamaGelarDokter(
      jadwal.dokter?.gelarDepan,
      jadwal.dokter?.penduduk?.namaLengkap,
      jadwal.dokter?.gelarBelakang,
    ) ||
    jadwal.dokter?.kodeDokter ||
    `Dokter #${jadwal.dokterId}`;
  selectedDokterLabel.value = `${jadwal.dokter?.kodeDokter || ""} — ${namaDokter}`;
  errors.value.unitTujuanId = undefined;
  errors.value.jadwalDokterId = undefined;
  errors.value.dokterTujuanId = undefined;
};

const handleSelectDokter = (dokter: DokterItem) => {
  selectedJadwal.value = null;
  form.value.jadwalDokterId = undefined;
  form.value.dokterTujuanId = dokter.id;
  const namaDokter =
    dokter.namaTampilan ||
    formatNamaGelarDokter(
      dokter.gelarDepan,
      dokter.penduduk?.namaLengkap,
      dokter.gelarBelakang,
    ) ||
    dokter.kodeDokter;
  selectedDokterLabel.value = `${dokter.kodeDokter} — ${namaDokter}`;
  errors.value.dokterTujuanId = undefined;
  errors.value.jadwalDokterId = undefined;
};

const clearDokterOrJadwal = () => {
  selectedJadwal.value = null;
  form.value.jadwalDokterId = undefined;
  form.value.dokterTujuanId = undefined;
  selectedDokterLabel.value = "";
};

const validateForm = (): boolean => {
  const next: Partial<Record<keyof MutasiFormState, string>> = {};
  const f = form.value;
  if (!f.unitTujuanId) next.unitTujuanId = "Unit tujuan wajib dipilih";
  if (isTargetRajal.value && !f.jadwalDokterId) {
    next.jadwalDokterId = "Mutasi ke poliklinik Rawat Jalan wajib memilih jadwal dokter";
  }
  if (!f.jadwalDokterId && !f.dokterTujuanId) {
    next.dokterTujuanId = "Dokter / DPJP tujuan wajib dipilih";
  }
  if (isTargetInpatient.value && !f.bedTujuanId) {
    next.bedTujuanId = "Unit Rawat Inap / Intensive wajib memilih bed tujuan";
  }
  errors.value = next;
  return Object.keys(next).length === 0;
};

const handleSubmit = async () => {
  if (!props.pendaftaran || !validateForm() || saving.value) return;

  saving.value = true;
  try {
    const f = form.value;
    const updated = await pendaftaranService.mutasiPendaftaran(props.pendaftaran.id, {
      unitTujuanId: Number(f.unitTujuanId),
      jadwalDokterId: f.jadwalDokterId,
      dokterTujuanId: f.dokterTujuanId,
      bedTujuanId: isTargetRajal.value ? undefined : f.bedTujuanId,
      tanggalMutasi: f.tanggalMutasi || undefined,
      alasan: f.alasan.trim() || undefined,
      catatan: f.catatan.trim() || undefined,
    });
    showToast(`Mutasi pasien "${props.pendaftaran.noRegistrasi}" berhasil diproses`, "success");
    emit("updated", updated);
    emit("close");
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, "Gagal memproses mutasi unit pasien"), "error");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && pendaftaran"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="!saving && emit('close')"
    >
      <div class="modal-box max-w-3xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
          :disabled="saving"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3 pr-8 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ArrowRightLeft class="w-5 h-5" />
          </div>
          <span>Mutasi Unit / Pindah Bed / Ganti DPJP</span>
        </h3>

        <form class="flex-1 min-h-0 flex flex-col" @submit.prevent="handleSubmit">
          <div class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            <div class="p-3.5 rounded-2xl bg-base-200/40 border border-base-content/10 text-xs space-y-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-mono font-extrabold text-primary">{{ pendaftaran.noRegistrasi }}</span>
                <span class="font-bold">{{ pendaftaran.pasien?.penduduk?.namaLengkap || "-" }} (RM: {{ pendaftaran.pasien?.noRm || "-" }})</span>
              </div>
              <div class="text-base-content/70">
                Posisi saat ini: <strong>{{ pendaftaran.unitSaatIni?.nama || "-" }}</strong>
                <template v-if="pendaftaran.bedSaatIni">
                  • Bed {{ pendaftaran.bedSaatIni.kode }} ({{ pendaftaran.bedSaatIni.nama }})
                </template>
                <template v-if="pendaftaran.dokterSaatIni">
                  • DPJP: {{ pendaftaran.dokterSaatIni.namaTampilan || pendaftaran.dokterSaatIni.kodeDokter }}
                </template>
              </div>
            </div>

            <div
              v-if="currentlyInpatient"
              class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2"
            >
              <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Pasien sedang dalam status <strong>Rawat Inap / Intensive</strong> dan hanya dapat dimutasikan antar ruang rawat inap, pindah bed, atau ganti DPJP. Untuk kembali ke Rajal/IGD, gunakan aksi <strong>Batal Ranap</strong>.
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-base-200/30 border border-base-content/10 rounded-2xl p-4">
              <div class="sm:col-span-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary">
                <Building class="w-4 h-4" />
                Tujuan Mutasi Pelayanan
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Unit Tujuan <span class="text-error">*</span>
                </label>
                <Select2
                  v-model="form.unitTujuanId"
                  :options="unitSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Pilih unit tujuan..."
                  :error="Boolean(errors.unitTujuanId)"
                  @change="handleUnitChange"
                />
                <span v-if="errors.unitTujuanId" class="text-xs text-error font-semibold mt-1 block">
                  {{ errors.unitTujuanId }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Tanggal Efektif Mutasi
                </label>
                <FlatpickrDate
                  v-model="form.tanggalMutasi"
                  :clearable="false"
                  placeholder="Pilih tanggal..."
                />
              </div>

              <!-- Pemilihan Dokter / Jadwal via Popup -->
              <div class="sm:col-span-2 space-y-1.5">
                <label class="block text-xs font-bold text-base-content/80">
                  {{ isTargetRajal ? "Jadwal Praktik & Dokter Tujuan" : "Dokter Tujuan / DPJP" }}
                  <span class="text-error">*</span>
                </label>

                <div
                  class="p-3 rounded-xl border bg-base-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  :class="errors.jadwalDokterId || errors.dokterTujuanId ? 'border-error' : 'border-base-content/15'"
                >
                  <div v-if="selectedDokterLabel" class="min-w-0 space-y-0.5 text-xs">
                    <div class="font-bold text-sm text-base-content truncate flex items-center gap-1.5">
                      <Stethoscope class="w-4 h-4 text-primary shrink-0" />
                      <span class="truncate">{{ selectedDokterLabel }}</span>
                    </div>
                    <div v-if="selectedJadwal" class="text-[11px] text-base-content/65 flex flex-wrap items-center gap-2">
                      <span class="inline-flex items-center gap-1 font-mono font-bold text-primary">
                        <Clock class="w-3 h-3" /> {{ selectedJadwal.jamMulai }} - {{ selectedJadwal.jamSelesai }}
                      </span>
                      <span v-if="selectedJadwal.sesi">
                        • Sesi {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, selectedJadwal.sesi) }}
                      </span>
                      <span v-if="!selectedJadwal.kuotaInfo.isUnlimited" class="inline-flex items-center gap-1">
                        • <Users class="w-3 h-3" /> Sisa {{ selectedJadwal.kuotaInfo.sisaKuotaTotal }}/{{ selectedJadwal.kuotaInfo.kuotaTotal }}
                      </span>
                    </div>
                  </div>
                  <span v-else class="text-xs text-base-content/50">
                    {{
                      isTargetRajal
                        ? "Belum ada jadwal dokter yang dipilih (klik Pilih Dokter / Jadwal)..."
                        : "Belum ada dokter DPJP yang dipilih..."
                    }}
                  </span>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <button
                      v-if="selectedDokterLabel"
                      type="button"
                      class="btn btn-ghost btn-xs rounded-lg text-error"
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
                      <span>{{ isTargetRajal ? "Pilih Jadwal / Dokter" : "Pilih Dokter" }}</span>
                    </button>
                  </div>
                </div>

                <span v-if="errors.jadwalDokterId || errors.dokterTujuanId" class="text-xs text-error font-semibold block">
                  {{ errors.jadwalDokterId || errors.dokterTujuanId }}
                </span>
              </div>

              <!-- Bed Tujuan -->
              <div
                v-if="selectedUnit && !isTargetRajal && selectedUnit.isTersediaBed"
                class="sm:col-span-2 space-y-1.5"
              >
                <label class="block text-xs font-bold text-base-content/80">
                  Pilih Tempat Tidur (Bed) Tujuan
                  <span v-if="isTargetInpatient" class="text-error">*</span>
                  <span v-else class="font-normal text-base-content/55">(Opsional untuk IGD)</span>
                </label>
                <BedKosongPicker
                  v-model="form.bedTujuanId"
                  :unit-id="form.unitTujuanId"
                  :allowed-occupied-bed-id="pendaftaran.bedSaatIniId ?? null"
                  :required="isTargetInpatient"
                  :error="errors.bedTujuanId"
                  @selected="errors.bedTujuanId = undefined"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Alasan Mutasi
                </label>
                <input
                  v-model="form.alasan"
                  type="text"
                  maxlength="500"
                  placeholder="Contoh: Konsul lanjutan / butuh observasi rawat inap"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Catatan Serah Terima
                </label>
                <input
                  v-model="form.catatan"
                  type="text"
                  maxlength="1000"
                  placeholder="Catatan kondisi atau persiapan pasien"
                  class="input input-bordered w-full rounded-xl h-11 text-sm"
                />
              </div>
            </div>
          </div>

          <div class="flex-none modal-action gap-2 pt-4 mt-2 border-t border-base-content/10">
            <button
              type="button"
              class="btn btn-ghost rounded-xl"
              :disabled="saving"
              @click="emit('close')"
            >
              Batal
            </button>
            <button
              type="submit"
              class="btn btn-primary rounded-xl px-6 font-bold shadow-md shadow-primary/25"
              :disabled="saving || loadingOptions"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <span>{{ saving ? "Memproses..." : "Proses Mutasi" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <DokterJadwalPickerModal
      :show="showDokterPicker"
      :unit="selectedUnit"
      :tanggal="form.tanggalMutasi"
      :jenis-penjamin="pendaftaran?.jenisPenjamin"
      :selected-dokter-id="form.dokterTujuanId ?? null"
      :selected-jadwal-id="form.jadwalDokterId ?? null"
      @close="showDokterPicker = false"
      @select-jadwal="handleSelectJadwal"
      @select-dokter="handleSelectDokter"
    />
  </Teleport>
</template>
