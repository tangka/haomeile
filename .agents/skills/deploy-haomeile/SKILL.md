---
name: deploy-haomeile
description: Release haomeile.rip (号没了) from the machine that holds the deploy key. Use when asked to deploy, publish, update the live site, check whether a release is needed, or set up automatic updates. Do not use on a machine without ~/.ssh/haomeile-deploy-sg.
---

# 部署号没了

只在有部署密钥的机器上使用。脚本会检查 `~/.ssh/haomeile-deploy-sg`，没有就停。每台机器用自己的密钥，不要在机器之间复制私钥，也不要贴到聊天里。

## 平时更新

1. 在仓库里切到 `codex/implement-haomeile`（或专用的 `release/local`），确认工作区干净。有别的改动就停下，告诉站长。
2. 先看要发什么（不会部署）：

   ```text
   node scripts/auto-release.mjs
   ```

3. 没有停下的提示，就发布：

   ```text
   node scripts/auto-release.mjs --deploy
   ```

脚本依次：快进合并 `claude/seo-geo-2`、全部检查和测试、打包、备份数据库并部署、核对线上页面。加 `--push-base` 才会把 `codex/implement-haomeile` 推回 GitHub，要站长同意。任何一步失败都不会继续往下走。应用不健康时，部署脚本会恢复上一版。

## 脚本停下时

| 提示 | 怎么办 |
| --- | --- |
| `working tree has uncommitted` | 不要清理或提交别人的改动，告诉站长 |
| `have diverged` | 不要在这里解决冲突，请开发机先合并到 `claude/seo-geo-2` |
| `A person must review` | 列出文件给站长看。站长明确同意后，才加 `--reviewed` |
| `Existing migrations were changed` | 绝不放行，告诉站长 |
| `did not accept this machine’s deploy key` | 这台的公钥还没加到服务器，告诉站长 |
| `Deployed, but check the live site` | 已经上线，马上把列出的页面告诉站长，不要自己重复部署 |
| `Another release is running` | 等它结束。确认没有发布在跑，再请站长处理锁目录 |

## 自动更新

站长同意后才设置定时。定时只能运行不带 `--reviewed` 的命令：

```text
30 2 * * * cd /仓库的绝对路径 && /node的绝对路径 scripts/auto-release.mjs --deploy >> artifacts/auto-release.log 2>&1
```

定时环境里要能找到 `node`、`pnpm`、`python3`（带 paramiko）和 `git` 的登录。没有新内容时脚本直接退出。**能推送 `claude/seo-geo-2` 的人就能让内容上线**，所以这个分支只给信得过的账号。

## 不要做

- 不要运行 `deploy-server.py http` 或 `https`，那是首次安装用的。
- 不要强推、改写迁移、跳过测试，不要输出密钥、环境文件或数据库内容。
- 不要手动改服务器上的文件来代替发布。
