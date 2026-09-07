import { useRuntimeConfig } from "#app";
// import { useAuth } from "@/composables/useAuth";
import { useAuthStore } from "@/stores/auth";
import Swal from "sweetalert2";

export const useApi = () => {
  const config = useRuntimeConfig();
  // const { token,id_user, isTokenExpired, refreshTokenAsync, logout } = useAuth();
  const auth = useAuthStore(); 

  const api = $fetch.create({
    baseURL: config.public.apiBase,

    async onRequest({ options }) {
      // cek token expired sebelum request 
      if (auth.token && auth.isTokenExpired(auth.token)) {
        try {
          await auth.refreshTokenAsync();
        } catch (err) {
          // gagal refresh token → logout
          Swal.fire({
            icon: "error",
            title: "Session Berakhir",
            text: "Token Anda sudah kedaluwarsa, silahkan login kembali",
            confirmButtonText: "OK",
          }).then(() => auth.logout());
          throw new Error("Token expired dan gagal refresh");
        }
      }

      // pasang Authorization header
      if (auth.token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${auth.token}`,
        };
      }

      // pasang target tenant header hanya jika pengguna adalah Master Tenant yang meng-override target tenant
      const targetTenantId = useCookie<string | null>("target_tenant_id").value;
      if (targetTenantId && auth.isMasterTenant) {
        options.headers = {
          ...options.headers,
          "X-Target-Tenant-Id": targetTenantId,
        };
      }
    },

    async onResponseError({ response }) {
      if (!response) return; // network error

      if (response.status === 401) {
        const errorData = response._data;
        const msg =
          typeof errorData?.message === "string"
            ? errorData.message
            : errorData?.message?.message || "Token sudah tidak berlaku (Logged out)";

        // Jika token sudah di-logout / blacklisted dari backend → langsung logout tanpa refresh
        const isBlacklisted =
          msg.includes("Logged out") ||
          msg.includes("tidak berlaku") ||
          !auth.refreshToken;

        if (isBlacklisted) {
          if (process.client) {
            Swal.fire({
              icon: "warning",
              title: "Sesi Berakhir",
              text: msg,
              confirmButtonText: "OK",
            }).then(() => auth.logout());
          } else {
            await auth.logout();
          }
          return;
        }

        // Coba refresh token jika expired biasa
        try {
          await auth.refreshTokenAsync();
          // Refresh berhasil → biarkan request original retry oleh caller
        } catch (err: any) {
          if (process.client) {
            Swal.fire({
              icon: "error",
              title: "Sesi Berakhir",
              text: "Sesi anda telah berakhir, silakan login kembali",
              confirmButtonText: "OK",
            }).then(() => auth.logout());
          } else {
            await auth.logout();
          }
          throw err; // propagasi error ke caller agar request gagal secara eksplisit
        }
      }
    },
  });

  return api;
};
