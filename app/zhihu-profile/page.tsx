import ZhihuProfile from "@/components/ZhihuProfile";

export const metadata = {
  title: "知乎用户中心 · JobProof",
  description: "查看已授权知乎用户的基础资料、关注用户和公开创作"
};

export default function ZhihuProfilePage({ searchParams }: { searchParams: { error?: string } }) {
  return <ZhihuProfile oauthError={searchParams.error} />;
}
