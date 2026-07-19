export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  devtools: { enabled: true },

  modules: [
    "@nuxtjs/tailwindcss",
    "nuxt-icon",
    "@pinia/nuxt"
  ],

  css: [
    "~/assets/css/tailwind.css"
  ],

  app: {
    head: {
      titleTemplate: `%s | ${process.env.NUXT_PUBLIC_APP_NAME}`,
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || "http://localhost:4000",
      appName: process.env.NUXT_PUBLIC_APP_NAME,
    }
  },

  experimental: {
    scanPageMeta: false
  }
});