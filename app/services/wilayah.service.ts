import { useApi } from "@/composables/useApi";

export interface WilayahSearchResult {
  id: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  label: string;
}

export const WilayahService = () => {
  const api = useApi();

  /**
   * Cari data wilayah administratif secara global (kelurahan, kecamatan, kabupaten, provinsi)
   */
  const searchWilayah = async (q: string, limit: number = 100): Promise<WilayahSearchResult[]> => {
    try {
      if (!q || q.trim().length < 2) return [];
      const res: any = await api("/wilayah/search", {
        method: "GET",
        params: { q, limit },
      });
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      console.error("Gagal melakukan pencarian wilayah:", err);
      return [];
    }
  };

  /**
   * Dapatkan detail kelurahan berdasarkan ID (opsional jika dibutuhkan binding data awal)
   * Karena backend belum menyediakan endpoint spesifik `/wilayah/kelurahan/:id`, 
   * data kelurahan biasanya ter-eager load dari profile/pegawai secara langsung.
   */

  return {
    searchWilayah,
  };
};
