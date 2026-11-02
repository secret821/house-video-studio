'use client';

/** A quiet, welcoming entry to the existing island-style workspace. */
import { Button, Form, Input } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { getLoginDestination } from '@/services/definition/auth';

import { authApi } from './auth-api';
import styles from './login-page.module.css';

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
    <main className={`studio-ui ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span>
            房源视频工作室<small>HOUSE VIDEO STUDIO</small>
          </span>
        </div>
        <span className={styles.headerNote}>用实拍，记录家的模样</span>
      </header>
      <div className={styles.content}>
        <section className={styles.story} aria-label="房源视频创作">
          <p className={styles.eyebrow}>每一处家，都值得认真呈现</p>
          <h1>
            下一套好房，
            <br />
            从这里开场。
          </h1>
          <p className={styles.description}>
            把真实的画面、想说的话，
            <br />
            剪成一段有温度的房源视频。
          </p>
          <figure className={styles.preview}>
            <img
              src="/login-preview.jpg"
              alt="明亮客厅示意图"
              width={600}
              height={400}
            />
            <figcaption>
              <span>真实画面 · 认真讲述</span>
            </figcaption>
          </figure>
        </section>
        <section className={styles.formPanel} aria-labelledby="login-title">
          <div className={styles.formHeading}>
            <div>
              <h2 id="login-title">欢迎回来</h2>
              <p className={styles.formDescription}>
                登录后，开始你的下一条房源视频。
              </p>
            </div>
          </div>
          <Form
            form={form}
            onFinish={submit}
            layout="vertical"
            requiredMark={false}
            className={styles.form}
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
            <div className={styles.notice} aria-live="polite">
              {notice && <p role="alert">{notice}</p>}
            </div>
            <Button
              type="primary"
              className={styles.submit}
              htmlType="submit"
              block
              loading={pending}
              disabled={pending}
            >
              {pending ? '正在登录…' : '进入工作室'}
            </Button>
          </Form>
          <p className={styles.formFooter}>
            使用工作室账号登录，继续制作与管理你的房源视频。
          </p>
        </section>
      </div>
      <footer className={styles.footer}>
        慢慢打磨每一帧，认真呈现每一处家。
      </footer>
    </main>
  );
}
