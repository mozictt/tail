<script setup lang="ts">
import { ref } from "vue";
import * as icons from "lucide-vue-next";
import Sidebar from "@/components/Sidebar.vue"; 
import { useAuthStore } from "@/stores/auth";
import { useMenuStore } from "@/stores/menu";
import Swal from "sweetalert2";

const activeMenu = ref<any>(null);
const sidebarRef = ref();
const auth = useAuthStore();
const menuStore = useMenuStore();

const onUpdateActive = (menuItem: any) => {
  activeMenu.value = menuItem;
};

const toggleMobileSidebar = () => {
  sidebarRef.value?.toggleMobileSidebar();
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
    <!-- Sidebar -->
    <Sidebar ref="sidebarRef" @update-active="onUpdateActive" />

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Sticky Impersonation Warning Banner -->
      <ImpersonationBanner />

      <!-- Navbar -->
      <header class="bg-base-100/85 backdrop-blur-md border-b border-base-content/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
        <!-- Kiri: mobile sidebar toggle, icon & judul -->
        <div class="flex items-center gap-2.5 md:gap-3.5 min-w-0">
          <button 
            class="btn btn-ghost btn-sm md:hidden hover:bg-base-200 text-base-content/75 rounded-lg p-1.5 flex-shrink-0" 
            @click="toggleMobileSidebar"
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
              {{ activeMenu?.name || "Menu" }}
            </h1>
            <p class="text-[11px] md:text-xs font-medium text-base-content/60 truncate">
              {{ activeMenu?.description || "Dashboard Admin" }}
            </p>
          </div>
        </div>

        <!-- Kanan: whatsapp notif, theme switcher & mobile logout -->
        <div class="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <WhatsappNavbarNotification />
          <ThemeSwitcher />
          
          <button
            @click="handleLogout"
            class="md:hidden p-2 text-error hover:bg-error/10 border border-error/20 rounded-xl transition flex items-center justify-center"
            title="Keluar / Logout"
          >
            <icons.LogOut class="w-5 h-5" />
          </button>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-4 md:p-6 overflow-y-auto">
        <slot />
      </main>
    </div>

    <!-- Global WhatsApp Components -->
    <WhatsappNotificationListener />
    <WhatsappContactSelectorModal />
    <GlobalWhatsappChatModal />
  </div>
</template>

