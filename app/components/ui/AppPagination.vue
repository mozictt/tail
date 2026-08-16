<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit?: number;
    itemUnit?: string;
  }>(),
  {
    limit: 12,
    itemUnit: 'Album',
  }
);

const emit = defineEmits<{
  (e: 'changePage', page: number): void;
  (e: 'update:currentPage', page: number): void;
}>();

const visiblePages = computed(() => {
  const total = props.totalPages;
  const current = props.currentPage;
  const delta = 1; // Jumlah halaman yang ditampilkan di kiri & kanan halaman aktif
  const pages: (number | string)[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (current - delta > 2) {
      pages.push('...');
    }

    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current + delta < total - 1) {
      pages.push('...');
    }

    pages.push(total);
  }

  return pages;
});

const onPageClick = (page: number | string) => {
  if (typeof page === 'number' && page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('update:currentPage', page);
    emit('changePage', page);
  }
};
</script>

<template>
  <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-base-content/10">
    <p class="text-xs text-base-content/60 font-medium">
      Menampilkan Halaman <span class="font-bold text-base-content">{{ currentPage }}</span> dari <span class="font-bold text-base-content">{{ totalPages }}</span> (Total {{ totalItems }} {{ itemUnit }})
    </p>

    <div class="join shadow-sm">
      <button 
        class="join-item btn btn-sm bg-base-100 hover:bg-base-200 border-base-content/10 font-bold" 
        :disabled="currentPage === 1" 
        @click="onPageClick(currentPage - 1)"
        title="Halaman Sebelumnya"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <template v-for="(p, index) in visiblePages" :key="index">
        <button 
          v-if="typeof p === 'number'"
          class="join-item btn btn-sm font-bold min-w-[38px]"
          :class="p === currentPage ? 'btn-primary shadow-md shadow-primary/25' : 'bg-base-100 hover:bg-base-200 border-base-content/10 text-base-content/70'"
          @click="onPageClick(p)"
        >
          {{ p }}
        </button>
        <span v-else class="join-item btn btn-sm bg-base-100 border-base-content/10 btn-disabled text-base-content/40 cursor-default px-2">
          {{ p }}
        </span>
      </template>

      <button 
        class="join-item btn btn-sm bg-base-100 hover:bg-base-200 border-base-content/10 font-bold" 
        :disabled="currentPage === totalPages" 
        @click="onPageClick(currentPage + 1)"
        title="Halaman Selanjutnya"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
