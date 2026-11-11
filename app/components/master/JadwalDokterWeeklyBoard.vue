<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Building,
  CalendarDays,
  Clock,
  Eye,
  MapPin,
  Pencil,
  Users,
} from "lucide-vue-next";
import {
  formatNamaGelarDokter,
  getHariPraktikBadgeClass,
  getOptionLabel,
  getSesiPraktikBadgeClass,
  HariPraktik,
  SESI_PRAKTIK_OPTIONS,
  type JadwalDokterItem,
  type JadwalDokterWeeklyGroup,
} from "@/types/simrs";

const props = withDefaults(
  defineProps<{
    groups: JadwalDokterWeeklyGroup[];
    loading?: boolean;
    canManage?: boolean;
  }>(),
  {
    loading: false,
    canManage: false,
  },
);

const emit = defineEmits<{
  (e: "view", item: JadwalDokterItem): void;
  (e: "edit", item: JadwalDokterItem): void;
}>();

const selectedMobileDay = ref<HariPraktik>(HariPraktik.SENIN);

const totalAktifMingguan = computed(() =>
  props.groups.reduce((sum, g) => sum + Number(g.totalJadwal || 0), 0),
);

const activeMobileGroup = computed(() =>
  props.groups.find((g) => g.hari === selectedMobileDay.value) ?? props.groups[0],
);

watch(
  () => props.groups,
  (next) => {
    if (next.length === 0) return;
    const current = next.find((g) => g.hari === selectedMobileDay.value);
    if (!current || (current.items.length === 0 && totalAktifMingguan.value > 0)) {
      const firstNonEmpty = next.find((g) => g.items.length > 0);
      if (firstNonEmpty) selectedMobileDay.value = firstNonEmpty.hari;
    }
  },
  { immediate: true },
);

const getDokterName = (item: JadwalDokterItem) => {
  const d = item.dokter;
  if (!d) return "-";
  return (
    d.namaTampilan ||
    formatNamaGelarDokter(d.gelarDepan, d.penduduk?.namaLengkap, d.gelarBelakang) ||
    d.kodeDokter
  );
};
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-44 rounded-2xl bg-base-200/70 animate-pulse"></div>
    </div>

    <div
      v-else-if="totalAktifMingguan === 0"
      class="py-14 px-4 text-center bg-base-200/20 rounded-2xl border border-dashed border-base-content/15"
    >
      <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
        <CalendarDays class="w-8 h-8" />
      </div>
      <h3 class="font-bold text-base text-base-content mb-1">
        Tidak ada jadwal praktik aktif minggu ini
      </h3>
      <p class="text-xs sm:text-sm text-base-content/60 max-w-md mx-auto">
        Hanya jadwal dengan status <strong>Aktif</strong>, dokter aktif, dan unit aktif yang ditampilkan di rekap mingguan.
      </p>
    </div>

    <template v-else>
      <!-- Ringkasan Total per Hari -->
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span class="font-semibold text-base-content/65">
          Menampilkan <strong class="text-base-content">{{ totalAktifMingguan }}</strong> slot jadwal praktik aktif (Senin – Minggu)
        </span>
      </div>

      <!-- MOBILE VIEW: Pill Hari + Daftar Kartu -->
      <div class="md:hidden space-y-3">
        <div class="flex gap-1.5 overflow-x-auto pb-1">
          <button
            v-for="group in groups"
            :key="group.hari"
            type="button"
            class="px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition shrink-0"
            :class="
              selectedMobileDay === group.hari
                ? 'bg-primary text-primary-content border-primary shadow-xs'
                : 'bg-base-100 border-base-content/10 text-base-content/75'
            "
            @click="selectedMobileDay = group.hari"
          >
            <span>{{ group.label }}</span>
            <span
              class="px-1.5 py-0.2 rounded-md text-[10px]"
              :class="
                selectedMobileDay === group.hari
                  ? 'bg-primary-content/20 text-primary-content'
                  : 'bg-base-200 text-base-content/70'
              "
            >
              {{ group.totalJadwal }}
            </span>
          </button>
        </div>

        <div v-if="activeMobileGroup" class="space-y-2.5">
          <div
            v-if="activeMobileGroup.items.length === 0"
            class="p-6 text-center rounded-2xl bg-base-200/30 border border-dashed border-base-content/15 text-xs text-base-content/55"
          >
            Belum ada jadwal aktif pada hari {{ activeMobileGroup.label }}.
          </div>
          <div
            v-for="item in activeMobileGroup.items"
            :key="item.id"
            class="p-3.5 rounded-2xl bg-base-100 border border-base-content/10 shadow-xs space-y-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-mono text-xs font-extrabold text-primary inline-flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5" />
                  {{ item.jamMulai }} - {{ item.jamSelesai }}
                </span>
                <span
                  v-if="item.sesi"
                  class="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                  :class="getSesiPraktikBadgeClass(item.sesi)"
                >
                  {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, item.sesi) }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square rounded-lg text-info"
                  aria-label="Detail jadwal"
                  @click="emit('view', item)"
                >
                  <Eye class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  class="btn btn-ghost btn-xs btn-square rounded-lg text-warning"
                  aria-label="Edit jadwal"
                  @click="emit('edit', item)"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div class="font-bold text-sm text-base-content">{{ getDokterName(item) }}</div>
            <div class="text-xs text-base-content/70 flex flex-wrap gap-x-3 gap-y-1">
              <span class="inline-flex items-center gap-1">
                <Building class="w-3 h-3 text-base-content/45" />
                {{ item.unit?.nama || "-" }}
              </span>
              <span v-if="item.ruangan" class="inline-flex items-center gap-1">
                <MapPin class="w-3 h-3 text-base-content/45" />
                {{ item.ruangan }}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] pt-1.5 border-t border-base-content/10 text-base-content/65">
              <span>JKN: <strong class="text-emerald-600">{{ item.kuotaJkn }}</strong> • Non-JKN: <strong class="text-sky-600">{{ item.kuotaNonJkn }}</strong></span>
              <span class="font-bold text-base-content">Total: {{ item.kuotaTotal }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- DESKTOP / TABLET VIEW: Kartu per Hari -->
      <div class="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="group in groups"
          :key="group.hari"
          class="rounded-2xl border border-base-content/10 bg-base-200/25 flex flex-col overflow-hidden"
        >
          <div class="px-4 py-3 bg-base-100 border-b border-base-content/10 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span
                class="text-xs font-extrabold px-2.5 py-1 rounded-lg border"
                :class="getHariPraktikBadgeClass(group.hari)"
              >
                {{ group.label }}
              </span>
              <span class="text-[11px] font-mono text-base-content/45">
                HFIS #{{ group.kodeBpjs }}
              </span>
            </div>
            <span class="text-xs font-bold text-base-content/65">
              {{ group.totalJadwal }} jadwal
            </span>
          </div>

          <div class="p-3 space-y-2.5 flex-1">
            <div
              v-if="group.items.length === 0"
              class="h-full min-h-[96px] flex items-center justify-center text-xs text-base-content/45 italic"
            >
              Tidak ada praktik aktif
            </div>

            <div
              v-for="item in group.items"
              :key="item.id"
              class="p-3 rounded-xl bg-base-100 border border-base-content/10 hover:border-primary/35 transition space-y-2 shadow-2xs"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-mono text-xs font-extrabold text-primary inline-flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5" />
                    {{ item.jamMulai }} - {{ item.jamSelesai }}
                  </span>
                  <span
                    v-if="item.sesi"
                    class="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
                    :class="getSesiPraktikBadgeClass(item.sesi)"
                  >
                    {{ getOptionLabel(SESI_PRAKTIK_OPTIONS, item.sesi) }}
                  </span>
                </div>

                <div class="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square rounded-lg text-info"
                    title="Lihat Detail"
                    @click="emit('view', item)"
                  >
                    <Eye class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    class="btn btn-ghost btn-xs btn-square rounded-lg text-warning"
                    title="Edit Jadwal"
                    @click="emit('edit', item)"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <div class="font-bold text-xs text-base-content truncate" :title="getDokterName(item)">
                  {{ getDokterName(item) }}
                </div>
                <div class="text-[11px] text-base-content/65 truncate">
                  {{ item.unit?.nama || "-" }}
                  <span v-if="item.ruangan"> • {{ item.ruangan }}</span>
                </div>
              </div>

              <div class="flex items-center justify-between text-[11px] pt-1.5 border-t border-base-content/5 text-base-content/65">
                <span class="inline-flex items-center gap-1">
                  <Users class="w-3 h-3 text-base-content/40" />
                  JKN <strong class="text-emerald-600">{{ item.kuotaJkn }}</strong> / Non <strong class="text-sky-600">{{ item.kuotaNonJkn }}</strong>
                </span>
                <span class="font-bold text-base-content">Total {{ item.kuotaTotal }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

