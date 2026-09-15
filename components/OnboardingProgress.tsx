const steps = [
  { index: 1, label: "基本背景" },
  { index: 2, label: "能力自评" },
  { index: 3, label: "事实与证据" },
  { index: 4, label: "完成确认" }
];

export function OnboardingProgress({ current }: { current: number }) {
  return (
    <div className="progress" aria-label="能力确认进度">
      {steps.map(step => (
        <span
          key={step.index}
          className={`progress-item ${step.index === current ? "active" : step.index < current ? "complete" : "upcoming"}`}
          aria-current={step.index === current ? "step" : undefined}
        >
          {step.index} {step.label}
        </span>
      ))}
    </div>
  );
}
