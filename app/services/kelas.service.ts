import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  CreateKelasPayload,
  KelasItem,
  KelasOptionItem,
  QueryKelasParams,
  UpdateKelasPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/kelas";

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
 * Service HTTP untuk Master Kelas Perawatan (/master/kelas).
 */
export const KelasService = () => {
  const api = useApi();

  const getKelas = async (
    params?: QueryKelasParams,
  ): Promise<MasterPaginatedResponse<KelasItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      status: params?.status,
      sortBy: params?.sortBy || "urutan",
      sortType: params?.sortType || "ASC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<KelasItem>(res, safePage, safeLimit);
  };

  const getKelasOptions = async (search = ""): Promise<KelasOptionItem[]> => {
    const trimmed = search.trim();
    const res = await api<unknown>(`${BASE_ENDPOINT}/options`, {
      method: "GET",
      params: trimmed ? { search: trimmed } : undefined,
    });
    return unwrapArray<KelasOptionItem>(res);
  };

  const getKelasById = async (id: number): Promise<KelasItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<KelasItem>(res);
  };

  const createKelas = async (
    payload: CreateKelasPayload,
  ): Promise<KelasItem> => {
    const body = compactPayload(payload);
    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<KelasItem>(res);
  };

  const updateKelas = async (
    id: number,
    payload: UpdateKelasPayload,
  ): Promise<KelasItem> => {
    const body = compactPayload(payload);
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return unwrapData<KelasItem>(res);
  };

  const deleteKelas = async (id: number): Promise<{ message: string }> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return unwrapData<{ message: string }>(res);
  };

  return {
    getKelas,
    getKelasOptions,
    getKelasById,
    createKelas,
    updateKelas,
    deleteKelas,
  };
};

