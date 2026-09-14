# JobProof

JobProof（能力证据工坊）帮助大学生把目标岗位 JD 转化为能力差距、可执行微项目和可展示的求职证据。

核心链路：

```text
目标 JD → 能力拆解与匹配解释 → 7/14 天微项目 → 证据完整度 → 求职表达
```

## 当前版本

### v0.2：证据驱动的求职工作流

- 四步 onboarding：背景、能力自评、事实与证据、能力画像确认。
- JD 文本分析：提取能力要求，保留 JD 原文依据，输出匹配总分与分项解释。
- 缺口驱动的 7/14 天微项目：任务包含预计用时、交付物、验收标准和关联能力。
- 本地 Repository：在浏览器 `localStorage` 保存演示阶段的画像、JD 分析、计划和证据。
- 证据工作台：填写背景、任务、行动、结果、反思，并显示完整度和待补充字段。
- 求职表达：从证据生成简历 bullet、作品集案例和 STAR 面试故事草稿。
- 可选知乎接入：OAuth 登录、账号基础信息、公开关注/创作列表。

### v0.3：云端数据基础

已合入 Supabase SSR 客户端、Magic Link 服务端接口、画像云端读写 API、数据库迁移和 RLS 策略。未配置 Supabase 时，v0.2 的 localStorage 演示流程保持不变。

- `GET/PUT /api/profile`：读写当前登录用户的能力画像。
- `/api/auth/supabase/magic-link`：发送 Supabase 邮箱 Magic Link。
- `/api/auth/supabase/callback`：交换登录 code 并建立会话。
- `/api/auth/supabase/logout`：退出云端会话。
- `supabase/migrations/202609140001_jobproof_v03.sql`：`profiles`、`profile_competencies` 表及 RLS 策略。

配置细节见 [v0.3 云端数据基础](docs/v0.3-云端数据基础.md)。当前版本尚未开启 localStorage 一键迁移、JD/计划/证据的云端 Repository 和私有文件 Storage。

## 公网演示

- 产品地址：<https://jobproof-mvp.netlify.app>
- 知乎用户中心：<https://jobproof-mvp.netlify.app/account>
- 知乎 OAuth 回调地址：<https://jobproof-mvp.netlify.app/api/auth/callback>

公网地址用于演示；真实知乎账号 OAuth 联调和 Supabase 生产配置仍需在 Netlify、知乎开放平台和 Supabase 控制台完成。

## 本地开发

要求 Node.js 22 LTS 或更高版本。

```bash
npm ci
npm run dev
```

打开 <http://localhost:3000>。

常用命令：

```bash
npm run typecheck  # TypeScript 类型检查
npm run lint       # ESLint
npm run build      # 生产构建
```

## 页面与接口

主要页面：

| 路径 | 用途 |
| --- | --- |
| `/` | 产品入口 |
| `/onboarding` | 能力画像 onboarding |
| `/dashboard` | 能力、计划、证据和岗位概览 |
| `/jobs` | 粘贴 JD 并查看匹配分析 |
| `/plan` | 配置和执行 7/14 天微项目 |
| `/evidence` | 提交成果并检查证据完整度 |
| `/expressions` | 生成和编辑求职表达 |
| `/account` | 知乎登录、用户信息、关注和创作列表 |

服务端 Route Handlers：

| 方法与路径 | 说明 |
| --- | --- |
| `POST /api/jobs/analyze` | 校验 JD 和画像，返回能力拆解与匹配解释 |
| `GET /api/auth/login` | 发起知乎 OAuth |
| `GET /api/auth/callback` | 校验 state 并创建服务端会话 |
| `GET /api/auth/me` | 返回当前会话中的知乎基础信息 |
| `POST /api/auth/logout` | 删除当前知乎会话 |
| `GET /api/zhihu/followees` | 获取授权用户的公开关注列表 |
| `GET /api/zhihu/contents` | 获取授权用户的公开创作列表 |
| `POST /api/auth/supabase/magic-link` | 发送 Supabase Magic Link |
| `GET /api/auth/supabase/callback` | 建立 Supabase 登录会话 |
| `POST /api/auth/supabase/logout` | 退出 Supabase 登录会话 |
| `GET/PUT /api/profile` | 读取/保存云端能力画像 |

接口失败、未登录、空数据和未配置凭证时，页面会显示对应的降级状态；不会把鉴权失败伪装成空结果。

## 环境变量

复制模板：

```bash
cp .env.example .env.local
```

| 变量 | 用途 | 必填 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | 页面应用名称 | 否 |
| `NEXT_PUBLIC_APP_URL` | 知乎 OAuth 回调重定向使用的应用地址 | 生产环境建议填写 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 使用云端账号时必填 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key | 使用云端账号时必填 |
| `ZHIHU_OAUTH_APP_ID` | 知乎 OAuth App ID | 使用知乎登录时必填 |
| `ZHIHU_OAUTH_APP_KEY` | 知乎 OAuth App Key | 使用知乎登录时必填 |
| `ZHIHU_OAUTH_REDIRECT_URI` | 知乎后台登记的 OAuth 回调地址 | 使用知乎登录时必填 |
| `ZHIHU_ACCESS_SECRET` | 服务端调用知乎用户数据接口 | 使用关注/创作列表时必填 |

生产环境只配置 Supabase publishable/anon key，不要把 service role key 放入前端、Git 或普通环境变量。知乎 App Key、Access Secret 和 OAuth Token 也只能保留在服务端配置中。

本地知乎回调示例：

```text
ZHIHU_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

生产回调必须使用 HTTPS，并与知乎开放平台及赛事页面登记的值完全一致。未配置 OAuth 或 Supabase 时，页面会显示配置提示，核心的本地流程仍可使用。

## 部署到 Netlify

部署到 Netlify 时，将仓库根目录设置为项目目录，构建命令设置为：

```text
npm run build
```

生产环境按需配置知乎和 Supabase 变量。部署完成后，至少检查首页、`/jobs`、`/account` 的未配置提示，以及 `/api/auth/me` 和 `/api/profile` 的未登录响应。

## 项目结构

```text
app/              页面与 Next.js Route Handlers
components/       可复用交互组件
lib/              Domain Schema、Repository、匹配、计划、证据、知乎和 Supabase 服务
docs/             PRD、技术设计、项目计划书和迭代路线图
supabase/         数据库迁移与 RLS 策略
```

## 文档

- [产品需求文档](docs/产品需求文档-PRD.md)
- [技术设计文档](docs/技术设计文档.md)
- [项目详情计划书](docs/项目详情计划书.md)
- [v0.2 迭代路线图](docs/迭代路线图-v0.2.md)
- [产品与技术设计](docs/JobProof-产品与技术设计.md)
- [v0.3 云端数据基础](docs/v0.3-云端数据基础.md)

## 黑客松提交检查

提交前确认：

1. 公网 Demo 可以完成：输入 JD → 查看缺口 → 创建微项目 → 提交证据 → 生成表达。
2. 项目名称、赛道、介绍、封面、图标和计划书均已填写。
3. OAuth 回调地址与知乎后台及赛事页面登记值完全一致。
4. 线上环境变量已配置，仓库中没有 App Key、Access Secret、service role key 或 OAuth Token。
5. 未授权、接口失败、空数据和凭证不可用时都有可理解的提示。
6. 代码仓库和演示视频（如提供）均可被评委访问。
