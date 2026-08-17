import { useApi } from "@/composables/useApi";
import { useRuntimeConfig } from "#imports";

/**
 * =========================
 * TYPES & INTERFACES
 * =========================
 */

export interface CompanyProfile {
  id?: number;
  name: string;
  shortName?: string | null;
  description?: string | null;
  email: string;
  phone: string;
  fax?: string | null;
  website?: string | null;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  npwp?: string | null;
  nib?: string | null;
  foundedAt?: string | null;
  logoPath?: string | null;
  logoFilename?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  idKelurahan?: string | null;
  kelurahan?: {
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
    };
  } | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CompanyProfileApiResponse {
  success: boolean;
  message: string;
  data: CompanyProfile;
}

/**
 * =========================
 * SERVICE IMPLEMENTATION
 * =========================
 */
export const CompanyProfileService = () => {
  const api = useApi();
  const config = useRuntimeConfig();

  /**
   * Helper untuk ekstraksi data respons secara aman
   */
  const handleResponse = (res: any) => {
    if (!res) throw new Error("Tidak ada respons dari server");
    return res;
  };

  /**
   * GET PROFIL PERUSAHAAN (Tenant Aktif)
   */
  const getProfile = async (): Promise<CompanyProfile | null> => {
    try {
      const res = await api("/company-profile");
      const parsed = handleResponse(res);
      return parsed.data || parsed;
    } catch (err: any) {
      // Jika 404, artinya profil belum dibuat untuk tenant ini
      if (err?.status === 404 || err?.response?.status === 404) {
        return null;
      }
      console.error("Gagal mengambil profil perusahaan:", err);
      throw err;
    }
  };

  /**
   * BUAT PROFIL PERUSAHAAN BARU
   */
  const createProfile = async (formData: FormData): Promise<CompanyProfile> => {
    try {
      const res = await api("/company-profile", {
        method: "POST",
        body: formData,
      });
      const parsed = handleResponse(res);
      return parsed.data || parsed;
    } catch (err) {
      console.error("Gagal membuat profil perusahaan:", err);
      throw err;
    }
  };

  /**
   * UPDATE PROFIL PERUSAHAAN
   */
  const updateProfile = async (
    id: number,
    formData: FormData
  ): Promise<CompanyProfile> => {
    try {
      const res = await api(`/company-profile/${id}`, {
        method: "PUT",
        body: formData,
      });
      const parsed = handleResponse(res);
      return parsed.data || parsed;
    } catch (err) {
      console.error(`Gagal memperbarui profil perusahaan id ${id}:`, err);
      throw err;
    }
  };

  /**
   * UPLOAD / GANTI LOGO PERUSAHAAN
   */
  const uploadLogo = async (
    id: number,
    logoFile: File
  ): Promise<CompanyProfile> => {
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const res = await api(`/company-profile/${id}/logo`, {
        method: "POST",
        body: formData,
      });
      const parsed = handleResponse(res);
      return parsed.data || parsed;
    } catch (err) {
      console.error(`Gagal mengunggah logo perusahaan id ${id}:`, err);
      throw err;
    }
  };

  /**
   * HAPUS LOGO PERUSAHAAN
   */
  const removeLogo = async (id: number): Promise<CompanyProfile> => {
    try {
      const res = await api(`/company-profile/${id}/logo`, {
        method: "DELETE",
      });
      const parsed = handleResponse(res);
      return parsed.data || parsed;
    } catch (err) {
      console.error(`Gagal menghapus logo perusahaan id ${id}:`, err);
      throw err;
    }
  };

  /**
   * SOFT DELETE PROFIL PERUSAHAAN
   */
  const deleteProfile = async (id: number): Promise<void> => {
    try {
      const res = await api(`/company-profile/${id}`, {
        method: "DELETE",
      });
      handleResponse(res);
    } catch (err) {
      console.error(`Gagal menghapus profil perusahaan id ${id}:`, err);
      throw err;
    }
  };

  /**
   * GET FULL LOGO URL
   * Mengembalikan URL absolut logo berdasarkan logoPath atau logoFilename dari backend
   */
  const getLogoUrl = (logoPath?: string | null, logoFilename?: string | null): string => {
    if (!logoPath && !logoFilename) return "";
    
    const apiBase = config.public.apiBase || "http://localhost:4000";

    if (logoFilename) {
      return `${apiBase}/company-profile/logo/${logoFilename}`;
    }

    if (logoPath) {
      if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
        return logoPath;
      }
      const cleanPath = logoPath.startsWith("/") ? logoPath : `/${logoPath}`;
      return `${apiBase}${cleanPath}`;
    }

    return "";
  };

  return {
    getProfile,
    createProfile,
    updateProfile,
    uploadLogo,
    removeLogo,
    deleteProfile,
    getLogoUrl,
  };
};
