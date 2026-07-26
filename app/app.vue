
<template>
  <!-- Wrapper utama -->
  <div class="min-h-screen bg-base-100">
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
import LoadingOverlay from "@/components/LoadingOverlay.vue";
import { useUIStore } from "@/stores/ui";
import { computed, onMounted, watch } from "vue";

const ui = useUIStore();

onMounted(() => {
  ui.initTheme();
});

const activeTheme = computed(() => ui.themeName);

watch(activeTheme, (newTheme) => {
  if (process.client) {
    document.documentElement.setAttribute('data-theme', newTheme);
  }
}, { immediate: true });

useHead(() => ({
  htmlAttrs: {
    'data-theme': activeTheme.value
  },
  link: [
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
}))
const auth = useAuthStore();
</script>