<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Swal from "sweetalert2";

const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const loading = ref(false);

const router = useRouter();

const doRegister = async () => {
  error.value = "";
  
  if (password.value !== confirmPassword.value) {
    error.value = "Password dan Konfirmasi Password tidak cocok";
    return;
  }

  loading.value = true;

  try {
    // Simulasi register sukses
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    await Swal.fire({
      title: "Registrasi Berhasil!",
      text: "Akun Anda telah berhasil dibuat. Silakan masuk.",
      icon: "success",
      confirmButtonText: "Ke Halaman Login",
      confirmButtonColor: "#4f46e5",
    });
    
    router.push("/login");
  } catch (e) {
    error.value = "Terjadi kesalahan. Coba lagi nanti.";
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
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Daftar Akun Baru</h1>
        <p class="text-slate-400 text-xs font-medium">
          Isi detail data di bawah untuk bergabung bersama kami
        </p>
      </div>

      <form @submit.prevent="doRegister" class="space-y-4">
        <div>
          <label for="username" class="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-1.5">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            placeholder="Pilih username unik"
            class="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
          />
        </div>

        <div>
          <label for="email" class="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-1.5">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="nama@email.com"
            class="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
          />
        </div>

        <div>
          <label for="password" class="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Buat password aman"
            class="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-1.5">Konfirmasi Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Ulangi password Anda"
            class="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
          />
        </div>

        <!-- Tombol Daftar -->
        <button
          type="submit"
          class="btn btn-primary w-full rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 flex items-center justify-center font-bold"
          :disabled="loading"
        >
          <span v-if="!loading">Buat Akun Sekarang</span>
          <span v-else class="flex items-center gap-2">
            <span class="loading loading-spinner loading-xs"></span>
            Mendaftarkan...
          </span>
        </button>

        <p v-if="error" class="text-center text-error text-xs font-semibold mt-3">{{ error }}</p>
      </form>

      <p class="text-center text-slate-400 text-xs font-medium mt-4">
        Sudah memiliki akun?
        <NuxtLink to="/login" class="text-primary hover:underline font-semibold ml-1">Masuk di sini</NuxtLink>
      </p>
    </div>
  </div>
</template>

