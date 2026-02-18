"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Palette } from "lucide-react";

import {
  onboardingBrandingSchema,
  type OnboardingBrandingInput,
} from "@/lib/validations/onboarding";
import { useOnboarding } from "../context";

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

export default function OnboardingBrandingPage() {
  const router = useRouter();
  const { draft, saveStep, markValidated } = useOnboarding();

  const form = useForm<OnboardingBrandingInput>({
    resolver: zodResolver(onboardingBrandingSchema),
    defaultValues: draft.branding ?? {
      logoUrl: "",
    },
  });

  const { handleSubmit } = form;

  const onBack = () => {
    saveStep("branding", form.getValues());
    router.push("/onboarding/contact-address");
  };

  const onSave = (data: OnboardingBrandingInput) => {
    saveStep("branding", data);
    markValidated("branding");
    toast.success("Branding saved");
  };

  const onNext = (data: OnboardingBrandingInput) => {
    saveStep("branding", data);
    markValidated("branding");
    router.push("/onboarding/preview");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
      <div className="mb-6 text-center">
        <Palette className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h2 className="mb-1 text-xl font-semibold text-foreground">
          Branding
        </h2>
        <p className="text-sm text-muted-foreground">
          Add your organization&apos;s logo. You can skip this and add it later.
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-5">
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

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pt-2">
            <SxButton
              type="button"
              sxVariant="ghost"
              icon={<ArrowLeft size={16} />}
              onClick={onBack}
            >
              Back
            </SxButton>
            <div className="flex gap-3">
              <SxButton
                type="button"
                sxVariant="outline"
                icon={<Save size={16} />}
                onClick={handleSubmit(onSave)}
              >
                Save
              </SxButton>
              <SxButton
                type="button"
                sxVariant="primary"
                icon={<ArrowRight size={16} />}
                onClick={handleSubmit(onNext)}
              >
                Next
              </SxButton>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
