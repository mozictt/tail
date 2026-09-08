import { useRuntimeConfig } from "#app";
import { useAuthStore } from "@/stores/auth";
import Swal from "sweetalert2";

export const useApi = () => {
  const config = useRuntimeConfig();
  const auth = useAuthStore(); 

  const setHeader = (options: any, key: string, val: string) => {
    if (!options.headers) {
      options.headers = {};
    }
    if (options.headers instanceof Headers) {
      options.headers.set(key, val);
    } else if (Array.isArray(options.headers)) {
      options.headers = options.headers.filter(([k]) => k.toLowerCase() !== key.toLowerCase());
      options.headers.push([key, val]);
    } else if (typeof options.headers === "object") {
      options.headers[key] = val;
    }
  };

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    retry: 1,
    retryStatusCodes: [401],
    retryMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],

    async onRequest({ options }) {
      // 1. Validasi proaktif: Jika access token expired, lakukan refresh token terlebih dahulu sebelum hit API yang dituju
      if (auth.token && auth.isTokenExpired(auth.token)) {
        try {
          await auth.refreshTokenAsync();
        } catch (err) {
          if (process.client) {
            Swal.fire({
              icon: "error",
              title: "Session Berakhir",
              text: "Sesi Anda telah kedaluwarsa, silakan login kembali",
              confirmButtonText: "OK",
            }).then(() => auth.logout());
          } else {
            await auth.logout();
          }
          throw new Error("Token expired dan gagal refresh token");
        }
      }

      // 2. Pasang Authorization header dengan token terbaru
      if (auth.token) {
        setHeader(options, "Authorization", `Bearer ${auth.token}`);
      }

      // 3. Pasang target tenant header hanya jika pengguna adalah Master Tenant
      const targetTenantId = useCookie<string | null>("target_tenant_id").value;
      if (targetTenantId && auth.isMasterTenant) {
        setHeader(options, "X-Target-Tenant-Id", targetTenantId);
      }
    },

    async onResponseError({ response, options }) {
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

        // Coba refresh token jika terjadi 401 saat request berlangsung
        try {
          const newToken = await auth.refreshTokenAsync();
          if (newToken) {
            // Perbarui header Authorization pada options agar retry request menggunakan token baru
            setHeader(options, "Authorization", `Bearer ${newToken}`);
          }
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
