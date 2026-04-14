let timeoutMap = new Map<string, any>();

export const useToast = () => {
  const toasts = useState<any[]>("toasts", () => []);

  const showToast = (
    message: string,
    type: string = "success",
    duration: number = 3000
  ) => {
    const id = Date.now().toString();

    const newToast = {
      id,
      message,
      type,
      duration,
      paused: false,
      remaining: duration,
      _startTime: Date.now(),
    };

    toasts.value.push(newToast);
    startTimer(newToast);
  };

  const startTimer = (toast: any) => {
    clearTimeout(timeoutMap.get(toast.id));

    toast._startTime = Date.now();

    const timeout = setTimeout(() => {
      removeToast(toast.id);
    }, toast.remaining);

    timeoutMap.set(toast.id, timeout);
  };

  const pauseToast = (id: string) => {
    const toast = toasts.value.find((t) => t.id === id);
    if (!toast || toast.paused) return;

    const timeout = timeoutMap.get(id);
    if (timeout) clearTimeout(timeout);

    const elapsed = Date.now() - toast._startTime;

    toast.remaining = Math.max(0, toast.remaining - elapsed);
    toast.paused = true;
  };

  const resumeToast = (id: string) => {
    const toast = toasts.value.find((t) => t.id === id);
    if (!toast || !toast.paused) return;

    toast.paused = false;

    // kalau waktu sudah habis, langsung hapus
    if (toast.remaining <= 0) {
      removeToast(id);
      return;
    }

    startTimer(toast);
  };

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }

    const timeout = timeoutMap.get(id);
    if (timeout) clearTimeout(timeout);

    timeoutMap.delete(id);
  };

  return {
    toasts,
    showToast,
    removeToast,
    pauseToast,
    resumeToast,
  };
};