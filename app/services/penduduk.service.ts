import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  CreatePendudukPayload,
  PendudukItem,
  QueryPendudukParams,
  UpdatePendudukPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/penduduk";

export const PendudukService = () => {
  const api = useApi();

  const getPenduduk = async (
    params?: QueryPendudukParams,
  ): Promise<MasterPaginatedResponse<PendudukItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      jenisKelamin: params?.jenisKelamin,
      idKelurahan: params?.idKelurahan,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res: any = await api(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<PendudukItem>(res, safePage, safeLimit);
  };

  const getPendudukById = async (id: number): Promise<PendudukItem> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return (res?.data ?? res) as PendudukItem;
  };

  const getPendudukByNik = async (nik: string): Promise<PendudukItem> => {
    const normalizedNik = encodeURIComponent(nik.trim());
    const res: any = await api(`${BASE_ENDPOINT}/nik/${normalizedNik}`, {
      method: "GET",
    });
    return (res?.data ?? res) as PendudukItem;
  };

  const createPenduduk = async (
    payload: CreatePendudukPayload,
  ): Promise<PendudukItem> => {
    const res: any = await api(BASE_ENDPOINT, {
      method: "POST",
      body: compactPayload(payload),
    });
    return (res?.data ?? res) as PendudukItem;
  };

  const updatePenduduk = async (
    id: number,
    payload: UpdatePendudukPayload,
  ): Promise<PendudukItem> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body: compactPayload(payload),
    });
    return (res?.data ?? res) as PendudukItem;
  };

  const deletePenduduk = async (
    id: number,
  ): Promise<{ message: string }> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return (res?.data ?? res) as { message: string };
  };

  return {
    getPenduduk,
    getPendudukById,
    getPendudukByNik,
    createPenduduk,
    updatePenduduk,
    deletePenduduk,
  };
};

