<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useChatSocket } from '@/composables/useChatSocket'
import { MessageType } from '@/types/chat'
import type { SendMessageDto } from '@/types/chat'

const props = defineProps<{
  conversationId: string
}>()

const emit = defineEmits<{
  (e: 'send', dto: SendMessageDto): void
}>()

const chatSocket = useChatSocket()

const content = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
let typingTimeout: ReturnType<typeof setTimeout> | null = null

/** Auto-resize textarea */
const autoResize = () => {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = Math.min(textarea.value.scrollHeight, 150) + 'px'
}

/** Kirim pesan */
const send = () => {
  const text = content.value.trim()
  if (!text) return

  const dto: SendMessageDto = {
    content: text,
    type: MessageType.TEXT,
  }

  emit('send', dto)
  content.value = ''
  // Reset textarea height
  nextTick(() => {
    if (textarea.value) textarea.value.style.height = 'auto'
  })

  // Stop typing indicator
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

  // Emit typing start
  chatSocket.startTyping({ conversationId: props.conversationId })

  // Stop typing setelah 2 detik tidak ada input
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    chatSocket.stopTyping({ conversationId: props.conversationId })
  }, 2000)
}

/** Focus textarea saat conversation berubah */
watch(
  () => props.conversationId,
  () => {
    nextTick(() => textarea.value?.focus())
  },
  { immediate: true },
)
</script>

<template>
  <div class="border-t border-base-content/10 bg-base-100 px-4 py-3">
    <div class="flex items-end gap-3">
      <!-- Input area -->
      <div class="flex-1 bg-base-200/60 border border-base-content/10 rounded-2xl px-4 py-2.5 flex items-end gap-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition">
        <textarea
          id="chat-message-input"
          ref="textarea"
          v-model="content"
          placeholder="Ketik pesan..."
          rows="1"
          class="flex-1 bg-transparent outline-none resize-none text-sm text-base-content placeholder:text-base-content/40 leading-relaxed max-h-[150px] overflow-y-auto scrollbar-thin"
          @keydown="onKeydown"
          @input="onInput"
        />
      </div>

      <!-- Send button -->
      <button
        id="chat-send-button"
        class="btn btn-primary rounded-2xl w-11 h-11 p-0 min-h-0 flex items-center justify-center flex-shrink-0 transition-all duration-150"
        :class="content.trim() ? 'opacity-100 scale-100' : 'opacity-50 scale-95'"
        :disabled="!content.trim()"
        @click="send"
        title="Kirim pesan (Enter)"
      >
        <Icon name="lucide:send" class="w-5 h-5" />
      </button>
    </div>

    <!-- Helper text -->
    <p class="text-[10px] text-base-content/30 mt-1.5 ml-1">
      Enter untuk kirim · Shift+Enter untuk baris baru
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
