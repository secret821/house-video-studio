/** Observe server-owned rendering; backgrounding or unmounting cancels only status reads, never the task. */
import { useEffect } from 'react';

import { JobStatus } from '@/services/definition/project';

export function useBackgroundJob<T extends { id: string; status: JobStatus }>(
  job: T | null,
  options: {
    read: (id: string, signal?: AbortSignal) => Promise<T>;
    onChange: (job: T) => void;
    onError: (error: unknown) => void;
  },
) {
  const id = job?.id;
  const rendering = job?.status === JobStatus.Rendering;
  const { read, onChange, onError } = options;
  useEffect(() => {
    if (!rendering || !id) return;
    let active = true;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout>;
    /** A wake-up replaces a suspended status read. Its late response cannot regress newer progress. */
    function poll() {
      clearTimeout(timer);
      controller?.abort();
      const request = new AbortController();
      controller = request;
      read(id!, request.signal)
        .then((next) => {
          if (active && controller === request) onChange(next);
        })
        .catch((failure: unknown) => {
          if (active && !request.signal.aborted) onError(failure);
        })
        .finally(() => {
          if (active && controller === request) timer = setTimeout(poll, 2000);
        });
    }
    /** Mobile browsers pause timers; returning online/visible must not wait for the paused request. */
    function resume() {
      if (document.visibilityState === 'visible') poll();
    }
    poll();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', resume);
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('online', resume);
    };
  }, [id, rendering, read, onChange, onError]);
}
