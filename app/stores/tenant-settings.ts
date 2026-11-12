import { defineStore } from "pinia";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import { useTenantMasterStore } from "@/stores/tenantMaster";
import { formatNoRmFromConfig } from "@/utils/format-no-rm.util";
import {
  DEFAULT_TENANT_SETTINGS,
  type TenantNoRmSetting,
  type TenantPendaftaranSetting,
  type TenantSettingsConfig,
  type TenantSettingsResponse,
  type UpdateTenantSettingsPayload,
} from "@/types/simrs";

interface ApiEnvelope<T> {
  data?: T;
}

const unwrapData = <T>(res: unknown): T => {
  if (res && typeof res === "object" && "data" in res) {
    const env = res as ApiEnvelope<T>;
    if (env.data !== undefined) return env.data;
  }
  return res as T;
};

const cloneDefaults = (): TenantSettingsConfig => ({
  noRm: { ...DEFAULT_TENANT_SETTINGS.noRm },
  pendaftaran: { ...DEFAULT_TENANT_SETTINGS.pendaftaran },
});

/**
 * Store global untuk konfigurasi & kustomisasi per tenant (`tenants.settings`).
 * Otomatis menyinkronkan konteks tenant aktif termasuk saat Master Admin switch tenant.
 */
export const useTenantSettingsStore = defineStore("tenantSettings", {
  state: () => ({
    tenantId: null as string | null,
    tenantName: "",
    tenantSlug: "",
    settings: cloneDefaults() as TenantSettingsConfig,
    isLoading: false,
    loadedTargetKey: null as string | null,
  }),

  getters: {
    noRm(): TenantNoRmSetting {
      return this.settings?.noRm ?? DEFAULT_TENANT_SETTINGS.noRm;
    },

    noRmPreview(): string {
      return formatNoRmFromConfig(1, this.noRm);
    },

    allowFormOverrideNoRm(): boolean {
      return Boolean(this.noRm.izinkanPilihFormatDiPendaftaran);
    },

    pendaftaran(): TenantPendaftaranSetting {
      return this.settings?.pendaftaran ?? DEFAULT_TENANT_SETTINGS.pendaftaran;
    },

    pendaftaranTitle(): string {
      return (
        this.pendaftaran.judulHalaman?.trim() ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.judulHalaman
      );
    },

    pendaftaranSubtitle(): string {
      return (
        this.pendaftaran.subjudulHalaman?.trim() ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.subjudulHalaman
      );
    },

    pendaftaranSuksesTitle(): string {
      return (
        this.pendaftaran.judulHalamanSukses?.trim() ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.judulHalamanSukses
      );
    },

    pendaftaranSuksesSubtitle(): string {
      return (
        this.pendaftaran.subjudulHalamanSukses?.trim() ||
        DEFAULT_TENANT_SETTINGS.pendaftaran.subjudulHalamanSukses
      );
    },
  },

  actions: {
    getActiveContextKey(): string {
      const auth = useAuthStore();
      const masterStore = useTenantMasterStore();
      return masterStore.targetTenantId || auth.tenant_id || "default";
    },

    applyResponse(data: TenantSettingsResponse) {
      this.tenantId = data.tenantId;
      this.tenantName = data.tenantName;
      this.tenantSlug = data.tenantSlug;
      this.settings = {
        ...data.settings,
        noRm: { ...DEFAULT_TENANT_SETTINGS.noRm, ...(data.settings?.noRm || {}) },
        pendaftaran: {
          ...DEFAULT_TENANT_SETTINGS.pendaftaran,
          ...(data.settings?.pendaftaran || {}),
        },
      };
    },

    async fetchSettings(force = false): Promise<TenantSettingsConfig> {
      const auth = useAuthStore();
      if (!auth.isLoggedIn || !auth.token) {
        return this.settings;
      }

      const activeKey = this.getActiveContextKey();
      if (!force && this.loadedTargetKey === activeKey) {
        return this.settings;
      }

      const api = useApi();
      this.isLoading = true;
      try {
        const res = await api<unknown>("/tenants/settings/current", {
          method: "GET",
        });
        const data = unwrapData<TenantSettingsResponse>(res);
        this.applyResponse(data);
        this.loadedTargetKey = activeKey;
      } catch (err) {
        console.error("Gagal memuat pengaturan tenant aktif:", err);
      } finally {
        this.isLoading = false;
      }
      return this.settings;
    },

    async updateCurrentSettings(
      payload: UpdateTenantSettingsPayload,
    ): Promise<TenantSettingsResponse> {
      const api = useApi();
      const res = await api<unknown>("/tenants/settings/current", {
        method: "PUT",
        body: payload,
      });
      const data = unwrapData<TenantSettingsResponse>(res);
      this.applyResponse(data);
      this.loadedTargetKey = this.getActiveContextKey();
      return data;
    },

    async fetchTenantSettingsById(
      tenantId: string,
    ): Promise<TenantSettingsResponse> {
      const api = useApi();
      const res = await api<unknown>(`/tenants/${tenantId}/settings`, {
        method: "GET",
      });
      return unwrapData<TenantSettingsResponse>(res);
    },

    async updateTenantSettingsById(
      tenantId: string,
      payload: UpdateTenantSettingsPayload,
    ): Promise<TenantSettingsResponse> {
      const api = useApi();
      const res = await api<unknown>(`/tenants/${tenantId}/settings`, {
        method: "PATCH",
        body: payload,
      });
      const data = unwrapData<TenantSettingsResponse>(res);
      if (this.getActiveContextKey() === tenantId || this.tenantId === tenantId) {
        this.applyResponse(data);
        this.loadedTargetKey = this.getActiveContextKey();
      }
      return data;
    },

    clearSettings() {
      this.tenantId = null;
      this.tenantName = "";
      this.tenantSlug = "";
      this.settings = cloneDefaults();
      this.loadedTargetKey = null;
    },
  },
});

