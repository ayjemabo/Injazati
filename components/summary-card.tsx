import type { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

export function SummaryCard({ label, value, hint, icon }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <div className="summary-icon">{icon}</div>
      <div>
        <p className="summary-label">{label}</p>
        <strong className="summary-value">{value}</strong>
        {hint ? <p className="summary-hint">{hint}</p> : null}
      </div>
    </article>
  );
}
