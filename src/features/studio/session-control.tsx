'use client';

/** Both editors share the same session and explicit sign-out action. */
import { Alert, Button, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { authApi } from './auth-api';

export function SessionControl({ disabled = false }: { disabled?: boolean }) {
  const [username, setUsername] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
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
      return authApi
        .getSession({ editorCheck: true })
        .then((session) => {
          if (disposed) return;
          setEnabled(session.enabled);
          if (session.enabled && !session.authenticated) {
            // Keep unsaved form contents visible; only the user chooses when to leave.
            setSessionLost(true);
            setError(
              '登录状态暂时不可用。页面内容仍保留，请先复制未保存内容，再重新登录。',
            );
            return;
          }
          setUsername(session.username);
          setSessionLost(false);
          setError('');
        })
        .catch(() => {
          if (!disposed) setError('暂时无法检查登录，页面内容仍保留。');
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
  }, [checkAttempt]);
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
  return (
    <>
      {username && <span className="text-sm text-muted">账号：{username}</span>}
      {enabled && !sessionLost && !confirming && (
        <Button
          htmlType="button"
          className="island-action"
          disabled={disabled || pending}
          onClick={() => setConfirming(true)}
        >
          {pending ? '正在退出…' : '退出登录'}
        </Button>
      )}
      <Modal
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
      {sessionLost && (
        <>
          <Button
            htmlType="button"
            className="island-action"
            onClick={() => setCheckAttempt((attempt) => attempt + 1)}
          >
            重新检查登录
          </Button>
          <Button className="studio-mode-link" href="/login">
            重新登录
          </Button>
        </>
      )}
    </>
  );
}
