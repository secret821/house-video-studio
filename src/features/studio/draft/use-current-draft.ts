/** Save only metadata to the server; coalesce queued edits and keep failures visible until retry. */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useCurrentDraft<T>(options: {
  project: T;
  loaded: boolean;
  save: (project: T) => Promise<unknown>;
}) {
  const { project, loaded, save } = options;
  const [status, setStatus] = useState('正在查询当前草稿…');
  const pending = useRef(false);
  const mounted = useRef(false);
  const attempt = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      attempt.current += 1;
    };
  }, []);
  const persist = useCallback(
    (
      snapshot: T,
    ): Promise<{ saved: true } | { saved: false; error?: unknown }> => {
      const id = ++attempt.current;
      pending.current = true;
      setStatus('正在保存草稿数据…');
      const result = queue.current
        .then<{ saved: true } | { saved: false; error?: unknown }>(() => {
          if (id !== attempt.current) return { saved: false as const };
          return save(snapshot).then(() => {
            if (mounted.current && id === attempt.current) {
              pending.current = false;
              setStatus('当前草稿已保存到账号 · 仅保留这一版');
            }
            return { saved: true as const };
          });
        })
        .catch((error: unknown) => {
          if (mounted.current && id === attempt.current)
            setStatus(
              `草稿尚未保存：${error instanceof Error ? error.message : '无法连接服务器'}。请保留当前页面并重试保存。`,
            );
          return { saved: false as const, error };
        });
      queue.current = result;
      return result;
    },
    [save],
  );
  useEffect(() => {
    if (loaded) void persist(project);
  }, [project, loaded, persist]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (pending.current) event.preventDefault();
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  return {
    status,
    save: () =>
      persist(project).then((result) => {
        if (!result.saved)
          throw (
            result.error ?? new Error('草稿已发生新修改，请重试保存当前内容。')
          );
      }),
  };
}
