import { useApi } from "@/composables/useApi";
import { compactPayload, normalizePaginatedResponse } from "@/utils/payload.util";
import type { MasterPaginatedResponse } from "@/types/master-data";
import type {
  CreatePasienPayload,
  CreatePasienPenjaminPayload,
  PasienItem,
  PasienLookupItem,
  PasienPenjaminItem,
  QueryPasienParams,
  UpdatePasienPayload,
  UpdatePasienPenjaminPayload,
} from "@/types/simrs";

const BASE_ENDPOINT = "/master/pasien";

const unwrapArray = <T>(res: any): T[] => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload.items)) return payload.items as T[];
  return [];
};

const sanitizePenjaminItemPayload = <T extends object>(
  item: T,
  preserveNullKelas = false,
): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = compactPayload(
    item as Record<string, unknown>,
  );
  if (cleaned.penjaminId !== undefined) {
    cleaned.penjaminId = Number(cleaned.penjaminId);
  }
  const rawKelasHakId = (item as { kelasHakId?: number | null }).kelasHakId;
  if (preserveNullKelas && rawKelasHakId === null) {
    cleaned.kelasHakId = null;
  } else if (cleaned.kelasHakId !== undefined) {
    cleaned.kelasHakId = Number(cleaned.kelasHakId);
  }
  return cleaned;
};

/**
 * Service HTTP untuk Master Pasien & Penjamin Pasien (/master/pasien).
 */
export const PasienService = () => {
  const api = useApi();

  const getPasien = async (
    params?: QueryPasienParams,
  ): Promise<MasterPaginatedResponse<PasienItem>> => {
    const safePage = Math.max(1, Number(params?.page ?? 1));
    const safeLimit = Math.max(1, Math.min(100, Number(params?.limit ?? 10)));

    const query = compactPayload({
      page: safePage,
      limit: safeLimit,
      search: params?.search,
      penjaminId: params?.penjaminId ? Number(params.penjaminId) : undefined,
      jenisPenjamin: params?.jenisPenjamin,
      kelasHakId: params?.kelasHakId ? Number(params.kelasHakId) : undefined,
      isBayiBaruLahir:
        typeof params?.isBayiBaruLahir === "boolean"
          ? params.isBayiBaruLahir
          : undefined,
      status: params?.status,
      sortBy: params?.sortBy || "id",
      sortType: params?.sortType || "DESC",
    });

    const res: any = await api(BASE_ENDPOINT, {
      method: "GET",
      params: query,
    });

    return normalizePaginatedResponse<PasienItem>(res, safePage, safeLimit);
  };

  const lookupPasien = async (q = ""): Promise<PasienLookupItem[]> => {
    const trimmed = q.trim();
    const res: any = await api(`${BASE_ENDPOINT}/lookup`, {
      method: "GET",
      params: trimmed ? { q: trimmed } : undefined,
    });
    return unwrapArray<PasienLookupItem>(res);
  };

  const getPasienByNoRm = async (noRm: string): Promise<PasienItem> => {
    const encoded = encodeURIComponent(noRm.trim());
    const res: any = await api(`${BASE_ENDPOINT}/no-rm/${encoded}`, {
      method: "GET",
    });
    return (res?.data ?? res) as PasienItem;
  };

  const getPasienById = async (id: number): Promise<PasienItem> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "GET",
    });
    return (res?.data ?? res) as PasienItem;
  };

  const createPasien = async (
    payload: CreatePasienPayload,
  ): Promise<PasienItem> => {
    const { penjaminList, ...rest } = payload;
    const body: Record<string, any> = compactPayload(rest);

    if (Array.isArray(penjaminList) && penjaminList.length > 0) {
      body.penjaminList = penjaminList.map((item) =>
        sanitizePenjaminItemPayload(item),
      );
    }

    const res: any = await api(BASE_ENDPOINT, {
      method: "POST",
      body,
    });
    return (res?.data ?? res) as PasienItem;
  };

  const updatePasien = async (
    id: number,
    payload: UpdatePasienPayload,
  ): Promise<PasienItem> => {
    const body = compactPayload(payload);
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "PUT",
      body,
    });
    return (res?.data ?? res) as PasienItem;
  };

  const deletePasien = async (id: number): Promise<{ message: string }> => {
    const res: any = await api(`${BASE_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    return (res?.data ?? res) as { message: string };
  };

  /* =========================
     SUB-RESOURCE PENJAMIN PASIEN
  ========================= */
  const getPasienPenjaminList = async (
    pasienId: number,
  ): Promise<PasienPenjaminItem[]> => {
    const res: any = await api(`${BASE_ENDPOINT}/${pasienId}/penjamin`, {
      method: "GET",
    });
    return unwrapArray<PasienPenjaminItem>(res);
  };

  const addPasienPenjamin = async (
    pasienId: number,
    payload: CreatePasienPenjaminPayload,
  ): Promise<PasienPenjaminItem> => {
    const body = sanitizePenjaminItemPayload(payload);
    const res: any = await api(`${BASE_ENDPOINT}/${pasienId}/penjamin`, {
      method: "POST",
      body,
    });
    return (res?.data ?? res) as PasienPenjaminItem;
  };

  const updatePasienPenjamin = async (
    pasienId: number,
    penjaminId: number,
    payload: UpdatePasienPenjaminPayload,
  ): Promise<PasienPenjaminItem> => {
    const body = sanitizePenjaminItemPayload(payload, true);
    const res: any = await api(
      `${BASE_ENDPOINT}/${pasienId}/penjamin/${penjaminId}`,
      {
        method: "PUT",
        body,
      },
    );
    return (res?.data ?? res) as PasienPenjaminItem;
  };

  const removePasienPenjamin = async (
    pasienId: number,
    penjaminId: number,
  ): Promise<{ message: string }> => {
    const res: any = await api(
      `${BASE_ENDPOINT}/${pasienId}/penjamin/${penjaminId}`,
      {
        method: "DELETE",
      },
    );
    return (res?.data ?? res) as { message: string };
  };

  return {
    getPasien,
    lookupPasien,
    getPasienByNoRm,
    getPasienById,
    createPasien,
    updatePasien,
    deletePasien,
    getPasienPenjaminList,
    addPasienPenjamin,
    updatePasienPenjamin,
    removePasienPenjamin,
  };
};
