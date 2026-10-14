# 构建与发布

本仓库包含完整的基础汉化源码/资源和冻结的 R2 游戏音频。音频目录逐文件由 `assets/voice-manifest.json` 的 SHA256 约束，`voice/selected-lines.json` 绑定2733个当前 `(game, UID, kind)` 位置；同UID可在两个游戏出现。原始TTS WAV与游戏编码payload并不等同。字体BDF和游戏FNT也为独立资源，修改BDF不会自动生成FNT。

## 本地构建

Windows 上安装 Node.js 24、PowerShell和7-Zip，执行 `pwsh ./build.ps1`。构建使用 `npm ci` 的锁定依赖。音频完整性预检通过后，生成CSF、图标，打包MIX，再生成 `pack/with_audio/RedAlert2-AIVoice-zh_hans.zip`。缺少、改变或未展开的LFS音频输入会失败；原声BANK条目作为完整BANK的一部分保留。脚本不调用TTS、不载入模型、不改变语速/响度、不重插旧候选音频。

运行 `node tests/ci-inputs.test.js` 检查输入指纹和发布去重逻辑。若明确使用已安装的相同Node依赖，可传入 `-SkipNpmInstall`。

## 自动包和正式包

- 默认分支每日北京时间约03:23检查，对应UTC cron `23 19 * * *`；GitHub计划可能延迟。Actions页的手动运行同样只接受默认分支。
- 构建源码、资源或实际语音输入变化时发布独立 `nightly-<输入SHA256>` 预发布，`latest=false`。README单独变化不会触发重建。相同输入的完整Release已存在则跳过；403、网络故障或不完整Release会失败，供排查后重试。
- 正式版本仅由 `v*` 标签push触发，不重复监听release published。仅在决定正式发布时创建例如 `v0.1.0` 的标签；不预先创建同名Release。
- nightly串行，正式版本按标签串行；既有标签和资产不会被覆盖。当前实现保留每个有更新的nightly版本，未增加清理历史版本功能。

Release只上传含语音ZIP及 `.sha256`。无OSS、无语音包或额外发布矩阵。工作流显式设置 `contents: write`，使用GitHub自动提供的 `github.token`，不要求PAT、OSS密钥或SSH私钥secret。私有仓库下载需具有访问权限。

依据：[触发事件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)、[GITHUB_TOKEN](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)、[gh release create](https://cli.github.com/manual/gh_release_create)。

## 文件范围

源码、台本和必要游戏音频用普通Git保存，当前最大单文件约45MB，未引入LFS。最终ZIP上传Release而不提交Git。模型权重、缓存、评价DB、私人评论、个人绝对路径、临时试听和历史巨包均排除；本项目仅进行冻结输入的可复现打包。`.gitignore`不能移除已跟踪文件，因此提交前也核对文件清单。

上游归属和工具许可证保留在 `UPSTREAM-README.md` 及原工具目录。输入版本证据见 `assets/provenance.json`。包内音频一致性检查不替代人工听审或实际游戏测试。
