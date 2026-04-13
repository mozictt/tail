import { computed } from "vue"; 
import { useCookie, useRuntimeConfig, navigateTo } from "#app";

const isTokenExpired = (token: string | null) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now + 60;
  } catch (err) {
    return true;
  }
};

export function useAuth() {
  const config = useRuntimeConfig(); 

  const token = useCookie<string | null>("access_token");
  const refreshToken = useCookie<string | null>("refresh_token");
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

      token.value = res.data.accessToken;
      refreshToken.value = res.data.refreshToken;

      return token.value;
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

      const { accessToken, refreshToken: newRefreshToken, user } = res.data;

      token.value = accessToken;
      refreshToken.value = newRefreshToken;

      role.value = user.role || "guest";
      username.value = user.username || "";
      id_user.value = user.id || "";

      
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
      id_user.value = null; 

    return navigateTo("/login");
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
