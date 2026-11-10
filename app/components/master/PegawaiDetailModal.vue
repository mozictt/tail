<script setup lang="ts">
import { ref, watch } from "vue";
import { Briefcase, IdCard, MapPin, Users, X } from "lucide-vue-next";
import { PegawaiService, type PegawaiItem } from "@/services/pegawai.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatKelurahanLabel,
  getOptionLabel,
  STATUS_AKTIF_PEGAWAI_OPTIONS,
  STATUS_KEPEGAWAIAN_OPTIONS,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  pegawaiId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const pegawaiService = PegawaiService();
const { formatDate, formatDateTime } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<PegawaiItem | null>(null);

watch(
  () => [props.show, props.pegawaiId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }

    loading.value = true;
    try {
      detail.value = await pegawaiService.getPegawaiById(id);
    } catch (err: any) {
      showToast(extractApiErrorMessage(err, "Gagal memuat detail pegawai"), "error");
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
            <Users class="w-5 h-5" />
          </div>
          <span>Detail Data Pegawai</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-primary/20">
                <SecureAvatar
                  :avatar-path="detail.avatar || undefined"
                  :name="detail.name"
                  img-class="w-full h-full object-cover"
                  fallback-class="w-full h-full bg-primary/10 text-primary font-black flex items-center justify-center uppercase text-sm"
                />
              </div>
              <div class="min-w-0">
                <h4 class="font-extrabold text-base text-base-content truncate">{{ detail.name }}</h4>
                <p class="text-xs font-mono text-base-content/60">NIP: {{ detail.nip }}</p>
              </div>
            </div>
            <span class="badge badge-primary badge-outline font-bold text-xs shrink-0">
              {{ getOptionLabel(STATUS_AKTIF_PEGAWAI_OPTIONS, detail.statusAktif) }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <Briefcase class="w-3.5 h-3.5" />
              Kepegawaian
            </div>
            <div>
              <span class="text-base-content/50 block">Jabatan / Posisi</span>
              <span class="font-semibold">{{ detail.position || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Unit Kerja</span>
              <span class="font-semibold">{{ detail.unitKerja || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Status Kepegawaian</span>
              <span class="font-semibold">
                {{ getOptionLabel(STATUS_KEPEGAWAIAN_OPTIONS, detail.statusKepegawaian) }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Masa Kerja</span>
              <span class="font-semibold">
                {{ formatDate(detail.tanggalMasuk) }} s/d {{ detail.tanggalKeluar ? formatDate(detail.tanggalKeluar) : "Sekarang" }}
              </span>
            </div>
          </div>

          <div
            v-if="detail.penduduk"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs"
          >
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <IdCard class="w-3.5 h-3.5" />
              Data Penduduk Tertaut
            </div>
            <div>
              <span class="text-base-content/50 block">Nama KTP</span>
              <span class="font-semibold">{{ detail.penduduk.namaLengkap }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">NIK</span>
              <span class="font-mono font-semibold">{{ detail.penduduk.nik || "-" }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <MapPin class="w-3.5 h-3.5" />
              Kontak & Domisili
            </div>
            <div>
              <span class="text-base-content/50 block">Email</span>
              <span class="font-semibold">{{ detail.email || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">No. Telepon</span>
              <span class="font-semibold">{{ detail.phoneNumber || "-" }}</span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Wilayah Administratif</span>
              <span class="font-semibold">{{ formatKelurahanLabel(detail.kelurahan) || "-" }}</span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Alamat</span>
              <span class="font-semibold">{{ detail.address || "-" }}</span>
            </div>
            <div v-if="detail.bio" class="sm:col-span-2">
              <span class="text-base-content/50 block">Bio</span>
              <span class="font-semibold">{{ detail.bio }}</span>
            </div>
            <div class="sm:col-span-2 text-base-content/50 pt-1 border-t border-base-content/5">
              Diperbarui: {{ formatDateTime(detail.updatedAt || detail.createdAt) }}
            </div>
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

