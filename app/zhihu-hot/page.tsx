import HotList from "@/components/HotList";

export const metadata = {
  title: "知乎热榜 · JobProof",
  description: "查看知乎当前热榜，发现值得转化为能力项目的真实议题"
};

export default function ZhihuHotPage() {
  return (
    <>
      <div className="section-head hot-heading">
        <div>
          <div className="eyebrow">ZHIHU HOT</div>
          <h1 className="page-title">知乎热榜</h1>
          <p className="page-subtitle">从真实讨论中发现行业议题，也为调研、分析和内容项目寻找素材。</p>
        </div>
        <a className="btn btn-secondary" href="https://www.zhihu.com/hot" target="_blank" rel="noreferrer">打开知乎 ↗</a>
      </div>
      <HotList />
    </>
  );
}
