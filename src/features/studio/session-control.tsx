'use client';

/** Both editors share the same session and explicit sign-out action. */
import { Alert, Button, Modal, cn } from './common';
import { useEffect, useState } from 'react';
import { LogoutOutlined } from '@ant-design/icons';

import { authApi } from './auth-api';

export function SessionControl({
  disabled = false,
  refreshKey = 0,
}: {
  disabled?: boolean;
  refreshKey?: number;
}) {
  const [session, setSession] = useState<Awaited<
    ReturnType<typeof authApi.getSession>
  > | null>(null);
  const enabled = session?.enabled ?? false;
  const [confirming, setConfirming] = useState(false);
  const [sessionLost, setSessionLost] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let checking = false;
    function checkSession() {
      if (checking) return;
      checking = true;
      setSession(null);
      setError('');
      return authApi
        .getSession({ editorCheck: true })
        .then((session) => {
          if (disposed) return;
          setSession(session);
          if (session.enabled && !session.authenticated) {
            // Keep unsaved form contents visible; only the user chooses when to leave.
            setSessionLost(true);
            setError(
              '登录状态暂时不可用。页面内容仍保留，请先复制未保存内容，再重新登录。',
            );
            return;
          }
          setSessionLost(false);
          setError('');
        })
        .catch(() => {
          if (!disposed) {
            setSession(null);
            setError('暂时无法检查登录，页面内容仍保留。');
          }
        })
        .finally(() => {
          checking = false;
        });
    }
    function handlePageShow() {
      checkSession();
    }
    checkSession();
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      disposed = true;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [checkAttempt, refreshKey]);
  /** A single unexpected click must not immediately revoke a week-long login. */
  function logout() {
    if (!confirming || pending || disabled) return;
    setPending(true);
    setError('');
    return authApi
      .logout()
      .then(() => window.location.replace('/login'))
      .catch(() => {
        setError('退出失败，请重试。');
        setPending(false);
      });
  }
  let accountLabel = '正在读取…';
  if (session) {
    if (!session.enabled) accountLabel = '本机工作室';
    else if (session.authenticated && session.username)
      accountLabel = session.username;
    else accountLabel = '登录状态已失效';
  } else if (error) accountLabel = '暂时无法读取';
  const logoutDisabled =
    disabled || pending || !enabled || !session?.authenticated || sessionLost;
  return (
    <>
      <div
        className="grid gap-1 border-t border-line p-3 break-words"
        role="status"
      >
        <span className="text-xs text-muted">当前账号</span>
        <strong className="text-sm text-content">{accountLabel}</strong>
      </div>
      <Button
        htmlType="button"
        icon={<LogoutOutlined />}
        danger
        disabled={logoutDisabled}
        onClick={() => setConfirming(true)}
      >
        {pending ? '正在退出…' : '退出登录'}
      </Button>
      {session && !enabled && (
        <p className="px-3 text-xs text-muted">本机模式未启用账号登录。</p>
      )}
      <Modal
        className="studio-ui"
        title="确认退出登录"
        open={enabled && !sessionLost && confirming}
        centered
        width={440}
        destroyOnHidden
        closable={!pending}
        mask={{ closable: !pending }}
        keyboard={!pending}
        confirmLoading={pending}
        okText="确认退出"
        cancelText="取消"
        cancelButtonProps={{ disabled: pending, autoFocus: true }}
        okButtonProps={{ disabled, danger: true }}
        onCancel={() => setConfirming(false)}
        onOk={logout}
      >
        <p>确定退出当前账号？未保存的内容请先保存草稿。</p>
        {error && <Alert type="error" title={error} showIcon />}
      </Modal>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {(sessionLost || (error && !session)) && (
        <>
          <Button
            htmlType="button"
            onClick={() => setCheckAttempt((attempt) => attempt + 1)}
          >
            重新检查登录
          </Button>
          {sessionLost && (
            <Button
              className={cn(
                '!flex !min-h-10 !items-center !rounded',
                '!px-3 !py-2 hover:!bg-primary-soft',
              )}
              href="/login"
            >
              重新登录
            </Button>
          )}
        </>
      )}
    </>
  );
}
