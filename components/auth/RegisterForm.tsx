"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { REGISTER_MUTATION } from "@/graphql/mutations";
import { friendlyErrorMessage } from "@/lib/format";
import { PasswordInput } from "./PasswordInput";
import { useHydrated } from "@/lib/useHydrated";

export function RegisterForm() {
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [register, { loading }] = useMutation(REGISTER_MUTATION);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    if (!name.trim() || !email.trim() || !password) {
      setFormError("Name, email and password are required.");
      formRef.current
        ?.querySelector<HTMLInputElement>(
          !name.trim() ? "#name" : !email.trim() ? "#email" : "#password",
        )
        ?.focus();
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      formRef.current?.querySelector<HTMLInputElement>("#password")?.focus();
      return;
    }
    try {
      await register({
        variables: { name: name.trim(), email: email.trim(), password },
      });
      router.replace("/login");
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
        <label htmlFor="name" className="text-sm font-medium text-muted">
          Name
        </label>
        <input
          id="name"
          aria-invalid={Boolean(formError && !name.trim())}
          aria-describedby={formError ? "auth-error" : undefined}
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-line bg-canvas px-3 py-3 text-base text-ink placeholder:text-muted focus:border-line focus:outline-none transition"
        />
      </div>
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
          Password (at least 8 characters)
        </label>
        <PasswordInput
          id="password"
          aria-invalid={Boolean(formError && password.length < 8)}
          aria-describedby={formError ? "auth-error" : undefined}
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
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
        {loading ? "Creating account..." : "Create account"}
      </button>
      <p className="text-center text-sm text-muted mt-2">
        Already have an account?{" "}
        <Link href="/login" className="text-ink hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
