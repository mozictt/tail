export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore();
  console.log();

//   if (!auth.isLoggedIn) {
//     return navigateTo("/login");
//   }
});