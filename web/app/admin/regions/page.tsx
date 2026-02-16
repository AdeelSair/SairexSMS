"use client";

import { useState, useEffect, useCallback } from "react";
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
  status: string;
  organizationId: string;
  directorName?: string;
  contactEmail?: string;
  organization: { id: string; organizationName: string };
}

interface RegionFormValues {
  name: string;
  city: string;
  organizationId: string;
}

/* ── Column definitions ────────────────────────────────────── */

const columns: SxColumn<Region>[] = [
  {
    key: "name",
    header: "Region Name",
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "city",
    header: "City",
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
    key: "status",
    header: "Status",
    render: (row) => <SxStatusBadge status={row.status} />,
  },
];

/* ── Page component ────────────────────────────────────────── */

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /* ── Fetch data ────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [regResult, orgResult] = await Promise.all([
      api.get<Region[]>("/api/regions"),
      api.get<Organization[]>("/api/organizations"),
    ]);
    if (regResult.ok) setRegions(regResult.data);
    else toast.error(regResult.error);
    if (orgResult.ok) setOrgs(orgResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Form ──────────────────────────────────────────────── */

  const form = useForm<RegionFormValues>({
    defaultValues: { name: "", city: "", organizationId: "" },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: RegionFormValues) => {
    const result = await api.post<Region>("/api/regions", data);
    if (result.ok) {
      toast.success("Regional office created");
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
        title="Regional Offices"
        subtitle="Define geographic management layers for your organizations"
        actions={
          <SxButton
            sxVariant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsDialogOpen(true)}
          >
            Add Regional Office
          </SxButton>
        }
      />

      <SxDataTable
        columns={columns}
        data={regions as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No regional offices found. Create one to get started."
      />

      {/* ── Create dialog ──────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Regional Office</DialogTitle>
            <DialogDescription>
              Create a new geographic management layer.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="organizationId"
                rules={{ required: "Organization is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Organization</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
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

              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Region name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Punjab South Region"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                rules={{ required: "City is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Multan" {...field} />
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
                  Create Region
                </SxButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
