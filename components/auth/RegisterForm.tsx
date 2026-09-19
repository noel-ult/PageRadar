"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { REGISTER_MUTATION } from "@/graphql/mutations";
import { friendlyErrorMessage } from "@/lib/format";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [register, { loading }] = useMutation(REGISTER_MUTATION);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim() || !password) {
      setFormError("Name, email and password are required.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-medium text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
        />
      </div>
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
          Password (at least 8 characters)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
        {loading ? "Creating account..." : "Create account"}
      </button>
      <p className="text-center text-xs text-zinc-400 mt-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-white hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
