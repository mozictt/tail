import { logger } from '../utils/logger';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const level = body?.level || 'info';
    const message = body?.message || 'Client Log';
    const meta = body?.meta || {};

    // Deteksi indikator status (SUCCESS / FAILED / PROCESS) dari pesan atau level log
    let status = meta?.status || 'INFO';
    if (level === 'error' || message.includes('[Upload Error]') || message.includes('[Upload Failed]')) {
      status = 'FAILED';
    } else if (message.includes('[Upload Success]')) {
      status = 'SUCCESS';
    } else if (message.includes('[Upload Process]')) {
      status = 'PROCESS';
    } else if (level === 'warn') {
      status = 'WARN';
    }

    const logPayload = {
      status: status.toUpperCase(),
      ...meta,
    };

    if (level === 'error' || status === 'FAILED') {
      logger.error(logPayload, message);
    } else if (level === 'warn') {
      logger.warn(logPayload, message);
    } else {
      logger.info(logPayload, message);
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ status: 'FAILED', err }, 'Gagal memproses client log endpoint');
    return { success: false, error: err?.message };
  }
});
