import type { MasterPaginatedResponse } from "@/types/master-data";

/**
 * Menghapus properti yang bernilai undefined, null, atau string kosong secara rekursif
 * agar kompatibel dengan ValidationPipe NestJS pada field opsional.
 * Nilai boolean `false` dan angka `0` tetap dipertahankan.
 */
export function compactPayload<T extends Record<string, any>>(input: T): Partial<T> {
  const result: Record<string, any> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (trimmed === "") continue;
      result[key] = trimmed;
      continue;
    }

    if (Array.isArray(rawValue)) {
      result[key] = rawValue;
      continue;
    }

    if (typeof rawValue === "object" && !(rawValue instanceof Date)) {
      const nested = compactPayload(rawValue);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
      continue;
    }

    result[key] = rawValue;
  }

  return result as Partial<T>;
}

/**
 * Menormalkan berbagai bentuk respons paginasi backend (ResponseInterceptor `{ data: { items, meta } }`,
 * format legacy `{ array, currentPage, totalItems, totalPages }`, atau array langsung).
 */
export function normalizePaginatedResponse<T>(
  res: any,
  fallbackPage = 1,
  fallbackLimit = 10,
): MasterPaginatedResponse<T> {
  const target = res?.data ?? res;

  if (target && Array.isArray(target.items)) {
    const items = target.items as T[];
    const totalItems = Number(target.meta?.totalItems ?? items.length);
    const itemsPerPage = Number(target.meta?.itemsPerPage ?? fallbackLimit);
    return {
      items,
      meta: {
        totalItems,
        itemCount: Number(target.meta?.itemCount ?? items.length),
        itemsPerPage,
        totalPages: Number(
          target.meta?.totalPages ?? (Math.ceil(totalItems / itemsPerPage) || 1),
        ),
        currentPage: Number(target.meta?.currentPage ?? fallbackPage),
      },
    };
  }

  if (target && Array.isArray(target.array)) {
    const items = target.array as T[];
    const totalItems = Number(target.totalItems ?? items.length);
    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: fallbackLimit,
        totalPages: Number(
          target.totalPages ?? (Math.ceil(totalItems / fallbackLimit) || 1),
        ),
        currentPage: Number(target.currentPage ?? fallbackPage),
      },
    };
  }

  const fallbackItems = Array.isArray(target) ? (target as T[]) : [];
  return {
    items: fallbackItems,
    meta: {
      totalItems: fallbackItems.length,
      itemCount: fallbackItems.length,
      itemsPerPage: fallbackLimit,
      totalPages: Math.ceil(fallbackItems.length / fallbackLimit) || 1,
      currentPage: fallbackPage,
    },
  };
}

