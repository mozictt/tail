<script setup lang="ts">

import { ref, onMounted, computed } from "vue"
import { useApi } from "@/composables/useApi"

const api = useApi()

const items = ref([])
const page = ref(1)
const limit = ref(5)
const totalPages = ref(1)

const loading = ref(false)

const pages = computed(() => {
  return Array.from({ length: totalPages.value }, (_, i) => i + 1)
})

const fetchData = async () => {
  try {
    loading.value = true;
    const res:any = await api("/barang", {
      params: {
        page: page.value,
        limit: limit.value
      }
    });

    items.value = res.data.array;
    totalPages.value = res.data.totalPages;
  } catch (err) {
    console.error("Fetch barang error:", err);
  } finally {
    loading.value = false;
  }
}

const changePage = (p:number) => {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  fetchData();
}

onMounted(fetchData)

</script>

<template>

<div class="space-y-4">

  <!-- HEADER -->
  <div class="flex justify-between items-center">

    <h1 class="text-2xl font-bold">
      Data Barang
    </h1>

    <button class="btn btn-primary">
      + Tambah Barang
    </button>

  </div>

  <!-- TABLE -->
  <div class="overflow-x-auto bg-base-200 rounded-xl shadow">

    <table class="table w-full">

      <thead>
        <tr>
          <th>ID</th>
          <th>Nama</th>
          <th>Harga</th>
          <th>Stok</th>
          <th>Deskripsi</th>
        </tr>
      </thead>

      <tbody>

        <!-- Loading -->
        <tr v-if="loading">
          <td colspan="5" class="text-center py-6">
            <span class="loading loading-spinner"></span>
          </td>
        </tr>

        <!-- Data -->
        <tr
          v-for="item in items"
          :key="item.id"
          v-else
        >
          <td>{{ item.id }}</td>
          <td>{{ item.nama }}</td>
          <td>
            Rp {{ Number(item.harga).toLocaleString() }}
          </td>
          <td>{{ item.stok }}</td>
          <td>{{ item.deskripsi }}</td>
        </tr>

      </tbody>

    </table>

  </div>

  <!-- PAGINATION -->
  <div class="flex justify-center">

    <div class="join">

      <button
        class="join-item btn"
        @click="changePage(page-1)"
        :disabled="page === 1"
      >
        Prev
      </button>

      <button
        v-for="p in pages"
        :key="p"
        class="join-item btn"
        :class="page === p ? 'btn-active' : ''"
        @click="changePage(p)"
      >
        {{ p }}
      </button>

      <button
        class="join-item btn"
        @click="changePage(page+1)"
        :disabled="page === totalPages"
      >
        Next
      </button>

    </div>

  </div>

</div>

</template>