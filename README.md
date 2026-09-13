# JobProof

把岗位 JD 转化为个人能力差距、可执行微项目和可展示求职证据。

## 首版范围

- 注册阶段建立个人能力画像
- 个人中心展示能力、证据、微项目和推荐岗位
- 粘贴产品/运营 JD，使用本地规则完成结构化分析
- 根据能力缺口生成 7 天微项目
- 本地浏览器存储能力画像，不需要账号或远程数据库

## 本地启动

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## 当前架构

- Next.js 14 App Router
- TypeScript
- Zod API 输入校验
- localStorage 存储首版用户画像
- `/api/jobs/analyze` 提供本地 JD 规则分析接口

## 知乎开放平台接入

项目支持知乎热榜、知乎 OAuth 登录、授权用户基础信息、关注列表和创作列表。

将 `.env.example` 复制为 `.env.local`，并仅在本地或部署平台的 Secret 配置中填写：

```text
ZHIHU_ACCESS_SECRET=<开放平台 Access Secret>
ZHIHU_OAUTH_APP_ID=200
ZHIHU_OAUTH_APP_KEY=<OAuth App Key>
ZHIHU_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/zhihu/callback
```

OAuth 回调地址必须与知乎赛事平台登记值完全一致。`ZHIHU_ACCESS_SECRET`、`ZHIHU_OAUTH_APP_KEY` 和用户 OAuth Token 只在服务端使用，不得提交到 Git 或暴露给浏览器。当前 MVP 使用进程内服务端会话，适合单实例 Node 部署；多实例部署应将会话存储替换为 Redis 或数据库。

相关页面：

- `/zhihu-hot`：知乎热榜
- `/zhihu-profile`：知乎用户信息、关注的人和创作信息

## 后续版本

1. 接入 Supabase Auth、PostgreSQL 和 Storage
2. 把规则分析替换为结构化 LLM Adapter
3. 添加真实岗位数据、证据上传与求职表达生成

产品与技术文档位于仓库的 `docs` 目录（后续提交时可补入）。
