"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { generateExpression } from "@/lib/expression-service";
import { evidenceRepository, expressionRepository } from "@/lib/repository";
import { Evidence, Expression } from "@/lib/types";

const formatMeta: Record<Expression["format"], { label: string; description: string }> = {
  resume: { label: "简历 bullet", description: "一至两条，突出动作、方法和结果" },
  portfolio: { label: "作品集案例", description: "按背景、过程、结果、反思组织" },
  interview: { label: "面试 STAR", description: "用事实讲清情境、任务、行动和结果" }
};

function queryEvidenceId() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("evidenceId") || "";
}

export default function ExpressionsPage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [format, setFormat] = useState<Expression["format"]>("resume");
  const [expression, setExpression] = useState<Expression | null>(null);
  const [saved, setSaved] = useState<Expression[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const items = evidenceRepository.list();
    const expressions = expressionRepository.list();
    const requested = queryEvidenceId();
    setEvidence(items);
    setSaved(expressions);
    setSelectedId(requested && items.some(item => item.id === requested) ? requested : items[0]?.id || "");
  }, []);

  const selectedEvidence = useMemo(() => evidence.find(item => item.id === selectedId) || null, [evidence, selectedId]);
  const sourceExpressions = saved.filter(item => item.evidenceId === selectedId);

  function generate() {
    if (!selectedEvidence) return;
    const existing = sourceExpressions.find(item => item.format === format);
    setExpression(generateExpression(selectedEvidence, format, existing?.id));
    setNotice("");
  }

  function loadSaved(item: Expression) {
    setFormat(item.format);
    setExpression(item);
    setSelectedId(item.evidenceId);
    setNotice("");
  }

  function save() {
    if (!expression) return;
    expressionRepository.save({ ...expression, status: "draft" });
    setSaved(expressionRepository.list());
    setNotice("草稿已保存。确认事实后，再将它用于正式投递。");
  }

  if (!evidence.length) return <section className="card empty-state expressions-empty"><h1>还没有证据记录</h1><p>先完成一项微项目任务并提交成果，再生成求职表达。</p><Link className="btn btn-primary" href="/evidence">去提交第一份证据 →</Link></section>;

  return <>
    <div className="section-head" style={{ marginTop: 0 }}><div><h1 className="page-title">求职表达工作台</h1><p className="page-subtitle" style={{ marginBottom: 0 }}>从真实证据生成草稿，所有缺失事实都会明确标记。</p></div><Link className="btn btn-secondary" href="/evidence">返回证据库</Link></div>
    <div className="expressions-layout">
      <aside className="entry-column">
        <section className="card panel expression-source"><div className="card-head"><h3>选择证据</h3><span className="muted">{evidence.length} 条</span></div>{evidence.map(item => <button key={item.id} className={"source-evidence " + (selectedId === item.id ? "selected" : "")} onClick={() => { setSelectedId(item.id); setExpression(null); setNotice(""); }}><b>{item.title}</b><small>{item.completenessScore}% 完整 · {item.status === "ready" ? "可用" : item.status === "needs_more_facts" ? "待补事实" : "草稿"}</small></button>)}</section>
        <section className="card panel expression-saved"><div className="card-head"><h3>已保存草稿</h3><span className="muted">{saved.length} 条</span></div>{saved.length ? saved.slice().reverse().map(item => <button key={item.id} className="saved-expression" onClick={() => loadSaved(item)}><span><b>{formatMeta[item.format].label}</b><small>{evidence.find(source => source.id === item.evidenceId)?.title || "已删除证据"}</small></span><span>打开 →</span></button>) : <p className="muted">生成后可在这里继续编辑。</p>}</section>
      </aside>
      <section className="card panel expression-editor">{selectedEvidence && <><div className="expression-context"><span className="step-kicker">SOURCE EVIDENCE</span><b>{selectedEvidence.title}</b><small>完整度 {selectedEvidence.completenessScore}% · 生成结果仅可使用这份证据中的事实</small></div><div className="format-tabs">{(Object.keys(formatMeta) as Expression["format"][]).map(item => <button key={item} className={format === item ? "selected" : ""} onClick={() => { setFormat(item); setExpression(null); setNotice(""); }}><b>{formatMeta[item].label}</b><small>{formatMeta[item].description}</small></button>)}</div>{expression ? <><div className="field"><label>可编辑草稿</label><textarea className="expression-textarea" value={expression.content} onChange={event => setExpression({ ...expression, content: event.target.value })} /></div><p className="trace-note">来源证据：{selectedEvidence.title} · {selectedEvidence.status === "ready" ? "已标记可用" : "仍有事实待补充"}。AI/规则只负责组织文字，不会补写你的经历。</p><div className="actions"><button className="btn btn-secondary" onClick={() => setExpression(null)}>重新生成</button><button className="btn btn-primary" onClick={save}>保存草稿</button></div></> : <div className="expression-generate"><div className="expression-icon">✦</div><h2>生成{formatMeta[format].label}</h2><p>{formatMeta[format].description}。缺失字段会保留“待补充”。</p><button className="btn btn-primary" onClick={generate}>生成可编辑草稿 →</button></div>}{notice && <p className="success-note">{notice}</p>}</>}
      </section>
    </div>
  </>;
}
