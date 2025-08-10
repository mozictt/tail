<script setup lang="ts">
import { useAuth } from "@/composables/useAuth";

const { userRole } = useAuth();
</script>

<template>
  <div>
    <Sidebar v-if="userRole !== 'guest'" />
    <NuxtPage />
  </div>
</template>
