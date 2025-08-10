import { ref } from "vue";

const accessControl = ref(null);

export const useAccessControl = async () => {
  if (!accessControl.value) {
    try {
      accessControl.value = await $fetch("/api/access-control");
    } catch (error) {
      console.error("Failed to fetch access control data:", error);
      accessControl.value = [];
    }
  }
  return accessControl.value;
};
