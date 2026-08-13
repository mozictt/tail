export default defineNuxtRouteMiddleware(async (to, from) => { 

  const auth = useAuthStore();
  
  // ✅ PUBLIC ROUTES — tidak memerlukan autentikasi
  const publicPages = ["/login", "/register", "/forbidden"]; 
  
  if (publicPages.includes(to.path)) {
    return; // ⛔ stop di sini
  }

  // ❌ Belum login → redirect ke login
  if (!auth.token) {
    return navigateTo("/login");
  }

  // ✅ Root path "/" → redirect ke /{slug}/dashboard
  if (to.path === "/") {
    if (auth.slug) {
      return navigateTo(`/${auth.slug}/dashboard`, { replace: true });
    }
    return navigateTo("/login");
  }

  // 🔐 Validasi slug di URL harus cocok dengan slug tenant user
  const urlSlug = to.params.slug as string | undefined;
  if (urlSlug && auth.slug && urlSlug !== auth.slug) {
    // Slug di URL tidak cocok → redirect ke forbidden
    return navigateTo("/forbidden");
  }

  // 🔐 Cek menu dari backend via store (permission-based access)
  const menuStore = useMenuStore();
  
  if (auth.id_role && !menuStore.hasFetched) {
    await menuStore.fetchMenus();
  }

  // Helper untuk mendapatkan semua URL dari nested menu
  const extractUrls = (menus: any[]): string[] => {
    let urls: string[] = [];
    for (const m of menus) {
      const path = m.url || m.path;
      if (path) urls.push(path);
      if (m.children && m.children.length > 0) {
        urls = urls.concat(extractUrls(m.children));
      }
    }
    return urls;
  };

  const allowedMenus = extractUrls(menuStore.menus);

  // Ambil path tanpa prefix slug untuk dicocokkan dengan menu backend
  // Contoh: /klinik-sehat/dashboard → /dashboard
  const pathWithoutSlug = urlSlug 
    ? to.path.replace(`/${urlSlug}`, '') || '/'
    : to.path;

  // Dashboard dan Roles diizinkan untuk user yang terotentikasi
  // if (pathWithoutSlug === '/dashboard' || pathWithoutSlug === '/' || pathWithoutSlug === '/roles' || pathWithoutSlug.startsWith('/roles/')) {
  //   return;
  // }

  const isAllowed = allowedMenus.some((menuPath) => {
    // 1. Exact match
    if (pathWithoutSlug === menuPath) return true;
    
    // 2. Prefix match untuk path yang cukup spesifik (misal /barang/edit → /barang/edit/1)
    const segments = menuPath.split("/").filter(Boolean);
    if (segments.length >= 2 && pathWithoutSlug.startsWith(menuPath + "/")) {
      return true;
    }

    return false;
  });

  if (!isAllowed) {
    return navigateTo("/forbidden");
  }
});
