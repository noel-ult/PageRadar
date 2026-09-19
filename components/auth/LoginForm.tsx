"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { LOGIN_MUTATION } from "@/graphql/mutations";
import { setToken } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/format";

function extractToken(data: unknown): string | null {
  const payload = (data as Record<string, unknown> | undefined)?.login as
    | Record<string, unknown>
    | undefined;
  if (!payload) return null;
  for (const key of ["accessToken", "access_token", "token"]) {
    const v = payload[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [login, { loading }] = useMutation(LOGIN_MUTATION);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError("Email and password are required.");
      return;
    }
    try {
      const { data } = await login({ variables: { email: email.trim(), password } });
      const token = extractToken(data);
      if (!token) {
        setFormError("Login succeeded but no session token was returned.");
        return;
      }
      setToken(token);
      router.replace("/dashboard");
    } catch (err) {
      setFormError(friendlyErrorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium text-zinc-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
        />
      </div>
      {formError ? (
        <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/30 p-2.5 text-xs text-red-300">
          {formError}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-xs text-zinc-400 mt-2">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-white hover:underline font-medium"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
