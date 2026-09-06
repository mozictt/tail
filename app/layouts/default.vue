<script setup lang="ts">
import { ref } from "vue";
import * as icons from "lucide-vue-next";
import Sidebar from "@/components/Sidebar.vue";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useMenuStore } from "@/stores/menu";
import Swal from "sweetalert2";

const ui = useUIStore();
const auth = useAuthStore();
const menuStore = useMenuStore();

const activeMenu = ref<any>(null);

const onUpdateActive = (menuItem: any) => {
  activeMenu.value = menuItem;
};

const handleLogout = async () => {
  const result = await Swal.fire({
    title: "Konfirmasi Logout",
    text: "Apakah anda yakin akan logout?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Logout",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
    customClass: {
      confirmButton: "btn btn-error text-white rounded-xl px-5 font-bold",
      cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
    },
  });

  if (result.isConfirmed) {
    menuStore.clearMenus();
    await auth.logout();
  }
};
</script>

<template>
  <div class="flex h-screen bg-base-200/50 overflow-hidden">
    <Sidebar @update-active="onUpdateActive" />

    <div class="flex-1 flex flex-col min-w-0">
      <!-- Sticky Impersonation Warning Banner -->
      <ImpersonationBanner />
      
      <!-- HEADER -->
      <header
        class="bg-base-100/85 backdrop-blur-md border-b border-base-content/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50"
      >
        <!-- LEFT -->
        <div class="flex items-center gap-2.5 md:gap-3.5 min-w-0">
          
          <!-- ✅ MOBILE BUTTON (SEBELAH KIRI) -->
          <button
            class="md:hidden btn btn-ghost btn-sm text-base-content/70 p-1.5 rounded-lg flex-shrink-0"
            @click="ui.toggleMobileSidebar()"
            title="Toggle Menu"
          >
            <icons.Menu class="w-5.5 h-5.5" />
          </button>

          <div class="p-2 md:p-2.5 rounded-xl bg-base-200 border border-base-content/5 text-primary flex-shrink-0">
            <component
              :is="activeMenu?.icon ? icons[activeMenu.icon] : icons.Menu"
              class="w-5 h-5"
            />
          </div>

          <div class="min-w-0">
            <h1 class="text-sm md:text-base font-bold text-base-content tracking-tight leading-none mb-1 truncate">
              {{ activeMenu?.name || "Dashboard" }}
            </h1>
            <p class="text-[11px] md:text-xs font-medium text-base-content/60 truncate">
              {{ activeMenu?.description || "Selamat datang di sistem" }}
            </p>
          </div>
        </div>

        <!-- RIGHT -->
        <div class="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <!-- SEARCH (DESKTOP) -->
          <div class="relative hidden lg:block">
            <icons.Search
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
            />
            <input
              type="text"
              placeholder="Search..."
              class="pl-9 pr-4 py-1.5 border border-base-content/15 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-base-200/50 focus:bg-base-100 text-base-content"
            />
          </div>

          <!-- THEME SWITCHER -->
          <ThemeSwitcher />

          <!-- NOTIF -->
          <button class="relative p-2 hover:bg-base-200 border border-base-content/10 rounded-xl transition text-base-content/85">
            <icons.Bell class="w-4 h-4 md:w-5 md:h-5" />
            <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-base-100"></span>
          </button>

          <!-- MOBILE QUICK LOGOUT BUTTON -->
          <button
            @click="handleLogout"
            class="md:hidden p-2 text-error hover:bg-error/10 border border-error/20 rounded-xl transition flex items-center justify-center"
            title="Keluar / Logout"
          >
            <icons.LogOut class="w-5 h-5" />
          </button>

          <!-- USER (DESKTOP) -->
          <div class="hidden md:flex items-center gap-2">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" class="w-8 h-8 rounded-xl object-cover ring-2 ring-base-200" />
          </div>
        </div>
      </header>

      <main class="flex-1 p-4 md:p-6 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>