import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  BedItem,
  BedOptionItem,
  BedSummaryItem,
  CreateBedPayload,
  QueryBedParams,
  UpdateBedPayload,
  UpdateBedStatusPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/bed";

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
 * Service HTTP untuk Master Tempat Tidur / Bed (/master/bed).
 */
export const BedService = () => {
  const api = useApi();

  const getBed = async (
    params?: QueryBedParams,
  ): Promise<MasterPaginatedResponse<BedItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      kelasId: params?.kelasId ? Number(params.kelasId) : undefined,
      statusKetersediaan: params?.statusKetersediaan,
      isIsolasi:
        typeof params?.isIsolasi === "boolean" ? params.isIsolasi : undefined,
      status: params?.status,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<BedItem>(res, safePage, safeLimit);
  };

  const getBedOptions = async (params?: {
    unitId?: number;
    kelasId?: number;
  }): Promise<BedOptionItem[]> => {
    const query = compactPayload({
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      kelasId: params?.kelasId ? Number(params.kelasId) : undefined,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/options`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return unwrapArray<BedOptionItem>(res);
  };

  const getBedSummary = async (): Promise<BedSummaryItem[]> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/summary`, {
      method: "GET",
    });
    return unwrapArray<BedSummaryItem>(res);
  };

  const getBedById = async (id: number): Promise<BedItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<BedItem>(res);
  };

  const createBed = async (payload: CreateBedPayload): Promise<BedItem> => {
    const body = compactPayload(payload) as Record<string, unknown>;
    body.unitId = Number(payload.unitId);
    body.kelasId = Number(payload.kelasId);

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<BedItem>(res);
  };

  const updateBed = async (
    id: number,
    payload: UpdateBedPayload,
  ): Promise<BedItem> => {
    const body = compactPayload(payload) as Record<string, unknown>;
    if (body.unitId !== undefined) body.unitId = Number(body.unitId);
    if (body.kelasId !== undefined) body.kelasId = Number(body.kelasId);

    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return unwrapData<BedItem>(res);
  };

  const updateStatusKetersediaan = async (
    id: number,
    payload: UpdateBedStatusPayload,
  ): Promise<BedItem> => {
    const body = compactPayload(payload);
    const res = await api<unknown>(
      `${BASE_ENDPOINT}/${id}/status-ketersediaan`,
      {
        method: "PATCH",
        body,
      },
    );
    return unwrapData<BedItem>(res);
  };

  const deleteBed = async (id: number): Promise<{ message: string }> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return unwrapData<{ message: string }>(res);
  };

  return {
    getBed,
    getBedOptions,
    getBedSummary,
    getBedById,
    createBed,
    updateBed,
    updateStatusKetersediaan,
    deleteBed,
  };
};

