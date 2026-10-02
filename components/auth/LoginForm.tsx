"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { LOGIN_MUTATION } from "@/graphql/mutations";
import { clearLegacyToken } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/format";
import { PasswordInput } from "./PasswordInput";
import { useHydrated } from "@/lib/useHydrated";

function extractToken(data: unknown): string | null {
  const payload = (data as Record<string, unknown> | undefined)?.login as
    Record<string, unknown> | undefined;
  if (!payload) return null;
  for (const key of ["accessToken", "access_token", "token"]) {
    const v = payload[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

export function LoginForm() {
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [login, { loading }] = useMutation(LOGIN_MUTATION);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError("Email and password are required.");
      formRef.current
        ?.querySelector<HTMLInputElement>(
          !email.trim() ? "#email" : "#password",
        )
        ?.focus();
      return;
    }
    try {
      const { data } = await login({
        variables: { email: email.trim(), password },
      });
      const token = extractToken(data);
      if (!token) {
        setFormError("Unable to start your session. Please try again.");
        return;
      }
      clearLegacyToken();
      router.replace("/dashboard");
    } catch (err) {
      setFormError(friendlyErrorMessage(err));
    }
  }

  return (
    <form
      ref={formRef}
      aria-describedby={formError ? "auth-error" : undefined}
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-muted">
          Email
        </label>
        <input
          id="email"
          aria-invalid={Boolean(formError && !email.trim())}
          aria-describedby={formError ? "auth-error" : undefined}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-line bg-canvas px-3 py-3 text-base text-ink placeholder:text-muted focus:border-line focus:outline-none transition"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-muted">
          Password
        </label>
        <PasswordInput
          id="password"
          aria-invalid={Boolean(formError && !password)}
          aria-describedby={formError ? "auth-error" : undefined}
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-line bg-canvas px-3 py-3 text-base text-ink placeholder:text-muted focus:border-line focus:outline-none transition"
        />
      </div>
      {formError ? (
        <div
          id="auth-error"
          role="alert"
          className="rounded-lg border border-danger/50 bg-danger-soft/30 p-2.5 text-sm text-danger"
        >
          {formError}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={!hydrated || loading}
        className="btn btn-primary mt-2"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted mt-2">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-ink hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </form>
  );
}
