import type { MasterDataType, MasterModuleConfig } from "@/types/master-data";

/**
 * Konfigurasi terpusat untuk seluruh modul Master Referensi (Agama, Pekerjaan, Pendidikan, Suku).
 * Menjaga keselarasan endpoint backend, route frontend, dan resource key RBAC.
 */
export const MASTER_DATA_CONFIGS: Record<MasterDataType, MasterModuleConfig> = {
  agama: {
    key: "agama",
    label: "Agama",
    title: "Master Data Agama",
    subtitle: "Kelola daftar referensi agama yang digunakan pada sistem",
    endpoint: "/master/agama",
    routePath: "/master/agama",
    permissionResource: "Agama",
    placeholderExample: "Contoh: Islam, Kristen Protestan, Katolik, Hindu, Buddha",
    iconName: "BookOpen",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  pekerjaan: {
    key: "pekerjaan",
    label: "Pekerjaan",
    title: "Master Data Pekerjaan",
    subtitle: "Kelola daftar referensi pekerjaan yang digunakan pada sistem",
    endpoint: "/master/pekerjaan",
    routePath: "/master/pekerjaan",
    permissionResource: "Pekerjaan",
    placeholderExample: "Contoh: Pegawai Swasta, PNS, Wiraswasta, Dokter, Perawat",
    iconName: "Briefcase",
    badgeColorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  pendidikan: {
    key: "pendidikan",
    label: "Pendidikan",
    title: "Master Data Pendidikan",
    subtitle: "Kelola daftar referensi jenjang pendidikan yang digunakan pada sistem",
    endpoint: "/master/pendidikan",
    routePath: "/master/pendidikan",
    permissionResource: "Pendidikan",
    placeholderExample: "Contoh: SD, SMP, SMA/SMK, Diploma (D3), Strata 1 (S1)",
    iconName: "GraduationCap",
    badgeColorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  suku: {
    key: "suku",
    label: "Suku",
    title: "Master Data Suku",
    subtitle: "Kelola daftar referensi suku bangsa yang digunakan pada sistem",
    endpoint: "/master/suku",
    routePath: "/master/suku",
    permissionResource: "Suku",
    placeholderExample: "Contoh: Jawa, Sunda, Batak, Minangkabau, Bugis",
    iconName: "Users",
    badgeColorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

