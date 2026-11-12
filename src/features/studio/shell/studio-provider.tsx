'use client';

/** Ant Design owns interaction and SSR styles; tokens follow the reference research workbench. */
import { App, ConfigProvider, type ThemeConfig } from 'antd';
import '../../../share/ui/controls.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import zhCN from 'antd/locale/zh_CN';
import { useState, type ReactNode } from 'react';

const STUDIO_THEME: ThemeConfig = {
  token: {
    colorPrimary: '#27b7aa',
    colorPrimaryHover: '#17a79a',
    colorInfo: '#27b7aa',
    colorText: 'rgba(0, 0, 0, 0.85)',
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextPlaceholder: 'rgba(0, 0, 0, 0.45)',
    colorTextDisabled: 'rgba(0, 0, 0, 0.25)',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f7f8fa',
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#e0e0e0',
    borderRadius: 4,
    borderRadiusLG: 8,
    controlHeight: 40,
    controlHeightLG: 44,
    controlHeightSM: 32,
    fontSize: 14,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    motionDurationMid: '0.16s',
  },
  components: {
    Button: {
      controlHeight: 36,
      controlHeightLG: 36,
      controlHeightSM: 32,
      borderRadius: 2,
      defaultColor: '#27b7aa',
      defaultBorderColor: '#27b7aa',
      defaultHoverBorderColor: '#17a79a',
      defaultHoverColor: '#17a79a',
      defaultShadow: 'none',
      primaryShadow: 'none',
      fontWeight: 700,
      fontSizeLG: 14,
      paddingInline: 16,
      paddingInlineSM: 12,
    },
    Input: {
      hoverBorderColor: '#17a79a',
      activeBorderColor: '#17a79a',
      activeShadow: 'none',
    },
    InputNumber: {
      hoverBorderColor: '#17a79a',
      activeBorderColor: '#17a79a',
      activeShadow: 'none',
    },
    Select: {
      hoverBorderColor: '#17a79a',
      activeBorderColor: '#17a79a',
      optionSelectedBg: '#eff8f7',
      optionSelectedColor: '#17a79a',
      optionHeight: 40,
    },
    Collapse: {
      headerBg: 'transparent',
      headerPadding: '8px 0',
      contentPadding: '0',
      contentBg: 'transparent',
    },
    Modal: { borderRadiusLG: 8 },
  },
};

export function StudioProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0 },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={STUDIO_THEME}
        button={{ autoInsertSpace: false }}
      >
        <App className="min-h-svh">{children}</App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
