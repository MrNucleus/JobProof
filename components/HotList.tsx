"use client";
/* External Zhihu thumbnails are rendered directly so arbitrary provider hosts are not proxied by the app. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import type { ZhihuHotItem } from "@/lib/zhihu-oauth";

export default function HotList() {
  const [items, setItems] = useState<ZhihuHotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/zhihu/hot?limit=20", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "热榜获取失败");
      setItems(result.items || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "热榜获取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="loading-panel">正在连接知乎热榜…</div>;
  if (error) return <div className="error-panel"><b>暂时无法获取热榜</b><p>{error}</p><button className="btn btn-secondary" onClick={load}>重新加载</button></div>;
  if (!items.length) return <div className="empty-state"><h2>热榜暂时为空</h2><p>稍后再来看看新的讨论。</p></div>;

  return (
    <ol className="hot-list">
      {items.map((item, index) => (
        <li className="hot-item" key={`${item.url}-${index}`}>
          <span className={`hot-rank ${index < 3 ? "top" : ""}`}>{index + 1}</span>
          <a href={item.url} target="_blank" rel="noreferrer" className="hot-copy">
            <h2>{item.title}</h2>
            <p>{item.summary || "打开知乎查看完整讨论"}</p>
            <span>在知乎查看</span>
          </a>
          {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : <div className="hot-placeholder">知乎</div>}
        </li>
      ))}
    </ol>
  );
}
