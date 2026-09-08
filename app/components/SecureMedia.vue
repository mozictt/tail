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

    <!-- SKELETON & STREAMING BADGE OVERLAY -->
    <Transition name="fade">
      <div
        v-if="isLoading && !hasError"
        class="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-md pointer-events-none p-4"
      >
        <!-- Floating Glass Card -->
        <div class="relative px-6 py-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl flex flex-col items-center justify-center gap-3.5 max-w-[240px] text-center overflow-hidden">
          <!-- Background Glow Effect -->
          <div class="absolute -inset-1 bg-gradient-to-r from-primary/30 via-indigo-500/30 to-purple-500/30 rounded-2xl blur-lg opacity-70 animate-pulse pointer-events-none"></div>

          <!-- Spinner dengan Icon Dynamic -->
          <div class="relative w-12 h-12 flex items-center justify-center">
            <!-- Dual Spinning Ring -->
            <div class="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
            <div class="absolute inset-1 rounded-full border-2 border-indigo-500/10 border-b-indigo-400 animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
            
            <!-- Center Media Icon -->
            <svg v-if="isVideo" class="w-5 h-5 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-5 h-5 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <!-- Animated Shimmer Progress Bar -->
          <div class="w-28 h-1 bg-slate-800 rounded-full overflow-hidden relative">
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer"></div>
          </div>

          <!-- Status Text -->
          <span class="text-xs font-medium tracking-wide text-slate-200 shadow-sm relative z-10">
            {{ isVideo ? 'Memuat Video...' : (props.useOriginal ? 'Memuat Resolusi HD...' : 'Memuat Media...') }}
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

    <!--
      VIDEO — MODE GRID (useOriginal = false, default):
      1. Utamakan thumbnail .webp statis (~15KB) dari backend.
      2. Jika thumbnail .webp belum ada/gagal, fallback ke frame video (#t=0.5 + preload=metadata)
         sehingga gambar cuplikan isi video SELALU tampil & TIDAK PERNAH blank hitam.
    -->
    <template v-else-if="isVideo && !props.useOriginal">
      <!-- 1. Gambar Thumbnail WebP Statis dari Backend -->
      <img
        v-if="videoThumbnailUrl && !videoThumbnailFailed && !hasError"
        :src="videoThumbnailUrl"
        :alt="filename"
        class="relative z-10 w-full h-full transition-opacity duration-500"
        :class="fit === 'contain' ? 'object-contain' : 'object-cover group-hover:scale-110'"
        loading="lazy"
        decoding="async"
        @load="handleMediaLoaded"
        @error="handleVideoThumbnailError"
      />
      <!-- 2. Fallback: Frame Cuplikan Video Browser (#t=0.5) jika thumbnail WebP backend belum ada -->
      <video
        v-else-if="videoStreamingUrl && !hasError"
        :src="videoStreamingUrl + '#t=0.5'"
        preload="metadata"
        muted
        playsinline
        class="relative z-10 w-full h-full pointer-events-none transition-opacity duration-500"
        :class="[
          fit === 'contain' ? 'object-contain' : 'object-cover',
          isLoading ? 'opacity-0' : 'opacity-100'
        ]"
        @loadedmetadata="handleMediaLoaded"
        @loadeddata="handleMediaLoaded"
        @error="handleImageError"
      ></video>
      <!-- 3. Fallback jika semua gagal -->
      <div
        v-else
        class="relative z-10 w-full h-full bg-slate-900 flex items-center justify-center"
      ></div>

      <!-- Play Icon Overlay -->
      <div class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div class="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </template>

    <!--
      VIDEO — MODE LIGHTBOX (useOriginal = true):
      Render <video> aktif hanya saat pengguna membuka detail/lightbox.
      Lazy-load src via Intersection Observer agar tidak auto-request
      ketika elemen belum terlihat di viewport.
    -->
    <video
      v-else-if="isVideo && props.useOriginal"
      ref="videoRef"
      :key="'video-' + filename"
      class="relative z-10 w-full h-full"
      :class="[
        fit === 'contain' ? 'object-contain' : 'object-cover',
        isLoading ? 'opacity-0' : 'opacity-100'
      ]"
      controls
      preload="auto"
      autoplay
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
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
const videoThumbnailFailed = ref(false);

// Ref untuk elemen <video> di mode lightbox (lazy src injection)
const videoRef = ref<HTMLVideoElement | null>(null);
let videoObserver: IntersectionObserver | null = null;

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
    videoThumbnailFailed.value = false;

    // Jika mode lightbox, pasang ulang observer
    if (isVideo.value && props.useOriginal) {
      nextTick(() => setupVideoLazyLoad());
    }
  },
  { immediate: true }
);

// URL Thumbnail WebP ringan (~30KB) untuk Instant Placeholder foto
const thumbnailUrl = computed(() => {
  if (!props.filename || !isPhoto.value) return '';

  const cleanPath = props.filename.replace(/^\/+/, '').replace(/^gallery\/media\//, '').replace(/^gallery\/thumbnail\//, '');
  const baseUrl = `${config.public.apiBase}/gallery/thumbnail/${cleanPath}`;
  const token = authStore.token;

  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

/**
 * URL Thumbnail statis (.webp ~15KB) untuk video di mode grid (useOriginal = false).
 * Mengakses endpoint backend /gallery/thumbnail/... yang mengembalikan static WebP image!
 */
const videoThumbnailUrl = computed(() => {
  if (!props.filename || !isVideo.value) return '';
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

/**
 * URL Streaming Video — hanya dipakai di mode lightbox (useOriginal = true).
 * Di mode grid, URL ini tidak dipakai sehingga tidak ada request ke backend.
 */
const videoStreamingUrl = computed(() => {
  if (!props.filename || !isVideo.value) return '';
  const cleanPath = props.filename.replace(/^\/+/, '').replace(/^gallery\/media\//, '');
  const baseUrl = `${config.public.apiBase}/gallery/media/${cleanPath}`;
  const token = authStore.token;
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
});

/**
 * Lazy load src video hanya saat elemen masuk viewport (Intersection Observer).
 * Ini mencegah browser otomatis preload video yang belum terlihat pengguna.
 */
const setupVideoLazyLoad = () => {
  if (!videoRef.value || !props.useOriginal) return;

  // Cleanup observer lama
  if (videoObserver) {
    videoObserver.disconnect();
    videoObserver = null;
  }

  const url = videoStreamingUrl.value;
  if (!url) return;

  videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && videoRef.value && !videoRef.value.src) {
          videoRef.value.src = url;
          videoRef.value.load();
          videoRef.value.play().catch(() => {});
          videoObserver?.disconnect();
          videoObserver = null;
        }
      });
    },
    { threshold: 0.1 }
  );

  videoObserver.observe(videoRef.value);
};

// Pasang lazy load saat lightbox dibuka
onMounted(() => {
  if (isVideo.value && props.useOriginal) {
    nextTick(() => setupVideoLazyLoad());
  }
});

onUnmounted(() => {
  if (videoObserver) {
    videoObserver.disconnect();
    videoObserver = null;
  }
  // Bersihkan src video agar tidak linger di memory
  if (videoRef.value) {
    videoRef.value.pause();
    videoRef.value.src = '';
    videoRef.value.load();
  }
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

// Jika thumbnail .webp statis backend belum ada / gagal, alihkan ke video frame fallback (#t=0.5)
const handleVideoThumbnailError = () => {
  videoThumbnailFailed.value = true;
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

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite linear;
}
</style>
