<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import {
  CheckCircle2,
  CreditCard,
  Phone,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import { PasienService } from "@/services/pasien.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  calculateAgeLabel,
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  JENIS_KELAMIN_OPTIONS,
  type PasienItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    selectedPasienId?: number | null;
  }>(),
  {
    selectedPasienId: null,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", pasien: PasienItem): void;
}>();

const pasienService = PasienService();
const { formatDate } = useDate();
const { showToast } = useToast();

const items = ref<PasienItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const currentPage = ref(1);
const limit = ref(8);
const totalItems = ref(0);
const totalPages = ref(1);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const fetchPatients = async () => {
  loading.value = true;
  try {
    const res = await pasienService.getPasien({
      page: currentPage.value,
      limit: limit.value,
      search: searchQuery.value.trim(),
      status: "Y",
      sortBy: "id",
      sortType: "DESC",
    });
    items.value = res.items;
    totalItems.value = res.meta.totalItems;
    totalPages.value = res.meta.totalPages || 1;
    currentPage.value = res.meta.currentPage || currentPage.value;
  } catch (err: unknown) {
    items.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
    showToast(extractApiErrorMessage(err, "Gagal memuat daftar pasien"), "error");
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.show,
  (isOpen) => {
    if (!isOpen) return;
    currentPage.value = 1;
    fetchPatients();
  },
  { immediate: true },
);

watch(searchQuery, () => {
  if (!props.show) return;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchPatients();
  }, 350);
});

const handleImmediateSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  currentPage.value = 1;
  fetchPatients();
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchPatients();
};

const pickPatient = (item: PasienItem) => {
  emit("select", item);
  emit("close");
};

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="emit('close')"
    >
      <div class="modal-box max-w-4xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-5 sm:p-6 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/40 hover:text-error"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg tracking-tight flex items-center gap-3 pr-8 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users class="w-5 h-5" />
          </div>
          <div>
            <span>Pilih Pasien Terdaftar</span>
            <p class="text-xs font-normal text-base-content/60 mt-0.5">
              Cari berdasarkan No. RM, Nama Lengkap, NIK, atau Nomor Kartu Penjamin
            </p>
          </div>
        </h3>

        <!-- Pencarian -->
        <div class="flex flex-col sm:flex-row gap-2 mb-4">
          <div class="relative flex-1">
            <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Ketik No. RM, nama pasien, NIK (16 digit), atau no. kartu BPJS..."
              class="input input-bordered w-full pl-10 pr-9 rounded-xl h-11 text-sm bg-base-200/35 focus:bg-base-100"
              @keyup.enter="handleImmediateSearch"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error"
              @click="searchQuery = ''"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            class="btn btn-primary rounded-xl h-11 px-5 font-bold shrink-0"
            :disabled="loading"
            @click="handleImmediateSearch"
          >
            Cari Pasien
          </button>
        </div>

        <!-- Daftar Pasien -->
        <div class="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
          <div v-if="loading" class="space-y-2.5">
            <div v-for="i in 5" :key="i" class="h-16 rounded-xl bg-base-200 animate-pulse"></div>
          </div>

          <div
            v-else-if="items.length === 0"
            class="py-12 px-4 text-center rounded-2xl bg-base-200/25 border border-dashed border-base-content/15"
          >
            <p class="font-bold text-sm text-base-content mb-1">
              Data pasien tidak ditemukan
            </p>
            <p class="text-xs text-base-content/60">
              Coba kata kunci lain, atau tutup popup ini untuk mendaftarkan sebagai <strong>Pasien Baru</strong> langsung di formulir pendaftaran.
            </p>
          </div>

          <template v-else>
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-x-auto border border-base-content/10 rounded-2xl">
              <table class="table w-full text-left border-collapse">
                <thead>
                  <tr class="bg-base-200/60 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
                    <th class="py-3 px-3.5">No. RM</th>
                    <th class="py-3 px-3.5">Nama & Identitas</th>
                    <th class="py-3 px-3.5">Lahir / Kontak</th>
                    <th class="py-3 px-3.5">Penjamin Utama</th>
                    <th class="py-3 px-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-base-content/5 text-xs">
                  <tr
                    v-for="item in items"
                    :key="item.id"
                    class="hover:bg-primary/5 cursor-pointer transition-colors"
                    :class="{ 'bg-primary/10': selectedPasienId === item.id }"
                    @click="pickPatient(item)"
                  >
                    <td class="py-3 px-3.5 font-mono font-extrabold text-primary whitespace-nowrap">
                      {{ item.noRm }}
                    </td>
                    <td class="py-3 px-3.5">
                      <div class="font-bold text-sm text-base-content flex items-center gap-1.5 flex-wrap">
                        <span>{{ item.penduduk?.namaLengkap || "-" }}</span>
                        <span
                          v-if="item.isBayiBaruLahir"
                          class="badge badge-xs badge-info font-bold"
                        >
                          Bayi
                        </span>
                        <span
                          v-if="item.isIdentitasTidakDiketahui"
                          class="badge badge-xs badge-warning font-bold"
                        >
                          Tanpa Identitas
                        </span>
                      </div>
                      <div class="text-[11px] font-mono text-base-content/60">
                        NIK: {{ item.penduduk?.nik || item.penduduk?.noIdentitasLain || "-" }}
                      </div>
                    </td>
                    <td class="py-3 px-3.5 space-y-0.5">
                      <div>
                        {{ getOptionLabel(JENIS_KELAMIN_OPTIONS, item.penduduk?.jenisKelamin) }}
                        <template v-if="item.penduduk?.tanggalLahir">
                          • {{ formatDate(item.penduduk.tanggalLahir) }}
                          ({{ calculateAgeLabel(item.penduduk.tanggalLahir) }})
                        </template>
                      </div>
                      <div v-if="item.penduduk?.noTelepon" class="text-[11px] text-base-content/65 inline-flex items-center gap-1">
                        <Phone class="w-3 h-3" /> {{ item.penduduk.noTelepon }}
                      </div>
                    </td>
                    <td class="py-3 px-3.5">
                      <template v-if="item.penjaminUtama?.penjamin">
                        <span
                          class="text-[10px] font-bold px-2 py-0.5 rounded border inline-block"
                          :class="getJenisPenjaminBadgeClass(item.penjaminUtama.penjamin.jenisPenjamin)"
                        >
                          {{ item.penjaminUtama.penjamin.nama }}
                        </span>
                        <div v-if="item.penjaminUtama.noKartu" class="text-[11px] font-mono text-base-content/60 mt-0.5 flex items-center gap-1">
                          <CreditCard class="w-3 h-3" /> {{ item.penjaminUtama.noKartu }}
                        </div>
                      </template>
                      <span v-else class="text-base-content/45">Umum / Belum Ada</span>
                    </td>
                    <td class="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        class="btn btn-xs rounded-lg font-bold gap-1"
                        :class="selectedPasienId === item.id ? 'btn-success text-white' : 'btn-primary'"
                        @click.stop="pickPatient(item)"
                      >
                        <CheckCircle2 v-if="selectedPasienId === item.id" class="w-3.5 h-3.5" />
                        <UserCheck v-else class="w-3.5 h-3.5" />
                        {{ selectedPasienId === item.id ? "Terpilih" : "Pilih" }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="md:hidden space-y-2.5">
              <button
                v-for="item in items"
                :key="item.id"
                type="button"
                class="w-full text-left p-3.5 rounded-2xl border transition space-y-1.5"
                :class="
                  selectedPasienId === item.id
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                    : 'bg-base-100 border-base-content/10 hover:border-primary/40'
                "
                @click="pickPatient(item)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-xs font-extrabold text-primary">{{ item.noRm }}</span>
                  <span class="badge badge-xs badge-primary font-bold">
                    {{ selectedPasienId === item.id ? "Terpilih" : "Pilih" }}
                  </span>
                </div>
                <div class="font-bold text-sm text-base-content">{{ item.penduduk?.namaLengkap || "-" }}</div>
                <div class="text-[11px] text-base-content/65">
                  NIK: {{ item.penduduk?.nik || "-" }}
                  <template v-if="item.penduduk?.tanggalLahir">
                    • {{ formatDate(item.penduduk.tanggalLahir) }} ({{ calculateAgeLabel(item.penduduk.tanggalLahir) }})
                  </template>
                </div>
              </button>
            </div>
          </template>
        </div>

        <AppPagination
          v-if="totalItems > 0"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-items="totalItems"
          :limit="limit"
          class="mt-3 pt-3 border-t border-base-content/10"
          @page-change="handlePageChange"
        />

        <div class="flex-none modal-action gap-2 pt-3 mt-2 border-t border-base-content/10 justify-between items-center">
          <span class="text-[11px] text-base-content/60 hidden sm:inline">
            Klik pasien untuk langsung mengisi seluruh data identitas di formulir pendaftaran.
          </span>
          <button type="button" class="btn btn-ghost btn-sm rounded-xl ml-auto" @click="emit('close')">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

