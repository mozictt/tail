import { useRuntimeConfig } from "#app";
import { useAuth } from "@/composables/useAuth";
import { useToast } from "@/composables/useToast";
import Swal from "sweetalert2";

export const useApi = () => {
  const config = useRuntimeConfig();
  const { token, refreshToken, logout } = useAuth();

  let isRefreshing = false;
  let pendingRequests: any[] = [];

  const api = $fetch.create({
    baseURL: config.public.apiBase,

    onRequest({ options }) {
      if (token.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token.value}`,
        };
      }
    },

    async onResponseError({ request, options, response }) {
      // 🔥 handle unauthorized
      if (response.status === 401) {
        // ❌ kalau tidak ada refresh token → logout
        if (!refreshToken.value) {
          logout();
          return;
        }

        // 🔁 kalau sedang refresh → queue
        if (isRefreshing) {
          return new Promise((resolve) => {
            pendingRequests.push((newToken: string) => {
              resolve(
                api(request, {
                  ...options,
                  headers: {
                    ...options.headers,
                    Authorization: `Bearer ${newToken}`,
                  },
                }),
              );
            });
          });
        }

        isRefreshing = true;

        try {
          const res: any = await $fetch(
            `${config.public.apiBase}/auth/refresh`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token.value}`,
              },
              body: {
                userId: 8,
                refreshToken: refreshToken.value,
              },
            },
          );

          if (!res.success) throw new Error("Refresh token gagal");

          const newAccessToken = res.data.accessToken;
          const newRefreshToken = res.data.refreshToken;

          token.value = newAccessToken;
          refreshToken.value = newRefreshToken;

          // 🔥 jalankan queue
          pendingRequests.forEach((cb) => cb(newAccessToken));
          pendingRequests = [];

          // 🔥 retry request awal
          return api(request, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
          });
        } catch (err: any) {
          // console.error("Refresh token error:", err)
          // ❌ refresh gagal (401 dari backend kamu)
          const message =
            err?.data?.message?.message || // ✅ ini yang sesuai response kamu
            err?.data?.message || // fallback kalau string
            err?.response?._data?.message?.message ||
            err?.response?._data?.message ||
            "Sesi anda telah berakhir, silakan login kembali";

          await Swal.fire({
            icon: "warning",
            title: "Session Expired",
            text: message,
            confirmButtonText: "Login Ulang",
            confirmButtonColor: "#6366f1",
            allowOutsideClick: false,
            allowEscapeKey: false,
          });

          logout();
        } finally {
          isRefreshing = false;
        }
      }
    },
  });

  return api;
};
