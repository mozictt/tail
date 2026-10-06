export const useCurrency = () => {
  /**
   * Format angka ke format Rupiah (cth: 50000 -> "Rp 50.000" atau "50.000" jika withPrefix: false)
   */
  const formatRupiah = (val?: number | string | null, withPrefix = true): string => {
    if (val === null || val === undefined || val === '') return withPrefix ? 'Rp 0' : '0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return withPrefix ? 'Rp 0' : '0';

    const formatted = new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0,
    }).format(num);

    return withPrefix ? `Rp ${formatted}` : formatted;
  };

  /**
   * Mengubah string format Rupiah (cth: "Rp 50.000" atau "50.000") kembali ke angka murni `number` (50000)
   */
  const parseRupiah = (str?: string | number | null): number => {
    if (typeof str === 'number') return isNaN(str) ? 0 : str;
    if (!str) return 0;
    const cleanStr = String(str).replace(/[^0-9]/g, '');
    return cleanStr ? parseInt(cleanStr, 10) : 0;
  };

  /**
   * Format angka input secara real-time saat diketik (misal: "50000" -> "50.000")
   */
  const formatInputRupiah = (str?: string | number | null): string => {
    const rawNumber = parseRupiah(str);
    if (!rawNumber) return '';
    return new Intl.NumberFormat('id-ID').format(rawNumber);
  };

  return {
    formatRupiah,
    parseRupiah,
    formatInputRupiah,
  };
};
