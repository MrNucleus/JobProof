import Link from "next/link";

const steps = [
  { index: 1, label: "基本背景", href: "/onboarding/background" },
  { index: 2, label: "能力自评", href: "/onboarding/abilities" },
  { index: 3, label: "事实确认", href: "/onboarding/evidence" },
  { index: 4, label: "选择入口", href: "/onboarding/complete" }
];

export function OnboardingProgress({ current }: { current: number }) {
  return (
    <div className="progress" aria-label="注册进度">
      {steps.map(step => (
        <Link
          key={step.index}
          href={step.href}
          className={step.index <= current ? "active" : ""}
          aria-current={step.index === current ? "step" : undefined}
        >
          {step.index} {step.label}
        </Link>
      ))}
    </div>
  );
}
