<template>
  <div class="relative overflow-hidden flex items-center justify-center rounded-inherit w-full h-full">
    <!-- Loading State -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-base-200/60 backdrop-blur-xs">
      <span class="loading loading-spinner loading-xs text-primary"></span>
    </div>

    <!-- Image Display dari Secure Blob URL -->
    <img
      v-else-if="secureAvatarUrl"
      :src="secureAvatarUrl"
      :alt="alt || 'Foto Profil'"
      :class="imgClass || 'w-full h-full object-cover'"
    />

    <!-- Fallback / Initial State -->
    <div 
      v-else 
      class="w-full h-full flex items-center justify-center font-bold uppercase"
      :class="fallbackClass || 'bg-primary/10 text-primary'"
    >
      {{ initials || 'US' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRuntimeConfig } from "#imports";

const props = defineProps({
  avatarPath: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: "",
  },
  alt: {
    type: String,
    default: "Foto Profil",
  },
  imgClass: {
    type: String,
    default: "w-full h-full object-cover",
  },
  fallbackClass: {
    type: String,
    default: "bg-primary/10 text-primary",
  },
});

const config = useRuntimeConfig();
const authStore = useAuthStore();

const secureAvatarUrl = ref<string | null>(null);
const isLoading = ref(false);

const initials = computed(() => {
  if (!props.name) return "US";
  return props.name.trim().substring(0, 2).toUpperCase();
});

const loadSecureAvatar = async () => {
  if (!props.avatarPath) {
    secureAvatarUrl.value = null;
    return;
  }

  // Jika URL luar (http:// atau https://), tampilkan langsung
  if (props.avatarPath.startsWith("http://") || props.avatarPath.startsWith("https://")) {
    secureAvatarUrl.value = props.avatarPath;
    return;
  }

  isLoading.value = true;

  // Bersihkan object URL lama jika ada
  if (secureAvatarUrl.value && secureAvatarUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(secureAvatarUrl.value);
    secureAvatarUrl.value = null;
  }

  try {
    const token = authStore.token;
    
    // Pastikan URL tidak terduplikasi. Database path sudah berisi '/users/profile/avatar-stream/'
    let path = props.avatarPath;
    if (!path.startsWith("/users/profile/avatar-stream/")) { 
      const cleanPath = path.replace(/^\/+/, "");
      path = `/users/profile/avatar-stream/${cleanPath}`;
    }

    const url = `${config.public.apiBase}${path}`;

    const response = await $fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "blob",
    });

    secureAvatarUrl.value = URL.createObjectURL(response as Blob);
  } catch (error) {
    console.error("Gagal memuat foto profil secara terautentikasi:", error);
    secureAvatarUrl.value = null;
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.avatarPath,
  () => {
    loadSecureAvatar();
  }
);

onMounted(() => {
  loadSecureAvatar();
});

onBeforeUnmount(() => {
  if (secureAvatarUrl.value && secureAvatarUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(secureAvatarUrl.value);
  }
});
</script>
