import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AuthMenu from "@/components/AuthMenu";

export const metadata: Metadata = {
  title: "JobProof · 能力证据工坊",
  description: "把目标岗位 JD 转化为可验证能力和求职证据"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <div className="container">
            <nav className="nav">
              <Link className="brand" href="/">Job<span>Proof</span></Link>
              <div className="nav-links">
                <Link href="/onboarding">能力确认</Link>
                <Link href="/dashboard">个人中心</Link>
                <Link href="/jobs">分析 JD</Link>
                <Link href="/plan">微项目</Link>
                <Link href="/evidence">证据</Link>
                <Link href="/expressions">求职表达</Link>
                <Link href="/zhihu-hot">知乎热榜</Link>
              </div>
              <AuthMenu />
            </nav>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
