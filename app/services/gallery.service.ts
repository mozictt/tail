import { useApi } from "@/composables/useApi";
import { useRuntimeConfig } from "#imports";

export interface Gallery {
  id?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: "photo" | "video";
  albumId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GalleryParams {
  page?: number;
  limit?: number;
  search?: string;
  albumId?: string;
  type?: "photo" | "video";
  sortBy?: string;
  sortType?: string;
}

export interface PaginatedGalleriesResponse {
  success: boolean;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  array: Gallery[];
}

export const GalleryService = () => {
  const api = useApi();
  const config = useRuntimeConfig();

  const handleResponse = (res: any) => {
    if (!res) throw new Error("No response from server");
    return res;
  };

  const getGalleries = async (params?: GalleryParams): Promise<PaginatedGalleriesResponse> => {
    try {
      const res: any = await api("/gallery", { query: params, params });
      const handled = handleResponse(res);
      
      // Jika respons dari backend berbentuk paginated baru { success, data: { items, meta } }
      if (handled && handled.data && handled.data.items) {
        return {
          success: true,
          currentPage: handled.data.meta?.currentPage ?? 1,
          totalItems: handled.data.meta?.totalItems ?? 0,
          totalPages: handled.data.meta?.totalPages ?? 1,
          array: handled.data.items ?? [],
        };
      }

      // Jika respons dari backend berbentuk paginated { success, array, ... }
      if (handled && handled.array) {
        return handled;
      }
      if (handled && handled.data && handled.data.array) {
        return handled.data;
      }
      // Fallback jika respons langsung berupa array
      const dataArr = handled.data || (Array.isArray(handled) ? handled : []);
      return {
        success: true,
        currentPage: 1,
        totalItems: dataArr.length,
        totalPages: 1,
        array: dataArr,
      };
    } catch (err) {
      console.error("getGalleries error:", err);
      throw err;
    }
  };

  const getGalleryById = async (id: string): Promise<Gallery> => {
    try {
      const res = await api(`/gallery/${id}`);
      return handleResponse(res).data;
    } catch (err) {
      console.error("getGalleryById error:", err);
      throw err;
    }
  };

  const uploadBulk = async (files: File[], albumId?: string) => {
    try {
      const formData = new FormData();
      if (albumId) {
        formData.append("albumId", albumId);
      }
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await api("/gallery/upload-bulk", {
        method: "POST",
        body: formData,
        // Let the browser set the correct multipart/form-data boundary
      });
      return handleResponse(res);
    } catch (err) {
      console.error("uploadBulk error:", err);
      throw err;
    }
  };

  const updateGallery = async (id: string, payload: Partial<Gallery>) => {
    try {
      const res = await api(`/gallery/${id}`, {
        method: "PATCH",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updateGallery error:", err);
      throw err;
    }
  };

  const deleteGallery = async (id: string) => {
    try {
      const res = await api(`/gallery/${id}`, {
        method: "DELETE",
      });
      return handleResponse(res);
    } catch (err) {
      console.error("deleteGallery error:", err);
      throw err;
    }
  };

  const deleteBulk = async (ids: string[]) => {
    try {
      const res = await api("/gallery/bulk", {
        method: "DELETE",
        body: { ids },
      });
      return handleResponse(res);
    } catch (err) {
      console.error("deleteBulk error:", err);
      throw err;
    }
  };

  const downloadBulk = async (ids: string[], zipName: string = "galeri-terpilih.zip") => {
    try {
      const res = await api("/gallery/download-bulk", {
        method: "POST",
        body: { ids },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", zipName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("downloadBulk error:", err);
      throw err;
    }
  };
  
  const getMediaUrl = (fileName: string) => {
    const cleanPath = fileName?.replace(/^\/+/, '') || '';
    return `${config.public.apiBase}/gallery/media/${cleanPath}`;
  };

  const downloadMedia = async (fileName: string, originalName: string) => {
    try {
      const cleanPath = fileName?.replace(/^\/+/, '') || '';
      const res = await api(`/gallery/media/${cleanPath}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", originalName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("downloadMedia error:", err);
      throw err;
    }
  };

  return {
    getGalleries,
    getGalleryById,
    uploadBulk,
    updateGallery,
    deleteGallery,
    deleteBulk,
    downloadBulk,
    getMediaUrl,
    downloadMedia
  };
};
