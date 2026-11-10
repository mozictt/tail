import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  CreatePenjaminPayload,
  PenjaminItem,
  PenjaminOptionItem,
  QueryPenjaminParams,
  UpdatePenjaminPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/penjamin";

const unwrapArray = <T>(res: any): T[] => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload.items)) return payload.items as T[];
  return [];
};

/**
 * Service HTTP untuk Master Penjamin / Asuransi (/master/penjamin).
 */
export const PenjaminService = () => {
  const api = useApi();

  const getPenjamin = async (
    params?: QueryPenjaminParams,
  ): Promise<MasterPaginatedResponse<PenjaminItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      jenisPenjamin: params?.jenisPenjamin,
      status: params?.status,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res: any = await api(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<PenjaminItem>(res, safePage, safeLimit);
  };

  const getPenjaminOptions = async (
    search = "",
  ): Promise<PenjaminOptionItem[]> => {
    const trimmed = search.trim();
    const res: any = await api(`${BASE_ENDPOINT}/options`, {
      method: "GET",
      params: trimmed ? { search: trimmed } : undefined,
    });
    return unwrapArray<PenjaminOptionItem>(res);
  };

  const getPenjaminById = async (id: number): Promise<PenjaminItem> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return (res?.data ?? res) as PenjaminItem;
  };

  const createPenjamin = async (
    payload: CreatePenjaminPayload,
  ): Promise<PenjaminItem> => {
    const body = compactPayload(payload);
    const res: any = await api(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return (res?.data ?? res) as PenjaminItem;
  };

  const updatePenjamin = async (
    id: number,
    payload: UpdatePenjaminPayload,
  ): Promise<PenjaminItem> => {
    const body = compactPayload(payload);
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return (res?.data ?? res) as PenjaminItem;
  };

  const deletePenjamin = async (id: number): Promise<{ message: string }> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return (res?.data ?? res) as { message: string };
  };

  return {
    getPenjamin,
    getPenjaminOptions,
    getPenjaminById,
    createPenjamin,
    updatePenjamin,
    deletePenjamin,
  };
};

