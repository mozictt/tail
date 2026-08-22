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

  // 🔐 Validasi slug di URL harus cocok dengan slug tenant user atau target tenant saat switch
  const masterStore = useTenantMasterStore();
  const urlSlug = to.params.slug as string | undefined;
  const targetSlug = masterStore.targetTenantSlug;
  const isMasterAdmin = auth.isMasterTenant && auth.role === 'Super Admin';

  if (urlSlug && auth.slug && urlSlug !== auth.slug && urlSlug !== targetSlug && !isMasterAdmin) {
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
      if (path && typeof path === 'string' && path.trim() !== '') {
        urls.push(path.trim());
      }
      if (m.children && m.children.length > 0) {
        urls = urls.concat(extractUrls(m.children));
      }
    }
    return urls;
  };

  const allowedMenus = extractUrls(menuStore.authorizedMenus);
  const allSystemMenus = extractUrls(menuStore.menus);

  // Ambil path tanpa prefix slug untuk dicocokkan dengan menu backend
  // Contoh: /pos/whatsapp/history → /whatsapp/history
  const pathWithoutSlug = urlSlug 
    ? to.path.replace(`/${urlSlug}`, '') || '/'
    : to.path;

  // 1. Jika path eksak ada di daftar menu yang diizinkan → IZINKAN
  if (allowedMenus.includes(pathWithoutSlug)) {
    return;
  }

  // 2. Jika path eksak terdaftar di master menu sistem tetapi TIDAK ada di allowedMenus (misal accessLevel-nya null) → BLOKIR (Forbidden)
  if (allSystemMenus.includes(pathWithoutSlug)) {
    return navigateTo("/forbidden");
  }

  // 3. Untuk sub-path dinamis (misal /barang/listtable/edit/1):
  // Cek apakah berawalan dari salah satu allowedMenus
  const isAllowedSubPath = allowedMenus.some((menuPath) => {
    const segments = menuPath.split("/").filter(Boolean);
    if (segments.length >= 1 && pathWithoutSlug.startsWith(menuPath + "/")) {
      return true;
    }
    return false;
  });

  if (!isAllowedSubPath) {
    return navigateTo("/forbidden");
  }
});
