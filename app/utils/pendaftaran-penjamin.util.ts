import {
  JenisPenjamin,
  type CreatePendaftaranPenjaminItemPayload,
  type PasienPenjaminItem,
  type PendaftaranItem,
  type PendaftaranPenjaminItem,
  type PenjaminOptionItem,
} from "@/types/simrs";

export interface PenjaminKunjunganItemDraft {
  localKey: string;
  sourceMode: "saved" | "manual";
  pasienPenjaminId: number | undefined;
  jenisPenjamin: JenisPenjamin;
  penjaminId: number | undefined;
  noKartu: string;
  kelasHakId: number | undefined;
  faskesPerujuk: string;
  berlakuSampai: string;
  simpanKeProfilPasien: boolean;
  noSep: string;
  noRujukan: string;
  keterangan: string;
}

export interface PenjaminKunjunganMultiState {
  paymentType: "umum" | "asuransi";
  items: PenjaminKunjunganItemDraft[];
}

let draftCounter = 0;

const nextDraftKey = (): string => {
  draftCounter += 1;
  return `ppj-draft-${Date.now()}-${draftCounter}`;
};

export const createEmptyManualPenjaminItem = (
  defaultJenis: JenisPenjamin = JenisPenjamin.BPJS,
): PenjaminKunjunganItemDraft => ({
  localKey: nextDraftKey(),
  sourceMode: "manual",
  pasienPenjaminId: undefined,
  jenisPenjamin:
    defaultJenis === JenisPenjamin.UMUM ? JenisPenjamin.BPJS : defaultJenis,
  penjaminId: undefined,
  noKartu: "",
  kelasHakId: undefined,
  faskesPerujuk: "",
  berlakuSampai: "",
  simpanKeProfilPasien: true,
  noSep: "",
  noRujukan: "",
  keterangan: "",
});

export const createPenjaminItemFromSavedCard = (
  card: PasienPenjaminItem,
): PenjaminKunjunganItemDraft => ({
  localKey: nextDraftKey(),
  sourceMode: "saved",
  pasienPenjaminId: card.id,
  jenisPenjamin: card.penjamin?.jenisPenjamin ?? JenisPenjamin.BPJS,
  penjaminId: card.penjaminId,
  noKartu: card.noKartu || "",
  kelasHakId: card.kelasHakId ?? undefined,
  faskesPerujuk: card.faskesPerujuk || "",
  berlakuSampai: card.berlakuSampai ? String(card.berlakuSampai).slice(0, 10) : "",
  simpanKeProfilPasien: false,
  noSep: "",
  noRujukan: "",
  keterangan: "",
});

export const createDefaultPenjaminMultiState = (): PenjaminKunjunganMultiState => ({
  paymentType: "umum",
  items: [],
});

export const createPenjaminStateFromPasienCards = (
  cards: PasienPenjaminItem[],
): PenjaminKunjunganMultiState => {
  const activeCards = cards.filter((c) => c.status !== "N");
  if (activeCards.length === 0) {
    return createDefaultPenjaminMultiState();
  }
  const primary = activeCards.find((c) => c.isUtama) ?? activeCards[0]!;
  return {
    paymentType: "asuransi",
    items: [createPenjaminItemFromSavedCard(primary)],
  };
};

export const getVisitPenjaminList = (
  item: PendaftaranItem | null | undefined,
): PendaftaranPenjaminItem[] => {
  if (!item) return [];
  if (item.penjaminList && item.penjaminList.length > 0) {
    return [...item.penjaminList].sort((a, b) => a.urutan - b.urutan);
  }
  return [
    {
      id: item.id,
      pendaftaranId: item.id,
      urutan: 1,
      isUtama: true,
      jenisPenjamin: item.jenisPenjamin,
      penjaminId: item.penjaminId ?? null,
      penjamin: item.penjamin ?? null,
      pasienPenjaminId: item.pasienPenjaminId ?? null,
      pasienPenjamin: item.pasienPenjamin ?? null,
      namaPenjaminSnapshot: item.namaPenjaminSnapshot,
      noKartuSnapshot: item.noKartuSnapshot ?? null,
      kelasHakIdSnapshot: item.kelasHakIdSnapshot ?? null,
      kelasHakSnapshot: item.kelasHakSnapshot ?? null,
      noSep: item.noSep ?? null,
      noRujukan: item.noRujukan ?? null,
      keterangan: null,
    },
  ];
};

export const createPenjaminStateFromPendaftaran = (
  detail: PendaftaranItem,
  savedCards: PasienPenjaminItem[] = [],
): PenjaminKunjunganMultiState => {
  const list = getVisitPenjaminList(detail);
  if (list.length === 1 && list[0]!.jenisPenjamin === JenisPenjamin.UMUM) {
    return createDefaultPenjaminMultiState();
  }

  const savedCardMap = new Map(savedCards.map((c) => [c.id, c]));

  const items: PenjaminKunjunganItemDraft[] = list.map((ppj) => {
    const matchedSaved = ppj.pasienPenjaminId
      ? savedCardMap.get(ppj.pasienPenjaminId)
      : undefined;

    if (ppj.pasienPenjaminId && (matchedSaved || ppj.pasienPenjamin)) {
      const cardRef = matchedSaved ?? ppj.pasienPenjamin!;
      return {
        localKey: nextDraftKey(),
        sourceMode: "saved",
        pasienPenjaminId: ppj.pasienPenjaminId,
        jenisPenjamin:
          cardRef.penjamin?.jenisPenjamin ?? ppj.jenisPenjamin ?? JenisPenjamin.BPJS,
        penjaminId: ppj.penjaminId ?? cardRef.penjaminId,
        noKartu: ppj.noKartuSnapshot || cardRef.noKartu || "",
        kelasHakId: ppj.kelasHakIdSnapshot ?? cardRef.kelasHakId ?? undefined,
        faskesPerujuk: cardRef.faskesPerujuk || "",
        berlakuSampai: cardRef.berlakuSampai
          ? String(cardRef.berlakuSampai).slice(0, 10)
          : "",
        simpanKeProfilPasien: false,
        noSep: ppj.noSep || "",
        noRujukan: ppj.noRujukan || "",
        keterangan: ppj.keterangan || "",
      };
    }

    return {
      localKey: nextDraftKey(),
      sourceMode: "manual",
      pasienPenjaminId: undefined,
      jenisPenjamin:
        ppj.jenisPenjamin === JenisPenjamin.UMUM
          ? JenisPenjamin.BPJS
          : ppj.jenisPenjamin,
      penjaminId: ppj.penjaminId ?? undefined,
      noKartu: ppj.noKartuSnapshot || "",
      kelasHakId: ppj.kelasHakIdSnapshot ?? undefined,
      faskesPerujuk: "",
      berlakuSampai: "",
      simpanKeProfilPasien: true,
      noSep: ppj.noSep || "",
      noRujukan: ppj.noRujukan || "",
      keterangan: ppj.keterangan || "",
    };
  });

  return {
    paymentType: "asuransi",
    items: items.length > 0 ? items : [createEmptyManualPenjaminItem()],
  };
};

export const getEffectivePrimaryJenisPenjamin = (
  state: PenjaminKunjunganMultiState,
): JenisPenjamin => {
  if (state.paymentType === "umum" || state.items.length === 0) {
    return JenisPenjamin.UMUM;
  }
  return state.items[0]!.jenisPenjamin || JenisPenjamin.BPJS;
};

export const validatePenjaminMultiState = (
  state: PenjaminKunjunganMultiState,
  penjaminOptions: PenjaminOptionItem[],
  savedCards: PasienPenjaminItem[],
  next: Record<string, string | undefined>,
): void => {
  if (state.paymentType === "umum") return;

  if (state.items.length === 0) {
    next.penjaminGlobal =
      "Minimal pilih atau isi 1 penjamin asuransi, atau pilih mode Umum / Pribadi.";
    return;
  }

  const seenSavedIds = new Set<number>();
  const seenPenjaminKeys = new Set<string>();
  const savedCardMap = new Map(savedCards.map((c) => [c.id, c]));

  state.items.forEach((item, index) => {
    const penjaminFieldKey = `penjamin.${index}.penjaminId`;
    const kartuFieldKey = `penjamin.${index}.noKartu`;

    if (item.sourceMode === "saved") {
      if (!item.pasienPenjaminId) {
        next[penjaminFieldKey] = "Kartu penjamin tersimpan wajib dipilih";
        return;
      }
      if (seenSavedIds.has(item.pasienPenjaminId)) {
        next[penjaminFieldKey] =
          "Kartu penjamin yang sama tidak boleh dipilih ganda";
        return;
      }
      seenSavedIds.add(item.pasienPenjaminId);

      const savedCard = savedCardMap.get(item.pasienPenjaminId);
      const effectivePenjaminId = savedCard?.penjaminId ?? item.penjaminId;
      const effectiveNoKartu = (savedCard?.noKartu ?? item.noKartu ?? "")
        .trim()
        .toUpperCase();
      if (effectivePenjaminId) {
        const key = `${effectivePenjaminId}:${effectiveNoKartu}`;
        if (seenPenjaminKeys.has(key)) {
          next[penjaminFieldKey] =
            "Penjamin dan nomor kartu yang sama sudah ada di daftar";
          return;
        }
        seenPenjaminKeys.add(key);
      }
      return;
    }

    if (!item.penjaminId) {
      next[penjaminFieldKey] = "Master penjamin wajib dipilih";
      return;
    }

    const master = penjaminOptions.find(
      (p) => p.id === Number(item.penjaminId),
    );
    if (master?.jenisPenjamin === JenisPenjamin.UMUM) {
      next[penjaminFieldKey] =
        "Penjamin UMUM tidak dapat ditambahkan di mode asuransi/COB";
      return;
    }

    if (master?.butuhNoKartu && !item.noKartu.trim()) {
      next[kartuFieldKey] =
        `Penjamin "${master.nama}" wajib mengisi nomor kartu/polis`;
    }

    const key = `${item.penjaminId}:${item.noKartu.trim().toUpperCase()}`;
    if (seenPenjaminKeys.has(key)) {
      next[penjaminFieldKey] =
        "Penjamin dan nomor kartu yang sama tidak boleh didaftarkan ganda";
      return;
    }
    seenPenjaminKeys.add(key);
  });
};

export const buildPenjaminListPayload = (
  state: PenjaminKunjunganMultiState,
): CreatePendaftaranPenjaminItemPayload[] => {
  if (state.paymentType === "umum") {
    return [
      {
        urutan: 1,
        isUtama: true,
        jenisPenjamin: JenisPenjamin.UMUM,
      },
    ];
  }

  return state.items.map((item, idx) => {
    const urutan = idx + 1;
    const isUtama = idx === 0;

    if (item.sourceMode === "saved" && item.pasienPenjaminId) {
      return {
        urutan,
        isUtama,
        pasienPenjaminId: item.pasienPenjaminId,
        kelasHakId: item.kelasHakId,
        noSep: item.noSep.trim() || undefined,
        noRujukan: item.noRujukan.trim() || undefined,
        keterangan: item.keterangan.trim() || undefined,
      };
    }

    return {
      urutan,
      isUtama,
      jenisPenjamin: item.jenisPenjamin,
      penjaminId: item.penjaminId,
      noKartu: item.noKartu.trim() || undefined,
      kelasHakId: item.kelasHakId,
      faskesPerujuk: item.faskesPerujuk.trim() || undefined,
      berlakuSampai: item.berlakuSampai || undefined,
      simpanKeProfilPasien: item.simpanKeProfilPasien,
      noSep: item.noSep.trim() || undefined,
      noRujukan: item.noRujukan.trim() || undefined,
      keterangan: item.keterangan.trim() || undefined,
    };
  });
};
