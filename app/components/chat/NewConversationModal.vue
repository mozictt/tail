<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useChatService } from '@/services/chatService'
import { useToast } from '@/composables/useToast'
import { ConversationType } from '@/types/chat'
import type { ChatContact } from '@/types/chat'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', conversationId: string): void
}>()

const chatStore = useChatStore()
const chatService = useChatService()
const toast = useToast()

// ─── State ─────────────────────────────────────────────────────────────────

const type = ref<ConversationType>(ConversationType.DIRECT)
const groupName = ref('')
const searchQuery = ref('')

/** Daftar kontak yang sudah tersimpan */
const contacts = ref<ChatContact[]>([])
/** Hasil search user baru (GET /chat/contacts/search) */
const searchResults = ref<ChatContact[]>([])
/** User yang dipilih untuk diajak percakapan */
const selectedUsers = ref<{ id: number; displayName: string }[]>([])

const isLoadingContacts = ref(false)
const isSearching = ref(false)
const isCreating = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Normalisasi contact ke format { id, displayName } yang konsisten.
 * Backend search mengembalikan User entity, contacts mengembalikan ChatContact entity.
 */
const normalizeContact = (c: ChatContact) => ({
  id: c.contactUserId ?? c.userId ?? c.id,
  displayName: c.nickname || c.pegawai?.name || c.username,
})

// ─── Getters ───────────────────────────────────────────────────────────────

const canSubmit = computed(() => {
  if (type.value === ConversationType.DIRECT) return selectedUsers.value.length === 1
  return selectedUsers.value.length >= 2 && groupName.value.trim().length > 0
})

/** Filter kontak berdasarkan searchQuery (local filter) */
const filteredContacts = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return contacts.value
  return contacts.value.filter((c) => {
    const name = (c.nickname || c.pegawai?.name || c.username).toLowerCase()
    return name.includes(q)
  })
})

/** Apakah sedang dalam mode search (karakter > 2 dan ada hasil dari server) */
const isSearchMode = computed(() =>
  searchQuery.value.trim().length > 2 && searchResults.value.length > 0,
)

// ─── Actions ───────────────────────────────────────────────────────────────

/** Load daftar kontak saat modal dibuka */
const loadContacts = async () => {
  isLoadingContacts.value = true
  try {
    contacts.value = await chatService.getContacts()
  } catch {
    contacts.value = []
  } finally {
    isLoadingContacts.value = false
  }
}

/** Cari user baru via GET /chat/contacts/search?q= */
const doSearch = async (q: string) => {
  if (q.trim().length < 2) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  try {
    searchResults.value = await chatService.searchUsers(q.trim())
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const onSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = []
    return
  }
  searchTimeout = setTimeout(() => doSearch(searchQuery.value), 400)
}

const selectContact = (contact: ChatContact) => {
  const normalized = normalizeContact(contact)
  if (type.value === ConversationType.DIRECT) {
    selectedUsers.value = [normalized]
  } else {
    if (!selectedUsers.value.find((u) => u.id === normalized.id)) {
      selectedUsers.value.push(normalized)
    }
  }
  searchQuery.value = ''
  searchResults.value = []
}

const removeUser = (id: number) => {
  selectedUsers.value = selectedUsers.value.filter((u) => u.id !== id)
}

const submit = async () => {
  if (!canSubmit.value) return
  isCreating.value = true
  try {
    const conv = await chatStore.createConversation({
      type: type.value,
      name: type.value === ConversationType.GROUP ? groupName.value.trim() : undefined,
      participantIds: selectedUsers.value.map((u) => u.id),
    })
    toast.success(
      type.value === ConversationType.DIRECT
        ? 'Percakapan dibuat!'
        : `Grup "${conv.name}" berhasil dibuat!`,
    )
    emit('created', conv.id)
  } catch {
    toast.error('Gagal membuat percakapan')
  } finally {
    isCreating.value = false
  }
}

onMounted(() => {
  loadContacts()
})
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md border border-base-content/10 overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-base-content/10 flex-shrink-0">
        <h2 class="text-base font-bold text-base-content">Percakapan Baru</h2>
        <button class="btn btn-ghost btn-sm btn-circle" @click="$emit('close')">
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 overflow-y-auto flex-1">
        <!-- Tipe percakapan -->
        <div class="flex rounded-xl bg-base-200 p-1 gap-1">
          <button
            class="flex-1 py-2 text-sm font-medium rounded-lg transition"
            :class="type === ConversationType.DIRECT
              ? 'bg-primary text-primary-content shadow'
              : 'text-base-content/60 hover:text-base-content'"
            @click="type = ConversationType.DIRECT; selectedUsers = selectedUsers.slice(0, 1)"
          >
            <Icon name="lucide:user" class="w-4 h-4 inline mr-1.5" />
            Direct
          </button>
          <button
            class="flex-1 py-2 text-sm font-medium rounded-lg transition"
            :class="type === ConversationType.GROUP
              ? 'bg-primary text-primary-content shadow'
              : 'text-base-content/60 hover:text-base-content'"
            @click="type = ConversationType.GROUP"
          >
            <Icon name="lucide:users" class="w-4 h-4 inline mr-1.5" />
            Grup
          </button>
        </div>

        <!-- Nama grup -->
        <div v-if="type === ConversationType.GROUP">
          <label class="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5 block">
            Nama Grup
          </label>
          <input
            v-model="groupName"
            type="text"
            placeholder="Contoh: Tim Frontend"
            class="input input-bordered input-sm w-full rounded-xl"
            maxlength="50"
          />
        </div>

        <!-- Search -->
        <div>
          <label class="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5 block">
            {{ type === ConversationType.DIRECT ? 'Pilih Kontak' : 'Tambah Anggota' }}
          </label>
          <div class="relative">
            <Icon name="lucide:search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nama atau username..."
              class="input input-bordered input-sm w-full rounded-xl pl-9 pr-9"
              @input="onSearchInput"
            />
            <span
              v-if="isSearching"
              class="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-primary"
            />
            <button
              v-else-if="searchQuery"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition"
              @click="searchQuery = ''; searchResults = []"
            >
              <Icon name="lucide:x" class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Search results dari server -->
          <div
            v-if="searchQuery.trim().length >= 2 && searchResults.length > 0"
            class="mt-1.5 bg-base-100 border border-base-content/10 rounded-xl shadow-lg overflow-hidden"
          >
            <p class="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider px-3 pt-2 pb-1">
              Hasil Pencarian
            </p>
            <button
              v-for="contact in searchResults"
              :key="contact.id"
              class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-base-200 transition text-left"
              :disabled="!!selectedUsers.find(u => u.id === normalizeContact(contact).id)"
              @click="selectContact(contact)"
            >
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {{ (contact.pegawai?.name || contact.username)?.[0]?.toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ contact.pegawai?.name || contact.username }}</p>
                <p class="text-xs text-base-content/40 truncate">@{{ contact.username }}</p>
              </div>
              <Icon
                v-if="selectedUsers.find(u => u.id === normalizeContact(contact).id)"
                name="lucide:check"
                class="w-4 h-4 text-primary flex-shrink-0"
              />
            </button>
            <p v-if="searchResults.length === 0 && !isSearching" class="text-xs text-base-content/40 px-3 py-3 text-center">
              User tidak ditemukan
            </p>
          </div>
        </div>

        <!-- Daftar kontak yang sudah disimpan -->
        <div v-if="!searchQuery || searchQuery.trim().length < 2">
          <p class="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-2">
            Kontak Saya
            <span class="text-base-content/30 font-normal normal-case ml-1">({{ filteredContacts.length }})</span>
          </p>

          <!-- Loading -->
          <div v-if="isLoadingContacts" class="space-y-2">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3 p-2 animate-pulse">
              <div class="w-9 h-9 rounded-full bg-base-300 flex-shrink-0" />
              <div class="flex-1 space-y-1.5">
                <div class="h-3 bg-base-300 rounded w-1/2" />
                <div class="h-2.5 bg-base-300 rounded w-1/3" />
              </div>
            </div>
          </div>

          <!-- Empty kontak -->
          <div v-else-if="filteredContacts.length === 0" class="text-center py-6">
            <Icon name="lucide:users" class="w-8 h-8 text-base-content/20 mx-auto mb-2" />
            <p class="text-sm text-base-content/40">Belum ada kontak tersimpan</p>
            <p class="text-xs text-base-content/30 mt-1">Cari username di kolom pencarian</p>
          </div>

          <!-- List kontak -->
          <div v-else class="max-h-[200px] overflow-y-auto space-y-0.5">
            <button
              v-for="contact in filteredContacts"
              :key="contact.id"
              class="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-base-200 rounded-xl transition text-left"
              :disabled="!!selectedUsers.find(u => u.id === normalizeContact(contact).id)"
              @click="selectContact(contact)"
            >
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {{ (contact.nickname || contact.pegawai?.name || contact.username)?.[0]?.toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate">
                  {{ contact.nickname || contact.pegawai?.name || contact.username }}
                </p>
                <p class="text-xs text-base-content/40 truncate">@{{ contact.username }}</p>
              </div>
              <Icon
                v-if="selectedUsers.find(u => u.id === normalizeContact(contact).id)"
                name="lucide:check-circle-2"
                class="w-5 h-5 text-primary flex-shrink-0"
              />
            </button>
          </div>
        </div>

        <!-- Selected users chips -->
        <div v-if="selectedUsers.length > 0" class="flex flex-wrap gap-2 pt-1">
          <div
            v-for="user in selectedUsers"
            :key="user.id"
            class="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full px-3 py-1 text-sm font-medium"
          >
            <span>{{ user.displayName }}</span>
            <button class="hover:text-error transition ml-0.5" @click="removeUser(user.id)">
              <Icon name="lucide:x" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-base-content/10 flex justify-end gap-3 flex-shrink-0">
        <button class="btn btn-ghost btn-sm rounded-xl" @click="$emit('close')">
          Batal
        </button>
        <button
          class="btn btn-primary btn-sm rounded-xl gap-2"
          :disabled="!canSubmit || isCreating"
          @click="submit"
        >
          <span v-if="isCreating" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:check" class="w-4 h-4" />
          {{ type === ConversationType.DIRECT ? 'Mulai Chat' : 'Buat Grup' }}
        </button>
      </div>
    </div>
  </div>
</template>
