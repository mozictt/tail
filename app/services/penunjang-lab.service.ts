import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  CreatePenunjangLabPayload,
  PenunjangLabEligibleKunjunganItem,
  PenunjangLabOrderItem,
  PenunjangLabPreviewResponse,
  QueryEligibleKunjunganLabParams,
  QueryPenunjangLabParams,
  SaveHasilPenunjangLabPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/transaksi/penunjang-lab";

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

/**
 * Service HTTP untuk Transaksi Penunjang & Input Hasil Laboratorium (/transaksi/penunjang-lab).
 */
export const PenunjangLabService = () => {
  const api = useApi();

  const getEligibleKunjungan = async (
    params?: QueryEligibleKunjunganLabParams,
  ): Promise<MasterPaginatedResponse<PenunjangLabEligibleKunjunganItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      tanggalDari: params?.tanggalDari,
      tanggalSampai: params?.tanggalSampai,
      filterEligible: params?.filterEligible || "ALL",
      unitId: params?.unitId ? Number(params.unitId) : undefined,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/kunjungan-eligible`, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<PenunjangLabEligibleKunjunganItem>(
      res,
      safePage,
      safeLimit,
    );
  };

  const previewTindakan = async (params: {
    pendaftaranId: number;
    tindakanIds: number[];
    unitLabId?: number | null;
  }): Promise<PenunjangLabPreviewResponse> => {
    const query = compactPayload({
      pendaftaranId: Number(params.pendaftaranId),
      tindakanIds: params.tindakanIds.join(","),
      unitLabId: params.unitLabId ? Number(params.unitLabId) : undefined,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/preview-tindakan`, {
      method: "GET",
      params: query,
    });

    return unwrapData<PenunjangLabPreviewResponse>(res);
  };

  const getOrders = async (
    params?: QueryPenunjangLabParams,
  ): Promise<MasterPaginatedResponse<PenunjangLabOrderItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      tanggalDari: params?.tanggalDari,
      tanggalSampai: params?.tanggalSampai,
      statusLab: params?.statusLab,
      pendaftaranId: params?.pendaftaranId
        ? Number(params.pendaftaranId)
        : undefined,
      isCito: typeof params?.isCito === "boolean" ? params.isCito : undefined,
      sortBy: params?.sortBy || "waktuOrder",
      sortType: params?.sortType || "DESC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<PenunjangLabOrderItem>(
      res,
      safePage,
      safeLimit,
    );
  };

  const getOrderById = async (id: number): Promise<PenunjangLabOrderItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<PenunjangLabOrderItem>(res);
  };

  const createOrder = async (
    payload: CreatePenunjangLabPayload,
  ): Promise<PenunjangLabOrderItem> => {
    const body: Record<string, unknown> = {
      pendaftaranId: Number(payload.pendaftaranId),
      unitLabId: payload.unitLabId ? Number(payload.unitLabId) : null,
      dokterLabId: payload.dokterLabId ? Number(payload.dokterLabId) : null,
      petugasLabId: payload.petugasLabId ? Number(payload.petugasLabId) : null,
      isCito: Boolean(payload.isCito),
      diagnosaKlinis: payload.diagnosaKlinis?.trim() || undefined,
      catatanKlinis: payload.catatanKlinis?.trim() || undefined,
      kesanLab: payload.kesanLab?.trim() || undefined,
      tindakanIds: payload.tindakanIds.map(Number),
      tandaiSelesaiInput: Boolean(payload.tandaiSelesaiInput),
      ...(payload.hasilInputs ? { hasilInputs: payload.hasilInputs } : {}),
    };

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<PenunjangLabOrderItem>(res);
  };

  const saveHasil = async (
    id: number,
    payload: SaveHasilPenunjangLabPayload,
  ): Promise<PenunjangLabOrderItem> => {
    const body: Record<string, unknown> = {
      dokterLabId: payload.dokterLabId ? Number(payload.dokterLabId) : null,
      petugasLabId: payload.petugasLabId ? Number(payload.petugasLabId) : null,
      waktuSampelDiambil: payload.waktuSampelDiambil || null,
      kesanLab: payload.kesanLab?.trim() || null,
      tandaiSelesaiInput: Boolean(payload.tandaiSelesaiInput),
      hasilList: payload.hasilList.map((row) => ({
        id: Number(row.id),
        hasilNilai:
          row.hasilNilai !== undefined && row.hasilNilai !== null
            ? String(row.hasilNilai).trim() || null
            : null,
        catatan: row.catatan?.trim() || null,
      })),
    };

    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/hasil`, {
      method: "PUT",
      body,
    });
    return unwrapData<PenunjangLabOrderItem>(res);
  };

  const verifyOrder = async (
    id: number,
    payload: { dokterLabId?: number | null; kesanLab?: string | null },
  ): Promise<PenunjangLabOrderItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/verifikasi`, {
      method: "PATCH",
      body: {
        dokterLabId: payload.dokterLabId ? Number(payload.dokterLabId) : null,
        kesanLab: payload.kesanLab?.trim() || null,
      },
    });
    return unwrapData<PenunjangLabOrderItem>(res);
  };

  const cancelOrder = async (
    id: number,
    alasan: string,
  ): Promise<PenunjangLabOrderItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/batal`, {
      method: "PATCH",
      body: { alasan: alasan.trim() },
    });
    return unwrapData<PenunjangLabOrderItem>(res);
  };

  return {
    getEligibleKunjungan,
    previewTindakan,
    getOrders,
    getOrderById,
    createOrder,
    saveHasil,
    verifyOrder,
    cancelOrder,
  };
};
