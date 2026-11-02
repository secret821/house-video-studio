/** Administrator-only account addition: preserve salted credentials and assign a new empty workspace. */
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { loginInputSchema } from '../src/services/definition/auth';

const storedAccountSchema = z.object({
  username: z.string().min(1).max(64),
  workspaceId: z
    .union([z.literal('legacy'), z.string().uuid()])
    .default('legacy'),
  salt: z.string().regex(/^[a-f0-9]{32}$/),
  passwordHash: z.string().regex(/^[a-f0-9]{128}$/),
});
try {
  const [current, input, output] = process.argv.slice(2);
  if (!current || !input || !output) throw new Error('缺少私有文件路径。');
  const config = z
    .union([
      storedAccountSchema,
      z.object({ accounts: z.array(storedAccountSchema).min(1).max(19) }),
    ])
    .parse(JSON.parse(readFileSync(current, 'utf8')));
  const accounts = 'accounts' in config ? config.accounts : [config];
  const account = loginInputSchema.parse(
    JSON.parse(readFileSync(input, 'utf8')),
  );
  if (accounts.some((item) => item.username === account.username))
    throw new Error('账号已存在。');
  const salt = randomBytes(16).toString('hex');
  accounts.push({
    username: account.username,
    workspaceId: randomUUID(),
    salt,
    passwordHash: scryptSync(account.password, salt, 64).toString('hex'),
  });
  writeFileSync(output, JSON.stringify({ accounts }, null, 2), {
    mode: 0o600,
    flag: 'wx',
  });
  console.log(
    '新配置已写入；原账号数据归属保留，新账号从空工作室开始。请由管理员设置root:housevideo及0640后原子替换。',
  );
} catch {
  console.error(
    '添加账号失败，请检查私有输入、重复账号和输出文件权限；不会覆盖现有配置。',
  );
  process.exitCode = 1;
}
