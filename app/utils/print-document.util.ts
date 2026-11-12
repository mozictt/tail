import { useApi } from "@/composables/useApi";
import type { CompanyProfile } from "@/services/company-profile.service";

export interface PrintClinicHeader {
  facilityName: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  printedBy?: string;
  logoUrl?: string;
}

const CODE39_PATTERNS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100",
};

const logoDataUrlCache = new Map<string, string>();

/**
 * Meng-escape HTML secara ketat untuk mencegah injeksi markup/XSS di dokumen cetak.
 */
export const escapePrintHtml = (
  value: string | number | null | undefined,
): string => {
  const raw = value === null || value === undefined ? "" : String(value);
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const formatPrintDate = (value?: string | Date | null): string => {
  if (!value) return "-";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export const formatPrintDateTime = (value?: string | Date | null): string => {
  if (!value) return "-";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

export const resolvePrintClinicHeader = (
  profile: CompanyProfile | null | undefined,
  username?: string | null,
  logoUrl?: string,
): PrintClinicHeader => ({
  facilityName:
    profile?.name || profile?.shortName || "Fasilitas Pelayanan Kesehatan",
  address: profile?.address || "",
  phone: profile?.phone || "",
  email: profile?.email || "",
  website: profile?.website || "",
  printedBy: username || "",
  logoUrl,
});

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Konversi logo ke Data URL gagal"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Gagal membaca blob logo"));
    reader.readAsDataURL(blob);
  });

/**
 * Mengambil logo fasilitas terautentikasi dan mengubahnya menjadi data URL
 * agar tampil konsisten di iframe/jendela cetak maupun Save as PDF.
 */
export const fetchPrintClinicLogoDataUrl = async (
  profile: CompanyProfile | null | undefined,
): Promise<string | undefined> => {
  if (typeof window === "undefined" || !profile) return undefined;

  if (
    profile.logoPath &&
    (profile.logoPath.startsWith("http://") ||
      profile.logoPath.startsWith("https://"))
  ) {
    return profile.logoPath;
  }

  let filename = profile.logoFilename || "";
  if (!filename && profile.logoPath) {
    filename = profile.logoPath.replace(/^\/?company-profile\/logo\//, "");
  }
  filename = filename.replace(/^\/+/, "").trim();
  if (!filename) return undefined;

  const cached = logoDataUrlCache.get(filename);
  if (cached) return cached;

  try {
    const api = useApi();
    const blob = (await api(`/company-profile/logo/${filename}`, {
      responseType: "blob",
    })) as Blob;
    if (!blob || blob.size === 0) return undefined;
    const dataUrl = await blobToDataUrl(blob);
    logoDataUrlCache.set(filename, dataUrl);
    return dataUrl;
  } catch {
    return undefined;
  }
};

/**
 * Menyusun header cetak klinik sekaligus memuat logo tenant terautentikasi bila tersedia.
 */
export const resolvePrintClinicHeaderWithLogo = async (
  profile: CompanyProfile | null | undefined,
  username?: string | null,
): Promise<PrintClinicHeader> => {
  const logoUrl = await fetchPrintClinicLogoDataUrl(profile);
  return resolvePrintClinicHeader(profile, username, logoUrl);
};

/**
 * Menghasilkan SVG barcode Code 39 murni secara offline (tanpa CDN)
 * untuk nomor akses/order laboratorium pada cetakan LIS.
 */
export const buildCode39SvgBarcode = (
  rawText: string,
  height = 34,
): string => {
  const sanitized = rawText
    .toUpperCase()
    .replace(/[^0-9A-Z\-. $/+%]/g, "")
    .trim();
  if (!sanitized) return "";

  const encoded = `*${sanitized}*`;
  const narrow = 1.25;
  const wide = 3.1;
  const gap = 1.25;

  let cursorX = 0;
  const bars: string[] = [];

  for (let charIdx = 0; charIdx < encoded.length; charIdx += 1) {
    const ch = encoded.charAt(charIdx);
    const pattern = CODE39_PATTERNS[ch];
    if (!pattern) continue;

    for (let i = 0; i < pattern.length; i += 1) {
      const width = pattern[i] === "1" ? wide : narrow;
      if (i % 2 === 0) {
        bars.push(
          `<rect x="${cursorX.toFixed(2)}" y="0" width="${width.toFixed(2)}" height="${height}" fill="#0f172a" />`,
        );
      }
      cursorX += width;
    }

    if (charIdx < encoded.length - 1) {
      cursorX += gap;
    }
  }

  const totalWidth = Math.max(1, Number(cursorX.toFixed(2)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Barcode ${escapePrintHtml(sanitized)}">${bars.join("")}</svg>`;
};

/**
 * Mencetak dokumen HTML terisolasi melalui hidden iframe dengan fallback pop-up window.
 */
export const printHtmlDocument = (html: string): boolean => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    cleanup();
    const popup = window.open("", "_blank", "width=880,height=700");
    if (!popup) return false;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
    return true;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    setTimeout(cleanup, 30000);
  }, 150);

  return true;
};
