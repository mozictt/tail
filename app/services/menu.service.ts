import { useApi } from "@/composables/useApi";

export interface MenuItem {
  id?: number;
  name: string;
  icon?: string | null;
  url?: string | null;
  order_no?: number;
  is_active?: boolean;
  is_visible?: boolean;
  requiredResource?: string | null;
  parent?: MenuItem | null;
  parent_id?: number | null;
  children?: MenuItem[];
  accessLevel?: string | null;
}

export const MenuService = () => {
  const api = useApi();

  const handleResponse = (res: any) => {
    if (!res) throw new Error("No response from server");
    return res;
  };

  /**
   * GET ALL MENUS (Tree structure)
   */
  const getMenus = async (): Promise<MenuItem[]> => {
    try {
      const res = await api("/menus");
      const data = handleResponse(res);
      return Array.isArray(data) ? data : data?.data || [];
    } catch (err) {
      console.error("getMenus error:", err);
      throw err;
    }
  };

  /**
   * GET MENU BY ID
   */
  const getMenuById = async (id: number | string): Promise<MenuItem> => {
    try {
      const res = await api(`/menus/${id}`);
      const data = handleResponse(res);
      return data?.data || data;
    } catch (err) {
      console.error("getMenuById error:", err);
      throw err;
    }
  };

  /**
   * CREATE MENU
   */
  const createMenu = async (payload: Partial<MenuItem>) => {
    try {
      const res = await api("/menus", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("createMenu error:", err);
      throw err;
    }
  };

  /**
   * UPDATE MENU
   */
  const updateMenu = async (id: number | string, payload: Partial<MenuItem>) => {
    try {
      const res = await api(`/menus/${id}`, {
        method: "PUT",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updateMenu error:", err);
      throw err;
    }
  };

  /**
   * DELETE MENU
   */
  const deleteMenu = async (id: number | string) => {
    try {
      const res = await api(`/menus/${id}`, {
        method: "DELETE",
      });
      return handleResponse(res);
    } catch (err) {
      console.error("deleteMenu error:", err);
      throw err;
    }
  };

  /**
   * GET MENUS BY ROLE ID (For Role Management UI)
   */
  const getMenusByRoleId = async (roleId: number | string): Promise<MenuItem[]> => {
    try {
      const res = await api(`/menus/role/${roleId}`);
      const data = handleResponse(res);
      return Array.isArray(data) ? data : data?.data || [];
    } catch (err) {
      console.error("getMenusByRoleId error:", err);
      throw err;
    }
  };

  return {
    getMenus,
    getMenuById,
    createMenu,
    updateMenu,
    deleteMenu,
    getMenusByRoleId,
  };
};
