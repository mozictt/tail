import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  BulkCreateTarifLayananPayload,
  BulkCreateTarifLayananResponse,
  CreateTarifLayananPayload,
  CreateTarifTindakanPayload,
  JenisTarif,
  QueryTarifParams,
  ResolveTarifParams,
  TarifLayananItem,
  TarifOptionItem,
  TarifResolveResult,
  TarifTindakanItem,
  UpdateTarifLayananPayload,
  UpdateTarifTindakanPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/tarif";

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
 * Membangun body aturan harga dengan tetap mempertahankan `null` secara eksplisit
 * untuk dimensi wildcard (Semua Unit/Penjamin/Kelas) atau berlakuSampai.
 */
const buildHargaPayloadBody = (
  payload: CreateTarifLayananPayload | UpdateTarifLayananPayload,
): Record<string, unknown> => ({
  unitId: payload.unitId ? Number(payload.unitId) : null,
  penjaminId: payload.penjaminId ? Number(payload.penjaminId) : null,
  kelasId: payload.kelasId ? Number(payload.kelasId) : null,
  jasaSarana: Number(payload.jasaSarana ?? 0),
  bhp: Number(payload.bhp ?? 0),
  jasaDokter: Number(payload.jasaDokter ?? 0),
  jasaNakes: Number(payload.jasaNakes ?? 0),
  ...(payload.berlakuMulai ? { berlakuMulai: payload.berlakuMulai } : {}),
  berlakuSampai: payload.berlakuSampai ? payload.berlakuSampai : null,
  keterangan:
    payload.keterangan && payload.keterangan.trim() !== ""
      ? payload.keterangan.trim()
      : null,
  ...(payload.status ? { status: payload.status } : {}),
});

/**
 * Service HTTP untuk Master Data Tarif Tindakan & Matriks Harga (/master/tarif).
 */
export const TarifService = () => {
  const api = useApi();

  const getTarif = async (
    params?: QueryTarifParams,
  ): Promise<MasterPaginatedResponse<TarifTindakanItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      jenisTarif: params?.jenisTarif,
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      penjaminId: params?.penjaminId ? Number(params.penjaminId) : undefined,
      kelasId: params?.kelasId ? Number(params.kelasId) : undefined,
      status: params?.status,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<TarifTindakanItem>(
      res,
      safePage,
      safeLimit,
    );
  };

  const getTarifOptions = async (params?: {
    search?: string;
    jenisTarif?: JenisTarif | "";
  }): Promise<TarifOptionItem[]> => {
    const query = compactPayload({
      search: params?.search,
      jenisTarif: params?.jenisTarif,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/options`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return unwrapArray<TarifOptionItem>(res);
  };

  const getTarifById = async (id: number): Promise<TarifTindakanItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<TarifTindakanItem>(res);
  };

  const resolveTarif = async (
    params: ResolveTarifParams,
  ): Promise<TarifResolveResult> => {
    const query = compactPayload({
      tindakanId: Number(params.tindakanId),
      unitId: params.unitId ? Number(params.unitId) : undefined,
      penjaminId: params.penjaminId ? Number(params.penjaminId) : undefined,
      kelasId: params.kelasId ? Number(params.kelasId) : undefined,
      tanggal: params.tanggal,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/resolve`, {
      method: "GET",
      params: query,
    });

    return unwrapData<TarifResolveResult>(res);
  };

  const createTarif = async (
    payload: CreateTarifTindakanPayload,
  ): Promise<TarifTindakanItem> => {
    const body = compactPayload(
      payload as unknown as Record<string, unknown>,
    ) as Record<string, unknown>;
    if (payload.tarifDefault) {
      body.tarifDefault = {
        jasaSarana: Number(payload.tarifDefault.jasaSarana ?? 0),
        bhp: Number(payload.tarifDefault.bhp ?? 0),
        jasaDokter: Number(payload.tarifDefault.jasaDokter ?? 0),
        jasaNakes: Number(payload.tarifDefault.jasaNakes ?? 0),
      };
    }

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<TarifTindakanItem>(res);
  };

  const updateTarif = async (
    id: number,
    payload: UpdateTarifTindakanPayload,
  ): Promise<TarifTindakanItem> => {
    const body = compactPayload(payload as unknown as Record<string, unknown>);
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return unwrapData<TarifTindakanItem>(res);
  };

  const deleteTarif = async (id: number): Promise<{ message: string }> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return unwrapData<{ message: string }>(res);
  };

  const createTarifHarga = async (
    tindakanId: number,
    payload: CreateTarifLayananPayload,
  ): Promise<TarifLayananItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${tindakanId}/harga`, {
      method: "POST",
      body: buildHargaPayloadBody(payload),
    });
    return unwrapData<TarifLayananItem>(res);
  };

  const bulkCreateTarifHarga = async (
    tindakanId: number,
    payload: BulkCreateTarifLayananPayload,
  ): Promise<BulkCreateTarifLayananResponse> => {
    const body: Record<string, unknown> = {
      unitIds: payload.unitIds?.map(Number) ?? [],
      penjaminIds: payload.penjaminIds?.map(Number) ?? [],
      kelasIds: payload.kelasIds?.map(Number) ?? [],
      jasaSarana: Number(payload.jasaSarana ?? 0),
      bhp: Number(payload.bhp ?? 0),
      jasaDokter: Number(payload.jasaDokter ?? 0),
      jasaNakes: Number(payload.jasaNakes ?? 0),
      modeDuplikat: payload.modeDuplikat ?? "SKIP",
      ...(payload.berlakuMulai ? { berlakuMulai: payload.berlakuMulai } : {}),
      berlakuSampai: payload.berlakuSampai ? payload.berlakuSampai : null,
      keterangan:
        payload.keterangan && payload.keterangan.trim() !== ""
          ? payload.keterangan.trim()
          : null,
      ...(payload.status ? { status: payload.status } : {}),
    };

    const res = await api<unknown>(
      `${BASE_ENDPOINT}/${tindakanId}/harga/bulk`,
      {
        method: "POST",
        body,
      },
    );
    return unwrapData<BulkCreateTarifLayananResponse>(res);
  };

  const updateTarifHarga = async (
    hargaId: number,
    payload: UpdateTarifLayananPayload,
  ): Promise<TarifLayananItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/harga/${hargaId}`, {
      method: "PUT",
      body: buildHargaPayloadBody(payload),
    });
    return unwrapData<TarifLayananItem>(res);
  };

  const deleteTarifHarga = async (
    hargaId: number,
  ): Promise<{ message: string }> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/harga/${hargaId}`, {
      method: "DELETE",
    });
    return unwrapData<{ message: string }>(res);
  };

  return {
    getTarif,
    getTarifOptions,
    getTarifById,
    resolveTarif,
    createTarif,
    updateTarif,
    deleteTarif,
    createTarifHarga,
    bulkCreateTarifHarga,
    updateTarifHarga,
    deleteTarifHarga,
  };
};

