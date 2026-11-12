/** Durable, conservative accounting for the user's 30 CNY / two-opening test authorization. */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import {
  audioSchema,
  videoAssetSchema,
} from '../../src/services/definition/project';

export enum CloudCallKind {
  Speech = 'speech',
  Detect = 'detect',
  Video = 'video',
}
export enum CloudCallState {
  Reserved = 'reserved',
  Submitted = 'submitted',
  Complete = 'complete',
  Failed = 'failed',
}
const callSchema = z.object({
  kind: z.enum(CloudCallKind),
  state: z.enum(CloudCallState),
  reserved_milli: z.number().int().nonnegative(),
  task_id: z
    .string()
    .regex(/^[a-zA-Z0-9-]{1,100}$/)
    .optional(),
  remote_url: z.string().optional(),
  audio: audioSchema.optional(),
  clip: videoAssetSchema.optional(),
  check_pass: z.boolean().optional(),
  actual_milli: z.number().nonnegative().optional(),
});
export type CloudCall = z.infer<typeof callSchema>;
const ledgerSchema = z.object({
  limit_milli: z.literal(30000),
  max_videos: z.literal(2),
  calls: z.record(z.string(), callSchema),
});
export type CloudLedger = z.infer<typeof ledgerSchema>;

/** Read and validate persisted reservations; failed/ambiguous requests retain their allowance. */
export function readCloudLedger(path: string): CloudLedger {
  return existsSync(path)
    ? ledgerSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
    : { limit_milli: 30000, max_videos: 2, calls: {} };
}

/** Save before network submission so process interruption cannot silently reset the spend guard. */
export function saveCloudLedger(path: string, ledger: CloudLedger) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(
    `${path}.tmp`,
    JSON.stringify(ledgerSchema.parse(ledger), null, 2),
    { mode: 0o600 },
  );
  renameSync(`${path}.tmp`, path);
}

/** Reserve an operation once; replay must reconcile its stored result rather than submit again. */
export function reserveCloudCall(
  path: string,
  key: string,
  kind: CloudCallKind,
  milli: number,
): CloudCall {
  if (!Number.isSafeInteger(milli) || milli <= 0)
    throw new Error('无效预算预留。');
  const ledger = readCloudLedger(path);
  if (ledger.calls[key])
    throw new Error('请求已预留；需恢复原任务，禁止重复提交。');
  if (
    kind === CloudCallKind.Video &&
    Object.values(ledger.calls).filter(
      (call) => call.kind === CloudCallKind.Video,
    ).length >= ledger.max_videos
  )
    throw new Error('已达到本轮最多两版人物开场的限制。');
  const total = Object.values(ledger.calls).reduce(
    (sum, call) => sum + call.reserved_milli,
    0,
  );
  if (total + milli > ledger.limit_milli)
    throw new Error('本次操作将超过已授权的30元测试预算，已停止。');
  const call: CloudCall = {
    kind,
    state: CloudCallState.Reserved,
    reserved_milli: milli,
  };
  ledger.calls[key] = call;
  saveCloudLedger(path, ledger);
  return call;
}

/** Persist only typed job metadata; credentials and full provider responses never enter the ledger. */
export function updateCloudCall(
  path: string,
  key: string,
  patch: Partial<CloudCall>,
) {
  const ledger = readCloudLedger(path);
  const previous = ledger.calls[key];
  if (!previous) throw new Error('预算记录不存在。');
  ledger.calls[key] = callSchema.parse({
    ...previous,
    ...patch,
    kind: previous.kind,
    reserved_milli: previous.reserved_milli,
  });
  saveCloudLedger(path, ledger);
  return ledger.calls[key];
}
