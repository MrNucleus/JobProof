import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const required = [
  "app/page.tsx",
  "app/api/jobs/analyze/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/callback/route.ts",
  "app/api/auth/me/route.ts",
  "app/api/auth/logout/route.ts",
  "app/api/zhihu/hot/route.ts",
  "app/api/zhihu/followees/route.ts",
  "app/api/zhihu/contents/route.ts",
  "lib/zhihu-oauth.ts",
  "lib/zhihu-session.ts",
  "docs/项目详情计划书.md",
  "public/jobproof-cover-16x9-final.png",
  "public/jobproof-icon-centered.png",
  "netlify.toml"
];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error(`缺少 v0.2 结构文件:\n${missing.join("\n")}`);
  process.exit(1);
}

const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
const requiredIgnores = [".env", ".env.local", ".netlify/", "node_modules/", ".next/"];
const missingIgnores = requiredIgnores.filter((entry) => !gitignore.split(/\r?\n/).includes(entry));
if (missingIgnores.length) {
  console.error(`.gitignore 缺少敏感或生成目录规则: ${missingIgnores.join(", ")}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (packageJson.version !== "0.2.0") {
  console.error(`package.json 版本应为 0.2.0，实际为 ${packageJson.version}`);
  process.exit(1);
}

console.log(`结构检查通过：${required.length} 个 v0.2 入口、文档与交付素材齐全。`);
