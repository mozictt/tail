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
  // 🔐 cek menu dari backend via store
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

  // Default allowed paths if needed (misal dashboard selalu diizinkan)
  if (to.path === "/") {
    return;
  }

  const isAllowed = allowedMenus.some((path) => {
    // 1. Exact match
    if (to.path === path) return true;
    
    // 2. Cegah parent menu (seperti "/barang") memberikan akses penuh ke seluruh sub-menu (seperti "/barang/list").
    // Hanya izinkan prefix match jika path-nya sudah cukup spesifik (misal "/barang/edit" untuk mengizinkan "/barang/edit/1").
    // Kita cek jumlah segmen URL.
    const segments = path.split("/").filter(Boolean);
    if (segments.length >= 2 && to.path.startsWith(path + "/")) {
      return true;
    }

    return false;
  });

  if (!isAllowed) {
    return navigateTo("/forbidden");
  }
});
