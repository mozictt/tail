<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { CheckCircle2, Microscope, Printer, X } from "lucide-vue-next";
import { PenunjangLabService } from "@/services/penunjang-lab.service";
import { useAuthStore } from "@/stores/auth";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { useCurrency } from "@/composables/useCurrency";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  groupPenunjangLabByHierarchy,
  printHasilPenunjangLab,
} from "@/utils/penunjang-lab-print.util";
import { resolvePrintClinicHeaderWithLogo } from "@/utils/print-document.util";
import {
  calculateAgeLabel,
  getFlagHasilLabBadgeClass,
  getFlagHasilLabLabel,
  getOptionLabel,
  getStatusPenunjangLabBadgeClass,
  STATUS_PENUNJANG_LAB_OPTIONS,
  StatusPenunjangLab,
  type PenunjangLabOrderItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    orderId?: number | null;
    canVerify?: boolean;
  }>(),
  {
    orderId: null,
    canVerify: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "verified", item: PenunjangLabOrderItem): void;
}>();

const penunjangLabService = PenunjangLabService();
const authStore = useAuthStore();
const companyProfileStore = useCompanyProfileStore();
const { formatRupiah } = useCurrency();
const { formatDateTime } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const verifying = ref(false);
const printing = ref(false);
const detail = ref<PenunjangLabOrderItem | null>(null);

const groupedHierarchy = computed(() => {
  if (!detail.value) return [];
  return groupPenunjangLabByHierarchy(detail.value);
});

const loadDetail = async (id: number) => {
  loading.value = true;
  try {
    detail.value = await penunjangLabService.getOrderById(id);
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat detail hasil lab"),
      "error",
    );
    emit("close");
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.show, props.orderId] as const,
  ([isOpen, targetId]) => {
    if (isOpen && targetId) {
      if (!companyProfileStore.hasFetched) {
        companyProfileStore.fetchProfile();
      }
      loadDetail(targetId);
    }
  },
  { immediate: true },
);

const handleVerify = async () => {
  if (!detail.value) return;
  verifying.value = true;
  try {
    const updated = await penunjangLabService.verifyOrder(detail.value.id, {
      dokterLabId: detail.value.dokterLabId ?? null,
      kesanLab: detail.value.kesanLab ?? null,
    });
    detail.value = updated;
    showToast(`Hasil lab ${updated.noLab} berhasil diverifikasi`, "success");
    emit("verified", updated);
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memverifikasi hasil lab"),
      "error",
    );
  } finally {
    verifying.value = false;
  }
};

const handlePrint = async () => {
  if (!detail.value || printing.value) return;
  printing.value = true;
  try {
    if (!companyProfileStore.hasFetched) {
      await companyProfileStore.fetchProfile();
    }
    const header = await resolvePrintClinicHeaderWithLogo(
      companyProfileStore.profile,
      authStore.username,
    );
    const ok = printHasilPenunjangLab(detail.value, header);
    if (!ok) {
      showToast(
        "Gagal membuka dialog cetak. Periksa izin pop-up browser.",
        "error",
      );
    }
  } finally {
    printing.value = false;
  }
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.show && !verifying.value) {
    emit("close");
  }
};

onMounted(() => {
  if (process.client) window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  if (process.client) window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40 print:bg-white print:static"
      @click.self="emit('close')"
    >
      <div class="modal-box max-w-4xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-5 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden print:max-h-none print:shadow-none print:border-0">
        <div class="flex-none pr-9 mb-4 print:hidden">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
            aria-label="Tutup modal"
            @click="emit('close')"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Microscope class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-extrabold text-lg tracking-tight">
                Lembar Hasil Pemeriksaan Laboratorium
              </h3>
              <p class="text-xs text-base-content/60 font-mono">
                {{ detail?.noLab }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="loading" class="flex-1 py-8 space-y-4 animate-pulse">
          <div class="h-24 bg-base-200 rounded-2xl"></div>
          <div class="h-44 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
          <!-- Header Pasien & Order -->
          <div class="bg-base-200/40 border border-base-content/10 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="space-y-1">
              <div>
                <span class="text-base-content/60">Nama Pasien:</span>
                <strong class="ml-1 text-sm">{{ detail.pasien?.penduduk?.namaLengkap || "-" }}</strong>
              </div>
              <div>
                <span class="text-base-content/60">No. RM / Gender / Usia:</span>
                <strong class="ml-1 font-mono">{{ detail.pasien?.noRm || "-" }}</strong>
                <span class="ml-1">
                  ({{ detail.pasien?.penduduk?.jenisKelamin || "-" }}, {{ calculateAgeLabel(detail.pasien?.penduduk?.tanggalLahir) }})
                </span>
              </div>
              <div>
                <span class="text-base-content/60">No. Registrasi / Penjamin:</span>
                <strong class="ml-1 font-mono">{{ detail.pendaftaran?.noRegistrasi || "-" }}</strong>
                <span class="ml-1">• {{ detail.pendaftaran?.namaPenjaminSnapshot || "Umum" }}</span>
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-base-content/60">No. Lab / Status:</span>
                <strong class="font-mono">{{ detail.noLab }}</strong>
                <span
                  class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                  :class="getStatusPenunjangLabBadgeClass(detail.statusLab)"
                >
                  {{ getOptionLabel(STATUS_PENUNJANG_LAB_OPTIONS, detail.statusLab) }}
                </span>
              </div>
              <div>
                <span class="text-base-content/60">Waktu Order / Selesai:</span>
                <strong class="ml-1">{{ formatDateTime(detail.waktuOrder) }}</strong>
                <span v-if="detail.waktuHasilSelesai"> • {{ formatDateTime(detail.waktuHasilSelesai) }}</span>
              </div>
              <div>
                <span class="text-base-content/60">Unit / Dokter Pengirim:</span>
                <strong class="ml-1">{{ detail.unitPengirim?.nama || "-" }}</strong>
                <span v-if="detail.dokterPengirimNama"> • {{ detail.dokterPengirimNama }}</span>
              </div>
              <div>
                <span class="text-base-content/60">Dokter PJ Lab / Analis:</span>
                <strong class="ml-1">{{ detail.dokterLabNama || "-" }}</strong>
                <span v-if="detail.petugasLab?.name"> / {{ detail.petugasLab.name }}</span>
              </div>
              <div v-if="detail.waktuVerifikasi" class="text-emerald-700 dark:text-emerald-300 font-semibold">
                Terverifikasi: {{ formatDateTime(detail.waktuVerifikasi) }}
              </div>
            </div>
            <div v-if="detail.diagnosaKlinis" class="sm:col-span-2 pt-2 border-t border-base-content/10">
              <span class="text-base-content/60">Diagnosa Klinis:</span>
              <strong class="ml-1">{{ detail.diagnosaKlinis }}</strong>
            </div>
          </div>

          <!-- Tabel Hasil Pemeriksaan (Golongan -> Induk -> Detail Pemeriksaan) -->
          <div
            v-for="section in groupedHierarchy"
            :key="section.golongan"
            class="border border-base-content/15 rounded-2xl overflow-hidden"
          >
            <div class="bg-base-300/60 px-4 py-2 text-xs font-black uppercase tracking-wider text-base-content border-b border-base-content/10">
              {{ section.golongan }}
            </div>

            <div
              v-for="group in section.panels"
              :key="group.item.id"
              class="border-b last:border-b-0 border-base-content/10"
            >
              <div
                v-if="!group.isStandalone"
                class="bg-base-200/50 px-5 py-2 flex items-center justify-between text-xs border-b border-base-content/10"
              >
                <span class="font-extrabold text-sm">
                  {{ group.item.namaTindakanSnapshot }}
                  <span class="font-mono text-primary ml-1">({{ group.item.kodeTindakanSnapshot }})</span>
                </span>
                <span class="font-bold">{{ formatRupiah(group.item.subtotalTarif) }}</span>
              </div>

              <div class="overflow-x-auto">
                <table class="table table-sm w-full">
                  <thead>
                    <tr class="text-[11px] uppercase text-base-content/60 bg-base-200/20">
                      <th class="py-2 px-4" :class="group.isStandalone ? 'pl-5' : 'pl-7'">
                        {{ group.isStandalone ? "Pemeriksaan Tunggal" : "Detail Parameter Pemeriksaan" }}
                      </th>
                      <th class="py-2 px-4">Hasil</th>
                      <th class="py-2 px-4">Satuan</th>
                      <th class="py-2 px-4">Nilai Rujukan</th>
                      <th class="py-2 px-4">Keterangan / Flag</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-base-content/5 text-xs">
                    <tr v-for="row in group.rows" :key="row.id">
                      <td class="py-2.5 px-4" :class="group.isStandalone ? 'pl-5' : 'pl-7'">
                        <div class="font-bold flex flex-wrap items-center gap-2">
                          <span>{{ row.namaParameterSnapshot }}</span>
                          <span
                            v-if="group.isStandalone"
                            class="text-[11px] font-bold text-primary"
                          >
                            ({{ formatRupiah(group.item.subtotalTarif) }})
                          </span>
                        </div>
                        <div class="font-mono text-[10px] text-base-content/55">
                          {{ row.kodeParameterSnapshot }}
                        </div>
                      </td>
                      <td class="py-2.5 px-4 font-extrabold text-sm">
                        <span
                          :class="
                            row.flagAbnormal && row.flagAbnormal !== 'NORMAL'
                              ? 'text-error'
                              : 'text-base-content'
                          "
                        >
                          {{ row.hasilNilai || "-" }}
                        </span>
                      </td>
                      <td class="py-2.5 px-4">{{ row.satuanSnapshot || "-" }}</td>
                      <td class="py-2.5 px-4 font-medium">{{ row.nilaiNormalTextSnapshot || "-" }}</td>
                      <td class="py-2.5 px-4">
                        <span
                          v-if="row.flagAbnormal"
                          class="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                          :class="getFlagHasilLabBadgeClass(row.flagAbnormal)"
                        >
                          {{ getFlagHasilLabLabel(row.flagAbnormal) }}
                        </span>
                        <span v-else class="text-base-content/40">-</span>
                        <div v-if="row.catatan" class="text-[11px] text-base-content/65 mt-0.5">
                          {{ row.catatan }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div
            v-if="detail.kesanLab"
            class="bg-base-200/30 border border-base-content/10 rounded-xl p-3.5 text-xs"
          >
            <strong class="block mb-1 text-base-content/75">Kesan / Catatan Lab:</strong>
            <p class="whitespace-pre-line">{{ detail.kesanLab }}</p>
          </div>

          <!-- Ringkasan Jasa -->
          <div class="bg-primary/5 border border-primary/15 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <span>Total Jasa Dokter: <strong class="text-sky-600 dark:text-sky-400">{{ formatRupiah(detail.totalJasaDokter) }}</strong></span>
            <span>Total Jasa Nakes: <strong class="text-emerald-600 dark:text-emerald-400">{{ formatRupiah(detail.totalJasaNakes) }}</strong></span>
            <span class="text-sm font-black text-primary">Total Tarif Lab: {{ formatRupiah(detail.totalTarif) }}</span>
          </div>
        </div>

        <div class="flex-none modal-action gap-2 pt-4 mt-2 border-t border-base-content/10 print:hidden">
          <button
            type="button"
            class="btn btn-ghost rounded-2xl font-bold px-5"
            @click="emit('close')"
          >
            Tutup
          </button>
          <button
            type="button"
            class="btn btn-outline rounded-2xl font-bold px-5 gap-1.5"
            :disabled="!detail || loading || printing"
            @click="handlePrint"
          >
            <span v-if="printing" class="loading loading-spinner loading-xs"></span>
            <Printer v-else class="w-4 h-4" />
            Cetak Hasil (LIS)
          </button>
          <button
            v-if="
              canVerify &&
              detail &&
              (detail.statusLab === StatusPenunjangLab.SELESAI_INPUT ||
                detail.statusLab === StatusPenunjangLab.DIPROSES)
            "
            type="button"
            class="btn btn-success text-white rounded-2xl font-bold px-5 gap-1.5"
            :disabled="verifying"
            @click="handleVerify"
          >
            <span v-if="verifying" class="loading loading-spinner loading-xs"></span>
            <CheckCircle2 v-else class="w-4 h-4" />
            Verifikasi Hasil Lab
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
