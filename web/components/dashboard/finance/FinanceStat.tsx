type FinanceStatProps = {
  label: string;
  value: string | number;
};

export function FinanceStat({ label, value }: FinanceStatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
