<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  CheckCircle2,
  ClipboardPlus,
  Eye,
  FlaskConical,
  Microscope,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  UserCheck,
  X,
  XCircle,
} from "lucide-vue-next";
import AppPagination from "@/components/ui/AppPagination.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import PenunjangLabFormModal from "@/components/transaksi/PenunjangLabFormModal.vue";
import PenunjangLabResultModal from "@/components/transaksi/PenunjangLabResultModal.vue";
import { PenunjangLabService } from "@/services/penunjang-lab.service";
import { UnitService } from "@/services/unit.service";
import { useAuthStore } from "@/stores/auth";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { useCurrency } from "@/composables/useCurrency";
import { useDate } from "@/composables/useDate";
import { usePermission } from "@/composables/usePermission";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import { printHasilPenunjangLab } from "@/utils/penunjang-lab-print.util";
import { resolvePrintClinicHeaderWithLogo } from "@/utils/print-document.util";
import {
  calculateAgeLabel,
  getJenisLayananBadgeClass,
  getOptionLabel,
  getStatusKunjunganBadgeClass,
  getStatusPembayaranBadgeClass,
  getStatusPenunjangLabBadgeClass,
  STATUS_KUNJUNGAN_OPTIONS,
  STATUS_PEMBAYARAN_KUNJUNGAN_OPTIONS,
  STATUS_PENUNJANG_LAB_OPTIONS,
  StatusPenunjangLab,
  type PenunjangLabEligibleKunjunganItem,
  type PenunjangLabOrderItem,
  type UnitOptionItem,
} from "@/types/simrs";

definePageMeta({
  layout: "admin",
});

useHead({
  title: "Penunjang & Input Hasil Laboratorium",
});

const penunjangLabService = PenunjangLabService();
const unitService = UnitService();
const authStore = useAuthStore();
const companyProfileStore = useCompanyProfileStore();
const { formatRupiah } = useCurrency();
const { formatDateTime } = useDate();
const { slugPath } = useSlugRoute();
const { showToast } = useToast();
const { canWrite } = usePermission();

const ROUTE_PATH = "/transaksi/penunjang-lab";
const RESOURCE_NAME = "Penunjang Lab";

const canManageData = computed(() => canWrite(ROUTE_PATH, RESOURCE_NAME));

type ActiveTab = "eligible" | "orders";
const activeTab = ref<ActiveTab>("eligible");

const unitOptions = ref<UnitOptionItem[]>([]);

// ===== TAB 1: PASIEN DIPERIKSA / BELUM BAYAR =====
const eligibleItems = ref<PenunjangLabEligibleKunjunganItem[]>([]);
const loadingEligible = ref(false);
const eligibleSearch = ref("");
const eligibleFilterMode = ref<"ALL" | "DIPERIKSA" | "BELUM_BAYAR">("ALL");
const eligibleUnitId = ref<number | "">("");
const eligibleTanggalDari = ref("");
const eligibleTanggalSampai = ref("");
const eligiblePage = ref(1);
const eligibleLimit = ref(10);
const eligibleTotalItems = ref(0);
const eligibleTotalPages = ref(1);

// ===== TAB 2: DAFTAR ORDER & HASIL LAB =====
const orderItems = ref<PenunjangLabOrderItem[]>([]);
const loadingOrders = ref(false);
const orderSearch = ref("");
const orderStatusFilter = ref<StatusPenunjangLab | "">("");
const orderTanggalDari = ref("");
const orderTanggalSampai = ref("");
const orderPage = ref(1);
const orderLimit = ref(10);
const orderTotalItems = ref(0);
const orderTotalPages = ref(1);

// ===== MODALS =====
const showFormModal = ref(false);
const selectedKunjungan = ref<PenunjangLabEligibleKunjunganItem | null>(null);
const editOrderId = ref<number | null>(null);

const showResultModal = ref(false);
const viewResultOrderId = ref<number | null>(null);

const fetchUnitOptions = async () => {
  try {
    unitOptions.value = await unitService.getUnitOptions();
  } catch {
    unitOptions.value = [];
  }
};

const fetchEligible = async () => {
  loadingEligible.value = true;
  try {
    const res = await penunjangLabService.getEligibleKunjungan({
      page: eligiblePage.value,
      limit: eligibleLimit.value,
      search: eligibleSearch.value.trim() || undefined,
      filterEligible: eligibleFilterMode.value,
      unitId: eligibleUnitId.value ? Number(eligibleUnitId.value) : undefined,
      tanggalDari: eligibleTanggalDari.value || undefined,
      tanggalSampai: eligibleTanggalSampai.value || undefined,
    });
    eligibleItems.value = res.items;
    eligibleTotalItems.value = res.meta.totalItems;
    eligibleTotalPages.value = res.meta.totalPages;
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat daftar pasien kunjungan"),
      "error",
    );
  } finally {
    loadingEligible.value = false;
  }
};

const fetchOrders = async () => {
  loadingOrders.value = true;
  try {
    const res = await penunjangLabService.getOrders({
      page: orderPage.value,
      limit: orderLimit.value,
      search: orderSearch.value.trim() || undefined,
      statusLab: orderStatusFilter.value || undefined,
      tanggalDari: orderTanggalDari.value || undefined,
      tanggalSampai: orderTanggalSampai.value || undefined,
    });
    orderItems.value = res.items;
    orderTotalItems.value = res.meta.totalItems;
    orderTotalPages.value = res.meta.totalPages;
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat daftar transaksi penunjang lab"),
      "error",
    );
  } finally {
    loadingOrders.value = false;
  }
};

let eligibleTimer: ReturnType<typeof setTimeout> | null = null;
watch(eligibleSearch, () => {
  if (eligibleTimer) clearTimeout(eligibleTimer);
  eligibleTimer = setTimeout(() => {
    eligiblePage.value = 1;
    fetchEligible();
  }, 350);
});

watch(
  [eligibleFilterMode, eligibleUnitId, eligibleTanggalDari, eligibleTanggalSampai],
  () => {
    eligiblePage.value = 1;
    fetchEligible();
  },
);

let orderTimer: ReturnType<typeof setTimeout> | null = null;
watch(orderSearch, () => {
  if (orderTimer) clearTimeout(orderTimer);
  orderTimer = setTimeout(() => {
    orderPage.value = 1;
    fetchOrders();
  }, 350);
});

watch([orderStatusFilter, orderTanggalDari, orderTanggalSampai], () => {
  orderPage.value = 1;
  fetchOrders();
});

const openInputLabFromPatient = (kunjungan: PenunjangLabEligibleKunjunganItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk menginput penunjang lab", "error");
    return;
  }
  editOrderId.value = null;
  selectedKunjungan.value = kunjungan;
  showFormModal.value = true;
};

const openEditHasilOrder = (order: PenunjangLabOrderItem) => {
  if (!canManageData.value) {
    showToast("Anda tidak memiliki akses untuk mengubah hasil lab", "error");
    return;
  }
  selectedKunjungan.value = null;
  editOrderId.value = order.id;
  showFormModal.value = true;
};

const openResultModal = (order: PenunjangLabOrderItem) => {
  viewResultOrderId.value = order.id;
  showResultModal.value = true;
};

const handleOrderSaved = async (saved: PenunjangLabOrderItem) => {
  await Promise.all([fetchEligible(), fetchOrders()]);
  if (saved.statusLab === StatusPenunjangLab.SELESAI_INPUT) {
    viewResultOrderId.value = saved.id;
    showResultModal.value = true;
  }
};

const handleVerifyQuick = async (order: PenunjangLabOrderItem) => {
  if (!canManageData.value) return;
  const confirm = await Swal.fire({
    title: "Verifikasi Hasil Lab?",
    text: `Hasil laboratorium ${order.noLab} atas nama ${order.pasien?.penduduk?.namaLengkap || "-"} akan dikunci & terverifikasi.`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Ya, Verifikasi",
    cancelButtonText: "Batal",
    reverseButtons: true,
  });
  if (!confirm.isConfirmed) return;

  try {
    await penunjangLabService.verifyOrder(order.id, {
      dokterLabId: order.dokterLabId ?? null,
      kesanLab: order.kesanLab ?? null,
    });
    showToast(`Hasil lab ${order.noLab} berhasil diverifikasi`, "success");
    await fetchOrders();
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memverifikasi hasil lab"),
      "error",
    );
  }
};

const printingOrderId = ref<number | null>(null);

const handlePrintOrderQuick = async (order: PenunjangLabOrderItem) => {
  if (printingOrderId.value === order.id) return;
  printingOrderId.value = order.id;
  try {
    if (!companyProfileStore.hasFetched) {
      await companyProfileStore.fetchProfile();
    }
    const [detail, header] = await Promise.all([
      penunjangLabService.getOrderById(order.id),
      resolvePrintClinicHeaderWithLogo(
        companyProfileStore.profile,
        authStore.username,
      ),
    ]);
    const ok = printHasilPenunjangLab(detail, header);
    if (!ok) {
      showToast(
        "Gagal membuka dialog cetak. Periksa izin pop-up browser.",
        "error",
      );
    }
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal menyiapkan cetakan hasil lab"),
      "error",
    );
  } finally {
    printingOrderId.value = null;
  }
};

const handleBatalOrder = async (order: PenunjangLabOrderItem) => {
  if (!canManageData.value) return;
  const { value: alasan } = await Swal.fire({
    title: `Batalkan Order ${order.noLab}?`,
    input: "text",
    inputLabel: "Alasan pembatalan",
    inputPlaceholder: "Masukkan alasan pembatalan pemeriksaan...",
    showCancelButton: true,
    confirmButtonColor: "#e11d48",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Batalkan Order",
    cancelButtonText: "Kembali",
    inputValidator: (v) => {
      if (!v || !v.trim()) return "Alasan pembatalan wajib diisi";
      return null;
    },
  });

  if (!alasan) return;

  try {
    await penunjangLabService.cancelOrder(order.id, alasan);
    showToast(`Order lab ${order.noLab} dibatalkan`, "success");
    await Promise.all([fetchEligible(), fetchOrders()]);
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal membatalkan order lab"),
      "error",
    );
  }
};

onMounted(() => {
  if (!companyProfileStore.hasFetched) {
    companyProfileStore.fetchProfile();
  }
  fetchUnitOptions();
  fetchEligible();
  fetchOrders();
});

onUnmounted(() => {
  if (eligibleTimer) clearTimeout(eligibleTimer);
  if (orderTimer) clearTimeout(orderTimer);
});
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <!-- HEADER -->
    <div class="bg-base-100 border border-base-content/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl border bg-primary/10 text-primary border-primary/20 flex items-center justify-center shrink-0">
            <Microscope class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-extrabold text-base-content tracking-tight">
              Penunjang & Input Hasil Laboratorium
            </h1>
            <p class="text-xs sm:text-sm text-base-content/60 mt-1">
              Input pemeriksaan & hasil lab langsung dari pasien yang masih dalam pemeriksaan atau belum lunas bayar
            </p>
          </div>
        </div>

        <NuxtLink
          :to="slugPath('/master/parameter-lab')"
          class="btn btn-sm btn-ghost border border-base-content/15 rounded-xl font-bold gap-1.5 shrink-0"
        >
          <FlaskConical class="w-4 h-4 text-emerald-600" />
          Master Parameter & Panel Lab
        </NuxtLink>
      </div>

      <!-- TAB SWITCHER -->
      <div class="mt-4 pt-3 border-t border-base-content/10 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="activeTab === 'eligible' ? 'btn-primary' : 'btn-ghost'"
          @click="activeTab = 'eligible'"
        >
          <UserCheck class="w-4 h-4" />
          Pasien Diperiksa / Belum Bayar ({{ eligibleTotalItems }})
        </button>
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold gap-1.5"
          :class="activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'"
          @click="activeTab = 'orders'"
        >
          <ClipboardPlus class="w-4 h-4" />
          Daftar Order & Hasil Lab ({{ orderTotalItems }})
        </button>
      </div>
    </div>

    <!-- TAB 1: PASIEN ELIGIBLE (MASIH DIPERIKSA / BELUM BAYAR) -->
    <template v-if="activeTab === 'eligible'">
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <!-- Quick Filter Mode -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-base-content/5">
          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              class="btn btn-xs rounded-lg font-bold"
              :class="eligibleFilterMode === 'ALL' ? 'btn-primary' : 'btn-ghost'"
              @click="eligibleFilterMode = 'ALL'"
            >
              Semua (Diperiksa / Belum Bayar)
            </button>
            <button
              type="button"
              class="btn btn-xs rounded-lg font-bold"
              :class="eligibleFilterMode === 'DIPERIKSA' ? 'btn-info text-white' : 'btn-ghost'"
              @click="eligibleFilterMode = 'DIPERIKSA'"
            >
              Sedang Diperiksa / Dirawat
            </button>
            <button
              type="button"
              class="btn btn-xs rounded-lg font-bold"
              :class="eligibleFilterMode === 'BELUM_BAYAR' ? 'btn-error text-white' : 'btn-ghost'"
              @click="eligibleFilterMode = 'BELUM_BAYAR'"
            >
              Belum Lunas Bayar
            </button>
          </div>
          <button
            type="button"
            class="btn btn-xs btn-ghost rounded-lg gap-1"
            @click="fetchEligible"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingEligible }" />
            Muat Ulang
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div class="relative lg:col-span-2">
            <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              v-model="eligibleSearch"
              type="text"
              placeholder="Cari No. RM, No. Registrasi, Nama Pasien, NIK..."
              class="input input-bordered input-sm w-full pl-10 pr-8 rounded-xl text-xs"
            />
            <button
              v-if="eligibleSearch"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-error p-1"
              @click="eligibleSearch = ''"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <select
            v-model="eligibleUnitId"
            class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
          >
            <option value="">Semua Unit Pelayanan</option>
            <option v-for="u in unitOptions" :key="u.id" :value="u.id">
              {{ u.nama }}
            </option>
          </select>

          <div class="grid grid-cols-2 gap-1.5">
            <FlatpickrDate
              v-model="eligibleTanggalDari"
              size="sm"
              placeholder="Dari tgl..."
            />
            <FlatpickrDate
              v-model="eligibleTanggalSampai"
              size="sm"
              placeholder="Sampai..."
            />
          </div>
        </div>
      </div>

      <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm overflow-hidden">
        <div v-if="loadingEligible && eligibleItems.length === 0" class="p-6 space-y-3 animate-pulse">
          <div v-for="i in 5" :key="i" class="h-14 bg-base-200 rounded-xl"></div>
        </div>

        <div v-else-if="eligibleItems.length === 0" class="p-10 text-center">
          <UserCheck class="w-12 h-12 mx-auto text-base-content/25 mb-2" />
          <p class="font-bold text-base-content/80">
            Tidak ada pasien yang sedang diperiksa atau belum bayar
          </p>
          <p class="text-xs text-base-content/50 mt-1">
            Pasien yang baru didaftarkan pada menu Pendaftaran atau masih berstatus Belum Bayar akan otomatis muncul di sini.
          </p>
        </div>

        <template v-else>
          <!-- DESKTOP TABLE -->
          <div class="hidden md:block overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr class="bg-base-200/60 text-xs uppercase tracking-wider text-base-content/60">
                  <th class="py-3.5 px-4">No. Reg & Tanggal</th>
                  <th class="py-3.5 px-4">Pasien</th>
                  <th class="py-3.5 px-4">Unit, DPJP, & Kelas</th>
                  <th class="py-3.5 px-4">Status Kunjungan & Bayar</th>
                  <th class="py-3.5 px-4 text-center">Lab</th>
                  <th class="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-base-content/5 text-sm">
                <tr
                  v-for="k in eligibleItems"
                  :key="k.id"
                  class="hover:bg-base-200/35 transition"
                >
                  <td class="py-3.5 px-4 align-top">
                    <div class="font-mono font-bold text-xs text-primary">
                      {{ k.noRegistrasi }}
                    </div>
                    <div class="text-[11px] text-base-content/60 mt-0.5">
                      {{ formatDateTime(k.waktuDaftar) }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4 align-top">
                    <div class="font-bold">{{ k.pasien?.penduduk?.namaLengkap || "-" }}</div>
                    <div class="text-xs text-base-content/65">
                      RM: <span class="font-mono font-bold">{{ k.pasien?.noRm || "-" }}</span>
                      • {{ k.pasien?.penduduk?.jenisKelamin || "-" }}
                      • {{ calculateAgeLabel(k.pasien?.penduduk?.tanggalLahir) }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4 align-top text-xs space-y-1">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="px-2 py-0.5 rounded border text-[10px] font-bold"
                        :class="getJenisLayananBadgeClass(k.jenisLayananSaatIni)"
                      >
                        {{ k.unitSaatIni?.nama || "-" }}
                      </span>
                      <span class="badge badge-xs badge-ghost">
                        {{ k.kelasSaatIni?.nama || "Non-Kelas" }}
                      </span>
                    </div>
                    <div class="text-base-content/70">
                      DPJP: {{ k.dokterSaatIni?.namaLengkapGelar || "-" }}
                    </div>
                    <div class="font-semibold text-base-content/75">
                      Penjamin: {{ k.namaPenjaminSnapshot }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4 align-top">
                    <div class="flex flex-col items-start gap-1">
                      <span
                        class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                        :class="getStatusKunjunganBadgeClass(k.statusKunjungan)"
                      >
                        {{ getOptionLabel(STATUS_KUNJUNGAN_OPTIONS, k.statusKunjungan) }}
                      </span>
                      <span
                        class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                        :class="getStatusPembayaranBadgeClass(k.statusPembayaran || 'BELUM_BAYAR')"
                      >
                        {{ getOptionLabel(STATUS_PEMBAYARAN_KUNJUNGAN_OPTIONS, k.statusPembayaran || "BELUM_BAYAR") }}
                      </span>
                    </div>
                  </td>

                  <td class="py-3.5 px-4 align-top text-center text-xs">
                    <span class="badge badge-sm font-bold" :class="k.jumlahOrderLab > 0 ? 'badge-info badge-outline' : 'badge-ghost'">
                      {{ k.jumlahOrderLab }} order
                    </span>
                  </td>

                  <td class="py-3.5 px-4 align-top text-right">
                    <button
                      v-if="canManageData"
                      type="button"
                      class="btn btn-sm btn-primary rounded-xl font-bold gap-1.5 shadow-sm"
                      @click="openInputLabFromPatient(k)"
                    >
                      <Microscope class="w-4 h-4" />
                      Input Penunjang Lab
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MOBILE CARDS -->
          <div class="md:hidden divide-y divide-base-content/10">
            <div v-for="k in eligibleItems" :key="k.id" class="p-4 space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-mono text-xs font-bold text-primary">{{ k.noRegistrasi }}</div>
                  <div class="font-bold text-sm">{{ k.pasien?.penduduk?.namaLengkap || "-" }}</div>
                  <div class="text-xs text-base-content/60">
                    RM {{ k.pasien?.noRm }} • {{ k.pasien?.penduduk?.jenisKelamin }} • {{ calculateAgeLabel(k.pasien?.penduduk?.tanggalLahir) }}
                  </div>
                </div>
                <span
                  class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                  :class="getStatusPembayaranBadgeClass(k.statusPembayaran || 'BELUM_BAYAR')"
                >
                  {{ getOptionLabel(STATUS_PEMBAYARAN_KUNJUNGAN_OPTIONS, k.statusPembayaran || "BELUM_BAYAR") }}
                </span>
              </div>

              <div class="text-xs text-base-content/75 flex flex-wrap gap-1.5 items-center">
                <span class="px-2 py-0.5 rounded border text-[10px] font-bold" :class="getStatusKunjunganBadgeClass(k.statusKunjungan)">
                  {{ getOptionLabel(STATUS_KUNJUNGAN_OPTIONS, k.statusKunjungan) }}
                </span>
                <span>• {{ k.unitSaatIni?.nama }}</span>
                <span>• {{ k.namaPenjaminSnapshot }}</span>
              </div>

              <button
                v-if="canManageData"
                type="button"
                class="btn btn-sm btn-primary w-full rounded-xl font-bold gap-1.5"
                @click="openInputLabFromPatient(k)"
              >
                <Microscope class="w-4 h-4" />
                Input Penunjang Lab ({{ k.jumlahOrderLab }} order)
              </button>
            </div>
          </div>
        </template>

        <div v-if="eligibleTotalPages > 1 || eligibleTotalItems > 0" class="p-4 border-t border-base-content/10">
          <AppPagination
            :current-page="eligiblePage"
            :total-pages="eligibleTotalPages"
            :total-items="eligibleTotalItems"
            :limit="eligibleLimit"
            @page-change="(p) => { eligiblePage = p; fetchEligible(); }"
          />
        </div>
      </div>
    </template>

    <!-- TAB 2: DAFTAR ORDER & HASIL LAB -->
    <template v-else>
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div class="relative lg:col-span-2">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="orderSearch"
            type="text"
            placeholder="Cari No. Lab, No. Reg, No. RM, atau Nama Pasien..."
            class="input input-bordered input-sm w-full pl-10 rounded-xl text-xs"
          />
        </div>

        <select
          v-model="orderStatusFilter"
          class="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status Hasil Lab</option>
          <option v-for="s in STATUS_PENUNJANG_LAB_OPTIONS" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>

        <div class="grid grid-cols-2 gap-1.5">
          <FlatpickrDate v-model="orderTanggalDari" size="sm" placeholder="Dari tgl..." />
          <FlatpickrDate v-model="orderTanggalSampai" size="sm" placeholder="Sampai..." />
        </div>
      </div>

      <div class="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm overflow-hidden">
        <div v-if="loadingOrders && orderItems.length === 0" class="p-6 space-y-3 animate-pulse">
          <div v-for="i in 5" :key="i" class="h-14 bg-base-200 rounded-xl"></div>
        </div>
        <div v-else-if="orderItems.length === 0" class="p-10 text-center text-sm text-base-content/60">
          Belum ada transaksi pemeriksaan laboratorium.
        </div>

        <template v-else>
          <div class="hidden md:block overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr class="bg-base-200/60 text-xs uppercase tracking-wider text-base-content/60">
                  <th class="py-3.5 px-4">No. Lab & Waktu</th>
                  <th class="py-3.5 px-4">Pasien & Kunjungan</th>
                  <th class="py-3.5 px-4">Pemeriksaan & Progress</th>
                  <th class="py-3.5 px-4">Tarif & Jasa</th>
                  <th class="py-3.5 px-4">Status</th>
                  <th class="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-base-content/5 text-sm">
                <tr v-for="ord in orderItems" :key="ord.id" class="hover:bg-base-200/35">
                  <td class="py-3.5 px-4 align-top">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono font-bold text-xs text-primary">{{ ord.noLab }}</span>
                      <span v-if="ord.isCito" class="badge badge-xs badge-error font-bold">CITO</span>
                    </div>
                    <div class="text-[11px] text-base-content/60 mt-0.5">
                      {{ formatDateTime(ord.waktuOrder) }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4 align-top">
                    <div class="font-bold">{{ ord.pasien?.penduduk?.namaLengkap || "-" }}</div>
                    <div class="text-xs text-base-content/65">
                      RM: <span class="font-mono">{{ ord.pasien?.noRm || "-" }}</span>
                      • {{ ord.pendaftaran?.noRegistrasi || "-" }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4 align-top text-xs space-y-1">
                    <div class="font-semibold">
                      {{ (ord.itemNames || []).join(", ") || "-" }}
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="badge badge-xs badge-outline">
                        {{ ord.jumlahTerisi ?? 0 }} / {{ ord.jumlahParameter ?? 0 }} parameter terisi
                      </span>
                      <span
                        v-if="(ord.jumlahAbnormal ?? 0) > 0"
                        class="badge badge-xs badge-warning font-bold"
                      >
                        {{ ord.jumlahAbnormal }} abnormal
                      </span>
                      <span
                        v-if="(ord.jumlahKritis ?? 0) > 0"
                        class="badge badge-xs badge-error font-bold"
                      >
                        {{ ord.jumlahKritis }} kritis!
                      </span>
                    </div>
                  </td>

                  <td class="py-3.5 px-4 align-top text-xs space-y-0.5">
                    <div class="font-extrabold text-primary">{{ formatRupiah(ord.totalTarif) }}</div>
                    <div class="text-base-content/65">Dokter: {{ formatRupiah(ord.totalJasaDokter) }}</div>
                    <div class="text-base-content/65">Nakes: {{ formatRupiah(ord.totalJasaNakes) }}</div>
                  </td>

                  <td class="py-3.5 px-4 align-top">
                    <span
                      class="px-2 py-0.5 rounded-md border text-[10px] font-bold block w-fit"
                      :class="getStatusPenunjangLabBadgeClass(ord.statusLab)"
                    >
                      {{ getOptionLabel(STATUS_PENUNJANG_LAB_OPTIONS, ord.statusLab) }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4 align-top text-right">
                    <div class="inline-flex items-center gap-1">
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost btn-square rounded-lg"
                        title="Lihat Lembar Hasil"
                        @click="openResultModal(ord)"
                      >
                        <Eye class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost btn-square rounded-lg text-primary"
                        title="Cetak Hasil Lab (Format LIS)"
                        :disabled="printingOrderId === ord.id"
                        @click="handlePrintOrderQuick(ord)"
                      >
                        <span
                          v-if="printingOrderId === ord.id"
                          class="loading loading-spinner loading-xs"
                        ></span>
                        <Printer v-else class="w-4 h-4" />
                      </button>
                      <button
                        v-if="
                          canManageData &&
                          ord.statusLab !== StatusPenunjangLab.TERVERIFIKASI &&
                          ord.statusLab !== StatusPenunjangLab.BATAL
                        "
                        type="button"
                        class="btn btn-xs btn-primary btn-outline rounded-lg font-bold gap-1"
                        @click="openEditHasilOrder(ord)"
                      >
                        <Pencil class="w-3.5 h-3.5" />
                        Input Hasil
                      </button>
                      <button
                        v-if="
                          canManageData &&
                          (ord.statusLab === StatusPenunjangLab.SELESAI_INPUT ||
                            ord.statusLab === StatusPenunjangLab.DIPROSES)
                        "
                        type="button"
                        class="btn btn-xs btn-success btn-outline rounded-lg font-bold"
                        title="Verifikasi Hasil Lab"
                        @click="handleVerifyQuick(ord)"
                      >
                        <CheckCircle2 class="w-3.5 h-3.5" />
                      </button>
                      <button
                        v-if="
                          canManageData &&
                          ord.statusLab !== StatusPenunjangLab.TERVERIFIKASI &&
                          ord.statusLab !== StatusPenunjangLab.BATAL
                        "
                        type="button"
                        class="btn btn-xs btn-ghost text-error btn-square rounded-lg"
                        title="Batalkan Order"
                        @click="handleBatalOrder(ord)"
                      >
                        <XCircle class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="md:hidden divide-y divide-base-content/10">
            <div v-for="ord in orderItems" :key="ord.id" class="p-4 space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="font-mono font-bold text-xs text-primary">{{ ord.noLab }}</span>
                  <h3 class="font-bold text-sm">{{ ord.pasien?.penduduk?.namaLengkap || "-" }}</h3>
                  <p class="text-xs text-base-content/60">
                    {{ (ord.itemNames || []).join(", ") }}
                  </p>
                </div>
                <span
                  class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                  :class="getStatusPenunjangLabBadgeClass(ord.statusLab)"
                >
                  {{ getOptionLabel(STATUS_PENUNJANG_LAB_OPTIONS, ord.statusLab) }}
                </span>
              </div>

              <div class="flex flex-wrap items-center justify-between text-xs bg-base-200/40 rounded-xl p-2.5">
                <span>{{ ord.jumlahTerisi ?? 0 }}/{{ ord.jumlahParameter ?? 0 }} parameter</span>
                <strong class="text-primary">{{ formatRupiah(ord.totalTarif) }}</strong>
              </div>

              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost border border-base-content/15 rounded-lg flex-1"
                  @click="openResultModal(ord)"
                >
                  Lihat Hasil
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-primary rounded-lg gap-1"
                  :disabled="printingOrderId === ord.id"
                  @click="handlePrintOrderQuick(ord)"
                >
                  <Printer class="w-3.5 h-3.5" />
                  Cetak LIS
                </button>
                <button
                  v-if="
                    canManageData &&
                    ord.statusLab !== StatusPenunjangLab.TERVERIFIKASI &&
                    ord.statusLab !== StatusPenunjangLab.BATAL
                  "
                  type="button"
                  class="btn btn-xs btn-primary rounded-lg flex-1"
                  @click="openEditHasilOrder(ord)"
                >
                  Input Hasil
                </button>
              </div>
            </div>
          </div>
        </template>

        <div v-if="orderTotalPages > 1 || orderTotalItems > 0" class="p-4 border-t border-base-content/10">
          <AppPagination
            :current-page="orderPage"
            :total-pages="orderTotalPages"
            :total-items="orderTotalItems"
            :limit="orderLimit"
            @page-change="(p) => { orderPage = p; fetchOrders(); }"
          />
        </div>
      </div>
    </template>

    <!-- MODALS -->
    <PenunjangLabFormModal
      :show="showFormModal"
      :kunjungan="selectedKunjungan"
      :edit-order-id="editOrderId"
      @close="showFormModal = false"
      @saved="handleOrderSaved"
    />

    <PenunjangLabResultModal
      :show="showResultModal"
      :order-id="viewResultOrderId"
      :can-verify="canManageData"
      @close="showResultModal = false"
      @verified="fetchOrders"
    />
  </div>
</template>
