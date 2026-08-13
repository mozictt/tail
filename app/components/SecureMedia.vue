<template>
  <div class="relative w-full h-full bg-base-200 overflow-hidden">
    <!-- Tampilan Loading (Untuk foto yang sedang dimuat sebagai blob) -->
    <div v-if="isLoading && type === 'photo'" class="absolute inset-0 flex items-center justify-center">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>

    <!-- Tampilan Foto -->
    <img
      v-if="type === 'photo' && secureMediaUrl"
      :src="secureMediaUrl"
      :alt="filename"
      class="w-full h-full transition duration-500"
      :class="fit === 'contain' ? 'object-contain' : 'object-cover group-hover:scale-110'"
      loading="lazy"
    />

    <!-- Tampilan Video (Streaming Langsung via Native HTML5 Video Tag) -->
    <video
      v-else-if="type === 'video' && videoStreamingUrl"
      :src="videoStreamingUrl"
      class="w-full h-full"
      :class="fit === 'contain' ? 'object-contain' : 'object-cover'"
      controls
      preload="metadata"
      playsinline
    ></video>

    <!-- Tampilan Error -->
    <div v-else-if="hasError" class="absolute inset-0 flex flex-col items-center justify-center text-error bg-error/10">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-xs font-semibold">Gagal Memuat Media</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
    default: 'cover',
  },
});

const config = useRuntimeConfig();
const authStore = useAuthStore();
const secureMediaUrl = ref<string | null>(null);
const isLoading = ref(false);
const hasError = ref(false);

// URL Streaming langsung untuk video menggunakan Query Token
const videoStreamingUrl = computed(() => {
  if (!props.filename || props.type !== 'video') return '';
  const baseUrl = `${config.public.apiBase}/gallery/media/${props.filename}`;
  const token = authStore.token;
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

const loadSecurePhoto = async () => {
  if (!props.filename || props.type !== 'photo') return;

  isLoading.value = true;
  hasError.value = false;
  secureMediaUrl.value = null;

  try {
    const token = authStore.token;
    const url = `${config.public.apiBase}/gallery/media/${props.filename}`;

    const response = await $fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    });

    secureMediaUrl.value = URL.createObjectURL(response as Blob);
  } catch (error) {
    console.error('Gagal memuat foto aman:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.filename,
  () => {
    if (secureMediaUrl.value) {
      URL.revokeObjectURL(secureMediaUrl.value);
    }
    if (props.type === 'photo') {
      loadSecurePhoto();
    }
  },
);

onMounted(() => {
  if (props.type === 'photo') {
    loadSecurePhoto();
  }
});

onBeforeUnmount(() => {
  if (secureMediaUrl.value) {
    URL.revokeObjectURL(secureMediaUrl.value);
  }
});
</script>
