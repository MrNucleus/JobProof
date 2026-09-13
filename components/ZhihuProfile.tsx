"use client";

import { useCallback, useEffect, useState } from "react";
import type { ZhihuContentItem, ZhihuFollowee, ZhihuPage, ZhihuUser } from "@/lib/zhihu/types";

type SessionResult = { authenticated: boolean; user?: ZhihuUser };
type ListState<T> = { items: T[]; nextOffset: string | null; isEnd: boolean; loading: boolean; error: string };

const initialList = { items: [], nextOffset: "0", isEnd: false, loading: false, error: "" };

export default function ZhihuProfile({ oauthError }: { oauthError?: string }) {
  const [session, setSession] = useState<SessionResult | null>(null);
  const [followees, setFollowees] = useState<ListState<ZhihuFollowee>>(initialList);
  const [contents, setContents] = useState<ListState<ZhihuContentItem>>(initialList);

  const loadPage = useCallback(async <T,>(endpoint: string, state: ListState<T>, setter: (value: ListState<T>) => void) => {
    if (state.loading || state.isEnd || state.nextOffset == null) return;
    setter({ ...state, loading: true, error: "" });
    try {
      const response = await fetch(`${endpoint}?offset=${encodeURIComponent(state.nextOffset)}`, { cache: "no-store" });
      const result = await response.json() as ZhihuPage<T> & { message?: string };
      if (!response.ok) throw new Error(result.message || "数据获取失败");
      setter({
        items: [...state.items, ...result.items],
        nextOffset: result.paging.nextOffset,
        isEnd: result.paging.isEnd,
        loading: false,
        error: ""
      });
    } catch (reason) {
      setter({ ...state, loading: false, error: reason instanceof Error ? reason.message : "数据获取失败" });
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/zhihu/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: SessionResult) => setSession(result));
  }, []);

  useEffect(() => {
    if (!session?.authenticated) return;
    void loadPage("/api/zhihu/followees", followees, setFollowees);
    void loadPage("/api/zhihu/contents", contents, setContents);
    // Load the first page once after authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.authenticated]);

  async function logout() {
    await fetch("/api/auth/zhihu/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (!session) return <div className="loading-panel">正在读取知乎登录信息…</div>;
  if (!session.authenticated || !session.user) return (
    <section className="card login-gate">
      <div className="zhihu-logo">知</div>
      <h1>连接你的知乎账号</h1>
      <p>登录后可以在 JobProof 查看你的公开创作和关注列表。授权 Token 只保存在服务端会话中。</p>
      {oauthError && <div className="error">{oauthError}</div>}
      <a className="btn btn-primary" href="/api/auth/zhihu/login">使用知乎登录</a>
    </section>
  );

  const user = session.user;
  return (
    <>
      <section className="profile-hero">
        {user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.fullname} 的头像`} /> : <div className="profile-avatar-fallback">{user.fullname.slice(0, 1)}</div>}
        <div>
          <div className="eyebrow">ZHIHU PROFILE</div>
          <h1>{user.fullname}</h1>
          <p>{user.headline || "这位用户还没有填写个人介绍"}</p>
          {user.description && <small>{user.description}</small>}
        </div>
        <div className="profile-actions">
          {user.url && <a className="btn btn-secondary" href={user.url} target="_blank" rel="noreferrer">知乎主页</a>}
          <button className="btn btn-link" onClick={logout}>退出登录</button>
        </div>
      </section>

      <section className="profile-section">
        <div className="section-head"><div><h2>关注的人</h2><p>共加载 {followees.items.length} 人</p></div></div>
        {followees.error && <div className="error">{followees.error}</div>}
        <div className="follow-grid">
          {followees.items.map((item) => <a className="follow-item" href={item.url} target="_blank" rel="noreferrer" key={item.urlToken}>
            {item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : <span>{item.fullname.slice(0, 1)}</span>}
            <div><b>{item.fullname}</b><p>{item.headline || "暂无个人介绍"}</p><small>{item.followerCount.toLocaleString("zh-CN")} 位关注者</small></div>
          </a>)}
        </div>
        {!followees.items.length && !followees.loading && !followees.error && <p className="muted">暂无可展示的关注用户。</p>}
        {!followees.isEnd && <button className="btn btn-secondary load-more" disabled={followees.loading} onClick={() => loadPage("/api/zhihu/followees", followees, setFollowees)}>{followees.loading ? "加载中…" : "加载更多"}</button>}
      </section>

      <section className="profile-section">
        <div className="section-head"><div><h2>创作信息</h2><p>回答、文章、视频、想法与问题</p></div></div>
        {contents.error && <div className="error">{contents.error}</div>}
        <div className="content-list">
          {contents.items.map((item, index) => <a className="content-item" href={item.url} target="_blank" rel="noreferrer" key={`${item.url}-${index}`}>
            <div className="content-type">{contentTypeName(item.contentType)}</div>
            <div><h3>{item.title}</h3><p>{item.summary || "打开知乎查看完整内容"}</p><small>{formatDate(item.createdAt)} · {item.likeCount} 赞同 · {item.commentCount} 评论 · {item.favoriteCount} 收藏</small></div>
          </a>)}
        </div>
        {!contents.items.length && !contents.loading && !contents.error && <p className="muted">暂无可展示的公开创作。</p>}
        {!contents.isEnd && <button className="btn btn-secondary load-more" disabled={contents.loading} onClick={() => loadPage("/api/zhihu/contents", contents, setContents)}>{contents.loading ? "加载中…" : "加载更多"}</button>}
      </section>
    </>
  );
}

function contentTypeName(type: string) {
  return ({ answer: "回答", article: "文章", zvideo: "视频", pin: "想法", question: "问题" } as Record<string, string>)[type] || "创作";
}

function formatDate(timestamp: number) {
  return timestamp ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(timestamp * 1000) : "时间未知";
}
