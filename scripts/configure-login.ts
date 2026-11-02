/** Migrate an administrator-owned credential JSON to a salted scrypt file without logging secrets. */
import { randomBytes, scrypt } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';

import { loginInputSchema } from '../src/services/definition/auth';

const deriveKey = promisify(scrypt);
Promise.resolve()
  .then(() => {
    const [input, output] = process.argv.slice(2);
    if (!input || !output) throw new Error('需要输入和输出配置文件路径。');
    const credentials = loginInputSchema.parse(
      JSON.parse(readFileSync(input, 'utf8')),
    );
    const salt = randomBytes(16).toString('hex');
    return deriveKey(credentials.password, salt, 64).then((key) => {
      writeFileSync(
        output,
        JSON.stringify({
          username: credentials.username,
          salt,
          passwordHash: (key as Buffer).toString('hex'),
        }),
        { mode: 0o600, flag: 'wx' },
      );
      console.log(
        '登录配置已创建；请由管理员设置为root持有、housevideo组只读。',
      );
    });
  })
  .catch(() => {
    console.error(
      '创建登录配置失败；请检查私有输入格式、目录权限及输出文件是否已存在。',
    );
    process.exitCode = 1;
  });
