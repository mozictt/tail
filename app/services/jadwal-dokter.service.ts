import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  BulkCreateJadwalDokterPayload,
  CreateJadwalDokterPayload,
  JadwalDokterItem,
  JadwalDokterWeeklyGroup,
  QueryJadwalDokterMingguanParams,
  QueryJadwalDokterOptionsParams,
  QueryJadwalDokterParams,
  UpdateJadwalDokterPayload,
  UpdateStatusJadwalDokterPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/jadwal-dokter";

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

const normalizeJadwalBody = <T extends object>(payload: T): Record<string, unknown> => {
  const body = compactPayload(payload as Record<string, unknown>);
  const numericFields = [
    "dokterId",
    "unitId",
    "kuotaJkn",
    "kuotaNonJkn",
    "kuotaTotal",
    "durasiPerPasien",
  ];
  for (const field of numericFields) {
    if (body[field] !== undefined) {
      body[field] = Number(body[field]);
    }
  }
  return body;
};

/**
 * Service HTTP untuk Master Jadwal Dokter (/master/jadwal-dokter).
 */
export const JadwalDokterService = () => {
  const api = useApi();

  const getJadwalDokter = async (
    params?: QueryJadwalDokterParams,
  ): Promise<MasterPaginatedResponse<JadwalDokterItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      dokterId: params?.dokterId ? Number(params.dokterId) : undefined,
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      hari: params?.hari,
      sesi: params?.sesi,
      status: params?.status,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<JadwalDokterItem>(res, safePage, safeLimit);
  };

  const getJadwalDokterOptions = async (
    params?: QueryJadwalDokterOptionsParams,
  ): Promise<JadwalDokterItem[]> => {
    const query = compactPayload({
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      dokterId: params?.dokterId ? Number(params.dokterId) : undefined,
      hari: params?.hari,
      tanggal: params?.tanggal,
      sesi: params?.sesi,
      search: params?.search,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/options`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return unwrapArray<JadwalDokterItem>(res);
  };

  const getJadwalDokterMingguan = async (
    params?: QueryJadwalDokterMingguanParams,
  ): Promise<JadwalDokterWeeklyGroup[]> => {
    const query = compactPayload({
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      dokterId: params?.dokterId ? Number(params.dokterId) : undefined,
      sesi: params?.sesi,
      search: params?.search,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/mingguan`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return unwrapArray<JadwalDokterWeeklyGroup>(res);
  };

  const getJadwalDokterById = async (id: number): Promise<JadwalDokterItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<JadwalDokterItem>(res);
  };

  const createJadwalDokter = async (
    payload: CreateJadwalDokterPayload,
  ): Promise<JadwalDokterItem> => {
    const body = normalizeJadwalBody(payload);
    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<JadwalDokterItem>(res);
  };

  const bulkCreateJadwalDokter = async (
    payload: BulkCreateJadwalDokterPayload,
  ): Promise<JadwalDokterItem[]> => {
    const body = normalizeJadwalBody(payload);
    const res = await api<unknown>(`${BASE_ENDPOINT}/bulk`, {
      method: "POST",
      body,
    });
    return unwrapArray<JadwalDokterItem>(res);
  };

  const updateJadwalDokter = async (
    id: number,
    payload: UpdateJadwalDokterPayload,
  ): Promise<JadwalDokterItem> => {
    const body = normalizeJadwalBody(payload);
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return unwrapData<JadwalDokterItem>(res);
  };

  const updateStatusJadwalDokter = async (
    id: number,
    payload: UpdateStatusJadwalDokterPayload,
  ): Promise<JadwalDokterItem> => {
    const body = compactPayload(payload);
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/status`, {
      method: "PATCH",
      body,
    });
    return unwrapData<JadwalDokterItem>(res);
  };

  const deleteJadwalDokter = async (
    id: number,
  ): Promise<{ message: string }> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return unwrapData<{ message: string }>(res);
  };

  return {
    getJadwalDokter,
    getJadwalDokterOptions,
    getJadwalDokterMingguan,
    getJadwalDokterById,
    createJadwalDokter,
    bulkCreateJadwalDokter,
    updateJadwalDokter,
    updateStatusJadwalDokter,
    deleteJadwalDokter,
  };
};

