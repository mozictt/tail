import { defineStore } from "pinia";

export const useLoadingStore = defineStore("loading", {
  state: () => ({
    activeRequests: 0,
  }),
  getters: {
    isLoading: (state) => state.activeRequests > 0,
  },
  actions: {
    startLoading() {
      this.activeRequests++;
      console.log("▶️ startLoading, activeRequests =", this.activeRequests);
    },
    stopLoading() {
      if (this.activeRequests > 0) this.activeRequests--;
      console.log("⏹ stopLoading, activeRequests =", this.activeRequests);
    },
  },
});
