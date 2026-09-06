<template>
  <div class="relative w-full h-full bg-base-200 overflow-hidden">
    <!-- Tampilan Foto Native Stream ber-Token -->
    <img
      v-if="type === 'photo' && photoUrl"
      :src="photoUrl"
      :alt="filename"
      class="w-full h-full transition duration-500"
      :class="fit === 'contain' ? 'object-contain' : 'object-cover group-hover:scale-110'"
      loading="lazy"
      decoding="async"
      @error="handleImageError"
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
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRuntimeConfig } from '#imports';

const props = withDefaults(
  defineProps<{
    filename: string;
    type: 'photo' | 'video';
    fit?: 'cover' | 'contain';
    useOriginal?: boolean;
  }>(),
  {
    fit: 'cover',
    useOriginal: false,
  }
);

const config = useRuntimeConfig();
const authStore = useAuthStore();
const isFallbackToOriginal = ref(false);
const hasError = ref(false);

const photoUrl = computed(() => {
  if (!props.filename || props.type !== 'photo') return '';

  const cleanPath = props.filename.replace(/^\/+/, '').replace(/^gallery\/media\//, '').replace(/^gallery\/thumbnail\//, '');
  const isThumb = !props.useOriginal && !isFallbackToOriginal.value;
  const endpoint = isThumb ? `/gallery/thumbnail/${cleanPath}` : `/gallery/media/${cleanPath}`;
  const baseUrl = `${config.public.apiBase}${endpoint}`;
  const token = authStore.token;

  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

const videoStreamingUrl = computed(() => {
  if (!props.filename || props.type !== 'video') return '';
  const cleanPath = props.filename.replace(/^\/+/, '').replace(/^gallery\/media\//, '');
  const baseUrl = `${config.public.apiBase}/gallery/media/${cleanPath}`;
  const token = authStore.token;
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

const handleImageError = () => {
  if (!props.useOriginal && !isFallbackToOriginal.value) {
    isFallbackToOriginal.value = true;
  } else {
    hasError.value = true;
  }
};
</script>
