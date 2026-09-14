"use client";
/* External Zhihu avatars are rendered directly so arbitrary provider hosts are not proxied by the app. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
type User = { fullname: string; avatarPath: string; headline: string };
export default function AuthMenu() {
  const [user, setUser] = useState<User | null>(null); const [open, setOpen] = useState(false);
  useEffect(() => { fetch("/api/auth/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => { if (d?.authenticated) setUser(d.user); }).catch(() => undefined); }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setOpen(false); }
  if (!user) return <Link className="auth-login" href="/api/auth/login">知乎登录</Link>;
  return <div className="auth-menu"><button className="auth-avatar-button" onClick={() => setOpen(v => !v)} aria-label="打开知乎用户菜单" aria-expanded={open}>{user.avatarPath ? <img src={user.avatarPath} alt="" /> : <span>{user.fullname.slice(0, 1)}</span>}</button>{open && <div className="auth-popover"><Link href="/account" onClick={() => setOpen(false)}><b>{user.fullname}</b><small>{user.headline || "查看知乎个人主页"}</small></Link><button onClick={logout}>退出登录</button></div>}</div>;
}
