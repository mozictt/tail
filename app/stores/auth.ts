import { defineStore } from "pinia";
import { useRuntimeConfig, navigateTo } from "#app";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null as string | null,
    refreshToken: null as string | null,
    id_user: null as string | null,
    role: null as string | null,
    username: null as string | null,
    refreshing: null as Promise<any> | null,
    isHydrated: false, // ✅ tambahkan di state
  }),

  getters: {
    userRole: (state) => state.role || "guest",
    userName: (state) => state.username || "",
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    // ✅ TARUH DI SINI
    setHydrated() {
      this.isHydrated = true;
    },

    isTokenExpired(token: string | null) {
      if (!token) return true;
      try {
        const payloadBase64 = token.split(".")[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now + 60;
      } catch {
        return true;
      }
    },

    async refreshTokenAsync() {
      const config = useRuntimeConfig();

      if (this.refreshing) return this.refreshing;

      this.refreshing = (async () => {
        try {
          const res: any = await $fetch(
            `${config.public.apiBase}/auth/refresh`,
            {
              method: "POST",
              body: {
                userId: this.id_user,
                refreshToken: this.refreshToken,
              },
            },
          );

          this.token = res.data.accessToken;
          this.refreshToken = res.data.refreshToken;

          return this.token;
        } finally {
          this.refreshing = null;
        }
      })();

      return this.refreshing;
    },

    async login(usernameInput: string, passwordInput: string) {
      const config = useRuntimeConfig();

      try {
        const res: any = await $fetch(`${config.public.apiBase}/auth/login`, {
          method: "POST",
          body: {
            username: usernameInput,
            password: passwordInput,
          },
        });

        const { accessToken, refreshToken, user } = res.data;

        this.token = accessToken;
        this.refreshToken = refreshToken;
        this.role = user.role || "guest";
        this.username = user.username || "";
        this.id_user = user.id || "";

        return true;
      } catch (error) {
        console.error("Login error:", error);
        return false;
      }
    },

    logout() {
      this.token = null;
      this.refreshToken = null;
      this.role = null;
      this.username = null;
      this.id_user = null;

      return navigateTo("/login");
    },
  },

  persist: true,
});
