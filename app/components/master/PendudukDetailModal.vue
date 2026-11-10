<script setup lang="ts">
import { ref, watch } from "vue";
import { IdCard, MapPin, Phone, Stethoscope, UserRound, X } from "lucide-vue-next";
import { PendudukService } from "@/services/penduduk.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  formatKelurahanLabel,
  getOptionLabel,
  GOLONGAN_DARAH_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  STATUS_PERKAWINAN_OPTIONS,
  type PendudukItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  pendudukId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const pendudukService = PendudukService();
const { formatDate, formatDateTime } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<PendudukItem | null>(null);

watch(
  () => [props.show, props.pendudukId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }

    loading.value = true;
    try {
      detail.value = await pendudukService.getPendudukById(id);
    } catch (err: any) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat detail penduduk"),
        "error",
      );
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
            <IdCard class="w-5 h-5" />
          </div>
          <span>Detail Data Penduduk</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <!-- Header Profile -->
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 class="font-extrabold text-base text-base-content">{{ detail.namaLengkap }}</h4>
              <p class="text-xs font-mono text-base-content/60 mt-0.5">
                NIK: {{ detail.nik || "-" }} • KK: {{ detail.noKk || "-" }}
              </p>
            </div>
            <span class="badge badge-primary badge-outline font-bold text-xs w-fit">
              {{ getOptionLabel(JENIS_KELAMIN_OPTIONS, detail.jenisKelamin) }}
            </span>
          </div>

          <!-- Identitas & Medis -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <UserRound class="w-3.5 h-3.5" />
              Identitas & Sosial
            </div>
            <div>
              <span class="text-base-content/50 block">Tempat, Tgl Lahir</span>
              <span class="font-semibold">
                {{ detail.tempatLahir || "-" }}, {{ formatDate(detail.tanggalLahir) }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Kewarganegaraan</span>
              <span class="font-semibold">{{ detail.kewarganegaraan || "WNI" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Status Perkawinan</span>
              <span class="font-semibold">
                {{ getOptionLabel(STATUS_PERKAWINAN_OPTIONS, detail.statusPerkawinan) }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Golongan Darah / Rhesus</span>
              <span class="font-semibold">
                {{ getOptionLabel(GOLONGAN_DARAH_OPTIONS, detail.golonganDarah) }}
                <span v-if="detail.rhesus">({{ detail.rhesus }})</span>
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Agama</span>
              <span class="font-semibold">{{ detail.agama?.nama || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Pendidikan</span>
              <span class="font-semibold">{{ detail.pendidikan?.nama || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Pekerjaan</span>
              <span class="font-semibold">{{ detail.pekerjaan?.nama || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Suku</span>
              <span class="font-semibold">{{ detail.suku?.nama || "-" }}</span>
            </div>
          </div>

          <!-- Kontak & Alamat -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <Phone class="w-3.5 h-3.5" />
              Kontak & Domisili
            </div>
            <div>
              <span class="text-base-content/50 block">No. Telepon</span>
              <span class="font-semibold">{{ detail.noTelepon || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Email</span>
              <span class="font-semibold">{{ detail.email || "-" }}</span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Alamat KTP</span>
              <span class="font-semibold">
                {{ detail.alamatKtp || "-" }}
                <template v-if="detail.rt || detail.rw">
                  (RT {{ detail.rt || "-" }} / RW {{ detail.rw || "-" }})
                </template>
              </span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 flex items-center gap-1">
                <MapPin class="w-3 h-3" /> Wilayah Administratif
              </span>
              <span class="font-semibold">
                {{ formatKelurahanLabel(detail.kelurahan) || "-" }}
                <span v-if="detail.kodePos"> • Kode Pos {{ detail.kodePos }}</span>
              </span>
            </div>
          </div>

          <!-- SATUSEHAT & Audit -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <Stethoscope class="w-3.5 h-3.5" />
              Integrasi & Audit
            </div>
            <div>
              <span class="text-base-content/50 block">IHS Patient ID (SATUSEHAT)</span>
              <span class="font-mono font-semibold">{{ detail.ihsPatientId || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Terakhir Diperbarui</span>
              <span class="font-semibold">{{ formatDateTime(detail.updatedAt || detail.createdAt) }}</span>
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

