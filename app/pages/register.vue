<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const router = useRouter();
const { login, userRole } = useAuth();

// Jika sudah login, redirect ke dashboard
if (userRole.value !== "guest") {
  router.push("/");
}

const doLogin = async () => {
  error.value = "";
  loading.value = true;

  try {
    const success = await login(username.value, password.value);
    if (success) {
      router.push("/");
    } else {
      error.value = "Username atau password salah";
    }
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
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-6"
  >
    <form
      @submit.prevent="doLogin"
      class="bg-white rounded-xl shadow-xl max-w-md w-full p-8 space-y-6"
    >
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-extrabold text-gray-800">Welcome Back 👋</h1>
        <p class="text-gray-500 text-sm mt-2">
          Masuk dengan akunmu untuk melanjutkan
        </p>
      </div>

      <!-- Username -->
      <div>
        <label for="username" class="block text-gray-700 font-medium mb-1"
          >Username</label
        >
        <input
          id="username"
          v-model="username"
          type="text"
          required
          autocomplete="username"
          placeholder="Masukkan username"
          class="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
        />
      </div>

      <!-- Password -->
      <div>
        <label for="password" class="block text-gray-700 font-medium mb-1"
          >Password</label
        >
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="Masukkan password"
          class="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
        />
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading">Memproses...</span>
        <span v-else>Masuk</span>
      </button>

      <!-- Error Message -->
      <p v-if="error" class="text-center text-red-600 font-medium mt-3">
        {{ error }}
      </p>

      <!-- Register Link -->
      <p class="text-center text-gray-400 text-xs mt-4">
        Belum punya akun?
        <NuxtLink to="/register" class="text-indigo-600 hover:underline">
          Daftar di sini
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
