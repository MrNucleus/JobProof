import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const nextBin = join(root, "node_modules/next/dist/bin/next");
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: root,
  env: { ...process.env, NEXT_PUBLIC_APP_URL: origin },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`服务未能启动:\n${logs}`);
}

const competencyKeys = ["research", "interview", "competitor", "data", "content", "delivery", "communication", "tools"];
const profile = {
  name: "冒烟测试用户",
  grade: "大二",
  major: "市场营销",
  cities: "上海",
  weeklyHours: 5,
  roleFamilies: ["产品", "运营"],
  competencies: competencyKeys.map((key) => ({ key, level: 1, evidenceLevel: 0, interest: "neutral", evidenceNote: "" }))
};

try {
  await waitForServer();
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /JobProof/);

  const me = await fetch(`${origin}/api/auth/me`);
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { authenticated: false });

  const followees = await fetch(`${origin}/api/zhihu/followees`);
  assert.equal(followees.status, 401);

  const invalid = await fetch(`${origin}/api/jobs/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  assert.equal(invalid.status, 400);

  const analysis = await fetch(`${origin}/api/jobs/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jdText: "产品运营实习生，负责用户调研、需求分析、竞品分析和数据复盘，要求良好的沟通表达能力。",
      profile
    })
  });
  assert.equal(analysis.status, 200);
  const result = await analysis.json();
  assert.equal(typeof result.matchScore, "number");
  assert.ok(result.competencies.length >= 3);
  console.log("HTTP 冒烟测试通过：首页、JD 分析、未登录会话和知乎鉴权边界正常。");
} finally {
  server.kill("SIGTERM");
}
