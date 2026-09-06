import pinoPkg from 'pino';
import path from 'path';
import fs from 'fs';

const pino = typeof pinoPkg === 'function' ? pinoPkg : ((pinoPkg as any).default || pinoPkg);

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Inisialisasi Pino Logger dengan pino-roll transport (Rotasi log harian terpusat)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
    log: (object) => {
      // Pastikan status (SUCCESS / FAILED / PROCESS) tampil di bagian paling depan log
      const { status, ...rest } = object;
      return {
        status: status || 'INFO',
        ...rest,
      };
    },
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  transport: {
    target: 'pino-roll',
    options: {
      file: path.join(logDir, 'app-log'),
      frequency: 'daily', // Rotasi log harian
      dateFormat: 'YYYY-MM-DD', // Format nama file log berdasarkan tanggal (contoh: app-log.2026-09-06.log)
      mkdir: true,
      extension: '.log',
    },
  },
});
