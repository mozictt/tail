import { ref, computed } from "vue";
import { useCookie, useRuntimeConfig, navigateTo } from "#app";

export function useAuth() {

  const config = useRuntimeConfig();

  const token = useCookie<string | null>("token");
  const role = useCookie<string | null>("role");
  const username = useCookie<string | null>("username");

  const userRole = ref(role.value || "guest");
  const userName = ref(username.value || "");

  const isLoggedIn = computed(() => !!token.value);

  const login = async (usernameInput: string, passwordInput: string) => {

    try {

      const res:any = await $fetch(`${config.public.apiBase}/auth/login`,{
        method:"POST",
        body:{
          username: usernameInput,
          password: passwordInput
        }
      })

      const { accessToken, user } = res.data

      token.value = accessToken
      role.value = user.role || "guest"
      username.value = user.username || ""

      userRole.value = role.value
      userName.value = username.value

      return true

    } catch (error) {

      console.error("Login error:", error)
      return false

    }

  }

  const logout = () => {

    token.value = null
    role.value = null
    username.value = null

    userRole.value = "guest"
    userName.value = ""

    navigateTo("/login")

  }

  return {
    token,
    userRole,
    userName,
    isLoggedIn,
    login,
    logout
  }

}