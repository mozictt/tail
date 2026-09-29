<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useChatService } from '@/services/chatService'
import { useToast } from '@/composables/useToast'
import { useApi } from '@/composables/useApi'
import { MessageType } from '@/types/chat'
import { useChatSocket } from '@/composables/useChatSocket'
import ChatAttachmentPreview from '@/components/chat/ChatAttachmentPreview.vue'
import SecureMedia from '@/components/SecureMedia.vue'
import { FileText, FileSpreadsheet, FileArchive, FileCode, File, Presentation, Download, Paperclip, Send } from 'lucide-vue-next'

const chatStore = useChatStore()
const authStore = useAuthStore()
const chatService = useChatService()
const chatSocket = useChatSocket()
const toast = useToast()

const replyContent = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)

// ─── Attachment State (Thread Reply) ──────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const uploadProgress = ref(0)
const isUploading = ref(false)
const uploadError = ref<string | null>(null)
const isDownloadingFile = ref(false)

/** Mengunduh file dokumen langsung via Blob (konsep /pos/dokumen) */
const handleDownloadFile = async (urlStr?: string, nameStr?: string) => {
  if (!urlStr) return
  try {
    isDownloadingFile.value = true
    const fileName = nameStr || 'lampiran-dokumen'
    const api = useApi()

    let cleanPath = urlStr
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
      try {
        const parsed = new URL(urlStr)
        cleanPath = parsed.pathname + parsed.search
      } catch {
        cleanPath = urlStr
      }
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = `/${cleanPath}`
    }

    const res = await api(cleanPath, { responseType: 'blob' })
    const blobUrl = window.URL.createObjectURL(res as Blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
    toast.success('Dokumen berhasil diunduh')
  } catch (err) {
    console.error('Gagal mengunduh dokumen:', err)
    toast.error('Gagal mengunduh dokumen')
  } finally {
    isDownloadingFile.value = false
  }
}

/** Mengembalikan ikon komponen dan styling warna badge file berdasarkan ekstensi & mime type */
const getFileIconConfig = (fileName?: string, mimeType?: string) => {
  const name = fileName || ''
  const ext = (name.split('.').pop() || '').toLowerCase()
  const mime = (mimeType || '').toLowerCase()

  if (['xls', 'xlsx', 'csv', 'et'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('xls')) {
    return {
      component: FileSpreadsheet,
      bgClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    }
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz'].includes(ext) || mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) {
    return {
      component: FileArchive,
      bgClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    }
  }
  if (['ppt', 'pptx', 'dps'].includes(ext) || mime.includes('powerpoint') || mime.includes('presentation')) {
    return {
      component: Presentation,
      bgClass: 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
    }
  }
  if (['txt', 'json', 'xml', 'js', 'ts', 'html', 'css'].includes(ext)) {
    return {
      component: FileCode,
      bgClass: 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
    }
  }
  if (ext === 'pdf' || mime.includes('pdf')) {
    return {
      component: FileText,
      bgClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    }
  }
  if (['doc', 'docx', 'wps'].includes(ext) || mime.includes('word') || mime.includes('wordprocessingml')) {
    return {
      component: FileText,
      bgClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    }
  }

  return {
    component: File,
    bgClass: 'bg-primary/20 text-primary border border-primary/30'
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
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
  'text/plain', 'application/zip',
]

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif',
  '.mp4', '.webm', '.mov', '.avi',
  '.mp3', '.ogg', '.wav',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.wps', '.et', '.dps', '.txt', '.zip', '.rar'
]

const canSendReply = computed(() => {
  if (isSubmitting.value || isUploading.value) return false
  if (pendingFile.value) return true
  return replyContent.value.trim().length > 0
})

const resolveMessageType = (file: File): MessageType => {
  if (file.type.startsWith('image/')) return MessageType.IMAGE
  if (file.type.startsWith('video/')) return MessageType.VIDEO
  if (file.type.startsWith('audio/')) return MessageType.AUDIO
  return MessageType.FILE
}

const openFilePicker = () => fileInput.value?.click()

const onFileSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  if (file.size > MAX_FILE_SIZE) {
    toast.error('File terlalu besar. Maksimal 50 MB.')
    return
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const isAllowedMime = file.type ? ALLOWED_TYPES.includes(file.type) : false
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext)

  if (!isAllowedMime && !isAllowedExt) {
    toast.error(`Format file tidak didukung: ${file.type || ext}`)
    return
  }
  pendingFile.value = file
  uploadError.value = null
}

const removePendingFile = () => {
  pendingFile.value = null
  uploadProgress.value = 0
  uploadError.value = null
}

const activeMessage = computed(() => chatStore.activeThreadMessage)
const replies = computed(() => chatStore.activeThreadReplies)
const conversationId = computed(() => chatStore.activeConversationId)

/** Sender name untuk parent message */
const parentSenderName = computed(() => {
  if (!activeMessage.value) return '?'
  const m = activeMessage.value as any
  return m.senderUsername || m.sender?.pegawai?.name || m.sender?.username || `User #${m.senderId}`
})

/** Format waktu singkat */
const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

/** Format tanggal untuk divider */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hari ini'
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
}

/** Kelompokkan balasan berdasarkan tanggal */
const groupedReplies = computed(() => {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  for (const reply of replies.value) {
    const dateKey = new Date(reply.createdAt).toDateString()
    const existing = groups.find((g) => g.date === dateKey)
    if (existing) {
      existing.messages.push(reply)
    } else {
      groups.push({ date: dateKey, messages: [reply] })
    }
  }
  return groups
})

/** Auto-resize textarea */
const autoResize = () => {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = Math.min(textarea.value.scrollHeight, 120) + 'px'
}

/** Scroll ke bawah daftar reply */
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (!scrollContainer.value) return
    scrollContainer.value.scrollTo({
      top: scrollContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  })
}

/** Kirim balasan thread — mendukung teks dan attachment file */
const sendReply = async () => {
  if (!canSendReply.value || !conversationId.value || !activeMessage.value) return

  // ─── Kasus 1: Ada file attachment ──────────────────────────────────────────
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
        content: replyContent.value.trim() || undefined,
        parentMessageId: activeMessage.value.id,
      }

      if (chatSocket.isConnected.value) {
        chatSocket.sendMessage({ conversationId: conversationId.value, message: dto })
      } else {
        const savedMsg = await chatService.sendMessage(conversationId.value, dto)
        if (savedMsg) chatStore.appendMessage(savedMsg as ChatMessage)
      }

      replyContent.value = ''
      pendingFile.value = null
      uploadProgress.value = 0
      nextTick(() => {
        if (textarea.value) textarea.value.style.height = 'auto'
        scrollToBottom(true)
      })
    } catch (err: any) {
      uploadError.value = err?.message || 'Gagal mengunggah file'
      toast.error(uploadError.value!)
    } finally {
      isUploading.value = false
    }
    return
  }

  // ─── Kasus 2: Pesan teks biasa ─────────────────────────────────────────────
  const text = replyContent.value.trim()
  if (!text) return

  const dto: SendMessageDto = {
    content: text,
    type: MessageType.TEXT,
    parentMessageId: activeMessage.value.id,
  }

  isSubmitting.value = true
  const sentText = replyContent.value
  replyContent.value = ''

  try {
    if (chatSocket.isConnected.value) {
      chatSocket.sendMessage({
        conversationId: conversationId.value,
        message: dto,
      })
    } else {
      const savedMsg = await chatService.sendMessage(conversationId.value, dto)
      if (savedMsg) {
        chatStore.appendMessage(savedMsg as ChatMessage)
      }
    }
    nextTick(() => {
      if (textarea.value) textarea.value.style.height = 'auto'
      scrollToBottom(true)
    })
  } catch (err: any) {
    replyContent.value = sentText
    toast.error(err?.data?.message || 'Gagal mengirim balasan thread')
  } finally {
    isSubmitting.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendReply()
  }
}

/** Cek apakah reply milik user sendiri */
const isSelf = (reply: any): boolean => {
  const myId = authStore.id_user
  const myUsername = authStore.username
  const sId =
    reply.senderId ||
    reply.sender?.id ||
    reply.sender_id ||
    reply.userId ||
    reply.user_id ||
    reply.user?.id
  if (myId && sId != null && String(sId) === String(myId)) return true
  const sUsername =
    reply.senderUsername ||
    reply.sender?.username ||
    reply.username ||
    reply.user?.username ||
    ''
  if (myUsername && sUsername && sUsername === myUsername) return true
  return false
}

/** Nama pengirim dari reply */
const getSenderName = (reply: any): string =>
  reply.senderUsername ||
  reply.sender?.pegawai?.name ||
  reply.sender?.username ||
  `User #${reply.senderId}`

/** Warna avatar deterministik berdasarkan nama */
const getAvatarColor = (name: string) => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-green-500 to-emerald-600',
    'from-sky-500 to-blue-600',
  ]
  let hash = 0
  for (const ch of name) { hash = (hash << 5) - hash + ch.charCodeAt(0); hash |= 0 }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Tampilkan header sender jika berbeda dari pesan sebelumnya
 * atau jika jeda waktu > 5 menit.
 */
const showSenderHeader = (reply: any, idx: number, list: any[]): boolean => {
  if (idx === 0) return true
  const prev = list[idx - 1]
  const prevSId = prev.senderId || prev.sender?.id || prev.sender_id || prev.userId || prev.user_id
  const currSId = reply.senderId || reply.sender?.id || reply.sender_id || reply.userId || reply.user_id
  if (String(prevSId) !== String(currSId)) return true
  const gap = new Date(reply.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return gap > 5 * 60 * 1000
}

// Auto scroll saat ada reply baru atau target highlight dari notifikasi
const scrollToThreadHighlight = () => {
  const targetId = chatStore.highlightedMessageId
  if (!targetId) return
  nextTick(() => {
    setTimeout(() => {
      const el =
        document.getElementById(`thread-msg-${targetId}`) ||
        document.getElementById(`thread-root-${targetId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 200)
  })
}

watch(
  () => chatStore.highlightedMessageId,
  (val) => {
    if (val) scrollToThreadHighlight()
  },
  { immediate: true },
)

watch(
  () => replies.value.length,
  () => {
    if (chatStore.highlightedMessageId) {
      scrollToThreadHighlight()
    } else {
      scrollToBottom(true)
    }
  },
)

onMounted(() => {
  if (chatStore.highlightedMessageId) {
    scrollToThreadHighlight()
  } else {
    scrollToBottom()
  }
})
</script>

<template>
  <!-- Thread Panel — Google Chat / Modern Overlay Style -->
  <div class="absolute inset-0 z-30 flex">
    <!-- Backdrop — klik untuk tutup -->
    <div
      class="absolute inset-0 bg-base-300/10 backdrop-blur-[1px]"
      @click="chatStore.closeThread()"
    />

    <!-- Panel -->
    <div class="relative ml-auto flex flex-col w-full max-w-[360px] md:max-w-[400px] h-full bg-base-100 shadow-2xl border-l border-base-content/10 z-10">

      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3.5 border-b border-base-content/10 bg-base-100/95 backdrop-blur-sm flex-shrink-0">
        <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <Icon name="lucide:message-square-reply" class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-sm text-base-content">Thread</h3>
          <p class="text-[11px] text-base-content/50">
            {{ replies.length > 0 ? `${replies.length} balasan` : 'Belum ada balasan' }}
          </p>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content flex-shrink-0"
          title="Tutup Thread"
          @click="chatStore.closeThread()"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto scrollbar-thin">

        <!-- Pesan Induk -->
        <div
          v-if="activeMessage"
          class="mx-3 mt-4 mb-1 rounded-2xl border border-base-content/8 bg-base-200/40"
        >
          <div class="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
            <div
              class="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              :class="getAvatarColor(parentSenderName)"
            >
              {{ parentSenderName[0]?.toUpperCase() ?? '?' }}
            </div>
            <div class="flex items-baseline gap-1.5 min-w-0">
              <span class="text-xs font-bold text-base-content truncate">{{ parentSenderName }}</span>
              <span class="text-[10px] text-base-content/35 flex-shrink-0">
                {{ formatTime(activeMessage.createdAt) }}
              </span>
            </div>
          </div>
          <p class="text-sm text-base-content/80 leading-relaxed break-words px-3.5 pb-3 mt-0.5">
            {{ activeMessage.content }}
          </p>
        </div>

        <!-- Divider -->
        <div v-if="replies.length > 0" class="flex items-center gap-2 px-4 mt-4 mb-2">
          <div class="h-px flex-1 bg-base-content/10" />
          <span class="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider whitespace-nowrap">
            {{ replies.length }} Balasan
          </span>
          <div class="h-px flex-1 bg-base-content/10" />
        </div>

        <!-- Loading -->
        <div v-if="chatStore.isLoadingThread" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-md text-primary" />
        </div>

        <!-- Empty -->
        <div
          v-else-if="replies.length === 0 && !chatStore.isLoadingThread"
          class="flex flex-col items-center justify-center py-10 px-6 text-center"
        >
          <div class="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-3 text-primary/40">
            <Icon name="lucide:messages-square" class="w-6 h-6" />
          </div>
          <p class="text-sm font-semibold text-base-content/50">Belum ada balasan</p>
          <p class="text-[11px] text-base-content/35 mt-1">Jadilah yang pertama membalas!</p>
        </div>

        <!-- Replies -->
        <template v-else>
          <template v-for="group in groupedReplies" :key="group.date">
            <div v-if="groupedReplies.length > 1" class="flex items-center gap-2 px-4 my-3">
              <div class="h-px flex-1 bg-base-content/8" />
              <span class="text-[10px] font-medium text-base-content/35 whitespace-nowrap">
                {{ formatDate(group.messages[0]!.createdAt) }}
              </span>
              <div class="h-px flex-1 bg-base-content/8" />
            </div>

            <div
              v-for="(reply, idx) in group.messages"
              :key="reply.id"
              :id="'thread-msg-' + reply.id"
              class="group/reply px-4 py-1 flex flex-col transition-all"
              :class="isSelf(reply) ? 'items-end' : 'items-start'"
            >
              <!-- Sender header untuk orang lain -->
              <div
                v-if="!isSelf(reply) && showSenderHeader(reply, idx, group.messages)"
                class="flex items-center gap-2 mb-1 ml-0.5 mt-1"
              >
                <div
                  class="w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  :class="getAvatarColor(getSenderName(reply))"
                >
                  {{ getSenderName(reply)[0]?.toUpperCase() ?? '?' }}
                </div>
                <span class="text-xs font-bold text-base-content truncate max-w-[180px]">
                  {{ getSenderName(reply) }}
                </span>
              </div>

              <!-- Sender header untuk pesan sendiri -->
              <div
                v-if="isSelf(reply) && showSenderHeader(reply, idx, group.messages)"
                class="flex items-center gap-1.5 mb-1 mr-0.5 justify-end mt-1"
              >
                <span class="text-xs font-bold text-primary">
                  Anda
                </span>
              </div>

              <!-- Content / Bubble -->
              <div
                class="relative rounded-2xl px-3.5 pt-2 pb-1.5 text-sm leading-relaxed break-words max-w-[85%] shadow-xs transition-all duration-300"
                :class="[
                  String(chatStore.highlightedMessageId) === String(reply.id)
                    ? 'ring-4 ring-amber-400 dark:ring-amber-500 bg-amber-100 text-slate-900 dark:bg-amber-950 dark:text-amber-100 shadow-xl scale-[1.02] animate-pulse'
                    : isSelf(reply)
                    ? 'bg-primary text-primary-content rounded-tr-xs'
                    : 'bg-base-200 text-base-content rounded-tl-xs border border-base-content/5',
                  reply.isDeleted ? 'italic opacity-70' : '',
                ]"
              >
                <template v-if="reply.isDeleted">
                  <Icon name="lucide:ban" class="w-3.5 h-3.5 inline mr-1 opacity-70" />
                  Pesan dihapus
                </template>
                <!-- Image (Thread Reply) -->
                <template v-else-if="(reply.type === MessageType.IMAGE || reply.type === 'image') && reply.attachmentUrl">
                  <div
                    class="relative rounded-xl overflow-hidden cursor-pointer group/media max-w-[220px] aspect-[4/3] bg-slate-950 border border-white/10 shadow-md my-1"
                    @click="chatStore.openLightboxMedia({ url: reply.attachmentUrl, name: reply.attachmentName ?? 'Foto Thread', type: 'photo' })"
                  >
                    <SecureMedia
                      :filename="reply.attachmentUrl"
                      type="photo"
                      fit="cover"
                      class="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                    />
                  </div>
                  <p v-if="reply.content" class="mt-1 text-sm">{{ reply.content }}</p>
                </template>

                <!-- Video (Thread Reply) -->
                <template v-else-if="(reply.type === MessageType.VIDEO || reply.type === 'video') && reply.attachmentUrl">
                  <div
                    class="relative rounded-xl overflow-hidden cursor-pointer group/media max-w-[220px] aspect-video bg-slate-950 border border-white/10 shadow-md my-1"
                    @click="chatStore.openLightboxMedia({ url: reply.attachmentUrl, name: reply.attachmentName ?? 'Video Thread', type: 'video' })"
                  >
                    <SecureMedia
                      :filename="reply.attachmentUrl"
                      type="video"
                      fit="cover"
                      class="w-full h-full object-cover"
                    />
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <div class="w-10 h-10 rounded-full bg-primary/90 text-primary-content flex items-center justify-center shadow-lg group-hover/media:scale-110 transition-transform">
                        <Icon name="lucide:play" class="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p v-if="reply.content" class="mt-1 text-sm">{{ reply.content }}</p>
                </template>

                <!-- File (Thread Reply) -->
                <template v-else-if="(reply.type === MessageType.FILE || reply.type === 'file') && reply.attachmentUrl">
                  <div
                    class="flex items-center gap-2.5 p-2.5 rounded-lg bg-base-300/40 border border-base-content/10 hover:bg-base-300/70 transition-all my-1 cursor-pointer"
                    @click="handleDownloadFile(reply.attachmentUrl, reply.attachmentName)"
                  >
                    <div
                      class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm"
                      :class="getFileIconConfig(reply.attachmentName, reply.mimeType).bgClass"
                    >
                      <component :is="getFileIconConfig(reply.attachmentName, reply.mimeType).component" class="w-4 h-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-bold truncate">{{ reply.attachmentName ?? 'File' }}</p>
                      <span class="text-[10px] opacity-60">Klik untuk unduh berkas</span>
                    </div>
                    <button
                      type="button"
                      class="btn btn-xs btn-ghost btn-circle text-primary"
                      title="Unduh Berkas"
                      :disabled="isDownloadingFile"
                    >
                      <Download class="w-4 h-4 text-primary" />
                    </button>
                  </div>
                  <p v-if="reply.content" class="mt-1 text-sm">{{ reply.content }}</p>
                </template>
                <template v-else>
                  <span>{{ reply.content }}</span>
                  <span v-if="reply.isEdited" class="text-[10px] opacity-70 ml-1">(diedit)</span>
                </template>

                <!-- Time inside bubble -->
                <div
                  class="inline-flex items-center gap-1 float-right mt-1.5 ml-3 -mb-0.5"
                  :class="isSelf(reply) ? 'text-primary-content/75' : 'text-base-content/50'"
                >
                  <span class="text-[10px] leading-none">{{ formatTime(reply.createdAt) }}</span>
                </div>
                <div class="clear-both" />
              </div>
            </div>
          </template>
          <div class="h-4" />
        </template>
      </div>

      <!-- Footer / Input -->
      <div class="px-3 py-3 border-t border-base-content/10 bg-base-100 flex-shrink-0">
        <div class="flex items-center gap-1.5 mb-2 px-1">
          <Icon name="lucide:corner-down-right" class="w-3 h-3 text-primary/50 flex-shrink-0" />
          <span class="text-[10px] text-base-content/45 truncate">
            Balas thread
            <span v-if="activeMessage" class="font-semibold text-base-content/60">
              {{ parentSenderName }}
            </span>
          </span>
        </div>

        <!-- Preview attachment yang dipilih untuk reply -->
        <div v-if="pendingFile" class="mb-2">
          <ChatAttachmentPreview
            :file="pendingFile"
            :progress="uploadProgress"
            :uploading="isUploading"
            :error="uploadError"
            @remove="removePendingFile"
          />
        </div>

        <div class="flex items-end gap-2">
          <!-- Tombol lampirkan file -->
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle flex-shrink-0 text-base-content/50 hover:text-primary hover:bg-primary/10 transition-all"
            :disabled="isUploading || !!pendingFile"
            title="Lampirkan file"
            @click="openFilePicker"
          >
            <Paperclip class="w-4 h-4" />
          </button>
          <input ref="fileInput" type="file" class="hidden" :accept="ALLOWED_TYPES.join(',')" @change="onFileSelected" />

          <!-- Input area -->
          <div class="flex-1 flex items-end gap-2 bg-base-200/50 border border-base-content/10 rounded-2xl px-3.5 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <textarea
              ref="textarea"
              v-model="replyContent"
              :placeholder="pendingFile ? 'Tambahkan caption (opsional)...' : 'Ketik balasan... (Enter untuk kirim)'"
              rows="1"
              class="flex-1 bg-transparent outline-none resize-none text-sm text-base-content placeholder:text-base-content/35 leading-relaxed max-h-[120px] overflow-y-auto scrollbar-thin"
              :disabled="isUploading"
              @keydown="onKeydown"
              @input="autoResize"
            />
            <button
              class="btn btn-primary btn-sm btn-circle flex-shrink-0 transition-all duration-150"
              :class="canSendReply ? 'opacity-100 scale-100' : 'opacity-40 scale-95'"
              :disabled="!canSendReply"
              title="Kirim Balasan (Enter)"
              @click="sendReply"
            >
              <span v-if="isSubmitting || isUploading" class="loading loading-spinner loading-xs" />
              <Send v-else class="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.12);
  border-radius: 2px;
}
</style>
