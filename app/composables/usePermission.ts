import { useMenuStore } from "@/stores/menu";
import { useAuthStore } from "@/stores/auth";

export const usePermission = () => {
  const menuStore = useMenuStore();
  const auth = useAuthStore();

  const normalizeUrl = (url?: string | null): string => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    return trimmed === "/" ? "/" : trimmed.replace(/\/$/, "");
  };

  const findMenuInTree = (
    items: any[],
    predicate: (item: any) => boolean,
  ): any | null => {
    if (!Array.isArray(items)) return null;
    for (const item of items) {
      if (predicate(item)) return item;
      if (item.children && item.children.length > 0) {
        const found = findMenuInTree(item.children, predicate);
        if (found) return found;
      }
    }
    return null;
  };

  const getMenuByUrl = (url: string): any | null => {
    const targetUrl = normalizeUrl(url);
    return findMenuInTree(menuStore.menus, (item) => {
      const itemUrl = normalizeUrl(item.url || item.path);
      return itemUrl !== "" && itemUrl === targetUrl;
    });
  };

  const getMenuByResource = (resource: string): any | null => {
    const targetResource = resource.trim().toLowerCase();
    if (!targetResource) return null;
    return findMenuInTree(menuStore.menus, (item) => {
      return (
        typeof item.requiredResource === "string" &&
        item.requiredResource.trim().toLowerCase() === targetResource
      );
    });
  };

  const getAccessLevel = (url: string, resource?: string): string | null => {
    if (auth.isMasterTenant && auth.isSuperAdmin) {
      return "full-akses";
    }
    const menuByUrl = getMenuByUrl(url);
    if (menuByUrl?.accessLevel) {
      return menuByUrl.accessLevel;
    }
    if (resource) {
      const menuByRes = getMenuByResource(resource);
      if (menuByRes?.accessLevel) {
        return menuByRes.accessLevel;
      }
    }
    return null;
  };

  const canRead = (url: string, resource?: string): boolean => {
    const level = getAccessLevel(url, resource);
    return level !== null && level !== undefined;
  };

  const canWrite = (url: string, resource?: string): boolean => {
    const level = getAccessLevel(url, resource);
    return (
      level === "full-akses" ||
      level === "admin-akses" ||
      level === "change-akses"
    );
  };

  const canDelete = (url: string, resource?: string): boolean => {
    const level = getAccessLevel(url, resource);
    return level === "full-akses" || level === "admin-akses";
  };

  return {
    getAccessLevel,
    canRead,
    canWrite,
    canDelete,
  };
};
