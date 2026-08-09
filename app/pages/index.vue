<script setup lang="ts">
/**
 * Root index page — berfungsi sebagai redirect otomatis.
 * Jika user sudah login, redirect ke /{slug}/dashboard.
 * Jika belum, middleware global akan redirect ke /login.
 */
const auth = useAuthStore();

if (auth.isLoggedIn && auth.slug) {
  navigateTo(`/${auth.slug}/dashboard`, { replace: true });
}
</script>

<template>
  <div class="flex items-center justify-center h-screen">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
</template>
