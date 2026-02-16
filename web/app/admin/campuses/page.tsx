"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { api } from "@/lib/api-client";
import {
  SxPageHeader,
  SxButton,
  SxStatusBadge,
  SxDataTable,
  type SxColumn,
} from "@/components/sx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* ── Types ─────────────────────────────────────────────────── */

interface Organization {
  id: string;
  organizationName: string;
}

interface Region {
  id: number;
  name: string;
  city: string;
  organizationId: string;
}

interface Campus {
  id: number;
  name: string;
  campusCode: string;
  city: string;
  status: string;
  organizationId: string;
  regionId: number | null;
  organization: { id: string; organizationName: string };
  region: { id: number; name: string; city: string } | null;
}

interface CampusFormValues {
  name: string;
  campusCode: string;
  city: string;
  organizationId: string;
  regionId: string;
}

/* ── Column definitions ────────────────────────────────────── */

const columns: SxColumn<Campus>[] = [
  {
    key: "name",
    header: "Campus Name",
    render: (row) => (
      <div>
        <div className="font-medium">{row.name}</div>
        <div className="text-xs text-muted-foreground font-data">
          {row.campusCode}
        </div>
      </div>
    ),
  },
  {
    key: "organization",
    header: "Organization",
    render: (row) => (
      <span className="text-muted-foreground">
        {row.organization?.organizationName}
      </span>
    ),
  },
  {
    key: "region",
    header: "Region",
    render: (row) =>
      row.region ? (
        <SxStatusBadge variant="info">{row.region.name}</SxStatusBadge>
      ) : (
        <span className="text-xs text-muted-foreground italic">
          Independent
        </span>
      ),
  },
  {
    key: "city",
    header: "City",
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <SxStatusBadge status={row.status} />,
  },
];

/* ── Page component ────────────────────────────────────────── */

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /* ── Fetch data ────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [camResult, orgResult, regResult] = await Promise.all([
      api.get<Campus[]>("/api/campuses"),
      api.get<Organization[]>("/api/organizations"),
      api.get<Region[]>("/api/regions"),
    ]);
    if (camResult.ok) setCampuses(camResult.data);
    else toast.error(camResult.error);
    if (orgResult.ok) setOrgs(orgResult.data);
    if (regResult.ok) setRegions(regResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Form ──────────────────────────────────────────────── */

  const form = useForm<CampusFormValues>({
    defaultValues: {
      name: "",
      campusCode: "",
      city: "",
      organizationId: "",
      regionId: "",
    },
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = form;

  const selectedOrgId = watch("organizationId");

  const filteredRegions = useMemo(
    () =>
      selectedOrgId
        ? regions.filter((r) => r.organizationId === selectedOrgId)
        : [],
    [regions, selectedOrgId],
  );

  const onSubmit = async (data: CampusFormValues) => {
    const result = await api.post<Campus>("/api/campuses", {
      ...data,
      regionId: data.regionId || null,
    });
    if (result.ok) {
      toast.success("Campus registered successfully");
      setIsDialogOpen(false);
      reset();
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) reset();
  };

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <SxPageHeader
        title="Campuses"
        subtitle="Manage school branches and operational units"
        actions={
          <SxButton
            sxVariant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsDialogOpen(true)}
          >
            Add Campus
          </SxButton>
        }
      />

      <SxDataTable
        columns={columns}
        data={campuses as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No campuses found. Register one to get started."
      />

      {/* ── Create dialog ──────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Campus</DialogTitle>
            <DialogDescription>
              Add a new school branch under an organization.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Parent org */}
              <FormField
                control={form.control}
                name="organizationId"
                rules={{ required: "Organization is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Organization</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("regionId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {orgs.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.organizationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Region (optional, filtered by org) */}
              <FormField
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region (Optional)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedOrgId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              selectedOrgId
                                ? "Independent / No Region"
                                : "Select org first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          Independent / No Region
                        </SelectItem>
                        {filteredRegions.map((r) => (
                          <SelectItem key={r.id} value={r.id.toString()}>
                            {r.name} — {r.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name + Code */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: "Campus name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Islamabad Campus"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="campusCode"
                  rules={{ required: "Campus code is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ISB-01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                rules={{ required: "City is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Islamabad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <SxButton
                  type="button"
                  sxVariant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </SxButton>
                <SxButton
                  type="submit"
                  sxVariant="primary"
                  loading={isSubmitting}
                >
                  Register Campus
                </SxButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
