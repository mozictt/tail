import { defineStore } from "pinia";
import { useRuntimeConfig, navigateTo, useCookie } from "#app";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: useCookie<string | null>("token").value || null,
    refreshToken: useCookie<string | null>("refreshToken").value || null,
    id_user: useCookie<string | null>("id_user").value || null,
    id_role: useCookie<string | null>("id_role").value || null,
    role: useCookie<string | null>("role").value || null,
    username: useCookie<string | null>("username").value || null,
    slug: useCookie<string | null>("slug").value || null,
    refreshing: null as Promise<any> | null,
  }),

  getters: {
    userRole: (state) => state.role || "guest",
    userName: (state) => state.username || "",
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    syncCookies() {
      this.token = useCookie("token").value || null;
      this.refreshToken = useCookie("refreshToken").value || null;
      this.id_user = useCookie("id_user").value || null;
      this.id_role = useCookie("id_role").value || null;
      this.role = useCookie("role").value || null;
      this.username = useCookie("username").value || null;
      this.slug = useCookie("slug").value || null;
    },

    saveCookies() {
      useCookie("token").value = this.token;
      useCookie("refreshToken").value = this.refreshToken;
      useCookie("id_user").value = this.id_user;
      useCookie("id_role").value = this.id_role;
      useCookie("role").value = this.role;
      useCookie("username").value = this.username;
      useCookie("slug").value = this.slug;
    },

    isTokenExpired(token: string | null) {
      if (!token) return true;
      try {
        const payloadBase64 = token.split(".")[1];
        if (!payloadBase64) return true;
        // Fix base64url format
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = atob(base64);
        const payload = JSON.parse(payloadJson);
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now + 60;
      } catch {
        return true;
      }
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
        this.id_role = user.id_role || "";
        this.username = user.username || "";
        this.id_user = user.id || "";
        this.slug = user.tenant?.slug || null;

        // ✅ PENTING: sync ke cookie (FIX refresh issue)
        this.saveCookies();

        return true;
      } catch (error) {
        console.error("Login error:", error);
        return false;
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
            }
          );

          this.token = res.data.accessToken;
          this.refreshToken = res.data.refreshToken;

          this.saveCookies();

          return this.token;
        } finally {
          this.refreshing = null;
        }
      })();

      return this.refreshing;
    },

    logout() {
      this.token = null;
      this.refreshToken = null;
      this.role = null;
      this.id_role = null;
      this.username = null;
      this.id_user = null;
      this.slug = null;

      this.saveCookies();

      return navigateTo("/login");
    },
  },
});