# 房产文案生成参考

这些资料安装在本项目的 .agents/skills，供 Codex/兼容 Agent 生成房源文案时读取。当前应用的免费剪辑页面仍由用户编辑逐段文案；安装这些文件不会让网页自动调用 AI，也不产生模型费用。

## 推荐入口

使用 [house-tour-copywriting](.agents/skills/house-tour-copywriting/SKILL.md)，先看房源事实与实拍镜头，再写画面字幕、聊天式口播和发布文案。下一轮在本项目范围内可发现新 Skill；也可明确指定该文件。工作目录仍在相邻科研仓库时，应直接指定本项目入口，不把它误认为已全局安装。

示例请求：

> 使用 $house-tour-copywriting，参考浅水湾实拍和已提供的房源资料，重写四个片段的标题与短文案。保留原片头、时间码和房源数字，先输出可审阅稿，不调用付费模型。

项目示例见 [逐镜头改写](.agents/skills/house-tour-copywriting/references/qianshuiwan-example.md)。

## 下载与筛选结果

| 来源                                                                                                                                                                                                                  | 本地位置                                                        | 用途                                   | 许可/完整性                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [danfeistar/house-skills-kit](https://github.com/danfeistar/house-skills-kit/tree/7a7bfb5b96bddafb12e91fa29cdf8e2cc84c21c5/skills/sales-talk-library) 的 sales-talk-library                                           | .agents/skills/sales-talk-library                               | 中文户型、空间、带看与收纳说辞         | Apache-2.0；完整技能目录，保留 domains.md、README 与 LICENSE                                              |
| [alexclowe/awesome-claude-cowork-plugins](https://github.com/alexclowe/awesome-claude-cowork-plugins/tree/99f3455d59e5f3ce66cde3b193fac514e28399b8/real-estate/skills/real-estate-marketing) 的 real-estate-marketing | .agents/skills/real-estate-marketing                            | 卖点组织、视频开头、行动引导与数字核对 | MIT；完整技能目录，保留 LICENSE                                                                           |
| [qingxd1984 的中文探盘文案生成器](https://oomol.com/zh-tw/skills/@qingxd1984/fangchan-tanpan-copywriter/)                                                                                                             | house-tour-copywriting/references/fangchan-tanpan-copywriter.md | 中文口语、卖点取舍、减少楼书腔         | 公开 source.md 的原文快照；页面标示0.0.1，未提供明确许可证；未取得附录引用的3个配套文件，不宣称完整安装包 |
| house-tour-copywriting                                                                                                                                                                                                | .agents/skills/house-tour-copywriting                           | 本项目实拍与中文表达适配               | 项目原创；与下载原文分开保存                                                                              |

下载日期：2026-10-25。GitHub 两项固定到提交 SHA；公开网页快照按字节 SHA256 记录于 [来源清单](.agents/skills/house-tour-copywriting/references/upstream-sources.json)。原文件按下载字节保留，不伪装成自研。公开快照仅作本项目内部参考，不赋予转载或再分发许可。

未选用 gonzih/skills-realestate 的 listing-writer：偏美国 MLS 长描述，固定催促成交及数据接口不适合这次中文免费实拍。未选用 Seedance/Higgsfield 生成视频 Skill：本轮需要改善文字，不需要额外视频平台。

## 本项目适配

- 真实人物开场已经录好，不能为套“黄金三秒”模板自动改掉原声。
- 正文与画面不放手机号；只保留自然私信或约看入口。
- 不强制三版长稿，不虚构客户故事、市场矛盾、稀缺或房源缺点。
- 不把“精装修”夸成“全新装修、拎包入住”，不把短时实拍夸成全天采光。
- 面积、总价、楼层保持用户原值；家具可见不等于随房交付。
- 美国 MLS/Fair Housing 章节作为来源背景，不当作安福房源的法律或平台结论；国内发布要求有需要时另查当期官方规则。
- 上游提及的外部接口、计算工具、审批流程和发布动作不随安装自动启用；本轮只下载与整理参考。

## 验证范围

核对 Skill frontmatter、本地依赖链接、固定版本、文件校验值与许可证；未运行第三方代码。只新增资料与项目调用说明，不修改网页或当前草稿，因此本轮不做浏览器 UI 验收，也不重新导出视频。

Recreation Metrics O1/O2/O3/S1/S2/S3：N/A，非网页复刻、无可见 UI 改动。
