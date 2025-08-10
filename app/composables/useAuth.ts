import { ref } from "vue";

export function useAuth() {
  const token = useCookie("token");
  const role = useCookie("role");
  const username = useCookie("username");

  const userRole = ref(role.value || "guest");
  const userName = ref(username.value || "");

  const login = async (usernameInput: string, passwordInput: string) => {
    try {
      const res = await $fetch("/api/login", {
        method: "POST",
        body: { username: usernameInput, password: passwordInput },
      });

      token.value = res.token;
      role.value = res.role;
      username.value = res.username;

      userRole.value = res.role;
      userName.value = res.username;

      return true;
    } catch (error) {
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
