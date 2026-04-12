export default defineNuxtRouteMiddleware(async (to, from) => {
  const {
    token,
    refreshTokenAsync,
    isTokenExpired,
    logout,
  } = useAuth();

  const authStore = useAuthStore();

  // ✅ PUBLIC ROUTES (WAJIB PALING ATAS)
  const publicPages = ["/login", "/forbidden"];

  if (publicPages.includes(to.path)) {
    return; // ⛔ stop di sini
  }

  // ❌ belum login
  // console.log(token.value);
  if (!token.value) {
    return navigateTo("/login");
  }
  console.log(token.value );
  // 🔐 cek menu
  const menus_midd =
    token.value
      ? JSON.parse(atob(token.value.split(".")[1])).menus || []
      : [];

    // console.log("authStore.menus",authStore.menus);

  const allowedMenus = menus_midd.map((m: any) => m.path);

  const isAllowed = allowedMenus.some(
    (path) =>
      to.path === path || to.path.startsWith(path + "/")
  );

  if (!isAllowed) {
    // return navigateTo("/forbidden");
  }
});