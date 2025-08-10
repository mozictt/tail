<template>
  <div class="flex min-h-screen bg-base-200">
    <!-- Sidebar Desktop -->
    <Sidebar
      :isCollapsed="isCollapsed"
      v-show="isDesktop"
      @toggleCollapse="isCollapsed = !isCollapsed"
    />

    <!-- Sidebar Mobile -->
    <transition name="slide">
      <Sidebar
        v-if="showMobileSidebar"
        :isCollapsed="false"
        class="fixed top-0 left-0 h-full bg-base-100 shadow-lg z-50"
        @toggleCollapse="showMobileSidebar = false"
      />
    </transition>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <Navbar @toggleMobile="showMobileSidebar = !showMobileSidebar" />
      <main class="p-6 flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sidebar from '~/components/Sidebar.vue'
import Navbar from '~/components/Navbar.vue'

const isCollapsed = ref(false)
const showMobileSidebar = ref(false)
const isDesktop = computed(() => window.innerWidth >= 768)

onMounted(() => {
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      showMobileSidebar.value = false
    }
  })
})
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
