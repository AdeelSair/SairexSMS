"use client";

import { useDailyOperations } from "@/lib/hooks/useDailyOperations";
import { DailyOpsSkeleton } from "@/components/dashboard/DailyOpsSkeleton";
import { AlertsPanel } from "@/components/dashboard/alerts/AlertsPanel";
import { KpiGrid } from "@/components/dashboard/kpi/KpiGrid";
import { FinanceStream } from "@/components/dashboard/finance/FinanceStream";
import { TaskPanel } from "@/components/dashboard/tasks/TaskPanel";
import { QuickActionsPanel } from "@/components/dashboard/actions/QuickActionsPanel";

export default function DailyOperationsPage() {
  const { data, isLoading, isError } = useDailyOperations();

  if (isLoading) return <DailyOpsSkeleton />;
  if (isError) {
    return (
      <div className="p-6">
        <div className="space-y-2 rounded-xl border p-6 text-center">
          <p className="font-semibold">Dashboard failed to load</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Operations</h1>
        <p className="text-muted-foreground">Real-time control center for today</p>
      </div>

      <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
        Snapshot loaded - {data?.tasks.length ?? 0} actionable task(s)
      </div>

      <div className="grid gap-6 transition-opacity duration-300 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <AlertsPanel alerts={data.alerts} />
        </div>
        <div className="space-y-6 lg:col-span-6">
          <KpiGrid kpis={data.kpis} />
          <FinanceStream finance={data.financeToday} />
        </div>
        <div className="space-y-6 lg:col-span-3">
          <TaskPanel tasks={data.tasks} />
          <QuickActionsPanel role={data.role} />
        </div>
      </div>
    </div>
  );
}
