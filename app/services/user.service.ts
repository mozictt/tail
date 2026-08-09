import { useApi } from "@/composables/useApi";

export interface UserItem {
  id: number;
  username: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: number;
    name: string;
    description?: string;
  };
}

export const UserService = () => {
  const api = useApi();

  /**
   * Mengambil daftar seluruh user (dengan Pagination, Search, Filter)
   */
  const getUsers = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }) => {
    return await api('/users', {
      method: 'GET',
      params,
    });
  };

  /**
   * Mengambil detail user berdasarkan ID
   */
  const getUserById = async (id: number) => {
    return await api(`/users/${id}`, {
      method: 'GET',
    });
  };

  /**
   * Memperbarui data user (username, role_id, password, is_active)
   */
  const updateUser = async (
    id: number,
    payload: {
      username?: string;
      password?: string;
      role_id?: number;
      is_active?: boolean;
    },
  ) => {
    return await api(`/users/${id}`, {
      method: 'PUT',
      body: payload,
    });
  };

  /**
   * Mengubah status aktif / non-aktif user
   */
  const toggleUserStatus = async (id: number, is_active: boolean) => {
    return await api(`/users/${id}/status`, {
      method: 'PATCH',
      body: { is_active },
    });
  };

  /**
   * Menghapus (Soft Delete) user
   */
  const deleteUser = async (id: number) => {
    return await api(`/users/${id}`, {
      method: 'DELETE',
    });
  };

  /**
   * Mengambil SELURUH daftar user tanpa pagination (untuk dropdown/select2)
   */
  const getAllUsers = async (params?: { search?: string; is_active?: boolean }) => {
    return await api('/users/all', {
      method: 'GET',
      params,
    });
  };

  /**
   * Mereset password user ke default (password123)
   */
  const resetPassword = async (id: number, newPassword = 'password123') => {
    return await api(`/users/${id}/reset-password`, {
      method: 'PATCH',
      body: { new_password: newPassword },
    });
  };

  return {
    getUsers,
    getAllUsers,
    getUserById,
    updateUser,
    toggleUserStatus,
    deleteUser,
    resetPassword,
  };
};
