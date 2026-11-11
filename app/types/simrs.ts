import type { MasterReferenceItem, MasterStatus } from "@/types/master-data";

/* =========================
   ENUMS & CONSTANTS (MIRROR BACKEND simrs.enum.ts)
========================= */
export enum JenisKelamin {
  LAKI_LAKI = "L",
  PEREMPUAN = "P",
}

export enum GolonganDarah {
  A = "A",
  B = "B",
  AB = "AB",
  O = "O",
  TIDAK_TAHU = "TIDAK_TAHU",
}

export enum RhesusDarah {
  POSITIF = "+",
  NEGATIF = "-",
}

export enum StatusPerkawinan {
  BELUM_KAWIN = "BELUM_KAWIN",
  KAWIN = "KAWIN",
  CERAI_HIDUP = "CERAI_HIDUP",
  CERAI_MATI = "CERAI_MATI",
}

export enum Kewarganegaraan {
  WNI = "WNI",
  WNA = "WNA",
}

export enum StatusKepegawaian {
  PNS = "PNS",
  PPPK = "PPPK",
  TETAP_RS = "TETAP_RS",
  KONTRAK = "KONTRAK",
  MITRA = "MITRA",
  HONORER = "HONORER",
  RESIDEN = "RESIDEN",
}

export enum StatusAktifPegawai {
  AKTIF = "AKTIF",
  CUTI = "CUTI",
  NONAKTIF = "NONAKTIF",
  PENSIUN = "PENSIUN",
  RESIGN = "RESIGN",
}

export enum JenisDokter {
  UMUM = "UMUM",
  SPESIALIS = "SPESIALIS",
  SUBSPESIALIS = "SUBSPESIALIS",
  GIGI = "GIGI",
  GIGI_SPESIALIS = "GIGI_SPESIALIS",
}

export enum JenisIdentitas {
  KTP = "KTP",
  PASPOR = "PASPOR",
  KITAS = "KITAS",
  KITAP = "KITAP",
  KIA = "KIA",
  TANPA_IDENTITAS = "TANPA_IDENTITAS",
}

export enum StatusHidup {
  HIDUP = "HIDUP",
  MENINGGAL = "MENINGGAL",
}

export enum JenisPenjamin {
  UMUM = "UMUM",
  BPJS = "BPJS",
  ASURANSI_SWASTA = "ASURANSI_SWASTA",
  PERUSAHAAN = "PERUSAHAAN",
  KEMENKES = "KEMENKES",
  LAINNYA = "LAINNYA",
}

export enum HubunganPenanggungJawab {
  DIRI_SENDIRI = "DIRI_SENDIRI",
  PASANGAN = "PASANGAN",
  ORANG_TUA = "ORANG_TUA",
  ANAK = "ANAK",
  SAUDARA = "SAUDARA",
  KERABAT = "KERABAT",
  LAINNYA = "LAINNYA",
}

export enum FormatNoRm {
  PLAIN_8 = "PLAIN_8",
  DASH_6 = "DASH_6",
}

export enum JenisUnit {
  RAWAT_JALAN = "RAWAT_JALAN",
  RAWAT_INAP = "RAWAT_INAP",
  IGD = "IGD",
  INTENSIVE = "INTENSIVE",
  OK = "OK",
  FARMASI = "FARMASI",
  LABORATORIUM = "LABORATORIUM",
  RADIOLOGI = "RADIOLOGI",
  PENUNJANG = "PENUNJANG",
  LAINNYA = "LAINNYA",
}

export enum StatusKetersediaanBed {
  KOSONG = "KOSONG",
  TERISI = "TERISI",
  BOOKING = "BOOKING",
  PEMBERSIHAN = "PEMBERSIHAN",
  PERBAIKAN = "PERBAIKAN",
}

export enum HariPraktik {
  SENIN = "SENIN",
  SELASA = "SELASA",
  RABU = "RABU",
  KAMIS = "KAMIS",
  JUMAT = "JUMAT",
  SABTU = "SABTU",
  MINGGU = "MINGGU",
}

export enum SesiPraktik {
  PAGI = "PAGI",
  SIANG = "SIANG",
  SORE = "SORE",
  MALAM = "MALAM",
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
}

export const JENIS_KELAMIN_OPTIONS: SelectOption<JenisKelamin>[] = [
  { value: JenisKelamin.LAKI_LAKI, label: "Laki-laki (L)" },
  { value: JenisKelamin.PEREMPUAN, label: "Perempuan (P)" },
];

export const GOLONGAN_DARAH_OPTIONS: SelectOption<GolonganDarah>[] = [
  { value: GolonganDarah.A, label: "A" },
  { value: GolonganDarah.B, label: "B" },
  { value: GolonganDarah.AB, label: "AB" },
  { value: GolonganDarah.O, label: "O" },
  { value: GolonganDarah.TIDAK_TAHU, label: "Tidak Tahu" },
];

export const RHESUS_OPTIONS: SelectOption<RhesusDarah>[] = [
  { value: RhesusDarah.POSITIF, label: "Positif (+)" },
  { value: RhesusDarah.NEGATIF, label: "Negatif (-)" },
];

export const STATUS_PERKAWINAN_OPTIONS: SelectOption<StatusPerkawinan>[] = [
  { value: StatusPerkawinan.BELUM_KAWIN, label: "Belum Kawin" },
  { value: StatusPerkawinan.KAWIN, label: "Kawin" },
  { value: StatusPerkawinan.CERAI_HIDUP, label: "Cerai Hidup" },
  { value: StatusPerkawinan.CERAI_MATI, label: "Cerai Mati" },
];

export const KEWARGANEGARAAN_OPTIONS: SelectOption<Kewarganegaraan>[] = [
  { value: Kewarganegaraan.WNI, label: "WNI (Warga Negara Indonesia)" },
  { value: Kewarganegaraan.WNA, label: "WNA (Warga Negara Asing)" },
];

export const STATUS_KEPEGAWAIAN_OPTIONS: SelectOption<StatusKepegawaian>[] = [
  { value: StatusKepegawaian.TETAP_RS, label: "Tetap RS" },
  { value: StatusKepegawaian.PNS, label: "PNS" },
  { value: StatusKepegawaian.PPPK, label: "PPPK" },
  { value: StatusKepegawaian.KONTRAK, label: "Kontrak" },
  { value: StatusKepegawaian.MITRA, label: "Mitra" },
  { value: StatusKepegawaian.HONORER, label: "Honorer" },
  { value: StatusKepegawaian.RESIDEN, label: "Residen" },
];

export const STATUS_AKTIF_PEGAWAI_OPTIONS: SelectOption<StatusAktifPegawai>[] = [
  { value: StatusAktifPegawai.AKTIF, label: "Aktif" },
  { value: StatusAktifPegawai.CUTI, label: "Cuti" },
  { value: StatusAktifPegawai.NONAKTIF, label: "Nonaktif" },
  { value: StatusAktifPegawai.PENSIUN, label: "Pensiun" },
  { value: StatusAktifPegawai.RESIGN, label: "Resign" },
];

export const JENIS_DOKTER_OPTIONS: SelectOption<JenisDokter>[] = [
  { value: JenisDokter.UMUM, label: "Dokter Umum" },
  { value: JenisDokter.SPESIALIS, label: "Dokter Spesialis" },
  { value: JenisDokter.SUBSPESIALIS, label: "Dokter Subspesialis" },
  { value: JenisDokter.GIGI, label: "Dokter Gigi" },
  { value: JenisDokter.GIGI_SPESIALIS, label: "Dokter Gigi Spesialis" },
];

export const JENIS_IDENTITAS_OPTIONS: SelectOption<JenisIdentitas>[] = [
  { value: JenisIdentitas.KTP, label: "KTP (NIK)" },
  { value: JenisIdentitas.KIA, label: "KIA (Kartu Identitas Anak)" },
  { value: JenisIdentitas.PASPOR, label: "Paspor" },
  { value: JenisIdentitas.KITAS, label: "KITAS" },
  { value: JenisIdentitas.KITAP, label: "KITAP" },
  { value: JenisIdentitas.TANPA_IDENTITAS, label: "Tanpa Identitas" },
];

export const STATUS_HIDUP_OPTIONS: SelectOption<StatusHidup>[] = [
  { value: StatusHidup.HIDUP, label: "Hidup" },
  { value: StatusHidup.MENINGGAL, label: "Meninggal" },
];

export const JENIS_PENJAMIN_OPTIONS: SelectOption<JenisPenjamin>[] = [
  { value: JenisPenjamin.UMUM, label: "Umum / Pribadi" },
  { value: JenisPenjamin.BPJS, label: "BPJS Kesehatan" },
  { value: JenisPenjamin.ASURANSI_SWASTA, label: "Asuransi Swasta" },
  { value: JenisPenjamin.PERUSAHAAN, label: "Perusahaan / Korporasi" },
  { value: JenisPenjamin.KEMENKES, label: "Program Kemenkes" },
  { value: JenisPenjamin.LAINNYA, label: "Lainnya" },
];

export const HUBUNGAN_PJ_OPTIONS: SelectOption<HubunganPenanggungJawab>[] = [
  { value: HubunganPenanggungJawab.DIRI_SENDIRI, label: "Diri Sendiri" },
  { value: HubunganPenanggungJawab.PASANGAN, label: "Pasangan (Suami / Istri)" },
  { value: HubunganPenanggungJawab.ORANG_TUA, label: "Orang Tua" },
  { value: HubunganPenanggungJawab.ANAK, label: "Anak" },
  { value: HubunganPenanggungJawab.SAUDARA, label: "Saudara Kandung" },
  { value: HubunganPenanggungJawab.KERABAT, label: "Kerabat / Keluarga" },
  { value: HubunganPenanggungJawab.LAINNYA, label: "Lainnya" },
];

export const FORMAT_NO_RM_OPTIONS: SelectOption<FormatNoRm>[] = [
  { value: FormatNoRm.PLAIN_8, label: "8 Digit (00000001)" },
  { value: FormatNoRm.DASH_6, label: "6 Digit Strip (00-00-01)" },
];

export const JENIS_UNIT_OPTIONS: SelectOption<JenisUnit>[] = [
  { value: JenisUnit.RAWAT_JALAN, label: "Rawat Jalan / Poliklinik" },
  { value: JenisUnit.RAWAT_INAP, label: "Rawat Inap / Bangsal" },
  { value: JenisUnit.IGD, label: "IGD (Gawat Darurat)" },
  { value: JenisUnit.INTENSIVE, label: "Intensive (ICU / NICU / PICU)" },
  { value: JenisUnit.OK, label: "Kamar Operasi (OK)" },
  { value: JenisUnit.FARMASI, label: "Farmasi / Apotek" },
  { value: JenisUnit.LABORATORIUM, label: "Laboratorium" },
  { value: JenisUnit.RADIOLOGI, label: "Radiologi" },
  { value: JenisUnit.PENUNJANG, label: "Penunjang Medis Lainnya" },
  { value: JenisUnit.LAINNYA, label: "Lainnya" },
];

export const STATUS_KETERSEDIAAN_BED_OPTIONS: SelectOption<StatusKetersediaanBed>[] = [
  { value: StatusKetersediaanBed.KOSONG, label: "Kosong (Tersedia)" },
  { value: StatusKetersediaanBed.TERISI, label: "Terisi Pasien" },
  { value: StatusKetersediaanBed.BOOKING, label: "Booking / Dipesan" },
  { value: StatusKetersediaanBed.PEMBERSIHAN, label: "Pembersihan / Sterilisasi" },
  { value: StatusKetersediaanBed.PERBAIKAN, label: "Perbaikan / Maintenance" },
];

export const BED_CAPABLE_UNIT_TYPES: ReadonlySet<JenisUnit> = new Set([
  JenisUnit.RAWAT_INAP,
  JenisUnit.IGD,
  JenisUnit.INTENSIVE,
  JenisUnit.OK,
]);

export function isBedCapableUnitType(jenisUnit: JenisUnit): boolean {
  return BED_CAPABLE_UNIT_TYPES.has(jenisUnit);
}

export const HARI_PRAKTIK_OPTIONS: SelectOption<HariPraktik>[] = [
  { value: HariPraktik.SENIN, label: "Senin" },
  { value: HariPraktik.SELASA, label: "Selasa" },
  { value: HariPraktik.RABU, label: "Rabu" },
  { value: HariPraktik.KAMIS, label: "Kamis" },
  { value: HariPraktik.JUMAT, label: "Jumat" },
  { value: HariPraktik.SABTU, label: "Sabtu" },
  { value: HariPraktik.MINGGU, label: "Minggu" },
];

export const SESI_PRAKTIK_OPTIONS: SelectOption<SesiPraktik>[] = [
  { value: SesiPraktik.PAGI, label: "Pagi" },
  { value: SesiPraktik.SIANG, label: "Siang" },
  { value: SesiPraktik.SORE, label: "Sore" },
  { value: SesiPraktik.MALAM, label: "Malam" },
];

/* =========================
   FORMATTER HELPERS
========================= */
export function getOptionLabel<T extends string>(
  options: SelectOption<T>[],
  value?: string | null,
  fallback = "-",
): string {
  if (!value) return fallback;
  return options.find((opt) => opt.value === value)?.label ?? value;
}

export function getJenisUnitBadgeClass(jenis?: string | null): string {
  switch (jenis) {
    case JenisUnit.RAWAT_INAP:
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    case JenisUnit.RAWAT_JALAN:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case JenisUnit.IGD:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    case JenisUnit.INTENSIVE:
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25";
    case JenisUnit.OK:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case JenisUnit.FARMASI:
      return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25";
    case JenisUnit.LABORATORIUM:
    case JenisUnit.RADIOLOGI:
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export function getStatusKetersediaanBedBadgeClass(status?: string | null): string {
  switch (status) {
    case StatusKetersediaanBed.KOSONG:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case StatusKetersediaanBed.TERISI:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    case StatusKetersediaanBed.BOOKING:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case StatusKetersediaanBed.PEMBERSIHAN:
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    case StatusKetersediaanBed.PERBAIKAN:
      return "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export function getJenisPenjaminBadgeClass(jenis?: string | null): string {
  switch (jenis) {
    case JenisPenjamin.BPJS:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case JenisPenjamin.ASURANSI_SWASTA:
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    case JenisPenjamin.PERUSAHAAN:
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25";
    case JenisPenjamin.KEMENKES:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case JenisPenjamin.UMUM:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export function getHariPraktikBadgeClass(hari?: string | null): string {
  switch (hari) {
    case HariPraktik.SENIN:
    case HariPraktik.SELASA:
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    case HariPraktik.RABU:
    case HariPraktik.KAMIS:
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25";
    case HariPraktik.JUMAT:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case HariPraktik.SABTU:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case HariPraktik.MINGGU:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export function getSesiPraktikBadgeClass(sesi?: string | null): string {
  switch (sesi) {
    case SesiPraktik.PAGI:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case SesiPraktik.SIANG:
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25";
    case SesiPraktik.SORE:
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25";
    case SesiPraktik.MALAM:
      return "bg-slate-600/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export function parseJamKeMenit(jam?: string | null): number | null {
  if (!jam || typeof jam !== "string") return null;
  const normalized = jam.trim().slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) return null;
  const [hours, minutes] = normalized.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return null;
  return hours * 60 + minutes;
}

export function hitungDurasiSesiMenit(
  jamMulai?: string | null,
  jamSelesai?: string | null,
): number | null {
  const mulai = parseJamKeMenit(jamMulai);
  const selesai = parseJamKeMenit(jamSelesai);
  if (mulai === null || selesai === null || selesai <= mulai) return null;
  return selesai - mulai;
}

export function formatDurasiMenitLabel(totalMenit?: number | null): string {
  if (!totalMenit || totalMenit <= 0) return "-";
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  if (jam > 0 && menit > 0) return `${jam} jam ${menit} mnt`;
  if (jam > 0) return `${jam} jam`;
  return `${menit} menit`;
}

export function calculateAgeLabel(tanggalLahir?: string | null): string {
  if (!tanggalLahir) return "";
  const birth = new Date(tanggalLahir);
  if (Number.isNaN(birth.getTime())) return "";

  const now = new Date();
  if (birth > now) return "";

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) return `${years} thn`;
  if (months > 0) return `${months} bln`;
  return `${days} hr`;
}

export function formatNamaGelarDokter(
  gelarDepan?: string | null,
  namaLengkap?: string | null,
  gelarBelakang?: string | null,
): string {
  const namaUtama = [gelarDepan?.trim(), namaLengkap?.trim()]
    .filter(Boolean)
    .join(" ");
  if (!namaUtama) return "";
  return gelarBelakang?.trim()
    ? `${namaUtama}, ${gelarBelakang.trim()}`
    : namaUtama;
}

export function formatKelurahanLabel(kelurahan?: KelurahanRelation | null): string {
  if (!kelurahan) return "";
  return [
    kelurahan.nama,
    kelurahan.kecamatan?.nama,
    kelurahan.kecamatan?.kabupaten?.nama,
    kelurahan.kecamatan?.kabupaten?.provinsi?.nama,
  ]
    .filter(Boolean)
    .join(", ");
}

/* =========================
   WILAYAH RELATION
========================= */
export interface KelurahanRelation {
  id: string;
  nama: string;
  kodePos?: string | null;
  kecamatan?: {
    id: string;
    nama: string;
    kabupaten?: {
      id: string;
      nama: string;
      provinsi?: {
        id: string;
        nama: string;
      };
    };
  } | null;
}

/* =========================
   PENDUDUK TYPES
========================= */
export interface PendudukItem {
  id: number;
  jenisIdentitas?: JenisIdentitas;
  nik?: string | null;
  noIdentitasLain?: string | null;
  noKk?: string | null;
  namaLengkap: string;
  namaIbuKandung?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin: JenisKelamin;
  golonganDarah?: GolonganDarah | null;
  rhesus?: RhesusDarah | null;
  statusPerkawinan?: StatusPerkawinan | null;
  kewarganegaraan?: Kewarganegaraan;
  statusHidup?: StatusHidup;
  tanggalMeninggal?: string | null;
  alamatKtp?: string | null;
  rt?: string | null;
  rw?: string | null;
  kodePos?: string | null;
  noTelepon?: string | null;
  email?: string | null;
  idKelurahan?: string | null;
  kelurahan?: KelurahanRelation | null;
  agamaId?: number | null;
  agama?: Pick<MasterReferenceItem, "id" | "nama"> | null;
  pendidikanId?: number | null;
  pendidikan?: Pick<MasterReferenceItem, "id" | "nama"> | null;
  pekerjaanId?: number | null;
  pekerjaan?: Pick<MasterReferenceItem, "id" | "nama"> | null;
  sukuId?: number | null;
  suku?: Pick<MasterReferenceItem, "id" | "nama"> | null;
  ihsPatientId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePendudukPayload {
  jenisIdentitas?: JenisIdentitas;
  nik?: string;
  noIdentitasLain?: string;
  noKk?: string;
  namaLengkap: string;
  namaIbuKandung?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  jenisKelamin: JenisKelamin;
  golonganDarah?: GolonganDarah;
  rhesus?: RhesusDarah;
  statusPerkawinan?: StatusPerkawinan;
  kewarganegaraan?: Kewarganegaraan;
  statusHidup?: StatusHidup;
  tanggalMeninggal?: string;
  alamatKtp?: string;
  rt?: string;
  rw?: string;
  kodePos?: string;
  noTelepon?: string;
  email?: string;
  idKelurahan?: string;
  agamaId?: number;
  pendidikanId?: number;
  pekerjaanId?: number;
  sukuId?: number;
  ihsPatientId?: string;
}

export type UpdatePendudukPayload = Partial<CreatePendudukPayload>;

export interface QueryPendudukParams {
  page?: number;
  limit?: number;
  search?: string;
  jenisKelamin?: JenisKelamin | "";
  idKelurahan?: string;
  sortBy?: "id" | "namaLengkap" | "nik" | "createdAt";
  sortType?: "ASC" | "DESC";
}

/* =========================
   DOKTER TYPES
========================= */
export interface DokterPegawaiSummary {
  id: number;
  nip: string;
  name?: string;
  position?: string | null;
  statusKepegawaian?: StatusKepegawaian | null;
  statusAktif?: StatusAktifPegawai | null;
  unitKerja?: string | null;
  avatar?: string | null;
  pendudukId?: number | null;
  penduduk?: {
    id: number;
    nik?: string | null;
    namaLengkap: string;
  } | null;
}

export interface DokterItem {
  id: number;
  kodeDokter: string;
  pendudukId: number;
  penduduk?: PendudukItem | null;
  pegawaiId?: number | null;
  pegawai?: DokterPegawaiSummary | null;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  namaTampilan?: string;
  jenisDokter: JenisDokter;
  spesialisasi?: string | null;
  noStr?: string | null;
  isStrSeumurHidup: boolean;
  strTerbitPada?: string | null;
  strBerlakuSampai?: string | null;
  noSip?: string | null;
  sipTerbitPada?: string | null;
  sipBerlakuSampai?: string | null;
  ihsPractitionerId?: string | null;
  kodeBpjs?: string | null;
  status: MasterStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePegawaiForDokterPayload {
  nip: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
  statusKepegawaian?: StatusKepegawaian;
  statusAktif?: StatusAktifPegawai;
  unitKerja?: string;
  tanggalMasuk?: string;
  tanggalKeluar?: string;
  bio?: string;
  address?: string;
  idKelurahan?: string;
}

export interface CreateDokterPayload {
  kodeDokter: string;
  pendudukId?: number;
  penduduk?: CreatePendudukPayload;
  pegawaiId?: number;
  pegawai?: CreatePegawaiForDokterPayload;
  gelarDepan?: string;
  gelarBelakang?: string;
  jenisDokter?: JenisDokter;
  spesialisasi?: string;
  noStr?: string;
  isStrSeumurHidup?: boolean;
  strTerbitPada?: string;
  strBerlakuSampai?: string;
  noSip?: string;
  sipTerbitPada?: string;
  sipBerlakuSampai?: string;
  ihsPractitionerId?: string;
  kodeBpjs?: string;
  status?: MasterStatus;
}

export type UpdateDokterPayload = Partial<
  Omit<CreateDokterPayload, "penduduk" | "pegawai">
>;

export interface QueryDokterParams {
  page?: number;
  limit?: number;
  search?: string;
  jenisDokter?: JenisDokter | "";
  spesialisasi?: string;
  unitId?: number;
  status?: MasterStatus | "";
  sortBy?: "id" | "kodeDokter" | "jenisDokter" | "spesialisasi" | "createdAt";
  sortType?: "ASC" | "DESC";
}

export interface AvailablePendudukOption {
  id: number;
  nik?: string | null;
  namaLengkap: string;
  jenisKelamin: JenisKelamin;
  tanggalLahir?: string | null;
}

export interface AvailablePegawaiOption {
  id: number;
  nip: string;
  name: string;
  position?: string | null;
  statusKepegawaian?: StatusKepegawaian | null;
  statusAktif?: StatusAktifPegawai | null;
  pendudukId?: number | null;
  penduduk?: {
    id: number;
    nik?: string | null;
    namaLengkap: string;
  } | null;
}


/* =========================
   PENJAMIN TYPES
========================= */
export interface PenjaminItem {
  id: number;
  kode: string;
  nama: string;
  jenisPenjamin: JenisPenjamin;
  perusahaanInduk?: string | null;
  noTelepon?: string | null;
  email?: string | null;
  alamat?: string | null;
  picNama?: string | null;
  picTelepon?: string | null;
  noPks?: string | null;
  pksBerlakuSampai?: string | null;
  kodeEksternalBpjs?: string | null;
  butuhNoKartu: boolean;
  status: MasterStatus;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PenjaminOptionItem {
  id: number;
  kode: string;
  nama: string;
  jenisPenjamin: JenisPenjamin;
  butuhNoKartu: boolean;
  status: MasterStatus;
}

export interface CreatePenjaminPayload {
  kode: string;
  nama: string;
  jenisPenjamin: JenisPenjamin;
  perusahaanInduk?: string;
  noTelepon?: string;
  email?: string;
  alamat?: string;
  picNama?: string;
  picTelepon?: string;
  noPks?: string;
  pksBerlakuSampai?: string;
  kodeEksternalBpjs?: string;
  butuhNoKartu?: boolean;
  status?: MasterStatus;
}

export type UpdatePenjaminPayload = Partial<CreatePenjaminPayload>;

export interface QueryPenjaminParams {
  page?: number;
  limit?: number;
  search?: string;
  jenisPenjamin?: JenisPenjamin | "";
  status?: MasterStatus | "";
  sortBy?: "id" | "kode" | "nama" | "jenisPenjamin" | "createdAt";
  sortType?: "ASC" | "DESC";
}

/* =========================
   PASIEN & PASIEN PENJAMIN TYPES
========================= */
export interface PasienPenjaminItem {
  id: number;
  pasienId: number;
  penjaminId: number;
  penjamin?: PenjaminItem | PenjaminOptionItem | null;
  noKartu?: string | null;
  kelasHakId?: number | null;
  kelasHak?: KelasItem | KelasOptionItem | null;
  faskesPerujuk?: string | null;
  berlakuSampai?: string | null;
  isUtama: boolean;
  keterangan?: string | null;
  status: MasterStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePasienPenjaminPayload {
  penjaminId: number;
  noKartu?: string;
  kelasHakId?: number | null;
  faskesPerujuk?: string;
  berlakuSampai?: string;
  isUtama?: boolean;
  keterangan?: string;
  status?: MasterStatus;
}

export type UpdatePasienPenjaminPayload = Partial<CreatePasienPenjaminPayload>;

export interface PasienItem {
  id: number;
  noRm: string;
  pendudukId: number;
  penduduk?: PendudukItem | null;
  pendudukIbuId?: number | null;
  pendudukIbu?: Partial<PendudukItem> | null;
  isBayiBaruLahir: boolean;
  isIdentitasTidakDiketahui: boolean;
  alamatSamaKtp: boolean;
  alamatDomisili?: string | null;
  idKelurahanDomisili?: string | null;
  kelurahanDomisili?: KelurahanRelation | null;
  rtDomisili?: string | null;
  rwDomisili?: string | null;
  namaPj?: string | null;
  hubunganPj?: HubunganPenanggungJawab | null;
  noHpPj?: string | null;
  alamatPj?: string | null;
  catatanPenting?: string | null;
  status: MasterStatus;
  penjaminList?: PasienPenjaminItem[];
  penjaminUtama?: PasienPenjaminItem | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PasienLookupItem {
  id: number;
  noRm: string;
  pendudukId: number;
  isBayiBaruLahir: boolean;
  isIdentitasTidakDiketahui: boolean;
  status: MasterStatus;
  penduduk?: Pick<
    PendudukItem,
    | "id"
    | "jenisIdentitas"
    | "nik"
    | "noIdentitasLain"
    | "namaLengkap"
    | "tanggalLahir"
    | "jenisKelamin"
    | "noTelepon"
    | "statusHidup"
  > | null;
  penjaminList?: PasienPenjaminItem[];
  penjaminUtama?: PasienPenjaminItem | null;
}

export interface CreatePasienPayload {
  noRm?: string;
  formatNoRm?: FormatNoRm;
  pendudukId?: number;
  penduduk?: CreatePendudukPayload;
  pendudukIbuId?: number;
  isBayiBaruLahir?: boolean;
  isIdentitasTidakDiketahui?: boolean;
  alamatSamaKtp?: boolean;
  alamatDomisili?: string;
  idKelurahanDomisili?: string;
  rtDomisili?: string;
  rwDomisili?: string;
  namaPj?: string;
  hubunganPj?: HubunganPenanggungJawab;
  noHpPj?: string;
  alamatPj?: string;
  catatanPenting?: string;
  status?: MasterStatus;
  penjaminList?: CreatePasienPenjaminPayload[];
}

export type UpdatePasienPayload = Partial<
  Omit<CreatePasienPayload, "penduduk" | "formatNoRm" | "penjaminList">
>;

export interface QueryPasienParams {
  page?: number;
  limit?: number;
  search?: string;
  penjaminId?: number;
  jenisPenjamin?: JenisPenjamin | "";
  kelasHakId?: number;
  isBayiBaruLahir?: boolean | "";
  status?: MasterStatus | "";
  sortBy?: "id" | "noRm" | "createdAt";
  sortType?: "ASC" | "DESC";
}

/* =========================
   KELAS PERAWATAN TYPES
========================= */
export interface KelasItem {
  id: number;
  kode: string;
  nama: string;
  urutan: number;
  kodeBpjsAplicare?: string | null;
  tarifAkomodasi?: string | number | null;
  keterangan?: string | null;
  status: MasterStatus;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface KelasOptionItem {
  id: number;
  kode: string;
  nama: string;
  urutan: number;
  kodeBpjsAplicare?: string | null;
  tarifAkomodasi?: string | number | null;
}

export interface CreateKelasPayload {
  kode: string;
  nama: string;
  urutan?: number;
  kodeBpjsAplicare?: string;
  tarifAkomodasi?: number;
  keterangan?: string;
  status?: MasterStatus;
}

export type UpdateKelasPayload = Partial<CreateKelasPayload>;

export interface QueryKelasParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: MasterStatus | "";
  sortBy?: "id" | "kode" | "nama" | "urutan" | "createdAt";
  sortType?: "ASC" | "DESC";
}

/* =========================
   UNIT PELAYANAN TYPES
========================= */
export interface UnitParentSummary {
  id: number;
  kode: string;
  nama: string;
}

export interface UnitKelasSummary {
  id: number;
  kode: string;
  nama: string;
}

export interface UnitItem {
  id: number;
  kode: string;
  nama: string;
  jenisUnit: JenisUnit;
  parentId?: number | null;
  parent?: UnitParentSummary | null;
  kelasDefaultId?: number | null;
  kelasDefault?: UnitKelasSummary | null;
  gedung?: string | null;
  lantai?: string | null;
  noTeleponEkstensi?: string | null;
  kodeBpjsPoli?: string | null;
  ihsLocationId?: string | null;
  isTersediaBed: boolean;
  keterangan?: string | null;
  status: MasterStatus;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitOptionItem {
  id: number;
  kode: string;
  nama: string;
  jenisUnit: JenisUnit;
  parentId?: number | null;
  kelasDefaultId?: number | null;
  isTersediaBed: boolean;
  kelasDefault?: UnitKelasSummary | null;
}

export interface QueryUnitOptionsParams {
  search?: string;
  jenisUnit?: JenisUnit | "";
  isTersediaBed?: boolean;
}

export interface CreateUnitPayload {
  kode: string;
  nama: string;
  jenisUnit: JenisUnit;
  parentId?: number | null;
  kelasDefaultId?: number | null;
  gedung?: string;
  lantai?: string;
  noTeleponEkstensi?: string;
  kodeBpjsPoli?: string;
  ihsLocationId?: string;
  isTersediaBed?: boolean;
  keterangan?: string;
  status?: MasterStatus;
}

export type UpdateUnitPayload = Partial<CreateUnitPayload>;

export interface QueryUnitParams {
  page?: number;
  limit?: number;
  search?: string;
  jenisUnit?: JenisUnit | "";
  isTersediaBed?: boolean | "";
  status?: MasterStatus | "";
  sortBy?: "id" | "kode" | "nama" | "jenisUnit" | "createdAt";
  sortType?: "ASC" | "DESC";
}

/* =========================
   BED (TEMPAT TIDUR) TYPES
========================= */
export interface BedUnitSummary {
  id: number;
  kode: string;
  nama: string;
  jenisUnit?: JenisUnit;
}

export interface BedKelasSummary {
  id: number;
  kode: string;
  nama: string;
  urutan?: number;
  kodeBpjsAplicare?: string | null;
}

export interface BedItem {
  id: number;
  kode: string;
  nama: string;
  unitId: number;
  unit?: BedUnitSummary | null;
  kelasId: number;
  kelas?: BedKelasSummary | null;
  namaKamar?: string | null;
  statusKetersediaan: StatusKetersediaanBed;
  isIsolasi: boolean;
  ihsLocationId?: string | null;
  keterangan?: string | null;
  status: MasterStatus;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BedOptionItem {
  id: number;
  kode: string;
  nama: string;
  namaKamar?: string | null;
  unitId: number;
  kelasId: number;
  isIsolasi: boolean;
  statusKetersediaan: StatusKetersediaanBed;
  unit?: BedUnitSummary | null;
  kelas?: BedKelasSummary | null;
}

export interface BedSummaryItem {
  unitId: number;
  unitKode: string;
  unitNama: string;
  kelasId: number;
  kelasKode: string;
  kelasNama: string;
  totalBed: number;
  kosong: number;
  terisi: number;
  booking: number;
  pembersihan: number;
  perbaikan: number;
}

export interface CreateBedPayload {
  kode: string;
  nama: string;
  unitId: number;
  kelasId: number;
  namaKamar?: string;
  statusKetersediaan?: StatusKetersediaanBed;
  isIsolasi?: boolean;
  ihsLocationId?: string;
  keterangan?: string;
  status?: MasterStatus;
}

export type UpdateBedPayload = Partial<CreateBedPayload>;

export interface UpdateBedStatusPayload {
  statusKetersediaan: StatusKetersediaanBed;
  keterangan?: string;
}

export interface QueryBedParams {
  page?: number;
  limit?: number;
  search?: string;
  unitId?: number;
  kelasId?: number;
  statusKetersediaan?: StatusKetersediaanBed | "";
  isIsolasi?: boolean | "";
  status?: MasterStatus | "";
  sortBy?: "id" | "kode" | "nama" | "namaKamar" | "statusKetersediaan" | "createdAt";
  sortType?: "ASC" | "DESC";
}

/* =========================
   JADWAL DOKTER TYPES
========================= */
export interface JadwalDokterDokterSummary {
  id: number;
  kodeDokter: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  namaTampilan?: string;
  jenisDokter: JenisDokter;
  spesialisasi?: string | null;
  kodeBpjs?: string | null;
  ihsPractitionerId?: string | null;
  status?: MasterStatus;
  penduduk?: {
    id: number;
    namaLengkap: string;
  } | null;
}

export interface JadwalDokterUnitSummary {
  id: number;
  kode: string;
  nama: string;
  jenisUnit: JenisUnit;
  kodeBpjsPoli?: string | null;
  ihsLocationId?: string | null;
  status?: MasterStatus;
}

export interface JadwalDokterItem {
  id: number;
  dokterId: number;
  dokter?: JadwalDokterDokterSummary | null;
  unitId: number;
  unit?: JadwalDokterUnitSummary | null;
  hari: HariPraktik;
  hariLabel?: string;
  hariUrutan?: number | null;
  kodeHariBpjs?: number | null;
  jamMulai: string;
  jamSelesai: string;
  sesi?: SesiPraktik | null;
  ruangan?: string | null;
  kuotaJkn: number;
  kuotaNonJkn: number;
  kuotaTotal: number;
  durasiPerPasien?: number | null;
  estimasiSlot?: number | null;
  kodeJadwalBpjs?: string | null;
  ihsScheduleId?: string | null;
  keterangan?: string | null;
  status: MasterStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface JadwalDokterWeeklyGroup {
  hari: HariPraktik;
  label: string;
  urutan: number;
  kodeBpjs: number;
  totalJadwal: number;
  items: JadwalDokterItem[];
}

export interface BaseJadwalDokterPayload {
  dokterId: number;
  unitId: number;
  jamMulai: string;
  jamSelesai: string;
  sesi?: SesiPraktik;
  ruangan?: string;
  kuotaJkn?: number;
  kuotaNonJkn?: number;
  kuotaTotal?: number;
  durasiPerPasien?: number;
  kodeJadwalBpjs?: string;
  ihsScheduleId?: string;
  keterangan?: string;
  status?: MasterStatus;
}

export interface CreateJadwalDokterPayload extends BaseJadwalDokterPayload {
  hari: HariPraktik;
}

export interface BulkCreateJadwalDokterPayload extends BaseJadwalDokterPayload {
  hariList: HariPraktik[];
}

export type UpdateJadwalDokterPayload = Partial<CreateJadwalDokterPayload>;

export interface UpdateStatusJadwalDokterPayload {
  status: MasterStatus;
  keterangan?: string;
}

export type JadwalDokterSortField =
  | "id"
  | "hari"
  | "jamMulai"
  | "jamSelesai"
  | "kuotaTotal"
  | "createdAt";

export interface QueryJadwalDokterParams {
  page?: number;
  limit?: number;
  search?: string;
  dokterId?: number;
  unitId?: number;
  hari?: HariPraktik | "";
  sesi?: SesiPraktik | "";
  status?: MasterStatus | "";
  sortBy?: JadwalDokterSortField;
  sortType?: "ASC" | "DESC";
}

export interface QueryJadwalDokterOptionsParams {
  unitId?: number;
  dokterId?: number;
  hari?: HariPraktik | "";
  tanggal?: string;
  sesi?: SesiPraktik | "";
  search?: string;
}

export interface QueryJadwalDokterMingguanParams {
  unitId?: number;
  dokterId?: number;
  sesi?: SesiPraktik | "";
  search?: string;
}

/* =========================
   TRANSAKSI PENDAFTARAN TYPES
========================= */
export enum JenisLayananPendaftaran {
  RAWAT_JALAN = "RAWAT_JALAN",
  RAWAT_INAP = "RAWAT_INAP",
  IGD = "IGD",
  INTENSIVE = "INTENSIVE",
}

export enum StatusKunjungan {
  TERDAFTAR = "TERDAFTAR",
  DALAM_PELAYANAN = "DALAM_PELAYANAN",
  DIRAWAT = "DIRAWAT",
  SELESAI = "SELESAI",
  BATAL = "BATAL",
}

export enum StatusPenempatanUnit {
  AKTIF = "AKTIF",
  SELESAI = "SELESAI",
  BATAL = "BATAL",
}

export enum JenisPerpindahanUnit {
  PENDAFTARAN_AWAL = "PENDAFTARAN_AWAL",
  MUTASI_RAJAL = "MUTASI_RAJAL",
  ADMISI_RANAP = "ADMISI_RANAP",
  MUTASI_RANAP = "MUTASI_RANAP",
  PINDAH_BED = "PINDAH_BED",
  GANTI_DPJP = "GANTI_DPJP",
  BATAL_RANAP = "BATAL_RANAP",
}

export enum CaraMasukPasien {
  DATANG_SENDIRI = "DATANG_SENDIRI",
  RUJUKAN_FKTP = "RUJUKAN_FKTP",
  RUJUKAN_RS_LAIN = "RUJUKAN_RS_LAIN",
  IGD = "IGD",
  KONTROL = "KONTROL",
  LAINNYA = "LAINNYA",
}

export enum CaraKeluarPasien {
  PULANG_SEMBUH = "PULANG_SEMBUH",
  PULANG_PAKSA = "PULANG_PAKSA",
  DIRUJUK = "DIRUJUK",
  MENINGGAL = "MENINGGAL",
  LAINNYA = "LAINNYA",
}

export const JENIS_LAYANAN_PENDAFTARAN_OPTIONS: SelectOption<JenisLayananPendaftaran>[] = [
  { value: JenisLayananPendaftaran.RAWAT_JALAN, label: "Rawat Jalan" },
  { value: JenisLayananPendaftaran.RAWAT_INAP, label: "Rawat Inap" },
  { value: JenisLayananPendaftaran.IGD, label: "IGD (Gawat Darurat)" },
  { value: JenisLayananPendaftaran.INTENSIVE, label: "Intensive (ICU/NICU)" },
];

export const STATUS_KUNJUNGAN_OPTIONS: SelectOption<StatusKunjungan>[] = [
  { value: StatusKunjungan.TERDAFTAR, label: "Terdaftar" },
  { value: StatusKunjungan.DALAM_PELAYANAN, label: "Dalam Pelayanan" },
  { value: StatusKunjungan.DIRAWAT, label: "Sedang Dirawat" },
  { value: StatusKunjungan.SELESAI, label: "Selesai / Pulang" },
  { value: StatusKunjungan.BATAL, label: "Dibatalkan" },
];

export const CARA_MASUK_PASIEN_OPTIONS: SelectOption<CaraMasukPasien>[] = [
  { value: CaraMasukPasien.DATANG_SENDIRI, label: "Datang Sendiri" },
  { value: CaraMasukPasien.RUJUKAN_FKTP, label: "Rujukan FKTP / Puskesmas" },
  { value: CaraMasukPasien.RUJUKAN_RS_LAIN, label: "Rujukan Rumah Sakit Lain" },
  { value: CaraMasukPasien.IGD, label: "Masuk Melalui IGD" },
  { value: CaraMasukPasien.KONTROL, label: "Kontrol Ulang" },
  { value: CaraMasukPasien.LAINNYA, label: "Lainnya" },
];

export const CARA_KELUAR_PASIEN_OPTIONS: SelectOption<CaraKeluarPasien>[] = [
  { value: CaraKeluarPasien.PULANG_SEMBUH, label: "Pulang / Sembuh" },
  { value: CaraKeluarPasien.PULANG_PAKSA, label: "Pulang Atas Permintaan Sendiri" },
  { value: CaraKeluarPasien.DIRUJUK, label: "Dirujuk ke Fasilitas Lain" },
  { value: CaraKeluarPasien.MENINGGAL, label: "Meninggal Dunia" },
  { value: CaraKeluarPasien.LAINNYA, label: "Lainnya" },
];

export const JENIS_PERPINDAHAN_UNIT_OPTIONS: SelectOption<JenisPerpindahanUnit>[] = [
  { value: JenisPerpindahanUnit.PENDAFTARAN_AWAL, label: "Pendaftaran Awal" },
  { value: JenisPerpindahanUnit.MUTASI_RAJAL, label: "Mutasi Poliklinik" },
  { value: JenisPerpindahanUnit.ADMISI_RANAP, label: "Admisi Rawat Inap" },
  { value: JenisPerpindahanUnit.MUTASI_RANAP, label: "Mutasi Ruang Ranap" },
  { value: JenisPerpindahanUnit.PINDAH_BED, label: "Pindah Tempat Tidur" },
  { value: JenisPerpindahanUnit.GANTI_DPJP, label: "Ganti DPJP" },
  { value: JenisPerpindahanUnit.BATAL_RANAP, label: "Batal Rawat Inap" },
];

export const ACTIVE_KUNJUNGAN_STATUSES: ReadonlySet<string> = new Set([
  StatusKunjungan.TERDAFTAR,
  StatusKunjungan.DALAM_PELAYANAN,
  StatusKunjungan.DIRAWAT,
]);

export const INPATIENT_LAYANAN_SET: ReadonlySet<string> = new Set([
  JenisLayananPendaftaran.RAWAT_INAP,
  JenisLayananPendaftaran.INTENSIVE,
]);

export const REGISTRABLE_UNIT_JENIS_TO_LAYANAN: Partial<
  Record<JenisUnit, JenisLayananPendaftaran>
> = {
  [JenisUnit.RAWAT_JALAN]: JenisLayananPendaftaran.RAWAT_JALAN,
  [JenisUnit.RAWAT_INAP]: JenisLayananPendaftaran.RAWAT_INAP,
  [JenisUnit.IGD]: JenisLayananPendaftaran.IGD,
  [JenisUnit.INTENSIVE]: JenisLayananPendaftaran.INTENSIVE,
};

export function isActiveKunjunganStatus(status?: string | null): boolean {
  return Boolean(status && ACTIVE_KUNJUNGAN_STATUSES.has(status));
}

export function isInpatientLayanan(jenis?: string | null): boolean {
  return Boolean(jenis && INPATIENT_LAYANAN_SET.has(jenis));
}

export function getJenisLayananBadgeClass(jenis?: string | null): string {
  switch (jenis) {
    case JenisLayananPendaftaran.RAWAT_JALAN:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case JenisLayananPendaftaran.RAWAT_INAP:
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    case JenisLayananPendaftaran.IGD:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    case JenisLayananPendaftaran.INTENSIVE:
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export function getStatusKunjunganBadgeClass(status?: string | null): string {
  switch (status) {
    case StatusKunjungan.TERDAFTAR:
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    case StatusKunjungan.DALAM_PELAYANAN:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case StatusKunjungan.DIRAWAT:
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25";
    case StatusKunjungan.SELESAI:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case StatusKunjungan.BATAL:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export function getStatusPenempatanBadgeClass(status?: string | null): string {
  switch (status) {
    case StatusPenempatanUnit.AKTIF:
      return "bg-primary/10 text-primary border-primary/25";
    case StatusPenempatanUnit.SELESAI:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case StatusPenempatanUnit.BATAL:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    default:
      return "bg-base-200 text-base-content/70 border-base-content/15";
  }
}

export interface JadwalDokterKuotaInfo {
  kuotaJkn: number;
  terpakaiJkn: number;
  sisaKuotaJkn: number | null;
  kuotaNonJkn: number;
  terpakaiNonJkn: number;
  sisaKuotaNonJkn: number | null;
  kuotaTotal: number;
  terpakaiTotal: number;
  sisaKuotaTotal: number | null;
  isUnlimited: boolean;
  isPenuh: boolean;
  alasanPenuh: string | null;
}

export interface JadwalDokterTersediaItem extends JadwalDokterItem {
  tanggal: string;
  kuotaInfo: JadwalDokterKuotaInfo;
}

export interface PendaftaranPasienSummary {
  id: number;
  noRm: string;
  isBayiBaruLahir: boolean;
  isIdentitasTidakDiketahui: boolean;
  penduduk?: {
    id: number;
    nik?: string | null;
    namaLengkap: string;
    tanggalLahir?: string | null;
    jenisKelamin?: JenisKelamin;
    noTelepon?: string | null;
  } | null;
}

export interface PendaftaranUnitSummary {
  id: number;
  kode: string;
  nama: string;
  jenisUnit: JenisUnit;
}

export interface PendaftaranDokterSummary {
  id: number;
  kodeDokter: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  namaTampilan?: string;
  spesialisasi?: string | null;
  penduduk?: {
    id: number;
    namaLengkap: string;
  } | null;
}

export interface PendaftaranJadwalSummary {
  id: number;
  hari: HariPraktik;
  jamMulai: string;
  jamSelesai: string;
  sesi?: SesiPraktik | null;
  ruangan?: string | null;
}

export interface PendaftaranKelasSummary {
  id: number;
  kode: string;
  nama: string;
}

export interface PendaftaranBedSummary {
  id: number;
  kode: string;
  nama: string;
  namaKamar?: string | null;
  statusKetersediaan?: StatusKetersediaanBed;
}

export interface PendaftaranPenjaminSummary {
  id: number;
  kode: string;
  nama: string;
  jenisPenjamin: JenisPenjamin;
}

export interface PendaftaranPenjaminItem {
  id: number;
  pendaftaranId: number;
  urutan: number;
  isUtama: boolean;
  jenisPenjamin: JenisPenjamin;
  penjaminId?: number | null;
  penjamin?: PendaftaranPenjaminSummary | null;
  pasienPenjaminId?: number | null;
  pasienPenjamin?: PasienPenjaminItem | null;
  namaPenjaminSnapshot: string;
  noKartuSnapshot?: string | null;
  kelasHakIdSnapshot?: number | null;
  kelasHakSnapshot?: PendaftaranKelasSummary | null;
  noSep?: string | null;
  noRujukan?: string | null;
  keterangan?: string | null;
}

export interface CreatePendaftaranPenjaminItemPayload {
  urutan?: number;
  isUtama?: boolean;
  jenisPenjamin?: JenisPenjamin;
  penjaminId?: number;
  pasienPenjaminId?: number;
  noKartu?: string;
  kelasHakId?: number;
  faskesPerujuk?: string;
  berlakuSampai?: string;
  simpanKeProfilPasien?: boolean;
  noSep?: string;
  noRujukan?: string;
  keterangan?: string;
}

export interface UpdatePenjaminPendaftaranPayload {
  penjaminList: CreatePendaftaranPenjaminItemPayload[];
}

export interface PendaftaranUnitHistoryItem {
  id: number;
  pendaftaranId: number;
  urutan: number;
  tanggalKunjungan: string;
  jenisPerpindahan: JenisPerpindahanUnit;
  unitAsalId?: number | null;
  unitAsal?: PendaftaranUnitSummary | null;
  kelasAsalId?: number | null;
  kelasAsal?: PendaftaranKelasSummary | null;
  bedAsalId?: number | null;
  bedAsal?: PendaftaranBedSummary | null;
  dokterAsalId?: number | null;
  dokterAsal?: PendaftaranDokterSummary | null;
  unitTujuanId: number;
  unitTujuan?: PendaftaranUnitSummary | null;
  jenisLayananTujuan: JenisLayananPendaftaran;
  kelasTujuanId?: number | null;
  kelasTujuan?: PendaftaranKelasSummary | null;
  bedTujuanId?: number | null;
  bedTujuan?: PendaftaranBedSummary | null;
  dokterTujuanId: number;
  dokterTujuan?: PendaftaranDokterSummary | null;
  jadwalDokterId?: number | null;
  jadwalDokter?: PendaftaranJadwalSummary | null;
  noAntrean?: number | null;
  kodeAntrean?: string | null;
  waktuMasuk: string;
  waktuKeluar?: string | null;
  durasiMenit?: number;
  statusPenempatan: StatusPenempatanUnit;
  alasan?: string | null;
  catatan?: string | null;
  diprosesOlehId?: number | null;
}

export interface PendaftaranItem {
  id: number;
  noRegistrasi: string;
  pasienId: number;
  pasien?: PendaftaranPasienSummary | null;
  tanggalKunjungan: string;
  waktuDaftar: string;
  jenisLayananAwal: JenisLayananPendaftaran;
  jenisLayananSaatIni: JenisLayananPendaftaran;
  unitSaatIniId: number;
  unitSaatIni?: PendaftaranUnitSummary | null;
  dokterSaatIniId: number;
  dokterSaatIni?: PendaftaranDokterSummary | null;
  jadwalDokterSaatIniId?: number | null;
  jadwalDokterSaatIni?: PendaftaranJadwalSummary | null;
  kelasSaatIniId?: number | null;
  kelasSaatIni?: PendaftaranKelasSummary | null;
  bedSaatIniId?: number | null;
  bedSaatIni?: PendaftaranBedSummary | null;
  noAntreanSaatIni?: number | null;
  kodeAntreanSaatIni?: string | null;
  caraMasuk: CaraMasukPasien;
  asalRujukan?: string | null;
  keluhanUtama?: string | null;
  jenisPenjamin: JenisPenjamin;
  penjaminId?: number | null;
  penjamin?: PendaftaranPenjaminSummary | null;
  pasienPenjaminId?: number | null;
  pasienPenjamin?: PasienPenjaminItem | null;
  namaPenjaminSnapshot: string;
  noKartuSnapshot?: string | null;
  kelasHakIdSnapshot?: number | null;
  kelasHakSnapshot?: PendaftaranKelasSummary | null;
  noSep?: string | null;
  noRujukan?: string | null;
  statusKunjungan: StatusKunjungan;
  waktuKeluar?: string | null;
  caraKeluar?: CaraKeluarPasien | null;
  alasanBatal?: string | null;
  catatan?: string | null;
  ihsEncounterId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  historyUnit?: PendaftaranUnitHistoryItem[];
  penjaminList?: PendaftaranPenjaminItem[];
}

export interface CreatePendaftaranPayload {
  pasienId?: number;
  pasienBaru?: CreatePasienPayload;
  tanggalKunjungan?: string;
  unitId: number;
  jadwalDokterId?: number;
  dokterId?: number;
  bedId?: number;
  jenisPenjamin?: JenisPenjamin;
  penjaminId?: number;
  pasienPenjaminId?: number;
  noKartu?: string;
  kelasHakId?: number;
  faskesPerujuk?: string;
  berlakuSampai?: string;
  simpanKeProfilPasien?: boolean;
  noSep?: string;
  noRujukan?: string;
  penjaminList?: CreatePendaftaranPenjaminItemPayload[];
  caraMasuk?: CaraMasukPasien;
  asalRujukan?: string;
  keluhanUtama?: string;
  catatan?: string;
  ihsEncounterId?: string;
}

export interface MutasiPendaftaranPayload {
  unitTujuanId: number;
  jadwalDokterId?: number;
  dokterTujuanId?: number;
  bedTujuanId?: number;
  tanggalMutasi?: string;
  alasan?: string;
  catatan?: string;
}

export interface SelesaiPendaftaranPayload {
  caraKeluar?: CaraKeluarPasien;
  waktuKeluar?: string;
  catatan?: string;
}

export interface BatalPendaftaranPayload {
  alasan: string;
  catatan?: string;
}

export interface BatalRanapPayload {
  alasan: string;
  catatan?: string;
}

export type PendaftaranSortField =
  | "id"
  | "noRegistrasi"
  | "tanggalKunjungan"
  | "waktuDaftar"
  | "createdAt";

export interface QueryPendaftaranParams {
  page?: number;
  limit?: number;
  search?: string;
  tanggalDari?: string;
  tanggalSampai?: string;
  jenisLayanan?: JenisLayananPendaftaran | "";
  unitId?: number;
  dokterId?: number;
  penjaminId?: number;
  jenisPenjamin?: JenisPenjamin | "";
  statusKunjungan?: StatusKunjungan | "";
  aktifSaja?: boolean | "";
  sortBy?: PendaftaranSortField;
  sortType?: "ASC" | "DESC";
}

export interface QueryJadwalTersediaPendaftaranParams {
  tanggal?: string;
  unitId?: number;
  dokterId?: number;
  sesi?: SesiPraktik | "";
  jenisPenjamin?: JenisPenjamin | "";
  search?: string;
}
