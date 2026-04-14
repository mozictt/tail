export default defineNuxtRouteMiddleware(async (to, from) => {
  const { token, refreshTokenAsync, isTokenExpired, logout } = useAuth();

  const auth = useAuthStore();
  // ✅ PUBLIC ROUTES (WAJIB PALING ATAS)
  const publicPages = ["/login", "/forbidden"];
  if (!auth.isHydrated) {
    return;
  }

  if (publicPages.includes(to.path)) {
    return; // ⛔ stop di sini
  }

  // ❌ belum login
  if (!auth.token) {
    return navigateTo("/login");
  }
  // 🔐 cek menu
  const menus_midd = auth.token
    ? JSON.parse(atob(auth.token.split(".")[1])).menus || []
    : [];

  console.log(menus_midd);

  const allowedMenus = menus_midd.map((m: any) => m.path);

  const isAllowed = allowedMenus.some(
    (path) => to.path === path || to.path.startsWith(path + "/"),
  );

  if (!isAllowed) {
    // return navigateTo("/forbidden");
  }
});
