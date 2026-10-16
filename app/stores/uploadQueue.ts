import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useCookie, useRuntimeConfig } from '#imports';

export interface UploadTaskItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'failed' | 'canceled';
  errorMsg?: string;
  albumId?: string;
  createdAt: number;
  xhr?: XMLHttpRequest | null;
}

export const useUploadQueueStore = defineStore('uploadQueue', () => {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  const tasks = ref<UploadTaskItem[]>([]);
  const isWidgetOpen = ref(false);
  const isWidgetVisible = ref(false);

  // Ukuran potongan (10 MB per chunk untuk aman melewati Cloudflare Tunnel 100MB limit)
  const CHUNK_SIZE_BYTES = 10 * 1024 * 1024;
  const CONCURRENCY_LIMIT = 2; // Maksimal 2 berkas diproses bersamaan

  /* =========================
     COMPUTED GETTERS
  ========================= */
  const activeTasks = computed(() => tasks.value.filter((t) => t.status === 'uploading'));
  const pendingTasks = computed(() => tasks.value.filter((t) => t.status === 'pending'));
  const failedTasks = computed(() => tasks.value.filter((t) => t.status === 'failed'));
  const successTasks = computed(() => tasks.value.filter((t) => t.status === 'success'));

  const activeCount = computed(() => activeTasks.value.length);
  const pendingCount = computed(() => pendingTasks.value.length);
  const failedCount = computed(() => failedTasks.value.length);
  const successCount = computed(() => successTasks.value.length);
  const totalCount = computed(() => tasks.value.length);

  const hasActiveUploads = computed(() => activeCount.value > 0 || pendingCount.value > 0);

  const overallProgress = computed(() => {
    if (tasks.value.length === 0) return 0;
    const sum = tasks.value.reduce((acc, t) => acc + t.progress, 0);
    return Math.round(sum / tasks.value.length);
  });

  /* =========================
     BEFOREUNLOAD LISTENER
  ========================= */
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', (e) => {
      if (hasActiveUploads.value) {
        e.preventDefault();
        e.returnValue = 'Proses unggah sedang berjalan di latar belakang. Yakin ingin keluar?';
        return e.returnValue;
      }
    });
  }

  /* =========================
     CHUNK UPLOAD WORKER
  ========================= */
  const uploadSingleChunk = (
    task: UploadTaskItem,
    chunkBlob: Blob,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (task.status === 'canceled') {
        reject(new Error('Unggahan dibatalkan'));
        return;
      }

      const xhr = new XMLHttpRequest();
      task.xhr = xhr;

      const formData = new FormData();
      formData.append('chunk', chunkBlob);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', String(chunkIndex));
      formData.append('totalChunks', String(totalChunks));
      formData.append('fileName', task.name);
      formData.append('totalSize', String(task.size));
      if (task.albumId) {
        formData.append('albumId', task.albumId);
      }

      const STALL_TIMEOUT_MS = 60000;
      const SERVER_PROCESS_TIMEOUT_MS = 90000;
      let timer: any = null;

      const resetTimer = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          xhr.abort();
          reject(new Error(`Timeout transmisi potongan ${chunkIndex + 1}/${totalChunks}`));
        }, STALL_TIMEOUT_MS);
      };

      const startWaitTimer = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          xhr.abort();
          reject(new Error(`Server/Cloudflare tidak merespons pada potongan ${chunkIndex + 1}/${totalChunks}`));
        }, SERVER_PROCESS_TIMEOUT_MS);
      };

      resetTimer();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          if (onProgress) onProgress(e.loaded, e.total);
          if (e.loaded >= e.total) {
            startWaitTimer();
          } else {
            resetTimer();
          }
        }
      });

      xhr.addEventListener('load', () => {
        if (timer) clearTimeout(timer);
        task.xhr = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            resolve(resp);
          } catch {
            resolve({ success: true });
          }
        } else {
          let msg = `Gagal pada potongan ${chunkIndex + 1} (HTTP ${xhr.status})`;
          try {
            const resp = JSON.parse(xhr.responseText);
            msg = resp?.message?.message || resp?.message || msg;
          } catch {
            if (xhr.status === 413) {
              msg = `Potongan ${chunkIndex + 1} ditolak Cloudflare (HTTP 413)`;
            } else if (xhr.status === 524) {
              msg = `Cloudflare Timeout pada potongan ${chunkIndex + 1} (HTTP 524)`;
            }
          }
          reject(new Error(msg));
        }
      });

      xhr.addEventListener('error', () => {
        if (timer) clearTimeout(timer);
        task.xhr = null;
        reject(new Error(`Koneksi terputus saat mengunggah potongan ${chunkIndex + 1}`));
      });

      xhr.addEventListener('abort', () => {
        if (timer) clearTimeout(timer);
        task.xhr = null;
        reject(new Error(`Unggahan potongan ${chunkIndex + 1} dibatalkan`));
      });

      const apiUrl = `${config.public.apiBase}/gallery/upload-chunk`;
      xhr.open('POST', apiUrl, true);

      if (auth.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
      }

      const targetTenantId = useCookie<string | null>('target_tenant_id').value;
      if (targetTenantId && auth.isMasterTenant) {
        xhr.setRequestHeader('X-Target-Tenant-Id', targetTenantId);
      }

      xhr.send(formData);
    });
  };

  /* =========================
     DIRECT BULK UPLOAD (KECIL)
  ========================= */
  const uploadDirectFile = (task: UploadTaskItem): Promise<boolean> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      task.xhr = xhr;

      const formData = new FormData();
      formData.append('files', task.file);
      if (task.albumId) {
        formData.append('albumId', task.albumId);
      }

      const STALL_TIMEOUT_MS = 60000;
      const SERVER_PROCESS_TIMEOUT_MS = 90000;
      let activeTimer: any = null;

      const resetStallTimer = () => {
        if (activeTimer) clearTimeout(activeTimer);
        activeTimer = setTimeout(() => {
          task.status = 'failed';
          task.errorMsg = 'Koneksi terhenti (Tidak ada transmisi data selama 60 detik)';
          xhr.abort();
          resolve(false);
        }, STALL_TIMEOUT_MS);
      };

      const startServerWaitTimer = () => {
        if (activeTimer) clearTimeout(activeTimer);
        activeTimer = setTimeout(() => {
          task.status = 'failed';
          task.errorMsg = 'Server/Cloudflare memerlukan waktu terlalu lama untuk merespons (Batas 90 detik)';
          xhr.abort();
          resolve(false);
        }, SERVER_PROCESS_TIMEOUT_MS);
      };

      resetStallTimer();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          task.progress = percent;
          if (percent >= 100) {
            startServerWaitTimer();
          } else {
            resetStallTimer();
          }
        }
      });

      xhr.addEventListener('load', () => {
        if (activeTimer) clearTimeout(activeTimer);
        task.xhr = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          task.status = 'success';
          task.progress = 100;
          resolve(true);
        } else {
          task.status = 'failed';
          try {
            const resp = JSON.parse(xhr.responseText);
            const message = resp?.message?.message || resp?.message || 'Gagal mengunggah file';
            task.errorMsg = Array.isArray(message) ? message.join(', ') : String(message);
          } catch {
            task.errorMsg = `Gagal mengunggah (HTTP ${xhr.status})`;
          }
          resolve(false);
        }
      });

      xhr.addEventListener('error', () => {
        if (activeTimer) clearTimeout(activeTimer);
        task.xhr = null;
        task.status = 'failed';
        task.errorMsg = 'Koneksi terputus ke server Cloudflare';
        resolve(false);
      });

      xhr.addEventListener('abort', () => {
        if (activeTimer) clearTimeout(activeTimer);
        task.xhr = null;
        if (task.status !== 'failed') {
          task.status = 'canceled';
          task.errorMsg = 'Unggahan dibatalkan';
        }
        resolve(false);
      });

      const apiUrl = `${config.public.apiBase}/gallery/upload-bulk`;
      xhr.open('POST', apiUrl, true);

      if (auth.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
      }

      const targetTenantId = useCookie<string | null>('target_tenant_id').value;
      if (targetTenantId && auth.isMasterTenant) {
        xhr.setRequestHeader('X-Target-Tenant-Id', targetTenantId);
      }

      xhr.send(formData);
    });
  };

  /* =========================
     EXECUTE INDIVIDUAL TASK
  ========================= */
  const executeTask = async (task: UploadTaskItem) => {
    task.status = 'uploading';
    task.progress = 0;
    task.errorMsg = undefined;

    // Jika file besar (> 10MB), gunakan Chunked Upload
    if (task.file.size > CHUNK_SIZE_BYTES) {
      const totalChunks = Math.ceil(task.file.size / CHUNK_SIZE_BYTES);
      const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (task.status === 'canceled') return;

        const start = chunkIndex * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, task.file.size);
        const chunkBlob = task.file.slice(start, end);

        let success = false;
        let lastErrorMsg = '';
        const MAX_RETRIES = 3;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          if (task.status === 'canceled') return;

          try {
            await uploadSingleChunk(
              task,
              chunkBlob,
              uploadId,
              chunkIndex,
              totalChunks,
              (loaded) => {
                const overallBytes = chunkIndex * CHUNK_SIZE_BYTES + loaded;
                task.progress = Math.min(99, Math.round((overallBytes * 100) / task.file.size));
              }
            );
            success = true;
            break;
          } catch (err: any) {
            lastErrorMsg = err?.message || 'Kesalahan transmisi data';
            if (attempt < MAX_RETRIES && task.status !== 'canceled') {
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
          }
        }

        if (!success) {
          if (task.status !== 'canceled') {
            task.status = 'failed';
            task.errorMsg = lastErrorMsg || `Gagal pada potongan ${chunkIndex + 1}/${totalChunks}`;
          }
          return;
        }
      }

      task.status = 'success';
      task.progress = 100;
    } else {
      // File kecil (<= 10MB)
      await uploadDirectFile(task);
    }
  };

  /* =========================
     QUEUE SCHEDULER
  ========================= */
  const triggerQueue = async () => {
    while (activeCount.value < CONCURRENCY_LIMIT) {
      const nextTask = tasks.value.find((t) => t.status === 'pending');
      if (!nextTask) break;

      // Jalankan tanpa memblokir loop agar konkurensi tercapai
      executeTask(nextTask).finally(() => {
        triggerQueue();
      });
    }
  };

  /* =========================
     PUBLIC ACTIONS
  ========================= */
  const addFilesToQueue = (files: File[], albumId?: string) => {
    isWidgetVisible.value = true;

    files.forEach((file) => {
      tasks.value.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending',
        albumId,
        createdAt: Date.now(),
        xhr: null,
      });
    });

    triggerQueue();
  };

  const cancelTask = (taskId: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.status = 'canceled';
      task.errorMsg = 'Unggahan dibatalkan oleh pengguna';
      if (task.xhr) {
        task.xhr.abort();
        task.xhr = null;
      }
      triggerQueue();
    }
  };

  const retryTask = (taskId: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task && (task.status === 'failed' || task.status === 'canceled')) {
      task.status = 'pending';
      task.progress = 0;
      task.errorMsg = undefined;
      triggerQueue();
    }
  };

  const clearCompleted = () => {
    tasks.value = tasks.value.filter((t) => t.status !== 'success');
    if (tasks.value.length === 0) {
      isWidgetVisible.value = false;
    }
  };

  const removeTask = (taskId: string) => {
    cancelTask(taskId);
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    if (tasks.value.length === 0) {
      isWidgetVisible.value = false;
    }
  };

  const toggleWidget = () => {
    isWidgetOpen.value = !isWidgetOpen.value;
  };

  const closeWidget = () => {
    isWidgetOpen.value = false;
  };

  return {
    tasks,
    isWidgetOpen,
    isWidgetVisible,
    activeTasks,
    pendingTasks,
    failedTasks,
    successTasks,
    activeCount,
    pendingCount,
    failedCount,
    successCount,
    totalCount,
    hasActiveUploads,
    overallProgress,
    addFilesToQueue,
    cancelTask,
    retryTask,
    clearCompleted,
    removeTask,
    toggleWidget,
    closeWidget,
  };
});
