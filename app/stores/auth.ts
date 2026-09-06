import { defineStore } from "pinia";
import { useRuntimeConfig, navigateTo, useCookie } from "#app";
import { useTenantMasterStore } from "@/stores/tenantMaster";
import { useMenuStore } from "@/stores/menu";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: useCookie<string | null>("token").value || null,
    refreshToken: useCookie<string | null>("refreshToken").value || null,
    id_user: useCookie<string | null>("id_user").value || null,
    id_role: useCookie<string | null>("id_role").value || null,
    role: useCookie<string | null>("role").value || null,
    username: useCookie<string | null>("username").value || null,
    slug: useCookie<string | null>("slug").value || null,
    tenant_id: useCookie<string | null>("tenant_id").value || null,
    isMasterTenant: String(useCookie("is_master_tenant").value) === "true",
    isImpersonated: String(useCookie("is_impersonated").value) === "true",
    impersonator: (() => {
      const val = useCookie<any>("impersonator_info").value;
      if (!val) return null;
      try {
        return typeof val === "string" ? JSON.parse(val) : val;
      } catch {
        return null;
      }
    })(),
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
      this.tenant_id = useCookie("tenant_id").value || null;
      this.isMasterTenant = String(useCookie("is_master_tenant").value) === "true";
      this.isImpersonated = String(useCookie("is_impersonated").value) === "true";
      const impCookie = useCookie("impersonator_info").value;
      this.impersonator = impCookie
        ? typeof impCookie === "string"
          ? JSON.parse(impCookie)
          : impCookie
        : null;
    },

    saveCookies() {
      useCookie("token").value = this.token;
      useCookie("refreshToken").value = this.refreshToken;
      useCookie("id_user").value = this.id_user;
      useCookie("id_role").value = this.id_role;
      useCookie("role").value = this.role;
      useCookie("username").value = this.username;
      useCookie("slug").value = this.slug;
      useCookie("tenant_id").value = this.tenant_id;
      useCookie("is_master_tenant").value = this.isMasterTenant ? "true" : "false";
      useCookie("is_impersonated").value = this.isImpersonated ? "true" : "false";
      useCookie("impersonator_info").value = this.impersonator
        ? JSON.stringify(this.impersonator)
        : null;
    },

    clearAllCookies() {
      const cookieKeys = [
        "token",
        "refreshToken",
        "id_user",
        "id_role",
        "role",
        "username",
        "slug",
        "tenant_id",
        "is_master_tenant",
        "is_impersonated",
        "impersonator_info",
        "target_tenant_id",
        "target_tenant_name",
        "target_tenant_slug",
      ];

      for (const key of cookieKeys) {
        const cookie = useCookie(key);
        cookie.value = null;
      }

      if (process.client) {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
          }
        }
      }
    },

    isTokenExpired(token: string | null) {
      if (!token) return true;
      try {
        const payloadBase64 = token.split(".")[1];
        if (!payloadBase64) return true;
        // Fix base64url format
        const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
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

        const data = res?.data || res;
        const user = data?.user || {};
        const accessToken = data?.accessToken || res?.accessToken;
        const refreshToken = data?.refreshToken || res?.refreshToken;

        this.token = accessToken;
        this.refreshToken = refreshToken;
        this.role = user?.role || "guest";
        this.id_role = user?.id_role || "";
        this.username = user?.username || "";
        this.id_user = user?.id || "";
        this.slug = user?.tenant?.slug || user?.tenantSlug || null;
        this.tenant_id = user?.tenantId || user?.tenant?.id || null;
        this.isMasterTenant = Boolean(user?.isMaster || user?.tenant?.isMaster || user?.tenantId === '00000000-0000-0000-0000-000000000000');
        this.isImpersonated = false;
        this.impersonator = null;

        // ✅ PENTING: sync ke cookie (FIX refresh issue)
        this.saveCookies();

        // ✅ Reset target tenant cookies jika pengguna baru adalah non-master
        if (!this.isMasterTenant) {
          useCookie("target_tenant_id").value = null;
          useCookie("target_tenant_name").value = null;
          useCookie("target_tenant_slug").value = null;
        }

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

          const data = res?.data || res;
          this.token = data?.accessToken || res?.accessToken;
          this.refreshToken = data?.refreshToken || res?.refreshToken;

          this.saveCookies();

          return this.token;
        } finally {
          this.refreshing = null;
        }
      })();

      return this.refreshing;
    },

    async switchUser(targetUserId: number | string) {
      const config = useRuntimeConfig();
      try {
        const res: any = await $fetch(`${config.public.apiBase}/auth/switch-user`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          body: { targetUserId },
        });

        const data = res?.data || res;
        const user = data?.user || res?.user || {};
        const accessToken = data?.accessToken || res?.accessToken;
        const refreshToken = data?.refreshToken || res?.refreshToken;

        if (accessToken || res?.success) {
          this.token = accessToken;
          this.refreshToken = refreshToken;
          this.role = user?.role || "guest";
          this.id_role = user?.id_role || "";
          this.username = user?.username || "";
          this.id_user = user?.id || "";
          this.slug = user?.tenantSlug || user?.tenant?.slug || null;
          this.tenant_id = user?.tenantId || null;
          this.isMasterTenant = false;
          this.isImpersonated = Boolean(data?.isImpersonated ?? res?.isImpersonated ?? true);
          this.impersonator = data?.impersonator || res?.impersonator || null;

          this.saveCookies();

          try {
            const masterStore = useTenantMasterStore();
            masterStore.clearTargetTenant();
          } catch (e) {}

          const menuStore = useMenuStore();
          menuStore.clearMenus();
          await menuStore.fetchMenus();

          return res;
        }
        return false;
      } catch (error: any) {
        console.error("Error switch user:", error);
        throw error;
      }
    },

    async switchBackToMaster() {
      const config = useRuntimeConfig();
      try {
        const res: any = await $fetch(`${config.public.apiBase}/auth/switch-back`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        const data = res?.data || res;
        const user = data?.user || res?.user || {};
        const accessToken = data?.accessToken || res?.accessToken;
        const refreshToken = data?.refreshToken || res?.refreshToken;

        if (accessToken || res?.success) {
          this.token = accessToken;
          this.refreshToken = refreshToken;
          this.role = user?.role || "guest";
          this.id_role = user?.id_role || "";
          this.username = user?.username || "";
          this.id_user = user?.id || "";
          this.slug = user?.tenant?.slug || user?.tenantSlug || null;
          this.tenant_id = user?.tenantId || null;
          this.isMasterTenant = Boolean(user?.isMaster || user?.tenant?.isMaster || true);
          this.isImpersonated = false;
          this.impersonator = null;

          useCookie("is_impersonated").value = null;
          useCookie("impersonator_info").value = null;

          this.saveCookies();

          const menuStore = useMenuStore();
          menuStore.clearMenus();
          await menuStore.fetchMenus();

          return res;
        }
        return false;
      } catch (error: any) {
        console.error("Error switch back:", error);
        throw error;
      }
    },

    logout() {
      this.token = null;
      this.refreshToken = null;
      this.role = null;
      this.id_role = null;
      this.username = null;
      this.id_user = null;
      this.slug = null;
      this.tenant_id = null;
      this.isMasterTenant = false;
      this.isImpersonated = false;
      this.impersonator = null;

      // ✅ Reset Pinia Stores
      try {
        const masterStore = useTenantMasterStore();
        masterStore.clearTargetTenant();

        const menuStore = useMenuStore();
        if (typeof menuStore.$reset === "function") {
          menuStore.$reset();
        }
      } catch (e) {
        console.error("Error resetting stores on logout:", e);
      }

      // ✅ Hapus SEMUA cookie secara total
      this.clearAllCookies();

      return navigateTo("/login");
    },
  },
});