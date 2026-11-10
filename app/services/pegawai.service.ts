import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type {
  JenisKelamin,
  KelurahanRelation,
  StatusAktifPegawai,
  StatusKepegawaian,
} from "@/types/simrs";

export interface PegawaiPendudukSummary {
  id: number;
  nik?: string | null;
  namaLengkap: string;
  jenisKelamin?: JenisKelamin;
}

export interface PegawaiItem {
  id: number;
  pendudukId?: number | null;
  penduduk?: PegawaiPendudukSummary | null;
  nip: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  position?: string | null;
  statusKepegawaian?: StatusKepegawaian | null;
  statusAktif?: StatusAktifPegawai;
  unitKerja?: string | null;
  tanggalMasuk?: string | null;
  tanggalKeluar?: string | null;
  avatar?: string | null;
  bio?: string | null;
  address?: string | null;
  idKelurahan?: string | null;
  kelurahan?: KelurahanRelation | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueryPegawaiParams {
  page?: number;
  limit?: number;
  search?: string;
  position?: string;
  statusKepegawaian?: StatusKepegawaian | "";
  statusAktif?: StatusAktifPegawai | "";
  unitKerja?: string;
  sortBy?:
    | "createdAt"
    | "nip"
    | "name"
    | "position"
    | "statusKepegawaian"
    | "statusAktif";
  sortType?: "ASC" | "DESC" | string;
}

export interface CreatePegawaiPayload {
  pendudukId?: number;
  nip: string;
  name: string;
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

export type UpdatePegawaiPayload = Partial<CreatePegawaiPayload>;

export interface PaginatedPegawaiResponse {
  success: boolean;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  array: PegawaiItem[];
}

export const PegawaiService = () => {
  const api = useApi();

  /**
   * Mengambil daftar pegawai terpaginasi
   */
  const getPegawai = async (
    params?: QueryPegawaiParams,
  ): Promise<PaginatedPegawaiResponse> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));
    const normalizedSortType =
      String(params?.sortType || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      position: params?.position,
      statusKepegawaian: params?.statusKepegawaian,
      statusAktif: params?.statusAktif,
      unitKerja: params?.unitKerja,
      sortBy: params?.sortBy || "createdAt",
      sortType: normalizedSortType,
    });

    const res: any = await api("/pegawai", {
      method: "GET",
      params: query,
    });

    const normalized = normalizePaginatedResponse<PegawaiItem>(
      res,
      safePage,
      safeLimit,
    );

    return {
      success: true,
      currentPage: normalized.meta.currentPage,
      totalItems: normalized.meta.totalItems,
      totalPages: normalized.meta.totalPages,
      array: normalized.items,
    };
  };

  /**
   * Mengambil detail pegawai berdasarkan ID
   */
  const getPegawaiById = async (id: number): Promise<PegawaiItem> => {
    const res: any = await api(`/pegawai/${id}`, {
      method: "GET",
    });
    return (res?.data ?? res) as PegawaiItem;
  };

  /**
   * Membuat pegawai baru
   */
  const createPegawai = async (
    payload: CreatePegawaiPayload,
  ): Promise<PegawaiItem> => {
    const res: any = await api("/pegawai", {
      method: "POST",
      body: compactPayload(payload),
    });
    return (res?.data ?? res) as PegawaiItem;
  };

  /**
   * Memperbarui data pegawai
   */
  const updatePegawai = async (
    id: number,
    payload: UpdatePegawaiPayload,
  ): Promise<PegawaiItem> => {
    const res: any = await api(`/pegawai/${id}`, {
      method: "PUT",
      body: compactPayload(payload),
    });
    return (res?.data ?? res) as PegawaiItem;
  };

  /**
   * Menghapus pegawai (soft delete)
   */
  const deletePegawai = async (
    id: number,
  ): Promise<{ success: boolean; message: string }> => {
    const res: any = await api(`/pegawai/${id}`, {
      method: "DELETE",
    });
    return (res?.data ?? res) as { success: boolean; message: string };
  };

  /**
   * Mendapatkan daftar pegawai yang belum dikaitkan dengan akun user
   */
  const getUnassignedPegawai = async (): Promise<PegawaiItem[]> => {
    const res: any = await api("/pegawai/unassigned", {
      method: "GET",
    });
    if (res && Array.isArray(res.data)) {
      return res.data;
    }
    return Array.isArray(res) ? res : [];
  };

  return {
    getPegawai,
    getPegawaiById,
    createPegawai,
    updatePegawai,
    deletePegawai,
    getUnassignedPegawai,
  };
};
