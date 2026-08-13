<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

if (auth.slug) {
  navigateTo(`/${auth.slug}/profil-perusahaan`, { replace: true });
} else {
  navigateTo("/login");
}
</script>

<template>
  <div class="flex items-center justify-center h-screen">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
</template>
