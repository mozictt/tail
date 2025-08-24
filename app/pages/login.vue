<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false); // state loading
const router = useRouter();

const { login, userRole } = useAuth();

if (userRole.value !== "guest") {
  router.push("/");
}

const doLogin = async (e?: Event) => {
  if (e) e.preventDefault();
  error.value = "";
  loading.value = true; // mulai loading
  try {
    const success = await login(username.value, password.value);
    if (success) {
      router.push("/");
    } else {
      error.value = "Username atau password salah";
    }
  } catch (err) {
    error.value = "Terjadi kesalahan. Silakan coba lagi.";
  } finally {
    loading.value = false; // selesai loading
  }
};

definePageMeta({
  layout: "login",
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-6">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-8 space-y-6" role="form">
      <h1 class="text-3xl font-extrabold text-gray-800 text-center">Welcome Back</h1>
      <p class="text-center text-gray-500 text-sm mb-6">
        Masuk menggunakan akun kamu untuk melanjutkan
      </p>

      <form @submit="doLogin" class="space-y-4">
        <div>
          <label for="username" class="block text-gray-700 font-medium mb-1">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="Masukkan username"
            class="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
          />
        </div>

        <div>
          <label for="password" class="block text-gray-700 font-medium mb-1">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Masukkan password"
            class="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
          />
        </div>

        <!-- Tombol login dengan animasi loading -->
        <button
          type="submit"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md transition duration-300 flex items-center justify-center"
          :disabled="loading"
        >
          <span v-if="!loading">Masuk</span>
          <span v-else class="flex items-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            Loading...
          </span>
        </button>

        <p v-if="error" class="text-center text-red-600 font-medium mt-3">{{ error }}</p>
      </form>

      <p class="text-center text-gray-400 text-xs mt-4">
        Belum punya akun?
        <a href="#" class="text-indigo-600 hover:underline">Daftar di sini</a>
      </p>
    </div>
  </div>
</template>
