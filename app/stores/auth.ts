import { defineStore } from "pinia";

interface Menu {
  path: string;
}

interface User {
  id: string;
  username: string;
  role: string;
  menus: Menu[];
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    role: (state) => state.user?.role || "guest",
    username: (state) => state.user?.username || "",
    menus: (state) => state.user?.menus || [],
  },

  actions: {
    setUser(user: User) {
      this.user = user;
    },

    clear() {
      this.user = null;
    },
  },
});