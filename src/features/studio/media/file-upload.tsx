/** Ant Design handles picker, drag/drop and keyboard interaction; uploads stay in the existing business API. */
import { Button, Upload } from '../../../share/ui';
import { UploadOutlined } from '@ant-design/icons';
import { useId, useState } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  disabled: boolean;
  multiple?: boolean;
  compact?: boolean;
  onFiles: (files: File[]) => void;
}

export function FileUpload({
  label,
  accept,
  disabled,
  multiple = false,
  compact = false,
  onFiles,
}: FileUploadProps) {
  const messageId = useId();
  const [error, setError] = useState('');
  const UploadControl = compact ? Upload : Upload.Dragger;
  return (
    <div className="studio-file-upload min-w-0">
      <UploadControl
        aria-label={label}
        aria-describedby={error ? messageId : undefined}
        accept={[
          accept,
          accept.includes('.mp4') && 'video/*',
          accept.includes('.jpg') && 'image/*',
        ]
          .filter(Boolean)
          .join(',')}
        multiple={multiple}
        disabled={disabled}
        showUploadList={false}
        beforeUpload={(file, files) => {
          // antd invokes this for every file in one selection; the business hook receives the whole ordered batch once.
          if (file.uid !== files[0].uid || disabled) return Upload.LIST_IGNORE;
          if (!multiple && files.length > 1) {
            setError('此处一次只能上传一个文件，请分开放入。');
            return Upload.LIST_IGNORE;
          }
          const extensions = accept.split(',');
          if (
            files.some(
              (item) =>
                !extensions.some((suffix) =>
                  item.name.toLowerCase().endsWith(suffix),
                ),
            )
          ) {
            setError(`文件格式不支持，请选择 ${accept} 文件。`);
            return Upload.LIST_IGNORE;
          }
          setError('');
          onFiles(files);
          return Upload.LIST_IGNORE;
        }}
      >
        {compact ? (
          <Button disabled={disabled} icon={<UploadOutlined />}>
            {label}
          </Button>
        ) : (
          <>
            <p className="flex items-center justify-center gap-2 text-sm font-bold">
              <UploadOutlined aria-hidden />
              <span>{label}</span>
            </p>
            <p className="mt-2 text-xs text-muted">
              {multiple
                ? '可一次多选，按选择顺序逐个上传'
                : '点击选择，或将文件拖到这里'}
            </p>
          </>
        )}
      </UploadControl>
      {error && (
        <p id={messageId} role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
