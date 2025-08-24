import axios from 'axios'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const api = axios.create({
    baseURL: config.public.apiBase, // ambil dari .env
    withCredentials: true,
  })

  return {
    provide: {
      axios: api,
    },
  }
})
