"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import {
  PlanUsageCard,
  SxButton,
  SxDataTable,
  SxPageHeader,
  SxStatusBadge,
  type SxColumn,
} from "@/components/sx";

interface DashboardStat extends Record<string, unknown> {
  key: string;
  label: string;
  value: number | string;
  format?: "number" | "currency" | "percent";
}

interface DashboardStatsEnvelope {
  stats: DashboardStat[];
}

interface OrganizationModeEnvelope {
  organizationId: string | null;
  mode: "SIMPLE" | "PRO";
  isSimple: boolean;
  isSuperAdmin?: boolean;
}

interface OrganizationModeUpdateEnvelope {
  ok: boolean;
  organizationId: string;
  mode: "SIMPLE" | "PRO";
}

interface DemoSchoolResponse {
  ok: boolean;
  data: {
    organizationId: string;
    organizationName: string;
    demoRedirect: string;
  };
  error?: string;
}

const columns: SxColumn<DashboardStat>[] = [
  {
    key: "label",
    header: "Metric",
    render: (row) => <span className="font-medium">{row.label}</span>,
  },
  {
    key: "value",
    header: "Value",
    numeric: true,
    mono: true,
    render: (row) => <span className="font-data">{String(row.value)}</span>,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"SIMPLE" | "PRO" | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasOrganizationContext, setHasOrganizationContext] = useState(true);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const result = await api.get<DashboardStatsEnvelope>("/api/dashboard?view=stats");
    if (result.ok) {
      setStats(result.data.stats);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, []);

  const fetchMode = useCallback(async () => {
    const result = await api.get<OrganizationModeEnvelope>("/api/organizations/mode");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setIsSuperAdmin(Boolean(result.data.isSuperAdmin));
    setHasOrganizationContext(Boolean(result.data.organizationId));
    setMode(result.data.mode);
    if (result.data.isSimple) {
      router.replace("/mobile/dashboard");
    }
  }, [router]);

  const toggleMode = useCallback(async () => {
    if (!mode) return;
    if (!hasOrganizationContext) return;
    setSwitchingMode(true);
    const nextMode = mode === "SIMPLE" ? "PRO" : "SIMPLE";
    const result = await api.patch<OrganizationModeUpdateEnvelope>("/api/organizations/mode", {
      mode: nextMode,
    });
    setSwitchingMode(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setMode(result.data.mode);
    toast.success(
      result.data.mode === "PRO"
        ? "Pro mode enabled"
        : "Simple mode enabled",
    );
    if (result.data.mode === "SIMPLE") {
      router.replace("/mobile/dashboard");
      return;
    }
    fetchStats();
  }, [fetchStats, hasOrganizationContext, mode, router]);

  const generateDemo = useCallback(async () => {
    setIsGeneratingDemo(true);
    const result = await api.post<DemoSchoolResponse>("/api/super-admin/demo/generate");
    setIsGeneratingDemo(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (!result.data.ok) {
      toast.error(result.data.error ?? "Failed to generate demo school");
      return;
    }

    toast.success(`Demo ready: ${result.data.data.organizationName}`);
    router.push(result.data.data.demoRedirect);
  }, [router]);

  const resetDemo = useCallback(async () => {
    setIsResettingDemo(true);
    const result = await api.post<DemoSchoolResponse>("/api/super-admin/demo/reset");
    setIsResettingDemo(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (!result.data.ok) {
      toast.error(result.data.error ?? "Failed to reset demo school");
      return;
    }

    toast.success("Demo reset complete");
    router.push(result.data.data.demoRedirect);
  }, [router]);

  useEffect(() => {
    fetchMode();
  }, [fetchMode]);

  useEffect(() => {
    if (mode === "SIMPLE") return;
    fetchStats();
  }, [fetchStats, mode]);

  const subtitle = useMemo(() => {
    return "Live operational snapshot with plan usage and key metrics";
  }, []);

  return (
    <div className="space-y-6">
      <SxPageHeader
        title="Dashboard"
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2">
            <SxStatusBadge variant="success">Live</SxStatusBadge>
            {hasOrganizationContext ? (
              <SxButton sxVariant="secondary" loading={switchingMode} onClick={toggleMode}>
                {mode === "PRO" ? "Switch to Simple" : "Switch to Pro"}
              </SxButton>
            ) : null}
            {isSuperAdmin ? (
              <>
                <SxButton sxVariant="outline" loading={isGeneratingDemo} onClick={generateDemo}>
                  Generate Demo School
                </SxButton>
                <SxButton sxVariant="outline" loading={isResettingDemo} onClick={resetDemo}>
                  Reset Demo
                </SxButton>
              </>
            ) : null}
            <SxButton sxVariant="outline" onClick={fetchStats}>
              Refresh
            </SxButton>
          </div>
        }
      />

      <PlanUsageCard />

      <SxDataTable
        columns={columns}
        data={stats}
        loading={loading}
        emptyMessage="No dashboard metrics available."
      />
    </div>
  );
}
  