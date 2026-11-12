/** Shared document and global style entry for both local editors. */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';

import { StudioProvider } from '@/features/studio/shell/studio-provider';
import '../theme.css';

export const metadata: Metadata = {
  title: '房源视频工作室',
  description: '用真实房源照片制作带运镜、场景切换与单人解说的探盘视频。',
};

// Authenticated HTML must not be cached as a public static response.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="m-0 bg-page">
        <AntdRegistry layer>
          <StudioProvider>{children}</StudioProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
