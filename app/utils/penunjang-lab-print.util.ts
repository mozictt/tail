import {
  buildCode39SvgBarcode,
  escapePrintHtml as escapeHtml,
  formatPrintDate as formatDisplayDate,
  formatPrintDateTime as formatDisplayDateTime,
  printHtmlDocument,
  type PrintClinicHeader,
} from "@/utils/print-document.util";
import {
  calculateAgeLabel,
  FlagHasilLab,
  getOptionLabel,
  JENIS_KELAMIN_OPTIONS,
  JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
  STATUS_PENUNJANG_LAB_OPTIONS,
  StatusPenunjangLab,
  type PenunjangLabHasilDetail,
  type PenunjangLabItemDetail,
  type PenunjangLabOrderItem,
} from "@/types/simrs";

export interface PenunjangLabHierarchyGroup {
  golongan: string;
  panels: Array<{
    item: PenunjangLabItemDetail;
    rows: PenunjangLabHasilDetail[];
    isStandalone: boolean;
  }>;
}

export interface PrintPenunjangLabOptions {
  paperSize?: "A4" | "A5";
  includeBarcode?: boolean;
}

interface LisFlagDisplay {
  code: string;
  label: string;
  rowClass: string;
  flagClass: string;
  valueClass: string;
}

const resolveLisFlagDisplay = (
  flag?: FlagHasilLab | string | null,
  isKritis?: boolean,
): LisFlagDisplay => {
  if (flag === FlagHasilLab.CRITICAL_HIGH) {
    return {
      code: "HH",
      label: "Kritis Tinggi",
      rowClass: "row-critical",
      flagClass: "flag-critical",
      valueClass: "val-critical",
    };
  }
  if (flag === FlagHasilLab.CRITICAL_LOW) {
    return {
      code: "LL",
      label: "Kritis Rendah",
      rowClass: "row-critical",
      flagClass: "flag-critical",
      valueClass: "val-critical",
    };
  }
  if (flag === FlagHasilLab.HIGH) {
    return {
      code: "H",
      label: "Tinggi",
      rowClass: "row-abnormal",
      flagClass: "flag-high",
      valueClass: "val-abnormal",
    };
  }
  if (flag === FlagHasilLab.LOW) {
    return {
      code: "L",
      label: "Rendah",
      rowClass: "row-abnormal",
      flagClass: "flag-low",
      valueClass: "val-abnormal",
    };
  }
  if (flag === FlagHasilLab.ABNORMAL || isKritis) {
    return {
      code: isKritis ? "!!" : "A",
      label: isKritis ? "Kritis" : "Abnormal",
      rowClass: isKritis ? "row-critical" : "row-abnormal",
      flagClass: isKritis ? "flag-critical" : "flag-high",
      valueClass: isKritis ? "val-critical" : "val-abnormal",
    };
  }
  return {
    code: "",
    label: flag === FlagHasilLab.NORMAL ? "Normal" : "-",
    rowClass: "",
    flagClass: "flag-normal",
    valueClass: "val-normal",
  };
};

/**
 * Menghasilkan indikator visual posisi hasil terhadap rentang rujukan ala mesin LIS/PACS.
 */
const buildRangeIndicatorSvg = (row: PenunjangLabHasilDetail): string => {
  const value = row.hasilAngka;
  const min = row.nilaiRujukanMinSnapshot;
  const max = row.nilaiRujukanMaxSnapshot;

  if (
    value === null ||
    value === undefined ||
    min === null ||
    min === undefined ||
    max === null ||
    max === undefined ||
    !Number.isFinite(value) ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max <= min
  ) {
    return "";
  }

  // Petakan rentang [min, max] ke segmen tengah [22%, 78%] agar nilai di bawah/atas tetap terlihat
  const span = max - min;
  const ratio = (value - min) / span;
  const rawPct = 22 + ratio * 56;
  const dotPct = Math.max(6, Math.min(94, rawPct));
  const isOutOfRange = value < min || value > max;
  const dotColor = row.isKritis
    ? "#991b1b"
    : isOutOfRange
      ? "#b45309"
      : "#0f172a";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 12" width="54" height="10" class="range-svg" aria-hidden="true">
      <line x1="2" y1="6" x2="62" y2="6" stroke="#cbd5e1" stroke-width="1.4" />
      <rect x="14" y="3.5" width="36" height="5" fill="#e2e8f0" rx="1" />
      <line x1="14" y1="2" x2="14" y2="10" stroke="#64748b" stroke-width="1" />
      <line x1="50" y1="2" x2="50" y2="10" stroke="#64748b" stroke-width="1" />
      <circle cx="${((dotPct / 100) * 64).toFixed(1)}" cy="6" r="2.7" fill="${dotColor}" />
    </svg>
  `;
};

const formatRujukanDisplay = (row: PenunjangLabHasilDetail): string => {
  if (row.nilaiNormalTextSnapshot?.trim()) {
    return row.nilaiNormalTextSnapshot.trim();
  }
  const hasMin =
    row.nilaiRujukanMinSnapshot !== null &&
    row.nilaiRujukanMinSnapshot !== undefined;
  const hasMax =
    row.nilaiRujukanMaxSnapshot !== null &&
    row.nilaiRujukanMaxSnapshot !== undefined;
  if (hasMin && hasMax) {
    return `${row.nilaiRujukanMinSnapshot} - ${row.nilaiRujukanMaxSnapshot}`;
  }
  if (hasMin) return `>= ${row.nilaiRujukanMinSnapshot}`;
  if (hasMax) return `<= ${row.nilaiRujukanMaxSnapshot}`;
  return "-";
};

const resolvePatientAddress = (order: PenunjangLabOrderItem): string => {
  const pasien = order.pasien;
  const penduduk = pasien?.penduduk;
  if (pasien?.alamatSamaKtp === false && pasien.alamatDomisili) {
    return pasien.alamatDomisili;
  }
  return penduduk?.alamatKtp || "-";
};

const resolvePanelGolongan = (
  panel: PenunjangLabItemDetail,
  rows: PenunjangLabHasilDetail[],
): string => {
  const fromPanel = panel.kelompokTarifSnapshot?.trim();
  if (fromPanel) return fromPanel.toUpperCase();

  for (const row of rows) {
    const fromParam = row.grupSnapshot?.trim();
    if (fromParam) return fromParam.toUpperCase();
  }

  return "PEMERIKSAAN LABORATORIUM";
};

/**
 * Mengelompokkan hasil lab ke struktur 3 tingkat standar LIS:
 * Golongan (Bidang/Kategori) -> Induk (Tindakan/Panel) -> Detail Pemeriksaan (Parameter).
 */
export const groupPenunjangLabByHierarchy = (
  order: PenunjangLabOrderItem,
): PenunjangLabHierarchyGroup[] => {
  const items = order.items ?? [];
  const hasil = order.hasilList ?? [];
  const groupsMap = new Map<string, PenunjangLabHierarchyGroup>();

  for (const panel of items) {
    const rows = hasil.filter((h) => h.penunjangLabItemId === panel.id);
    const golongan = resolvePanelGolongan(panel, rows);
    const key = golongan.toLowerCase();

    let bucket = groupsMap.get(key);
    if (!bucket) {
      bucket = { golongan, panels: [] };
      groupsMap.set(key, bucket);
    }

    const firstRow = rows[0];
    const isStandalone =
      rows.length === 1 &&
      firstRow !== undefined &&
      (firstRow.parameterId === null ||
        firstRow.namaParameterSnapshot.trim().toLowerCase() ===
          panel.namaTindakanSnapshot.trim().toLowerCase());
    bucket.panels.push({ item: panel, rows, isStandalone });
  }

  return Array.from(groupsMap.values());
};

const renderSingleParamRowHtml = (
  row: PenunjangLabHasilDetail,
  golongan: string,
  isStandaloneRow: boolean,
): string => {
  const flagInfo = resolveLisFlagDisplay(row.flagAbnormal, row.isKritis);
  const rangeSvg = buildRangeIndicatorSvg(row);
  const noteParts: string[] = [];

  // Hanya tampilkan sub-label pada keterangan bila berbeda dengan golongan level 1
  const paramGrup = row.grupSnapshot?.trim();
  if (paramGrup && paramGrup.toUpperCase() !== golongan.toUpperCase()) {
    noteParts.push(paramGrup);
  }
  if (flagInfo.label !== "-" && flagInfo.label !== "Normal") {
    noteParts.push(flagInfo.label);
  }
  if (row.catatan?.trim()) {
    noteParts.push(row.catatan.trim());
  }

  const rowClass = isStandaloneRow
    ? `param-row standalone-row ${flagInfo.rowClass}`
    : `param-row ${flagInfo.rowClass}`;

  return `
    <tr class="${rowClass}">
      <td class="col-param">
        <div class="param-name">${escapeHtml(row.namaParameterSnapshot)}</div>
        <div class="param-code">${escapeHtml(row.kodeParameterSnapshot)}</div>
      </td>
      <td class="col-result">
        <span class="${flagInfo.valueClass}">${escapeHtml(row.hasilNilai || "-")}</span>
      </td>
      <td class="col-flag">
        ${
          flagInfo.code
            ? `<span class="flag-badge ${flagInfo.flagClass}">${escapeHtml(flagInfo.code)}</span>`
            : `<span class="flag-normal">-</span>`
        }
      </td>
      <td class="col-unit">${escapeHtml(row.satuanSnapshot || "-")}</td>
      <td class="col-ref">
        <div class="ref-wrap">
          <span>${escapeHtml(formatRujukanDisplay(row))}</span>
          ${rangeSvg}
        </div>
      </td>
      <td class="col-note">${escapeHtml(noteParts.join(" • ") || "-")}</td>
    </tr>
  `;
};

const renderResultRowsHtml = (order: PenunjangLabOrderItem): string => {
  const groups = groupPenunjangLabByHierarchy(order);

  if (groups.length === 0) {
    return `
      <tr>
        <td colspan="6" class="empty-cell">Belum ada item pemeriksaan laboratorium terdaftar.</td>
      </tr>
    `;
  }

  return groups
    .map((group) => {
      const golonganRow = `
        <tr class="golongan-row">
          <td colspan="6">${escapeHtml(group.golongan)}</td>
        </tr>
      `;

      const indukBlocksHtml = group.panels
        .map(({ item: panel, rows, isStandalone }) => {
          // Pemeriksaan tunggal tanpa anakan parameter tampil 1 baris langsung di bawah Golongan tanpa duplikasi baris Induk
          if (isStandalone && rows[0]) {
            return renderSingleParamRowHtml(rows[0], group.golongan, true);
          }

          const indukRow = `
            <tr class="induk-row">
              <td colspan="6">
                <span class="induk-title">${escapeHtml(panel.namaTindakanSnapshot)}</span>
                <span class="induk-code">[${escapeHtml(panel.kodeTindakanSnapshot)}]</span>
              </td>
            </tr>
          `;

          if (rows.length === 0) {
            return (
              indukRow +
              `<tr><td colspan="6" class="empty-cell">Belum ada parameter pemeriksaan pada tindakan ini.</td></tr>`
            );
          }

          const paramRowsHtml = rows
            .map((row) => renderSingleParamRowHtml(row, group.golongan, false))
            .join("");

          return indukRow + paramRowsHtml;
        })
        .join("");

      return golonganRow + indukBlocksHtml;
    })
    .join("");
};

/**
 * Menghasilkan dokumen HTML lembar hasil laboratorium berstandar LIS / PACS siap cetak.
 */
export const buildHasilPenunjangLabPrintHtml = (
  order: PenunjangLabOrderItem,
  header: PrintClinicHeader,
  options: PrintPenunjangLabOptions = {},
): string => {
  const paperSize = options.paperSize === "A5" ? "A5 portrait" : "A4 portrait";
  const includeBarcode = options.includeBarcode !== false;

  const penduduk = order.pasien?.penduduk;
  const pendaftaran = order.pendaftaran;
  const jkLabel = getOptionLabel(JENIS_KELAMIN_OPTIONS, penduduk?.jenisKelamin);
  const umurLabel = penduduk?.tanggalLahir
    ? calculateAgeLabel(penduduk.tanggalLahir)
    : "-";
  const tglLahirText = penduduk?.tanggalLahir
    ? `${formatDisplayDate(penduduk.tanggalLahir)} (${umurLabel})`
    : "-";
  const layananLabel = pendaftaran?.jenisLayananSaatIni
    ? getOptionLabel(
        JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
        pendaftaran.jenisLayananSaatIni,
      )
    : "";
  const unitAsalParts = [
    order.unitPengirim?.nama || pendaftaran?.unitSaatIni?.nama || "-",
    pendaftaran?.kelasSaatIni?.nama || layananLabel || "",
  ].filter(Boolean);

  const isVerified = order.statusLab === StatusPenunjangLab.TERVERIFIKASI;
  const isCancelled = order.statusLab === StatusPenunjangLab.BATAL;
  const statusLabel = getOptionLabel(
    STATUS_PENUNJANG_LAB_OPTIONS,
    order.statusLab,
  );

  const criticalRows = (order.hasilList ?? []).filter(
    (r) =>
      r.isKritis ||
      r.flagAbnormal === FlagHasilLab.CRITICAL_LOW ||
      r.flagAbnormal === FlagHasilLab.CRITICAL_HIGH,
  );

  const barcodeSvg = includeBarcode
    ? buildCode39SvgBarcode(order.noLab, 32)
    : "";
  const nowStr = formatDisplayDateTime(new Date());

  const analystName =
    order.petugasLab?.name || header.printedBy || "..............................";
  const analystNip = order.petugasLab?.nip
    ? `NIP. ${order.petugasLab.nip}`
    : "";
  const validatorDoctor =
    order.dokterLabNama || "..............................";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Hasil Lab LIS - ${escapeHtml(order.noLab)}</title>
  <style>
    @page { size: ${paperSize}; margin: 10mm 11mm 12mm 11mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: "Inter", "Segoe UI", Roboto, ui-sans-serif, system-ui, sans-serif;
      color: #0f172a;
      font-size: 10.5px;
      line-height: 1.38;
      background: #ffffff;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .lis-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .kop-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }
    .kop-logo {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 2px;
      flex-shrink: 0;
    }
    .kop-facility {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }
    .kop-dept {
      font-size: 10.5px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .kop-meta {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
      line-height: 1.3;
    }
    .accession-box {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 6px 10px;
      min-width: 195px;
      max-width: 230px;
      text-align: center;
      flex-shrink: 0;
    }
    .doc-title {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #334155;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .barcode-wrap {
      margin: 2px auto 3px;
      max-width: 180px;
    }
    .accession-no {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .badge-row {
      margin-top: 4px;
      display: flex;
      justify-content: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .pill {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 3px;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: 1px solid #334155;
    }
    .pill-final { background: #0f172a; color: #ffffff; border-color: #0f172a; }
    .pill-draft { background: #f8fafc; color: #334155; border-style: dashed; }
    .pill-cito { background: #991b1b; color: #ffffff; border-color: #991b1b; }
    .pill-batal { background: #fef2f2; color: #991b1b; border-color: #991b1b; }

    .banner-notice {
      padding: 5px 9px;
      border-radius: 5px;
      font-size: 9.5px;
      font-weight: 700;
      margin-bottom: 8px;
      border: 1px solid;
    }
    .banner-draft {
      background: #fffbeb;
      color: #78350f;
      border-color: #f59e0b;
    }
    .banner-critical {
      background: #fef2f2;
      color: #7f1d1d;
      border-color: #ef4444;
    }
    .banner-batal {
      background: #fef2f2;
      color: #991b1b;
      border-color: #dc2626;
    }

    .patient-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 9px;
      background: #fcfcfd;
    }
    .meta-col {
      display: flex;
      flex-direction: column;
      gap: 2.5px;
    }
    .meta-row {
      display: flex;
      align-items: baseline;
      gap: 5px;
      font-size: 10px;
    }
    .meta-lbl {
      width: 104px;
      flex-shrink: 0;
      color: #475569;
    }
    .meta-sep {
      color: #64748b;
      flex-shrink: 0;
    }
    .meta-val {
      font-weight: 600;
      color: #0f172a;
      word-break: break-word;
    }
    .meta-val-strong {
      font-weight: 800;
      font-size: 10.5px;
    }
    .meta-full {
      grid-column: span 2;
      border-top: 1px dashed #cbd5e1;
      padding-top: 4px;
      margin-top: 2px;
    }

    table.lis-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #94a3b8;
      font-size: 10px;
    }
    table.lis-table thead {
      display: table-header-group;
    }
    table.lis-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 7px;
      text-align: left;
      border-bottom: 1.5px solid #0f172a;
    }
    table.lis-table th.th-right,
    table.lis-table td.col-result {
      text-align: right;
    }
    table.lis-table th.th-center,
    table.lis-table td.col-flag {
      text-align: center;
    }
    tr.golongan-row td {
      background: #e2e8f0;
      border-top: 1.5px solid #64748b;
      border-bottom: 1px solid #94a3b8;
      padding: 5.5px 8px;
      font-weight: 900;
      font-size: 10.5px;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tr.induk-row td {
      background: #f8fafc;
      color: #1e293b;
      border-bottom: 1px solid #cbd5e1;
      padding: 4.5px 8px 4.5px 18px;
      font-weight: 800;
      font-size: 10px;
      letter-spacing: 0.02em;
    }
    .induk-code {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      margin-left: 4px;
    }
    tr.param-row td {
      padding: 4.5px 7px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr.param-row.row-abnormal td {
      background: #fffbeb;
    }
    tr.param-row.row-critical td {
      background: #fef2f2;
    }
    .col-param { width: 31%; padding-left: 28px !important; }
    tr.standalone-row .col-param { padding-left: 18px !important; }
    tr.standalone-row .param-name { font-weight: 700; }
    .param-name { font-weight: 600; color: #0f172a; }
    .param-code {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 8.5px;
      color: #64748b;
    }
    .col-result {
      width: 14%;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-variant-numeric: tabular-nums;
      font-size: 10.5px;
    }
    .val-normal { font-weight: 700; color: #0f172a; }
    .val-abnormal { font-weight: 800; color: #92400e; text-decoration: underline; }
    .val-critical { font-weight: 900; color: #991b1b; text-decoration: underline double; }
    .col-flag { width: 7%; }
    .flag-badge {
      display: inline-block;
      min-width: 22px;
      padding: 1px 4px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 9px;
      font-weight: 800;
      border: 1px solid;
    }
    .flag-high { background: #fef3c7; color: #92400e; border-color: #d97706; }
    .flag-low { background: #e0f2fe; color: #075985; border-color: #0284c7; }
    .flag-critical { background: #991b1b; color: #ffffff; border-color: #7f1d1d; }
    .flag-normal { color: #94a3b8; font-size: 9.5px; }
    .col-unit { width: 11%; color: #334155; font-size: 9.5px; }
    .col-ref { width: 23%; font-weight: 600; color: #1e293b; }
    .ref-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .range-svg { flex-shrink: 0; }
    .col-note { width: 14%; font-size: 9px; color: #475569; }
    .empty-cell {
      text-align: center;
      padding: 10px;
      color: #64748b;
      font-style: italic;
    }

    .notes-box {
      margin-top: 8px;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 9px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .notes-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #334155;
      margin-bottom: 2px;
    }
    .notes-body {
      font-size: 10px;
      white-space: pre-line;
      color: #0f172a;
    }
    .legend-line {
      margin-top: 7px;
      padding: 4px 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      font-size: 8.5px;
      color: #475569;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 14px;
      text-align: center;
      font-size: 10px;
      break-inside: avoid;
    }
    .sig-role { font-weight: 700; color: #334155; }
    .sig-time { font-size: 8.5px; color: #64748b; margin-top: 2px; }
    .sig-stamp {
      display: inline-block;
      margin: 12px auto 6px;
      padding: 4px 10px;
      border: 1.5px solid #047857;
      border-radius: 4px;
      color: #065f46;
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .sig-space { height: 40px; }
    .sig-name {
      display: inline-block;
      min-width: 190px;
      border-top: 1px solid #475569;
      padding-top: 3px;
      font-weight: 800;
      color: #0f172a;
    }
    .sig-sub { font-size: 8.5px; color: #475569; }

    .print-footer {
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px dashed #94a3b8;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 8.5px;
      color: #64748b;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <header class="lis-header">
    <div class="kop-left">
      ${
        header.logoUrl
          ? `<img src="${escapeHtml(header.logoUrl)}" alt="Logo" class="kop-logo" onerror="this.style.display='none'" />`
          : ""
      }
      <div>
        <div class="kop-facility">${escapeHtml(header.facilityName)}</div>
        <div class="kop-dept">Instalasi Laboratorium Klinik &amp; Penunjang Diagnostik</div>
        ${header.address ? `<div class="kop-meta">${escapeHtml(header.address)}</div>` : ""}
        <div class="kop-meta">
          ${[
            header.phone ? `Telp: ${header.phone}` : "",
            header.email ? `Email: ${header.email}` : "",
            header.website || "",
          ]
            .filter(Boolean)
            .map((v) => escapeHtml(v))
            .join(" • ")}
        </div>
      </div>
    </div>

    <div class="accession-box">
      <div class="doc-title">Laporan Hasil Laboratorium</div>
      ${barcodeSvg ? `<div class="barcode-wrap">${barcodeSvg}</div>` : ""}
      <div class="accession-no mono">${escapeHtml(order.noLab)}</div>
      <div class="badge-row">
        ${order.isCito ? `<span class="pill pill-cito">CITO / STAT</span>` : ""}
        <span class="pill ${
          isCancelled
            ? "pill-batal"
            : isVerified
              ? "pill-final"
              : "pill-draft"
        }">
          ${escapeHtml(isVerified ? "FINAL • TERVERIFIKASI" : statusLabel)}
        </span>
      </div>
    </div>
  </header>

  ${
    isCancelled
      ? `<div class="banner-notice banner-batal">DOKUMEN ORDER LAB DIBATALKAN${order.alasanBatal ? ` — Alasan: ${escapeHtml(order.alasanBatal)}` : ""}</div>`
      : !isVerified
        ? `<div class="banner-notice banner-draft">PRELIMINARY / DRAFT — Hasil pemeriksaan ini masih menunggu verifikasi akhir oleh Dokter Penanggung Jawab Laboratorium.</div>`
        : ""
  }

  ${
    criticalRows.length > 0
      ? `<div class="banner-notice banner-critical">PERHATIAN NILAI KRITIS (${criticalRows.length}): ${escapeHtml(
          criticalRows
            .map(
              (r) =>
                `${r.namaParameterSnapshot} = ${r.hasilNilai || "-"}${r.satuanSnapshot ? ` ${r.satuanSnapshot}` : ""}`,
            )
            .join(" | "),
        )}</div>`
      : ""
  }

  <section class="patient-grid">
    <div class="meta-col">
      <div class="meta-row"><span class="meta-lbl">No. Rekam Medis</span><span class="meta-sep">:</span><span class="meta-val meta-val-strong mono">${escapeHtml(order.pasien?.noRm || "-")}</span></div>
      <div class="meta-row"><span class="meta-lbl">Nama Pasien</span><span class="meta-sep">:</span><span class="meta-val meta-val-strong">${escapeHtml(penduduk?.namaLengkap || "-")}</span></div>
      <div class="meta-row"><span class="meta-lbl">Tgl. Lahir / Umur</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(tglLahirText)}</span></div>
      <div class="meta-row"><span class="meta-lbl">Jenis Kelamin</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(jkLabel)}</span></div>
      <div class="meta-row"><span class="meta-lbl">Alamat</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(resolvePatientAddress(order))}</span></div>
      <div class="meta-row"><span class="meta-lbl">Penjamin</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(pendaftaran?.namaPenjaminSnapshot || pendaftaran?.penjamin?.nama || "Umum")}</span></div>
    </div>

    <div class="meta-col">
      <div class="meta-row"><span class="meta-lbl">No. Laboratorium</span><span class="meta-sep">:</span><span class="meta-val mono">${escapeHtml(order.noLab)}</span></div>
      <div class="meta-row"><span class="meta-lbl">No. Registrasi</span><span class="meta-sep">:</span><span class="meta-val mono">${escapeHtml(pendaftaran?.noRegistrasi || "-")}</span></div>
      <div class="meta-row"><span class="meta-lbl">Unit Pengirim</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(unitAsalParts.join(" • ") || "-")}</span></div>
      <div class="meta-row"><span class="meta-lbl">Dokter Pengirim</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(order.dokterPengirimNama || "-")}</span></div>
      <div class="meta-row"><span class="meta-lbl">Dokter PJ Lab</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(validatorDoctor)}</span></div>
      <div class="meta-row"><span class="meta-lbl">Order / Sampel</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(formatDisplayDateTime(order.waktuOrder))} / ${escapeHtml(order.waktuSampelDiambil ? formatDisplayDateTime(order.waktuSampelDiambil) : "-")}</span></div>
      <div class="meta-row"><span class="meta-lbl">Selesai / Verifikasi</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(order.waktuHasilSelesai ? formatDisplayDateTime(order.waktuHasilSelesai) : "-")} / ${escapeHtml(order.waktuVerifikasi ? formatDisplayDateTime(order.waktuVerifikasi) : "-")}</span></div>
    </div>

    ${
      order.diagnosaKlinis
        ? `<div class="meta-row meta-full"><span class="meta-lbl">Diagnosa Klinis</span><span class="meta-sep">:</span><span class="meta-val">${escapeHtml(order.diagnosaKlinis)}</span></div>`
        : ""
    }
  </section>

  <table class="lis-table">
    <thead>
      <tr>
        <th>Pemeriksaan / Parameter</th>
        <th class="th-right">Hasil</th>
        <th class="th-center">Flag</th>
        <th>Satuan</th>
        <th>Nilai Rujukan</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${renderResultRowsHtml(order)}
    </tbody>
  </table>

  ${
    order.kesanLab?.trim()
      ? `<div class="notes-box"><div class="notes-title">Kesan / Ekspertise Laboratorium</div><div class="notes-body">${escapeHtml(order.kesanLab.trim())}</div></div>`
      : ""
  }

  ${
    order.catatanKlinis?.trim()
      ? `<div class="notes-box"><div class="notes-title">Catatan Klinis Permintaan</div><div class="notes-body">${escapeHtml(order.catatanKlinis.trim())}</div></div>`
      : ""
  }

  <div class="legend-line">
    <span><strong>Legenda Flag LIS:</strong> L = Rendah (Low) • H = Tinggi (High) • LL = Kritis Rendah • HH = Kritis Tinggi • A = Abnormal</span>
    <span>Grafik [ &nbsp;|&nbsp; ● &nbsp;|&nbsp; ] menunjukkan posisi nilai terhadap rentang normal</span>
  </div>

  <div class="signatures">
    <div>
      <div class="sig-role">Pemeriksa / Analis Laboratorium</div>
      ${order.waktuHasilSelesai ? `<div class="sig-time">Input Selesai: ${escapeHtml(formatDisplayDateTime(order.waktuHasilSelesai))}</div>` : `<div class="sig-time">&nbsp;</div>`}
      <div class="sig-space"></div>
      <div class="sig-name">${escapeHtml(analystName)}</div>
      ${analystNip ? `<div class="sig-sub mono">${escapeHtml(analystNip)}</div>` : ""}
    </div>

    <div>
      <div class="sig-role">Dokter Penanggung Jawab Laboratorium</div>
      ${
        isVerified && order.waktuVerifikasi
          ? `<div class="sig-time">Terverifikasi: ${escapeHtml(formatDisplayDateTime(order.waktuVerifikasi))}</div>
             <div><span class="sig-stamp">Tervalidasi Secara Elektronik</span></div>`
          : `<div class="sig-time">&nbsp;</div><div class="sig-space"></div>`
      }
      <div class="sig-name">${escapeHtml(validatorDoctor)}</div>
      ${order.unitLab?.nama ? `<div class="sig-sub">${escapeHtml(order.unitLab.nama)}</div>` : ""}
    </div>
  </div>

  <footer class="print-footer">
    <span>Hasil pemeriksaan ini hanya berlaku untuk sampel yang diperiksa dan harus diinterpretasikan bersama kondisi klinis pasien.</span>
    <span class="mono" style="white-space: nowrap;">Dicetak: ${escapeHtml(nowStr)}${header.printedBy ? ` oleh ${escapeHtml(header.printedBy)}` : ""}</span>
  </footer>
</body>
</html>`;
};

/**
 * Mencetak lembar hasil pemeriksaan laboratorium standar LIS/PACS.
 */
export const printHasilPenunjangLab = (
  order: PenunjangLabOrderItem,
  header: PrintClinicHeader,
  options: PrintPenunjangLabOptions = {},
): boolean => {
  const html = buildHasilPenunjangLabPrintHtml(order, header, options);
  return printHtmlDocument(html);
};

