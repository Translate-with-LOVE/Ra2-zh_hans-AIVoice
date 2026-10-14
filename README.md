# 红色警戒 2 简体中文 AI 配音版

基于 [简体中文汉化项目](https://github.com/Translate-with-LOVE/Ra2-zh_hans-main) 的完整 AI 配音项目，包含基础汉化源码、图标/字体资源、字幕、构建工具与已选游戏音频。沿用上游 CSF、图标和 MIX 打包流程，只发布含语音版本。

当前音频来自 Feedback R2 已交付试玩包：1259 个完整 BAG/IDX 与散装 WAV 输入、2733 个已选物理位置。选入试玩包不代表所有配音已通过人工质量评价；待审修订不纳入此版本。CI 直接验证并打包冻结的游戏音频，不重新生成配音、不下载模型。

构建需要 Windows、PowerShell、Node.js 24、npm、7-Zip：

```powershell
pwsh ./build.ps1
```

产物：`pack/with_audio/RedAlert2-AIVoice-zh_hans.zip`。首次构建执行锁文件约束的 `npm ci`；已有对应依赖时可用 `-SkipNpmInstall`。字体 BDF 用于生成图标，游戏内 FNT 独立保留。

nightly 每日北京时间约 03:23 检查默认分支，有实际构建输入更新才发布独立预发布版本，支持手动运行。正式版本由 `v*` 标签推送触发。详见 [发布说明](docs/RELEASE.md)。

上游说明与归属保留在 [UPSTREAM-README.md](UPSTREAM-README.md)，ccmixar 的 ISC 授权保留在工具目录。本项目不是 EA 官方产品；游戏资源权利归原权利人。
