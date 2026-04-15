import { defineStore } from "pinia";

export const useUIStore = defineStore("ui", {
  state: () => ({
    isMobileSidebarOpen: false,
    isDesktopSidebarOpen: true,
  }),

  actions: {
    toggleMobileSidebar() {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    },
    openMobileSidebar() {
      this.isMobileSidebarOpen = true;
    },
    closeMobileSidebar() {
      this.isMobileSidebarOpen = false;
    },

    toggleDesktopSidebar() {
      this.isDesktopSidebarOpen = !this.isDesktopSidebarOpen;
    },
  },
});