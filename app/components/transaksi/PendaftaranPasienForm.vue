<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Baby,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-vue-next";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import UiAutocompleteWilayah from "@/components/ui/AutocompleteWilayah.vue";
import {
  FORMAT_NO_RM_OPTIONS,
  FormatNoRm,
  HUBUNGAN_PJ_OPTIONS,
  JENIS_IDENTITAS_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  JenisIdentitas,
  JenisKelamin,
  type HubunganPenanggungJawab,
  type PasienItem,
} from "@/types/simrs";

export interface UnifiedPasienFormState {
  selectedPasienId: number | null;
  rmMode: "auto" | "manual";
  noRm: string;
  formatNoRm: FormatNoRm | "";
  isBayiBaruLahir: boolean;
  isIdentitasTidakDiketahui: boolean;
  jenisIdentitas: JenisIdentitas;
  nik: string;
  noIdentitasLain: string;
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
  noTelepon: string;
  idKelurahan: string;
  alamatKtp: string;
  alamatSamaKtp: boolean;
  alamatDomisili: string;
  namaPj: string;
  hubunganPj: HubunganPenanggungJawab | "";
  noHpPj: string;
}

const props = defineProps<{
  form: UnifiedPasienFormState;
  selectedPasien: PasienItem | null;
  wilayahLabel: string;
  wilayahKey: number;
  loadingDetail?: boolean;
  errors: Record<string, string | undefined>;
}>();

const emit = defineEmits<{
  (e: "open-picker"): void;
  (e: "reset-to-new"): void;
  (e: "clear-error", key: string): void;
}>();

const isExistingMode = computed(() => Boolean(props.form.selectedPasienId));
const showExtraSection = ref(false);

watch(
  () => [props.selectedPasien, props.form.namaPj, props.form.alamatSamaKtp] as const,
  ([pasien, namaPj, sameAddr]) => {
    if (pasien && (namaPj || !sameAddr)) {
      showExtraSection.value = true;
    }
  },
);

watch(
  () => props.form.isIdentitasTidakDiketahui,
  (isUnknown) => {
    if (!isExistingMode.value && isUnknown) {
      props.form.jenisIdentitas = JenisIdentitas.TANPA_IDENTITAS;
      if (!props.form.namaLengkap.trim()) {
        props.form.namaLengkap = "Mr. X / Pasien Tanpa Identitas";
      }
      emit("clear-error", "newNik");
      emit("clear-error", "namaLengkap");
    }
  },
);
</script>

<template>
  <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
    <!-- Header & Toolbar Pemilih Pasien Lama -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-content/10">
      <div class="flex items-center gap-2.5 flex-wrap">
        <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <UserRound class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-sm font-extrabold uppercase tracking-wider text-base-content">
              1. Identitas Pasien
            </h2>
            <span
              v-if="isExistingMode"
              class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/25"
            >
              <CheckCircle2 class="w-3.5 h-3.5" />
              Pasien Lama • RM {{ form.noRm }}
            </span>
            <span
              v-else
              class="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/25"
            >
              Mode Pasien Baru
            </span>
          </div>
          <p class="text-[11px] text-base-content/60 mt-0.5">
            {{
              isExistingMode
                ? "Seluruh data identitas terisi otomatis dari Rekam Medis. Klik Reset bila ingin mendaftarkan pasien baru."
                : "Isi langsung formulir di bawah untuk pasien baru, atau klik Cari Pasien Lama untuk mengisi otomatis."
            }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <button
          v-if="isExistingMode"
          type="button"
          class="btn btn-ghost btn-sm rounded-xl border border-base-content/15 gap-1.5 text-error font-bold"
          @click="emit('reset-to-new')"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Reset / Pasien Baru</span>
        </button>

        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl gap-1.5 font-bold shadow-xs"
          :disabled="loadingDetail"
          @click="emit('open-picker')"
        >
          <span v-if="loadingDetail" class="loading loading-spinner loading-xs"></span>
          <Search v-else class="w-3.5 h-3.5" />
          <span>{{ isExistingMode ? "Ganti Pasien Lama" : "Pilih Pasien Lama" }}</span>
        </button>
      </div>
    </div>

    <!-- Toggle Khusus Bayi / Tanpa Identitas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <label
        class="p-2.5 rounded-xl bg-base-200/35 border border-base-content/10 flex items-center justify-between gap-2"
        :class="isExistingMode ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'"
      >
        <span class="font-bold flex items-center gap-1.5">
          <Baby class="w-4 h-4 text-sky-600" />
          Bayi Baru Lahir (belum ber-NIK)
        </span>
        <input
          v-model="form.isBayiBaruLahir"
          type="checkbox"
          :disabled="isExistingMode"
          class="toggle toggle-info toggle-sm"
        />
      </label>

      <label
        class="p-2.5 rounded-xl bg-base-200/35 border border-base-content/10 flex items-center justify-between gap-2"
        :class="isExistingMode ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'"
      >
        <span class="font-bold flex items-center gap-1.5">
          <HelpCircle class="w-4 h-4 text-amber-600" />
          IGD Tanpa Identitas (Mr./Mrs. X)
        </span>
        <input
          v-model="form.isIdentitasTidakDiketahui"
          type="checkbox"
          :disabled="isExistingMode"
          class="toggle toggle-warning toggle-sm"
        />
      </label>
    </div>

    <!-- Grid Form Terpadu -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      <template v-if="isExistingMode">
        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Nomor Rekam Medis (No. RM)
          </label>
          <input
            :value="form.noRm"
            type="text"
            readonly
            class="input input-bordered w-full rounded-xl h-11 text-sm font-mono font-bold bg-base-200/60"
          />
        </div>
      </template>

      <template v-else>
        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Penomoran Rekam Medis (No. RM)
          </label>
          <select
            v-model="form.rmMode"
            class="select select-bordered w-full rounded-xl h-11 text-sm"
          >
            <option value="auto">Otomatis Sistem</option>
            <option value="manual">Input Manual</option>
          </select>
        </div>

        <div v-if="form.rmMode === 'auto'">
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Format Auto No. RM
          </label>
          <select
            v-model="form.formatNoRm"
            class="select select-bordered w-full rounded-xl h-11 text-sm"
          >
            <option value="">Default Pengaturan RS</option>
            <option v-for="opt in FORMAT_NO_RM_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div v-else>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Nomor RM Manual <span class="text-error">*</span>
          </label>
          <input
            v-model="form.noRm"
            type="text"
            maxlength="30"
            placeholder="Contoh: 00001234"
            class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
            :class="{ 'border-error': errors.newNoRm }"
            @input="emit('clear-error', 'newNoRm')"
          />
          <span v-if="errors.newNoRm" class="text-xs text-error font-semibold mt-1 block">
            {{ errors.newNoRm }}
          </span>
        </div>
      </template>

      <div>
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Jenis Identitas
        </label>
        <select
          v-model="form.jenisIdentitas"
          :disabled="isExistingMode"
          class="select select-bordered w-full rounded-xl h-11 text-sm"
        >
          <option v-for="opt in JENIS_IDENTITAS_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div v-if="form.jenisIdentitas === JenisIdentitas.KTP">
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          NIK (16 Digit)
        </label>
        <input
          v-model="form.nik"
          type="text"
          maxlength="16"
          :readonly="isExistingMode"
          placeholder="16 digit angka NIK"
          class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
          :class="[
            errors.newNik ? 'border-error' : '',
            isExistingMode ? 'bg-base-200/60' : '',
          ]"
          @input="emit('clear-error', 'newNik')"
        />
        <span v-if="errors.newNik" class="text-xs text-error font-semibold mt-1 block">
          {{ errors.newNik }}
        </span>
      </div>

      <div v-else-if="form.jenisIdentitas !== JenisIdentitas.TANPA_IDENTITAS">
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Nomor Identitas Lain
        </label>
        <input
          v-model="form.noIdentitasLain"
          type="text"
          maxlength="50"
          :readonly="isExistingMode"
          placeholder="No. Paspor / KITAS / KIA"
          class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
          :class="{ 'bg-base-200/60': isExistingMode }"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Nama Lengkap <span class="text-error">*</span>
        </label>
        <input
          v-model="form.namaLengkap"
          type="text"
          maxlength="150"
          :readonly="isExistingMode"
          placeholder="Nama pasien sesuai identitas"
          class="input input-bordered w-full rounded-xl h-11 text-sm"
          :class="[
            errors.namaLengkap ? 'border-error' : '',
            isExistingMode ? 'bg-base-200/60 font-semibold' : '',
          ]"
          @input="emit('clear-error', 'namaLengkap')"
        />
        <span v-if="errors.namaLengkap" class="text-xs text-error font-semibold mt-1 block">
          {{ errors.namaLengkap }}
        </span>
      </div>

      <div>
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Jenis Kelamin <span class="text-error">*</span>
        </label>
        <select
          v-model="form.jenisKelamin"
          :disabled="isExistingMode"
          class="select select-bordered w-full rounded-xl h-11 text-sm"
        >
          <option v-for="opt in JENIS_KELAMIN_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Tempat Lahir
        </label>
        <input
          v-model="form.tempatLahir"
          type="text"
          maxlength="100"
          :readonly="isExistingMode"
          placeholder="Kota / Kabupaten kelahiran"
          class="input input-bordered w-full rounded-xl h-11 text-sm"
          :class="{ 'bg-base-200/60': isExistingMode }"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Tanggal Lahir
        </label>
        <FlatpickrDate
          v-model="form.tanggalLahir"
          :disabled="isExistingMode"
          placeholder="Pilih tanggal lahir..."
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          No. Telepon / HP
        </label>
        <input
          v-model="form.noTelepon"
          type="text"
          maxlength="20"
          :readonly="isExistingMode"
          placeholder="081234567890"
          class="input input-bordered w-full rounded-xl h-11 text-sm"
          :class="{ 'bg-base-200/60': isExistingMode }"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Kelurahan / Kecamatan
        </label>
        <UiAutocompleteWilayah
          :key="wilayahKey"
          v-model="form.idKelurahan"
          :initial-label="wilayahLabel"
          :disabled="isExistingMode"
          placeholder="Ketik nama kelurahan..."
        />
      </div>

      <div class="sm:col-span-2 lg:col-span-3">
        <label class="block text-xs font-bold text-base-content/80 mb-1.5">
          Alamat Lengkap (KTP)
        </label>
        <input
          v-model="form.alamatKtp"
          type="text"
          maxlength="500"
          :readonly="isExistingMode"
          placeholder="Alamat lengkap sesuai KTP / identitas"
          class="input input-bordered w-full rounded-xl h-11 text-sm"
          :class="{ 'bg-base-200/60': isExistingMode }"
        />
      </div>
    </div>

    <!-- Section Tambahan: Domisili & Penanggung Jawab -->
    <div class="pt-2 border-t border-base-content/10">
      <button
        type="button"
        class="btn btn-ghost btn-xs rounded-lg text-primary font-bold"
        @click="showExtraSection = !showExtraSection"
      >
        {{
          showExtraSection
            ? "Sembunyikan Domisili & Penanggung Jawab"
            : "+ Domisili & Penanggung Jawab (Opsional)"
        }}
      </button>

      <div v-if="showExtraSection" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
        <div class="sm:col-span-2 lg:col-span-3 flex items-center gap-2">
          <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              v-model="form.alamatSamaKtp"
              type="checkbox"
              :disabled="isExistingMode"
              class="checkbox checkbox-xs checkbox-primary"
            />
            Alamat domisili sama dengan alamat KTP
          </label>
        </div>

        <div v-if="!form.alamatSamaKtp" class="sm:col-span-2 lg:col-span-3">
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Alamat Domisili Saat Ini
          </label>
          <input
            v-model="form.alamatDomisili"
            type="text"
            maxlength="500"
            :readonly="isExistingMode"
            placeholder="Alamat domisili pasien saat ini"
            class="input input-bordered w-full rounded-xl h-11 text-sm"
            :class="{ 'bg-base-200/60': isExistingMode }"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Nama Penanggung Jawab / Keluarga
          </label>
          <input
            v-model="form.namaPj"
            type="text"
            maxlength="120"
            :readonly="isExistingMode"
            placeholder="Nama penanggung jawab"
            class="input input-bordered w-full rounded-xl h-11 text-sm"
            :class="{ 'bg-base-200/60': isExistingMode }"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            Hubungan dengan Pasien
          </label>
          <select
            v-model="form.hubunganPj"
            :disabled="isExistingMode"
            class="select select-bordered w-full rounded-xl h-11 text-sm"
          >
            <option value="">-- Pilih Hubungan --</option>
            <option v-for="opt in HUBUNGAN_PJ_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1.5">
            No. HP Penanggung Jawab
          </label>
          <input
            v-model="form.noHpPj"
            type="text"
            maxlength="20"
            :readonly="isExistingMode"
            placeholder="08..."
            class="input input-bordered w-full rounded-xl h-11 text-sm"
            :class="{ 'bg-base-200/60': isExistingMode }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

