import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFileSync(join(root, file), "utf8");

test("v0.2 has one canonical auth protocol", () => {
  assert.ok(existsSync(join(root, "app/api/auth/login/route.ts")));
  assert.ok(existsSync(join(root, "app/api/auth/callback/route.ts")));
  assert.ok(!existsSync(join(root, "app/api/auth/zhihu/login/route.ts")));
  assert.ok(!existsSync(join(root, "app/zhihu-profile/page.tsx")));
});

test("deployment config is portable and secret-free", () => {
  const netlify = read("netlify.toml");
  const gitignore = read(".gitignore");
  assert.match(netlify, /command\s*=\s*"npm run build"/);
  assert.doesNotMatch(netlify, /\/Users\/|\/home\//);
  for (const entry of [".env", ".env.local", ".netlify/", "node_modules/", ".next/"]) {
    assert.ok(gitignore.split(/\r?\n/).includes(entry), `${entry} must be ignored`);
  }
});

test("v0.2 metadata and delivery assets are present", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "0.2.0");
  assert.ok(existsSync(join(root, "docs/项目详情计划书.md")));
  assert.ok(existsSync(join(root, "public/jobproof-cover-16x9-final.png")));
  assert.ok(existsSync(join(root, "public/jobproof-icon-centered.png")));
});
