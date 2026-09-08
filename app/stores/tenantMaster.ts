import { defineStore } from "pinia";
import { useCookie } from "#app";
import { useApi } from "@/composables/useApi";

export interface TenantItem {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  expiredAt: string | null;
  isActive: boolean;
  isMaster: boolean;
  settings: Record<string, any> | null;
  createdAt: string;
}

const COOKIE_OPTS = {
  maxAge: 60 * 60 * 24 * 7, // 7 hari
  path: "/",
  sameSite: "lax" as const,
};

export const useTenantMasterStore = defineStore("tenantMaster", {
  state: () => ({
    targetTenantId: useCookie<string | null>("target_tenant_id", COOKIE_OPTS).value || null,
    targetTenantName: useCookie<string | null>("target_tenant_name", COOKIE_OPTS).value || null,
    targetTenantSlug: useCookie<string | null>("target_tenant_slug", COOKIE_OPTS).value || null,
    tenants: [] as TenantItem[],
    loading: false,
  }),

  actions: {
    setTargetTenant(tenant: TenantItem | null) {
      if (tenant) {
        this.targetTenantId = tenant.id;
        this.targetTenantName = tenant.name;
        this.targetTenantSlug = tenant.slug;
        useCookie("target_tenant_id", COOKIE_OPTS).value = tenant.id;
        useCookie("target_tenant_name", COOKIE_OPTS).value = tenant.name;
        useCookie("target_tenant_slug", COOKIE_OPTS).value = tenant.slug;
      } else {
        this.targetTenantId = null;
        this.targetTenantName = null;
        this.targetTenantSlug = null;
        useCookie("target_tenant_id", { path: "/" }).value = null;
        useCookie("target_tenant_name", { path: "/" }).value = null;
        useCookie("target_tenant_slug", { path: "/" }).value = null;
      }
    },

    clearTargetTenant() {
      this.setTargetTenant(null);
    },

    async fetchTenants(search = "") {
      const api = useApi();
      this.loading = true;
      try {
        const res: any = await api("/tenants", {
          method: "GET",
          params: { search, limit: 100 },
        });

        // Backend NestJS mengembalikan { success: true, data: { items: [...], meta: {...} } }
        const rawItems = res?.data?.items || res?.items || res?.data || res || [];
        this.tenants = Array.isArray(rawItems) ? rawItems : [];
        return this.tenants;
      } catch (err) {
        console.error("Gagal memuat daftar tenant:", err);
        this.tenants = [];
        return [];
      } finally {
        this.loading = false;
      }
    },

    async updateTenant(id: string, payload: {
      name?: string;
      email?: string;
      expiredAt?: string | null;
      isActive?: boolean;
      settings?: Record<string, any>;
    }) {
      const api = useApi();
      const res: any = await api(`/tenants/${id}`, {
        method: "PATCH",
        body: payload,
      });
      await this.fetchTenants();
      return res;
    },

    async cloneTenantConfig(payload: {
      sourceTenantId?: string;
      targetTenantId: string;
      includeMenus?: boolean;
      includeRoles?: boolean;
      includePermissions?: boolean;
      createSuperAdminUser?: boolean;
      customPassword?: string;
      excludeSuperAdminRole?: boolean;
    }) {
      const api = useApi();
      return await api("/tenants/clone-config", {
        method: "POST",
        body: payload,
      });
    },
  },
});
