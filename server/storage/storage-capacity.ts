/** Admission budgets are account-scoped; global reservations coordinate only shared disk space. */
import { lstatSync, readdirSync, statfsSync } from 'node:fs';
import { resolve } from 'node:path';

import { VIDEO_UPLOAD_MAX_BYTES } from '../../src/services/definition/video-upload';
import { HttpError } from '../media/media';
import {
  holdWorkspace,
  workspaceDirectory,
  workspaceState,
  TEMPORARY_MEDIA,
  workspaceStorageDirectories,
} from './workspace';

export const MIB = 1024 * 1024;
export const VIDEO_UPLOAD_BYTES = VIDEO_UPLOAD_MAX_BYTES;
let diskReserved = 0;
const accountBudget = () =>
  workspaceState('storage-budget', () => ({ reserved: 0 }));

function configuredBytes(name: string, fallback: number) {
  const value = process.env[name];
  if (value === undefined) return fallback * MIB;
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value) * MIB))
    throw new Error(`${name}必须是正整数MiB。`);
  return Number(value) * MIB;
}

/** Fail startup on invalid administrator settings, rather than silently disabling protection. */
export function storageLimits() {
  return {
    accountBytes: configuredBytes('STUDIO_WORKSPACE_LIMIT_MIB', 5120),
    diskFreeBytes: configuredBytes('STUDIO_MIN_DISK_FREE_MIB', 1024),
  };
}

/** Never follow a symlink out of an account. Logical bytes deliberately count hard links conservatively. */
export function directoryBytes(directory: string): number {
  const entry = lstatSync(directory);
  if (entry.isSymbolicLink()) return entry.size;
  if (!entry.isDirectory()) return entry.size;
  return readdirSync(directory).reduce(
    (sum, name) => sum + directoryBytes(resolve(directory, name)),
    0,
  );
}

/** Reserve before accepting bytes or queuing work; release only after all output/cleanup has settled. */
export function reserveStorage(bytes: number): () => void {
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw new Error('无效存储预算。');
  const limits = storageLimits();
  const root = workspaceDirectory();
  const account = accountBudget();
  const disk = statfsSync(root);
  if (
    Number(disk.bavail) * Number(disk.bsize) - diskReserved - bytes <
    limits.diskFreeBytes
  )
    throw new HttpError(
      507,
      '服务器磁盘空间不足，已停止接收新任务；请稍后重试或联系管理员。',
    );
  const used = workspaceStorageDirectories().reduce(
    (sum, directory) => sum + directoryBytes(directory),
    0,
  );
  if (used + account.reserved + bytes > limits.accountBytes)
    throw new HttpError(
      507,
      TEMPORARY_MEDIA
        ? '当前账号文件已接近容量上限，请移除不再使用的素材或新建草稿后重试。'
        : '本机工作室文件已接近容量上限，请先下载并由管理员确认清理历史文件后重试。',
    );
  const releaseWorkspace = holdWorkspace();
  diskReserved += bytes;
  account.reserved += bytes;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    diskReserved -= bytes;
    account.reserved -= bytes;
    releaseWorkspace();
  };
}

/** Recheck after queueing: another service may have consumed the shared filesystem meanwhile. */
export function checkStorageReservations() {
  const disk = statfsSync(workspaceDirectory());
  if (
    Number(disk.bavail) * Number(disk.bsize) - diskReserved <
    storageLimits().diskFreeBytes
  )
    throw new HttpError(
      507,
      '服务器磁盘空间不足，任务未开始处理，请稍后重试。',
    );
}
