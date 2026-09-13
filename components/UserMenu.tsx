"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ZhihuUser } from "@/lib/zhihu/types";

export default function UserMenu() {
  const [user, setUser] = useState<ZhihuUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/zhihu/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setUser(result.authenticated ? result.user : null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <span className="user-menu-skeleton" aria-label="正在读取登录状态" />;
  if (!user) return <a className="zhihu-login" href="/api/auth/zhihu/login">知乎登录</a>;

  return (
    <Link className="user-menu" href="/zhihu-profile" aria-label={`进入 ${user.fullname} 的知乎用户中心`}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user.fullname.slice(0, 1)}</span>}
      <b>{user.fullname}</b>
    </Link>
  );
}
