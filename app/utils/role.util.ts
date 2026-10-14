/**
 * Konstanta role sistem terpusat untuk frontend
 */
export const ROLE_SUPER_ADMIN = 'Super Admin';

/**
 * Mengecek apakah nama role adalah Super Admin secara deklaratif dan case-insensitive.
 */
export function isSuperAdminRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  return String(roleName).trim().toLowerCase() === ROLE_SUPER_ADMIN.toLowerCase();
}
