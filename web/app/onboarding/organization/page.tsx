"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import {
  onboardingOrganizationSchema,
  ONBOARDING_ORGANIZATION_TYPE,
  type OnboardingOrganizationInput,
} from "@/lib/validations/onboarding";

import { SxButton } from "@/components/sx";
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

/* ── Helpers ────────────────────────────────────────────────── */

const KEEP_UPPER = new Set(["NGO"]);

function humanize(value: string): string {
  if (KEEP_UPPER.has(value)) return value;
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

/* ── Page ───────────────────────────────────────────────────── */

interface OrgResponse {
  message: string;
  organizationId: string;
  nextUrl: string;
}

export default function OnboardingOrganizationPage() {
  const router = useRouter();

  const form = useForm<OnboardingOrganizationInput>({
    resolver: zodResolver(onboardingOrganizationSchema),
    defaultValues: {
      organizationName: "",
      displayName: "",
      organizationType: "SCHOOL",
      timeZone: "Asia/Karachi",
      defaultLanguage: "en",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: OnboardingOrganizationInput) => {
    const result = await api.post<OrgResponse>("/api/onboarding/organization", data);

    if (result.ok) {
      toast.success(`Organization created — ${result.data.organizationId}`);
      router.push(result.data.nextUrl);
      router.refresh();
    } else if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof OnboardingOrganizationInput, {
          message: messages[0],
        });
      }
      toast.error("Please fix the validation errors");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
      <h2 className="mb-1 text-xl font-semibold text-foreground">
        Create your Organization
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Provide your organization details to get started.
      </p>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="organizationName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Beaconhouse School System" {...field} />
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
                  <Input placeholder="e.g. Beaconhouse" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="organizationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ONBOARDING_ORGANIZATION_TYPE.map((t) => (
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

          <SxButton
            type="submit"
            sxVariant="primary"
            loading={isSubmitting}
            className="w-full py-3"
          >
            Create Organization
          </SxButton>
        </form>
      </Form>
    </div>
  );
}
