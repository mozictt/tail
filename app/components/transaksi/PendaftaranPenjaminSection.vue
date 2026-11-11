<script setup lang="ts">
import { computed } from "vue";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CreditCard,
  Info,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-vue-next";
import Select2 from "@/components/ui/Select2.vue";
import FlatpickrDate from "@/components/ui/FlatpickrDate.vue";
import { useDate } from "@/composables/useDate";
import {
  createEmptyManualPenjaminItem,
  createPenjaminItemFromSavedCard,
  type PenjaminKunjunganItemDraft,
  type PenjaminKunjunganMultiState,
} from "@/utils/pendaftaran-penjamin.util";
import {
  getJenisPenjaminBadgeClass,
  getOptionLabel,
  JENIS_PENJAMIN_OPTIONS,
  JenisPenjamin,
  type KelasOptionItem,
  type PasienPenjaminItem,
  type PenjaminOptionItem,
} from "@/types/simrs";

const MAX_PENJAMIN_PER_KUNJUNGAN = 10;

const props = withDefaults(
  defineProps<{
    state: PenjaminKunjunganMultiState;
    savedPenjaminList: PasienPenjaminItem[];
    penjaminOptions: PenjaminOptionItem[];
    kelasOptions: KelasOptionItem[];
    errors: Record<string, string | undefined>;
    sectionTitle?: string;
  }>(),
  {
    sectionTitle: "2. Cara Bayar / Penjamin Kunjungan",
  },
);

const emit = defineEmits<{
  (e: "clear-error", key: string): void;
}>();

const { formatDate } = useDate();

const activeSavedCards = computed(() =>
  props.savedPenjaminList.filter((item) => item.status !== "N"),
);

const nonUmumPenjaminOptions = computed(() =>
  props.penjaminOptions
    .filter((p) => p.jenisPenjamin !== JenisPenjamin.UMUM)
    .map((p) => ({
      id: p.id,
      displayLabel: `${p.kode} — ${p.nama}`,
      raw: p,
    })),
);

const kelasSelectOptions = computed(() =>
  props.kelasOptions.map((k) => ({
    id: k.id,
    displayLabel: `${k.kode} — ${k.nama}`,
  })),
);

const selectedSavedIndexMap = computed(() => {
  const map = new Map<number, number>();
  props.state.items.forEach((item, idx) => {
    if (item.sourceMode === "saved" && item.pasienPenjaminId) {
      map.set(item.pasienPenjaminId, idx);
    }
  });
  return map;
});

const getMasterPenjamin = (
  penjaminId: number | undefined,
): PenjaminOptionItem | null =>
  props.penjaminOptions.find((p) => p.id === Number(penjaminId)) ?? null;

const getSavedCardById = (
  pasienPenjaminId: number | undefined,
): PasienPenjaminItem | null =>
  activeSavedCards.value.find((c) => c.id === Number(pasienPenjaminId)) ?? null;

const clearAllPenjaminErrors = () => {
  emit("clear-error", "penjaminGlobal");
  for (let i = 0; i < MAX_PENJAMIN_PER_KUNJUNGAN; i += 1) {
    emit("clear-error", `penjamin.${i}.penjaminId`);
    emit("clear-error", `penjamin.${i}.noKartu`);
  }
};

const clearItemErrors = (index: number) => {
  emit("clear-error", "penjaminGlobal");
  emit("clear-error", `penjamin.${index}.penjaminId`);
  emit("clear-error", `penjamin.${index}.noKartu`);
};

const switchToUmum = () => {
  props.state.paymentType = "umum";
  clearAllPenjaminErrors();
};

const switchToAsuransi = () => {
  props.state.paymentType = "asuransi";
  clearAllPenjaminErrors();
  if (props.state.items.length === 0) {
    if (activeSavedCards.value.length > 0) {
      const primary =
        activeSavedCards.value.find((c) => c.isUtama) ??
        activeSavedCards.value[0]!;
      props.state.items.push(createPenjaminItemFromSavedCard(primary));
    } else {
      props.state.items.push(createEmptyManualPenjaminItem());
    }
  }
};

const isManualDraftUntouched = (item: PenjaminKunjunganItemDraft): boolean =>
  item.sourceMode === "manual" &&
  !item.penjaminId &&
  !item.noKartu.trim() &&
  !item.noSep.trim() &&
  !item.noRujukan.trim();

const bindSavedCardToItem = (index: number, card: PasienPenjaminItem) => {
  const target = props.state.items[index];
  if (!target) return;
  target.sourceMode = "saved";
  target.pasienPenjaminId = card.id;
  target.penjaminId = card.penjaminId;
  target.jenisPenjamin = card.penjamin?.jenisPenjamin ?? JenisPenjamin.BPJS;
  target.noKartu = card.noKartu || "";
  target.kelasHakId = card.kelasHakId ?? undefined;
  target.faskesPerujuk = card.faskesPerujuk || "";
  target.berlakuSampai = card.berlakuSampai
    ? String(card.berlakuSampai).slice(0, 10)
    : "";
  target.simpanKeProfilPasien = false;
  clearItemErrors(index);
};

const handleQuickPickSavedCard = (card: PasienPenjaminItem) => {
  props.state.paymentType = "asuransi";
  const existingIdx = selectedSavedIndexMap.value.get(card.id);
  if (existingIdx !== undefined) {
    // Jika sudah ada & >1 item & user klik ulang pada kartu sekunder -> promosikan/fokuskan; tidak menghapus mendadak
    return;
  }

  const untouchedManualIdx = props.state.items.findIndex(isManualDraftUntouched);
  if (untouchedManualIdx >= 0) {
    bindSavedCardToItem(untouchedManualIdx, card);
    return;
  }

  if (props.state.items.length >= MAX_PENJAMIN_PER_KUNJUNGAN) return;
  props.state.items.push(createPenjaminItemFromSavedCard(card));
  clearAllPenjaminErrors();
};

const getUnusedSavedCard = (
  excludeIndex?: number,
): PasienPenjaminItem | undefined => {
  const usedIds = new Set<number>();
  props.state.items.forEach((item, idx) => {
    if (idx !== excludeIndex && item.sourceMode === "saved" && item.pasienPenjaminId) {
      usedIds.add(item.pasienPenjaminId);
    }
  });
  return activeSavedCards.value.find((c) => !usedIds.has(c.id));
};

const switchItemSourceMode = (index: number, mode: "saved" | "manual") => {
  const target = props.state.items[index];
  if (!target) return;
  clearItemErrors(index);

  if (mode === "saved") {
    const candidate = getUnusedSavedCard(index);
    if (candidate) {
      bindSavedCardToItem(index, candidate);
    } else {
      target.sourceMode = "saved";
      target.pasienPenjaminId = undefined;
    }
    return;
  }

  target.sourceMode = "manual";
  target.pasienPenjaminId = undefined;
  target.penjaminId = undefined;
  target.jenisPenjamin = JenisPenjamin.BPJS;
  target.noKartu = "";
  target.kelasHakId = undefined;
  target.faskesPerujuk = "";
  target.berlakuSampai = "";
  target.simpanKeProfilPasien = true;
};

const handleMasterPenjaminChange = (
  index: number,
  val: string | number | null | undefined,
) => {
  clearItemErrors(index);
  const item = props.state.items[index];
  if (!item) return;
  const numericVal = val === null || val === undefined || val === "" ? undefined : Number(val);
  const match = getMasterPenjamin(numericVal);
  if (match) {
    item.jenisPenjamin = match.jenisPenjamin;
  }
};

const handleSavedCardSelectChange = (index: number, event: Event) => {
  const selectEl = event.target as HTMLSelectElement;
  const cardId = Number(selectEl.value);
  const card = getSavedCardById(cardId);
  if (card) {
    bindSavedCardToItem(index, card);
  }
};

const addNewPenjaminRow = () => {
  if (props.state.items.length >= MAX_PENJAMIN_PER_KUNJUNGAN) return;
  const nextUnusedCard = getUnusedSavedCard();
  if (nextUnusedCard) {
    props.state.items.push(createPenjaminItemFromSavedCard(nextUnusedCard));
  } else {
    props.state.items.push(createEmptyManualPenjaminItem());
  }
  clearAllPenjaminErrors();
};

const removePenjaminRow = (index: number) => {
  if (props.state.items.length <= 1) return;
  props.state.items.splice(index, 1);
  clearAllPenjaminErrors();
};

const makePrimary = (index: number) => {
  if (index <= 0 || index >= props.state.items.length) return;
  const picked = props.state.items.splice(index, 1)[0];
  if (picked) {
    props.state.items.unshift(picked);
  }
  clearAllPenjaminErrors();
};

const moveItem = (index: number, direction: -1 | 1) => {
  const targetIdx = index + direction;
  if (targetIdx < 0 || targetIdx >= props.state.items.length) return;
  const current = props.state.items[index];
  const neighbor = props.state.items[targetIdx];
  if (!current || !neighbor) return;
  props.state.items.splice(index, 1, neighbor);
  props.state.items.splice(targetIdx, 1, current);
  clearAllPenjaminErrors();
};
</script>

<template>
  <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
    <!-- HEADER + TOGGLE UMUM VS ASURANSI/COB -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-content/10">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <CreditCard class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-base-content">
            {{ sectionTitle }}
          </h2>
          <p class="text-[11px] text-base-content/60">
            Pilih Umum atau daftarkan 1+ asuransi / penjamin (mendukung skema COB)
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="btn btn-xs sm:btn-sm rounded-xl font-bold"
          :class="
            state.paymentType === 'umum'
              ? 'btn-primary shadow-xs'
              : 'btn-ghost border border-base-content/15'
          "
          @click="switchToUmum"
        >
          Umum / Pribadi (Tunai)
        </button>
        <button
          type="button"
          class="btn btn-xs sm:btn-sm rounded-xl font-bold gap-1.5"
          :class="
            state.paymentType === 'asuransi'
              ? 'btn-primary shadow-xs'
              : 'btn-ghost border border-base-content/15'
          "
          @click="switchToAsuransi"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Asuransi / COB</span>
          <span
            v-if="state.paymentType === 'asuransi' && state.items.length > 0"
            class="badge badge-xs bg-base-100/25 border-0 text-current font-mono"
          >
            {{ state.items.length }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="errors.penjaminGlobal"
      class="alert alert-error py-2.5 px-3 rounded-xl text-xs font-semibold"
    >
      {{ errors.penjaminGlobal }}
    </div>

    <!-- MODE UMUM -->
    <div
      v-if="state.paymentType === 'umum'"
      class="p-3.5 rounded-xl bg-base-200/40 border border-base-content/10 text-xs text-base-content/80 flex items-center justify-between gap-2 flex-wrap"
    >
      <span>
        Pasien didaftarkan dengan cara bayar <strong>Umum / Pribadi (Tunai)</strong> tanpa klaim asuransi.
      </span>
      <span class="badge badge-sm badge-ghost font-bold">UMUM</span>
    </div>

    <!-- MODE ASURANSI / MULTI-PENJAMIN (COB) -->
    <div v-else class="space-y-4">
      <!-- Quick Pick Kartu Tersimpan Pasien -->
      <div
        v-if="activeSavedCards.length > 0"
        class="p-3 rounded-xl bg-base-200/35 border border-base-content/10 space-y-2"
      >
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-[11px] font-bold uppercase tracking-wider text-base-content/70">
            Kartu Terdaftar di Profil Pasien ({{ activeSavedCards.length }}) — Klik untuk Menambahkan
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <button
            v-for="card in activeSavedCards"
            :key="card.id"
            type="button"
            class="text-left p-2.5 rounded-xl border transition space-y-1"
            :class="
              selectedSavedIndexMap.has(card.id)
                ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/20 cursor-default'
                : 'bg-base-100 border-base-content/10 hover:border-primary/40 hover:bg-primary/5'
            "
            @click="handleQuickPickSavedCard(card)"
          >
            <div class="flex items-center justify-between gap-1.5">
              <span
                class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                :class="getJenisPenjaminBadgeClass(card.penjamin?.jenisPenjamin)"
              >
                {{ getOptionLabel(JENIS_PENJAMIN_OPTIONS, card.penjamin?.jenisPenjamin) }}
              </span>
              <span
                v-if="selectedSavedIndexMap.has(card.id)"
                class="inline-flex items-center gap-1 text-[10px] font-extrabold text-primary"
              >
                <CheckCircle2 class="w-3.5 h-3.5" />
                Terpasang #{{ selectedSavedIndexMap.get(card.id)! + 1 }}
              </span>
              <span
                v-else-if="card.isUtama"
                class="text-[10px] font-semibold text-base-content/55"
              >
                Utama Profil
              </span>
            </div>
            <div class="font-bold text-xs text-base-content truncate">
              {{ card.penjamin?.nama || "-" }}
            </div>
            <div class="text-[11px] text-base-content/65 font-mono truncate">
              {{ card.noKartu || "Tanpa No. Kartu" }}
              <span v-if="card.kelasHak"> • {{ card.kelasHak.nama }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- DAFTAR PENJAMIN KUNJUNGAN -->
      <div class="space-y-3">
        <div
          v-for="(item, idx) in state.items"
          :key="item.localKey"
          class="rounded-2xl border p-3.5 sm:p-4 space-y-3 transition"
          :class="
            idx === 0
              ? 'bg-primary/[0.03] border-primary/30'
              : 'bg-base-200/25 border-base-content/10'
          "
        >
          <!-- Bar Judul & Kontrol Urutan Per Item -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-base-content/10">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="text-[11px] font-extrabold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1"
                :class="
                  idx === 0
                    ? 'bg-primary text-primary-content border-primary'
                    : 'bg-base-100 text-base-content border-base-content/20'
                "
              >
                <Star v-if="idx === 0" class="w-3 h-3" />
                <span>#{{ idx + 1 }} {{ idx === 0 ? "Penjamin Utama" : "Sekunder (COB)" }}</span>
              </span>
              <span v-if="idx === 0" class="text-[11px] text-base-content/60">
                Menentukan kuota JKN/Non-JKN jadwal praktik &amp; penagihan awal
              </span>

              <div v-if="activeSavedCards.length > 0" class="flex items-center gap-1 ml-0 sm:ml-2">
                <button
                  type="button"
                  class="btn btn-xs rounded-lg font-semibold"
                  :class="
                    item.sourceMode === 'saved'
                      ? 'btn-secondary btn-outline'
                      : 'btn-ghost text-base-content/60'
                  "
                  @click="switchItemSourceMode(idx, 'saved')"
                >
                  Kartu Tersimpan
                </button>
                <button
                  type="button"
                  class="btn btn-xs rounded-lg font-semibold"
                  :class="
                    item.sourceMode === 'manual'
                      ? 'btn-secondary btn-outline'
                      : 'btn-ghost text-base-content/60'
                  "
                  @click="switchItemSourceMode(idx, 'manual')"
                >
                  Input Penjamin Baru
                </button>
              </div>
            </div>

            <div class="flex items-center gap-1 self-end sm:self-center">
              <button
                v-if="idx > 0"
                type="button"
                class="btn btn-xs btn-ghost rounded-lg text-primary font-bold"
                title="Jadikan sebagai penjamin utama (#1)"
                @click="makePrimary(idx)"
              >
                Jadikan Utama
              </button>
              <button
                v-if="state.items.length > 1 && idx > 0"
                type="button"
                class="btn btn-xs btn-square btn-ghost rounded-lg"
                title="Geser ke atas"
                aria-label="Geser penjamin ke atas"
                @click="moveItem(idx, -1)"
              >
                <ArrowUp class="w-3.5 h-3.5" />
              </button>
              <button
                v-if="state.items.length > 1 && idx < state.items.length - 1"
                type="button"
                class="btn btn-xs btn-square btn-ghost rounded-lg"
                title="Geser ke bawah"
                aria-label="Geser penjamin ke bawah"
                @click="moveItem(idx, 1)"
              >
                <ArrowDown class="w-3.5 h-3.5" />
              </button>
              <button
                v-if="state.items.length > 1"
                type="button"
                class="btn btn-xs btn-ghost text-error rounded-lg gap-1"
                title="Hapus penjamin ini"
                @click="removePenjaminRow(idx)"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Hapus</span>
              </button>
            </div>
          </div>

          <!-- BODY: KARTU TERSIMPAN -->
          <div v-if="item.sourceMode === 'saved'" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div class="sm:col-span-2 lg:col-span-2">
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Pilih Kartu Penjamin Pasien <span class="text-error">*</span>
                </label>
                <select
                  :value="item.pasienPenjaminId ?? ''"
                  class="select select-bordered w-full rounded-xl h-11 text-sm"
                  :class="{ 'border-error': errors[`penjamin.${idx}.penjaminId`] }"
                  @change="handleSavedCardSelectChange(idx, $event)"
                >
                  <option value="" disabled>Pilih kartu penjamin terdaftar...</option>
                  <option
                    v-for="card in activeSavedCards"
                    :key="card.id"
                    :value="card.id"
                    :disabled="
                      selectedSavedIndexMap.has(card.id) &&
                      selectedSavedIndexMap.get(card.id) !== idx
                    "
                  >
                    {{ card.penjamin?.nama || "-" }} — {{ card.noKartu || "Tanpa No. Kartu" }}
                    {{ card.kelasHak ? `(${card.kelasHak.nama})` : "" }}
                    {{
                      selectedSavedIndexMap.has(card.id) &&
                      selectedSavedIndexMap.get(card.id) !== idx
                        ? " [Sudah dipilih]"
                        : ""
                    }}
                  </option>
                </select>
                <span
                  v-if="errors[`penjamin.${idx}.penjaminId`]"
                  class="text-xs text-error font-semibold mt-1 block"
                >
                  {{ errors[`penjamin.${idx}.penjaminId`] }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                  Kelas Hak Rawat
                </label>
                <Select2
                  v-model="item.kelasHakId"
                  :options="kelasSelectOptions"
                  label-key="displayLabel"
                  value-key="id"
                  placeholder="Sesuai kartu..."
                />
              </div>
            </div>

            <div
              v-if="getSavedCardById(item.pasienPenjaminId)"
              class="p-2.5 rounded-xl bg-base-100 border border-base-content/10 text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1 text-base-content/75"
            >
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded border"
                :class="
                  getJenisPenjaminBadgeClass(
                    getSavedCardById(item.pasienPenjaminId)?.penjamin?.jenisPenjamin,
                  )
                "
              >
                {{
                  getOptionLabel(
                    JENIS_PENJAMIN_OPTIONS,
                    getSavedCardById(item.pasienPenjaminId)?.penjamin?.jenisPenjamin,
                  )
                }}
              </span>
              <span>
                No. Kartu:
                <strong class="font-mono text-base-content">
                  {{ getSavedCardById(item.pasienPenjaminId)?.noKartu || "-" }}
                </strong>
              </span>
              <span v-if="getSavedCardById(item.pasienPenjaminId)?.faskesPerujuk">
                Faskes:
                <strong class="text-base-content">
                  {{ getSavedCardById(item.pasienPenjaminId)?.faskesPerujuk }}
                </strong>
              </span>
              <span v-if="getSavedCardById(item.pasienPenjaminId)?.berlakuSampai">
                Berlaku s.d.
                <strong class="text-base-content">
                  {{ formatDate(getSavedCardById(item.pasienPenjaminId)?.berlakuSampai) }}
                </strong>
              </span>
            </div>
          </div>

          <!-- BODY: INPUT PENJAMIN BARU / MANUAL -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div class="sm:col-span-2 lg:col-span-1">
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Master Penjamin <span class="text-error">*</span>
              </label>
              <Select2
                v-model="item.penjaminId"
                :options="nonUmumPenjaminOptions"
                label-key="displayLabel"
                value-key="id"
                placeholder="Pilih penjamin..."
                :error="Boolean(errors[`penjamin.${idx}.penjaminId`])"
                @change="(val) => handleMasterPenjaminChange(idx, val)"
              />
              <span
                v-if="errors[`penjamin.${idx}.penjaminId`]"
                class="text-xs text-error font-semibold mt-1 block"
              >
                {{ errors[`penjamin.${idx}.penjaminId`] }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Nomor Kartu / Polis
                <span v-if="getMasterPenjamin(item.penjaminId)?.butuhNoKartu" class="text-error">*</span>
              </label>
              <input
                v-model="item.noKartu"
                type="text"
                maxlength="50"
                placeholder="Contoh: 0001234567890"
                class="input input-bordered w-full rounded-xl h-11 text-sm font-mono"
                :class="{ 'border-error': errors[`penjamin.${idx}.noKartu`] }"
                @input="clearItemErrors(idx)"
              />
              <span
                v-if="errors[`penjamin.${idx}.noKartu`]"
                class="text-xs text-error font-semibold mt-1 block"
              >
                {{ errors[`penjamin.${idx}.noKartu`] }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Kelas Hak Rawat
              </label>
              <Select2
                v-model="item.kelasHakId"
                :options="kelasSelectOptions"
                label-key="displayLabel"
                value-key="id"
                placeholder="Pilih kelas hak..."
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Faskes Perujuk
              </label>
              <input
                v-model="item.faskesPerujuk"
                type="text"
                maxlength="120"
                placeholder="Contoh: Puskesmas Coblong"
                class="input input-bordered w-full rounded-xl h-11 text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Masa Berlaku Kartu
              </label>
              <FlatpickrDate
                v-model="item.berlakuSampai"
                placeholder="Pilih tanggal berlaku..."
              />
            </div>

            <div class="flex items-end pb-2">
              <label class="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  v-model="item.simpanKeProfilPasien"
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-primary"
                />
                Simpan kartu ke profil pasien
              </label>
            </div>
          </div>

          <!-- SEP, RUJUKAN & KETERANGAN COB PER PENJAMIN -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-base-content/10">
            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                No. SEP / Surat Jaminan (Opsional)
              </label>
              <input
                v-model="item.noSep"
                type="text"
                maxlength="50"
                placeholder="Contoh: 0101R0011126V000001"
                class="input input-bordered w-full rounded-xl h-10 text-xs font-mono"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                No. Rujukan FKTP / RS (Opsional)
              </label>
              <input
                v-model="item.noRujukan"
                type="text"
                maxlength="50"
                placeholder="Contoh: 010101011126P000001"
                class="input input-bordered w-full rounded-xl h-10 text-xs font-mono"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-base-content/80 mb-1.5">
                Keterangan / Catatan COB (Opsional)
              </label>
              <input
                v-model="item.keterangan"
                type="text"
                maxlength="255"
                placeholder="Contoh: Menutup selisih kelas VIP"
                class="input input-bordered w-full rounded-xl h-10 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER TAMBAH PENJAMIN COB -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div
          v-if="state.items.length > 1"
          class="flex items-center gap-2 text-[11px] text-base-content/65"
        >
          <Info class="w-4 h-4 text-primary shrink-0" />
          <span>
            Skema <strong>COB aktif ({{ state.items.length }} penjamin)</strong>: tagihan utama mengikuti urutan <strong>#1</strong>, selisihnya ditagihkan ke penjamin berikutnya.
          </span>
        </div>
        <span v-else class="text-[11px] text-base-content/55">
          Pasien menggunakan lebih dari satu asuransi (mis. BPJS + Asuransi Swasta)? Tambahkan penjamin COB di sebelah kanan.
        </span>

        <button
          type="button"
          class="btn btn-outline btn-primary btn-sm rounded-xl font-bold gap-1.5 shrink-0"
          :disabled="state.items.length >= MAX_PENJAMIN_PER_KUNJUNGAN"
          @click="addNewPenjaminRow"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah Penjamin Lain (COB)</span>
        </button>
      </div>
    </div>
  </div>
</template>
