import { defineStore } from 'pinia'
import axios from 'axios'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(process.client ? localStorage.getItem('token') : null)
  const userRole = ref<string>(process.client ? localStorage.getItem('role') || 'guest' : 'guest')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Login action
  const login = async (username: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('http://localhost:4000/auth/login', { username, password })

      // Contoh response: { accessToken: 'xxx', user: { role: 'admin' } }
      token.value = response.data.accessToken
      userRole.value = response.data.user.role || 'user'

      if (process.client) {
        localStorage.setItem('token', token.value)
        localStorage.setItem('role', userRole.value)
      }

      loading.value = false
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      loading.value = false
      return false
    }
  }

  const logout = () => {
    token.value = null
    userRole.value = 'guest'
    if (process.client) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
    }
  }

  const isLoggedIn = () => !!token.value

  return { token, userRole, loading, error, login, logout, isLoggedIn }
})
