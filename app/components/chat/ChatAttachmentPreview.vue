<script setup lang="ts">
/**
 * ChatAttachmentPreview — Preview file sebelum dikirim sebagai lampiran chat.
 * Reusable: digunakan di MessageInput & ThreadPanel (input reply).
 */
import { computed } from 'vue'

interface Props {
  file: File
  progress?: number // 0-100, undefined = belum upload
  uploading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  progress: undefined,
  uploading: false,
  error: null,
})

const emit = defineEmits<{
  (e: 'remove'): void
}>()

// ─── Computed ────────────────────────────────────────────────────────────────

const isImage = computed(() => props.file.type.startsWith('image/'))
const isVideo = computed(() => props.file.type.startsWith('video/'))

/** Format ukuran file */
const formattedSize = computed(() => {
  const bytes = props.file.size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

/** Object URL untuk preview gambar/video */
const previewUrl = computed(() => {
  if (isImage.value || isVideo.value) {
    return URL.createObjectURL(props.file)
  }
  return null
})

/** Ikon file berdasarkan MIME type & ekstensi */
const fileIcon = computed(() => {
  const mime = props.file.type.toLowerCase()
  const ext = (props.file.name.split('.').pop() || '').toLowerCase()

  if (mime.startsWith('image/')) return 'lucide:image'
  if (mime.startsWith('video/')) return 'lucide:film'
  if (mime.startsWith('audio/')) return 'lucide:music'
  if (['xls', 'xlsx', 'csv', 'et'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('xls')) {
    return 'lucide:file-spreadsheet'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz'].includes(ext) || mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) {
    return 'lucide:file-archive'
  }
  if (ext === 'pdf' || mime === 'application/pdf') return 'lucide:file-text'
  if (['doc', 'docx', 'wps'].includes(ext) || mime.includes('word') || mime.includes('wordprocessingml')) return 'lucide:file-text'
  if (['ppt', 'pptx', 'dps'].includes(ext) || mime.includes('powerpoint') || mime.includes('presentation')) return 'lucide:presentation'
  if (['txt', 'json', 'xml', 'js', 'ts'].includes(ext)) return 'lucide:file-code'
  return 'lucide:file'
})

/** Warna ikon berdasarkan tipe */
const iconColor = computed(() => {
  const mime = props.file.type.toLowerCase()
  const ext = (props.file.name.split('.').pop() || '').toLowerCase()

  if (mime.startsWith('image/')) return 'text-blue-500'
  if (mime.startsWith('video/')) return 'text-purple-500'
  if (mime.startsWith('audio/')) return 'text-green-500'
  if (['xls', 'xlsx', 'csv', 'et'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('xls')) {
    return 'text-emerald-500'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz'].includes(ext) || mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) {
    return 'text-amber-500'
  }
  if (ext === 'pdf' || mime === 'application/pdf') return 'text-rose-500'
  if (['doc', 'docx', 'wps'].includes(ext) || mime.includes('word')) return 'text-blue-600'
  if (['ppt', 'pptx', 'dps'].includes(ext) || mime.includes('powerpoint')) return 'text-orange-500'
  return 'text-base-content/60'
})
</script>

<template>
  <div class="relative group/preview flex items-center gap-2 p-2 bg-base-200/70 rounded-xl border border-base-content/10 transition-all"
    :class="error ? 'border-error/40 bg-error/5' : ''">

    <!-- Tombol hapus -->
    <button
      v-if="!uploading"
      type="button"
      class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-sm z-10"
      @click="emit('remove')"
      title="Hapus lampiran"
    >
      <Icon name="lucide:x" class="w-3 h-3" />
    </button>

    <!-- Thumbnail gambar -->
    <div v-if="isImage && previewUrl" class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-base-300">
      <img :src="previewUrl" :alt="file.name" class="w-full h-full object-cover" />
    </div>

    <!-- Thumbnail video -->
    <div v-else-if="isVideo && previewUrl" class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800 flex items-center justify-center relative">
      <video :src="previewUrl" class="w-full h-full object-cover opacity-70" muted />
      <Icon name="lucide:play-circle" class="absolute w-5 h-5 text-white/90" />
    </div>

    <!-- Ikon file lainnya -->
    <div v-else class="w-12 h-12 rounded-lg bg-base-300 flex items-center justify-center flex-shrink-0">
      <Icon :name="fileIcon" class="w-6 h-6" :class="iconColor" />
    </div>

    <!-- Info file -->
    <div class="flex-1 min-w-0 overflow-hidden">
      <p class="text-xs font-semibold text-base-content truncate" :title="file.name">{{ file.name }}</p>

      <!-- Ukuran & status -->
      <div class="flex items-center gap-1.5 mt-0.5">
        <span class="text-[10px] text-base-content/50">{{ formattedSize }}</span>

        <!-- Error -->
        <span v-if="error" class="text-[10px] text-error font-medium truncate">{{ error }}</span>

        <!-- Progress upload -->
        <span v-else-if="uploading" class="text-[10px] text-primary font-semibold">
          {{ progress !== undefined ? `${progress}%` : 'Mengunggah...' }}
        </span>
      </div>

      <!-- Progress bar -->
      <div v-if="uploading && progress !== undefined" class="mt-1 h-1 w-full bg-base-300 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary rounded-full transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- Spinner saat upload -->
    <span v-if="uploading" class="loading loading-spinner loading-xs text-primary flex-shrink-0" />
  </div>
</template>
