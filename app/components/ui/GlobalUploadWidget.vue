<script setup lang="ts">
import { computed } from "vue";
import { useUploadQueueStore } from "@/stores/uploadQueue";
import {
  UploadCloud,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Film,
  Image as ImageIcon,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-vue-next";

const uploadStore = useUploadQueueStore();

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const isImage = (type: string) => type.startsWith("image/");
const isVideo = (type: string) => type.startsWith("video/");
</script>

<template>
  <!-- Render hanya jika ada riwayat antrean atau sedang aktif -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-8 opacity-0 scale-95"
    enter-to-class="transform translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100 scale-100"
    leave-to-class="transform translate-y-8 opacity-0 scale-95"
  >
    <div
      v-if="uploadStore.isWidgetVisible && uploadStore.totalCount > 0"
      class="fixed bottom-4 right-4 z-50 w-[92vw] sm:w-96 select-none shadow-2xl font-sans"
    >
      <!-- ==============================================
           MODE 1: EXPANDED POPUP (Detail Antrean)
      =============================================== -->
      <div
        v-if="uploadStore.isWidgetOpen"
        class="bg-base-100/95 backdrop-blur-xl border border-base-content/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[30rem] transition-all"
      >
        <!-- Header Panel -->
        <div class="px-4 py-3 bg-base-200/80 border-b border-base-content/10 flex items-center justify-between">
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              :class="uploadStore.hasActiveUploads ? 'bg-primary/10 text-primary animate-pulse' : 'bg-emerald-500/10 text-emerald-500'"
            >
              <Loader2 v-if="uploadStore.hasActiveUploads" class="w-4 h-4 animate-spin" />
              <CheckCircle2 v-else class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-base-content leading-tight truncate">
                {{ uploadStore.hasActiveUploads ? `Mengunggah (${uploadStore.successCount}/${uploadStore.totalCount})` : 'Semua Unggahan Selesai' }}
              </h4>
              <p class="text-[10px] text-base-content/60 leading-tight">
                {{ uploadStore.activeCount }} aktif · {{ uploadStore.pendingCount }} antre · {{ uploadStore.failedCount }} gagal
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="uploadStore.clearCompleted"
              v-if="uploadStore.successCount > 0 && !uploadStore.hasActiveUploads"
              class="btn btn-ghost btn-xs text-[10px] text-base-content/70 hover:text-primary rounded-lg px-2 h-7"
              title="Bersihkan yang sudah selesai"
            >
              Bersihkan
            </button>
            <button
              @click="uploadStore.toggleWidget"
              class="btn btn-ghost btn-xs btn-square text-base-content/70 hover:bg-base-300 rounded-lg h-7 w-7"
              title="Kecilkan widget"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Progress Global Bar -->
        <div class="w-full bg-base-200 h-1 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
            :style="{ width: `${uploadStore.overallProgress}%` }"
          ></div>
        </div>

        <!-- List Items -->
        <div class="p-3 overflow-y-auto space-y-2.5 max-h-72 divide-y divide-base-content/5">
          <div
            v-for="task in uploadStore.tasks"
            :key="task.id"
            class="pt-2 first:pt-0 flex items-start gap-2.5"
          >
            <!-- Media Icon Indicator -->
            <div class="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Film v-if="isVideo(task.type)" class="w-4 h-4 text-purple-500" />
              <ImageIcon v-else-if="isImage(task.type)" class="w-4 h-4 text-blue-500" />
              <UploadCloud v-else class="w-4 h-4 text-base-content/60" />
            </div>

            <!-- Task Info & Progress -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-xs font-medium text-base-content truncate" :title="task.name">
                  {{ task.name }}
                </span>
                <span class="text-[10px] font-semibold text-base-content/50 flex-shrink-0">
                  {{ task.status === 'uploading' ? `${task.progress}%` : formatBytes(task.size) }}
                </span>
              </div>

              <!-- Progress bar untuk uploading -->
              <div v-if="task.status === 'uploading'" class="w-full bg-base-200 h-1.5 rounded-full overflow-hidden mb-1">
                <div
                  class="bg-primary h-full rounded-full transition-all duration-200"
                  :style="{ width: `${task.progress}%` }"
                ></div>
              </div>

              <!-- Status subtext / error msg -->
              <div class="flex items-center gap-1.5 text-[10px]">
                <span v-if="task.status === 'pending'" class="text-base-content/50 flex items-center gap-1">
                  <Clock class="w-3 h-3" /> Menunggu antrean...
                </span>
                <span v-else-if="task.status === 'uploading'" class="text-primary font-medium flex items-center gap-1">
                  <Loader2 class="w-3 h-3 animate-spin" /> Mengirim data (Chunked)...
                </span>
                <span v-else-if="task.status === 'success'" class="text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 class="w-3 h-3" /> Selesai terunggah
                </span>
                <span v-else-if="task.status === 'failed'" class="text-error font-medium truncate flex items-center gap-1" :title="task.errorMsg">
                  <AlertCircle class="w-3 h-3 flex-shrink-0" /> {{ task.errorMsg || 'Gagal mengunggah' }}
                </span>
                <span v-else-if="task.status === 'canceled'" class="text-base-content/40 flex items-center gap-1">
                  <X class="w-3 h-3" /> Dibatalkan
                </span>
              </div>
            </div>

            <!-- Action Buttons (Cancel / Retry / Remove) -->
            <div class="flex items-center gap-1 flex-shrink-0 self-center">
              <button
                v-if="task.status === 'uploading' || task.status === 'pending'"
                @click="uploadStore.cancelTask(task.id)"
                class="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error hover:bg-error/10 h-6 w-6"
                title="Batalkan unggahan"
              >
                <X class="w-3.5 h-3.5" />
              </button>

              <button
                v-if="task.status === 'failed' || task.status === 'canceled'"
                @click="uploadStore.retryTask(task.id)"
                class="btn btn-ghost btn-xs btn-circle text-primary hover:bg-primary/10 h-6 w-6"
                title="Coba unggah ulang"
              >
                <RotateCcw class="w-3.5 h-3.5" />
              </button>

              <button
                v-if="task.status === 'success' || task.status === 'failed' || task.status === 'canceled'"
                @click="uploadStore.removeTask(task.id)"
                class="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:bg-base-200 h-6 w-6"
                title="Hapus dari daftar"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==============================================
           MODE 2: MINIMIZED FLOATING PILL (Kompak)
      =============================================== -->
      <div
        v-else
        @click="uploadStore.toggleWidget"
        class="bg-base-100/95 backdrop-blur-xl border border-base-content/15 rounded-full px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            :class="uploadStore.hasActiveUploads ? 'bg-primary text-primary-content animate-spin' : 'bg-emerald-500 text-white'"
          >
            <Loader2 v-if="uploadStore.hasActiveUploads" class="w-3.5 h-3.5" />
            <CheckCircle2 v-else class="w-3.5 h-3.5" />
          </div>

          <div class="min-w-0">
            <p class="text-xs font-bold text-base-content truncate flex items-center gap-1.5">
              <span>{{ uploadStore.hasActiveUploads ? `Mengunggah (${uploadStore.overallProgress}%)` : 'Unggahan Selesai' }}</span>
              <span class="badge badge-xs" :class="uploadStore.hasActiveUploads ? 'badge-primary' : 'badge-success'">
                {{ uploadStore.activeCount + uploadStore.pendingCount > 0 ? `${uploadStore.activeCount + uploadStore.pendingCount} lagi` : '100%' }}
              </span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            class="btn btn-ghost btn-xs btn-circle h-6 w-6 text-base-content/60 group-hover:text-primary transition-colors"
            title="Buka panel unggah"
          >
            <ChevronUp class="w-4 h-4" />
          </button>
          <button
            v-if="!uploadStore.hasActiveUploads"
            @click.stop="uploadStore.clearCompleted"
            class="btn btn-ghost btn-xs btn-circle h-6 w-6 text-base-content/40 hover:text-error transition-colors"
            title="Tutup widget"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
