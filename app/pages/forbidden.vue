<template>
  <div class="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-red-50 via-white to-red-100 p-6">
    <div class="mb-6">
      <!-- Icon lock from Heroicons (inline SVG) -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-red-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c-1.1 0-2 .9-2 2v3h4v-3c0-1.1-.9-2-2-2z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
        <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
      </svg>
    </div>
    <h1 class="text-7xl font-extrabold text-red-700 mb-4 drop-shadow-lg">403</h1>
    <h2 class="text-3xl font-semibold mb-3 text-red-800 tracking-wide">Akses Ditolak</h2>
    <p class="mb-8 text-center max-w-lg text-gray-700">
      Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
    </p>
    <NuxtLink
      :to="auth.slug ? `/${auth.slug}/dashboard` : '/login'"
      class="bg-red-600 hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition duration-300 ease-in-out"
    >
      Kembali ke Dashboard
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

definePageMeta({
  layout: 'blank' // pakai layout blank tanpa sidebar
})
</script>