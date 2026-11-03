/** Export the latest MySQL snapshots to a new private staging directory for an explicit rollback. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

import {
  DraftKind,
  projectDraftSchema,
} from '../src/services/definition/project';
import { videoEditDraftSchema } from '../src/services/definition/video-edit';
import { currentDraftSchema } from '../src/services/definition/current-draft';
import { closeDatabase, queryRows, verifyDatabase } from '../server/database';

interface ExportRow extends RowDataPacket {
  workspaceId: string;
  draftKind: string;
  projectText: string | null;
  revision: string;
}

const output = process.argv[2];
if (!output || process.argv.length !== 3) {
  console.error(
    '用法：STUDIO_DB_CONFIG=私有配置 node --import tsx scripts/export-mysql-drafts.ts <全新私有输出目录>',
  );
  process.exitCode = 1;
} else {
  verifyDatabase()
    .then(() =>
      queryRows<ExportRow>(
        'SELECT a.workspace_id AS workspaceId, d.draft_kind AS draftKind, d.project_text AS projectText, d.revision FROM studio_current_draft d JOIN studio_account a ON a.id = d.account_id WHERE a.isvoid = 0 AND d.isvoid = 0 ORDER BY a.id, d.draft_kind',
      ),
    )
    .then((rows) => {
      const snapshots = rows.map((row) => {
        const workspaceId = z
          .union([z.literal('legacy'), z.uuid()])
          .parse(row.workspaceId);
        const kind = z.enum(DraftKind).parse(row.draftKind);
        const raw: unknown = {
          project:
            row.projectText === null ? null : JSON.parse(row.projectText),
          revision: row.revision,
        };
        const draft =
          kind === DraftKind.Photo
            ? currentDraftSchema(projectDraftSchema).parse(raw)
            : currentDraftSchema(videoEditDraftSchema).parse(raw);
        return { workspaceId, kind, draft };
      });
      mkdirSync(output, { mode: 0o700 });
      snapshots.forEach(({ workspaceId, kind, draft }) => {
        const directory = resolve(output, workspaceId, 'drafts');
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        writeFileSync(
          resolve(directory, `${kind}.json`),
          JSON.stringify(draft),
          { flag: 'wx', mode: 0o600 },
        );
      });
      console.info(
        `已导出 ${snapshots.length} 份当前草稿到私有目录；未覆盖业务 data，请核对媒体路径后再回滚。`,
      );
    })
    .catch(() => {
      console.error(
        '导出失败：请检查数据库、目标目录权限和草稿数据；不要切换旧服务。',
      );
      process.exitCode = 1;
    })
    .finally(() => closeDatabase());
}
