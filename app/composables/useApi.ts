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
    },

    // async onResponseError({ request, response }) {
    //   if (!response) return; // network error

    //   if (response.status === 401) {
    //     // 401 kemungkinan token expired / invalid
    //     try {
    //       await refreshTokenAsync();
    //       // retry request setelah token baru
    //       return api(request);
    //     } catch (err: any) {
    //       // gagal refresh → logout & notif
    //       const message =
    //         err?.data?.message?.message || // ✅ ini yang sesuai response kamu
    //         err?.data?.message || // fallback kalau string
    //         err?.response?._data?.message?.message ||
    //         err?.response?._data?.message ||
    //         "Sesi anda telah berakhir, silakan login kembali";

    //       // Swal.fire({
    //       //   icon: "error",
    //       //   title: "Session Berakhir",
    //       //   text: message,
    //       //   confirmButtonText: "OK",
    //       // }).then(() => logout());
    //       Swal.fire({
    //         icon: "error",
    //         title: "Session Berakhir",
    //         text: message,
    //         showConfirmButton: false,
    //         timer: 5000,
    //         timerProgressBar: true,
    //         didOpen: () => Swal.showLoading()
    //       })

    //       setTimeout(() => logout(), 5000)
    //       throw err;
    //     }
    //   }

    //   // notif error lain
    //   Swal.fire({
    //     icon: "error",
    //     title: `Error ${response.status}`,
    //     text: response.statusText || "Terjadi kesalahan saat memproses request",
    //     confirmButtonText: "OK",
    //   });

    //   throw new Error(`HTTP Error ${response.status}`);
    // },
  });

  return api;
};
