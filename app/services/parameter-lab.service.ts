import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  CreateLabParameterPayload,
  LabParameterItem,
  LabTindakanMappingResponse,
  LabTindakanOverviewItem,
  QueryLabParameterParams,
  QuickAddParameterToTindakanPayload,
  UpdateLabParameterPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/parameter-lab";

interface ApiEnvelope<T> {
  data?: T;
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
 * Service HTTP untuk Master Parameter & Panel Laboratorium (/master/parameter-lab).
 */
export const ParameterLabService = () => {
  const api = useApi();

  const getParameters = async (
    params?: QueryLabParameterParams,
  ): Promise<MasterPaginatedResponse<LabParameterItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      grup: params?.grup,
      tipeHasil: params?.tipeHasil,
      status: params?.status,
      sortBy: params?.sortBy || "urutanDefault",
      sortType: params?.sortType || "ASC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<LabParameterItem>(
      res,
      safePage,
      safeLimit,
    );
  };

  const getParameterOptions = async (
    search = "",
    grup = "",
  ): Promise<LabParameterItem[]> => {
    const query = compactPayload({ search, grup });
    const res = await api<unknown>(`${BASE_ENDPOINT}/options`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return unwrapArray<LabParameterItem>(res);
  };

  const getParameterById = async (id: number): Promise<LabParameterItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<LabParameterItem>(res);
  };

  const createParameter = async (
    payload: CreateLabParameterPayload,
  ): Promise<LabParameterItem> => {
    const body = compactPayload(
      payload as unknown as Record<string, unknown>,
    ) as Record<string, unknown>;
    if (payload.rujukanList !== undefined) {
      body.rujukanList = payload.rujukanList;
    }
    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<LabParameterItem>(res);
  };

  const updateParameter = async (
    id: number,
    payload: UpdateLabParameterPayload,
  ): Promise<LabParameterItem> => {
    const body = compactPayload(
      payload as unknown as Record<string, unknown>,
    ) as Record<string, unknown>;
    if (payload.rujukanList !== undefined) {
      body.rujukanList = payload.rujukanList;
    }
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return unwrapData<LabParameterItem>(res);
  };

  const deleteParameter = async (id: number): Promise<{ message: string }> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return unwrapData<{ message: string }>(res);
  };

  const getTindakanOverview = async (
    search = "",
  ): Promise<LabTindakanOverviewItem[]> => {
    const query = compactPayload({ search });
    const res = await api<unknown>(`${BASE_ENDPOINT}/tindakan-overview`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return unwrapArray<LabTindakanOverviewItem>(res);
  };

  const getMappingByTindakan = async (
    tindakanId: number,
  ): Promise<LabTindakanMappingResponse> => {
    const res = await api<unknown>(
      `${BASE_ENDPOINT}/tindakan/${tindakanId}/mapping`,
      {
        method: "GET",
      },
    );
    return unwrapData<LabTindakanMappingResponse>(res);
  };

  const saveMappingForTindakan = async (
    tindakanId: number,
    items: Array<{
      parameterId: number;
      urutan?: number;
      subGrupLabel?: string | null;
      isWajib?: boolean;
    }>,
  ): Promise<LabTindakanMappingResponse> => {
    const res = await api<unknown>(
      `${BASE_ENDPOINT}/tindakan/${tindakanId}/mapping`,
      {
        method: "PUT",
        body: {
          items: items.map((item, idx) => ({
            parameterId: Number(item.parameterId),
            urutan: Number(item.urutan ?? idx + 1),
            ...(item.subGrupLabel?.trim()
              ? { subGrupLabel: item.subGrupLabel.trim() }
              : {}),
            isWajib: item.isWajib ?? true,
          })),
        },
      },
    );
    return unwrapData<LabTindakanMappingResponse>(res);
  };

  const quickAddToTindakan = async (
    tindakanId: number,
    payload: QuickAddParameterToTindakanPayload,
  ): Promise<LabTindakanMappingResponse> => {
    const body = compactPayload(
      payload as unknown as Record<string, unknown>,
    ) as Record<string, unknown>;
    if (payload.rujukanList !== undefined) {
      body.rujukanList = payload.rujukanList;
    }
    const res = await api<unknown>(
      `${BASE_ENDPOINT}/tindakan/${tindakanId}/quick-add`,
      {
        method: "POST",
        body,
      },
    );
    return unwrapData<LabTindakanMappingResponse>(res);
  };

  return {
    getParameters,
    getParameterOptions,
    getParameterById,
    createParameter,
    updateParameter,
    deleteParameter,
    getTindakanOverview,
    getMappingByTindakan,
    saveMappingForTindakan,
    quickAddToTindakan,
  };
};
