"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import {
  onboardingIdentitySchema,
  ONBOARDING_ORGANIZATION_TYPE,
  type OnboardingIdentityInput,
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

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface IdentityResponse {
  message: string;
  organizationId: string;
  nextUrl: string;
}

export default function OnboardingIdentityPage() {
  const router = useRouter();

  const form = useForm<OnboardingIdentityInput>({
    resolver: zodResolver(onboardingIdentitySchema),
    defaultValues: {
      organizationName: "",
      displayName: "",
      organizationType: "SINGLE_SCHOOL",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: OnboardingIdentityInput) => {
    const result = await api.post<IdentityResponse>("/api/onboarding/identity", data);

    if (result.ok) {
      toast.success(`Organization created — ${result.data.organizationId}`);
      router.push(result.data.nextUrl);
      router.refresh();
    } else if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof OnboardingIdentityInput, {
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
        Organization Identity
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Provide your organization&apos;s basic information to get started.
      </p>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="organizationName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name (Legal)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. The City School (Pvt) Ltd" {...field} />
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
                  <Input placeholder="e.g. The City School" {...field} />
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
            Save & Continue
          </SxButton>
        </form>
      </Form>
    </div>
  );
}
