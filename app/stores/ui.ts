import { defineStore } from "pinia";

export const useUIStore = defineStore("ui", {
  state: () => ({
    isMobileSidebarOpen: false,
    isDesktopSidebarOpen: true,
    themeColor: "modern" as "modern" | "emerald" | "sunset" | "rose",
    themeMode: "light" as "light" | "dark",
  }),

  getters: {
    themeName(state): string {
      return `${state.themeColor}${state.themeMode}`;
    }
  },

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

    setThemeColor(color: "modern" | "emerald" | "sunset" | "rose") {
      this.themeColor = color;
      if (process.client) {
        localStorage.setItem("theme-color", color);
      }
    },

    toggleThemeMode() {
      this.themeMode = this.themeMode === "light" ? "dark" : "light";
      if (process.client) {
        localStorage.setItem("theme-mode", this.themeMode);
      }
    },

    initTheme() {
      if (process.client) {
        const savedColor = localStorage.getItem("theme-color");
        const savedMode = localStorage.getItem("theme-mode");
        if (savedColor && ["modern", "emerald", "sunset", "rose"].includes(savedColor)) {
          this.themeColor = savedColor as any;
        }
        if (savedMode && ["light", "dark"].includes(savedMode)) {
          this.themeMode = savedMode as any;
        }
      }
    }
  },
});