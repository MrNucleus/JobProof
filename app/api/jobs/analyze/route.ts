import { NextResponse } from "next/server";
import { z } from "zod";
import { competencyCatalog } from "@/lib/data";
import { CompetencyKey, JobAnalysis, Level, UserProfile } from "@/lib/types";

const requestSchema = z.object({
  jdText: z.string().min(20).max(10000),
  profile: z.object({
    name:z.string(),grade:z.string(),major:z.string(),cities:z.string(),weeklyHours:z.number(),roleFamilies:z.array(z.string()),
    competencies:z.array(z.object({key:z.string(),level:z.number(),evidenceLevel:z.number(),interest:z.string(),evidenceNote:z.string()}))
  })
});

const rules: Array<{key:CompetencyKey;terms:string[]}> = [
  {key:"research",terms:["信息搜集","资料","行业研究","市场调研"]},
  {key:"interview",terms:["用户调研","用户访谈","需求分析","用户研究"]},
  {key:"competitor",terms:["竞品","竞争分析","市场分析"]},
  {key:"data",terms:["数据","周报","指标","复盘","excel","分析"]},
  {key:"content",terms:["内容","文案","策划","公众号","视频"]},
  {key:"delivery",terms:["跟进","推进","项目进度","协作","落地"]},
  {key:"communication",terms:["沟通","表达","汇报","协调"]},
  {key:"tools",terms:["excel","飞书","figma","sql","办公工具"]}
];

function sentenceFor(text:string,term:string){return text.split(/[。；;\n]/).map(s=>s.trim()).find(s=>s.toLowerCase().includes(term.toLowerCase()))||term;}

export async function POST(request:Request){
  const parsed=requestSchema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({message:"输入格式不正确"},{status:400});
  const {jdText,profile}=parsed.data as {jdText:string;profile:UserProfile};
  const found=rules.flatMap(rule=>{const term=rule.terms.find(t=>jdText.toLowerCase().includes(t.toLowerCase()));if(!term)return[];const cat=competencyCatalog.find(c=>c.key===rule.key)!;const user=profile.competencies.find(c=>c.key===rule.key);return[{key:rule.key,name:cat.name,importance:/负责|熟练|必须|要求/.test(sentenceFor(jdText,term))?"must" as const:"bonus" as const,jdQuote:sentenceFor(jdText,term),userLevel:(user?.level||0) as Level,gap:Math.max(0,2-(user?.level||0))}];});
  const competencies=found.length?found:rules.slice(0,3).map(rule=>{const cat=competencyCatalog.find(c=>c.key===rule.key)!;const user=profile.competencies.find(c=>c.key===rule.key);return{key:rule.key,name:cat.name,importance:"bonus" as const,jdQuote:"JD 描述较模糊，建议人工确认",userLevel:(user?.level||0) as Level,gap:Math.max(0,2-(user?.level||0))};});
  const weighted=competencies.reduce((sum,item)=>sum+Math.min(item.userLevel,2)/2,0)/competencies.length;
  const evidence=competencies.reduce((sum,item)=>sum+(profile.competencies.find(c=>c.key===item.key)?.evidenceLevel||0)/3,0)/competencies.length;
  const score=Math.round((weighted*.65+evidence*.35)*100);
  const strengths=competencies.filter(c=>c.gap===0).map(c=>`${c.name}达到可独立完成小任务的水平`);
  const gaps=competencies.filter(c=>c.gap>0).map(c=>`${c.name}还缺少可验证成果`);
  const result:JobAnalysis={title:jdText.split(/\n/).find(Boolean)?.slice(0,30)||"目标岗位",summary:`识别到 ${competencies.length} 项核心能力。当前画像与该岗位的基础匹配度为 ${score}%。`,competencies,matchScore:score,strengths,gaps,nextAction:gaps.length?`优先用 7 天微项目补强“${competencies.find(c=>c.gap>0)?.name}”，完成后再投递。`:"主要能力已经覆盖，可以开始针对 JD 整理简历证据。"};
  return NextResponse.json(result);
}

