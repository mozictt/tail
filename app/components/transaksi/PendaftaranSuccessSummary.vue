<script setup lang="ts">
import { computed } from "vue";
import {
  BedDouble,
  Building,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPlus,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Printer,
  Stethoscope,
  Ticket,
  UserRound,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { useDate } from "@/composables/useDate";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useToast } from "@/composables/useToast";
import { getVisitPenjaminList } from "@/utils/pendaftaran-penjamin.util";
import {
  printNomorAntreanVisit,
  printSlipPendaftaranVisit,
} from "@/utils/pendaftaran-print.util";
import { resolvePrintClinicHeader } from "@/utils/print-document.util";
import {
  calculateAgeLabel,
  CARA_MASUK_PASIEN_OPTIONS,
  formatNamaGelarDokter,
  getJenisLayananBadgeClass,
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  getStatusKunjunganBadgeClass,
  HUBUNGAN_PJ_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
  JENIS_PENJAMIN_OPTIONS,
  SESI_PRAKTIK_OPTIONS,
  STATUS_KUNJUNGAN_OPTIONS,
  type PendaftaranItem,
} from "@/types/simrs";

const props = defineProps<{
  visit: PendaftaranItem;
}>();

const emit = defineEmits<{
  (e: "register-another"): void;
  (e: "open-detail"): void;
}>();

const authStore = useAuthStore();
const companyProfileStore = useCompanyProfileStore();
const { formatDate, formatDateTime } = useDate();
const { slugPath } = useSlugRoute();
const { showToast } = useToast();

const hasQueueNumber = computed(() =>
  Boolean(
    props.visit.kodeAntreanSaatIni ||
      (props.visit.noAntreanSaatIni !== undefined &&
        props.visit.noAntreanSaatIni !== null),
  ),
);

const penjaminEntries = computed(() => getVisitPenjaminList(props.visit));

const penduduk = computed(() => props.visit.pasien?.penduduk ?? null);

const dokterName = computed(() => {
  const d = props.visit.dokterSaatIni;
  if (!d) return "-";
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
});

const ageLabel = computed(() =>
  penduduk.value?.tanggalLahir ? calculateAgeLabel(penduduk.value.tanggalLahir) : "-",
);

const alamatPasien = computed(() => {
  const p = props.visit.pasien;
  if (p?.alamatSamaKtp === false && p.alamatDomisili) {
    return p.alamatDomisili;
  }
  return penduduk.value?.alamatKtp || "-";
});

const penanggungJawabLabel = computed(() => {
  const p = props.visit.pasien;
  if (!p?.namaPj) return "-";
  const rel = p.hubunganPj
    ? ` (${getOptionLabel(HUBUNGAN_PJ_OPTIONS, p.hubunganPj)})`
    : "";
  const hp = p.noHpPj ? ` • ${p.noHpPj}` : "";
  return `${p.namaPj}${rel}${hp}`;
});

const printHeader = computed(() =>
  resolvePrintClinicHeader(companyProfileStore.profile, authStore.username),
);

const handlePrintAntrean = () => {
  if (!hasQueueNumber.value) {
    showToast(
      "Kunjungan pada unit ini tidak menggunakan nomor antrean poliklinik",
      "warning",
    );
    return;
  }
  const ok = printNomorAntreanVisit(props.visit, printHeader.value);
  if (!ok) {
    showToast("Gagal membuka dialog cetak. Periksa izin pop-up browser.", "error");
  }
};

const handlePrintSlip = () => {
  const ok = printSlipPendaftaranVisit(props.visit, printHeader.value);
  if (!ok) {
    showToast("Gagal membuka dialog cetak. Periksa izin pop-up browser.", "error");
  }
};
</script>

<template>
  <div class="space-y-5">
    <!-- STATUS & BAR AKSI CETAK -->
    <div class="bg-base-100 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="flex items-start gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 class="w-6 h-6" />
          </div>
          <div class="min-w-0 space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Pendaftaran Berhasil Disimpan
              </span>
              <span
                class="text-[11px] font-bold px-2.5 py-0.5 rounded-md border"
                :class="getStatusKunjunganBadgeClass(visit.statusKunjungan)"
              >
                {{ getOptionLabel(STATUS_KUNJUNGAN_OPTIONS, visit.statusKunjungan) }}
              </span>
              <span
                class="text-[11px] font-bold px-2.5 py-0.5 rounded-md border"
                :class="getJenisLayananBadgeClass(visit.jenisLayananSaatIni)"
              >
                {{ getOptionLabel(JENIS_LAYANAN_PENDAFTARAN_OPTIONS, visit.jenisLayananSaatIni) }}
              </span>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap">
              <h2 class="text-lg sm:text-xl font-extrabold text-base-content">
                {{ penduduk?.namaLengkap || "-" }}
              </h2>
              <span class="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-base-200 border border-base-content/10 text-base-content/80">
                RM: {{ visit.pasien?.noRm || "-" }}
              </span>
              <span class="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/25 text-primary">
                {{ visit.noRegistrasi }}
              </span>
            </div>

            <p class="text-xs text-base-content/65">
              Tanggal Kunjungan: <strong class="text-base-content">{{ formatDate(visit.tanggalKunjungan) }}</strong>
              • Waktu Daftar: <strong class="text-base-content">{{ formatDateTime(visit.waktuDaftar) }}</strong>
            </p>
          </div>
        </div>

        <!-- TOMBOL CETAK & AKSI UTAMA -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            class="btn btn-sm sm:btn-md rounded-xl font-bold gap-2"
            :class="
              hasQueueNumber
                ? 'btn-warning text-warning-content shadow-sm'
                : 'btn-disabled'
            "
            :title="
              hasQueueNumber
                ? 'Cetak karcis nomor antrean'
                : 'Unit layanan ini tidak menggunakan nomor antrean poli'
            "
            @click="handlePrintAntrean"
          >
            <Ticket class="w-4 h-4" />
            <span>Cetak Nomor Antrian</span>
          </button>

          <button
            type="button"
            class="btn btn-primary btn-sm sm:btn-md rounded-xl font-bold gap-2 shadow-sm shadow-primary/20"
            @click="handlePrintSlip"
          >
            <Printer class="w-4 h-4" />
            <span>Cetak Slip Pendaftaran</span>
          </button>
        </div>
      </div>

      <!-- KARTU SOROTAN ANTREAN / PENEMPATAN UTAMA -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-base-content/10">
        <div class="rounded-2xl p-4 border-2 bg-warning/15 border-warning/50 flex items-center justify-between gap-3">
          <div class="space-y-0.5 min-w-0">
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-base-content/75 block">
              {{ hasQueueNumber ? "Nomor Antrean Poli" : "Nomor Registrasi" }}
            </span>
            <div class="font-mono text-2xl sm:text-3xl font-black tracking-tight text-base-content truncate">
              {{
                visit.kodeAntreanSaatIni ||
                (visit.noAntreanSaatIni ? String(visit.noAntreanSaatIni).padStart(3, "0") : visit.noRegistrasi)
              }}
            </div>
            <span class="text-xs font-semibold text-base-content/75 block truncate">
              {{ visit.unitSaatIni?.nama || "-" }}
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-warning text-warning-content flex items-center justify-center shrink-0 shadow-xs">
            <Ticket class="w-6 h-6" />
          </div>
        </div>

        <div class="rounded-2xl p-4 border bg-base-200/35 border-base-content/10 space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Stethoscope class="w-3.5 h-3.5" />
            Dokter &amp; Jadwal Layanan
          </span>
          <div class="font-bold text-sm text-base-content truncate">{{ dokterName }}</div>
          <div v-if="visit.jadwalDokterSaatIni" class="text-xs text-base-content/70 flex items-center gap-1.5 flex-wrap">
            <Clock class="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {{ visit.jadwalDokterSaatIni.hari }},
              {{ visit.jadwalDokterSaatIni.jamMulai }} - {{ visit.jadwalDokterSaatIni.jamSelesai }}
            </span>
            <span
              v-if="visit.jadwalDokterSaatIni.sesi"
              class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-base-100 border border-base-content/10"
            >
              {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, visit.jadwalDokterSaatIni.sesi) }}
            </span>
            <span v-if="visit.jadwalDokterSaatIni.ruangan" class="text-[11px]">
              • {{ visit.jadwalDokterSaatIni.ruangan }}
            </span>
          </div>
          <div v-else-if="visit.bedSaatIni" class="text-xs font-semibold text-primary flex items-center gap-1.5">
            <BedDouble class="w-3.5 h-3.5 shrink-0" />
            <span>
              Bed {{ visit.bedSaatIni.kode }} — {{ visit.bedSaatIni.nama }}
              <template v-if="visit.kelasSaatIni">({{ visit.kelasSaatIni.nama }})</template>
            </span>
          </div>
          <div v-else class="text-xs text-base-content/60">
            Penanggung Jawab Pelayanan (DPJP / Dokter Jaga)
          </div>
        </div>

        <div class="rounded-2xl p-4 border bg-base-200/35 border-base-content/10 space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <CreditCard class="w-3.5 h-3.5" />
            Penjamin Utama {{ penjaminEntries.length > 1 ? `(+${penjaminEntries.length - 1} COB)` : "" }}
          </span>
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded border"
              :class="getJenisPenjaminBadgeClass(visit.jenisPenjamin)"
            >
              {{ getOptionLabel(JENIS_PENJAMIN_OPTIONS, visit.jenisPenjamin) }}
            </span>
            <span class="font-bold text-sm text-base-content truncate">
              {{ visit.namaPenjaminSnapshot }}
            </span>
          </div>
          <div class="text-xs text-base-content/65 font-mono truncate">
            <span v-if="visit.noKartuSnapshot">Kartu: {{ visit.noKartuSnapshot }}</span>
            <span v-else>Tanpa nomor kartu asuransi</span>
            <span v-if="visit.noSep"> • SEP: {{ visit.noSep }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- DETAIL INFORMASI PASIEN & PENJAMIN LENGKAP -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Identitas Pasien -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-xs space-y-3.5">
        <div class="flex items-center gap-2.5 pb-2.5 border-b border-base-content/10">
          <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserRound class="w-4 h-4" />
          </div>
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-base-content">
            Informasi Pasien yang Didaftarkan
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span class="text-base-content/55 block">No. Rekam Medis (RM)</span>
            <span class="font-mono font-extrabold text-sm text-primary">{{ visit.pasien?.noRm || "-" }}</span>
          </div>
          <div>
            <span class="text-base-content/55 block">NIK / Identitas Lain</span>
            <span class="font-mono font-semibold text-base-content">
              {{ penduduk?.nik || penduduk?.noIdentitasLain || "-" }}
            </span>
          </div>
          <div>
            <span class="text-base-content/55 block">Nama Lengkap</span>
            <span class="font-bold text-base-content">{{ penduduk?.namaLengkap || "-" }}</span>
          </div>
          <div>
            <span class="text-base-content/55 block">Jenis Kelamin</span>
            <span class="font-semibold text-base-content">
              {{ getOptionLabel(JENIS_KELAMIN_OPTIONS, penduduk?.jenisKelamin) }}
            </span>
          </div>
          <div>
            <span class="text-base-content/55 block">Tempat / Tanggal Lahir</span>
            <span class="font-semibold text-base-content">
              <template v-if="penduduk?.tempatLahir">{{ penduduk.tempatLahir }}, </template>
              {{ penduduk?.tanggalLahir ? `${formatDate(penduduk.tanggalLahir)} (${ageLabel})` : "-" }}
            </span>
          </div>
          <div>
            <span class="text-base-content/55 block">No. Telepon / HP</span>
            <span class="font-semibold text-base-content">{{ penduduk?.noTelepon || "-" }}</span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-base-content/55 block">Alamat Pasien</span>
            <span class="font-semibold text-base-content">{{ alamatPasien }}</span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-base-content/55 block">Penanggung Jawab Pasien</span>
            <span class="font-semibold text-base-content">{{ penanggungJawabLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Detail Kunjungan & Seluruh Penjamin -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-xs space-y-3.5">
        <div class="flex items-center gap-2.5 pb-2.5 border-b border-base-content/10">
          <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building class="w-4 h-4" />
          </div>
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-base-content">
            Detail Kunjungan &amp; Daftar Penjamin
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span class="text-base-content/55 block">Unit Pelayanan</span>
            <span class="font-bold text-base-content">
              {{ visit.unitSaatIni ? `${visit.unitSaatIni.kode} — ${visit.unitSaatIni.nama}` : "-" }}
            </span>
          </div>
          <div>
            <span class="text-base-content/55 block">Cara Masuk &amp; Rujukan</span>
            <span class="font-semibold text-base-content">
              {{ getOptionLabel(CARA_MASUK_PASIEN_OPTIONS, visit.caraMasuk) }}
              <template v-if="visit.asalRujukan"> • {{ visit.asalRujukan }}</template>
            </span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-base-content/55 block">Keluhan Utama</span>
            <span class="font-semibold text-base-content">{{ visit.keluhanUtama || "-" }}</span>
          </div>
          <div v-if="visit.catatan" class="sm:col-span-2">
            <span class="text-base-content/55 block">Catatan Petugas</span>
            <span class="font-semibold text-base-content">{{ visit.catatan }}</span>
          </div>
        </div>

        <div class="pt-2 border-t border-base-content/10 space-y-2">
          <div class="text-xs font-bold text-base-content/75 flex items-center gap-1.5">
            <FileText class="w-3.5 h-3.5 text-primary" />
            <span>Penjamin Terdaftar ({{ penjaminEntries.length }})</span>
          </div>

          <div
            v-for="pj in penjaminEntries"
            :key="`${pj.id}-${pj.urutan}`"
            class="p-3 rounded-xl border bg-base-200/25 border-base-content/10 text-xs space-y-1"
          >
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span
                  class="text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                  :class="
                    pj.isUtama
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 text-base-content/80'
                  "
                >
                  #{{ pj.urutan }} {{ pj.isUtama ? "Utama" : "COB" }}
                </span>
                <span class="font-bold text-base-content">{{ pj.namaPenjaminSnapshot }}</span>
              </div>
              <span
                class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                :class="getJenisPenjaminBadgeClass(pj.jenisPenjamin)"
              >
                {{ getOptionLabel(JENIS_PENJAMIN_OPTIONS, pj.jenisPenjamin) }}
              </span>
            </div>

            <div class="text-[11px] text-base-content/70 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
              <span v-if="pj.noKartuSnapshot">No. Kartu: {{ pj.noKartuSnapshot }}</span>
              <span v-if="pj.kelasHakSnapshot">Kelas: {{ pj.kelasHakSnapshot.nama }}</span>
              <span v-if="pj.noSep">SEP: {{ pj.noSep }}</span>
              <span v-if="pj.noRujukan">Rujukan: {{ pj.noRujukan }}</span>
            </div>
            <div v-if="pj.keterangan" class="text-[11px] text-base-content/65">
              Ket: {{ pj.keterangan }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER AKSI LANJUTAN -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn btn-outline btn-sm rounded-xl gap-1.5 font-semibold"
          @click="emit('open-detail')"
        >
          <Eye class="w-4 h-4" />
          <span>Lihat Riwayat Unit Lengkap</span>
        </button>

        <NuxtLink
          :to="slugPath('/transaksi/informasi-kunjungan')"
          class="btn btn-outline btn-primary btn-sm rounded-xl gap-1.5 font-semibold"
        >
          <ClipboardCheck class="w-4 h-4" />
          <span>Buka Informasi Kunjungan</span>
        </NuxtLink>
      </div>

      <button
        type="button"
        class="btn btn-primary rounded-xl px-6 font-bold gap-2 shadow-md shadow-primary/20"
        @click="emit('register-another')"
      >
        <ClipboardPlus class="w-4 h-4" />
        <span>Daftarkan Pasien Berikutnya</span>
      </button>
    </div>
  </div>
</template>

