"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { SxButton } from "@/components/sx";

interface CompleteResponse {
  message: string;
  nextUrl: string;
}

export default function OnboardingCompletePage() {
  const router = useRouter();
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    setActivating(true);

    const result = await api.post<CompleteResponse>("/api/onboarding/complete", {});

    if (result.ok) {
      toast.success(result.data.message);

      // Re-authenticate to refresh the JWT with new org data
      const session = await signIn("credentials", { redirect: false });

      if (session?.error) {
        toast.info("Please log in again to access your dashboard");
        router.push("/login");
      } else {
        router.push("/admin/dashboard");
        router.refresh();
      }
    } else {
      toast.error(result.error);
      setActivating(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center shadow-lg">
      <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-success" />
      <h2 className="mb-2 text-xl font-semibold text-foreground">
        You&apos;re all set!
      </h2>
      <p className="mb-8 text-sm text-muted-foreground">
        Your organization profile is complete. Activate your account to start
        using the platform.
      </p>

      <SxButton
        sxVariant="primary"
        onClick={handleActivate}
        loading={activating}
        className="px-8 py-3"
      >
        {activating ? "Activating..." : "Activate & Go to Dashboard"}
      </SxButton>
    </div>
  );
}
