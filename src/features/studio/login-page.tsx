'use client';

/** A quiet, welcoming entry to the existing island-style workspace. */
import { Button, Form, Input, ButtonAppearance, cn } from './common';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { getLoginDestination } from '@/services/definition/auth';

import { authApi } from './auth-api';

export function LoginPage() {
  const [form] = Form.useForm<{ username: string; password: string }>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  function enterStudio() {
    window.location.replace(
      getLoginDestination(
        new URLSearchParams(window.location.search).get('next'),
      ),
    );
  }
  useEffect(() => {
    let disposed = false;
    authApi
      .getSession()
      .then((session) => {
        if (!disposed && session.authenticated) enterStudio();
      })
      .catch(() => {
        if (!disposed) setNotice('连接工作室失败，请稍后重试。');
      });
    return () => {
      disposed = true;
    };
  }, []);
  function submit(values: { username: string; password: string }) {
    if (pending) return;
    setPending(true);
    setNotice('');
    return authApi
      .login(values)
      .then(enterStudio)
      .catch((error: unknown) => {
        form.resetFields(['password']);
        setNotice(
          error instanceof Error ? error.message : '登录失败，请稍后重试。',
        );
        setPending(false);
      });
  }
  return (
    <main className="studio-ui min-h-svh bg-page px-8 text-ink max-[680px]:px-5">
      <header
        className={cn(
          'mx-auto flex max-w-[1440px] items-center justify-between gap-6',
          'border-b border-input py-4 max-[680px]:py-5',
        )}
      >
        <div className="text-heading-3 font-semibold tracking-[0.02em]">
          <span>
            房源视频工作室
            <small className="mt-0.5 block text-sub-caption font-medium tracking-[0.14em] text-muted">
              HOUSE VIDEO STUDIO
            </small>
          </span>
        </div>
        <span className="text-sm text-muted max-[680px]:hidden">
          用实拍，记录家的模样
        </span>
      </header>
      <div
        className={cn(
          'mx-auto grid min-h-[calc(100svh-160px)] max-w-[1360px] items-center gap-12 py-8',
          'grid-cols-[minmax(0,1.4fr)_minmax(340px,0.85fr)]',
          'max-[900px]:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)] max-[900px]:gap-8',
          'max-[680px]:min-h-0 max-[680px]:max-w-[480px] max-[680px]:grid-cols-1 max-[680px]:gap-6',
        )}
      >
        <section aria-label="房源视频创作">
          <p className="mb-4 text-sm font-semibold tracking-[0.06em] text-primary">
            每一处家，都值得认真呈现
          </p>
          <h1 className="mb-5 text-heading-1 font-medium tracking-tight lg:text-4xl max-[680px]:mb-0">
            下一套好房，
            <br />
            从这里开场。
          </h1>
          <p className="mb-7 text-data leading-7 text-muted max-[680px]:hidden">
            把真实的画面、想说的话，
            <br />
            剪成一段有温度的房源视频。
          </p>
          <figure className="relative m-0 overflow-hidden rounded-lg max-[680px]:hidden">
            <img
              className="block h-[clamp(180px,23vw,320px)] w-full object-cover"
              src="/login-preview.jpg"
              alt="明亮客厅示意图"
              width={600}
              height={400}
            />
            <figcaption
              className={cn(
                'absolute bottom-4 left-5 rounded bg-[#173c35d9]',
                'px-3 py-1 text-caption text-white',
              )}
            >
              <span>真实画面 · 认真讲述</span>
            </figcaption>
          </figure>
        </section>
        <section
          className="rounded-lg border border-input bg-panel p-6"
          aria-labelledby="login-title"
        >
          <div className="mb-6">
            <div>
              <h2
                id="login-title"
                className="mb-2.5 text-heading-2 font-medium"
              >
                欢迎回来
              </h2>
              <p className="text-body text-muted">
                登录后，开始你的下一条房源视频。
              </p>
            </div>
          </div>
          <Form
            form={form}
            onFinish={submit}
            layout="vertical"
            requiredMark={false}
            className="grid gap-6 [&_.ant-form-item]:mb-0 [&_label]:text-sm [&_label]:font-medium"
            aria-busy={pending}
            disabled={pending}
          >
            <Form.Item
              name="username"
              htmlFor="studio-username"
              label="工作室账号"
              rules={[{ required: true, message: '请输入工作室账号。' }]}
            >
              <Input
                id="studio-username"
                name="username"
                autoComplete="username"
                placeholder="请输入账号"
                maxLength={64}
                disabled={pending}
              />
            </Form.Item>
            <Form.Item
              name="password"
              htmlFor="studio-password"
              label="登录密码"
              rules={[{ required: true, message: '请输入登录密码。' }]}
            >
              <Input.Password
                id="studio-password"
                name="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                iconRender={(visible) =>
                  visible ? (
                    <EyeOutlined aria-label="隐藏密码" />
                  ) : (
                    <EyeInvisibleOutlined aria-label="显示密码" />
                  )
                }
                maxLength={256}
                disabled={pending}
              />
            </Form.Item>
            <div
              className="-mt-2.5 -mb-3 min-h-5 text-caption text-danger [&_p]:m-0"
              aria-live="polite"
            >
              {notice && <p role="alert">{notice}</p>}
            </div>
            <Button
              appearance={ButtonAppearance.Solid}
              htmlType="submit"
              block
              loading={pending}
              disabled={pending}
            >
              {pending ? '正在登录…' : '进入工作室'}
            </Button>
          </Form>
          <p className="mt-6 text-caption leading-6 text-muted">
            使用工作室账号登录，继续制作与管理你的房源视频。
          </p>
        </section>
      </div>
      <footer className="mx-auto max-w-[1440px] pb-6 text-caption text-muted max-[680px]:text-center">
        慢慢打磨每一帧，认真呈现每一处家。
      </footer>
    </main>
  );
}
