// plugins/axios.ts
import axios from "axios";
import { useLoadingStore } from "@/stores/loading";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const api = axios.create({
    baseURL: config.public.apiBase, // ambil dari .env
    withCredentials: true,
  });

  // Interceptor request
  api.interceptors.request.use((cfg) => {
    const loading = useLoadingStore();
    loading.startLoading();
    return cfg;
  });

  // Interceptor response
  api.interceptors.response.use(
    (response) => {
      const loading = useLoadingStore();
      loading.stopLoading();
      return response;
    },
    (error) => {
      const loading = useLoadingStore();
      loading.stopLoading();
      return Promise.reject(error);
    }
  );

  return {
    provide: {
      axios: api,
    },
  };
});
