-- House Video Studio metadata schema, MySQL 8.0+.
-- Apply to a dedicated empty database after administrator review.
CREATE TABLE `studio_account` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workspace_id` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '稳定工作室标识，legacy或小写UUID',
  `username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '登录账号，区分大小写',
  `salt` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT 'scrypt随机盐十六进制值',
  `password_hash` char(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '64字节scrypt摘要十六进制值',
  `is_enabled` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT '1允许登录/0禁用登录',
  `isvoid` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT '0正常/1作废',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_workspace_id` (`workspace_id`),
  UNIQUE KEY `uniq_username` (`username`),
  KEY `idx_is_enabled` (`is_enabled`, `isvoid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='房源工作室登录账号-20261103-codex';

CREATE TABLE `studio_current_draft` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `account_id` int unsigned NOT NULL DEFAULT 0 COMMENT '所属studio_account主键ID',
  `draft_kind` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '制作模式：photo或video',
  `project_text` mediumtext NULL DEFAULT NULL COMMENT '当前项目JSON，只保存媒体路径引用',
  `revision` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '当前版本UUID',
  `isvoid` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT '0当前有效/1作废',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_account_id_draft_kind` (`account_id`, `draft_kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='每账号每模式唯一当前草稿-20261103-codex';
