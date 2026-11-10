/**
 * Mengekstrak pesan error yang ramah pengguna dari respons NestJS ($fetch / AllExceptionsFilter).
 */
export function extractApiErrorMessage(err: any, fallback = "Terjadi kesalahan pada server"): string {
  const rawMessage = err?.data?.message ?? err?.response?._data?.message ?? err?.message;

  if (Array.isArray(rawMessage)) {
    const joined = rawMessage
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }

  if (typeof rawMessage === "string" && rawMessage.trim()) {
    return rawMessage.trim();
  }

  return fallback;
}

