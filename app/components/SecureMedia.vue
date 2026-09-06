<template>
  <div class="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
    <!-- INSTANT THUMBNAIL PLACEHOLDER (Muncul seketika 0ms dari cache WebP & di-blur halus selama HD dimuat) -->
    <img
      v-if="isPhoto && props.useOriginal && thumbnailUrl && !hasError"
      :key="'thumb-' + thumbnailUrl"
      :src="thumbnailUrl"
      :alt="filename"
      class="absolute inset-0 w-full h-full transition-all duration-500 filter blur-lg scale-105 opacity-80 z-0 pointer-events-none"
      :class="fit === 'contain' ? 'object-contain' : 'object-cover'"
      loading="eager"
      decoding="async"
    />

    <!-- SKELETON & HD STREAMING BADGE OVERLAY -->
    <Transition name="fade">
      <div
        v-if="isLoading && !hasError"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs pointer-events-none p-4"
      >
        <div class="w-full h-full rounded-2xl bg-slate-800/80 animate-pulse flex flex-col items-center justify-center gap-3 border border-white/5 shadow-2xl">
          <div class="w-12 h-12 rounded-2xl bg-slate-700/80 flex items-center justify-center text-primary shadow-inner">
            <svg class="w-6 h-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div class="h-2.5 w-24 bg-slate-700/60 rounded-full animate-pulse"></div>
          <span class="text-xs font-semibold text-white/80">
            {{ isVideo ? 'Streaming Video...' : (props.useOriginal ? 'Memuat Resolusi Asli (HD)...' : 'Memuat Foto...') }}
          </span>
        </div>
      </div>
    </Transition>

    <!-- Foto Native Stream HD / Final Image -->
    <img
      v-if="isPhoto && photoUrl"
      :key="'hd-' + photoUrl"
      :src="photoUrl"
      :alt="filename"
      class="relative z-10 w-full h-full transition-opacity duration-500"
      :class="[
        fit === 'contain' ? 'object-contain' : 'object-cover group-hover:scale-110',
        isLoading && props.useOriginal ? 'opacity-0' : 'opacity-100'
      ]"
      loading="eager"
      decoding="async"
      @load="handleMediaLoaded"
      @error="handleImageError"
    />

    <!-- Video Native HTML5 Stream -->
    <video
      v-else-if="isVideo && videoStreamingUrl"
      :key="'video-' + videoStreamingUrl"
      :src="videoStreamingUrl"
      class="relative z-10 w-full h-full"
      :class="[
        fit === 'contain' ? 'object-contain' : 'object-cover',
        isLoading ? 'opacity-0' : 'opacity-100'
      ]"
      controls
      preload="metadata"
      playsinline
      @loadedmetadata="handleMediaLoaded"
      @canplay="handleMediaLoaded"
      @loadeddata="handleMediaLoaded"
      @play="handleMediaLoaded"
      @playing="handleMediaLoaded"
      @error="handleImageError"
    ></video>

    <!-- Tampilan Error -->
    <div v-else-if="hasError" class="absolute inset-0 z-30 flex flex-col items-center justify-center text-error bg-error/10 p-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-xs font-semibold">Gagal Memuat Media</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRuntimeConfig } from '#imports';

const props = withDefaults(
  defineProps<{
    filename: string;
    type?: string;
    fit?: 'cover' | 'contain';
    useOriginal?: boolean;
  }>(),
  {
    type: 'photo',
    fit: 'cover',
    useOriginal: false,
  }
);

const config = useRuntimeConfig();
const authStore = useAuthStore();
const isFallbackToOriginal = ref(false);
const hasError = ref(false);
const isLoading = ref(true);

const isVideo = computed(() => {
  if (!props.type) return false;
  const t = props.type.toLowerCase();
  return t === 'video' || t.startsWith('video/') || t === 'mp4' || t === 'webm' || t === 'mov' || t === 'mkv' || t === 'avi';
});

const isPhoto = computed(() => {
  return !isVideo.value;
});

// Reset state loading saat media berganti (Next/Prev)
watch(
  () => [props.filename, props.useOriginal, props.type],
  () => {
    isLoading.value = true;
    hasError.value = false;
    isFallbackToOriginal.value = false;
  },
  { immediate: true }
);

// URL Thumbnail WebP ringan (~30KB) untuk Instant Placeholder
const thumbnailUrl = computed(() => {
  if (!props.filename || !isPhoto.value) return '';

  const cleanPath = props.filename.replace(/^\/+/, '').replace(/^gallery\/media\//, '').replace(/^gallery\/thumbnail\//, '');
  const baseUrl = `${config.public.apiBase}/gallery/thumbnail/${cleanPath}`;
  const token = authStore.token;

  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

// URL HD Original Foto
const photoUrl = computed(() => {
  if (!props.filename || !isPhoto.value) return '';

  const cleanPath = props.filename.replace(/^\/+/, '').replace(/^gallery\/media\//, '').replace(/^gallery\/thumbnail\//, '');
  const isThumb = !props.useOriginal && !isFallbackToOriginal.value;
  const endpoint = isThumb ? `/gallery/thumbnail/${cleanPath}` : `/gallery/media/${cleanPath}`;
  const baseUrl = `${config.public.apiBase}${endpoint}`;
  const token = authStore.token;

  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

// URL Streaming Video
const videoStreamingUrl = computed(() => {
  if (!props.filename || !isVideo.value) return '';
  const cleanPath = props.filename.replace(/^\/+/, '').replace(/^gallery\/media\//, '');
  const baseUrl = `${config.public.apiBase}/gallery/media/${cleanPath}`;
  const token = authStore.token;
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

const handleMediaLoaded = () => {
  isLoading.value = false;
  hasError.value = false;
};

const handleImageError = () => {
  if (isPhoto.value && !props.useOriginal && !isFallbackToOriginal.value) {
    isFallbackToOriginal.value = true;
  } else {
    hasError.value = true;
    isLoading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
