export default defineNuxtRouteMiddleware((to, from) => {
  const { userRole } = useAuth();

  if (to.path.startsWith("/settings") && userRole.value !== "admin") {
    return navigateTo("/forbidden");
  }
   if (userRole.value === "guest" && to.path !== "/login") {
    return navigateTo("/login");
  }
});
