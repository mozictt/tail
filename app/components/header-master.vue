<script setup lang="ts">
defineProps({
  title: String,
  subtitle: String,
  total: Number,
  search: String,
});

const emit = defineEmits([
  "update:search",
  "search",
  "add",
]);
</script>

<template>
  <div class="bg-base-100 border border-base-content/10 rounded-2xl p-6 shadow-premium space-y-4">
    <!-- TOP ROW: TITLE & ADD BUTTON -->
    <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-base-content tracking-tight">{{ title }}</h1>
          <span class="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg">
            {{ total }} Item
          </span>
        </div>
        <p class="text-xs font-medium text-base-content/60 mt-1">{{ subtitle }}</p>
      </div>

      <button class="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 self-start sm:self-auto" @click="emit('add')">
        + Tambah Data
      </button>
    </div>

    <!-- BOTTOM ROW: SEARCH INPUTS -->
    <div class="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-base-content/5">
      <div class="relative w-full sm:max-w-xs">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
        </svg>
        <input
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('search')"
          class="input input-bordered w-full pl-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 bg-base-200/50 focus:bg-base-100 text-base-content"
          placeholder="Cari data..."
        />
      </div>
      <button class="btn btn-outline border-base-content/20 hover:bg-base-200 hover:text-base-content rounded-xl text-base-content/80 font-bold w-full sm:w-auto" @click="emit('search')">
        Cari
      </button>
    </div>
  </div>
</template>