// // https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "nuxt-icon", "@pinia/nuxt"],
  css: ["~/assets/css/tailwind.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || "http://localhost:4000", // default local
      appName: process.env.NUXT_PUBLIC_APP_NAME,
    },
    app: {
      head: {
        titleTemplate: `%s | ${process.env.NUXT_PUBLIC_APP_NAME}`,
      },
    },
  },
});

// nuxt.config.ts
// https://nuxt.com/docs/api/configuration/nuxt-config
// export default defineNuxtConfig({
//   compatibilityDate: '2025-07-15',
//   devtools: { enabled: true },
//   modules: ['@nuxtjs/tailwindcss', 'nuxt-icon', '@pinia/nuxt'],
//   css: ['~/assets/css/tailwind.css'],

//   runtimeConfig: {
//     public: {
//       apiBase: process.env.API_BASE || "/api", // gunakan /api agar proxy bekerja
//     },
//   },

//   vite: {
//     server: {
//       proxy: {
//         '/api': {
//           target: process.env.API_BASE || 'http://localhost:4000',
//           changeOrigin: true,
//           rewrite: (path) => path.replace(/^\/api/, ''), // hapus /api sebelum dikirim ke backend
//         },
//       },
//     },
//   },
// })
