/** Both editors keep new-project and save visible; antd owns popup and keyboard interaction. */
import { Button, Dropdown } from 'antd';
import {
  HomeOutlined,
  PlusOutlined,
  SaveOutlined,
  MoreOutlined,
} from '@ant-design/icons';

import { SessionControl } from './session-control';

interface StudioHeaderProps {
  busy: boolean;
  saveDisabled: boolean;
  photoMode?: boolean;
  actions: { save: () => void; newProject: () => void };
}

export function StudioHeader({
  busy,
  saveDisabled,
  photoMode = false,
  actions,
}: StudioHeaderProps) {
  return (
    <header className="island-header">
      <div className="studio-topbar">
        <a className="studio-brand" href="/" aria-label="房源视频工作室首页">
          <span className="studio-brand-mark" aria-hidden="true">
            <HomeOutlined />
          </span>
          <span>
            房源视频工作室<small>HOUSE VIDEO STUDIO</small>
          </span>
        </a>
        <div className="studio-header-actions">
          <Button
            className="island-action"
            aria-label="新建房源视频"
            icon={<PlusOutlined />}
            disabled={busy}
            onClick={actions.newProject}
          >
            新建
          </Button>
          <Button
            className="island-action"
            disabled={busy || saveDisabled}
            icon={<SaveOutlined />}
            onClick={actions.save}
          >
            保存草稿
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            destroyOnHidden={false}
            popupRender={() => (
              <div className="studio-menu-content">
                <Button
                  type="text"
                  className="studio-mode-link"
                  href={photoMode ? '/video-edit' : '/photo-mode'}
                >
                  {photoMode ? '返回实拍剪辑' : '照片精细编辑'}
                </Button>
                <SessionControl disabled={busy} />
              </div>
            )}
          >
            <Button
              className="island-action"
              icon={<MoreOutlined />}
              aria-label="更多工作室操作"
            >
              更多
            </Button>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
