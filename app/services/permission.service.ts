import { useApi } from "@/composables/useApi";

/**
 * =========================
 * TYPES & INTERFACES
 * =========================
 */

export interface ResourceOption {
  id: string;
  name: string;
  label?: string;
  value?: string;
}

/**
 * =========================
 * SERVICE PERMISSION
 * =========================
 */
export const PermissionService = () => {
  const api = useApi();

  /**
   * Mengambil daftar seluruh nama Resource Key unik dari backend
   * @param format 'array' | 'select'
   */
  const getResources = async (format: 'array' | 'select' = 'array'): Promise<string[]> => {
    try {
      const res: any = await api('/permissions/resources', {
        params: { format }
      });
      
      const payload = res?.data !== undefined ? res.data : res;
      if (Array.isArray(payload)) {
        return payload;
      } else if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      return [];
    } catch (err) {
      console.error('getResources error:', err);
      return [];
    }
  };

  /**
   * Menghapus permission berdasarkan ID Permission
   */
  const deletePermissionById = async (id: number) => {
    return await api(`/permissions/${id}`, {
      method: 'DELETE',
    });
  };

  /**
   * Mengupdate permission berdasarkan ID Permission
   */
  const updatePermissionById = async (
    id: number,
    payload: { resource?: string; accessLevel: string },
  ) => {
    return await api(`/permissions/${id}`, {
      method: 'PUT',
      body: payload,
    });
  };

  /**
   * Menyalin (Copy) seluruh permissions dari role sumber ke role tujuan
   */
  const copyPermissions = async (payload: {
    source_role_id: number;
    target_role_id: number;
    mode?: 'overwrite' | 'merge';
  }) => {
    return await api('/permissions/copy', {
      method: 'POST',
      body: payload,
    });
  };

  return {
    getResources,
    deletePermissionById,
    updatePermissionById,
    copyPermissions,
  };
};
