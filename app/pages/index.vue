<script setup lang="ts">
import { useAccessControl } from "@/composables/useAccessControl/useAccessControl";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});
</script>

<template>
  <h1 class="text-2xl font-bold">Dashboard</h1>
  <p>Welcome to your admin panel 🎉</p>
</template>
