import { useMenuStore } from "@/stores/menu";

export const usePermission = () => {
  const menuStore = useMenuStore();

  const getMenuByUrl = (url: string): any | null => {
    const searchTree = (items: any[]): any | null => {
      if (!Array.isArray(items)) return null;
      for (const item of items) {
        const itemUrl = item.url || item.path;
        if (itemUrl === url) return item;
        if (item.children && item.children.length > 0) {
          const found = searchTree(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return searchTree(menuStore.menus);
  };

  const getAccessLevel = (url: string): string | null => {
    const menu = getMenuByUrl(url);
    return menu?.accessLevel || null;
  };

  const canRead = (url: string): boolean => {
    const level = getAccessLevel(url);
    return level !== null && level !== undefined;
  };

  const canWrite = (url: string): boolean => {
    const level = getAccessLevel(url);
    return (
      level === "full-akses" ||
      level === "admin-akses" ||
      level === "change-akses"
    );
  };

  const canDelete = (url: string): boolean => {
    const level = getAccessLevel(url);
    return level === "full-akses" || level === "admin-akses";
  };

  return {
    getAccessLevel,
    canRead,
    canWrite,
    canDelete,
  };
};
