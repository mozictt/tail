import { ref } from "vue";
import { MasterDataService } from "@/services/master-data.service";
import type { MasterReferenceItem } from "@/types/master-data";

/**
 * Composable untuk memuat daftar master referensi aktif (Agama, Pendidikan, Pekerjaan, Suku)
 * secara paralel tanpa N+1 query untuk kebutuhan form Penduduk & Dokter.
 */
export const useMasterReferences = () => {
  const masterService = MasterDataService();

  const agamaOptions = ref<MasterReferenceItem[]>([]);
  const pendidikanOptions = ref<MasterReferenceItem[]>([]);
  const pekerjaanOptions = ref<MasterReferenceItem[]>([]);
  const sukuOptions = ref<MasterReferenceItem[]>([]);
  const loadingReferences = ref(false);
  const loaded = ref(false);

  const filterActive = (items: MasterReferenceItem[]) =>
    items.filter((item) => item.status !== "N");

  const loadReferences = async (force = false) => {
    if (loaded.value && !force) return;

    loadingReferences.value = true;
    try {
      const query = {
        page: 1,
        limit: 100,
        sortBy: "nama" as const,
        sortType: "asc" as const,
      };

      const [agamaRes, pendidikanRes, pekerjaanRes, sukuRes] =
        await Promise.allSettled([
          masterService.agama.getAll(query),
          masterService.pendidikan.getAll(query),
          masterService.pekerjaan.getAll(query),
          masterService.suku.getAll(query),
        ]);

      if (agamaRes.status === "fulfilled") {
        agamaOptions.value = filterActive(agamaRes.value.items);
      }
      if (pendidikanRes.status === "fulfilled") {
        pendidikanOptions.value = filterActive(pendidikanRes.value.items);
      }
      if (pekerjaanRes.status === "fulfilled") {
        pekerjaanOptions.value = filterActive(pekerjaanRes.value.items);
      }
      if (sukuRes.status === "fulfilled") {
        sukuOptions.value = filterActive(sukuRes.value.items);
      }

      loaded.value = true;
    } finally {
      loadingReferences.value = false;
    }
  };

  return {
    agamaOptions,
    pendidikanOptions,
    pekerjaanOptions,
    sukuOptions,
    loadingReferences,
    loadReferences,
  };
};

