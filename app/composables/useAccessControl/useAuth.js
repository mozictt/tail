import { ref } from "vue";

const userRole = ref("guest"); // default guest

export const useAuth = () => {
  // Misal kamu nanti bisa ganti ini dari login / session
  return { userRole };
};
