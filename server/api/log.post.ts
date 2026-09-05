import { logger } from '../utils/logger';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const level = body?.level || 'info';
    const message = body?.message || 'Client Log';
    const meta = body?.meta || {};

    if (level === 'error') {
      logger.error(meta, message);
    } else if (level === 'warn') {
      logger.warn(meta, message);
    } else {
      logger.info(meta, message);
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err }, 'Gagal memproses client log endpoint');
    return { success: false, error: err?.message };
  }
});
