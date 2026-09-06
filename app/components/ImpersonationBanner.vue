<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import Swal from "sweetalert2";
import { ShieldAlert, RotateCcw, User } from "lucide-vue-next";

const auth = useAuthStore();
const loading = ref(false);

const handleSwitchBack = async () => {
  loading.value = true;
  try {
    const res: any = await auth.switchBackToMaster();
    if (res) {
      await Swal.fire({
        icon: "success",
        title: "Kembali ke Master Tenant",
        text: "Anda telah kembali ke akun Super Admin Master Tenant.",
        timer: 1800,
        showConfirmButton: false,
      });

      const targetSlug = auth.slug || "master";
      window.location.href = `/${targetSlug}/dashboard`;
    }
  } catch (error: any) {
    console.error("Gagal switch back:", error);
    Swal.fire({
      icon: "error",
      title: "Gagal Switch Back",
      text: error?.data?.message || error?.message || "Terjadi kesalahan saat kembali ke akun Master Tenant.",
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform -translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div
      v-if="auth.isImpersonated"
      class="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-slate-100 border-b-2 border-amber-500/40 px-4 md:px-6 py-2.5 z-[60] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm font-medium"
    >
      <!-- Info Label -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner animate-pulse">
          <ShieldAlert class="w-4.5 h-4.5 text-amber-400" />
        </div>
        
        <div class="flex items-center flex-wrap gap-2 min-w-0">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-400/30">
            ⚡ Mode Switch User
          </span>

          <div class="flex items-center gap-1.5 text-slate-200 font-semibold">
            <span>Mengakses Akun:</span>
            <span class="inline-flex items-center gap-1 bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30 font-extrabold text-xs">
              <User class="w-3.5 h-3.5" />
              {{ auth.username || 'User Target' }}
            </span>
          </div>

          <span class="hidden lg:inline text-slate-400 text-xs">
            • Switched by Master Admin: <strong class="text-amber-200 font-bold">{{ auth.impersonator?.username || 'Super Admin' }}</strong>
          </span>
        </div>
      </div>

      <!-- Action Button -->
      <button
        @click="handleSwitchBack"
        :disabled="loading"
        class="btn btn-sm bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black border-none rounded-2xl px-5 py-1.5 shadow-lg shadow-amber-500/20 transition-all duration-200 flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
      >
        <span v-if="loading" class="loading loading-spinner loading-xs"></span>
        <RotateCcw v-else class="w-4 h-4 stroke-[2.5]" />
        <span>⚡ Kembali ke Master Tenant</span>
      </button>
    </div>
  </Transition>
</template>
