
<template>
  <!-- Wrapper utama -->
  <div  class="min-h-screen bg-white">
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
    'data-theme': 'light'
  }
})
const auth = useAuthStore();

// onMounted(() => {
//   auth.setHydrated();
// });
</script>