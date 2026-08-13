import { defineStore } from "pinia";
import { CompanyProfileService, type CompanyProfile } from "@/services/company-profile.service";

export const useCompanyProfileStore = defineStore("companyProfile", {
  state: () => ({
    profile: null as CompanyProfile | null,
    isLoading: false,
    hasFetched: false,
  }),

  getters: {
    appName: (state): string => {
      if (state.profile?.name) {
        return state.profile.name;
      }
      return "Admin Panel";
    },

    appShortName: (state): string => {
      if (state.profile?.shortName) {
        return state.profile.shortName;
      }
      if (state.profile?.name) {
        return state.profile.name;
      }
      return "Admin Panel";
    },

    hasLogo: (state): boolean => {
      return !!(state.profile?.logoFilename || state.profile?.logoPath);
    },

    logoFilename: (state): string | null => {
      return state.profile?.logoFilename || null;
    },

    logoPath: (state): string | null => {
      return state.profile?.logoPath || null;
    },
  },

  actions: {
    async fetchProfile(force = false) {
      if (this.hasFetched && !force) return;

      this.isLoading = true;
      try {
        const companyService = CompanyProfileService();
        const data = await companyService.getProfile();
        this.profile = data;
        this.hasFetched = true;
      } catch (error) {
        console.error("Gagal mengambil profil perusahaan global:", error);
      } finally {
        this.isLoading = false;
      }
    },

    setProfile(newProfile: CompanyProfile | null) {
      this.profile = newProfile;
      this.hasFetched = true;
    },

    clearProfile() {
      this.profile = null;
      this.hasFetched = false;
    },
  },
});
