"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getOnboardingReadiness } from "@/lib/onboarding";
import { profileFingerprint } from "@/lib/profile-fingerprint";
import { loadProfile, saveProfile } from "@/lib/repository";
import type { UserProfile } from "@/lib/types";

type CloudUser = { id: string; email: string; createdAt: string };
type AccountResponse = { configured: boolean; authenticated: boolean; user?: CloudUser };
type ProfileResponse = {
  profile: UserProfile | null;
  onboardingStatus: "in_progress" | "profile_ready" | "first_action_selected";
  updatedAt?: string;
  syncedAt?: string;
  message?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && typeof data.message === "string" ? data.message : "请求失败，请稍后重试。";
    throw new Error(message);
  }
  return data as T;
}

function profileSummary(profile: UserProfile) {
  return {
    filled: profile.competencies.filter((item) => item.level > 0).length,
    evidence: profile.competencies.filter((item) => item.evidenceLevel > 0).length
  };
}

function formatTime(value?: string) {
  if (!value) return "尚未同步";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "已同步";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function CloudProfilePanel() {
  const [email, setEmail] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [cloudProfile, setCloudProfile] = useState<UserProfile | null>(null);
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string>();
  const [cloudStatus, setCloudStatus] = useState<ProfileResponse["onboardingStatus"]>("in_progress");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"login" | "upload" | "download" | "logout" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const localSummary = useMemo(() => localProfile ? profileSummary(localProfile) : null, [localProfile]);
  const cloudSummary = useMemo(() => cloudProfile ? profileSummary(cloudProfile) : null, [cloudProfile]);
  const hasConflict = Boolean(localProfile && cloudProfile && profileFingerprint(localProfile) !== profileFingerprint(cloudProfile));
  const isSame = Boolean(localProfile && cloudProfile && !hasConflict);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const account = await readJson<AccountResponse>(await fetch("/api/auth/supabase/me", { cache: "no-store" }));
      setConfigured(account.configured);
      setUser(account.authenticated && account.user ? account.user : null);
      if (account.authenticated) {
        const cloud = await readJson<ProfileResponse>(await fetch("/api/profile", { cache: "no-store" }));
        setCloudProfile(cloud.profile);
        setCloudStatus(cloud.onboardingStatus);
        setCloudUpdatedAt(cloud.updatedAt);
      } else {
        setCloudProfile(null);
        setCloudUpdatedAt(undefined);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "云端状态读取失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLocalProfile(loadProfile());
    const params = new URLSearchParams(window.location.search);
    if (params.get("cloud") === "connected") setNotice("云端账号登录成功。现在可以选择上传或下载画像。");
    const cloudError = params.get("error");
    if (cloudError?.startsWith("cloud_auth")) setError("云端账号登录失败，请重新获取登录链接。");
    void refresh();
  }, []);

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    setWorking("login");
    setError("");
    setNotice("");
    try {
      await readJson<{ sent: true }>(await fetch("/api/auth/supabase/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }));
      setNotice("登录链接已发送，请在同一台设备上打开邮件完成登录。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录链接发送失败。");
    } finally {
      setWorking(null);
    }
  }

  async function uploadLocalProfile() {
    if (!localProfile) return;
    if (hasConflict && !window.confirm("云端已有不同的能力画像。确定用此设备的数据覆盖云端版本吗？")) return;
    setWorking("upload");
    setError("");
    setNotice("");
    try {
      const readiness = getOnboardingReadiness(localProfile);
      const result = await readJson<ProfileResponse>(await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: localProfile,
          onboardingStatus: readiness.fullyConfirmed ? "profile_ready" : "in_progress"
        })
      }));
      setCloudProfile(result.profile);
      setCloudStatus(result.onboardingStatus);
      setCloudUpdatedAt(result.syncedAt || result.updatedAt);
      setNotice("此设备的能力画像已安全上传到云端。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "画像上传失败。");
    } finally {
      setWorking(null);
    }
  }

  function downloadCloudProfile() {
    if (!cloudProfile) return;
    if (hasConflict && !window.confirm("此操作会覆盖当前设备上的能力画像。确定使用云端版本吗？")) return;
    setWorking("download");
    saveProfile(cloudProfile);
    setLocalProfile(cloudProfile);
    window.dispatchEvent(new CustomEvent("jobproof:profile-synced"));
    setNotice("云端画像已保存到此设备。若能力内容发生变化，请重新完成最终确认。");
    setError("");
    setWorking(null);
  }

  async function logout() {
    setWorking("logout");
    setError("");
    try {
      await fetch("/api/auth/supabase/logout", { method: "POST" });
      setUser(null);
      setCloudProfile(null);
      setCloudUpdatedAt(undefined);
      setNotice("已退出云端账号，本地数据仍保留在此设备上。");
    } catch {
      setError("退出失败，请稍后重试。");
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className="card cloud-account-card">
      <div className="cloud-account-head">
        <div>
          <span className="eyebrow">JOBPROOF CLOUD</span>
          <h1>云端账号与能力画像</h1>
          <p>邮箱登录用于跨设备保存 JobProof 数据；它与你的知乎授权相互独立。</p>
        </div>
        <span className={`cloud-status ${user ? "online" : ""}`}>
          {loading ? "正在检查" : user ? "云端已连接" : configured ? "尚未登录" : "尚未配置"}
        </span>
      </div>

      {error && <div className="error cloud-message">{error}</div>}
      {notice && <div className="success-note cloud-message">{notice}</div>}

      {!loading && configured === false && (
        <div className="cloud-empty">Supabase 环境变量尚未配置，当前仍可继续使用本地版。</div>
      )}

      {!loading && configured && !user && (
        <div className="cloud-login-layout">
          <div>
            <h2>用邮箱连接云端</h2>
            <p>无需设置密码。我们会发送一次性登录链接到你的邮箱。</p>
          </div>
          <form className="cloud-login-form" onSubmit={sendMagicLink}>
            <label htmlFor="cloud-email">邮箱地址</label>
            <div>
              <input id="cloud-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required />
              <button className="btn btn-primary" disabled={working === "login"}>{working === "login" ? "发送中…" : "发送登录链接"}</button>
            </div>
          </form>
        </div>
      )}

      {!loading && user && localProfile && (
        <>
          <div className="cloud-user-row">
            <div className="cloud-user-icon">@</div>
            <div><b>{user.email || "已登录用户"}</b><small>你的 JobProof 云端账号</small></div>
            <button className="btn btn-link" onClick={logout} disabled={working === "logout"}>{working === "logout" ? "退出中…" : "退出云端账号"}</button>
          </div>

          {hasConflict && <div className="cloud-conflict"><b>检测到两个不同版本</b><span>请选择保留此设备画像，或使用云端画像；JobProof 不会自动覆盖。</span></div>}
          {isSame && <div className="cloud-in-sync">✓ 此设备与云端能力画像一致</div>}

          <div className="cloud-compare">
            <article>
              <span className="cloud-source">此设备</span>
              <h3>{localProfile.name}</h3>
              <p>{localProfile.grade} · {localProfile.major}</p>
              <div className="cloud-stats"><span><b>{localSummary?.filled}</b>/8 项能力</span><span><b>{localSummary?.evidence}</b> 项有证据</span></div>
              <button className="btn btn-primary full" onClick={uploadLocalProfile} disabled={Boolean(working)}>{working === "upload" ? "正在上传…" : cloudProfile ? "保留此设备版本" : "上传到云端"}</button>
            </article>
            <div className="cloud-direction">⇄</div>
            <article className={!cloudProfile ? "empty-version" : ""}>
              <span className="cloud-source">云端</span>
              {cloudProfile ? <>
                <h3>{cloudProfile.name}</h3>
                <p>{cloudProfile.grade} · {cloudProfile.major}</p>
                <div className="cloud-stats"><span><b>{cloudSummary?.filled}</b>/8 项能力</span><span><b>{cloudSummary?.evidence}</b> 项有证据</span></div>
                <button className="btn btn-secondary full" onClick={downloadCloudProfile} disabled={Boolean(working) || isSame}>{working === "download" ? "正在下载…" : isSame ? "已是当前版本" : "使用云端版本"}</button>
              </> : <>
                <h3>还没有云端画像</h3>
                <p>首次上传后即可在其他设备取回。</p>
                <div className="cloud-stats"><span>等待首次同步</span></div>
              </>}
            </article>
          </div>
          <div className="cloud-meta">云端状态：{cloudStatus === "profile_ready" ? "能力画像已确认" : "能力画像待确认"} · 最近云端更新：{formatTime(cloudUpdatedAt)}</div>
        </>
      )}
    </section>
  );
}
