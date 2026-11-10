<script setup lang="ts">
import PegawaiCrud from "@/components/master/PegawaiCrud.vue";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Manajemen Data Pegawai",
});
</script>

<template>
  <PegawaiCrud />
</template>
