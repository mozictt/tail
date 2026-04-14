<script setup lang="ts">
import * as icons from "lucide-vue-next";
import { useToast } from "@/composables/useToast";

const { toasts, removeToast, pauseToast, resumeToast } = useToast();
</script>

<template>
<transition-group
  enter-active-class="transform transition duration-300"
  enter-from-class="translate-x-full opacity-0"
  enter-to-class="translate-x-0 opacity-100"
  leave-active-class="transition duration-200"
  leave-from-class="opacity-100"
  leave-to-class="opacity-0"
>
  <div
    v-for="t in toasts"
    :key="t.id"
    class="fixed right-5 z-[9999] min-w-[250px]"
    :style="{ top: `${20 + (toasts.indexOf(t) * 70)}px` }"
    @mouseenter="pauseToast(t.id)"
    @mouseleave="resumeToast(t.id)"
  >
    <div
      :class="[
        'relative flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white overflow-hidden',
        t.type === 'success'
          ? 'bg-green-500'
          : t.type === 'error'
            ? 'bg-red-500'
            : t.type === 'warning'
              ? 'bg-yellow-500'
              : 'bg-blue-500',
      ]"
    >
      <!-- ICON -->
      <component
        :is="
          t.type === 'success'
            ? icons.CheckCircle
            : t.type === 'error'
              ? icons.XCircle
              : t.type === 'warning'
                ? icons.AlertTriangle
                : icons.Info
        "
        class="w-5 h-5"
      />

      <!-- MESSAGE -->
      <span class="text-sm font-medium flex-1">
        {{ t.message }}
      </span>

      <!-- CLOSE -->
      <button @click="removeToast(t.id)">
        <icons.X class="w-4 h-4" />
      </button>

      <!-- PROGRESS BAR -->
      <div
      class="absolute bottom-0 left-0 h-1 bg-white/40"
      :style="{
        width: '100%',
        animation: `progress ${t.duration}ms linear`,
        animationPlayState: t.paused ? 'paused' : 'running'
      }"
    ></div>
    </div>
  </div>
</transition-group>
</template>

<style>
@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>