/** An explicit public origin augments loopback trust without trusting forwarded headers or wildcard hosts. */
import { z } from 'zod';

export function getAccessPolicy(port: number, publicOrigin?: string) {
  const origins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ]);
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  if (publicOrigin) {
    if (!z.string().url().safeParse(publicOrigin).success)
      throw new Error('PUBLIC_ORIGIN必须是完整的http/https来源地址。');
    const address = new URL(publicOrigin);
    if (
      !['http:', 'https:'].includes(address.protocol) ||
      address.username ||
      address.password ||
      address.pathname !== '/' ||
      address.search ||
      address.hash
    )
      throw new Error(
        'PUBLIC_ORIGIN只允许http/https来源，不含路径、凭据、查询或片段。',
      );
    origins.add(address.origin);
    hosts.add(address.host);
  }
  return { origins, hosts };
}
