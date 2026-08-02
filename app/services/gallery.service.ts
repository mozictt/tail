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

export const GalleryService = () => {
  const api = useApi();
  const config = useRuntimeConfig();

  const handleResponse = (res: any) => {
    if (!res) throw new Error("No response from server");
    return res;
  };

  const getGalleries = async (): Promise<Gallery[]> => {
    try {
      const res = await api("/gallery");
      return handleResponse(res).data;
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
  
  const getMediaUrl = (fileName: string) => {
    return `${config.public.apiBase}/gallery/media/${fileName}`;
  };

  const downloadMedia = async (fileName: string, originalName: string) => {
    try {
      const res = await api(`/gallery/media/${fileName}`, {
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
    getMediaUrl,
    downloadMedia
  };
};
