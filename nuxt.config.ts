// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss','nuxt-icon','@pinia/nuxt'],
   css: ['~/assets/css/tailwind.css'],
   runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || "http://localhost:4000", // default local
    },
  },
})
