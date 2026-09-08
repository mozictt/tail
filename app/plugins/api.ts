import { useApi } from "@/composables/useApi";

export default defineNuxtPlugin((nuxtApp) => {
  const api = useApi();

  // 1. Provide $api secara global ke seluruh komponen Nuxt
  return {
    provide: {
      api,
    },
  };
});
