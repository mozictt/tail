import { useApi } from "@/composables/useApi";

export interface RegisterTenantPayload {
  name: string;
  slug: string;
  email: string;
}

export const TenantService = () => {
  const api = useApi();

  /**
   * Mendaftarkan Tenant / Organisasi Baru
   */
  const registerTenant = async (payload: RegisterTenantPayload) => {
    return await api('/tenants/register', {
      method: 'POST',
      body: payload,
    });
  };

  return {
    registerTenant,
  };
};
