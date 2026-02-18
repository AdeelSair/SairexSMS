"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Hash } from "lucide-react";

import { api } from "@/lib/api-client";
import {
  createOrganizationSchema,
  ORGANIZATION_CATEGORY,
  ORGANIZATION_STRUCTURE,
  ORGANIZATION_STATUS,
  type CreateOrganizationInput,
} from "@/lib/validations/organization";

import {
  SxPageHeader,
  SxButton,
  SxStatusBadge,
  SxDataTable,
  SxFormSection,
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

/* ══════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════ */

interface Organization {
  id: string;
  organizationName: string;
  displayName: string;
  slug: string;
  organizationCategory: string;
  organizationStructure: string;
  status: string;
  onboardingStep: string;
  organizationEmail: string | null;
  organizationPhone: string | null;
  city: string | null;
  createdAt: string;
}

/* ══════════════════════════════════════════════════════════════
   Column Definitions
   ══════════════════════════════════════════════════════════════ */

const columns: SxColumn<Organization>[] = [
  {
    key: "id",
    header: "ID",
    mono: true,
    render: (row) => (
      <span className="font-data text-xs font-semibold text-primary">{row.id}</span>
    ),
  },
  {
    key: "organizationName",
    header: "Organization",
    render: (row) => (
      <div>
        <div className="font-medium">{row.organizationName}</div>
        <div className="text-xs text-muted-foreground">{row.displayName}</div>
      </div>
    ),
  },
  {
    key: "slug",
    header: "Slug",
    mono: true,
    render: (row) => (
      <span className="font-data text-xs text-muted-foreground">{row.slug}</span>
    ),
  },
  {
    key: "organizationCategory",
    header: "Category",
    render: (row) => (
      <SxStatusBadge variant="info">
        {humanize(row.organizationCategory)}
      </SxStatusBadge>
    ),
  },
  {
    key: "organizationStructure",
    header: "Structure",
    render: (row) => (
      <SxStatusBadge variant={row.organizationStructure === "MULTIPLE" ? "warning" : "success"}>
        {humanize(row.organizationStructure)}
      </SxStatusBadge>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <SxStatusBadge status={row.status} />,
  },
  {
    key: "onboardingStep",
    header: "Onboarding",
    render: (row) => (
      <SxStatusBadge
        variant={row.onboardingStep === "COMPLETED" ? "success" : "warning"}
      >
        {humanize(row.onboardingStep)}
      </SxStatusBadge>
    ),
  },
  {
    key: "city",
    header: "City",
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.city || "—"}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    render: (row) => (
      <span className="font-data text-xs text-muted-foreground">
        {new Date(row.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

/* ══════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════ */

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ══════════════════════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════════════════════ */

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nextId, setNextId] = useState<string>("");

  /* ── Data fetching ──────────────────────────────────────── */

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const result = await api.get<Organization[]>("/api/organizations");
    if (result.ok) {
      setOrgs(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  /* ── Form: Zod resolver + React Hook Form ───────────────── */

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      organizationName: "",
      displayName: "",
      slug: "",
      organizationCategory: "SCHOOL",
      organizationStructure: "SINGLE",
      status: "ACTIVE",
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  /* ── Submit handler ─────────────────────────────────────── */

  const onSubmit = async (data: CreateOrganizationInput) => {
    const result = await api.post<Organization>("/api/organizations", data);

    if (result.ok) {
      toast.success(`Organization created — ${result.data.id}`);
      setIsDialogOpen(false);
      reset();
      setNextId("");
      fetchOrgs();
    } else if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof CreateOrganizationInput, {
          message: messages[0],
        });
      }
      toast.error("Please fix the validation errors");
    } else {
      toast.error(result.error);
    }
  };

  /* ── Dialog open/close ──────────────────────────────────── */

  const handleOpenChange = async (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      const result = await api.get<{ nextId: string }>("/api/organizations/next-id");
      if (result.ok) {
        setNextId(result.data.nextId);
      }
    } else {
      reset();
      setNextId("");
    }
  };

  /* ══════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <SxPageHeader
        title="Organizations"
        subtitle="Manage SaaS tenants and their configuration"
        actions={
          <SxButton
            sxVariant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsDialogOpen(true)}
          >
            Add Organization
          </SxButton>
        }
      />

      {/* ── Data Table ────────────────────────────────────── */}
      <SxDataTable
        columns={columns as unknown as SxColumn<Record<string, unknown>>[]}
        data={orgs as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No organizations found. Create one to get started."
      />

      {/* ── Create Dialog ─────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Organization</DialogTitle>
            <DialogDescription className="sr-only">
              Create a new organization tenant
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* ── Organization ID (auto-generated preview) ── */}
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                <Hash size={16} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Organization ID
                  </p>
                  <p className="font-data text-lg font-bold tracking-wide text-primary">
                    {nextId || "Generating..."}
                  </p>
                </div>
                <SxStatusBadge variant="info">Auto-generated</SxStatusBadge>
              </div>

              {/* ── Section 1: Basic Information ───────────── */}
              <SxFormSection columns={2}>
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. The City School (Pvt) Ltd"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. The City School"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="auto-generated if empty"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SxFormSection>

              {/* ── Section 2: Classification ──────────────── */}
              <SxFormSection columns={2}>
                <FormField
                  control={form.control}
                  name="organizationCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORGANIZATION_CATEGORY.map((c) => (
                            <SelectItem key={c} value={c}>
                              {humanize(c)}
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
                  name="organizationStructure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Structure</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select structure" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORGANIZATION_STRUCTURE.map((s) => (
                            <SelectItem key={s} value={s}>
                              {humanize(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SxFormSection>

              {/* ── Section 3: Status ──────────────────────── */}
              <SxFormSection columns={2}>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORGANIZATION_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {humanize(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SxFormSection>

              {/* ── Footer Actions ─────────────────────────── */}
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
                  Create Organization
                </SxButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
