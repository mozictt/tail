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
  <div class="card bg-base-100 shadow-md border">
    <div class="card-body space-y-4">
      
      <!-- HEADER -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold">{{ title }}</h1>
          <p class="text-sm opacity-60">{{ subtitle }}</p>
        </div>

        <button class="btn btn-primary" @click="emit('add')">
          + Tambah
        </button>
      </div>

      <!-- SEARCH -->
      <div class="flex justify-between items-center">
        <div class="flex gap-2">
          <input
            :value="search"
            @input="emit('update:search', $event.target.value)"
            @keyup.enter="emit('search')"
            class="input input-bordered"
            placeholder="Cari..."
          />
          <button class="btn btn-primary" @click="emit('search')">
            Search
          </button>
        </div>

        <div class="text-sm opacity-60">
          Total: {{ total }}
        </div>
      </div>

    </div>
  </div>
</template>