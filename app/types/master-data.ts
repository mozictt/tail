export type MasterStatus = 'Y' | 'N';

export type MasterDataType = 'agama' | 'pekerjaan' | 'pendidikan' | 'suku';

export type MasterSortField = 'id' | 'nama';

export type MasterSortOrder = 'asc' | 'desc';

export interface MasterReferenceItem {
  id: number;
  nama: string;
  status: MasterStatus;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterReferenceQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: MasterSortField;
  sortType?: MasterSortOrder;
}

export interface MasterReferencePayload {
  nama: string;
  status?: MasterStatus;
}

export interface MasterPaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface MasterPaginatedResponse<T = MasterReferenceItem> {
  items: T[];
  meta: MasterPaginationMeta;
}

export type MasterIconName = 'BookOpen' | 'Briefcase' | 'GraduationCap' | 'Users';

export interface MasterModuleConfig {
  key: MasterDataType;
  label: string;
  title: string;
  subtitle: string;
  endpoint: string;
  routePath: string;
  permissionResource: string;
  placeholderExample: string;
  iconName: MasterIconName;
  badgeColorClass: string;
}

