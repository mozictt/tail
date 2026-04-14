export default defineNuxtRouteMiddleware(async (to, from) => {
  const { token, refreshTokenAsync, isTokenExpired, logout } = useAuth();

  const auth = useAuthStore();
  if (!auth.isHydrated) return;
  console.log(auth.token);
  // ✅ PUBLIC ROUTES (WAJIB PALING ATAS)
  const publicPages = ["/login", "/forbidden"];

  if (publicPages.includes(to.path)) {
    return; // ⛔ stop di sini
  }

  // ❌ belum login
  if (!auth.token) {
    return navigateTo("/login");
  }
  console.log(auth.token);
  // 🔐 cek menu
  const menus_midd = auth.token
    ? JSON.parse(atob(auth.token.split(".")[1])).menus || []
    : [];

  // console.log("authStore.menus",authStore.menus);

  const allowedMenus = menus_midd.map((m: any) => m.path);

  const isAllowed = allowedMenus.some(
    (path) => to.path === path || to.path.startsWith(path + "/"),
  );

  if (!isAllowed) {
    // return navigateTo("/forbidden");
  }
});
