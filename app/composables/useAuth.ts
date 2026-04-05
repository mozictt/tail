import { ref, computed } from "vue";
import { useCookie, useRuntimeConfig, navigateTo } from "#app";

// ✅ Fungsi cek token expired
const isTokenExpired = (token: string | null) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);

    // Tambahkan toleransi 3 detik
    return payload.exp < now + 3;
  } catch (err) {
    console.error("Gagal mengecek token:", err);
    return true;
  }
};

export function useAuth() {
  const config = useRuntimeConfig();

  const token = useCookie<string | null>("access_token");
  const refreshToken = useCookie<string | null>("refresh_token"); 
  const id_user = useCookie<string | null>("refresh_token"); 
  const role = useCookie<string | null>("role");
  const username = useCookie<string | null>("username");

  const userRole = ref(role.value || "guest");
  const userName = ref(username.value || "");

  const isLoggedIn = computed(() => !!token.value);

  // ✅ Tambahkan fungsi refreshTokenAsync
  const refreshTokenAsync = async () => {
    if (!refreshToken.value) throw new Error("Tidak ada refresh token");

    const res: any = await $fetch(`${config.public.apiBase}/auth/refresh`, {
      method: "POST",
      body: { userId: 8,refreshToken: refreshToken.value }
    });

    token.value = res.data.accessToken;
    refreshToken.value = res.data.refreshToken;
    return token.value;
  };

  const login = async (usernameInput: string, passwordInput: string) => {
    try {
      const res: any = await $fetch(`${config.public.apiBase}/auth/login`, {
        method: "POST",
        body: { username: usernameInput, password: passwordInput }
      });

      const { accessToken, refreshToken: newRefreshToken, user } = res.data;

      token.value = accessToken;
      refreshToken.value = newRefreshToken;

      role.value = user.role || "guest";
      username.value = user.username || "";

      userRole.value = role.value;
      userName.value = username.value;

      return true;

    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    token.value = null;
    refreshToken.value = null;
    role.value = null;
    username.value = null;

    userRole.value = "guest";
    userName.value = "";

    navigateTo("/login");
  };

  return {
    token,
    refreshToken,
    userRole,
    userName,
    isLoggedIn,
    login,
    logout,
    isTokenExpired,       // ✅ expose fungsi ini
    refreshTokenAsync      // ✅ expose untuk dipakai sebelum request API
  };
}