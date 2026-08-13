<template>
  <div class="relative w-full h-full overflow-hidden flex items-center justify-center">
    <!-- Loading State -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-base-200/60 backdrop-blur-xs">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>

    <!-- Image Display dari Secure Blob URL -->
    <img
      v-else-if="secureLogoUrl"
      :src="secureLogoUrl"
      :alt="alt || 'Logo Perusahaan'"
      :class="imgClass || 'max-w-full max-h-full w-auto h-auto object-contain p-2'"
    />

    <!-- Fallback / Default Image State -->
    <div v-else class="w-full h-full flex items-center justify-center bg-base-200 overflow-hidden">
      <slot name="placeholder">
        <img
          src="/default-logo.png"
          :alt="alt || 'Default Logo'"
          :class="imgClass || 'max-w-full max-h-full w-auto h-auto object-contain p-2'"
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import * as icons from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useRuntimeConfig } from "#imports";

const props = defineProps({
  logoFilename: {
    type: String,
    default: null,
  },
  logoPath: {
    type: String,
    default: null,
  },
  alt: {
    type: String,
    default: "Logo Perusahaan",
  },
  imgClass: {
    type: String,
    default: "max-w-full max-h-full w-auto h-auto object-contain p-2",
  },
});

const config = useRuntimeConfig();
const authStore = useAuthStore();

const secureLogoUrl = ref<string | null>(null);
const isLoading = ref(false);
const hasError = ref(false);

const loadSecureLogo = async () => {
  // Jika tidak ada filename atau path
  if (!props.logoFilename && !props.logoPath) {
    secureLogoUrl.value = null;
    return;
  }

  // Jika URL luar (http:// atau https://), tampilkan langsung
  if (props.logoPath && (props.logoPath.startsWith("http://") || props.logoPath.startsWith("https://"))) {
    secureLogoUrl.value = props.logoPath;
    return;
  }

  isLoading.value = true;
  hasError.value = false;

  // Bersihkan object URL lama jika ada
  if (secureLogoUrl.value && secureLogoUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(secureLogoUrl.value);
    secureLogoUrl.value = null;
  }

  try {
    const token = authStore.token;
    const filename = props.logoFilename || props.logoPath?.split("/").pop();
    if (!filename) throw new Error("Nama file logo tidak valid");

    const url = `${config.public.apiBase}/company-profile/logo/${filename}`;

    const response = await $fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "blob",
    });

    secureLogoUrl.value = URL.createObjectURL(response as Blob);
  } catch (error) {
    console.error("Gagal memuat logo perusahaan secara terautentikasi:", error);
    hasError.value = true;
    secureLogoUrl.value = null;
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => [props.logoFilename, props.logoPath],
  () => {
    loadSecureLogo();
  }
);

onMounted(() => {
  loadSecureLogo();
});

onBeforeUnmount(() => {
  if (secureLogoUrl.value && secureLogoUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(secureLogoUrl.value);
  }
});
</script>
