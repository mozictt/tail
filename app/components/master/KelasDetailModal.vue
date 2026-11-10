<script setup lang="ts">
import { ref, watch } from "vue";
import {
  CheckCircle2,
  Coins,
  Layers,
  X,
  XCircle,
} from "lucide-vue-next";
import { KelasService } from "@/services/kelas.service";
import { useCurrency } from "@/composables/useCurrency";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { KelasItem } from "@/types/simrs";

const props = defineProps<{
  show: boolean;
  kelasId?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const kelasService = KelasService();
const { formatRupiah } = useCurrency();
const { formatDateTime } = useDate();
const { showToast } = useToast();

const loading = ref(false);
const detail = ref<KelasItem | null>(null);

watch(
  () => [props.show, props.kelasId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null;
      return;
    }

    loading.value = true;
    try {
      detail.value = await kelasService.getKelasById(id);
    } catch (err: unknown) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat detail kelas"),
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
      <div class="modal-box max-w-xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-6 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden">
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
            <Layers class="w-5 h-5" />
          </div>
          <span>Detail Master Kelas</span>
        </h3>

        <div v-if="loading" class="space-y-3 py-4 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-28 bg-base-200 rounded-2xl"></div>
        </div>

        <div v-else-if="detail" class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 text-sm">
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-base-100 border border-base-content/10">
                  {{ detail.kode }}
                </span>
                <span class="text-xs font-bold text-base-content/60">
                  Urutan #{{ detail.urutan }}
                </span>
              </div>
              <h4 class="font-extrabold text-base text-base-content mt-1.5">
                {{ detail.nama }}
              </h4>
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

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/30 border border-base-content/10 rounded-2xl p-4 text-xs">
            <div class="sm:col-span-2 font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
              <Coins class="w-3.5 h-3.5" />
              Tarif & Integrasi
            </div>
            <div>
              <span class="text-base-content/50 block">Tarif Akomodasi / Hari</span>
              <span class="font-bold text-sm text-base-content">
                {{
                  detail.tarifAkomodasi !== null && detail.tarifAkomodasi !== undefined
                    ? formatRupiah(detail.tarifAkomodasi)
                    : "-"
                }}
              </span>
            </div>
            <div>
              <span class="text-base-content/50 block">Kode BPJS Aplicare</span>
              <span class="font-mono font-semibold">{{ detail.kodeBpjsAplicare || "-" }}</span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-base-content/50 block">Keterangan Fasilitas</span>
              <span class="font-semibold whitespace-pre-line">{{ detail.keterangan || "-" }}</span>
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

