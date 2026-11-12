/** One heavy media operation uses the small server at a time; other accounts queue without sharing task ownership. */
type Waiter = {
  enter: () => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  abort: () => void;
};
function createMediaSlot() {
  const waiting: Array<Waiter> = [];
  let occupied = false;

  /** Cancellation removes only its waiting entry. Running work releases after its decoder and cleanup finish. */
  return function acquire(signal?: AbortSignal): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      const waiter: Waiter = {
        signal,
        reject,
        abort: () => {
          const index = waiting.indexOf(waiter);
          if (index >= 0) waiting.splice(index, 1);
          reject(signal?.reason);
        },
        enter: () => {
          signal?.removeEventListener('abort', waiter.abort);
          occupied = true;
          let released = false;
          resolve(() => {
            if (released) return;
            released = true;
            occupied = false;
            waiting.shift()?.enter();
          });
        },
      };
      if (!occupied) waiter.enter();
      else {
        waiting.push(waiter);
        signal?.addEventListener('abort', waiter.abort, { once: true });
      }
    });
  };
}
/** Heavy work stays exclusive; tiny FFprobe reads may run while another account renders. */
export const acquireMediaSlot = createMediaSlot();
export const acquireVideoProbeSlot = createMediaSlot();
