import { defineStore } from "pinia";
import { useAuthStore } from "./auth";
import { useApi } from "@/composables/useApi";

export const useMenuStore = defineStore("menu", {
  state: () => ({
    menus: [] as any[],
    isLoading: false,
    hasFetched: false,
  }),

  getters: {
    // Menu yang sudah di-filter untuk Sidebar Navigasi Pengguna (Smart Parent Visibility)
    authorizedMenus: (state): any[] => {
      const filterTree = (items: any[]): any[] => {
        if (!Array.isArray(items)) return [];

        return items
          .map((item) => {
            // 1. Filter submenu di dalamnya secara Bottom-Up
            const filteredChildren =
              item.children && item.children.length > 0
                ? filterTree(item.children)
                : [];

            const isVisible = item.is_visible !== false;
            const hasDirectAccess =
              item.accessLevel !== null && item.accessLevel !== undefined;

            // 2. Parent dianggap valid jika memiliki akses langsung ATAU memiliki minimal 1 submenu valid
            const isParentWithValidChildren = filteredChildren.length > 0;

            if (isVisible && (hasDirectAccess || isParentWithValidChildren)) {
              return {
                ...item,
                // Berikan default 'view-akses' pada parent container jika accessLevel-nya null
                accessLevel: item.accessLevel || "view-akses",
                children: filteredChildren,
              };
            }
            return null;
          })
          .filter((item): item is any => item !== null);
      };

      return filterTree(state.menus);
    },
  },

  actions: {
    async fetchMenus() {
      const auth = useAuthStore();
      const api = useApi();

      if (!auth.id_role) {
        this.menus = [];
        return;
      }

      this.isLoading = true;
      try {
        const response: any = await api(`/menus/role/${auth.id_role}`);
        // Asumsi backend mengembalikan array menu di response (baik langsung array atau di res.data)
        this.menus = Array.isArray(response) ? response : response?.data || [];
        this.hasFetched = true;
      } catch (error) {
        console.error("Gagal mengambil menu dari backend:", error);
        this.menus = [];
      } finally {
        this.isLoading = false;
      }
    },
    
    clearMenus() {
      this.menus = [];
      this.hasFetched = false;
    }
  },
});
