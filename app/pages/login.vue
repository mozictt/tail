<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const username = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();

const { login, userRole } = useAuth();

// Jika sudah login, redirect ke dashboard
if (userRole.value !== "guest") {
  router.push("/");
}

const doLogin = async () => {
  error.value = "";
  const success = await login(username.value, password.value);
  if (success) {
    router.push("/");
  } else {
    error.value = "Username atau password salah";
  }
};
definePageMeta({
  layout: "login", 
});
</script>

<template>
  <div class="max-w-md mx-auto mt-24 p-6 border rounded shadow bg-white">
    <h2 class="text-2xl mb-4 font-semibold">Login</h2>
    <input
      v-model="username"
      placeholder="Username"
      class="input input-bordered w-full mb-3"
      autocomplete="username"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
      class="input input-bordered w-full mb-4"
      autocomplete="current-password"
    />
    <button class="btn btn-primary w-full" @click="doLogin">Login</button>
    <p v-if="error" class="text-red-600 mt-2">{{ error }}</p>
  </div>
</template> 