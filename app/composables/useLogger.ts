export const useLogger = () => {
  const sendLog = async (level: 'info' | 'warn' | 'error', message: string, meta?: any) => {
    // Print to browser console first
    if (level === 'error') {
      console.error(`[LOGGER:${level.toUpperCase()}] ${message}`, meta || '');
    } else if (level === 'warn') {
      console.warn(`[LOGGER:${level.toUpperCase()}] ${message}`, meta || '');
    } else {
      console.log(`[LOGGER:${level.toUpperCase()}] ${message}`, meta || '');
    }

    // Kirim secara asinkron ke endpoint Pino + pino-roll server
    try {
      await $fetch('/api/log', {
        method: 'POST',
        body: {
          level,
          message,
          meta: meta ? (typeof meta === 'object' ? meta : { detail: meta }) : {},
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : '',
        },
      });
    } catch (e) {
      // Fallback silent agar tidak memutus UX jika server offline
    }
  };

  return {
    info: (message: string, meta?: any) => sendLog('info', message, meta),
    warn: (message: string, meta?: any) => sendLog('warn', message, meta),
    error: (message: string, meta?: any) => sendLog('error', message, meta),
  };
};
