"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  OnboardingIdentityInput,
  OnboardingLegalInput,
  OnboardingContactAddressInput,
  OnboardingBrandingInput,
} from "@/lib/validations/onboarding";

const STORAGE_KEY = "sairex-onboarding-draft";

// ─── Types ──────────────────────────────────────────────────────────────────

export type StepKey = "identity" | "legal" | "contactAddress" | "branding";

export interface OnboardingDraft {
  identity: OnboardingIdentityInput | null;
  legal: OnboardingLegalInput | null;
  contactAddress: OnboardingContactAddressInput | null;
  branding: OnboardingBrandingInput | null;
  validatedSteps: StepKey[];
}

export interface CompletedOrg {
  id: string;
  slug: string;
  organizationName: string;
  displayName: string;
  organizationCategory: string;
  organizationStructure: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  establishedDate: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  country: string | null;
  provinceState: string | null;
  city: string | null;
  postalCode: string | null;
  organizationEmail: string | null;
  organizationPhone: string | null;
  organizationWhatsApp: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  createdAt: string;
}

interface OnboardingContextValue {
  draft: OnboardingDraft;
  completedOrg: CompletedOrg | null;
  ready: boolean;
  saveStep: <K extends StepKey>(step: K, value: OnboardingDraft[K]) => void;
  markValidated: (step: StepKey) => void;
  isStepValidated: (step: StepKey) => boolean;
  setCompletedOrg: (org: CompletedOrg) => void;
  clearDraft: () => void;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const EMPTY_DRAFT: OnboardingDraft = {
  identity: null,
  legal: null,
  contactAddress: null,
  branding: null,
  validatedSteps: [],
};

// ─── Context ────────────────────────────────────────────────────────────────

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [completedOrg, setCompletedOrg] = useState<CompletedOrg | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingDraft;
        setDraft({
          ...EMPTY_DRAFT,
          ...parsed,
          validatedSteps: parsed.validatedSteps ?? [],
        });
      }
    } catch {
      /* corrupted storage — start fresh */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft, ready]);

  const saveStep = useCallback(
    <K extends StepKey>(step: K, value: OnboardingDraft[K]) => {
      setDraft((prev) => ({ ...prev, [step]: value }));
    },
    [],
  );

  const markValidated = useCallback((step: StepKey) => {
    setDraft((prev) => ({
      ...prev,
      validatedSteps: prev.validatedSteps.includes(step)
        ? prev.validatedSteps
        : [...prev.validatedSteps, step],
    }));
  }, []);

  const isStepValidated = useCallback(
    (step: StepKey) => draft.validatedSteps.includes(step),
    [draft.validatedSteps],
  );

  const clearDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  if (!ready) return null;

  return (
    <OnboardingContext.Provider
      value={{
        draft,
        completedOrg,
        ready,
        saveStep,
        markValidated,
        isStepValidated,
        setCompletedOrg,
        clearDraft,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
