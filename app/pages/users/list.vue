<script setup lang="ts">
import { ref } from "vue";

const users = ref([
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User" },
  { id: 3, name: "Bob Marley", email: "bob@example.com", role: "Editor" }
]);
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">List Users</h1>
      <NuxtLink to="/users/create" class="btn btn-primary">+ Add User</NuxtLink>
    </div>

    <div class="overflow-x-auto bg-base-200 rounded-lg shadow">
      <table class="table w-full">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
