<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Briefcase,
  CheckCircle2,
  FileBadge,
  IdCard,
  Stethoscope,
  X,
  XCircle,
} from "lucide-vue-next";
import { DokterService } from "@/services/dokter.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatKelurahanLabel,
  formatNamaGelarDokter,
  getOptionLabel,
  JENIS_DOKTER_OPTIONS,
  STATUS_AKTIF_PEGAWAI_OPTIONS,
  STATUS_KEPEGAWAIAN_OPTIONS,
  type DokterItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  dokterId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const dokterService = DokterService();
const { formatDate, formatDateTime, isExpired, isExpiringSoon } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<DokterItem | null>(null);

watch(
  () => [props.show, props.dokterId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }

    loading.value = true;
    try {
      detail.value = await dokterService.getDokterById(id);
    } catch (err: any) {
      showToast(extractApiErrorMessage(err, "Gagal memuat detail dokter"), "error");
      emit("close");
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="emit('close')"
    >
      <div class="modal-box max-w-2xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3 pr-8 mb-5">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Stethoscope class="w-5 h-5" />
          </div>
          <span>Detail Master Dokter</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <!-- Header -->
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 class="font-extrabold text-base text-base-content">
                {{
                  detail.namaTampilan ||
                  formatNamaGelarDokter(
                    detail.gelarDepan,
                    detail.penduduk?.namaLengkap,
                    detail.gelarBelakang,
                  ) ||
                  detail.kodeDokter
                }}
              </h4>
              <p class="text-xs font-mono text-base-content/60 mt-0.5">
                Kode: {{ detail.kodeDokter }} •
                {{ getOptionLabel(JENIS_DOKTER_OPTIONS, detail.jenisDokter) }}
                <span v-if="detail.spesialisasi"> ({{ detail.spesialisasi }})</span>
              </p>
            </div>
            <span
              class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border w-fit shrink-0"
              :class="
                detail.status === 'Y'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
              "
            >
              <CheckCircle2 v-if="detail.status === 'Y'" class="w-3.5 h-3.5" />
              <XCircle v-else class="w-3.5 h-3.5" />
              {{ detail.status === "Y" ? "Aktif" : "Nonaktif" }}
            </span>
          </div>

          <!-- STR, SIP, Integrasi -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <FileBadge class="w-3.5 h-3.5" />
              Registrasi & Perizinan (STR / SIP)
            </div>
            <div>
              <span class="text-base-content/50 block">Nomor STR</span>
              <span class="font-mono font-semibold">{{ detail.noStr || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Masa Berlaku STR</span>
              <span v-if="detail.isStrSeumurHidup" class="badge badge-xs badge-success text-white font-bold">
                Seumur Hidup
              </span>
              <span v-else class="font-semibold">
                {{ formatDate(detail.strTerbitPada) }} —
                <span
                  :class="
                    isExpired(detail.strBerlakuSampai)
                      ? 'text-error font-bold'
                      : isExpiringSoon(detail.strBerlakuSampai, 30)
                        ? 'text-warning font-bold'
                        : ''
                  "
                >
                  {{ formatDate(detail.strBerlakuSampai) }}
                </span>
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Nomor SIP</span>
              <span class="font-mono font-semibold">{{ detail.noSip || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Masa Berlaku SIP</span>
              <span class="font-semibold">
                {{ formatDate(detail.sipTerbitPada) }} —
                <span
                  :class="
                    isExpired(detail.sipBerlakuSampai)
                      ? 'text-error font-bold'
                      : isExpiringSoon(detail.sipBerlakuSampai, 30)
                        ? 'text-warning font-bold'
                        : ''
                  "
                >
                  {{ formatDate(detail.sipBerlakuSampai) }}
                </span>
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">IHS Practitioner ID (SATUSEHAT)</span>
              <span class="font-mono font-semibold">{{ detail.ihsPractitionerId || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Kode DPJP BPJS</span>
              <span class="font-mono font-semibold">{{ detail.kodeBpjs || "-" }}</span>
            </div>
          </div>

          <!-- Pegawai -->
          <div
            v-if="detail.pegawai"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs"
          >
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <Briefcase class="w-3.5 h-3.5" />
              Kepegawaian Tertaut
            </div>
            <div>
              <span class="text-base-content/50 block">NIP</span>
              <span class="font-mono font-semibold">{{ detail.pegawai.nip }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Unit Kerja</span>
              <span class="font-semibold">{{ detail.pegawai.unitKerja || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Status Kepegawaian</span>
              <span class="font-semibold">
                {{ getOptionLabel(STATUS_KEPEGAWAIAN_OPTIONS, detail.pegawai.statusKepegawaian) }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Status Aktif Pegawai</span>
              <span class="font-semibold">
                {{ getOptionLabel(STATUS_AKTIF_PEGAWAI_OPTIONS, detail.pegawai.statusAktif) }}
              </span>
            </div>
          </div>

          <!-- Penduduk -->
          <div
            v-if="detail.penduduk"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs"
          >
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <IdCard class="w-3.5 h-3.5" />
              Identitas Kependudukan
            </div>
            <div>
              <span class="text-base-content/50 block">Nama Lengkap (KTP)</span>
              <span class="font-semibold">{{ detail.penduduk.namaLengkap }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">NIK</span>
              <span class="font-mono font-semibold">{{ detail.penduduk.nik || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">No. Telepon</span>
              <span class="font-semibold">{{ detail.penduduk.noTelepon || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Agama / Pekerjaan</span>
              <span class="font-semibold">
                {{ detail.penduduk.agama?.nama || "-" }} • {{ detail.penduduk.pekerjaan?.nama || "-" }}
              </span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Alamat & Wilayah</span>
              <span class="font-semibold">
                {{ detail.penduduk.alamatKtp || "-" }}
                <template v-if="detail.penduduk.kelurahan">
                  ({{ formatKelurahanLabel(detail.penduduk.kelurahan) }})
                </template>
              </span>
            </div>
          </div>

          <div class="text-[11px] text-base-content/50 px-1">
            Terakhir diperbarui: {{ formatDateTime(detail.updatedAt || detail.createdAt) }}
          </div>
        </div>

        <div class="flex-none modal-action pt-4 mt-2 border-t border-base-content/10">
          <button type="button" class="btn btn-primary btn-sm rounded-xl px-5" @click="emit('close')">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

