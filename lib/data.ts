import { CompetencyKey, UserProfile } from "./types";

export const competencyCatalog: Array<{
  key: CompetencyKey;
  name: string;
  description: string;
}> = [
  { key: "research", name: "信息搜集", description: "找到并整理一手资料，判断来源可靠性" },
  { key: "interview", name: "用户访谈", description: "设计问题、开展访谈并提炼需求" },
  { key: "competitor", name: "竞品分析", description: "比较产品、用户、数据和商业模式" },
  { key: "data", name: "数据整理", description: "使用表格清洗、分类、统计并解释数据" },
  { key: "content", name: "内容策划", description: "围绕受众、主题与渠道产出内容" },
  { key: "delivery", name: "项目推进", description: "拆解任务、协作跟进并按时交付" },
  { key: "communication", name: "表达与汇报", description: "清晰呈现过程、结论和建议" },
  { key: "tools", name: "工具使用", description: "用 Excel、飞书或 Figma 完成工作" }
];

export const defaultProfile: UserProfile = {
  name: "新同学",
  grade: "大二",
  major: "市场营销",
  cities: "上海、杭州、远程",
  weeklyHours: 5,
  roleFamilies: ["产品", "运营"],
  competencies: competencyCatalog.map((item, index) => ({
    key: item.key,
    level: index === 0 || index === 2 ? 2 : index === 3 || index === 5 ? 1 : 0,
    evidenceLevel: index === 0 || index === 2 ? 1 : 0,
    interest: index === 1 || index === 2 ? "like" : "neutral",
    evidenceNote: index === 0 ? "整理过课程行业资料" : index === 2 ? "做过校园产品竞品对比" : ""
  }))
};

export const exampleJd = `产品运营实习生
负责用户调研与需求分析，协助完成产品竞品分析；
整理业务数据并输出周报，跟进运营项目进度；
协助策划校园用户增长活动，复盘活动效果；
熟练使用 Excel、飞书等办公工具，有良好的沟通表达能力。`;

export const recommendedJobs = [
  { title: "产品运营实习生", company: "消费科技团队", city: "上海", score: 86, tags: ["用户调研", "竞品分析"] },
  { title: "内容运营实习生", company: "在线教育平台", city: "远程", score: 79, tags: ["内容策划", "数据复盘"] },
  { title: "用户增长实习生", company: "互联网创业团队", city: "杭州", score: 74, tags: ["活动运营", "数据整理"] }
];
