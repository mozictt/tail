import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  CreateUnitPayload,
  QueryUnitOptionsParams,
  QueryUnitParams,
  UnitItem,
  UnitOptionItem,
  UpdateUnitPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/unit";

interface ApiEnvelope<T> {
  data?: T;
  items?: T;
}

const unwrapData = <T>(res: unknown): T => {
  if (res && typeof res === "object" && "data" in res) {
    const envelope = res as ApiEnvelope<T>;
    if (envelope.data !== undefined) return envelope.data;
  }
  return res as T;
};

const unwrapArray = <T>(res: unknown): T[] => {
  const payload = unwrapData<unknown>(res);
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "items" in payload) {
    const items = (payload as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
};

/**
 * Service HTTP untuk Master Unit Pelayanan (/master/unit).
 */
export const UnitService = () => {
  const api = useApi();

  const getUnit = async (
    params?: QueryUnitParams,
  ): Promise<MasterPaginatedResponse<UnitItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      jenisUnit: params?.jenisUnit,
      isTersediaBed:
        typeof params?.isTersediaBed === "boolean"
          ? params.isTersediaBed
          : undefined,
      status: params?.status,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<UnitItem>(res, safePage, safeLimit);
  };

  const getUnitOptions = async (
    params?: QueryUnitOptionsParams,
  ): Promise<UnitOptionItem[]> => {
    const query = compactPayload({
      search: params?.search,
      jenisUnit: params?.jenisUnit,
      isTersediaBed:
        typeof params?.isTersediaBed === "boolean"
          ? params.isTersediaBed
          : undefined,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/options`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return unwrapArray<UnitOptionItem>(res);
  };

  const getUnitById = async (id: number): Promise<UnitItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<UnitItem>(res);
  };

  const createUnit = async (payload: CreateUnitPayload): Promise<UnitItem> => {
    const body = compactPayload(payload) as Record<string, unknown>;
    if (body.parentId !== undefined) body.parentId = Number(body.parentId);
    if (body.kelasDefaultId !== undefined) {
      body.kelasDefaultId = Number(body.kelasDefaultId);
    }

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<UnitItem>(res);
  };

  const updateUnit = async (
    id: number,
    payload: UpdateUnitPayload,
  ): Promise<UnitItem> => {
    const body = compactPayload(payload) as Record<string, unknown>;
    if (payload.parentId === null) {
      body.parentId = null;
    } else if (body.parentId !== undefined) {
      body.parentId = Number(body.parentId);
    }

    if (payload.kelasDefaultId === null) {
      body.kelasDefaultId = null;
    } else if (body.kelasDefaultId !== undefined) {
      body.kelasDefaultId = Number(body.kelasDefaultId);
    }

    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return unwrapData<UnitItem>(res);
  };

  const deleteUnit = async (id: number): Promise<{ message: string }> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return unwrapData<{ message: string }>(res);
  };

  return {
    getUnit,
    getUnitOptions,
    getUnitById,
    createUnit,
    updateUnit,
    deleteUnit,
  };
};

