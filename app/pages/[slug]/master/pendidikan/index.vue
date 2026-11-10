<script setup lang="ts">
import MasterReferenceCrud from "@/components/master/MasterReferenceCrud.vue";
import { MASTER_DATA_CONFIGS } from "@/utils/master-data.config";

definePageMeta({
  layout: "admin",
});

useHead({
  title: MASTER_DATA_CONFIGS.pendidikan.title,
});
</script>

<template>
  <MasterReferenceCrud type="pendidikan" />
</template>

