"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Building2, Globe, FileText } from "lucide-react";

import { api } from "@/lib/api-client";
import {
  createOrganizationSchema,
  ORGANIZATION_TYPE,
  ORGANIZATION_STATUS,
  IANA_TIMEZONES,
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
  FormDescription,
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
  organizationType: string;
  status: string;
  timeZone: string;
  defaultLanguage: string;
  registrationNumber?: string;
  taxNumber?: string;
  logoUrl?: string;
  websiteUrl?: string;
  createdAt: string;
}

/* ══════════════════════════════════════════════════════════════
   Column Definitions
   Design tokens only — no hardcoded colors.
   ══════════════════════════════════════════════════════════════ */

const columns: SxColumn<Organization>[] = [
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
    key: "organizationType",
    header: "Type",
    render: (row) => (
      <SxStatusBadge variant="info">
        {row.organizationType}
      </SxStatusBadge>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <SxStatusBadge status={row.status} />,
  },
  {
    key: "timeZone",
    header: "Timezone",
    render: (row) => (
      <span className="text-xs text-muted-foreground">{row.timeZone}</span>
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
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

/* ══════════════════════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════════════════════ */

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      organizationType: "SCHOOL",
      registrationNumber: "",
      taxNumber: "",
      logoUrl: "",
      websiteUrl: "",
      timeZone: "Asia/Karachi",
      defaultLanguage: "en",
      status: "PENDING",
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
      toast.success("Organization created successfully");
      setIsDialogOpen(false);
      reset();
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

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) reset();
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
        columns={columns}
        data={orgs as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No organizations found. Create one to get started."
      />

      {/* ── Create Dialog ─────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Organization</DialogTitle>
            <DialogDescription>
              Create a new tenant. All fields are validated. A slug is
              auto-generated from the name if left blank.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* ── Section 1: Basic Information ───────────── */}
              <SxFormSection
                title="Basic Information"
                description="Core identity fields for this organization"
                columns={2}
              >
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Beaconhouse School System"
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
                          placeholder="e.g. Beaconhouse"
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
                      <FormDescription>
                        URL-friendly identifier (lowercase, hyphens only)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SxFormSection>

              {/* ── Section 2: Classification ──────────────── */}
              <SxFormSection
                title="Classification"
                description="Type, status, and locale settings"
                columns={2}
              >
                <FormField
                  control={form.control}
                  name="organizationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORGANIZATION_TYPE.map((t) => (
                            <SelectItem key={t} value={t}>
                              {humanize(t)}
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

                <FormField
                  control={form.control}
                  name="timeZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {IANA_TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
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
                  name="defaultLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Language</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. en, ur"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        ISO 639-1 language code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SxFormSection>

              {/* ── Section 3: Registration & Legal ────────── */}
              <SxFormSection
                title="Registration & Legal"
                description="Optional government and tax identifiers"
                columns={2}
              >
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. REG12345"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax / NTN Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 1234567-8"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SxFormSection>

              {/* ── Section 4: Web Presence ────────────────── */}
              <SxFormSection
                title="Web Presence"
                description="Optional branding and online links"
                columns={1}
              >
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://cdn.example.com/logo.png"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Must be an HTTPS URL
                      </FormDescription>
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
