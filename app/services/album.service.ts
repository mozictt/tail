import { useApi } from "@/composables/useApi";

export interface Album {
  id?: string;
  name: string;
  description?: string;
  date?: string | Date;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlbumParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortType?: string;
}

export interface PaginatedAlbumsResponse {
  success: boolean;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  array: Album[];
}

export const AlbumService = () => {
  const api = useApi();

  const handleResponse = (res: any) => {
    if (!res) throw new Error("No response from server");
    return res;
  };

  const getAlbums = async (params?: AlbumParams): Promise<PaginatedAlbumsResponse> => {
    try {
      const res = await api("/albums", { params });
      const handled = handleResponse(res);
      const target = handled.data || handled;
      if (target && target.items) {
        return {
          success: true,
          currentPage: target.meta?.currentPage ?? 1,
          totalItems: target.meta?.totalItems ?? 0,
          totalPages: target.meta?.totalPages ?? 1,
          array: target.items ?? [],
        };
      }
      return target;
    } catch (err) {
      console.error("getAlbums error:", err);
      throw err;
    }
  };

  const getAlbumById = async (id: string): Promise<Album> => {
    try {
      const res = await api(`/albums/${id}`);
      const handled = handleResponse(res);
      return handled.data || handled;
    } catch (err) {
      console.error("getAlbumById error:", err);
      throw err;
    }
  };

  const createAlbum = async (payload: Partial<Album>) => {
    try {
      const res = await api("/albums", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("createAlbum error:", err);
      throw err;
    }
  };

  const updateAlbum = async (id: string, payload: Partial<Album>) => {
    try {
      const res = await api(`/albums/${id}`, {
        method: "PATCH",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updateAlbum error:", err);
      throw err;
    }
  };

  const deleteAlbum = async (id: string) => {
    try {
      const res = await api(`/albums/${id}`, {
        method: "DELETE",
      });
      return handleResponse(res);
    } catch (err) {
      console.error("deleteAlbum error:", err);
      throw err;
    }
  };

  return {
    getAlbums,
    getAlbumById,
    createAlbum,
    updateAlbum,
    deleteAlbum,
  };
};

