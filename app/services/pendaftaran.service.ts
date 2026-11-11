import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  BatalPendaftaranPayload,
  BatalRanapPayload,
  CreatePendaftaranPayload,
  CreatePendaftaranPenjaminItemPayload,
  JadwalDokterTersediaItem,
  MutasiPendaftaranPayload,
  PendaftaranItem,
  PendaftaranUnitHistoryItem,
  QueryJadwalTersediaPendaftaranParams,
  QueryPendaftaranParams,
  SelesaiPendaftaranPayload,
  UpdatePenjaminPendaftaranPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/transaksi/pendaftaran";

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

const normalizeNumericFields = (
  body: Record<string, unknown>,
  fields: readonly string[],
) => {
  for (const field of fields) {
    if (body[field] !== undefined) {
      body[field] = Number(body[field]);
    }
  }
};

const normalizePenjaminItemBody = (
  item: CreatePendaftaranPenjaminItemPayload,
): Record<string, unknown> => {
  const cleaned = compactPayload(
    item as unknown as Record<string, unknown>,
  ) as Record<string, unknown>;
  normalizeNumericFields(cleaned, [
    "urutan",
    "penjaminId",
    "pasienPenjaminId",
    "kelasHakId",
  ]);
  return cleaned;
};

/**
 * Service HTTP untuk Transaksi Pendaftaran & Antrean Pasien (/transaksi/pendaftaran).
 */
export const PendaftaranService = () => {
  const api = useApi();

  const getPendaftaran = async (
    params?: QueryPendaftaranParams,
  ): Promise<MasterPaginatedResponse<PendaftaranItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      tanggalDari: params?.tanggalDari,
      tanggalSampai: params?.tanggalSampai,
      jenisLayanan: params?.jenisLayanan,
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      dokterId: params?.dokterId ? Number(params.dokterId) : undefined,
      penjaminId: params?.penjaminId ? Number(params.penjaminId) : undefined,
      jenisPenjamin: params?.jenisPenjamin,
      statusKunjungan: params?.statusKunjungan,
      aktifSaja:
        typeof params?.aktifSaja === "boolean" ? params.aktifSaja : undefined,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<PendaftaranItem>(res, safePage, safeLimit);
  };

  const getJadwalDokterTersedia = async (
    params?: QueryJadwalTersediaPendaftaranParams,
  ): Promise<JadwalDokterTersediaItem[]> => {
    const query = compactPayload({
      tanggal: params?.tanggal,
      unitId: params?.unitId ? Number(params.unitId) : undefined,
      dokterId: params?.dokterId ? Number(params.dokterId) : undefined,
      sesi: params?.sesi,
      jenisPenjamin: params?.jenisPenjamin,
      search: params?.search,
    });

    const res = await api<unknown>(`${BASE_ENDPOINT}/jadwal-dokter`, {
      method: "GET",
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return unwrapArray<JadwalDokterTersediaItem>(res);
  };

  const getPendaftaranById = async (id: number): Promise<PendaftaranItem> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return unwrapData<PendaftaranItem>(res);
  };

  const getHistoryUnit = async (
    id: number,
  ): Promise<PendaftaranUnitHistoryItem[]> => {
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/history-unit`, {
      method: "GET",
    });
    return unwrapArray<PendaftaranUnitHistoryItem>(res);
  };

  const createPendaftaran = async (
    payload: CreatePendaftaranPayload,
  ): Promise<PendaftaranItem> => {
    const body = compactPayload(
      payload as unknown as Record<string, unknown>,
    ) as Record<string, unknown>;
    normalizeNumericFields(body, [
      "pasienId",
      "unitId",
      "jadwalDokterId",
      "dokterId",
      "bedId",
      "penjaminId",
      "pasienPenjaminId",
      "kelasHakId",
    ]);

    if (Array.isArray(payload.penjaminList) && payload.penjaminList.length > 0) {
      body.penjaminList = payload.penjaminList.map(normalizePenjaminItemBody);
    }

    const res = await api<unknown>(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return unwrapData<PendaftaranItem>(res);
  };

  const updatePenjaminPendaftaran = async (
    id: number,
    payload: UpdatePenjaminPendaftaranPayload,
  ): Promise<PendaftaranItem> => {
    const body = {
      penjaminList: payload.penjaminList.map(normalizePenjaminItemBody),
    };

    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/penjamin`, {
      method: "PUT",
      body,
    });
    return unwrapData<PendaftaranItem>(res);
  };

  const mutasiPendaftaran = async (
    id: number,
    payload: MutasiPendaftaranPayload,
  ): Promise<PendaftaranItem> => {
    const body = compactPayload(
      payload as unknown as Record<string, unknown>,
    ) as Record<string, unknown>;
    normalizeNumericFields(body, [
      "unitTujuanId",
      "jadwalDokterId",
      "dokterTujuanId",
      "bedTujuanId",
    ]);

    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/mutasi`, {
      method: "POST",
      body,
    });
    return unwrapData<PendaftaranItem>(res);
  };

  const batalRanap = async (
    id: number,
    payload: BatalRanapPayload,
  ): Promise<PendaftaranItem> => {
    const body = compactPayload(payload as unknown as Record<string, unknown>);
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/batal-ranap`, {
      method: "POST",
      body,
    });
    return unwrapData<PendaftaranItem>(res);
  };

  const selesaiPendaftaran = async (
    id: number,
    payload: SelesaiPendaftaranPayload,
  ): Promise<PendaftaranItem> => {
    const body = compactPayload(payload as unknown as Record<string, unknown>);
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/selesai`, {
      method: "PATCH",
      body,
    });
    return unwrapData<PendaftaranItem>(res);
  };

  const batalPendaftaran = async (
    id: number,
    payload: BatalPendaftaranPayload,
  ): Promise<PendaftaranItem> => {
    const body = compactPayload(payload as unknown as Record<string, unknown>);
    const res = await api<unknown>(`${BASE_ENDPOINT}/${id}/batal`, {
      method: "PATCH",
      body,
    });
    return unwrapData<PendaftaranItem>(res);
  };

  return {
    getPendaftaran,
    getJadwalDokterTersedia,
    getPendaftaranById,
    getHistoryUnit,
    createPendaftaran,
    updatePenjaminPendaftaran,
    mutasiPendaftaran,
    batalRanap,
    selesaiPendaftaran,
    batalPendaftaran,
  };
};

