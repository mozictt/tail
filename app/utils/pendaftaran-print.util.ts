import { getVisitPenjaminList } from "@/utils/pendaftaran-penjamin.util";
import {
  escapePrintHtml as escapeHtml,
  formatPrintDate as formatDisplayDate,
  formatPrintDateTime as formatDisplayDateTime,
  printHtmlDocument,
  type PrintClinicHeader,
} from "@/utils/print-document.util";
import {
  calculateAgeLabel,
  CARA_MASUK_PASIEN_OPTIONS,
  formatNamaGelarDokter,
  getOptionLabel,
  HUBUNGAN_PJ_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
  JENIS_PENJAMIN_OPTIONS,
  SESI_PRAKTIK_OPTIONS,
  type PendaftaranItem,
} from "@/types/simrs";

const resolveDokterLabel = (visit: PendaftaranItem): string => {
  const d = visit.dokterSaatIni;
  if (!d) return "-";
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter ||
    "-"
  );
};

/**
 * Mencetak Karcis / Nomor Antrean Poliklinik (format thermal 80mm / ringkas).
 */
export const printNomorAntreanVisit = (
  visit: PendaftaranItem,
  header: PrintClinicHeader,
): boolean => {
  const queueCode =
    visit.kodeAntreanSaatIni ||
    (visit.noAntreanSaatIni !== undefined && visit.noAntreanSaatIni !== null
      ? String(visit.noAntreanSaatIni).padStart(3, "0")
      : "-");
  const penjaminList = getVisitPenjaminList(visit);
  const primaryPenjamin = penjaminList[0]?.namaPenjaminSnapshot || visit.namaPenjaminSnapshot;
  const jadwal = visit.jadwalDokterSaatIni;
  const jadwalText = jadwal
    ? `${jadwal.hari}, ${jadwal.jamMulai} - ${jadwal.jamSelesai}${jadwal.sesi ? ` (${getOptionLabel(SESI_PRAKTIK_OPTIONS, jadwal.sesi)})` : ""}`
    : "-";
  const nowStr = formatDisplayDateTime(new Date());

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Nomor Antrean - ${escapeHtml(queueCode)}</title>
  <style>
    @page { size: 80mm auto; margin: 5mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 4px;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      width: 70mm;
      max-width: 100%;
    }
    .header {
      text-align: center;
      border-bottom: 1.5px dashed #334155;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .facility { font-size: 13px; font-weight: 800; text-transform: uppercase; line-height: 1.25; }
    .sub-facility { font-size: 10px; color: #475569; margin-top: 2px; line-height: 1.3; }
    .ticket-title {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #334155;
    }
    .queue-box {
      text-align: center;
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 10px 6px;
      margin: 6px 0 10px;
    }
    .queue-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 0.04em;
      line-height: 1.1;
    }
    .unit-name { font-size: 13px; font-weight: 800; margin-top: 4px; }
    .meta-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .meta-table td { padding: 2.5px 0; vertical-align: top; }
    .meta-table td.label { color: #475569; width: 38%; }
    .meta-table td.val { font-weight: 700; text-align: right; word-break: break-word; }
    .footer {
      border-top: 1.5px dashed #334155;
      margin-top: 10px;
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
      color: #475569;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="facility">${escapeHtml(header.facilityName)}</div>
    ${header.address ? `<div class="sub-facility">${escapeHtml(header.address)}</div>` : ""}
    ${header.phone ? `<div class="sub-facility">Telp: ${escapeHtml(header.phone)}</div>` : ""}
  </div>

  <div class="ticket-title">Nomor Antrean Kunjungan</div>
  <div class="queue-box">
    <div class="queue-code">${escapeHtml(queueCode)}</div>
    <div class="unit-name">${escapeHtml(visit.unitSaatIni?.nama || "-")}</div>
  </div>

  <table class="meta-table">
    <tr><td class="label">No. Registrasi</td><td class="val">${escapeHtml(visit.noRegistrasi)}</td></tr>
    <tr><td class="label">No. RM</td><td class="val">${escapeHtml(visit.pasien?.noRm || "-")}</td></tr>
    <tr><td class="label">Nama Pasien</td><td class="val">${escapeHtml(visit.pasien?.penduduk?.namaLengkap || "-")}</td></tr>
    <tr><td class="label">Tanggal</td><td class="val">${escapeHtml(formatDisplayDate(visit.tanggalKunjungan))}</td></tr>
    <tr><td class="label">Dokter</td><td class="val">${escapeHtml(resolveDokterLabel(visit))}</td></tr>
    <tr><td class="label">Jadwal</td><td class="val">${escapeHtml(jadwalText)}</td></tr>
    ${jadwal?.ruangan ? `<tr><td class="label">Ruangan</td><td class="val">${escapeHtml(jadwal.ruangan)}</td></tr>` : ""}
    <tr><td class="label">Penjamin</td><td class="val">${escapeHtml(primaryPenjamin)}${penjaminList.length > 1 ? ` (+${penjaminList.length - 1} COB)` : ""}</td></tr>
  </table>

  <div class="footer">
    Mohon menunggu hingga nomor antrean Anda dipanggil.<br />
    Dicetak: ${escapeHtml(nowStr)}
  </div>
</body>
</html>`;

  return printHtmlDocument(html);
};

/**
 * Mencetak Slip / Bukti Pendaftaran Kunjungan lengkap (A5 / A4).
 */
export const printSlipPendaftaranVisit = (
  visit: PendaftaranItem,
  header: PrintClinicHeader,
): boolean => {
  const penduduk = visit.pasien?.penduduk;
  const penjaminList = getVisitPenjaminList(visit);
  const layananLabel = getOptionLabel(
    JENIS_LAYANAN_PENDAFTARAN_OPTIONS,
    visit.jenisLayananSaatIni,
  );
  const caraMasukLabel = getOptionLabel(
    CARA_MASUK_PASIEN_OPTIONS,
    visit.caraMasuk,
  );
  const jkLabel = getOptionLabel(JENIS_KELAMIN_OPTIONS, penduduk?.jenisKelamin);
  const umurLabel = penduduk?.tanggalLahir
    ? calculateAgeLabel(penduduk.tanggalLahir)
    : "-";
  const ttlText = penduduk?.tanggalLahir
    ? `${penduduk.tempatLahir ? `${penduduk.tempatLahir}, ` : ""}${formatDisplayDate(penduduk.tanggalLahir)} (${umurLabel})`
    : penduduk?.tempatLahir || "-";
  const alamatDomisiliText =
    visit.pasien?.alamatSamaKtp === false && visit.pasien?.alamatDomisili
      ? visit.pasien.alamatDomisili
      : penduduk?.alamatKtp || "-";
  const pjText = visit.pasien?.namaPj
    ? `${visit.pasien.namaPj}${visit.pasien.hubunganPj ? ` (${getOptionLabel(HUBUNGAN_PJ_OPTIONS, visit.pasien.hubunganPj)})` : ""}${visit.pasien.noHpPj ? ` • ${visit.pasien.noHpPj}` : ""}`
    : "-";

  const jadwal = visit.jadwalDokterSaatIni;
  const jadwalLabel = jadwal
    ? `${jadwal.hari}, ${jadwal.jamMulai} - ${jadwal.jamSelesai}${jadwal.ruangan ? ` • Ruang ${jadwal.ruangan}` : ""}`
    : "-";
  const bedLabel = visit.bedSaatIni
    ? `${visit.bedSaatIni.kode} — ${visit.bedSaatIni.nama}${visit.kelasSaatIni ? ` (${visit.kelasSaatIni.nama})` : ""}`
    : "-";

  const penjaminRowsHtml = penjaminList
    .map((pj) => {
      const jenisLabel = getOptionLabel(JENIS_PENJAMIN_OPTIONS, pj.jenisPenjamin);
      const roleLabel = pj.isUtama ? `#${pj.urutan} Utama` : `#${pj.urutan} COB`;
      return `
        <tr>
          <td><strong>${escapeHtml(roleLabel)}</strong></td>
          <td>${escapeHtml(pj.namaPenjaminSnapshot)} <span class="muted">(${escapeHtml(jenisLabel)})</span></td>
          <td class="mono">${escapeHtml(pj.noKartuSnapshot || "-")}</td>
          <td>${escapeHtml(pj.kelasHakSnapshot?.nama || "-")}</td>
          <td class="mono">${escapeHtml(pj.noSep || "-")}</td>
          <td>${escapeHtml(pj.keterangan || "-")}</td>
        </tr>
      `;
    })
    .join("");

  const nowStr = formatDisplayDateTime(new Date());

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Slip Pendaftaran - ${escapeHtml(visit.noRegistrasi)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.45;
    }
    .kop {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .kop-title { font-size: 16px; font-weight: 800; text-transform: uppercase; }
    .kop-sub { font-size: 11px; color: #475569; margin-top: 2px; }
    .doc-badge {
      text-align: right;
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 6px 12px;
      min-width: 170px;
    }
    .doc-badge .doc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; font-weight: 700; }
    .doc-badge .reg-no { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 14px; font-weight: 800; margin-top: 2px; }
    .doc-badge .queue-pill {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 12px;
      font-weight: 800;
    }
    .section {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
    }
    .field { display: flex; gap: 6px; }
    .field .lbl { width: 130px; flex-shrink: 0; color: #475569; }
    .field .val { font-weight: 600; word-break: break-word; }
    .mono { font-family: ui-monospace, SFMono-Regular, monospace; }
    .muted { color: #64748b; font-size: 11px; }
    table.penjamin {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 4px;
    }
    table.penjamin th, table.penjamin td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      text-align: left;
      vertical-align: top;
    }
    table.penjamin th { background: #f8fafc; font-weight: 700; color: #334155; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 22px;
      text-align: center;
      font-size: 11px;
    }
    .sig-line {
      margin-top: 48px;
      border-top: 1px solid #64748b;
      display: inline-block;
      min-width: 180px;
      padding-top: 4px;
      font-weight: 600;
    }
    .print-foot {
      margin-top: 14px;
      font-size: 10px;
      color: #64748b;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="kop">
    <div>
      <div class="kop-title">${escapeHtml(header.facilityName)}</div>
      ${header.address ? `<div class="kop-sub">${escapeHtml(header.address)}</div>` : ""}
      ${header.phone ? `<div class="kop-sub">Telp: ${escapeHtml(header.phone)}</div>` : ""}
    </div>
    <div class="doc-badge">
      <div class="doc-label">Slip Bukti Pendaftaran</div>
      <div class="reg-no">${escapeHtml(visit.noRegistrasi)}</div>
      ${visit.kodeAntreanSaatIni ? `<div class="queue-pill">Antrean: ${escapeHtml(visit.kodeAntreanSaatIni)}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. Informasi Pasien Terdaftar</div>
    <div class="grid">
      <div class="field"><span class="lbl">No. Rekam Medis</span><span class="val mono">${escapeHtml(visit.pasien?.noRm || "-")}</span></div>
      <div class="field"><span class="lbl">No. Identitas (NIK)</span><span class="val mono">${escapeHtml(penduduk?.nik || penduduk?.noIdentitasLain || "-")}</span></div>
      <div class="field"><span class="lbl">Nama Lengkap</span><span class="val">${escapeHtml(penduduk?.namaLengkap || "-")}</span></div>
      <div class="field"><span class="lbl">Jenis Kelamin</span><span class="val">${escapeHtml(jkLabel)}</span></div>
      <div class="field"><span class="lbl">Tempat / Tgl. Lahir</span><span class="val">${escapeHtml(ttlText)}</span></div>
      <div class="field"><span class="lbl">No. Telepon / HP</span><span class="val">${escapeHtml(penduduk?.noTelepon || "-")}</span></div>
      <div class="field" style="grid-column: span 2;"><span class="lbl">Alamat</span><span class="val">${escapeHtml(alamatDomisiliText)}</span></div>
      <div class="field" style="grid-column: span 2;"><span class="lbl">Penanggung Jawab</span><span class="val">${escapeHtml(pjText)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. Informasi Kunjungan &amp; Pelayanan</div>
    <div class="grid">
      <div class="field"><span class="lbl">Tanggal Kunjungan</span><span class="val">${escapeHtml(formatDisplayDate(visit.tanggalKunjungan))}</span></div>
      <div class="field"><span class="lbl">Waktu Registrasi</span><span class="val">${escapeHtml(formatDisplayDateTime(visit.waktuDaftar))}</span></div>
      <div class="field"><span class="lbl">Jenis Layanan</span><span class="val">${escapeHtml(layananLabel)}</span></div>
      <div class="field"><span class="lbl">Unit Pelayanan</span><span class="val">${escapeHtml(visit.unitSaatIni ? `${visit.unitSaatIni.kode} — ${visit.unitSaatIni.nama}` : "-")}</span></div>
      <div class="field"><span class="lbl">Dokter / DPJP</span><span class="val">${escapeHtml(resolveDokterLabel(visit))}</span></div>
      <div class="field"><span class="lbl">Jadwal Praktik</span><span class="val">${escapeHtml(jadwalLabel)}</span></div>
      <div class="field"><span class="lbl">Bed / Kelas</span><span class="val">${escapeHtml(bedLabel)}</span></div>
      <div class="field"><span class="lbl">Cara Masuk</span><span class="val">${escapeHtml(caraMasukLabel)}${visit.asalRujukan ? ` (${escapeHtml(visit.asalRujukan)})` : ""}</span></div>
      <div class="field" style="grid-column: span 2;"><span class="lbl">Keluhan Utama</span><span class="val">${escapeHtml(visit.keluhanUtama || "-")}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">3. Cara Bayar / Penjamin Kunjungan (${penjaminList.length})</div>
    <table class="penjamin">
      <thead>
        <tr>
          <th>Urutan</th>
          <th>Penjamin</th>
          <th>No. Kartu / Polis</th>
          <th>Kelas Hak</th>
          <th>No. SEP / Jaminan</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>${penjaminRowsHtml}</tbody>
    </table>
  </div>

  <div class="signatures">
    <div>
      <div>Pasien / Penanggung Jawab</div>
      <div class="sig-line">${escapeHtml(penduduk?.namaLengkap || "..............................")}</div>
    </div>
    <div>
      <div>Petugas Pendaftaran / Admisi</div>
      <div class="sig-line">${escapeHtml(header.printedBy || "..............................")}</div>
    </div>
  </div>

  <div class="print-foot">Dicetak pada ${escapeHtml(nowStr)}</div>
</body>
</html>`;

  return printHtmlDocument(html);
};

