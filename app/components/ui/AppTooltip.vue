<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  text: string;
  show?: boolean;
  position?: "top" | "right" | "left" | "bottom";
  delay?: number;
}>();

const visible = ref(false);

let timeout: any = null;

const onMouseEnter = () => {
  timeout = setTimeout(() => {
    visible.value = true;
  }, props.delay ?? 200); // default delay 200ms
};

const onMouseLeave = () => {
  clearTimeout(timeout);
  visible.value = false;
};

// POSITION CLASS
const positionClass = computed(() => {
  switch (props.position) {
    case "top":
      return "bottom-full left-1/2 -translate-x-1/2 mb-2";
    case "left":
      return "right-full mr-3 top-1/2 -translate-y-1/2";
    case "bottom":
      return "top-full left-1/2 -translate-x-1/2 mt-2";
    case "right":
    default:
      return "left-full ml-3 top-1/2 -translate-y-1/2";
  }
});
</script>

<template>
  <div
    class="relative inline-flex"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- SLOT -->
    <slot />

    <!-- TOOLTIP -->
    <Transition name="fade">
      <div
        v-if="visible && show !== false"
        :class="[
          'absolute z-50 whitespace-nowrap',
          'bg-black text-white text-xs px-2 py-1 rounded shadow-lg',
          'transition-all duration-200',
          positionClass,
        ]"
      >
        {{ text }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>