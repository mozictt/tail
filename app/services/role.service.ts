import { useApi } from "@/composables/useApi";

/**
 * =========================
 * TYPES & INTERFACES
 * =========================
 */

export type AccessLevel = 'full-akses' | 'admin-akses' | 'change-akses' | 'view-akses';

export interface RolePermission {
  id?: number;
  resource: string;
  accessLevel: AccessLevel;
  role_id?: number;
  tenantId?: string;
}

export interface Role {
  id?: number;
  name: string;
  description?: string;
  tenantId?: string;
  permissions?: RolePermission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortType?: "ASC" | "DESC";
}

export interface RoleListResponse {
  success: boolean;
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
  data: Role[];
}

export interface AddPermissionsPayload {
  role_id: number;
  permissions: {
    resource: string;
    accessLevel: AccessLevel;
  }[];
}

/**
 * =========================
 * SERVICE ROLE MANAGEMENT
 * =========================
 */
export const RoleService = () => {
  const api = useApi();

  /**
   * Safe Response Unwrapper untuk menangani pembungkusan NestJS ResponseInterceptor
   */
  const handleResponse = (res: any) => {
    if (!res) throw new Error("Tidak ada respons dari server");
    return res;
  };

  /**
   * Mengambil daftar Role (dengan Paginated & Search)
   */
  const getRoles = async (params?: RoleQuery): Promise<RoleListResponse> => {
    try {
      const res = await api("/role", {
        params: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          search: params?.search || "",
          sortBy: params?.sortBy || "id",
          sortType: params?.sortType || "DESC",
        },
      });
      return handleResponse(res);
    } catch (err) {
      console.error("getRoles error:", err);
      throw err;
    }
  };

  /**
   * Mengambil detail Role berdasarkan ID
   */
  const getRoleById = async (id: number | string): Promise<Role> => {
    try {
      const res = await api(`/role/${id}`);
      return handleResponse(res);
    } catch (err) {
      console.error("getRoleById error:", err);
      throw err;
    }
  };

  /**
   * Membuat Role baru
   */
  const createRole = async (payload: Partial<Role>): Promise<Role> => {
    try {
      const res = await api("/role", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("createRole error:", err);
      throw err;
    }
  };

  /**
   * Memperbarui data Role (Nama / Deskripsi)
   */
  const updateRole = async (id: number | string, payload: Partial<Role>): Promise<Role> => {
    try {
      const res = await api(`/role/${id}`, {
        method: "PATCH",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updateRole error:", err);
      throw err;
    }
  };

  /**
   * Menghapus Role berdasarkan ID
   */
  const deleteRole = async (id: number | string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api(`/role/${id}`, {
        method: "DELETE",
      });
      return handleResponse(res);
    } catch (err) {
      console.error("deleteRole error:", err);
      throw err;
    }
  };

  /**
   * Menambahkan/Memperbarui hak akses (Permissions) pada Role
   */
  const updatePermissions = async (payload: AddPermissionsPayload): Promise<Role> => {
    try {
      const res = await api("/role/permissions", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updatePermissions error:", err);
      throw err;
    }
  };

  return {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    updatePermissions,
  };
};
