import { ref } from "vue";
import axios from "axios";
import { useCookie } from "#app";

export function useAuth() {
  const token = useCookie("token");
  const role = useCookie("role");
  const username = useCookie("username");

  const userRole = ref(role.value || "guest");
  const userName = ref(username.value || "");

  const baseUrl = "http://localhost:4000";

  const login = async (usernameInput: string, passwordInput: string) => {
    try {
      const res = await axios.post(`${baseUrl}/auth/login`, {
        username: usernameInput,
        password: passwordInput,
      });

      // Ambil data dari response
      const { accessToken, user } = res.data.data;

      token.value = accessToken;
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
    role.value = null;
    username.value = null;
    userRole.value = "guest";
    userName.value = "";
  };

  return {
    userRole,
    userName,
    login,
    logout,
  };
}
