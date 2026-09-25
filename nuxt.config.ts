export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  devtools: { enabled: true },

  build: {
    transpile: ["@vuepic/vue-datepicker"]
  },

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
    // Private: hanya dipakai di server Nuxt (dinamis di runtime)
    backendUrl: process.env.NUXT_BACKEND_URL || process.env.API_BASE || "http://host.docker.internal:4000",
    public: {
      // Public: dipakai browser, arahkan ke proxy internal Nuxt
      apiBase: "/api/proxy",
      appName: process.env.NUXT_PUBLIC_APP_NAME,
      // WebSocket URL langsung ke backend (Socket.IO tidak bisa lewat Nuxt proxy)
      wsBase: process.env.NUXT_PUBLIC_WS_BASE || process.env.API_BASE_URL || "http://localhost:4000",
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

  nitro: {
    externals: {
      external: ["pino", "pino-roll"]
    }
  }
});