/** Replace only a previous local instance of this project after its port is found busy. */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

function listeningPids(port: number): Array<number> {
  let output: string;
  try {
    output = execFileSync(
      'lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp'],
      { encoding: 'utf8' },
    );
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 1)
      return [];
    throw error;
  }
  return [
    ...new Set(output.match(/^p\d+$/gm)?.map((line) => Number(line.slice(1)))),
  ].filter((pid): pid is number => Number.isSafeInteger(pid));
}

function isPreviousStudio(pid: number, root: string): boolean {
  const cwd = execFileSync(
    'lsof',
    ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'],
    {
      encoding: 'utf8',
    },
  ).match(/^n(.+)$/m)?.[1];
  const processInfo = execFileSync(
    'ps',
    ['-p', String(pid), '-o', 'uid=', '-o', 'command='],
    { encoding: 'utf8' },
  ).trim();
  const match = processInfo.match(
    /^(\d+)\s+(\S*\/)?node\s+--import\s+tsx\s+server\/index\.ts(?:\s+--production)?$/,
  );
  return (
    resolve(cwd ?? '/') === resolve(root) &&
    Boolean(match) &&
    Number(match?.[1]) === process.getuid?.()
  );
}

export function stopPreviousLocalStudio(
  port: number,
  root: string,
): Promise<void> {
  let pids: Array<number>;
  try {
    pids = listeningPids(port);
  } catch {
    return Promise.reject(
      new Error(`无法确认端口 ${port} 的占用进程，请手动检查。`),
    );
  }
  if (pids.length !== 1 || pids[0] === process.pid) {
    return Promise.reject(
      new Error(`端口 ${port} 的占用进程不唯一或已变化，请手动检查。`),
    );
  }
  const pid = pids[0];
  try {
    if (!isPreviousStudio(pid, root))
      throw new Error('占用进程并非本项目同一用户启动的工作室。');
    // Recheck the listener immediately before signaling so another process cannot be targeted after it exits.
    if (!listeningPids(port).includes(pid))
      throw new Error('端口占用进程已变化。');
    process.kill(pid, 'SIGTERM');
    // A previous shell may have suspended the server; resume it so SIGTERM can be handled.
    try {
      process.kill(pid, 'SIGCONT');
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ESRCH'
      ))
        throw error;
    }
    console.info(
      `端口 ${port} 被本项目旧服务占用，已停止进程 ${pid}，等待释放端口。`,
    );
  } catch (error) {
    return Promise.reject(
      new Error(
        `无法自动停止端口 ${port} 的占用进程：${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
  const deadline = Date.now() + 5_000;
  return new Promise((done, fail) => {
    const check = () => {
      try {
        if (!listeningPids(port).includes(pid)) return done();
      } catch (error) {
        return fail(error);
      }
      if (Date.now() >= deadline)
        return fail(
          new Error(`旧服务未在 5 秒内释放端口 ${port}，请手动检查。`),
        );
      setTimeout(check, 100);
    };
    check();
  });
}

/** Free the port before Next's dev lock is acquired by another copy of this app. */
export function prepareLocalStudioPort(
  port: number,
  root: string,
): Promise<void> {
  try {
    if (listeningPids(port).length === 0) return Promise.resolve();
  } catch (error) {
    // A host without lsof can still start when its port is free; EADDRINUSE remains guarded below.
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return Promise.resolve();
    return Promise.reject(error);
  }
  return stopPreviousLocalStudio(port, root);
}
