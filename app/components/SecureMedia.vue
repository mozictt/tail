<template>
  <div class="relative w-full h-full bg-base-200">
    <!-- Tampilan Loading -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>

    <!-- Tampilan Media Berhasil Diload -->
    <template v-else-if="secureMediaUrl">
      <img
        v-if="type === 'photo'"
        :src="secureMediaUrl"
        :alt="filename"
        class="w-full h-full transition duration-500"
        :class="fit === 'contain' ? 'object-contain' : 'object-cover group-hover:scale-110'"
        loading="lazy"
      />
      <video
        v-else-if="type === 'video'"
        :src="secureMediaUrl"
        class="w-full h-full"
        :class="fit === 'contain' ? 'object-contain' : 'object-cover'"
        controls
        preload="metadata"
      ></video>
    </template>

    <!-- Tampilan Error -->
    <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-error bg-error/10">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-xs font-semibold">Gagal Memuat</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRuntimeConfig } from '#imports';

const props = defineProps({
  filename: {
    type: String,
    required: true,
  },
  type: {
    type: String as () => 'photo' | 'video',
    required: true,
  },
  fit: {
    type: String as () => 'cover' | 'contain',
    default: 'cover'
  }
});

const config = useRuntimeConfig();
const authStore = useAuthStore();
const secureMediaUrl = ref<string | null>(null);
const isLoading = ref(true);

const loadSecureMedia = async () => {
  if (!props.filename) return;
  
  isLoading.value = true;
  secureMediaUrl.value = null;

  try {
    const token = authStore.token;
    const url = `${config.public.apiBase}/gallery/media/${props.filename}`;
    
    const response = await $fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'blob'
    });

    secureMediaUrl.value = URL.createObjectURL(response as Blob);
  } catch (error) {
    console.error('Gagal memuat media aman:', error);
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.filename, () => {
  if (secureMediaUrl.value) {
    URL.revokeObjectURL(secureMediaUrl.value);
  }
  loadSecureMedia();
});

onMounted(() => {
  loadSecureMedia();
});

onBeforeUnmount(() => {
  if (secureMediaUrl.value) {
    URL.revokeObjectURL(secureMediaUrl.value);
  }
});
</script>
