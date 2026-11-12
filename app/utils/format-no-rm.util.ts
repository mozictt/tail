import { FormatNoRm, type TenantNoRmPresetKode } from "@/types/simrs";

export interface NoRmFormatPattern {
  jumlahDigit: number;
  prefix?: string | null;
  suffix?: string | null;
  panjangBlok?: number | null;
  pemisahBlok?: string | null;
}

export interface NoRmPresetOption {
  kode: Exclude<TenantNoRmPresetKode, "CUSTOM">;
  label: string;
  description: string;
  pattern: NoRmFormatPattern;
}

export const NO_RM_PRESET_OPTIONS: NoRmPresetOption[] = [
  {
    kode: "PLAIN_8",
    label: "8 Digit Standar",
    description: "Format standar rumah sakit 8 digit tanpa pemisah (00000001)",
    pattern: {
      jumlahDigit: 8,
      prefix: null,
      suffix: null,
      panjangBlok: null,
      pemisahBlok: null,
    },
  },
  {
    kode: "PLAIN_4",
    label: "4 Digit Ringkas",
    description: "Format ringkas 4 digit untuk klinik atau praktik dokter (0001)",
    pattern: {
      jumlahDigit: 4,
      prefix: null,
      suffix: null,
      panjangBlok: null,
      pemisahBlok: null,
    },
  },
  {
    kode: "DASH_6",
    label: "6 Digit Strip",
    description: "Format 6 digit terkelompok per 2 angka dengan strip (00-00-01)",
    pattern: {
      jumlahDigit: 6,
      prefix: null,
      suffix: null,
      panjangBlok: 2,
      pemisahBlok: "-",
    },
  },
];

export const LEGACY_FORMAT_NO_RM_PATTERNS: Record<FormatNoRm, NoRmFormatPattern> = {
  [FormatNoRm.PLAIN_8]: {
    jumlahDigit: 8,
    prefix: null,
    suffix: null,
    panjangBlok: null,
    pemisahBlok: null,
  },
  [FormatNoRm.DASH_6]: {
    jumlahDigit: 6,
    prefix: null,
    suffix: null,
    panjangBlok: 2,
    pemisahBlok: "-",
  },
};

/**
 * Memformat angka urutan counter menjadi Nomor RM sesuai pola setting tenant.
 */
export function formatNoRmFromConfig(
  seq: number,
  pattern: NoRmFormatPattern,
): string {
  const safeSeq = Math.max(0, Math.floor(Number.isFinite(seq) ? seq : 0));
  const digitsCount = Math.max(
    1,
    Math.min(12, Math.floor(Number(pattern.jumlahDigit) || 8)),
  );
  const rawDigits = String(safeSeq).padStart(digitsCount, "0");

  let formattedDigits = rawDigits;
  const blockSize =
    pattern.panjangBlok && Number(pattern.panjangBlok) >= 2
      ? Math.floor(Number(pattern.panjangBlok))
      : null;

  if (blockSize) {
    const separator = pattern.pemisahBlok?.trim() || "-";
    const remainder = rawDigits.length % blockSize;
    const padded =
      remainder === 0
        ? rawDigits
        : rawDigits.padStart(rawDigits.length + (blockSize - remainder), "0");

    const chunks: string[] = [];
    for (let i = 0; i < padded.length; i += blockSize) {
      chunks.push(padded.slice(i, i + blockSize));
    }
    formattedDigits = chunks.join(separator);
  }

  const prefix = pattern.prefix?.trim() ?? "";
  const suffix = pattern.suffix?.trim() ?? "";
  return `${prefix}${formattedDigits}${suffix}`;
}
