"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    role: string;
    orgName: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState("");

  const isInvited = !!inviteToken;

  useEffect(() => {
    if (!inviteToken) return;

    fetch(`/api/invites/validate?token=${inviteToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setInviteError(data.error);
        } else {
          setInviteInfo(data);
          setEmail(data.email);
        }
      })
      .catch(() => setInviteError("Failed to validate invite link"));
  }, [inviteToken]);

  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    const code = value
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 20);
    setOrgCode(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          inviteToken: inviteToken || undefined,
          orgName: isInvited ? undefined : orgName,
          orgCode: isInvited ? undefined : orgCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed.");
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
      } else {
        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (isInvited && inviteError) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-warning" />
        <h2 className="mb-2 text-xl font-semibold text-white">
          Invalid Invite
        </h2>
        <p className="mb-6 text-sm text-slate-400">{inviteError}</p>
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Go to login
        </Link>
      </div>
    );
  }

  if (isInvited && !inviteInfo && !inviteError) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-slate-400 shadow-2xl backdrop-blur-xl">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
        Validating invite...
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">
        {isInvited ? "Join your organization" : "Create your organization"}
      </h2>
      <p className="mb-6 text-sm text-slate-400">
        {isInvited ? (
          <>
            You&apos;ve been invited to join{" "}
            <strong className="text-slate-300">{inviteInfo?.orgName}</strong> as{" "}
            <strong className="text-slate-300">
              {inviteInfo?.role?.replace("_", " ")}
            </strong>
          </>
        ) : (
          "Get started with SAIREX SMS"
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!isInvited && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder="e.g. Bright Future Schools"
                required
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Organization Code
              </label>
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                placeholder="AUTO-GENERATED"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-white placeholder-slate-500 transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="mt-1 text-xs text-slate-500">
                Unique identifier — auto-generated from name
              </p>
            </div>
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            readOnly={isInvited}
            className={`w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              isInvited ? "cursor-not-allowed opacity-60" : ""
            }`}
          />
          {isInvited && (
            <p className="mt-1 text-xs text-slate-500">
              Set by your admin — cannot be changed
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            minLength={8}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            required
            minLength={8}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </span>
          ) : isInvited ? (
            "Join organization"
          ) : (
            "Create organization"
          )}
        </button>
      </form>

      <div className="mt-5 text-center">
        <span className="text-sm text-slate-500">
          Already have an account?{" "}
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-slate-400 shadow-2xl backdrop-blur-xl">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
