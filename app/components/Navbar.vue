<template>
  <div class="navbar bg-base-100 border-b border-base-300 px-4">
    <div class="flex-none md:hidden">
      <button class="btn btn-ghost btn-sm" @click="$emit('toggleMobile')">☰</button>
    </div>
    <div class="flex-1">
      <h1 class="text-lg font-semibold">Welcome, Admin</h1>
    </div>
    <div class="flex-none">
      <button class="btn btn-sm btn-ghost">Logout</button>
    </div>
  </div>
</template>
