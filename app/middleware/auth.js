import { useAccessControl } from "~/composables/useAccessControl/useAccessControl";
import { useAuth } from "~/composables/useAuth";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { userRole } = useAuth();

  // Ambil data access control dari API (cached)
  const accessControl = await useAccessControl();

  // Cari rule yang cocok dengan path route
  const rule = accessControl.find((rule) => to.path.startsWith(rule.pathPrefix));

  // Jika ada rule dan user role tidak ada di allowedRoles, redirect forbidden
  if (rule && !rule.allowedRoles.includes(userRole.value)) {
    return navigateTo("/forbidden");
  }

  // Jika user guest dan tidak di halaman login, redirect ke login
  if (userRole.value === "guest" && to.path !== "/login") {
    return navigateTo("/login");
  }
});
