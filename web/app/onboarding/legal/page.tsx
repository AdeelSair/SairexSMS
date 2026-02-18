"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

import {
  onboardingLegalSchema,
  type OnboardingLegalInput,
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

export default function OnboardingLegalPage() {
  const router = useRouter();
  const { draft, saveStep, markValidated } = useOnboarding();

  const form = useForm<OnboardingLegalInput>({
    resolver: zodResolver(onboardingLegalSchema),
    defaultValues: draft.legal ?? {
      registrationNumber: "",
      taxNumber: "",
      establishedDate: "",
    },
  });

  const { handleSubmit } = form;

  const onBack = () => {
    saveStep("legal", form.getValues());
    router.push("/onboarding/identity");
  };

  const onSave = (data: OnboardingLegalInput) => {
    saveStep("legal", data);
    markValidated("legal");
    toast.success("Legal information saved");
  };

  const onNext = (data: OnboardingLegalInput) => {
    saveStep("legal", data);
    markValidated("legal");
    router.push("/onboarding/contact-address");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
      <h2 className="mb-1 text-xl font-semibold text-foreground">
        Legal Information
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Provide your organization&apos;s legal details. Enter &quot;N/A&quot; if
        not applicable.
      </p>

      <Form {...form}>
        <form className="space-y-5">
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
