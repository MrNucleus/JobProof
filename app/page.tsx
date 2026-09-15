import Link from "next/link";

export default function HomePage() {
  return <>
    <section className="hero">
      <div className="card hero-main">
        <div className="eyebrow">JOBPROOF · 能力证据工坊</div>
        <h1>别只说你会。<br/>做出能证明的证据。</h1>
        <p className="lead">从一份目标岗位 JD 出发，确认你已有的能力，找到真正的缺口，再用 7 天微项目把缺口变成简历、作品集和面试能讲的成果。</p>
        <div className="hero-actions"><Link className="btn btn-primary" href="/onboarding">开始确认能力 →</Link><Link className="btn btn-secondary" href="/jobs">我已有目标 JD</Link></div>
      </div>
      <div className="card hero-side">
        <h2>一次完整的能力转化</h2>
        <div className="step"><span className="step-n">1</span><div><b>确认个人能力</b><small>区分自评与真实证据</small></div></div>
        <div className="step"><span className="step-n">2</span><div><b>读懂目标 JD</b><small>每个要求都回链原文</small></div></div>
        <div className="step"><span className="step-n">3</span><div><b>完成微项目</b><small>有交付物、有验收标准</small></div></div>
        <div className="step"><span className="step-n">4</span><div><b>生成求职证据</b><small>简历、作品集、面试故事</small></div></div>
      </div>
    </section>
    <div className="section-head"><h2>v0.2 解决三个关键问题</h2><p>聚焦产品与运营实习</p></div>
    <section className="feature-grid">
      <div className="card feature"><div className="feature-mark">◎</div><h3>我究竟会什么？</h3><p>能力和证据分开确认，没有证据的能力会被标记为待验证。</p></div>
      <div className="card feature"><div className="feature-mark">↗</div><h3>这份 JD 适合我吗？</h3><p>展示匹配点、能力缺口和硬性风险，不提供黑箱式推荐。</p></div>
      <div className="card feature"><div className="feature-mark">✓</div><h3>下一步具体做什么？</h3><p>把抽象的“提升能力”变成 7 天可完成、可验收的任务包。</p></div>
    </section>
  </>;
}
