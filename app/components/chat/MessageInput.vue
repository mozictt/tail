<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useChatSocket } from '@/composables/useChatSocket'
import { useChatService } from '@/services/chatService'
import { useToast } from '@/composables/useToast'
import { MessageType } from '@/types/chat'
import type { SendMessageDto } from '@/types/chat'
import ChatAttachmentPreview from '@/components/chat/ChatAttachmentPreview.vue'
import { Paperclip, Send } from 'lucide-vue-next'

const props = defineProps<{
  conversationId: string
}>()

const emit = defineEmits<{
  (e: 'send', dto: SendMessageDto): void
}>()

const chatSocket = useChatSocket()
const chatService = useChatService()
const toast = useToast()

// ─── State ────────────────────────────────────────────────────────────────────

const content = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
let typingTimeout: ReturnType<typeof setTimeout> | null = null

// Attachment state
const pendingFile = ref<File | null>(null)
const uploadProgress = ref(0)
const isUploading = ref(false)
const uploadError = ref<string | null>(null)

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** Maks 50 MB per file attachment chat */
const MAX_FILE_SIZE = 50 * 1024 * 1024

const ALLOWED_TYPES = [
  // Gambar
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  // Video
  'video/mp4', 'video/webm', 'video/quicktime', 'video/avi',
  // Audio
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  // Dokumen & WPS Office
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/wps-office.xls',
  'application/wps-office.xlsx',
  'application/wps-office.doc',
  'application/wps-office.docx',
  'application/wps-office.ppt',
  'application/wps-office.pptx',
  'application/wps-office.wps',
  'application/wps-office.et',
  'application/wps-office.dps',
  'application/wps-office.pdf',
  'text/plain',
  'application/zip',
]

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif',
  '.mp4', '.webm', '.mov', '.avi',
  '.mp3', '.ogg', '.wav',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.wps', '.et', '.dps', '.txt', '.zip', '.rar'
]

// ─── Computed ─────────────────────────────────────────────────────────────────

const canSend = computed(() => {
  if (isUploading.value) return false
  if (pendingFile.value) return true // Bisa kirim file saja tanpa teks
  return content.value.trim().length > 0
})

// ─── Methods ──────────────────────────────────────────────────────────────────

/** Auto-resize textarea */
const autoResize = () => {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = Math.min(textarea.value.scrollHeight, 150) + 'px'
}

/**
 * Tentukan MessageType berdasarkan MIME type file.
 */
const resolveMessageType = (file: File): MessageType => {
  if (file.type.startsWith('image/')) return MessageType.IMAGE
  if (file.type.startsWith('video/')) return MessageType.VIDEO
  if (file.type.startsWith('audio/')) return MessageType.AUDIO
  return MessageType.FILE
}

/**
 * Kirim pesan teks / attachment.
 * Jika ada file pending → upload terlebih dahulu → baru kirim pesan.
 */
const send = async () => {
  if (!canSend.value) return

  // ─── Kasus 1: Ada file attachment ────────────────────────────────────────
  if (pendingFile.value) {
    isUploading.value = true
    uploadProgress.value = 0
    uploadError.value = null

    try {
      const result = await chatService.uploadAttachment(pendingFile.value, (pct) => {
        uploadProgress.value = pct
      })

      const dto: SendMessageDto = {
        type: resolveMessageType(pendingFile.value),
        attachmentUrl: result.url,
        attachmentName: result.originalName || result.fileName,
        content: content.value.trim() || undefined,
      }

      emit('send', dto)
      content.value = ''
      pendingFile.value = null
      uploadProgress.value = 0
    } catch (err: any) {
      uploadError.value = err?.message || 'Gagal mengunggah file'
      toast.showToast(uploadError.value!, 'error')
    } finally {
      isUploading.value = false
      nextTick(() => {
        if (textarea.value) textarea.value.style.height = 'auto'
      })
    }
    return
  }

  // ─── Kasus 2: Pesan teks biasa ───────────────────────────────────────────
  const text = content.value.trim()
  if (!text) return

  const dto: SendMessageDto = {
    content: text,
    type: MessageType.TEXT,
  }

  emit('send', dto)
  content.value = ''
  nextTick(() => {
    if (textarea.value) textarea.value.style.height = 'auto'
  })

  chatSocket.stopTyping({ conversationId: props.conversationId })
  if (typingTimeout) clearTimeout(typingTimeout)
}

/** Enter untuk kirim (Shift+Enter untuk baris baru) */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

/** Emit typing indicator ke server */
const onInput = () => {
  autoResize()
  chatSocket.startTyping({ conversationId: props.conversationId })

  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    chatSocket.stopTyping({ conversationId: props.conversationId })
  }, 2000)
}

/**
 * Buka dialog pilih file.
 */
const openFilePicker = () => {
  fileInput.value?.click()
}

/**
 * Validasi dan set file yang dipilih.
 */
const onFileSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Reset input agar file yang sama bisa dipilih ulang
  input.value = ''

  if (file.size > MAX_FILE_SIZE) {
    toast.showToast(`File terlalu besar. Maksimal 50 MB per lampiran.`, 'error')
    return
  }

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const isAllowedMime = file.type ? ALLOWED_TYPES.includes(file.type) : false
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext)

  if (!isAllowedMime && !isAllowedExt) {
    toast.showToast(`Format file tidak didukung: ${file.type || ext}`, 'error')
    return
  }

  pendingFile.value = file
  uploadError.value = null
}

/** Hapus file yang dipilih */
const removePendingFile = () => {
  pendingFile.value = null
  uploadProgress.value = 0
  uploadError.value = null
}

/** Paste gambar dari clipboard */
const onPaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        if (file.size > MAX_FILE_SIZE) {
          toast.showToast('Gambar terlalu besar. Maksimal 50 MB.', 'error')
          return
        }
        pendingFile.value = new File([file], `clipboard-${Date.now()}.png`, { type: file.type })
        uploadError.value = null
      }
      break
    }
  }
}

/** Focus textarea saat conversation berubah */
watch(
  () => props.conversationId,
  () => {
    nextTick(() => textarea.value?.focus())
    // Reset attachment saat pindah conversation
    pendingFile.value = null
    uploadProgress.value = 0
    uploadError.value = null
    content.value = ''
  },
  { immediate: true },
)
</script>

<template>
  <div class="border-t border-base-content/10 bg-base-100 px-4 py-3">

    <!-- Preview attachment yang dipilih -->
    <div v-if="pendingFile" class="mb-2">
      <ChatAttachmentPreview
        :file="pendingFile"
        :progress="uploadProgress"
        :uploading="isUploading"
        :error="uploadError"
        @remove="removePendingFile"
      />
    </div>

    <div class="flex items-end gap-3">
      <!-- Tombol lampirkan file -->
      <button
        id="chat-attach-button"
        type="button"
        class="btn btn-ghost btn-sm btn-circle flex-shrink-0 text-base-content/50 hover:text-primary hover:bg-primary/10 transition-all"
        :disabled="isUploading || !!pendingFile"
        title="Lampirkan file (gambar, video, dokumen)"
        @click="openFilePicker"
      >
        <Paperclip class="w-5 h-5" />
      </button>

      <!-- Input file tersembunyi -->
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="ALLOWED_TYPES.join(',')"
        @change="onFileSelected"
      />

      <!-- Input area -->
      <div class="flex-1 bg-base-200/60 border border-base-content/10 rounded-2xl px-4 py-2.5 flex items-end gap-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition">
        <textarea
          id="chat-message-input"
          ref="textarea"
          v-model="content"
          :placeholder="pendingFile ? 'Tambahkan caption (opsional)...' : 'Ketik pesan...'"
          rows="1"
          class="flex-1 bg-transparent outline-none resize-none text-sm text-base-content placeholder:text-base-content/40 leading-relaxed max-h-[150px] overflow-y-auto scrollbar-thin"
          :disabled="isUploading"
          @keydown="onKeydown"
          @input="onInput"
          @paste="onPaste"
        />
      </div>

      <!-- Send button -->
      <button
        id="chat-send-button"
        class="btn btn-primary rounded-2xl w-11 h-11 p-0 min-h-0 flex items-center justify-center flex-shrink-0 transition-all duration-150"
        :class="canSend ? 'opacity-100 scale-100' : 'opacity-50 scale-95'"
        :disabled="!canSend"
        :title="isUploading ? 'Mengunggah...' : 'Kirim pesan (Enter)'"
        @click="send"
      >
        <span v-if="isUploading" class="loading loading-spinner loading-sm" />
        <Send v-else class="w-5 h-5 ml-0.5" />
      </button>
    </div>

    <!-- Helper text -->
    <p class="text-[10px] text-base-content/30 mt-1.5 ml-1">
      Enter untuk kirim · Shift+Enter untuk baris baru · 📎 Lampirkan file (maks 50 MB)
    </p>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 3px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 2px;
}
</style>
