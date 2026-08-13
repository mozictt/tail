<script setup lang="ts">
import { ref, onMounted, watchEffect } from "vue";
import * as icons from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { navigateTo } from "#app";

const username = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const error = ref("");
const loading = ref(false);

const auth = useAuthStore();
const companyStore = useCompanyProfileStore();

// Redirect jika sudah login
watchEffect(() => {
  if (auth.isLoggedIn && auth.slug) {
    navigateTo(`/${auth.slug}/dashboard`);
  }
});

onMounted(() => {
  // Ambil data profil perusahaan
  companyStore.fetchProfile();
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const doLogin = async (e?: Event) => {
  if (e) e.preventDefault();

  if (!username.value || !password.value) {
    error.value = "Username dan password wajib diisi";
    return;
  }

  error.value = "";
  loading.value = true;

  try {
    const success = await auth.login(username.value, password.value);

    if (success) {
      await navigateTo(`/${auth.slug}/dashboard`);
    } else {
      error.value = "Username atau password salah. Silakan periksa kembali.";
    }
  } catch (err) {
    error.value = "Terjadi kesalahan koneksi. Silakan coba beberapa saat lagi.";
  } finally {
    loading.value = false;
  }
};

definePageMeta({
  layout: "login",
});
</script>

<template>
  <div class="min-h-screen w-full flex bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
    <!-- BACKGROUND GRID PATTERN OVERLAY (LIGHT & CERAH) -->
    <div class="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60"></div>

    <!-- AMBIENT PASTEL GLOW ORBS -->
    <div class="absolute -top-20 -left-20 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200/50 via-purple-200/40 to-sky-200/30 rounded-full blur-[130px] pointer-events-none"></div>
    <div class="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-gradient-to-tr from-sky-200/50 via-indigo-200/40 to-purple-200/30 rounded-full blur-[130px] pointer-events-none"></div>

    <!-- MAIN CONTAINER SPLIT SCREEN -->
    <div class="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 relative z-10">
      
      <!-- ================= LEFT HERO PANEL (DESKTOP FEATURE SHOWCASE - BRIGHT THEME) ================= -->
      <div class="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-white/90 via-slate-50/80 to-indigo-50/50 backdrop-blur-md">
        
        <!-- Bright Background Art Floating -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] bg-cover bg-center rounded-3xl opacity-85 shadow-2xl shadow-indigo-200/50 pointer-events-none border border-white/80" style="background-image: url('/login-light-bg.png');"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-50/90 via-slate-50/40 to-white/70 pointer-events-none"></div>

        <!-- Header Branding -->
        <div class="relative z-10 flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 p-2 shadow-md shadow-slate-200 flex items-center justify-center overflow-hidden">
            <SecureCompanyLogo
              :logo-filename="companyStore.logoFilename"
              :logo-path="companyStore.logoPath"
              :alt="companyStore.appName"
              img-class="max-w-full max-h-full w-auto h-auto object-contain"
            />
          </div>
          <div>
            <h2 class="font-black text-lg text-slate-900 tracking-tight leading-tight">
              {{ companyStore.appName }}
            </h2>
            <span class="text-xs text-primary font-bold tracking-wide uppercase">Enterprise Panel</span>
          </div>
        </div>

        <!-- Middle Hero Content -->
        <div class="relative z-10 space-y-8 my-auto max-w-xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-indigo-100 text-xs font-bold text-primary shadow-sm shadow-indigo-100">
            <icons.Sparkles class="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Sistem Operasional Terintegrasi v2.0</span>
          </div>

          <h1 class="text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Kelola Bisnis Lebih <span class="bg-gradient-to-r from-primary via-indigo-600 to-purple-600 bg-clip-text text-transparent">Cerdas, Cepat & Aman</span>
          </h1>

          <p class="text-slate-600 text-sm leading-relaxed font-medium">
            Platform manajemen terpadu yang dirancang dengan antarmuka bersih, responsif, dan siap mendukung produktivitas tim Anda.
          </p>

          <!-- Feature Cards Grid (Bright White Cards) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div class="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm shadow-slate-200/60 space-y-1.5 hover:shadow-md hover:border-primary/30 transition-all">
              <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <icons.ShieldCheck class="w-4 h-4" />
              </div>
              <h3 class="font-bold text-sm text-slate-900">Keamanan Berlapis</h3>
              <p class="text-xs text-slate-500 leading-snug">Perlindungan data dan otorisasi terenkripsi.</p>
            </div>

            <div class="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm shadow-slate-200/60 space-y-1.5 hover:shadow-md hover:border-primary/30 transition-all">
              <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <icons.Zap class="w-4 h-4" />
              </div>
              <h3 class="font-bold text-sm text-slate-900">Performa Tinggi</h3>
              <p class="text-xs text-slate-500 leading-snug">Respons instan untuk berbagai perangkat.</p>
            </div>
          </div>
        </div>

        <!-- Footer System Status -->
        <div class="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-200/80">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="font-semibold text-slate-600">Semua sistem beroperasi normal</span>
          </div>
          <span class="font-medium">&copy; {{ new Date().getFullYear() }} {{ companyStore.appName }}</span>
        </div>
      </div>

      <!-- ================= RIGHT FORM PANEL (BRIGHT GLASS CARD) ================= -->
      <div class="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-12 relative">
        
        <!-- Clean White Glassmorphism Card -->
        <div class="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-indigo-100/60 space-y-7 relative z-10">
          
          <!-- Logo Header -->
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-primary/25 flex items-center justify-center">
              <div class="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-2">
                <SecureCompanyLogo
                  :logo-filename="companyStore.logoFilename"
                  :logo-path="companyStore.logoPath"
                  :alt="companyStore.appName"
                  img-class="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>
            </div>

            <div>
              <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Selamat Datang</h2>
              <p class="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Masukkan akun Anda untuk melanjutkan
              </p>
            </div>
          </div>

          <!-- Alert Error Message -->
          <Transition name="fade">
            <div v-if="error" class="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-center gap-3 text-red-700 text-xs font-semibold shadow-xs">
              <icons.AlertCircle class="w-4 h-4 shrink-0 text-red-500" />
              <span>{{ error }}</span>
            </div>
          </Transition>

          <!-- Form Input Fields -->
          <form @submit.prevent="doLogin" class="space-y-5">
            
            <!-- Username Input -->
            <div class="space-y-1.5">
              <label for="username" class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Username / Email
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <icons.User class="w-4 h-4" />
                </div>
                <input
                  id="username"
                  v-model="username"
                  type="text"
                  required
                  autocomplete="username"
                  placeholder="Masukkan username Anda"
                  class="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label for="password" class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <icons.Lock class="w-4 h-4" />
                </div>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="Masukkan password Anda"
                  class="w-full pl-10 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  @click="togglePasswordVisibility"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  title="Tampilkan / Sembunyikan Password"
                >
                  <component :is="showPassword ? icons.EyeOff : icons.Eye" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Remember Me & Extra Link -->
            <div class="flex items-center justify-between text-xs pt-1">
              <label class="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 font-medium transition">
                <input
                  type="checkbox"
                  v-model="rememberMe"
                  class="checkbox checkbox-xs checkbox-primary rounded-md border-slate-300"
                />
                <span>Ingat saya</span>
              </label>
              
              <a href="#" class="text-primary hover:text-primary/80 font-bold transition hover:underline">
                Lupa Password?
              </a>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3.5 px-4 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 hover:from-primary/95 hover:via-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <template v-if="!loading">
                <span>Masuk ke Dashboard</span>
                <icons.ArrowRight class="w-4 h-4" />
              </template>
              <template v-else>
                <span class="loading loading-spinner loading-xs"></span>
                <span>Memproses Akun...</span>
              </template>
            </button>
          </form>

          <!-- Register Footer Link -->
          <div class="text-center pt-2 border-t border-slate-100">
            <p class="text-xs text-slate-500 font-medium">
              Belum memiliki akun?
              <NuxtLink to="/register" class="text-primary hover:text-primary/80 font-extrabold ml-1 transition hover:underline">
                Daftar Sekarang
              </NuxtLink>
            </p>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>


