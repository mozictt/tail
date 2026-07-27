import { defineStore } from "pinia";
import { useAuthStore } from "./auth";
import { useApi } from "@/composables/useApi";

export const useMenuStore = defineStore("menu", {
  state: () => ({
    menus: [] as any[],
    isLoading: false,
    hasFetched: false,
  }),

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
