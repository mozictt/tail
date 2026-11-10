import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  AvailablePegawaiOption,
  AvailablePendudukOption,
  CreateDokterPayload,
  DokterItem,
  QueryDokterParams,
  UpdateDokterPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/dokter";

const unwrapArray = <T>(res: any): T[] => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload.items)) return payload.items as T[];
  return [];
};

export const DokterService = () => {
  const api = useApi();

  const getDokter = async (
    params?: QueryDokterParams,
  ): Promise<MasterPaginatedResponse<DokterItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      jenisDokter: params?.jenisDokter,
      spesialisasi: params?.spesialisasi,
      status: params?.status,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res: any = await api(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<DokterItem>(res, safePage, safeLimit);
  };

  const getDokterById = async (id: number): Promise<DokterItem> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return (res?.data ?? res) as DokterItem;
  };

  const getAvailablePegawai = async (
    search = "",
  ): Promise<AvailablePegawaiOption[]> => {
    const res: any = await api(`${BASE_ENDPOINT}/available-pegawai`, {
      method: "GET",
      params: search.trim() ? { search: search.trim() } : undefined,
    });
    return unwrapArray<AvailablePegawaiOption>(res);
  };

  const getAvailablePenduduk = async (
    search = "",
  ): Promise<AvailablePendudukOption[]> => {
    const res: any = await api(`${BASE_ENDPOINT}/available-penduduk`, {
      method: "GET",
      params: search.trim() ? { search: search.trim() } : undefined,
    });
    return unwrapArray<AvailablePendudukOption>(res);
  };

  const createDokter = async (
    payload: CreateDokterPayload,
  ): Promise<DokterItem> => {
    const body = compactPayload(payload);
    const res: any = await api(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return (res?.data ?? res) as DokterItem;
  };

  const updateDokter = async (
    id: number,
    payload: UpdateDokterPayload,
  ): Promise<DokterItem> => {
    const body = compactPayload(payload);
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return (res?.data ?? res) as DokterItem;
  };

  const deleteDokter = async (id: number): Promise<{ message: string }> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return (res?.data ?? res) as { message: string };
  };

  return {
    getDokter,
    getDokterById,
    getAvailablePegawai,
    getAvailablePenduduk,
    createDokter,
    updateDokter,
    deleteDokter,
  };
};

