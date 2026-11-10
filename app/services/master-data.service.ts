import { useApi } from "@/composables/useApi";
import { MASTER_DATA_CONFIGS } from "@/utils/master-data.config";
import { normalizePaginatedResponse } from "@/utils/payload.util";
import type {
  MasterDataType,
  MasterPaginatedResponse,
  MasterReferenceItem,
  MasterReferencePayload,
  MasterReferenceQuery,
  MasterSortField,
  MasterSortOrder,
  MasterStatus,
} from "@/types/master-data";

export interface MasterResourceClient {
  getAll: (params?: MasterReferenceQuery) => Promise<MasterPaginatedResponse<MasterReferenceItem>>;
  getById: (id: number) => Promise<MasterReferenceItem>;
  create: (payload: MasterReferencePayload) => Promise<MasterReferenceItem>;
  update: (id: number, payload: Partial<MasterReferencePayload>) => Promise<MasterReferenceItem>;
  remove: (id: number) => Promise<{ message: string }>;
}

const VALID_SORT_FIELDS: MasterSortField[] = ["id", "nama"];

const sanitizeStatus = (status?: string): MasterStatus => {
  return status === "N" ? "N" : "Y";
};

/**
 * Service terpadu untuk API Master Referensi (Agama, Pekerjaan, Pendidikan, Suku).
 * Menggunakan satu factory generik untuk menghindari duplikasi logika HTTP & unwrapping.
 */
export const MasterDataService = () => {
  const api = useApi();

  const createResourceClient = (endpoint: string): MasterResourceClient => {
    const getAll = async (
      params?: MasterReferenceQuery,
    ): Promise<MasterPaginatedResponse<MasterReferenceItem>> => {
      const safePage = Math.max(1, Number(params?.page ?? 1));
      const safeLimit = Math.max(1, Number(params?.limit ?? 10));
      const safeSortBy: MasterSortField =
        params?.sortBy && VALID_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : "id";
      const safeSortType: MasterSortOrder =
        String(params?.sortType || "desc").toLowerCase() === "asc" ? "asc" : "desc";

      const query: Record<string, any> = {
        page: safePage,
        limit: safeLimit,
        sortBy: safeSortBy,
        sortType: safeSortType,
      };

      const trimmedSearch = params?.search?.trim();
      if (trimmedSearch) {
        query.search = trimmedSearch;
      }

      const res: any = await api(endpoint, {
        method: "GET",
        params: query,
      });

      return normalizePaginatedResponse<MasterReferenceItem>(res, safePage, safeLimit);
    };

    const getById = async (id: number): Promise<MasterReferenceItem> => {
      const res: any = await api(`${endpoint}/${id}`, {
        method: "GET",
      });
      return (res?.data ?? res) as MasterReferenceItem;
    };

    const create = async (payload: MasterReferencePayload): Promise<MasterReferenceItem> => {
      const cleanPayload: MasterReferencePayload = {
        nama: payload.nama.trim(),
        status: sanitizeStatus(payload.status),
      };

      const res: any = await api(endpoint, {
        method: "POST",
        body: cleanPayload,
      });
      return (res?.data ?? res) as MasterReferenceItem;
    };

    const update = async (
      id: number,
      payload: Partial<MasterReferencePayload>,
    ): Promise<MasterReferenceItem> => {
      const cleanPayload: Partial<MasterReferencePayload> = {};
      if (payload.nama !== undefined) {
        cleanPayload.nama = payload.nama.trim();
      }
      if (payload.status !== undefined) {
        cleanPayload.status = sanitizeStatus(payload.status);
      }

      const res: any = await api(`${endpoint}/${id}`, {
        method: "PUT",
        body: cleanPayload,
      });
      return (res?.data ?? res) as MasterReferenceItem;
    };

    const remove = async (id: number): Promise<{ message: string }> => {
      const res: any = await api(`${endpoint}/${id}`, {
        method: "DELETE",
      });
      return (res?.data ?? res) as { message: string };
    };

    return {
      getAll,
      getById,
      create,
      update,
      remove,
    };
  };

  const clients: Record<MasterDataType, MasterResourceClient> = {
    agama: createResourceClient(MASTER_DATA_CONFIGS.agama.endpoint),
    pekerjaan: createResourceClient(MASTER_DATA_CONFIGS.pekerjaan.endpoint),
    pendidikan: createResourceClient(MASTER_DATA_CONFIGS.pendidikan.endpoint),
    suku: createResourceClient(MASTER_DATA_CONFIGS.suku.endpoint),
  };

  const forType = (type: MasterDataType): MasterResourceClient => {
    return clients[type];
  };

  return {
    forType,
    ...clients,
  };
};

