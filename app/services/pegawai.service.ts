import { useApi } from "@/composables/useApi";

export interface PegawaiItem {
  id: number;
  nip: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
  avatar?: string;
  bio?: string;
  address?: string;
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
  createdAt: string;
  updatedAt: string;
}

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
  const getPegawai = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    position?: string;
    sortBy?: string;
    sortType?: string;
  }): Promise<PaginatedPegawaiResponse> => {
    const res: any = await api("/pegawai", {
      method: "GET",
      params,
    });

    if (res && res.data && res.data.items) {
      return {
        success: true,
        currentPage: res.data.meta?.currentPage ?? 1,
        totalItems: res.data.meta?.totalItems ?? 0,
        totalPages: res.data.meta?.totalPages ?? 1,
        array: res.data.items ?? [],
      };
    }

    return res;
  };

  /**
   * Mengambil detail pegawai berdasarkan ID
   */
  const getPegawaiById = async (id: number): Promise<PegawaiItem> => {
    return await api(`/pegawai/${id}`, {
      method: "GET",
    });
  };

  /**
   * Membuat pegawai baru
   */
  const createPegawai = async (payload: {
    nip: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    position?: string;
    bio?: string;
    address?: string;
    idKelurahan?: string;
  }): Promise<PegawaiItem> => {
    return await api("/pegawai", {
      method: "POST",
      body: payload,
    });
  };

  /**
   * Memperbarui data pegawai
   */
  const updatePegawai = async (
    id: number,
    payload: {
      nip?: string;
      name?: string;
      email?: string;
      phoneNumber?: string;
      position?: string;
      bio?: string;
      address?: string;
      idKelurahan?: string;
    },
  ): Promise<PegawaiItem> => {
    return await api(`/pegawai/${id}`, {
      method: "PUT",
      body: payload,
    });
  };

  /**
   * Menghapus pegawai (soft delete)
   */
  const deletePegawai = async (id: number): Promise<{ success: boolean; message: string }> => {
    return await api(`/pegawai/${id}`, {
      method: "DELETE",
    });
  };

  /**
   * Mendapatkan daftar pegawai yang belum dikaitkan dengan akun user
   */
  const getUnassignedPegawai = async (): Promise<PegawaiItem[]> => {
    const res: any = await api("/pegawai/unassigned", {
      method: "GET",
    });
    if (res && res.data) {
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
