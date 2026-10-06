<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useChatSocket } from '@/composables/useChatSocket'
import { useChatService } from '@/services/chatService'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { MessageType } from '@/types/chat'
import type { SendMessageDto } from '@/types/chat'
import ChatAttachmentPreview from '@/components/chat/ChatAttachmentPreview.vue'
import { Paperclip, Send, AtSign } from 'lucide-vue-next'

const props = defineProps<{
  conversationId: string
}>()

const emit = defineEmits<{
  (e: 'send', dto: SendMessageDto): void
}>()

const chatSocket = useChatSocket()
const chatService = useChatService()
const chatStore = useChatStore()
const authStore = useAuthStore()
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

// Mention state
const showMentionMenu = ref(false)
const mentionQuery = ref('')
const mentionSelectedIndex = ref(0)
const mentionedUserIdsSet = ref(new Set<number>())

// ─── Mention Computed ─────────────────────────────────────────────────────────

/** Daftar peserta percakapan aktif yang dapat di-mention (selain diri sendiri) */
const mentionableMembers = computed(() => {
  const conv = chatStore.activeConversation
  if (!conv || !conv.participants) return []
  const myUserId = authStore.id_user ? Number(authStore.id_user) : null
  const myUsername = authStore.username ? authStore.username.toLowerCase() : ''

  return conv.participants
    .map((p) => {
      const uId = Number(p.userId ?? p.user?.id ?? p.id)
      const uName = p.user?.username || p.username || ''
      const dName = p.user?.pegawai?.name || uName || `User #${uId}`
      const photo = p.user?.pegawai?.photo || null
      return {
        userId: uId,
        username: uName,
        displayName: dName,
        photo,
        role: p.role,
      }
    })
    .filter((m) => {
      if (myUserId && m.userId === myUserId) return false
      if (myUsername && m.username.toLowerCase() === myUsername) return false
      return true
    })
})

/** Filter anggota berdasarkan kata kunci setelah @ */
const filteredMentionMembers = computed(() => {
  const q = mentionQuery.value.toLowerCase().trim()
  if (!q) return mentionableMembers.value
  return mentionableMembers.value.filter((m) => {
    return (
      m.username.toLowerCase().includes(q) ||
      m.displayName.toLowerCase().includes(q)
    )
  })
})

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

/** Cek pemicu mention @ saat mengetik */
const checkMentionTrigger = () => {
  if (!textarea.value) return
  const val = content.value
  const cursorPos = textarea.value.selectionStart
  const textBeforeCursor = val.slice(0, cursorPos)

  const lastAtPos = textBeforeCursor.lastIndexOf('@')
  if (lastAtPos === -1) {
    showMentionMenu.value = false
    return
  }

  // Syarat: @ harus di awal teks atau diawali spasi/newline
  const charBeforeAt = lastAtPos > 0 ? textBeforeCursor[lastAtPos - 1] : ' '
  if (!/\s/.test(charBeforeAt)) {
    showMentionMenu.value = false
    return
  }

  const query = textBeforeCursor.slice(lastAtPos + 1)
  if (/\s/.test(query)) {
    showMentionMenu.value = false
    return
  }

  mentionQuery.value = query
  mentionSelectedIndex.value = 0
  showMentionMenu.value = filteredMentionMembers.value.length > 0
}

/** Pilih anggota untuk di-mention */
const selectMention = (member: { userId: number; username: string; displayName: string }) => {
  if (!textarea.value) return
  const val = content.value
  const cursorPos = textarea.value.selectionStart
  const textBeforeCursor = val.slice(0, cursorPos)
  const textAfterCursor = val.slice(cursorPos)
  const lastAtPos = textBeforeCursor.lastIndexOf('@')

  const mentionName = member.username || member.displayName.replace(/\s+/g, '_')
  const insertedText = `@${mentionName} `

  const newTextBefore = textBeforeCursor.slice(0, lastAtPos) + insertedText
  content.value = newTextBefore + textAfterCursor
  mentionedUserIdsSet.value.add(member.userId)

  showMentionMenu.value = false
  nextTick(() => {
    if (!textarea.value) return
    const newCursorPos = newTextBefore.length
    textarea.value.focus()
    textarea.value.setSelectionRange(newCursorPos, newCursorPos)
    autoResize()
  })
}

/** Buka menu mention secara manual via tombol @ */
const triggerManualMention = () => {
  if (!textarea.value) return
  const cursorPos = textarea.value.selectionStart
  const val = content.value
  const textBefore = val.slice(0, cursorPos)
  const textAfter = val.slice(cursorPos)

  const prefix = textBefore.endsWith(' ') || textBefore === '' ? '' : ' '
  content.value = textBefore + prefix + '@' + textAfter

  nextTick(() => {
    if (!textarea.value) return
    const newPos = textBefore.length + prefix.length + 1
    textarea.value.focus()
    textarea.value.setSelectionRange(newPos, newPos)
    checkMentionTrigger()
  })
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

  const mentionedUserIds = Array.from(mentionedUserIdsSet.value)

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
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      }

      emit('send', dto)
      content.value = ''
      pendingFile.value = null
      uploadProgress.value = 0
      mentionedUserIdsSet.value.clear()
      showMentionMenu.value = false
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
    mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
  }

  emit('send', dto)
  content.value = ''
  mentionedUserIdsSet.value.clear()
  showMentionMenu.value = false

  nextTick(() => {
    if (textarea.value) textarea.value.style.height = 'auto'
  })

  chatSocket.stopTyping({ conversationId: props.conversationId })
  if (typingTimeout) clearTimeout(typingTimeout)
}

/** Navigation keyboard untuk mention & Enter untuk kirim */
const onKeydown = (e: KeyboardEvent) => {
  if (showMentionMenu.value && filteredMentionMembers.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionSelectedIndex.value = (mentionSelectedIndex.value + 1) % filteredMentionMembers.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionSelectedIndex.value = (mentionSelectedIndex.value - 1 + filteredMentionMembers.value.length) % filteredMentionMembers.value.length
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const selected = filteredMentionMembers.value[mentionSelectedIndex.value]
      if (selected) selectMention(selected)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      showMentionMenu.value = false
      return
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

/** Emit typing indicator ke server & check mention trigger */
const onInput = () => {
  autoResize()
  checkMentionTrigger()
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
  <div class="border-t border-base-content/10 bg-base-100 px-4 py-3 relative">

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

    <!-- Dropdown list mention anggota -->
    <div
      v-if="showMentionMenu && filteredMentionMembers.length > 0"
      class="mb-2 bg-base-100 border border-base-content/15 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto z-40 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div class="px-3.5 py-2 text-[11px] font-bold text-base-content/60 border-b border-base-content/10 bg-base-200/50 flex items-center justify-between">
        <span class="flex items-center gap-1.5">
          <AtSign class="w-3.5 h-3.5 text-primary" />
          Mention Anggota Grup
        </span>
        <span class="text-[10px] font-normal opacity-70">↑ ↓ Pindah · Enter Pilih</span>
      </div>
      <div class="p-1 space-y-0.5">
        <button
          v-for="(member, idx) in filteredMentionMembers"
          :key="member.userId"
          type="button"
          class="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left transition-colors text-xs"
          :class="idx === mentionSelectedIndex ? 'bg-primary text-primary-content font-semibold' : 'hover:bg-base-200 text-base-content'"
          @click="selectMention(member)"
          @mouseenter="mentionSelectedIndex = idx"
        >
          <!-- Avatar -->
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
            :class="idx === mentionSelectedIndex ? 'bg-primary-content/20 text-primary-content' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'"
          >
            {{ member.displayName[0]?.toUpperCase() ?? '?' }}
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-bold truncate">{{ member.displayName }}</span>
              <span
                v-if="member.role === 'admin'"
                class="px-1.5 py-0.2 text-[9px] font-bold rounded-md"
                :class="idx === mentionSelectedIndex ? 'bg-primary-content/30 text-primary-content' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'"
              >
                Admin
              </span>
            </div>
            <span class="text-[10px] opacity-75 block truncate">@{{ member.username || member.displayName }}</span>
          </div>
        </button>
      </div>
    </div>

    <div class="flex items-end gap-2.5">
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

      <!-- Tombol mention @ -->
      <button
        v-if="mentionableMembers.length > 0"
        id="chat-mention-button"
        type="button"
        class="btn btn-ghost btn-sm btn-circle flex-shrink-0 text-base-content/50 hover:text-primary hover:bg-primary/10 transition-all"
        :disabled="isUploading"
        title="Mention anggota (@)"
        @click="triggerManualMention"
      >
        <AtSign class="w-5 h-5" />
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
          :placeholder="pendingFile ? 'Tambahkan caption (opsional)...' : 'Ketik pesan... Ketik @ untuk mention'"
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
    <p class="text-[10px] text-base-content/40 mt-1.5 ml-1">
      Enter untuk kirim · Shift+Enter untuk baris baru · @ Mention anggota · 📎 Lampirkan file
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
