import { useRuntimeConfig } from "#app"
import { useAuth } from "@/composables/useAuth"

export const useApi = () => {

  const config = useRuntimeConfig()
  const { token } = useAuth()

  const api = $fetch.create({

    baseURL: config.public.apiBase,

    onRequest({ options }) {

      if (token.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token.value}`
        }
      }

    }

  })

  return api

}