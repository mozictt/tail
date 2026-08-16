import { useApi } from "@/composables/useApi";

/**
 * =========================
 * TYPES
 * =========================
 */

export interface Barang {
  id?: number;
  nama: string;
  harga: number;
  stok: number;
  deskripsi?: string;
}

export interface BarangQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortType?: "asc" | "desc";
}

export interface BarangListResponse {
  array: Barang[];
  totalItems: number;
}

/**
 * =========================
 * SERVICE
 * =========================
 */
export const BarangService = () => {
  const api = useApi();

  /**
   * HANDLE RESPONSE SAFELY
   */
  const handleResponse = (res: any) => {
    if (!res) throw new Error("No response from server");
    return res;
  };

  /**
   * GET LIST BARANG (PAGINATION + SEARCH)
   */
  const getBarang = async (
    params: BarangQuery
  ): Promise<BarangListResponse> => {
    try {
      const res = await api("/barang", {
        params,
      });

      const target = handleResponse(res).data;
      if (target && target.items) {
        return {
          array: target.items,
          totalItems: target.meta?.totalItems ?? target.items.length,
        };
      }
      return target;
    } catch (err) {
      console.error("getBarang error:", err);
      throw err;
    }
  };

  /**
   * GET DETAIL BARANG
   */
  const getBarangById = async (id: number | string): Promise<Barang> => {
    try {
      const res = await api(`/barang/${id}`);
      return handleResponse(res).data;
    } catch (err) {
      console.error("getBarangById error:", err);
      throw err;
    }
  };

  /**
   * CREATE BARANG
   */
  const createBarang = async (payload: Barang) => {
    try {
      const res = await api("/barang", {
        method: "POST",
        body: payload,
      });

      return handleResponse(res);
    } catch (err) {
      console.error("createBarang error:", err);
      throw err;
    }
  };

  /**
   * UPDATE BARANG
   */
  const updateBarang = async (
    id: number | string,
    payload: Partial<Barang>
  ) => {
    try {
      const res = await api(`/barang/${id}`, {
        method: "PUT",
        body: payload,
      });

      return handleResponse(res);
    } catch (err) {
      console.error("updateBarang error:", err);
      throw err;
    }
  };

  /**
   * DELETE BARANG
   */
  const deleteBarang = async (id: number | string) => {
    try {
      const res = await api(`/barang/${id}`, {
        method: "DELETE",
      });

      return handleResponse(res);
    } catch (err) {
      console.error("deleteBarang error:", err);
      throw err;
    }
  };

  /**
   * BULK DELETE (opsional tapi sering dipakai di real project)
   */
  const deleteManyBarang = async (ids: number[]) => {
    try {
      const res = await api("/barang/bulk-delete", {
        method: "POST",
        body: { ids },
      });

      return handleResponse(res);
    } catch (err) {
      console.error("deleteManyBarang error:", err);
      throw err;
    }
  };

  return {
    getBarang,
    getBarangById,
    createBarang,
    updateBarang,
    deleteBarang,
    deleteManyBarang,
  };
};