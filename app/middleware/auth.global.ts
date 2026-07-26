export default defineNuxtRouteMiddleware(async (to, from) => { 

  const auth = useAuthStore();
  // ✅ PUBLIC ROUTES (WAJIB PALING ATAS)
  const publicPages = ["/login", "/forbidden"]; 
  
  if (publicPages.includes(to.path)) {
    return; // ⛔ stop di sini
  }

  // ❌ belum login
  if (!auth.token) {
    return navigateTo("/login");
  }
  // 🔐 cek menu
  let menus_midd = [];
  try {
    if (auth.token) {
      const payload = auth.token.split(".")[1];
      if (payload) {
        // Handle base64url to base64 conversion for safety
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        menus_midd = JSON.parse(atob(base64)).menus || [];
      }
    }
  } catch (e) {
    console.error("Token parsing error in middleware:", e);
  }

  console.log(menus_midd);

  const allowedMenus = menus_midd.map((m: any) => m.path);

  const isAllowed = allowedMenus.some(
    (path) => to.path === path || to.path.startsWith(path + "/"),
  );

  if (!isAllowed) {
    // return navigateTo("/forbidden");
  }
});
