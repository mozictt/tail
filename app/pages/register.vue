<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { TenantService } from "@/services/tenant.service";
import Swal from "sweetalert2";
import { Building2, Globe, Mail, Sparkles, ArrowRight, ShieldCheck } from "lucide-vue-next";

const tenantService = TenantService();
const router = useRouter();

const name = ref("");
const slug = ref("");
const email = ref("");
const error = ref("");
const loading = ref(false);
const autoSlug = ref(true);

// Auto slug generator
watch(name, (val) => {
  if (autoSlug.value) {
    slug.value = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

const handleSlugInput = () => {
  autoSlug.value = false;
  slug.value = slug.value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "");
};

const doRegisterTenant = async () => {
  error.value = "";

  if (!name.value.trim()) {
    error.value = "Nama Tenant / Perusahaan wajib diisi";
    return;
  }
  if (!slug.value.trim()) {
    error.value = "Slug URL unik wajib diisi";
    return;
  }
  if (!email.value.trim()) {
    error.value = "Email pemilik wajib diisi";
    return;
  }

  loading.value = true;

  try {
    const res: any = await tenantService.registerTenant({
      name: name.value.trim(),
      slug: slug.value.trim(),
      email: email.value.trim(),
    });

    const tenantData = res?.data || res;

    await Swal.fire({
      title: "Registrasi Tenant Berhasil!",
      html: `
        <div class="space-y-3 text-left">
          <p class="text-slate-600 text-sm">Selamat! Tenant <strong>"${name.value}"</strong> berhasil terdaftar di sistem.</p>
          <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-1.5 text-xs text-indigo-900 font-medium">
            <div class="flex justify-between">
              <span class="text-indigo-600 font-bold">Slug Akses URL:</span>
              <span class="font-mono font-bold">/${slug.value}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-indigo-600 font-bold">Masa Trial:</span>
              <span class="font-bold text-emerald-600">14 Hari Gratis</span>
            </div>
          </div>
          <p class="text-slate-500 text-xs">Silakan masuk menggunakan akun kredensial Anda untuk memulai.</p>
        </div>
      `,
      icon: "success",
      confirmButtonText: "Lanjut ke Halaman Login",
      confirmButtonColor: "#4f46e5",
      customClass: {
        confirmButton: "btn btn-primary rounded-2xl font-bold px-6 shadow-lg shadow-primary/30",
        popup: "rounded-3xl p-6",
      },
    });

    router.push("/login");
  } catch (err: any) {
    console.error("Gagal mendaftarkan tenant:", err);
    error.value = err?.data?.message || err?.message || "Gagal mendaftarkan tenant. Nama atau Slug URL mungkin sudah digunakan.";
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
    <!-- Background Decorator -->
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

    <div class="bg-white border border-slate-200/70 rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 relative z-10">
      <!-- Form Header -->
      <div class="text-center space-y-2">
        <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
          <Building2 class="w-7 h-7" />
        </div>
        <h1 class="text-2xl font-black text-slate-800 tracking-tight">Daftar Tenant / Klinik Baru</h1>
        <p class="text-slate-500 text-xs font-medium max-w-sm mx-auto">
          Buat ruang kerja baru untuk organisasi Anda dan nikmati akses penuh seluruh fitur sistem
        </p>
      </div>

      <form @submit.prevent="doRegisterTenant" class="space-y-4">
        <!-- Tenant Name Input -->
        <div>
          <label class="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 class="w-3.5 h-3.5 text-primary" />
            <span>Nama Perusahaan / Klinik</span>
            <span class="text-error">*</span>
          </label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="Contoh: Klinik Pratama Sehat"
            class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm text-slate-800"
          />
        </div>

        <!-- Slug URL Input -->
        <div>
          <label class="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <Globe class="w-3.5 h-3.5 text-primary" />
              <span>Slug Unik URL Akses</span>
              <span class="text-error">*</span>
            </span>
            <span class="text-[10px] text-slate-400 font-semibold normal-case">(dipergunakan di URL)</span>
          </label>
          <div class="relative">
            <div class="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400 font-mono">
              /
            </div>
            <input
              v-model="slug"
              @input="handleSlugInput"
              type="text"
              required
              placeholder="klinik-pratama-sehat"
              class="input input-bordered w-full pl-7 rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold text-sm text-primary"
            />
          </div>
          <p class="text-[11px] text-slate-400 font-medium mt-1">
            URL Akses Anda: <span class="font-mono font-bold text-slate-600">app.domain.com/{{ slug || 'slug-anda' }}</span>
          </p>
        </div>

        <!-- Email Owner Input -->
        <div>
          <label class="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Mail class="w-3.5 h-3.5 text-primary" />
            <span>Email Pemilik / Penanggung Jawab</span>
            <span class="text-error">*</span>
          </label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="admin@kliniksehat.com"
            class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm text-slate-800"
          />
        </div>

        <!-- Error Message Alert -->
        <div v-if="error" class="p-3 bg-error/10 border border-error/20 rounded-2xl text-error text-xs font-bold flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-error shrink-0"></span>
          <span>{{ error }}</span>
        </div>

        <!-- Trial Feature Callout -->
        <div class="p-3.5 bg-emerald-50 border border-emerald-200/60 rounded-2xl flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles class="w-4 h-4" />
          </div>
          <div>
            <h4 class="text-xs font-extrabold text-emerald-900">Uji Coba Gratis 14 Hari</h4>
            <p class="text-[11px] font-medium text-emerald-700">Dapatkan akses langsung tanpa biaya awal untuk seluruh modul sistem.</p>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="btn btn-primary w-full rounded-2xl h-12 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 flex items-center justify-center font-extrabold text-sm gap-2 mt-2"
          :disabled="loading"
        >
          <span v-if="!loading" class="flex items-center gap-2">
            <span>Daftar Tenant Sekarang</span>
            <ArrowRight class="w-4 h-4" />
          </span>
          <span v-else class="flex items-center gap-2">
            <span class="loading loading-spinner loading-xs"></span>
            <span>Memproses Pendaftaran...</span>
          </span>
        </button>
      </form>

      <!-- Footer Link to Login -->
      <p class="text-center text-slate-500 text-xs font-bold mt-4 pt-4 border-t border-slate-100">
        Sudah memiliki tenant terdaftar?
        <NuxtLink to="/login" class="text-primary hover:underline font-extrabold ml-1">
          Masuk di sini
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
