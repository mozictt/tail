<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import SecureMedia from '@/components/SecureMedia.vue'

const chatStore = useChatStore()

const media = computed(() => chatStore.lightboxMedia)

const close = () => {
  chatStore.closeLightboxMedia()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const isVideo = computed(() => {
  if (!media.value?.type) return false
  const t = media.value.type.toLowerCase()
  return t === 'video' || t.startsWith('video/') || t === 'mp4' || t === 'webm' || t === 'mov'
})

const isAudio = computed(() => {
  if (!media.value?.type) return false
  const t = media.value.type.toLowerCase()
  return t === 'audio' || t.startsWith('audio/') || t === 'mp3' || t === 'ogg' || t === 'wav'
})

const isFile = computed(() => {
  return !isVideo.value && !isAudio.value && media.value?.type === 'file'
})
</script>

<template>
  <Transition name="lightbox">
    <div
      v-if="media"
      class="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-2xl text-slate-100 select-none overflow-hidden"
      @click.self="close"
    >
      <!-- Top Bar Navigation -->
      <header class="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0 shadow-lg">
            <Icon v-if="isVideo" name="lucide:video" class="w-5 h-5" />
            <Icon v-else-if="isAudio" name="lucide:music" class="w-5 h-5" />
            <Icon v-else-if="isFile" name="lucide:file-text" class="w-5 h-5" />
            <Icon v-else name="lucide:image" class="w-5 h-5" />
          </div>

          <div class="flex flex-col min-w-0">
            <h4 class="text-sm font-bold text-white truncate max-w-xs md:max-w-md">
              {{ media.name || 'Preview Media' }}
            </h4>
            <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {{ media.type || 'Attachment' }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <a
            :href="media.url"
            target="_blank"
            rel="noopener"
            download
            class="btn btn-sm btn-ghost gap-2 text-slate-200 hover:text-white hover:bg-white/10 rounded-xl"
            title="Unduh Berkas"
          >
            <Icon name="lucide:download" class="w-4 h-4" />
            <span class="hidden sm:inline text-xs font-semibold">Unduh</span>
          </a>

          <button
            class="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-white hover:bg-white/15 rounded-xl"
            title="Tutup (Esc)"
            @click="close"
          >
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>
      </header>

      <!-- Center Media Viewport (Sama seperti Lightbox Galeri) -->
      <main class="relative flex-1 w-full h-full flex items-center justify-center p-4 md:p-8 overflow-hidden" @click.self="close">
        <div class="relative max-w-full max-h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <SecureMedia
            :filename="media.url"
            :type="media.type"
            fit="contain"
            :use-original="true"
            class="max-w-full max-h-[85vh] object-contain rounded-2xl"
          />
        </div>
      </main>

      <!-- Footer Help Hint -->
      <footer class="py-2.5 text-center text-xs text-slate-400 border-t border-white/5 bg-slate-950/40">
        Tekan <kbd class="px-1.5 py-0.5 text-[10px] font-semibold bg-white/10 rounded border border-white/20 text-white">Esc</kbd> atau klik di luar untuk menutup preview
      </footer>
    </div>
  </Transition>
</template>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
