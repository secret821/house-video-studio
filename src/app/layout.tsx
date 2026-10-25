/** Shared document and global style entry for both local editors. */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'animal-island-ui/style';
import '../theme.css';

export const metadata: Metadata = {
  title: '房源视频工作室',
  description: '用真实房源照片制作带运镜、场景切换与单人解说的探盘视频。',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="m-0 bg-page">{children}</body>
    </html>
  );
}
