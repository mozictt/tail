<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  AlertTriangle,
  Baby,
  CheckCircle2,
  HeartPulse,
  IdCard,
  MapPin,
  PhoneCall,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-vue-next";
import PasienPenjaminManager from "@/components/master/PasienPenjaminManager.vue";
import { PasienService } from "@/services/pasien.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  calculateAgeLabel,
  formatKelurahanLabel,
  getOptionLabel,
  GOLONGAN_DARAH_OPTIONS,
  HUBUNGAN_PJ_OPTIONS,
  JENIS_IDENTITAS_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  STATUS_HIDUP_OPTIONS,
  STATUS_PERKAWINAN_OPTIONS,
  StatusHidup,
  type PasienItem,
  type PasienPenjaminItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    pasienId?: number | null;
    canManagePenjamin?: boolean;
  }>(),
  {
    pasienId: null,
    canManagePenjamin: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "penjamin-updated"): void;
}>();

const pasienService = PasienService();
const { formatDate, formatDateTime } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<PasienItem | null>(null);

const ageLabel = computed(() =>
  calculateAgeLabel(detail.value?.penduduk?.tanggalLahir),
);

const fetchDetail = async (id: number) => {
  loading.value = true;
  try {
    detail.value = await pasienService.getPasienById(id);
  } catch (err: any) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat detail pasien"),
      "error",
    );
    emit("close");
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.show, props.pasienId] as const,
  ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }
    fetchDetail(id);
  },
  { immediate: true },
);

const handlePenjaminUpdated = (items: PasienPenjaminItem[]) => {
  if (detail.value) {
    detail.value.penjaminList = items;
    detail.value.penjaminUtama =
      items.find((p) => p.isUtama) ?? items[0] ?? null;
  }
  emit("penjamin-updated");
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="emit('close')"
    >
      <div class="modal-box max-w-3xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3 pr-8 mb-5">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HeartPulse class="w-5 h-5" />
          </div>
          <span>Detail Rekam Medis Pasien</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-4 animate-pulse">
          <div class="h-20 bg-base-200 rounded-2xl"></div>
          <div class="h-32 bg-base-200 rounded-2xl"></div>
          <div class="h-32 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <!-- Header Ringkas Pasien -->
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-primary text-primary-content">
                  RM: {{ detail.noRm }}
                </span>
                <span
                  v-if="detail.isBayiBaruLahir"
                  class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-600 border border-sky-500/25"
                >
                  <Baby class="w-3 h-3" />
                  Bayi Baru Lahir
                </span>
                <span
                  v-if="detail.isIdentitasTidakDiketahui"
                  class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 border border-amber-500/25"
                >
                  <AlertTriangle class="w-3 h-3" />
                  Tanpa Identitas
                </span>
                <span
                  v-if="detail.penduduk?.statusHidup === StatusHidup.MENINGGAL"
                  class="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-700 text-white"
                >
                  Meninggal
                </span>
              </div>

              <h4 class="font-extrabold text-base text-base-content mt-1.5">
                {{ detail.penduduk?.namaLengkap || "-" }}
              </h4>
              <p class="text-xs text-base-content/65 mt-0.5">
                {{ getOptionLabel(JENIS_KELAMIN_OPTIONS, detail.penduduk?.jenisKelamin) }}
                <template v-if="detail.penduduk?.tanggalLahir">
                  • {{ formatDate(detail.penduduk.tanggalLahir) }}
                  <span v-if="ageLabel" class="font-semibold">({{ ageLabel }})</span>
                </template>
              </p>
            </div>

            <span
              class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border w-fit shrink-0"
              :class="
                detail.status === 'Y'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
              "
            >
              <CheckCircle2 v-if="detail.status === 'Y'" class="w-3.5 h-3.5" />
              <XCircle v-else class="w-3.5 h-3.5" />
              {{ detail.status === "Y" ? "Aktif" : "Nonaktif" }}
            </span>
          </div>

          <!-- Peringatan Catatan Penting / Alergi -->
          <div
            v-if="detail.catatanPenting"
            class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs"
          >
            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span class="font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                Catatan Penting / Alergi
              </span>
              <p class="text-base-content font-medium mt-0.5 whitespace-pre-line">
                {{ detail.catatanPenting }}
              </p>
            </div>
          </div>

          <!-- Identitas Kependudukan -->
          <div
            v-if="detail.penduduk"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs"
          >
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <IdCard class="w-3.5 h-3.5" />
              Identitas Kependudukan
            </div>
            <div>
              <span class="text-base-content/50 block">Jenis Identitas & Nomor</span>
              <span class="font-mono font-semibold">
                {{ getOptionLabel(JENIS_IDENTITAS_OPTIONS, detail.penduduk.jenisIdentitas) }}:
                {{ detail.penduduk.nik || detail.penduduk.noIdentitasLain || "-" }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">No. Kartu Keluarga (KK)</span>
              <span class="font-mono font-semibold">{{ detail.penduduk.noKk || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Nama Ibu Kandung</span>
              <span class="font-semibold">
                {{ detail.penduduk.namaIbuKandung || detail.pendudukIbu?.namaLengkap || "-" }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Tempat, Tgl Lahir</span>
              <span class="font-semibold">
                {{ detail.penduduk.tempatLahir || "-" }}, {{ formatDate(detail.penduduk.tanggalLahir) }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Golongan Darah / Rhesus</span>
              <span class="font-semibold">
                {{ getOptionLabel(GOLONGAN_DARAH_OPTIONS, detail.penduduk.golonganDarah) }}
                <span v-if="detail.penduduk.rhesus">({{ detail.penduduk.rhesus }})</span>
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Status Perkawinan</span>
              <span class="font-semibold">
                {{ getOptionLabel(STATUS_PERKAWINAN_OPTIONS, detail.penduduk.statusPerkawinan) }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">No. Telepon & Email</span>
              <span class="font-semibold">
                {{ detail.penduduk.noTelepon || "-" }}
                <template v-if="detail.penduduk.email"> • {{ detail.penduduk.email }}</template>
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Agama / Pekerjaan</span>
              <span class="font-semibold">
                {{ detail.penduduk.agama?.nama || "-" }} • {{ detail.penduduk.pekerjaan?.nama || "-" }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Status Hidup</span>
              <span class="font-semibold">
                {{ getOptionLabel(STATUS_HIDUP_OPTIONS, detail.penduduk.statusHidup || StatusHidup.HIDUP) }}
                <template v-if="detail.penduduk.tanggalMeninggal">
                  ({{ formatDate(detail.penduduk.tanggalMeninggal) }})
                </template>
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">IHS Patient ID (SATUSEHAT)</span>
              <span class="font-mono font-semibold">{{ detail.penduduk.ihsPatientId || "-" }}</span>
            </div>
          </div>

          <!-- Alamat KTP & Domisili -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <MapPin class="w-3.5 h-3.5" />
              Alamat KTP & Domisili
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Alamat KTP</span>
              <span class="font-semibold">
                {{ detail.penduduk?.alamatKtp || "-" }}
                <template v-if="detail.penduduk?.rt || detail.penduduk?.rw">
                  (RT {{ detail.penduduk.rt || "-" }} / RW {{ detail.penduduk.rw || "-" }})
                </template>
                <template v-if="detail.penduduk?.kelurahan">
                  — {{ formatKelurahanLabel(detail.penduduk.kelurahan) }}
                </template>
              </span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Alamat Domisili Saat Ini</span>
              <span v-if="detail.alamatSamaKtp" class="font-semibold text-primary">
                Sama dengan alamat KTP
              </span>
              <span v-else class="font-semibold">
                {{ detail.alamatDomisili || "-" }}
                <template v-if="detail.rtDomisili || detail.rwDomisili">
                  (RT {{ detail.rtDomisili || "-" }} / RW {{ detail.rwDomisili || "-" }})
                </template>
                <template v-if="detail.kelurahanDomisili">
                  — {{ formatKelurahanLabel(detail.kelurahanDomisili) }}
                </template>
              </span>
            </div>
          </div>

          <!-- Penanggung Jawab -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <PhoneCall class="w-3.5 h-3.5" />
              Penanggung Jawab / Kontak Darurat
            </div>
            <div>
              <span class="text-base-content/50 block">Nama Penanggung Jawab</span>
              <span class="font-semibold">{{ detail.namaPj || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Hubungan</span>
              <span class="font-semibold">
                {{ getOptionLabel(HUBUNGAN_PJ_OPTIONS, detail.hubunganPj) }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">No. HP</span>
              <span class="font-semibold">{{ detail.noHpPj || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Alamat</span>
              <span class="font-semibold">{{ detail.alamatPj || "-" }}</span>
            </div>
          </div>

          <!-- Daftar Penjamin Pasien (Live CRUD jika diizinkan) -->
          <div class="bg-base-200/30 border border-base-content/10 rounded-2xl p-4 space-y-3">
            <div class="font-extrabold uppercase tracking-wider text-xs text-primary flex items-center gap-1.5">
              <ShieldCheck class="w-3.5 h-3.5" />
              Daftar Penjamin / Asuransi Pasien
            </div>

            <PasienPenjaminManager
              :pasien-id="detail.id"
              :initial-items="detail.penjaminList || []"
              :readonly="!canManagePenjamin"
              @updated="handlePenjaminUpdated"
            />
          </div>

          <div class="text-[11px] text-base-content/50 px-1 flex items-center gap-1">
            <UserRound class="w-3 h-3" />
            <span>Terakhir diperbarui: {{ formatDateTime(detail.updatedAt || detail.createdAt) }}</span>
          </div>
        </div>

        <div class="flex-none modal-action pt-4 mt-2 border-t border-base-content/10">
          <button type="button" class="btn btn-primary btn-sm rounded-xl px-5" @click="emit('close')">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

