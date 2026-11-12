'use client';

/** Both editors share the same session and explicit sign-out action. */
import { Alert, Button, Modal, cn } from '../../../share/ui';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogoutOutlined } from '@ant-design/icons';

import { authApi } from './auth-api';

export function SessionControl({
  disabled = false,
  refreshKey = 0,
}: {
  disabled?: boolean;
  refreshKey?: number;
}) {
  const queryClient = useQueryClient();
  const [checkAttempt, setCheckAttempt] = useState(0);
  const sessionQuery = useQuery({
    queryKey: ['studio-session', refreshKey, checkAttempt],
    queryFn: () => authApi.getSession({ editorCheck: true }),
    refetchOnMount: 'always',
  });
  const refetchSession = sessionQuery.refetch;
  const session =
    sessionQuery.isFetching || sessionQuery.isError
      ? null
      : (sessionQuery.data ?? null);
  const enabled = session?.enabled ?? false;
  const [confirming, setConfirming] = useState(false);
  const sessionLost = Boolean(session?.enabled && !session.authenticated);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    function handlePageShow() {
      refetchSession();
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [refetchSession]);
  /** A single unexpected click must not immediately revoke a week-long login. */
  function logout() {
    if (!confirming || pending || disabled) return;
    setPending(true);
    setError('');
    return authApi
      .logout()
      .then(() => {
        queryClient.clear();
        window.location.replace('/login');
      })
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
  } else if (sessionQuery.isError) accountLabel = '暂时无法读取';
  const sessionError = sessionLost
    ? '登录状态暂时不可用。页面内容仍保留，请先复制未保存内容，再重新登录。'
    : sessionQuery.isError
      ? '暂时无法检查登录，页面内容仍保留。'
      : '';
  const displayError = error || sessionError;
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
        {displayError && <Alert type="error" title={displayError} showIcon />}
      </Modal>
      {displayError && (
        <span role="alert" className="text-xs text-danger">
          {displayError}
        </span>
      )}
      {(sessionLost || sessionQuery.isError) && (
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
