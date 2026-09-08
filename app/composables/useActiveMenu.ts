import { useRoute } from "vue-router";
import { useMenuStore } from "@/stores/menu";
import { useSlugRoute } from "@/composables/useSlugRoute";

/**
 * Composable untuk menangani status menu aktif secara presisi di Sidebar.
 * Mengatasi masalah multiple active menu akibat perbandingan prefix URL.
 */
export const useActiveMenu = () => {
  const route = useRoute();
  const menuStore = useMenuStore();
  const { currentSlug } = useSlugRoute();

  /**
   * Rekursif mengumpulkan semua path menu yang valid dari menu store.
   */
  const getAllMenuPaths = (items: any[]): string[] => {
    const paths: string[] = [];
    if (!Array.isArray(items)) return paths;

    for (const item of items) {
      const p = item.url || item.path;
      if (p && typeof p === "string" && p.trim() !== "") {
        paths.push(p.trim());
      }
      if (item.children && item.children.length > 0) {
        paths.push(...getAllMenuPaths(item.children));
      }
    }
    return paths;
  };

  /**
   * Mengecek apakah targetPath merupakan menu item yang paling spesifik/aktif untuk URL saat ini.
   */
  const isActive = (targetPath: string | undefined | null): boolean => {
    if (!targetPath || typeof targetPath !== "string") return false;

    // Normalisasi currentPath: Hapus prefix slug tenant dan trailing slash
    const rawPath = currentSlug.value
      ? route.path.replace(new RegExp(`^/${currentSlug.value}`), "") || "/"
      : route.path;

    const currentPath = rawPath === "/" ? "/" : rawPath.replace(/\/$/, "");
    const cleanTarget = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
    const normalizedTarget = cleanTarget === "/" ? "/" : cleanTarget.replace(/\/$/, "");

    // 1. Matched persis (Exact match)
    if (currentPath === normalizedTarget) return true;

    // 2. Matched prefix (untuk sub-halaman yang tidak ada di daftar menu, misal /whatsapp/123/edit)
    if (normalizedTarget !== "/" && currentPath.startsWith(normalizedTarget + "/")) {
      const allPaths = getAllMenuPaths(menuStore.authorizedMenus);

      // Cek apakah ada menu path lain yang LEBIH SPESIFIK (match lebih panjang atau exact match) dengan currentPath
      const hasMoreSpecificMatch = allPaths.some((p) => {
        const cleanP = p.startsWith("/") ? p : `/${p}`;
        const normP = cleanP === "/" ? "/" : cleanP.replace(/\/$/, "");

        if (normP === normalizedTarget) return false; // Abaikan dirinya sendiri
        if (normP.length <= normalizedTarget.length) return false;

        return currentPath === normP || currentPath.startsWith(normP + "/");
      });

      return !hasMoreSpecificMatch;
    }

    return false;
  };

  /**
   * Mengecek apakah minimal salah satu child submenu aktif
   */
  const isParentActive = (children: any[]): boolean => {
    return (
      Array.isArray(children) &&
      children.some(
        (c) => isActive(c.url || c.path) || (c.children && isParentActive(c.children))
      )
    );
  };

  /**
   * Mencari objek menu item yang aktif untuk URL saat ini (Bottom-up: Utamakan leaf child terlebih dahulu)
   */
  const findActiveMenu = (items: any[]): any | null => {
    if (!Array.isArray(items)) return null;

    for (const item of items) {
      if (item.children && item.children.length > 0) {
        const child = findActiveMenu(item.children);
        if (child) return child;
      }
      const itemPath = item.url || item.path;
      if (itemPath && isActive(itemPath)) return item;
    }
    return null;
  };

  return {
    isActive,
    isParentActive,
    findActiveMenu,
  };
};
