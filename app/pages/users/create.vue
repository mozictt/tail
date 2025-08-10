<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const form = ref({
  name: "",
  email: "",
  role: "User"
});

const submitForm = () => {
  alert(`User ${form.value.name} berhasil ditambahkan!`);
  router.push("/users");
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Create User</h1>

    <form @submit.prevent="submitForm" class="bg-base-200 p-6 rounded-lg shadow-md max-w-md">
      <div class="form-control mb-4">
        <label class="label">Name</label>
        <input v-model="form.name" type="text" placeholder="Enter name" class="input input-bordered" required />
      </div>

      <div class="form-control mb-4">
        <label class="label">Email</label>
        <input v-model="form.email" type="email" placeholder="Enter email" class="input input-bordered" required />
      </div>

      <div class="form-control mb-4">
        <label class="label">Role</label>
        <select v-model="form.role" class="select select-bordered">
          <option>User</option>
          <option>Admin</option>
          <option>Editor</option>
        </select>
      </div>

      <button type="submit" class="btn btn-primary w-full">Save</button>
    </form>
  </div>
</template>
