<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useChatService } from '@/services/chatService'
import { useToast } from '@/composables/useToast'
import { useApi } from '@/composables/useApi'
import type { ChatMessage } from '@/types/chat'
import { MessageType } from '@/types/chat'
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  Presentation,
  Download,
  MessageSquareReply,
  MoreVertical,
  Smile,
  Pencil,
  Trash2,
  Play,
  CheckCheck,
  Upload,
  RefreshCw,
  X,
  Loader2
} from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  message: ChatMessage
  isSelf: boolean
  conversationId: string
  showAvatar: boolean
  isHighlighted?: boolean
}>()

const chatStore = useChatStore()
const authStore = useAuthStore()
const chatService = useChatService()
const toast = useToast()

interface TextToken {
  type: 'text' | 'mention'
  value: string
  isSelfMention?: boolean
}

/** Parse teks pesan untuk mendeteksi sebutan @mention dan merender badge visual */
const parsedTokens = computed<TextToken[]>(() => {
  const text = props.message.content
  if (!text) return []

  const myUsername = authStore.username ? authStore.username.toLowerCase() : ''
  const myName = authStore.pegawai?.name ? authStore.pegawai.name.toLowerCase() : ''
  const myId = authStore.id_user ? String(authStore.id_user) : ''

  const mentionRegex = /(^|\s)(@\[\d+:?[^\]]+\]|@\[[^\]]+\]|@[a-zA-Z0-9_\-\.]+)/g
  const tokens: TextToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = mentionRegex.exec(text)) !== null) {
    const fullMatch = match[0]
    const leadingSpace = match[1]
    const rawMention = match[2]

    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      })
    }
    if (leadingSpace) {
      tokens.push({
        type: 'text',
        value: leadingSpace,
      })
    }

    let cleanHandle = rawMention
    let isSelfMention = false

    if (rawMention.startsWith('@[') && rawMention.endsWith(']')) {
      const inner = rawMention.slice(2, -1)
      const parts = inner.split(':')
      const targetId = parts[0]
      const targetName = parts[1] || parts[0]
      cleanHandle = '@' + targetName
      if ((myId && targetId === myId) || (myUsername && targetName.toLowerCase() === myUsername)) {
        isSelfMention = true
      }
    } else {
      const handleLower = rawMention.slice(1).toLowerCase()
      if (
        (myUsername && handleLower === myUsername) ||
        (myName && (handleLower === myName || myName.includes(handleLower)))
      ) {
        isSelfMention = true
      }
    }

    tokens.push({
      type: 'mention',
      value: cleanHandle,
      isSelfMention,
    })

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(lastIndex),
    })
  }

  return tokens
})

const showContextMenu = ref(false)
const isEditing = ref(false)
const editContent = ref('')
const editAttachmentName = ref('')
const showReactions = ref(false)
const isDownloadingFile = ref(false)

/** State & ref untuk penggantian file/media saat edit */
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploadingNewFile = ref(false)
const uploadProgress = ref(0)
const newAttachmentUrl = ref('')
const newAttachmentName = ref('')
const newMessageType = ref<MessageType | null>(null)
const newMimeType = ref('')

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
    toast.showToast('Dokumen berhasil diunduh', 'success')
  } catch (err) {
    console.error('Gagal mengunduh dokumen:', err)
    toast.showToast('Gagal mengunduh dokumen', 'error')
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

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🙏']

/** Waktu pesan */
const timeStr = computed(() => {
  return new Date(props.message.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

/** Cek apakah sudah dibaca semua peserta */
const isReadByAll = computed(() => (props.message.readReceipts ?? []).length > 0)

/** Multi-field reply count parser */
const replyCount = computed(() => {
  const m = props.message as any
  const storeReplies = chatStore.threadMessagesMap[String(props.message.id)] ?? []
  const localCount = storeReplies.length
  const msgReplyCount =
    typeof m?.replyCount === 'number'
      ? m.replyCount
      : typeof m?.reply_count === 'number'
        ? m.reply_count
        : typeof m?.threadsCount === 'number'
          ? m.threadsCount
          : typeof m?.threadCount === 'number'
            ? m.threadCount
            : typeof m?._count?.threads === 'number'
              ? m._count.threads
              : typeof m?._count?.replies === 'number'
                ? m._count.replies
                : typeof m?._count?.threadReplies === 'number'
                  ? m._count.threadReplies
                  : Array.isArray(m?.threads)
                    ? m.threads.length
                    : 0

  return Math.max(localCount, msgReplyCount)
})

/** Helper aman untuk mengambil timestamp millis dari reply message */
const getReplyTimestamp = (r: any): number => {
  const rawDate =
    r.createdAt ||
    r.created_at ||
    r.created_at_time ||
    r.updatedAt ||
    r.updated_at
  if (!rawDate) return 0
  const t = new Date(rawDate).getTime()
  return isNaN(t) ? 0 : t
}

/** Helper untuk mengecek apakah balasan thread dikirim oleh user sendiri */
const isOwnReply = (r: any): boolean => {
  const authStore = useAuthStore()
  const myId = authStore.id_user
  const myUsername = authStore.username

  const actualSenderId =
    r.senderId || (r as any).sender?.id || (r as any).sender_id || (r as any).userId || (r as any).user_id
  if (myId && actualSenderId != null && String(actualSenderId) === String(myId)) return true

  const actualUsername =
    r.senderUsername || (r as any).sender?.username || (r as any).username
  if (myUsername && actualUsername && actualUsername === myUsername) return true

  return false
}

/** Jumlah balasan thread yang belum dibaca */
const unreadThreadCount = computed(() => {
  const pIdStr = String(props.message.id)

  // 1. Jika thread sedang aktif terbuka di panel saat ini -> 0 (terbaca)
  if (String(chatStore.activeThreadMessageId) === pIdStr) return 0

  // 2. Ambil nilai unreadThreadCount dari objek pesan (dikalkulasi dari chat_message_read_receipts oleh backend & store)
  const msgUnread = (props.message as any).unreadThreadCount
  return typeof msgUnread === 'number' ? msgUnread : 0
})

/** Cek apakah ada balasan thread yang belum dibaca */
const hasUnreadThread = computed(() => unreadThreadCount.value > 0)

/** Balasan thread yang sudah dipreload di cache store */
const threadReplies = computed(
  () => chatStore.threadMessagesMap[String(props.message.id)] ?? [],
)

/** Avatar unik dari para replier (maks 3) */
const replierAvatars = computed(() => {
  const seen = new Set<string>()
  const result: { initials: string; color: string }[] = []
  for (const r of threadReplies.value) {
    const rawSender = (r as any).sender || (r as any).user || {}
    const sId = r.senderId || rawSender.id || (r as any).sender_id || (r as any).userId || (r as any).user_id
    const key = String(sId || Math.random())
    if (seen.has(key)) continue
    seen.add(key)

    const name =
      r.senderUsername ||
      rawSender.username ||
      rawSender.pegawai?.name ||
      (r as any).username ||
      (sId ? `User #${sId}` : 'User')

    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-indigo-500 to-blue-600',
    ]
    let hash = 0
    for (const ch of name) { hash = (hash << 5) - hash + ch.charCodeAt(0); hash |= 0 }
    result.push({ initials: name[0]?.toUpperCase() ?? '?', color: colors[Math.abs(hash) % colors.length] })
    if (result.length >= 3) break
  }
  return result
})

/** Waktu balasan terakhir di thread */
const lastReplyTimeStr = computed(() => {
  if (!threadReplies.value.length) return ''
  const last = threadReplies.value[threadReplies.value.length - 1]
  return new Date(last.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
})

/** Grouped reactions — guard terhadap null/undefined dari backend */
const groupedReactions = computed(() => {
  const reactions = props.message.reactions ?? []
  const map: Record<string, { count: number; hasOwn: boolean }> = {}
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, hasOwn: false }
    map[r.emoji].count++
  }
  return Object.entries(map).map(([emoji, data]) => ({ emoji, ...data }))
})

/** Deteksi tipe pesan dari file baru */
const getMessageTypeFromFile = (file: File): MessageType => {
  if (file.type.startsWith('image/')) return MessageType.IMAGE
  if (file.type.startsWith('video/')) return MessageType.VIDEO
  if (file.type.startsWith('audio/')) return MessageType.AUDIO
  return MessageType.FILE
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleReplaceFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  try {
    isUploadingNewFile.value = true
    uploadProgress.value = 0

    const uploaded = await chatService.uploadAttachment(file, (pct) => {
      uploadProgress.value = pct
    })

    newAttachmentUrl.value = uploaded.url || uploaded.fileName
    newAttachmentName.value = uploaded.originalName || file.name
    newMessageType.value = getMessageTypeFromFile(file)
    newMimeType.value = uploaded.mimeType || file.type
    editAttachmentName.value = uploaded.originalName || file.name
    toast.success('Berkas pengganti berhasil diunggah')
  } catch (err: any) {
    toast.error(err?.message || 'Gagal mengunggah berkas pengganti')
  } finally {
    isUploadingNewFile.value = false
    target.value = ''
  }
}

const removeReplacementFile = () => {
  newAttachmentUrl.value = ''
  newAttachmentName.value = ''
  newMessageType.value = null
  newMimeType.value = ''
  editAttachmentName.value = props.message.attachmentName ?? ''
}

/** Edit pesan */
const startEdit = () => {
  editContent.value = props.message.content ?? ''
  editAttachmentName.value = props.message.attachmentName ?? ''
  newAttachmentUrl.value = ''
  newAttachmentName.value = ''
  newMessageType.value = null
  newMimeType.value = ''
  isEditing.value = true
  showContextMenu.value = false
}

const submitEdit = async () => {
  const trimmedContent = editContent.value.trim()
  const trimmedAttachmentName = editAttachmentName.value.trim()

  const payload: UpdateMessageDto = {}

  if (newAttachmentUrl.value) {
    payload.attachmentUrl = newAttachmentUrl.value
    payload.attachmentName = newAttachmentName.value || trimmedAttachmentName
    if (newMessageType.value) {
      payload.type = newMessageType.value
    }
    payload.content = trimmedContent
  } else if (props.message.type === MessageType.TEXT) {
    if (!trimmedContent) return
    payload.content = trimmedContent
  } else {
    payload.content = trimmedContent
    if (props.message.attachmentName !== undefined || trimmedAttachmentName) {
      payload.attachmentName = trimmedAttachmentName || (props.message.attachmentName ?? '')
    }
  }

  try {
    const updated = await chatService.updateMessage(props.conversationId, props.message.id, payload)
    chatStore.updateMessage(updated as ChatMessage)
    isEditing.value = false
    newAttachmentUrl.value = ''
  } catch {
    toast.error('Gagal mengedit pesan')
  }
}

const cancelEdit = () => {
  isEditing.value = false
  newAttachmentUrl.value = ''
  newAttachmentName.value = ''
  newMessageType.value = null
  newMimeType.value = ''
}

/** Hapus pesan */
const deleteMsg = async () => {
  showContextMenu.value = false
  try {
    await chatService.deleteMessage(props.conversationId, props.message.id)
    chatStore.deleteMessageLocal(props.conversationId, props.message.id)
  } catch {
    toast.error('Gagal menghapus pesan')
  }
}

/** Buka picker reaksi tanpa bentrokan event click */
const openReactions = () => {
  showContextMenu.value = false
  setTimeout(() => {
    showReactions.value = true
  }, 10)
}

/** Toggle reaksi */
const toggleEmoji = async (emoji: string) => {
  showReactions.value = false
  try {
    await chatService.toggleReaction(props.conversationId, props.message.id, emoji)
  } catch {
    toast.error('Gagal menambah reaksi')
  }
}
const senderDisplayName = computed(() => {
  return (
    props.message.senderUsername ||
    (props.message as any).sender?.pegawai?.name ||
    (props.message as any).sender?.username ||
    `User #${props.message.senderId}`
  )
})
</script>

<template>
  <div
    class="flex items-end gap-2 group/msg relative"
    :class="isSelf ? 'flex-row-reverse' : 'flex-row'"
    @mouseleave="showContextMenu = false; showReactions = false"
  >
    <!-- Avatar (untuk pesan orang lain) -->
    <div class="w-8 h-8 flex-shrink-0" :class="isSelf ? 'hidden' : ''">
      <div
        v-if="showAvatar"
        class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
      >
        {{ senderDisplayName[0]?.toUpperCase() ?? '?' }}
      </div>
    </div>

    <!-- Bubble + meta -->
    <div class="flex flex-col max-w-[70%] md:max-w-[60%]" :class="isSelf ? 'items-end' : 'items-start'">
      <!-- Sender name (grup, bukan self) -->
      <span
        v-if="showAvatar && !isSelf"
        class="text-[11px] font-semibold text-primary mb-0.5 ml-1"
      >
        {{ senderDisplayName }}
      </span>

      <!-- Highlight Badge Notification Indicator -->
      <div
        v-if="isHighlighted"
        class="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 shadow-sm animate-bounce"
      >
        <span>📍 Pesan dari Notifikasi</span>
      </div>

      <!-- Reply indicator — hanya tampil di Thread Panel, bukan di Main Chat -->
      <!-- Komentar: Jangan hapus block ini, sudah disabled via v-if="false" -->
      <div v-if="false" class="hidden" />

      <!-- Bubble -->
      <div class="relative" :class="{ 'z-50': showContextMenu || showReactions }">
        <div
          class="rounded-2xl px-3.5 pt-2 pb-2 text-[14.5px] leading-relaxed break-words shadow-sm min-w-[80px] transition-all duration-300"
          :class="[
            isHighlighted
              ? 'ring-4 ring-amber-400 dark:ring-amber-500 bg-amber-100 text-slate-900 dark:bg-amber-950 dark:text-amber-100 shadow-2xl scale-[1.02] animate-pulse'
              : isSelf
              ? 'bg-primary text-primary-content rounded-br-none'
              : 'bg-base-200 text-base-content rounded-bl-none border border-base-content/5',
            message.isDeleted ? 'opacity-60 italic' : '',
          ]"
        >
          <!-- Deleted -->
          <template v-if="message.isDeleted">
            <Icon name="lucide:ban" class="w-3.5 h-3.5 inline mr-1 opacity-60" />
            Pesan dihapus
          </template>

          <!-- Editing mode -->
          <template v-else-if="isEditing">
            <div class="space-y-2.5 min-w-[240px] max-w-[320px]">
              <!-- Hidden file input for replacing media/document -->
              <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                @change="handleReplaceFile"
              />

              <!-- Preview: Replacement file uploaded -->
              <div v-if="newAttachmentUrl" class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-[11px] font-bold flex items-center gap-1">
                    <CheckCheck class="w-3.5 h-3.5 text-emerald-500" />
                    Berkas Pengganti Terpilih
                  </span>
                  <button
                    type="button"
                    class="btn btn-ghost btn-circle btn-xs text-error"
                    title="Batal Ganti Berkas"
                    @click="removeReplacementFile"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <!-- Image Preview if new file is image -->
                <div v-if="newMessageType === MessageType.IMAGE" class="relative rounded-lg overflow-hidden max-w-[200px] aspect-[4/3] bg-slate-950 my-1">
                  <SecureMedia :filename="newAttachmentUrl" type="photo" fit="cover" class="w-full h-full object-cover" />
                </div>
                <!-- File name input -->
                <div class="mt-1">
                  <label class="text-[10px] opacity-80 block font-semibold mb-0.5">Nama Berkas</label>
                  <input
                    v-model="editAttachmentName"
                    type="text"
                    class="w-full text-xs font-bold bg-base-100 text-base-content border border-emerald-500/40 rounded px-2 py-1 outline-none focus:border-emerald-500"
                    placeholder="Nama berkas..."
                  />
                </div>
              </div>

              <!-- Preview: Existing original attachment (if no new replacement file yet) -->
              <template v-else-if="message.attachmentUrl">
                <div v-if="message.type === MessageType.IMAGE" class="relative rounded-xl overflow-hidden max-w-[240px] aspect-[4/3] bg-slate-950 border border-white/10 shadow mb-1">
                  <SecureMedia :filename="message.attachmentUrl" type="photo" fit="cover" class="w-full h-full object-cover" />
                </div>
                <div v-else-if="message.type === MessageType.VIDEO" class="relative rounded-xl overflow-hidden max-w-[240px] aspect-video bg-slate-950 border border-white/10 shadow mb-1">
                  <SecureMedia :filename="message.attachmentUrl" type="video" fit="cover" class="w-full h-full object-cover" />
                </div>
                <div v-else-if="message.type === MessageType.AUDIO" class="w-full max-w-[240px] bg-base-300/40 rounded-xl p-2 mb-1 border border-base-content/10">
                  <audio :src="message.attachmentUrl" controls class="w-full h-8 rounded" />
                </div>
                <div v-else-if="message.type === MessageType.FILE" class="p-2.5 rounded-xl bg-base-300/40 border border-base-content/10 mb-1">
                  <div class="flex items-center gap-2 mb-1.5">
                    <div class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 shadow-sm" :class="getFileIconConfig(message.attachmentName, message.mimeType).bgClass">
                      <component :is="getFileIconConfig(message.attachmentName, message.mimeType).component" class="w-4 h-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <label class="text-[10px] opacity-70 block font-semibold">Nama Berkas</label>
                      <input
                        v-model="editAttachmentName"
                        type="text"
                        class="w-full text-xs font-bold bg-base-100 text-base-content border border-base-content/20 rounded px-2 py-1 outline-none focus:border-primary"
                        placeholder="Nama berkas..."
                      />
                    </div>
                  </div>
                </div>
              </template>

              <!-- Uploading progress state -->
              <div v-if="isUploadingNewFile" class="p-2 rounded-xl bg-base-200 border border-base-content/10 flex items-center gap-2">
                <Loader2 class="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between text-[11px] font-semibold mb-1">
                    <span>Mengunggah berkas baru...</span>
                    <span>{{ uploadProgress }}%</span>
                  </div>
                  <div class="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                    <div class="h-full bg-primary transition-all duration-200" :style="{ width: `${uploadProgress}%` }" />
                  </div>
                </div>
              </div>

              <!-- Button: Replace Media / File -->
              <div class="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  class="btn btn-xs btn-outline border-base-content/20 hover:bg-base-200 hover:border-base-content/30 gap-1.5 text-[11px] normal-case"
                  :disabled="isUploadingNewFile"
                  @click="triggerFileInput"
                >
                  <Upload class="w-3.5 h-3.5 text-primary" />
                  <span>{{ newAttachmentUrl ? 'Ganti Berkas Lain' : message.attachmentUrl ? 'Ganti Berkas / Media' : 'Tambah Berkas / Media' }}</span>
                </button>
              </div>

              <!-- Content / Caption Textarea -->
              <div>
                <label v-if="message.type !== MessageType.TEXT || newAttachmentUrl" class="text-[10px] opacity-70 block font-semibold mb-1">
                  Keterangan (Caption)
                </label>
                <textarea
                  v-model="editContent"
                  class="w-full bg-base-100 text-base-content border border-base-content/20 rounded-xl p-2 text-xs outline-none focus:border-primary resize-none min-h-[60px]"
                  :placeholder="message.type === MessageType.TEXT && !newAttachmentUrl ? 'Tulis pesan...' : 'Tambah/edit keterangan...'"
                  rows="2"
                  autofocus
                  @keydown.enter.ctrl="submitEdit"
                  @keydown.escape="cancelEdit"
                />
              </div>

              <div class="flex gap-2 justify-end pt-1">
                <button class="btn btn-ghost btn-xs" :disabled="isUploadingNewFile" @click="cancelEdit">Batal</button>
                <button class="btn btn-primary btn-xs text-primary-content font-semibold" :disabled="isUploadingNewFile" @click="submitEdit">Simpan</button>
              </div>
            </div>
          </template>

          <!-- Image (Tampilan Galeri + Click to Lightbox) -->
          <template v-else-if="message.type === MessageType.IMAGE && message.attachmentUrl">
            <div
              class="relative rounded-2xl overflow-hidden cursor-pointer group/media max-w-[260px] aspect-[4/3] bg-slate-950 border border-white/10 shadow-lg mb-1.5 transition-transform duration-300 hover:shadow-2xl"
              @click="chatStore.openLightboxMedia({ url: message.attachmentUrl, name: message.attachmentName ?? 'Foto Chat', type: 'photo' })"
            >
              <SecureMedia
                :filename="message.attachmentUrl"
                type="photo"
                fit="cover"
                class="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity flex items-end p-2.5 pointer-events-none">
                <span class="text-[11px] font-semibold text-white truncate shadow-sm">
                  {{ message.attachmentName ?? 'Lihat Foto Fullscreen' }}
                </span>
              </div>
            </div>
            <span v-if="message.content" class="block mt-1 text-sm leading-snug">
              <template v-for="(token, tIdx) in parsedTokens" :key="tIdx">
                <span v-if="token.type === 'text'">{{ token.value }}</span>
                <span
                  v-else-if="token.type === 'mention'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold transition-all mx-0.5"
                  :class="token.isSelfMention
                    ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                    : isSelf
                    ? 'bg-primary-content/25 text-primary-content border border-primary-content/30'
                    : 'bg-primary/15 text-primary dark:text-primary-content border border-primary/30'"
                >
                  {{ token.value }}
                </span>
              </template>
              <span v-if="message.isEdited" class="text-[10px] opacity-60 ml-1">(diedit)</span>
            </span>
            <span v-else-if="message.isEdited" class="text-[10px] opacity-60 block mt-1">(diedit)</span>
          </template>

          <!-- Video (Tampilan Galeri + Play Overlay Badge + Click to Lightbox) -->
          <template v-else-if="message.type === MessageType.VIDEO && message.attachmentUrl">
            <div
              class="relative rounded-2xl overflow-hidden cursor-pointer group/media max-w-[280px] aspect-video bg-slate-950 border border-white/10 shadow-lg mb-1.5 transition-transform duration-300 hover:shadow-2xl"
              @click="chatStore.openLightboxMedia({ url: message.attachmentUrl, name: message.attachmentName ?? 'Video Chat', type: 'video' })"
            >
              <SecureMedia
                :filename="message.attachmentUrl"
                type="video"
                fit="cover"
                class="w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-black/40 group-hover/media:bg-black/25 transition-colors flex items-center justify-center pointer-events-none">
                <div class="w-12 h-12 rounded-full bg-primary/95 text-primary-content flex items-center justify-center shadow-xl group-hover/media:scale-110 transition-transform">
                  <Play class="w-6 h-6 fill-current ml-0.5" />
                </div>
              </div>
            </div>
            <span v-if="message.content" class="block mt-1 text-sm leading-snug">
              <template v-for="(token, tIdx) in parsedTokens" :key="tIdx">
                <span v-if="token.type === 'text'">{{ token.value }}</span>
                <span
                  v-else-if="token.type === 'mention'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold transition-all mx-0.5"
                  :class="token.isSelfMention
                    ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                    : isSelf
                    ? 'bg-primary-content/25 text-primary-content border border-primary-content/30'
                    : 'bg-primary/15 text-primary dark:text-primary-content border border-primary/30'"
                >
                  {{ token.value }}
                </span>
              </template>
              <span v-if="message.isEdited" class="text-[10px] opacity-60 ml-1">(diedit)</span>
            </span>
            <span v-else-if="message.isEdited" class="text-[10px] opacity-60 block mt-1">(diedit)</span>
          </template>

          <!-- Audio -->
          <template v-else-if="message.type === MessageType.AUDIO && message.attachmentUrl">
            <div class="w-full max-w-[260px] bg-base-300/40 rounded-xl p-2 mb-1 border border-base-content/10">
              <audio
                :src="message.attachmentUrl"
                controls
                preload="metadata"
                class="w-full h-9 rounded-lg"
              />
            </div>
            <span v-if="message.content" class="block mt-1 text-sm leading-snug">
              <template v-for="(token, tIdx) in parsedTokens" :key="tIdx">
                <span v-if="token.type === 'text'">{{ token.value }}</span>
                <span
                  v-else-if="token.type === 'mention'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold transition-all mx-0.5"
                  :class="token.isSelfMention
                    ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                    : isSelf
                    ? 'bg-primary-content/25 text-primary-content border border-primary-content/30'
                    : 'bg-primary/15 text-primary dark:text-primary-content border border-primary/30'"
                >
                  {{ token.value }}
                </span>
              </template>
              <span v-if="message.isEdited" class="text-[10px] opacity-60 ml-1">(diedit)</span>
            </span>
            <span v-else-if="message.isEdited" class="text-[10px] opacity-60 block mt-1">(diedit)</span>
          </template>

          <!-- File -->
          <template v-else-if="message.type === MessageType.FILE && message.attachmentUrl">
            <div
              class="flex items-center gap-3 p-3 rounded-xl bg-base-300/40 border border-base-content/10 hover:bg-base-300/70 transition-all mb-1 cursor-pointer"
              @click="handleDownloadFile(message.attachmentUrl, message.attachmentName)"
            >
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                :class="getFileIconConfig(message.attachmentName, message.mimeType).bgClass"
              >
                <component :is="getFileIconConfig(message.attachmentName, message.mimeType).component" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold truncate">{{ message.attachmentName ?? 'Lampiran File' }}</p>
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
            <span v-if="message.content" class="block mt-1 text-sm leading-snug">
              <template v-for="(token, tIdx) in parsedTokens" :key="tIdx">
                <span v-if="token.type === 'text'">{{ token.value }}</span>
                <span
                  v-else-if="token.type === 'mention'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold transition-all mx-0.5"
                  :class="token.isSelfMention
                    ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                    : isSelf
                    ? 'bg-primary-content/25 text-primary-content border border-primary-content/30'
                    : 'bg-primary/15 text-primary dark:text-primary-content border border-primary/30'"
                >
                  {{ token.value }}
                </span>
              </template>
              <span v-if="message.isEdited" class="text-[10px] opacity-60 ml-1">(diedit)</span>
            </span>
            <span v-else-if="message.isEdited" class="text-[10px] opacity-60 block mt-1">(diedit)</span>
          </template>

          <!-- Text -->
          <template v-else>
            <span v-if="message.content">
              <template v-for="(token, tIdx) in parsedTokens" :key="tIdx">
                <span v-if="token.type === 'text'">{{ token.value }}</span>
                <span
                  v-else-if="token.type === 'mention'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold transition-all mx-0.5"
                  :class="token.isSelfMention
                    ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                    : isSelf
                    ? 'bg-primary-content/25 text-primary-content border border-primary-content/30'
                    : 'bg-primary/15 text-primary dark:text-primary-content border border-primary/30'"
                >
                  {{ token.value }}
                </span>
              </template>
            </span>
            <span v-if="message.isEdited" class="text-[10px] opacity-60 ml-1">(diedit)</span>
          </template>

          <!-- Time & read status (Inside Bubble, floated to bottom right) -->
          <div
            class="inline-flex items-center gap-1 float-right mt-3 ml-4 -mb-1"
            :class="isSelf ? 'text-primary-content/80' : 'text-base-content/50'"
          >
            <span class="text-[10px] leading-none">{{ timeStr }}</span>
            <CheckCheck
              v-if="isSelf"
              class="w-3.5 h-3.5 leading-none"
              :class="isReadByAll ? (isSelf ? 'text-info-content' : 'text-info') : 'opacity-70'"
            />
          </div>
          <div class="clear-both"></div>
        </div>

        <!-- Action buttons trigger (hover) -->
        <div
          v-if="!message.isDeleted"
          class="absolute top-1/2 -translate-y-1/2 transition-all duration-150 flex items-center gap-1 bg-base-100 shadow-md border border-base-content/20 rounded-full px-2.5 py-1"
          :class="[
            isSelf ? 'right-full mr-2' : 'left-full ml-2',
            (showContextMenu || showReactions) ? 'opacity-100 z-50' : 'opacity-0 group-hover/msg:opacity-100 z-20'
          ]"
        >
          <!-- Quick Thread Reply button -->
          <button
            class="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-0.5 rounded-full transition"
            title="Balas di Thread"
            @click="chatStore.openThread(message.id, message)"
          >
            <MessageSquareReply class="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span class="text-[11px] font-bold text-primary whitespace-nowrap">Thread</span>
          </button>

          <div class="w-px h-3.5 bg-base-content/20 flex-shrink-0"></div>

          <!-- Quick Reaction button -->
          <button
            class="p-1 rounded-full text-amber-500 hover:bg-amber-500/10 transition flex items-center justify-center"
            title="Tambah Reaksi"
            @click.stop="openReactions"
          >
            <Smile class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          </button>

          <!-- More options button -->
          <button
            class="p-1 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-200 transition flex items-center justify-center"
            title="Opsi Lainnya"
            @click.stop="showContextMenu = !showContextMenu"
          >
            <MoreVertical class="w-3.5 h-3.5 text-base-content flex-shrink-0" />
          </button>

          <!-- Context menu dropdown -->
          <template v-if="showContextMenu">
            <!-- Backdrop overlay to close menu on click outside -->
            <div class="fixed inset-0 z-40" @click.stop="showContextMenu = false" />

            <div
              class="absolute z-50 bg-base-100 border border-base-content/15 rounded-2xl shadow-2xl p-1.5 min-w-[160px] top-full mt-1.5"
              :class="isSelf ? 'right-0' : 'left-0'"
            >
              <button
                class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-primary hover:bg-primary/10 transition"
                @click="chatStore.openThread(message.id, message); showContextMenu = false"
              >
                <MessageSquareReply class="w-4 h-4 text-primary" />
                <span>Balas di Thread</span>
              </button>
              <button
                class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-base-content hover:bg-base-200 transition"
                @click.stop="openReactions"
              >
                <Smile class="w-4 h-4 text-amber-500" />
                <span>Reaksi</span>
              </button>
              <button
                v-if="isSelf"
                class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-base-content hover:bg-base-200 transition"
                @click="startEdit"
              >
                <Pencil class="w-4 h-4 text-blue-500" />
                <span>Edit</span>
              </button>
              <button
                v-if="isSelf"
                class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-error hover:bg-error/10 transition"
                @click="deleteMsg"
              >
                <Trash2 class="w-4 h-4 text-error" />
                <span>Hapus</span>
              </button>
            </div>
          </template>

          <!-- Emoji picker -->
          <template v-if="showReactions">
            <div class="fixed inset-0 z-40" @click.stop="showReactions = false" />
            <div
              class="absolute z-50 bg-base-100 border border-base-content/10 rounded-2xl shadow-xl p-2 flex gap-1.5 top-full mt-1.5"
              :class="isSelf ? 'right-0' : 'left-0'"
            >
              <button
                v-for="emoji in EMOJI_LIST"
                :key="emoji"
                class="text-xl hover:scale-125 transition-transform duration-100 leading-none"
                @click="toggleEmoji(emoji); showReactions = false"
              >
                {{ emoji }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- ─── Thread Preview (Google Chat Style) ─────────────────────────── -->
      <!--
        Tampil jika pesan ini adalah pesan induk (root) yang punya balasan thread.
        Google Chat style: avatar repliers + teks ringkas + waktu balasan terakhir
      -->
      <button
        v-if="replyCount > 0 || hasUnreadThread"
        class="group/thread mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200 max-w-full"
        :class="[
          hasUnreadThread
            ? 'bg-primary/8 border-primary/25 hover:bg-primary/12'
            : 'bg-base-200/50 border-base-content/10 hover:bg-base-200 hover:border-base-content/20',
        ]"
        @click.stop="chatStore.openThread(message.id, message)"
      >
        <!-- Avatars repliers (maks 3) -->
        <div class="flex -space-x-1.5 flex-shrink-0">
          <div
            v-for="(av, i) in replierAvatars"
            :key="i"
            class="w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-base-100 flex-shrink-0"
            :class="av.color"
          >
            {{ av.initials }}
          </div>
          <div
            v-if="replierAvatars.length === 0"
            class="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-base-content/30 ring-1 ring-base-100"
          >
            <Icon name="lucide:message-circle" class="w-3 h-3" />
          </div>
        </div>

        <!-- Label teks: unread atau total balasan -->
        <span
          class="flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0"
          :class="hasUnreadThread ? 'text-primary' : 'text-base-content/60'"
        >
          <!-- Ada unread -->
          <template v-if="hasUnreadThread">
            <span class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
            <span>{{ unreadThreadCount }} pesan belum dibaca</span>
          </template>
          <!-- Sudah dibaca semua -->
          <template v-else>
            <span>{{ replyCount }} balasan</span>
          </template>
        </span>

        <!-- Waktu balasan terakhir -->
        <span
          v-if="lastReplyTimeStr"
          class="text-[10px] text-base-content/35 flex-shrink-0 ml-0.5"
        >
          · {{ lastReplyTimeStr }}
        </span>

        <!-- Indikator hover -->
        <span
          class="ml-auto text-[10px] font-medium text-primary opacity-0 group-hover/thread:opacity-100 transition-opacity flex-shrink-0"
        >
          Buka
        </span>
        <Icon
          name="lucide:chevron-right"
          class="w-3 h-3 flex-shrink-0 text-base-content/25 group-hover/thread:text-primary transition-colors"
        />
      </button>

      <!-- Reactions -->
      <div v-if="groupedReactions.length > 0" class="flex flex-wrap gap-1 mt-1 px-1">
        <button
          v-for="r in groupedReactions"
          :key="r.emoji"
          class="flex items-center gap-1 text-xs bg-base-200 hover:bg-base-300 border border-base-content/10 rounded-full px-2 py-0.5 transition"
          @click="toggleEmoji(r.emoji)"
        >
          <span>{{ r.emoji }}</span>
          <span class="text-base-content/60">{{ r.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
