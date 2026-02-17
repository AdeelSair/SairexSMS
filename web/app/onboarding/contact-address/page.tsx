"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import {
  onboardingContactAddressSchema,
  type OnboardingContactAddressInput,
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

interface ContactAddressResponse {
  message: string;
  nextUrl: string;
}

export default function OnboardingContactAddressPage() {
  const router = useRouter();

  const form = useForm<OnboardingContactAddressInput>({
    resolver: zodResolver(onboardingContactAddressSchema),
    defaultValues: {
      addressLine1: "",
      addressLine2: "",
      country: "Pakistan",
      provinceState: "",
      city: "",
      postalCode: "",
      organizationEmail: "",
      organizationPhone: "",
      organizationWhatsApp: "",
      websiteUrl: "",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: OnboardingContactAddressInput) => {
    const result = await api.post<ContactAddressResponse>(
      "/api/onboarding/contact-address",
      data,
    );

    if (result.ok) {
      toast.success("Contact & address saved");
      router.push(result.data.nextUrl);
      router.refresh();
    } else if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof OnboardingContactAddressInput, {
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
        Contact & HQ Address
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Provide your organization&apos;s headquarter address and contact information.
      </p>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Address Section ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Headquarter Address
            </h3>

            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Boulevard, DHA Phase 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2 (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Suite, floor, building" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Pakistan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provinceState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province / State</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Punjab" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Lahore" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="54000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Contact Section ── */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground">
              Organization Contact
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organizationEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="info@school.edu.pk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizationPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="042-1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organizationWhatsApp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+923001234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://school.edu.pk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

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
