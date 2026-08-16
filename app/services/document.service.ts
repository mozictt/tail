import { useApi } from "@/composables/useApi";

export interface DocumentUser {
  id: string;
  username: string;
}

export interface Document {
  id?: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  path: string;
  description?: string;
  createdAt?: string;
  uploadedBy?: DocumentUser;
}

export interface DocumentParams {
  page?: number;
  limit?: number;
  search?: string;
  extension?: string;
  sortBy?: string;
  sortType?: string;
}

export interface PaginatedDocumentsResponse {
  success: boolean;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  array: Document[];
}

export const DocumentService = () => {
  const api = useApi();

  const handleResponse = (res: any) => {
    if (!res) throw new Error("Tidak ada respon dari server");
    return res;
  };

  const getDocuments = async (params?: DocumentParams): Promise<PaginatedDocumentsResponse> => {
    try {
      const res: any = await api("/documents", { query: params });
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

      if (handled && handled.array) {
        return handled;
      }
      
      if (handled && handled.data && handled.data.array) {
        return handled.data;
      }

      const dataArr = handled.data || (Array.isArray(handled) ? handled : []);
      return {
        success: true,
        currentPage: 1,
        totalItems: dataArr.length,
        totalPages: 1,
        array: dataArr,
      };
    } catch (err) {
      console.error("Gagal mengambil daftar dokumen:", err);
      throw err;
    }
  };

  const uploadDocument = async (file: File, description?: string): Promise<Document> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (description) {
        formData.append("description", description);
      }

      const res = await api("/documents/upload", {
        method: "POST",
        body: formData,
      });

      return handleResponse(res);
    } catch (err) {
      console.error("Gagal mengunggah dokumen:", err);
      throw err;
    }
  };

  const deleteDocument = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api(`/documents/${id}`, {
        method: "DELETE",
      });
      return handleResponse(res);
    } catch (err) {
      console.error("Gagal menghapus dokumen:", err);
      throw err;
    }
  };

  const downloadDocument = async (docPath: string, originalName: string): Promise<void> => {
    try {
      // Pastikan path diawali slash
      const cleanPath = docPath.startsWith("/") ? docPath : `/${docPath}`;
      
      // Ambil file sebagai blob
      const res = await api(cleanPath, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(res as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", originalName);
      document.body.appendChild(link);
      link.click();
      
      // Bersihkan DOM
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengunduh dokumen:", err);
      throw err;
    }
  };

  return {
    getDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  };
};
