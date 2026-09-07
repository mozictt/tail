import { computed } from "vue"; 
import { useCookie, useRuntimeConfig, navigateTo } from "#app";
import { useAuthStore } from "@/stores/auth";

const isTokenExpired = (token: string | null) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now + 30; // buffer 30 detik sebelum expired
  } catch (err) {
    return true;
  }
};

export function useAuth() {
  const config = useRuntimeConfig(); 

  // Nama cookie harus konsisten dengan yang dipakai auth store
  const token = useCookie<string | null>("token");
  const refreshToken = useCookie<string | null>("refreshToken");
  const id_user = useCookie<string | null>("id_user");
  const role = useCookie<string | null>("role");
  const username = useCookie<string | null>("username");

  const userRole = computed(() => role.value || "guest");
  const userName = computed(() => username.value || "");
  const isLoggedIn = computed(() => !!token.value);

  let refreshing: Promise<any> | null = null;
  const refreshTokenAsync = async () => {
    if (refreshing) return refreshing;

    refreshing = (async () => {
      try {
        const res: any = await $fetch(`${config.public.apiBase}/auth/refresh`, {
          method: "POST",
          body: { userId: id_user.value, refreshToken: refreshToken.value },
        });

        // Backend mengembalikan { accessToken, refreshToken } langsung
        // Fallback ke res.data untuk kompatibilitas respons terbungkus
        const data = res?.data ?? res;
        const newAccessToken = data?.accessToken;
        const newRefreshToken = data?.refreshToken;

        if (!newAccessToken) {
          throw new Error("Refresh token gagal: accessToken tidak ditemukan pada respons");
        }

        token.value = newAccessToken;
        refreshToken.value = newRefreshToken ?? refreshToken.value;

        return token.value;
      } catch (error) {
        refreshing = null;
        throw error;
      } finally {
        refreshing = null;
      }
    })();

    return refreshing;
  };

  const login = async (usernameInput: string, passwordInput: string) => {
    try {
      const res: any = await $fetch(`${config.public.apiBase}/auth/login`, {
        method: "POST",
        body: { username: usernameInput, password: passwordInput },
      });

      const data = res?.data || res;
      const user = data?.user || {};
      const accessToken = data?.accessToken || res?.accessToken;
      const newRefreshToken = data?.refreshToken || res?.refreshToken;

      token.value = accessToken;
      refreshToken.value = newRefreshToken;

      role.value = user?.role || "guest";
      username.value = user?.username || "";
      id_user.value = user?.id || "";

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    const authStore = useAuthStore();
    return authStore.logout();
  };

  return {
    token,
    refreshToken,
    userRole,
    id_user,
    userName,
    isLoggedIn,
    login,
    logout,
    isTokenExpired,
    refreshTokenAsync,
  };
}
