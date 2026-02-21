"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Printer,
  Download,
  Mail,
  ArrowRight,
  FileText,
} from "lucide-react";

import { useOnboarding } from "../context";
import { SxButton } from "@/components/sx";

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

export default function OnboardingConfirmationPage() {
  const router = useRouter();
  const { completedOrg } = useOnboarding();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!completedOrg) {
      router.replace("/onboarding/identity");
    }
  }, [completedOrg, router]);

  if (!completedOrg) return null;

  const onPrint = () => window.print();

  const onDownload = async () => {
    try {
      const el = printRef.current;
      if (!el) return;

      toast.info("Generating PDF...");

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        imgWidth,
        imgHeight,
      );
      pdf.save(`${completedOrg.id}.pdf`);

      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF. Use Print → Save as PDF instead.");
    }
  };

  const onEmail = () => {
    toast.info("Email feature coming soon");
  };

  const onDashboard = () => {
    router.push("/admin/dashboard");
    router.refresh();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* ── Success Banner ── */}
      <div className="rounded-lg border border-success/30 bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
        <h2 className="text-2xl font-bold text-foreground">
          Organization Registered
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your organization has been successfully created
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-6 py-3">
          <span className="text-xs font-medium text-muted-foreground">
            Organization ID
          </span>
          <span className="font-data text-2xl font-bold tracking-wider text-primary">
            {completedOrg.id}
          </span>
        </div>
      </div>

      {/* ── Printable Details ── */}
      <div
        ref={printRef}
        className="rounded-lg border border-border bg-card shadow-lg"
      >
        {/* Identity */}
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Organization Identity
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2">
          <Field
            label="Organization Name"
            value={completedOrg.organizationName}
          />
          <Field label="Display Name" value={completedOrg.displayName} />
          <Field label="Slug" value={completedOrg.slug} />
          <Field
            label="Category"
            value={humanize(completedOrg.organizationCategory)}
          />
          <Field
            label="Structure"
            value={humanize(completedOrg.organizationStructure)}
          />
        </div>

        {/* Registration */}
        <div className="border-y border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Registration Information
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2">
          <Field
            label="Registration Number"
            value={completedOrg.registrationNumber}
          />
          <Field label="Tax / NTN Number" value={completedOrg.taxNumber} />
          <Field
            label="Established Date"
            value={
              completedOrg.establishedDate
                ? new Date(completedOrg.establishedDate).toLocaleDateString()
                : null
            }
          />
        </div>

        {/* HO Address & Contacts */}
        <div className="border-y border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            HO Address &amp; Contacts
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2">
          <Field
            label="Head Office Address"
            value={completedOrg.addressLine1}
          />
          <Field label="Address Line 2" value={completedOrg.addressLine2} />
          <Field label="Country" value={completedOrg.country} />
          <Field label="Province" value={completedOrg.provinceState} />
          <Field label="District" value={completedOrg.district} />
          <Field label="Tehsil" value={completedOrg.tehsil} />
          <Field label="City" value={completedOrg.city} />
          <Field label="Postal Code" value={completedOrg.postalCode} />
          <Field
            label="Official Email"
            value={completedOrg.organizationEmail}
          />
          <Field
            label="Land Line Number"
            value={completedOrg.organizationPhone}
          />
          <Field
            label="Mobile Number"
            value={completedOrg.organizationMobile}
          />
          <Field label="WhatsApp" value={completedOrg.organizationWhatsApp} />
        </div>

        {/* Branding */}
        <div className="border-y border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">Branding</h3>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2">
          <Field label="Website" value={completedOrg.websiteUrl} />
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Logo</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {completedOrg.logoUrl ? (
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={14} className="text-primary" />
                  Uploaded
                </span>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Created on {new Date(completedOrg.createdAt).toLocaleString()}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-6 py-4 shadow-lg print:hidden">
        <div className="flex gap-2">
          <SxButton
            type="button"
            sxVariant="outline"
            icon={<Printer size={16} />}
            onClick={onPrint}
          >
            Print
          </SxButton>
          <SxButton
            type="button"
            sxVariant="outline"
            icon={<Download size={16} />}
            onClick={onDownload}
          >
            Download
          </SxButton>
          <SxButton
            type="button"
            sxVariant="outline"
            icon={<Mail size={16} />}
            onClick={onEmail}
          >
            Email
          </SxButton>
        </div>
        <SxButton
          type="button"
          sxVariant="primary"
          icon={<ArrowRight size={16} />}
          onClick={onDashboard}
        >
          Go to Dashboard
        </SxButton>
      </div>
    </div>
  );
}
