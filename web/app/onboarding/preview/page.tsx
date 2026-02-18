"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";

import { api } from "@/lib/api-client";
import { useOnboarding, type CompletedOrg } from "../context";
import { SxButton } from "@/components/sx";

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Section({
  title,
  editPath,
  children,
}: {
  title: string;
  editPath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <SxButton
          type="button"
          sxVariant="ghost"
          size="sm"
          icon={<Pencil size={14} />}
          onClick={() => router.push(editPath)}
        >
          Edit
        </SxButton>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

export default function OnboardingPreviewPage() {
  const router = useRouter();
  const { draft, setCompletedOrg, clearDraft } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);

  const { identity, legal, contactAddress, branding } = draft;

  const allComplete = identity && legal && contactAddress;

  const onBack = () => {
    router.push("/onboarding/branding");
  };

  const onComplete = async () => {
    if (!allComplete) {
      toast.error("Please complete all steps before submitting");
      return;
    }

    setSubmitting(true);
    const result = await api.post<CompletedOrg>("/api/onboarding/complete", {
      identity,
      legal,
      contactAddress,
      branding: branding ?? { logoUrl: "" },
    });

    if (result.ok) {
      setCompletedOrg(result.data);
      clearDraft();
      toast.success("Organization registered successfully!");
      router.push("/onboarding/confirmation");
    } else if (result.fieldErrors) {
      toast.error("Validation errors — please go back and fix them");
      setSubmitting(false);
    } else {
      toast.error(result.error);
      setSubmitting(false);
    }
  };

  if (!identity) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <p className="text-muted-foreground">
          No data to preview. Please start from the first step.
        </p>
        <SxButton
          type="button"
          sxVariant="primary"
          className="mt-4"
          onClick={() => router.push("/onboarding/identity")}
        >
          Start Onboarding
        </SxButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-1 text-xl font-semibold text-foreground">
          Review Your Information
        </h2>
        <p className="text-sm text-muted-foreground">
          Please review all details carefully. Your Organization ID will be
          generated after you confirm.
        </p>
      </div>

      {/* ── Identity ── */}
      <Section title="Organization Identity" editPath="/onboarding/identity">
        <Field label="Organization Name" value={identity.organizationName} />
        <Field label="Display Name" value={identity.displayName} />
        <Field label="Category" value={humanize(identity.organizationCategory)} />
        <Field label="Structure" value={humanize(identity.organizationStructure)} />
      </Section>

      {/* ── Legal ── */}
      <Section title="Legal Information" editPath="/onboarding/legal">
        {legal ? (
          <>
            <Field label="Registration Number" value={legal.registrationNumber} />
            <Field label="Tax / NTN Number" value={legal.taxNumber} />
            <Field label="Established Date" value={legal.establishedDate} />
          </>
        ) : (
          <p className="col-span-2 text-sm text-destructive">Not completed yet</p>
        )}
      </Section>

      {/* ── Contact & Address ── */}
      <Section title="Contact & HQ Address" editPath="/onboarding/contact-address">
        {contactAddress ? (
          <>
            <Field label="Street Address" value={contactAddress.addressLine1} />
            <Field label="Address Line 2" value={contactAddress.addressLine2} />
            <Field label="Country" value={contactAddress.country} />
            <Field label="Province / State" value={contactAddress.provinceState} />
            <Field label="City" value={contactAddress.city} />
            <Field label="Postal Code" value={contactAddress.postalCode} />
            <Field label="Email" value={contactAddress.organizationEmail} />
            <Field label="Phone" value={contactAddress.organizationPhone} />
            <Field label="WhatsApp" value={contactAddress.organizationWhatsApp} />
            <Field label="Website" value={contactAddress.websiteUrl} />
          </>
        ) : (
          <p className="col-span-2 text-sm text-destructive">Not completed yet</p>
        )}
      </Section>

      {/* ── Branding ── */}
      <Section title="Branding" editPath="/onboarding/branding">
        <Field label="Logo URL" value={branding?.logoUrl} />
      </Section>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-6 py-4 shadow-lg">
        <SxButton
          type="button"
          sxVariant="ghost"
          icon={<ArrowLeft size={16} />}
          onClick={onBack}
        >
          Back
        </SxButton>
        <SxButton
          type="button"
          sxVariant="primary"
          icon={<CheckCircle2 size={16} />}
          loading={submitting}
          disabled={!allComplete}
          onClick={onComplete}
        >
          Complete Registration
        </SxButton>
      </div>
    </div>
  );
}
