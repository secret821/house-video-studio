/** Administrator-only maintenance. Live account media, models, releases and credentials are never targets. */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statfsSync,
  writeFileSync,
} from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DAY_MS = 24 * 60 * 60_000;
const MARKER = '.studio-disposable.json';
export interface MaintenanceEntry {
  path: string;
  bytes: number;
  eligible: boolean;
  reason: string;
}

/** A release's data may be linked to shared/data, but maintenance never follows that link. */
function assertPlainPath(root: string, path: string) {
  const rel = relative(root, path);
  if (!rel || rel.startsWith('..') || rel.includes('\\'))
    throw new Error('清理路径越界。');
  let current = root;
  rel.split('/').forEach((part) => {
    current = resolve(current, part);
    if (lstatSync(current).isSymbolicLink())
      throw new Error('跳过符号链接目录。');
  });
}

function measure(path: string): { bytes: number; modified: number } {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()))
    throw new Error('目录含符号链接或特殊文件，保留待人工检查。');
  const result = {
    bytes: stat.isFile() ? stat.size : 0,
    modified: Math.max(stat.mtimeMs, stat.ctimeMs),
  };
  if (!stat.isDirectory()) return result;
  return readdirSync(path).reduce((sum, name) => {
    const child = measure(resolve(path, name));
    return {
      bytes: sum.bytes + child.bytes,
      modified: Math.max(sum.modified, child.modified),
    };
  }, result);
}

/** Only dedicated acceptance directories can be marked; no broad age-based deletion under data. */
function candidates(root: string): string[] {
  const directories: string[] = [];
  ['artifacts', 'verification', 'data'].forEach((parent) => {
    const base = resolve(root, parent);
    if (
      !existsSync(base) ||
      lstatSync(base).isSymbolicLink() ||
      !lstatSync(base).isDirectory()
    )
      return;
    readdirSync(base, { withFileTypes: true }).forEach((entry) => {
      if (!entry.isDirectory()) return;
      if (parent === 'data' && !/(?:^|-)verification(?:-|$)/.test(entry.name))
        return;
      if (parent === 'verification') {
        const data = resolve(base, entry.name, 'data');
        if (
          existsSync(data) &&
          lstatSync(data).isDirectory() &&
          !lstatSync(data).isSymbolicLink()
        ) {
          directories.push(`${parent}/${entry.name}/data`);
          return;
        }
      }
      directories.push(`${parent}/${entry.name}`);
    });
  });
  return directories.sort();
}

export function inspectMaintenance(
  root: string,
  days = 7,
  now = Date.now(),
): MaintenanceEntry[] {
  if (!Number.isInteger(days) || days < 7) throw new Error('保留期至少7天。');
  return candidates(root).map((path) => {
    try {
      const directory = resolve(root, path);
      assertPlainPath(root, directory);
      const measured = measure(directory);
      const marker = resolve(directory, MARKER);
      if (!existsSync(marker))
        return {
          path,
          bytes: measured.bytes,
          eligible: false,
          reason: '未标记验收完成，仅盘点',
        };
      const completed = JSON.parse(readFileSync(marker, 'utf8')) as {
        version?: number;
        completedAt?: string;
      };
      if (
        completed.version !== 1 ||
        typeof completed.completedAt !== 'string' ||
        !Number.isFinite(Date.parse(completed.completedAt))
      )
        throw new Error('完成标记无效，保留待检查。');
      const lastUsed = Math.max(
        Date.parse(completed.completedAt),
        measured.modified,
      );
      const eligible = now - lastUsed >= days * DAY_MS;
      return {
        path,
        bytes: measured.bytes,
        eligible,
        reason: eligible ? '验收完成且超过保留期' : '仍在保留期或目录有新改动',
      };
    } catch (error) {
      return {
        path,
        bytes: 0,
        eligible: false,
        reason: error instanceof Error ? error.message : '检查失败，保留',
      };
    }
  });
}

/** Completion is an explicit administrator decision: a marked directory must never be reused by running tasks. */
export function markMaintenanceComplete(root: string, path: string) {
  if (!candidates(root).includes(path))
    throw new Error('只能标记独立验收目录，不能标记业务素材或运行目录。');
  const directory = resolve(root, path);
  assertPlainPath(root, directory);
  measure(directory);
  writeFileSync(
    resolve(directory, MARKER),
    JSON.stringify({ version: 1, completedAt: new Date().toISOString() }),
    { flag: 'wx', mode: 0o600 },
  );
}

/** Serialize sweepers; re-evaluate each directory immediately before removing it. */
export function applyMaintenance(root: string, days = 7, now = Date.now()) {
  const lock = resolve(root, '.studio-storage-maintenance.lock');
  mkdirSync(lock, { mode: 0o700 });
  const deleted: MaintenanceEntry[] = [];
  try {
    inspectMaintenance(root, days, now)
      .filter((entry) => entry.eligible)
      .forEach((entry) => {
        const current = inspectMaintenance(root, days, now).find(
          (candidate) => candidate.path === entry.path,
        );
        if (!current?.eligible) return;
        const path = resolve(root, entry.path);
        assertPlainPath(root, path);
        rmSync(path, { recursive: true });
        deleted.push(current);
      });
    return deleted;
  } finally {
    rmSync(lock, { recursive: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  let root = process.cwd();
  let days = 7;
  let apply = false;
  let complete: string | undefined;
  while (args.length) {
    const option = args.shift();
    if (option === '--apply') apply = true;
    else if (option === '--root' && args[0]) root = resolve(args.shift()!);
    else if (option === '--days' && args[0]) days = Number(args.shift());
    else if (option === '--complete' && args[0]) complete = args.shift();
    else throw new Error(`未知或不完整参数：${option}`);
  }
  if (apply && complete) throw new Error('标记完成与删除必须分开执行。');
  if (!Number.isInteger(days) || days < 7) throw new Error('保留期至少7天。');
  root = realpathSync(root);
  const packagePath = [
    resolve(root, 'package.json'),
    resolve(root, 'current/package.json'),
  ].find(existsSync);
  if (
    !packagePath ||
    JSON.parse(readFileSync(packagePath, 'utf8')).name !== 'house-video-studio'
  )
    throw new Error('目标不是房源工作室目录。');
  if (complete) markMaintenanceComplete(root, complete);
  const disk = statfsSync(root);
  const entries = inspectMaintenance(root, days);
  const report = {
    mode: apply ? 'apply' : 'preview',
    root,
    retentionDays: days,
    diskFreeBytes: Number(disk.bavail) * Number(disk.bsize),
    candidates: entries,
    eligibleBytes: entries
      .filter((entry) => entry.eligible)
      .reduce((sum, entry) => sum + entry.bytes, 0),
    deleted: apply ? applyMaintenance(root, days) : [],
  };
  console.info(JSON.stringify(report, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : '维护失败。');
    process.exitCode = 1;
  }
}
