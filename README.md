# JobProof v0.2

把岗位 JD 转化为个人能力差距、可执行微项目和可展示求职证据。

## v0.2 功能范围

- 注册阶段建立个人能力画像
- 个人中心展示能力、证据、微项目和推荐岗位
- 粘贴产品/运营 JD，使用本地规则完成结构化分析
- 根据能力缺口生成 7 天微项目
- 本地浏览器存储能力画像，不需要 JobProof 账号或远程数据库
- 证据工作台：补齐可验证事实并检查完整度
- 求职表达：从已保存证据生成可追溯表达
- Gap-based 微项目计划：按能力缺口配置周期和主题
- 可选知乎 OAuth：展示授权用户基础信息、关注列表和公开创作

## 本地启动

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## 当前架构

- Next.js 15 App Router
- TypeScript
- Zod API 输入校验
- localStorage 存储演示阶段用户画像与分析结果
- `/api/jobs/analyze` 提供本地 JD 规则分析接口

## 知乎开放平台接入（可选）

项目支持知乎热榜、知乎 OAuth 登录、授权用户基础信息、关注列表和创作列表。

将 `.env.example` 复制为 `.env.local`，并仅在本地或部署平台的 Secret 配置中填写：

```text
ZHIHU_ACCESS_SECRET=<开放平台 Access Secret>
ZHIHU_OAUTH_APP_ID=469
ZHIHU_OAUTH_APP_KEY=<OAuth App Key>
ZHIHU_OAUTH_REDIRECT_URI=https://zhihujobproof.netlify.app/api/auth/callback
```

OAuth 回调地址必须与知乎开放平台及赛事页面登记值完全一致。`ZHIHU_ACCESS_SECRET`、`ZHIHU_OAUTH_APP_KEY` 和用户 OAuth Token 只在服务端使用，不得提交到 Git、URL、日志或暴露给浏览器。会话优先使用 Netlify Blobs 持久化，未配置 Blobs 时仅回退到单实例内存，不能用于多实例生产环境。读取授权用户的关注和创作列表还需要配置 `ZHIHU_ACCESS_SECRET`。

相关页面：

- `/zhihu-hot`：知乎热榜
- `/account`：知乎用户信息、关注的人和创作信息
- 热榜、关注和创作列表需要服务端 `ZHIHU_ACCESS_SECRET`

## 当前限制与后续版本

1. 接入 Supabase Auth、PostgreSQL 和 Storage
2. 把规则分析替换为结构化 LLM Adapter
3. 添加真实岗位数据、证据上传与求职表达生成

产品与技术文档位于仓库的 `docs` 目录，其中包括 PRD、技术设计、v0.2 知乎画像与 OAuth 设计、项目详情计划书和演示脚本。

开发演示阶段若未配置 OAuth，`/account` 会显示配置提示；未登录知乎时仍可完成 JobProof 的核心 JD → 微项目 → 证据流程。

## 部署

Netlify 构建命令为 `npm run build`，发布目录由 Next.js Netlify 插件接管。生产环境至少配置 `ZHIHU_OAUTH_APP_ID`、`ZHIHU_OAUTH_APP_KEY`、`ZHIHU_OAUTH_REDIRECT_URI`；需要热榜、关注和创作列表时再配置 `ZHIHU_ACCESS_SECRET`。不要提交 `.env.local` 或 `.netlify/` 生成目录。
