import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: number | string;
  icon?: ReactNode;
};

export function KpiCard({ label, value, icon }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
