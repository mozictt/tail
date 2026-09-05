import pino from 'pino';
import path from 'path';
import fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Inisialisasi Pino Logger dengan pino-roll transport (Rotasi log harian terpusat)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-roll',
    options: {
      file: path.join(logDir, 'app-log'),
      frequency: 'daily', // Rotasi log harian (misal: app-log.2026-09-05.log)
      mkdir: true,
      extension: '.log',
    },
  },
});
