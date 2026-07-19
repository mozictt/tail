
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
useHead({
  htmlAttrs: {
    'data-theme': 'modernlight'
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
})
const auth = useAuthStore();

// onMounted(() => {
//   auth.setHydrated();
// });
</script>