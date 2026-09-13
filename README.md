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

## 后续版本

1. 接入 Supabase Auth、PostgreSQL 和 Storage
2. 把规则分析替换为结构化 LLM Adapter
3. 添加真实岗位数据、证据上传与求职表达生成

产品与技术文档位于仓库的 `docs` 目录（后续提交时可补入）。

## 知乎 OAuth（可选）

在 .env.local 或部署平台 Secret 中配置 ZHIHU_OAUTH_APP_ID、ZHIHU_OAUTH_APP_KEY、ZHIHU_OAUTH_REDIRECT_URI。关注和创作列表还需要服务端 ZHIHU_ACCESS_SECRET。真实密钥不会写入源码、Git、URL 或浏览器响应。回调地址必须与知乎开放平台登记值完全一致；本地默认是 http://localhost:3000/api/auth/callback，公网部署后应替换为 HTTPS 地址。

开发演示阶段若未配置 OAuth，/account 会显示配置提示；正式联调需要用户本人完成知乎授权。当前会话使用进程内 Map，适合单实例演示，多实例部署请替换为 Supabase/Redis 等共享存储。
