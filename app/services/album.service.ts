import { useApi } from "@/composables/useApi";

export interface Album {
  id?: string;
  name: string;
  description?: string;
  date?: string | Date;
  createdAt?: string;
  updatedAt?: string;
}

export const AlbumService = () => {
  const api = useApi();

  const handleResponse = (res: any) => {
    if (!res) throw new Error("No response from server");
    return res;
  };

  const getAlbums = async (): Promise<Album[]> => {
    try {
      const res = await api("/albums");
      return handleResponse(res).data;
    } catch (err) {
      console.error("getAlbums error:", err);
      throw err;
    }
  };

  const getAlbumById = async (id: string): Promise<Album> => {
    try {
      const res = await api(`/albums/${id}`);
      return handleResponse(res).data;
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
