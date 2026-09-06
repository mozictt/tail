export const useDate = () => {
  /**
   * Format tanggal sederhana (cth: "15 Jul 2025")
   */
  const formatDate = (dateStr?: string | Date | null): string => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /**
   * Format tanggal lengkap dengan jam (cth: "15 Jul 2025 14:30")
   */
  const formatDateTime = (dateStr?: string | Date | null): string => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Menghitung sisa hari kadaluarsa (kembali null jika tidak ada expiredAt)
   */
  const getDaysRemaining = (expiredAtStr?: string | Date | null): number | null => {
    if (!expiredAtStr) return null;
    const expiredDate = new Date(expiredAtStr);
    if (isNaN(expiredDate.getTime())) return null;

    const now = new Date();
    const diffTime = expiredDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Cek apakah tanggal sudah lewat (kadaluarsa)
   */
  const isExpired = (expiredAtStr?: string | Date | null): boolean => {
    const days = getDaysRemaining(expiredAtStr);
    return days !== null && days < 0;
  };

  /**
   * Cek apakah tanggal akan kadaluarsa dalam kurun waktu warningDays (default 7 hari)
   */
  const isExpiringSoon = (expiredAtStr?: string | Date | null, warningDays = 7): boolean => {
    const days = getDaysRemaining(expiredAtStr);
    return days !== null && days >= 0 && days <= warningDays;
  };

  /**
   * Format teks relatif sisa hari (cth: "5 hari lagi", "Sudah lewat 2 hari")
   */
  const formatRelativeTime = (dateStr?: string | Date | null): string => {
    if (!dateStr) return "-";
    const days = getDaysRemaining(dateStr);
    if (days === null) return "-";

    if (days < 0) return `Sudah lewat ${Math.abs(days)} hari`;
    if (days === 0) return "Hari ini";
    if (days === 1) return "Besok (1 hari lagi)";
    return `${days} hari lagi`;
  };

  /**
   * Format tanggal untuk nilai default pada input type="date" (YYYY-MM-DD)
   */
  const formatDateForInput = (dateStr?: string | Date | null): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  /**
   * Menambahkan sejumlah hari ke tanggal awal
   */
  const addDays = (baseDateInput?: string | Date | null, days = 0): Date => {
    let baseDate = baseDateInput ? new Date(baseDateInput) : new Date();
    if (isNaN(baseDate.getTime()) || baseDate < new Date()) {
      baseDate = new Date();
    }
    const result = new Date(baseDate);
    result.setDate(result.getDate() + days);
    return result;
  };

  return {
    formatDate,
    formatDateTime,
    formatRelativeTime,
    getDaysRemaining,
    isExpired,
    isExpiringSoon,
    formatDateForInput,
    addDays,
  };
};
