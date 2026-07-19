<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { useAuthStore } from "@/stores/auth";
import { navigateTo } from "#app";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const auth = useAuthStore();

// ✅ redirect kalau sudah login
watchEffect(() => {
  if (auth.isLoggedIn) {
    navigateTo("/");
  }
});

const doLogin = async (e?: Event) => {
  if (e) e.preventDefault();

  error.value = "";
  loading.value = true;

  try {
    const success = await auth.login(username.value, password.value);

    if (success) {
      await navigateTo("/");
    } else {
      error.value = "Username atau password salah";
    }
  } catch (err) {
    error.value = "Terjadi kesalahan. Silakan coba lagi.";
  } finally {
    loading.value = false;
  }
};

definePageMeta({
  layout: "login",
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50/50 p-6 relative overflow-hidden">
    <!-- Abstract background blobs for premium feel -->
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl"></div>

    <div class="bg-white border border-slate-200/60 rounded-2xl shadow-premium max-w-md w-full p-8 space-y-6 relative z-10" role="form">
      <div class="text-center space-y-2">
        <div class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white mx-auto shadow-md shadow-primary/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Selamat Datang Kembali</h1>
        <p class="text-slate-400 text-xs font-medium">
          Masuk menggunakan kredensial akun Anda untuk melanjutkan
        </p>
      </div>

      <form @submit="doLogin" class="space-y-4">
        <div>
          <label for="username" class="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-1.5">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="Masukkan username Anda"
            class="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
          />
        </div>

        <div>
          <label for="password" class="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Masukkan password Anda"
            class="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
          />
        </div>

        <!-- Tombol login dengan animasi loading -->
        <button
          type="submit"
          class="btn btn-primary w-full rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 flex items-center justify-center font-bold"
          :disabled="loading"
        >
          <span v-if="!loading">Masuk ke Dashboard</span>
          <span v-else class="flex items-center gap-2">
            <span class="loading loading-spinner loading-xs"></span>
            Memproses...
          </span>
        </button>

        <p v-if="error" class="text-center text-error text-xs font-semibold mt-3">{{ error }}</p>
      </form>

      <p class="text-center text-slate-400 text-xs font-medium mt-4">
        Belum memiliki akun?
        <NuxtLink to="/register" class="text-primary hover:underline font-semibold ml-1">Daftar sekarang</NuxtLink>
      </p>
    </div>
  </div>
</template>
