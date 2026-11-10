<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import {
  CheckCircle2,
  CreditCard,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import { PenjaminService } from "@/services/penjamin.service";
import { KelasService } from "@/services/kelas.service";
import { PasienService } from "@/services/pasien.service";
import { useDate } from "@/composables/useDate";
import { useToast } from "@/composables/useToast";
import { extractApiErrorMessage } from "@/utils/api-error.util";
import type { MasterStatus } from "@/types/master-data";
import {
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  JENIS_PENJAMIN_OPTIONS,
  type CreatePasienPenjaminPayload,
  type KelasOptionItem,
  type PasienPenjaminItem,
  type PenjaminOptionItem,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    pasienId?: number | null;
    modelValue?: CreatePasienPenjaminPayload[];
    initialItems?: PasienPenjaminItem[];
    readonly?: boolean;
  }>(),
  {
    pasienId: null,
    modelValue: () => [],
    initialItems: () => [],
    readonly: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: CreatePasienPenjaminPayload[]): void;
  (e: "updated", items: PasienPenjaminItem[]): void;
}>();

const penjaminService = PenjaminService();
const kelasService = KelasService();
const pasienService = PasienService();
const { formatDate, isExpired, isExpiringSoon } = useDate();
const { showToast } = useToast();

const isLiveMode = computed(() => Boolean(props.pasienId));
const options = ref<PenjaminOptionItem[]>([]);
const kelasOptions = ref<KelasOptionItem[]>([]);
const loadingOptions = ref(false);
const liveItems = ref<PasienPenjaminItem[]>([]);
const loadingList = ref(false);
const saving = ref(false);

interface PenjaminRowForm {
  penjaminId: number | undefined;
  noKartu: string;
  kelasHakId: number | undefined;
  faskesPerujuk: string;
  berlakuSampai: string;
  isUtama: boolean;
  keterangan: string;
  status: MasterStatus;
}

const showEditor = ref(false);
const editingIndex = ref<number | null>(null);
const editingLiveId = ref<number | null>(null);
const rowForm = ref<PenjaminRowForm>({
  penjaminId: undefined,
  noKartu: "",
  kelasHakId: undefined,
  faskesPerujuk: "",
  berlakuSampai: "",
  isUtama: false,
  keterangan: "",
  status: "Y",
});
const rowErrors = ref<Partial<Record<keyof PenjaminRowForm, string>>>({});

const selectOptions = computed(() =>
  options.value.map((opt) => ({
    ...opt,
    displayLabel: `${opt.kode} — ${opt.nama}`,
  })),
);

const kelasSelectOptions = computed(() =>
  kelasOptions.value.map((k) => ({
    ...k,
    displayLabel: `${k.kode} — ${k.nama}`,
  })),
);

const optionMap = computed(() => {
  const map = new Map<number, PenjaminOptionItem>();
  for (const opt of options.value) {
    map.set(opt.id, opt);
  }
  return map;
});

const kelasMap = computed(() => {
  const map = new Map<number, KelasOptionItem>();
  for (const k of kelasOptions.value) {
    map.set(k.id, k);
  }
  return map;
});

const selectedMasterPenjamin = computed(() =>
  rowForm.value.penjaminId
    ? optionMap.value.get(Number(rowForm.value.penjaminId)) ?? null
    : null,
);

const displayList = computed(() => {
  if (isLiveMode.value) {
    return liveItems.value.map((item, idx) => ({
      key: `live-${item.id}`,
      id: item.id,
      index: idx,
      penjaminId: item.penjaminId,
      penjamin: item.penjamin ?? optionMap.value.get(item.penjaminId) ?? null,
      noKartu: item.noKartu,
      kelasHakId: item.kelasHakId ?? undefined,
      kelasHak:
        item.kelasHak ??
        (item.kelasHakId ? kelasMap.value.get(item.kelasHakId) ?? null : null),
      faskesPerujuk: item.faskesPerujuk,
      berlakuSampai: item.berlakuSampai,
      isUtama: Boolean(item.isUtama),
      keterangan: item.keterangan,
      status: item.status || "Y",
    }));
  }

  return props.modelValue.map((item, idx) => ({
    key: `draft-${idx}-${item.penjaminId}`,
    id: undefined,
    index: idx,
    penjaminId: item.penjaminId,
    penjamin: optionMap.value.get(item.penjaminId) ?? null,
    noKartu: item.noKartu,
    kelasHakId: item.kelasHakId ?? undefined,
    kelasHak: item.kelasHakId
      ? kelasMap.value.get(item.kelasHakId) ?? null
      : null,
    faskesPerujuk: item.faskesPerujuk,
    berlakuSampai: item.berlakuSampai,
    isUtama: Boolean(item.isUtama),
    keterangan: item.keterangan,
    status: item.status || "Y",
  }));
});

const loadOptions = async () => {
  if (options.value.length > 0 && kelasOptions.value.length > 0) return;
  loadingOptions.value = true;
  try {
    const [penjaminRes, kelasRes] = await Promise.allSettled([
      options.value.length === 0
        ? penjaminService.getPenjaminOptions()
        : Promise.resolve(options.value),
      kelasOptions.value.length === 0
        ? kelasService.getKelasOptions()
        : Promise.resolve(kelasOptions.value),
    ]);

    if (penjaminRes.status === "fulfilled") {
      options.value = penjaminRes.value;
    } else {
      showToast(
        extractApiErrorMessage(
          penjaminRes.reason,
          "Gagal memuat daftar master penjamin",
        ),
        "error",
      );
    }

    if (kelasRes.status === "fulfilled") {
      kelasOptions.value = kelasRes.value;
    }
  } finally {
    loadingOptions.value = false;
  }
};

const fetchLiveItems = async () => {
  if (!props.pasienId) return;
  loadingList.value = true;
  try {
    const list = await pasienService.getPasienPenjaminList(props.pasienId);
    liveItems.value = list;
    emit("updated", list);
  } catch (err: any) {
    showToast(
      extractApiErrorMessage(err, "Gagal memuat penjamin pasien"),
      "error",
    );
  } finally {
    loadingList.value = false;
  }
};

watch(
  () => props.initialItems,
  (items) => {
    if (isLiveMode.value) {
      liveItems.value = Array.isArray(items) ? [...items] : [];
    }
  },
  { immediate: true },
);

watch(
  () => props.pasienId,
  (newId) => {
    showEditor.value = false;
    if (newId && (!props.initialItems || props.initialItems.length === 0)) {
      fetchLiveItems();
    }
  },
);

const resetEditor = () => {
  editingIndex.value = null;
  editingLiveId.value = null;
  rowForm.value = {
    penjaminId: undefined,
    noKartu: "",
    kelasHakId: undefined,
    faskesPerujuk: "",
    berlakuSampai: "",
    isUtama: displayList.value.length === 0,
    keterangan: "",
    status: "Y",
  };
  rowErrors.value = {};
};

const openAdd = async () => {
  await loadOptions();
  resetEditor();
  showEditor.value = true;
};

const openEdit = async (entry: (typeof displayList.value)[number]) => {
  await loadOptions();
  editingIndex.value = entry.index;
  editingLiveId.value = entry.id ?? null;
  rowForm.value = {
    penjaminId: entry.penjaminId,
    noKartu: entry.noKartu || "",
    kelasHakId: entry.kelasHakId ?? undefined,
    faskesPerujuk: entry.faskesPerujuk || "",
    berlakuSampai: entry.berlakuSampai
      ? String(entry.berlakuSampai).slice(0, 10)
      : "",
    isUtama: Boolean(entry.isUtama),
    keterangan: entry.keterangan || "",
    status: entry.status === "N" ? "N" : "Y",
  };
  rowErrors.value = {};
  showEditor.value = true;
};

const closeEditor = () => {
  if (saving.value) return;
  showEditor.value = false;
  resetEditor();
};

const validateRow = (): boolean => {
  const next: Partial<Record<keyof PenjaminRowForm, string>> = {};
  const f = rowForm.value;

  if (!f.penjaminId) {
    next.penjaminId = "Master penjamin wajib dipilih";
  }

  const master = selectedMasterPenjamin.value;
  if (master?.butuhNoKartu && !f.noKartu.trim()) {
    next.noKartu = `Penjamin "${master.nama}" wajib mengisi nomor kartu / polis`;
  }

  if (f.noKartu.trim().length > 50) {
    next.noKartu = "Nomor kartu maksimal 50 karakter";
  }

  if (!isLiveMode.value && f.penjaminId && f.noKartu.trim()) {
    const duplicate = props.modelValue.some(
      (item, idx) =>
        idx !== editingIndex.value &&
        item.penjaminId === Number(f.penjaminId) &&
        (item.noKartu || "").trim().toUpperCase() ===
          f.noKartu.trim().toUpperCase(),
    );
    if (duplicate) {
      next.noKartu = "Nomor kartu untuk penjamin ini sudah ada di daftar";
    }
  }

  rowErrors.value = next;
  return Object.keys(next).length === 0;
};

const saveRow = async () => {
  if (!validateRow()) return;
  const f = rowForm.value;
  const normalizedKelasHakId = f.kelasHakId ? Number(f.kelasHakId) : undefined;

  const payload: CreatePasienPenjaminPayload = {
    penjaminId: Number(f.penjaminId),
    noKartu: f.noKartu.trim() || undefined,
    kelasHakId: normalizedKelasHakId,
    faskesPerujuk: f.faskesPerujuk.trim() || undefined,
    berlakuSampai: f.berlakuSampai || undefined,
    isUtama: f.isUtama,
    keterangan: f.keterangan.trim() || undefined,
    status: f.status,
  };

  if (isLiveMode.value && props.pasienId) {
    saving.value = true;
    try {
      if (editingLiveId.value) {
        await pasienService.updatePasienPenjamin(
          props.pasienId,
          editingLiveId.value,
          {
            ...payload,
            kelasHakId: normalizedKelasHakId ?? null,
          },
        );
        showToast("Penjamin pasien berhasil diperbarui", "success");
      } else {
        await pasienService.addPasienPenjamin(props.pasienId, payload);
        showToast("Penjamin pasien berhasil ditambahkan", "success");
      }
      showEditor.value = false;
      resetEditor();
      await fetchLiveItems();
    } catch (err: any) {
      showToast(
        extractApiErrorMessage(err, "Gagal menyimpan penjamin pasien"),
        "error",
      );
    } finally {
      saving.value = false;
    }
    return;
  }

  // Draft mode (used on Create Pasien)
  const nextList = [...props.modelValue];
  if (payload.isUtama) {
    for (let i = 0; i < nextList.length; i += 1) {
      nextList[i] = { ...nextList[i], isUtama: false };
    }
  } else if (
    nextList.length === 0 ||
    (editingIndex.value !== null &&
      nextList[editingIndex.value]?.isUtama &&
      !nextList.some((x, idx) => idx !== editingIndex.value && x.isUtama))
  ) {
    payload.isUtama = nextList.length === 0;
  }

  if (editingIndex.value !== null) {
    nextList[editingIndex.value] = payload;
  } else {
    nextList.push(payload);
  }

  emit("update:modelValue", nextList);
  showEditor.value = false;
  resetEditor();
};

const setAsPrimary = async (entry: (typeof displayList.value)[number]) => {
  if (props.readonly || entry.isUtama || saving.value) return;

  if (isLiveMode.value && props.pasienId && entry.id) {
    saving.value = true;
    try {
      await pasienService.updatePasienPenjamin(props.pasienId, entry.id, {
        isUtama: true,
      });
      showToast("Penjamin utama pasien berhasil diperbarui", "success");
      await fetchLiveItems();
    } catch (err: any) {
      showToast(
        extractApiErrorMessage(err, "Gagal mengubah penjamin utama"),
        "error",
      );
    } finally {
      saving.value = false;
    }
    return;
  }

  const nextList = props.modelValue.map((item, idx) => ({
    ...item,
    isUtama: idx === entry.index,
  }));
  emit("update:modelValue", nextList);
};

const removeRow = async (entry: (typeof displayList.value)[number]) => {
  if (props.readonly || saving.value) return;

  if (isLiveMode.value && props.pasienId && entry.id) {
    const confirm = await Swal.fire({
      title: "Hapus Penjamin Pasien?",
      text: `Penjamin "${entry.penjamin?.nama || entry.penjaminId}" akan dihapus dari pasien ini.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      customClass: {
        popup: "rounded-3xl border border-base-content/10",
        confirmButton: "btn btn-error text-white rounded-xl px-5 font-bold",
        cancelButton: "btn btn-ghost rounded-xl px-5 font-bold",
      },
    });
    if (!confirm.isConfirmed) return;

    saving.value = true;
    try {
      await pasienService.removePasienPenjamin(props.pasienId, entry.id);
      showToast("Penjamin pasien berhasil dihapus", "success");
      await fetchLiveItems();
    } catch (err: any) {
      showToast(
        extractApiErrorMessage(err, "Gagal menghapus penjamin pasien"),
        "error",
      );
    } finally {
      saving.value = false;
    }
    return;
  }

  const nextList = props.modelValue.filter((_, idx) => idx !== entry.index);
  if (nextList.length > 0 && !nextList.some((item) => item.isUtama)) {
    nextList[0] = { ...nextList[0], isUtama: true };
  }
  emit("update:modelValue", nextList);
};

onMounted(() => {
  loadOptions();
});
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-xs text-base-content/60">
        <span v-if="displayList.length === 0">
          Belum ada penjamin terdaftar untuk pasien ini.
        </span>
        <span v-else>
          Total <strong class="text-base-content">{{ displayList.length }}</strong> penjamin terdaftar.
        </span>
      </div>

      <button
        v-if="!readonly && !showEditor"
        type="button"
        class="btn btn-outline btn-primary btn-xs rounded-xl font-bold gap-1"
        :disabled="saving || loadingOptions"
        @click="openAdd"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Tambah Penjamin</span>
      </button>
    </div>

    <!-- INLINE EDITOR -->
    <div
      v-if="showEditor && !readonly"
      class="bg-base-100 border border-primary/25 rounded-2xl p-4 space-y-3 shadow-xs"
    >
      <div class="flex items-center justify-between gap-2 border-b border-base-content/10 pb-2.5">
        <h5 class="text-xs font-extrabold text-primary flex items-center gap-1.5">
          <ShieldCheck class="w-4 h-4" />
          <span>
            {{ editingIndex !== null || editingLiveId ? "Edit Penjamin Pasien" : "Tambah Penjamin Pasien" }}
          </span>
        </h5>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-error"
          :disabled="saving"
          @click="closeEditor"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">
          <label class="block text-xs font-bold text-base-content/80 mb-1">
            Master Penjamin <span class="text-error">*</span>
          </label>
          <Select2
            v-model="rowForm.penjaminId"
            :options="selectOptions"
            label-key="displayLabel"
            value-key="id"
            placeholder="Pilih penjamin / asuransi..."
            :error="Boolean(rowErrors.penjaminId)"
            @change="rowErrors.penjaminId = undefined"
          />
          <span v-if="rowErrors.penjaminId" class="text-xs text-error font-semibold mt-1 block">
            {{ rowErrors.penjaminId }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1">
            Nomor Kartu / Polis
            <span v-if="selectedMasterPenjamin?.butuhNoKartu" class="text-error">*</span>
          </label>
          <input
            v-model="rowForm.noKartu"
            type="text"
            maxlength="50"
            :placeholder="
              selectedMasterPenjamin?.butuhNoKartu
                ? 'Wajib diisi, mis. 0001234567890'
                : 'Opsional (tidak wajib untuk Umum)'
            "
            class="input input-bordered input-sm w-full rounded-xl h-10 text-sm font-mono"
            :class="{ 'border-error': rowErrors.noKartu }"
            @input="rowErrors.noKartu = undefined"
          />
          <span v-if="rowErrors.noKartu" class="text-xs text-error font-semibold mt-1 block">
            {{ rowErrors.noKartu }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1">
            Kelas Hak Rawat
          </label>
          <Select2
            v-model="rowForm.kelasHakId"
            :options="kelasSelectOptions"
            label-key="displayLabel"
            value-key="id"
            placeholder="Pilih kelas hak rawat..."
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1">
            Faskes Tingkat 1 / Perujuk
          </label>
          <input
            v-model="rowForm.faskesPerujuk"
            type="text"
            maxlength="120"
            placeholder="Contoh: Puskesmas Coblong"
            class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1">
            Berlaku Sampai
          </label>
          <FlatpickrDate
            v-model="rowForm.berlakuSampai"
            size="sm"
            placeholder="Pilih tanggal berlaku..."
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-base-content/80 mb-1">
            Status Penjamin Pasien
          </label>
          <select
            v-model="rowForm.status"
            class="select select-bordered select-sm w-full rounded-xl h-10 text-sm"
          >
            <option value="Y">Aktif (Y)</option>
            <option value="N">Nonaktif (N)</option>
          </select>
        </div>

        <div class="flex items-end pb-1">
          <label class="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-base-200/40 border border-base-content/10 w-full">
            <input
              v-model="rowForm.isUtama"
              type="checkbox"
              class="checkbox checkbox-primary checkbox-xs"
            />
            <span class="text-xs font-bold text-base-content">Jadikan Penjamin Utama</span>
          </label>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-xs font-bold text-base-content/80 mb-1">
            Keterangan
          </label>
          <input
            v-model="rowForm.keterangan"
            type="text"
            maxlength="500"
            placeholder="Contoh: Peserta PBI aktif"
            class="input input-bordered input-sm w-full rounded-xl h-10 text-sm"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-base-content/10">
        <button
          type="button"
          class="btn btn-ghost btn-xs rounded-xl px-4"
          :disabled="saving"
          @click="closeEditor"
        >
          Batal
        </button>
        <button
          type="button"
          class="btn btn-primary btn-xs rounded-xl px-4 font-bold gap-1"
          :disabled="saving"
          @click="saveRow"
        >
          <span v-if="saving" class="loading loading-spinner loading-xs"></span>
          <span>{{ editingIndex !== null || editingLiveId ? "Perbarui" : "Tambahkan" }}</span>
        </button>
      </div>
    </div>

    <!-- LOADING LIST -->
    <div v-if="loadingList" class="space-y-2 animate-pulse">
      <div class="h-14 bg-base-200 rounded-xl"></div>
    </div>

    <!-- LIST PENJAMIN PASIEN -->
    <div v-else-if="displayList.length > 0" class="space-y-2">
      <div
        v-for="entry in displayList"
        :key="entry.key"
        class="p-3 rounded-2xl border bg-base-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        :class="entry.isUtama ? 'border-primary/35 bg-primary/5' : 'border-base-content/10'"
      >
        <div class="min-w-0 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-xs sm:text-sm text-base-content">
              {{ entry.penjamin?.nama || `Penjamin #${entry.penjaminId}` }}
            </span>
            <span
              v-if="entry.penjamin?.jenisPenjamin"
              class="text-[10px] font-bold px-2 py-0.5 rounded-md border"
              :class="getJenisPenjaminBadgeClass(entry.penjamin.jenisPenjamin)"
            >
              {{ getOptionLabel(JENIS_PENJAMIN_OPTIONS, entry.penjamin.jenisPenjamin) }}
            </span>
            <span
              v-if="entry.isUtama"
              class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-content"
            >
              <Star class="w-2.5 h-2.5 fill-current" />
              Utama
            </span>
            <span
              v-if="entry.status === 'N'"
              class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20"
            >
              Nonaktif
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-base-content/65">
            <span v-if="entry.noKartu" class="inline-flex items-center gap-1 font-mono text-base-content">
              <CreditCard class="w-3 h-3 text-base-content/45" />
              {{ entry.noKartu }}
            </span>
            <span v-if="entry.kelasHak">Kelas: <strong>{{ entry.kelasHak.nama }}</strong></span>
            <span v-if="entry.faskesPerujuk">Faskes: {{ entry.faskesPerujuk }}</span>
            <span
              v-if="entry.berlakuSampai"
              :class="
                isExpired(entry.berlakuSampai)
                  ? 'text-error font-bold'
                  : isExpiringSoon(entry.berlakuSampai, 30)
                    ? 'text-warning font-bold'
                    : ''
              "
            >
              s.d. {{ formatDate(entry.berlakuSampai) }}
            </span>
          </div>

          <p v-if="entry.keterangan" class="text-[11px] text-base-content/55 italic">
            {{ entry.keterangan }}
          </p>
        </div>

        <div v-if="!readonly" class="flex items-center gap-1 shrink-0 self-end sm:self-center">
          <button
            v-if="!entry.isUtama"
            type="button"
            class="btn btn-ghost btn-xs rounded-lg text-amber-600 hover:bg-amber-500/10 gap-1"
            title="Jadikan Penjamin Utama"
            :disabled="saving"
            @click="setAsPrimary(entry)"
          >
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Utama</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs rounded-lg text-primary hover:bg-primary/10"
            title="Edit Penjamin"
            :disabled="saving"
            @click="openEdit(entry)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10"
            title="Hapus Penjamin"
            :disabled="saving"
            @click="removeRow(entry)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

