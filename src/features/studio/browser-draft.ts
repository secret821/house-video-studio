/** Read legacy JSON only when no server draft exists; never download or back up media in the browser. */
import { z } from 'zod';

import type { DraftKind } from '@/services/definition/project';

export function readLegacyBrowserDraft<T>(
  kind: DraftKind,
  schema: z.ZodType<T>,
  workspaceId: string,
) {
  try {
    const value = localStorage.getItem(
      `house-studio:draft:${workspaceId}:${kind}`,
    );
    if (!value) return { project: null, mediaExpired: false };
    const stored = z.object({ project: schema }).parse(JSON.parse(value));
    return { project: stored.project, mediaExpired: false };
  } catch {
    return {
      project: null,
      mediaExpired: false,
      mediaError: '无法读取旧浏览器草稿。服务器草稿可正常使用；请保留原文件。',
    };
  }
}
