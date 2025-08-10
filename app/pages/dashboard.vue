<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="card bg-base-100 shadow-lg p-4">
      <p class="text-lg font-bold">📊 Users</p>
      <p class="text-2xl">1,245</p>
    </div>
    <div class="card bg-base-100 shadow-lg p-4">
      <p class="text-lg font-bold">💰 Sales</p>
      <p class="text-2xl">$12,340</p>
    </div>
    <div class="card bg-base-100 shadow-lg p-4">
      <p class="text-lg font-bold">📦 Orders</p>
      <p class="text-2xl">543</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin' })
</script>
