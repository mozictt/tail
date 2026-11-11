<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { CreditCard, Save, X } from "lucide-vue-next";
import PendaftaranPenjaminSection from "@/components/transaksi/PendaftaranPenjaminSection.vue";
import { PendaftaranService } from "@/services/pendaftaran.service";
import { PasienService } from "@/services/pasien.service";
import { PenjaminService } from "@/services/penjamin.service";
import { KelasService } from "@/services/kelas.service";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import {
  buildPenjaminListPayload,
  createDefaultPenjaminMultiState,
  createPenjaminStateFromPendaftaran,
  validatePenjaminMultiState,
  type PenjaminKunjunganMultiState,
} from "@/utils/pendaftaran-penjamin.util";
import type {
  KelasOptionItem,
  PasienPenjaminItem,
  PendaftaranItem,
  PenjaminOptionItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    show: boolean;
    pendaftaran?: PendaftaranItem | null;
  }>(),
  {
    pendaftaran: null,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated", item: PendaftaranItem): void;
}>();

const pendaftaranService = PendaftaranService();
const pasienService = PasienService();
const penjaminService = PenjaminService();
const kelasService = KelasService();
const { showToast } = useToast();

const loading = ref(false);
const saving = ref(false);
const savedPenjaminList = ref<PasienPenjaminItem[]>([]);
const penjaminOptions = ref<PenjaminOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);
const state = ref<PenjaminKunjunganMultiState>(createDefaultPenjaminMultiState());
const errors = ref<Record<string, string | undefined>>({});

const activeSavedCards = computed(() =>
  savedPenjaminList.value.filter((item) => item.status !== "N"),
);

const clearError = (key: string) => {
  errors.value[key] = undefined;
};

watch(
  () => [props.show, props.pendaftaran?.id] as const,
  async ([isOpen, pendaftaranId]) => {
    if (!isOpen || !pendaftaranId || !props.pendaftaran) {
      errors.value = {};
      return;
    }

    loading.value = true;
    errors.value = {};
    try {
      const [detailRes, penjaminRes, kelasRes] = await Promise.all([
        pendaftaranService.getPendaftaranById(pendaftaranId),
        penjaminOptions.value.length > 0
          ? Promise.resolve(penjaminOptions.value)
          : penjaminService.getPenjaminOptions(),
        kelasOptions.value.length > 0
          ? Promise.resolve(kelasOptions.value)
          : kelasService.getKelasOptions(),
      ]);

      penjaminOptions.value = penjaminRes;
      kelasOptions.value = kelasRes;

      try {
        const pasienDetail = await pasienService.getPasienById(detailRes.pasienId);
        savedPenjaminList.value = pasienDetail.penjaminList ?? [];
      } catch {
        savedPenjaminList.value = [];
      }

      state.value = createPenjaminStateFromPendaftaran(
        detailRes,
        savedPenjaminList.value,
      );
    } catch (err: unknown) {
      showToast(
        extractApiErrorMessage(err, "Gagal memuat konfigurasi penjamin kunjungan"),
        "error",
      );
      emit("close");
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!props.pendaftaran || saving.value) return;
  const nextErrors: Record<string, string | undefined> = {};
  validatePenjaminMultiState(
    state.value,
    penjaminOptions.value,
    activeSavedCards.value,
    nextErrors,
  );
  errors.value = nextErrors;
  if (Object.values(nextErrors).some(Boolean)) return;

  saving.value = true;
  try {
    const updated = await pendaftaranService.updatePenjaminPendaftaran(
      props.pendaftaran.id,
      {
        penjaminList: buildPenjaminListPayload(state.value),
      },
    );
    showToast(
      `Konfigurasi penjamin kunjungan ${updated.noRegistrasi} berhasil diperbarui`,
      "success",
    );
    emit("updated", updated);
    emit("close");
  } catch (err: unknown) {
    showToast(
      extractApiErrorMessage(err, "Gagal memperbarui penjamin kunjungan"),
      "error",
    );
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && pendaftaran"
      class="modal modal-open backdrop-blur-md bg-slate-950/40"
      @click.self="emit('close')"
    >
      <div class="modal-box max-w-5xl w-full bg-base-100 rounded-3xl border border-base-content/10 p-5 sm:p-7 shadow-2xl relative text-base-content flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute top-5 right-5 text-base-content/40 hover:text-error"
          aria-label="Tutup"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-3 pr-8 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CreditCard class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <span class="block">Ubah Penjamin / Asuransi Kunjungan</span>
            <span class="text-xs font-medium text-base-content/60 block truncate">
              {{ pendaftaran.noRegistrasi }} • {{ pendaftaran.pasien?.penduduk?.namaLengkap || "-" }}
            </span>
          </div>
        </h3>

        <div v-if="loading" class="space-y-3 py-6 animate-pulse">
          <div class="h-16 bg-base-200 rounded-2xl"></div>
          <div class="h-44 bg-base-200 rounded-2xl"></div>
        </div>

        <form v-else class="flex-1 min-h-0 flex flex-col overflow-hidden" @submit.prevent="handleSubmit">
          <div class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            <PendaftaranPenjaminSection
              :state="state"
              :saved-penjamin-list="savedPenjaminList"
              :penjamin-options="penjaminOptions"
              :kelas-options="kelasOptions"
              :errors="errors"
              section-title="Konfigurasi Cara Bayar &amp; Multi-Penjamin (COB)"
              @clear-error="clearError"
            />
          </div>

          <div class="flex-none modal-action gap-2 pt-4 mt-3 border-t border-base-content/10">
            <button
              type="button"
              class="btn btn-ghost rounded-xl"
              :disabled="saving"
              @click="emit('close')"
            >
              Batal
            </button>
            <button
              type="submit"
              class="btn btn-primary rounded-xl px-6 font-bold gap-1.5"
              :disabled="saving"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <Save v-else class="w-4 h-4" />
              <span>{{ saving ? "Menyimpan..." : "Simpan Perubahan Penjamin" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
