
<template>
  <!-- Wrapper utama -->
  <div class="min-h-screen bg-base-100 flex flex-col">
    <!-- Master Tenant Global Switcher Bar -->
    <TenantMasterBar />
    
    <!-- Layout yang dipilih per halaman -->
    <NuxtLayout>
      <!-- Isi halaman -->
      <NuxtPage />
      <LoadingOverlay />
      <GlobalToast />
    </NuxtLayout>
  </div>
</template>
<script setup lang="ts"> 
import TenantMasterBar from "@/components/TenantMasterBar.vue";
import LoadingOverlay from "@/components/LoadingOverlay.vue";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { computed, onMounted, watch } from "vue";
import { useRuntimeConfig, useHead } from "#imports";

const ui = useUIStore();
const auth = useAuthStore();
const companyProfileStore = useCompanyProfileStore();
const config = useRuntimeConfig();

onMounted(() => {
  ui.initTheme();
  if (auth.isLoggedIn) {
    companyProfileStore.fetchProfile();
  }
});

const activeTheme = computed(() => ui.themeName);

watch(activeTheme, (newTheme) => {
  if (process.client) {
    document.documentElement.setAttribute('data-theme', newTheme);
  }
}, { immediate: true });

useHead(() => {
  const faviconHref = companyProfileStore.logoFilename
    ? `${config.public.apiBase}/company-profile/logo/${companyProfileStore.logoFilename}`
    : '/default-logo.png';

  return {
    htmlAttrs: {
      'data-theme': activeTheme.value
    },
    link: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: faviconHref
      },
      {
        rel: 'shortcut icon',
        href: faviconHref
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com'
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: ''
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap'
      }
    ]
  };
});
</script>