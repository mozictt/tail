<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Building2,
  CheckCircle2,
  FileSignature,
  Phone,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-vue-next";
import { PenjaminService } from "@/services/penjamin.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  JENIS_PENJAMIN_OPTIONS,
  type PenjaminItem,
} from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  penjaminId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const penjaminService = PenjaminService();
const { formatDate, formatDateTime, isExpired, isExpiringSoon } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<PenjaminItem | null>(null);

watch(
  () => [props.show, props.penjaminId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }

    loading.value = true;
    try {
      detail.value = await penjaminService.getPenjaminById(id);
    } catch (err: any) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat detail penjamin"),
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
            <ShieldCheck class="w-5 h-5" />
          </div>
          <span>Detail Master Penjamin</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <!-- Header Summary -->
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-base-100 border border-base-content/10">
                  {{ detail.kode }}
                </span>
                <span
                  class="text-[11px] font-bold px-2 py-0.5 rounded-md border"
                  :class="getJenisPenjaminBadgeClass(detail.jenisPenjamin)"
                >
                  {{ getOptionLabel(JENIS_PENJAMIN_OPTIONS, detail.jenisPenjamin) }}
                </span>
              </div>
              <h4 class="font-extrabold text-base text-base-content mt-1.5">
                {{ detail.nama }}
              </h4>
              <p v-if="detail.perusahaanInduk" class="text-xs text-base-content/60 mt-0.5">
                Induk: {{ detail.perusahaanInduk }}
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

          <!-- Aturan & Integrasi -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <Building2 class="w-3.5 h-3.5" />
              Ketentuan & Integrasi
            </div>
            <div>
              <span class="text-base-content/50 block">Kewajiban Nomor Kartu / Polis</span>
              <span
                class="inline-flex items-center font-bold mt-1 px-2 py-0.5 rounded-md border"
                :class="
                  detail.butuhNoKartu
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-base-100 text-base-content/70 border-base-content/10'
                "
              >
                {{ detail.butuhNoKartu ? "Wajib Isi No. Kartu" : "Tidak Wajib No. Kartu" }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Kode Eksternal (BPJS / SATUSEHAT)</span>
              <span class="font-mono font-semibold mt-1 block">
                {{ detail.kodeEksternalBpjs || "-" }}
              </span>
            </div>
          </div>

          <!-- Kontak & PIC -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <Phone class="w-3.5 h-3.5" />
              Kontak & PIC Kerja Sama
            </div>
            <div>
              <span class="text-base-content/50 block">No. Telepon</span>
              <span class="font-semibold">{{ detail.noTelepon || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Email</span>
              <span class="font-semibold">{{ detail.email || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Nama PIC</span>
              <span class="font-semibold">{{ detail.picNama || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Telepon PIC</span>
              <span class="font-semibold">{{ detail.picTelepon || "-" }}</span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Alamat Kantor</span>
              <span class="font-semibold">{{ detail.alamat || "-" }}</span>
            </div>
          </div>

          <!-- PKS -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <FileSignature class="w-3.5 h-3.5" />
              Perjanjian Kerja Sama (PKS)
            </div>
            <div>
              <span class="text-base-content/50 block">Nomor PKS</span>
              <span class="font-mono font-semibold">{{ detail.noPks || "-" }}</span>
            </div>
            <div>
              <span class="text-base-content/50 block">Berlaku Sampai</span>
              <span
                class="font-semibold"
                :class="
                  isExpired(detail.pksBerlakuSampai)
                    ? 'text-error font-bold'
                    : isExpiringSoon(detail.pksBerlakuSampai, 30)
                      ? 'text-warning font-bold'
                      : ''
                "
              >
                {{ formatDate(detail.pksBerlakuSampai) }}
                <template v-if="isExpired(detail.pksBerlakuSampai)"> (Kedaluwarsa)</template>
                <template v-else-if="isExpiringSoon(detail.pksBerlakuSampai, 30)"> (Segera Berakhir)</template>
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

