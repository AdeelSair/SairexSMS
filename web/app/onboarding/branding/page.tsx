"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Palette } from "lucide-react";

import { api } from "@/lib/api-client";
import {
  onboardingBrandingSchema,
  type OnboardingBrandingInput,
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

interface BrandingResponse {
  message: string;
  nextUrl: string;
}

export default function OnboardingBrandingPage() {
  const router = useRouter();
  const [activating, setActivating] = useState(false);

  const form = useForm<OnboardingBrandingInput>({
    resolver: zodResolver(onboardingBrandingSchema),
    defaultValues: {
      logoUrl: "",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: OnboardingBrandingInput) => {
    setActivating(true);

    const result = await api.post<BrandingResponse>("/api/onboarding/branding", data);

    if (result.ok) {
      toast.success(result.data.message);

      const session = await signIn("credentials", { redirect: false });

      if (session?.error) {
        toast.info("Please log in again to access your dashboard");
        router.push("/login");
      } else {
        router.push("/admin/dashboard");
        router.refresh();
      }
    } else if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof OnboardingBrandingInput, {
          message: messages[0],
        });
      }
      toast.error("Please fix the validation errors");
      setActivating(false);
    } else {
      toast.error(result.error);
      setActivating(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
      <div className="mb-6 text-center">
        <Palette className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h2 className="mb-1 text-xl font-semibold text-foreground">
          Branding
        </h2>
        <p className="text-sm text-muted-foreground">
          Add your organization&apos;s logo. You can skip this step and add it later.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com/logo.png"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <p className="text-xs text-muted-foreground">
            Paste a direct link to your logo image. You can update this anytime
            from your organization settings.
          </p>

          <SxButton
            type="submit"
            sxVariant="primary"
            loading={isSubmitting || activating}
            className="w-full py-3"
          >
            {activating ? "Activating..." : "Complete Setup & Go to Dashboard"}
          </SxButton>
        </form>
      </Form>
    </div>
  );
}
