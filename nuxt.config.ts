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
    // Private: hanya dipakai di server Nuxt (tidak terekspos ke browser)
    backendUrl: process.env.API_BASE || "http://localhost:4000",
    public: {
      // Public: dipakai browser, arahkan ke proxy internal Nuxt
      apiBase: "/api/proxy",
      appName: process.env.NUXT_PUBLIC_APP_NAME,
    }
  },

  // Nitro Proxy: teruskan /api/proxy/** ke backend secara server-side
  nitro: {
    routeRules: {
      '/api/proxy/**': {
        proxy: `${process.env.API_BASE || 'http://localhost:4000'}/**`,
      }
    }
  },

  experimental: {
    scanPageMeta: false
  },

  vite: {
    server: {
      allowedHosts: true, // Izinkan semua host (berguna untuk Cloudflare Tunnel/Ngrok)
    }
  },
});