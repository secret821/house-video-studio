'use client';

/** Ant Design owns interaction and SSR styles; the studio keeps its existing warm visual system. */
import { App, ConfigProvider, type ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ReactNode } from 'react';

const STUDIO_THEME: ThemeConfig = {
  token: {
    colorPrimary: '#b9503b',
    colorInfo: '#b9503b',
    colorSuccess: '#60764f',
    colorWarning: '#bd6b22',
    colorError: '#bc423b',
    colorText: '#38243b',
    colorTextSecondary: '#776577',
    colorTextDisabled: '#998c91',
    colorBgContainer: '#fffcf5',
    colorBgElevated: '#fffcf5',
    colorBgLayout: '#fff4df',
    colorBorder: '#dfceba',
    colorBorderSecondary: '#ebdecd',
    borderRadius: 12,
    borderRadiusLG: 24,
    controlHeight: 44,
    controlHeightLG: 48,
    fontSize: 14,
    fontFamily: "'Nunito', 'Noto Sans SC', 'PingFang SC', sans-serif",
    motionDurationMid: '0.16s',
  },
  components: {
    Button: {
      borderRadius: 24,
      defaultBg: '#fffcf5',
      defaultHoverBg: '#f7ebd9',
      defaultHoverColor: '#38243b',
      defaultHoverBorderColor: '#c5aa8c',
      defaultShadow: '0 2px 0 #dfceba55',
      primaryShadow: 'inset 0 2px 0 #ffffff30, 0 3px 0 #853823',
      fontWeight: 700,
    },
    Input: { activeShadow: '0 0 0 2px #b9503b26', fontSize: 16 },
    InputNumber: { activeShadow: '0 0 0 2px #b9503b26', fontSize: 16 },
    Select: { optionHeight: 44, optionSelectedBg: '#eee8f6', fontSize: 16 },
    Collapse: {
      headerBg: 'transparent',
      headerPadding: '8px 0',
      contentPadding: '0',
      contentBg: 'transparent',
    },
    Modal: { borderRadiusLG: 24 },
  },
};

export function StudioProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={STUDIO_THEME}
      button={{ autoInsertSpace: false }}
    >
      <App className="studio-ant-app">{children}</App>
    </ConfigProvider>
  );
}
