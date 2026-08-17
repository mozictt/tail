import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTenantMasterStore } from '@/stores/tenantMaster';

/**
 * Composable reusable untuk navigasi berbasis slug tenant.
 * 
 * Menyediakan helper untuk:
 * - Mendapatkan slug aktif dari URL, target tenant store, atau auth store
 * - Membuat path URL yang sudah di-prefix dengan slug
 * - Mengecek apakah URL saat ini berada di konteks slug yang benar
 */
export const useSlugRoute = () => {
  const route = useRoute();
  const auth = useAuthStore();
  const masterStore = useTenantMasterStore();

  /** Slug tenant aktif, prioritas dari URL param, lalu target tenant store, lalu auth store */
  const currentSlug = computed(() => {
    return (route.params.slug as string) || masterStore.targetTenantSlug || auth.slug || '';
  });

  /**
   * Membuat path URL dengan prefix slug tenant.
   * Contoh: slugPath('/dashboard') → '/klinik-sehat/dashboard'
   */
  const slugPath = (path: string): string => {
    const slug = currentSlug.value;
    if (!slug) return path;

    // Hindari double-prefix jika path sudah mengandung slug
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${slug}${cleanPath}`;
  };

  /**
   * Mengecek apakah slug di URL cocok dengan slug tenant user yang sedang login.
   * Berguna untuk validasi keamanan di middleware.
   */
  const isSlugValid = computed(() => {
    const urlSlug = route.params.slug as string;
    if (!urlSlug || !auth.slug) return false;
    return urlSlug === auth.slug;
  });

  return {
    currentSlug,
    slugPath,
    isSlugValid,
  };
};
