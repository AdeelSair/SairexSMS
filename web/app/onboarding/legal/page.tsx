"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import {
  onboardingLegalSchema,
  type OnboardingLegalInput,
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

interface LegalResponse {
  message: string;
  nextUrl: string;
}

export default function OnboardingLegalPage() {
  const router = useRouter();

  const form = useForm<OnboardingLegalInput>({
    resolver: zodResolver(onboardingLegalSchema),
    defaultValues: {
      registrationNumber: "",
      taxNumber: "",
      establishedDate: "",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: OnboardingLegalInput) => {
    const result = await api.post<LegalResponse>("/api/onboarding/legal", data);

    if (result.ok) {
      toast.success("Legal information saved");
      router.push(result.data.nextUrl);
      router.refresh();
    } else if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof OnboardingLegalInput, {
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
        Legal Information
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Provide your organization&apos;s legal details. Enter &quot;N/A&quot; if not applicable.
      </p>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="registrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. REG-12345 or N/A" {...field} />
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
                  <Input placeholder="e.g. 1234567-8 or N/A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="establishedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Established Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
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
